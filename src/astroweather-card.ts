import { LitElement, html, css, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { HomeAssistant, LovelaceCardEditor } from "custom-card-helpers";
import Chart from "chart.js/auto";
import style from "./style";
import "./astroweather-card-editor";

const CARD_VERSION = "v0.74.2";

console.info(
  `%c  ASTROWEATHER-CARD  \n%c Version ${CARD_VERSION}  `,
  "color: yellow; font-weight: bold; background: navy",
  "color: white; font-weight: bold; background: black"
);

declare global {
  interface Window {
    loadCardHelpers?: () => Promise<any>;
    customCards?: Array<{
      type: string;
      name: string;
      description: string;
      preview: boolean;
    }>;
  }
}

interface Hass {
  states: Record<string, any>;
  connection: any;
  config: { unit_system: { length: string } };
  selectedLanguage?: string;
  language: string;
}

interface CardConfig {
  entity: string;
  [key: string]: any;
}

// This puts your card into the UI card picker dialog
window.customCards = window.customCards || [];
window.customCards.push({
  type: "astroweather-card",
  name: "AstroWeather Card",
  description:
    "A custom weather card made for AstroWeather. Repo: https://github.com/mawinkler/astroweather-card",
  preview: true,
});

const fireEvent = (node, type, detail, options) => {
  options = options || {};
  detail = detail === null || detail === undefined ? {} : detail;
  const event = new Event(type, {
    bubbles: options.bubbles === undefined ? true : options.bubbles,
    cancelable: Boolean(options.cancelable),
    composed: options.composed === undefined ? true : options.composed,
  });

  node.dispatchEvent(event);
  return event;
};

@customElement("astroweather-card")
export class AstroWeatherCard extends LitElement {
  static get properties() {
    return {
      _config: { attribute: false },
      _hass: { attribute: false },
    };
  }

  @property({ attribute: false }) private _hass?: HomeAssistant;
  @state() private _config!: CardConfig;
  @state() private _weather?: any;
  @state() private _component_loaded?: boolean = false;
  @state() private _forecasts: any[] = [];
  @state() private _forecastChart?: Chart;
  @state() private _forecastSubscriber?: any;
  @state() private _numberElements!: number;
  private _lastDataTs = 0;
  private _lastResizeTs = 0;
  private _resizeObs?: ResizeObserver;

  // tune these
  private static readonly REDRAW_DEBOUNCE_MS = 300;
  private static readonly RESIZE_DEBOUNCE_MS = 200;

  constructor() {
    super();
    this.initialise();
  }

  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    return document.createElement(
      "astroweather-card-editor"
    ) as unknown as LovelaceCardEditor;
  }

  public static getStubConfig(hass, unusedEntities, allEntities) {
    let entity = unusedEntities.find(
      (eid) => eid.split("_")[0] === "weather.astroweather"
    );
    if (!entity) {
      entity = allEntities.find(
        (eid) => eid.split("_")[0] === "weather.astroweather"
      );
    }
    return {
      entity,
      details: true,
      current: true,
      deepskydetails: true,
      forecast: true,
      graph: true,
      graph_condition: true,
      graph_cloudless: true,
      graph_seeing: true,
      graph_transparency: true,
      graph_calm: true,
      graph_li: true,
      graph_precip: true,
      graph_fog: true,
      number_of_forecasts: "8",
      line_color_condition: "#f07178", // magenta
      line_color_condition_night: "#eeffff", // white
      line_color_cloudless: "#c3e88d", // green
      line_color_seeing: "#ffcb6b", // yellow
      line_color_transparency: "#82aaff", // blue
      line_color_calm: "#ff5370", // red
      line_color_li: "#89ddff", // cyan
      line_color_precip: "#82aaff", // blue
      line_color_fog: "#dde8ff", // blue
    };
    // materialBox colors:
    // black: '#263238',
    // red: '#FF5370',
    // green: '#C3E88D',
    // yellow: '#FFCB6B',
    // blue: '#82AAFF',
    // magenta: '#F07178',
    // cyan: '#89DDFF',
    // white: '#EEFFFF',
  }

  public setConfig(config) {
    if (!config.entity) {
      throw new Error("Please define an AstroWeather entity");
    }
    if (!config.entity.startsWith("weather.astroweather")) {
      throw new Error("Entity is not an AstroWeather entity");
    }
    this._config = config;
  }

  set hass(hass: HomeAssistant) {
    if (!this._config) return;

    // Throttle noisy hass updates
    const now = Date.now();
    this._hass = hass as any;
    if (now - this._lastDataTs >= AstroWeatherCard.REDRAW_DEBOUNCE_MS) {
      this._lastDataTs = now;
      this._updateChart(); // imperatively update chart (no recreate)
    }

    this._weather =
      this._config.entity in hass.states
        ? hass.states[this._config.entity]
        : null;

    if (this._weather && !this._forecastSubscriber) {
      this.subscribeForecastEvents();
    }
  }

  async initialise(): Promise<boolean> {
    if (await this.isComponentLoaded()) {
      this._component_loaded = true;
    }
    return true;
  }

  async isComponentLoaded(): Promise<boolean> {
    while (!this._hass || !this._hass.config.components.includes("wiser")) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return true;
  }

  public getCardSize(): number {
    const card = this.shadowRoot?.querySelector("ha-card");
    if (!card) return 4; // fallback

    // Pixel height of the card
    const height = card.getBoundingClientRect().height;

    // Convert pixels → "rows" (approx. 50px per row in Lovelace grid)
    return Math.ceil(height / 50);
  }

  subscribeForecastEvents() {
    const callback = (event) => {
      this._forecasts = event.forecast;
      this.requestUpdate();
      this._updateChart();
    };

    if (this._hass) {
      this._forecastSubscriber = this._hass.connection.subscribeMessage(
        callback,
        {
          type: "weather/subscribe_forecast",
          forecast_type: "hourly",
          entity_id: this._config.entity,
        }
      );
    } else {
      console.error("this._hass is undefined");
    }
  }

  supportsFeature(feature) {
    return (this._weather.attributes.supported_features & feature) !== 0;
  }

  connectedCallback() {
    super.connectedCallback();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._resizeObs?.disconnect();
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    // Only re-render DOM when config changes (or first render).
    // Chart updates are done imperatively, not through DOM re-render.
    if (changedProps.has("_config")) return true;

    // Allow DOM updates only when the bound entity actually changes:
    const oldHass = changedProps.get("_hass") as HomeAssistant | undefined;
    if (!oldHass) return true;
    const eid = this._config?.entity;
    return oldHass.states[eid] !== this._hass?.states[eid];
  }

  firstUpdated() {
    // Get chart canvas
    const chartCanvas = this.shadowRoot!.getElementById(
      "forecastChart"
    ) as HTMLCanvasElement;
    this._drawChart(chartCanvas);

    // Throttled resize handling
    this._resizeObs = new ResizeObserver(() => {
      const now = Date.now();
      if (now - this._lastResizeTs < AstroWeatherCard.RESIZE_DEBOUNCE_MS)
        return;
      this._lastResizeTs = now;
      this._forecastChart?.resize();
      this._forecastChart?.update("none");
    });
    // this._resizeObs.observe(this.renderRoot.host);

    const host =
      this.renderRoot instanceof ShadowRoot
        ? this.renderRoot.host
        : this;

    this._resizeObs.observe(host as Element);
  }

  async updated(changedProperties) {
    await this.updateComplete;

    if (
      changedProperties.has("_config") &&
      changedProperties.get("_config") !== undefined
    ) {
      const oldConfig = changedProperties.get("_config");

      const entityChanged =
        oldConfig && this._config.entity !== oldConfig.entity;

      if (entityChanged) {
        if (
          this._forecastSubscriber &&
          typeof this._forecastSubscriber === "function"
        ) {
          this._forecastSubscriber();
        }

        this.subscribeForecastEvents();
      }

      if (this._forecasts && this._forecasts.length) {
        this._updateChart();
      }
    }

    if (this._config.graph !== false) {
      if (
        changedProperties.has("_config") &&
        changedProperties.get("_config") !== undefined
      ) {
        this._updateChart();
      }
      if (changedProperties.has("weather")) {
        this._updateChart();
      }
    }
  }

  static get styles() {
    return style;
  }

  // Render card
  protected render() {
    if (!this._config || !this._hass) {
      return html``;
    }

    this._numberElements = 0;

    const lang = this._hass.selectedLanguage || this._hass.language;
    const stateObj = this._hass.states[this._config.entity];

    if (!stateObj) {
      return html`
        <style>
          .not-found {
            flex: 1;
            background-color: yellow;
            padding: 8px;
          }
        </style>
        <ha-card>
          <div class="not-found">
            Entity not available: ${this._config.entity}
          </div>
        </ha-card>
      `;
    }
    if (!stateObj.attributes.attribution.startsWith("Powered by Met.no")) {
      return html`
        <style>
          .not-found {
            flex: 1;
            background-color: yellow;
            color: black;
            padding: 8px;
          }
        </style>
        <ha-card>
          <div class="not-found">
            Entity is not an AstroWeather entity: ${this._config.entity}
          </div>
        </ha-card>
      `;
    }

    return html`
      <ha-card @click=${(e) => this._handlePopup(e, this._config.entity)}>
        <div class="card-content">
          ${this._config.current !== false ? this._renderCurrent(stateObj) : ""}
          ${this._config.details !== false
            ? this._renderDetails(stateObj, lang)
            : ""}
          ${this._config.deepskydetails !== false
            ? this._renderDeepSkyForecast(stateObj)
            : ""}
          ${this._config.forecast !== false ? this._renderForecast(lang) : ""}
          ${this._config.graph !== false
            ? html`<div class="chart-container">
                <canvas id="forecastChart"></canvas>
              </div>`
            : ""}
        </div>
      </ha-card>
    `;
  }

  private _renderCurrent(stateObj) {
    this._numberElements++;

    return html`
      <div class="current">
        <span class="current-location"
          >${stateObj.attributes.location_name
            ? stateObj.attributes.location_name
            : "AstroWeather"}</span
        >

        <span class="current-condition"
          >${stateObj.attributes.condition_plain}</span
        >
      </div>
    `;
  }

  private _renderDetails(stateObj, lang) {
    let sun_next_rising;
    let sun_next_setting;
    let sun_next_rising_nautical;
    let sun_next_setting_nautical;
    let sun_next_rising_astro;
    let sun_next_setting_astro;
    let moon_next_rising;
    let moon_next_setting;
    let moon_next_new_moon;
    let moon_next_full_moon;
    let moon_next_dark_night;
    let local_time;

    sun_next_rising = new Date(
      stateObj.attributes.sun_next_rising
    ).toLocaleTimeString(lang, {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    sun_next_setting = new Date(
      stateObj.attributes.sun_next_setting
    ).toLocaleTimeString(lang, {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    sun_next_rising_nautical = new Date(
      stateObj.attributes.sun_next_rising_nautical
    ).toLocaleTimeString(lang, {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    sun_next_setting_nautical = new Date(
      stateObj.attributes.sun_next_setting_nautical
    ).toLocaleTimeString(lang, {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    sun_next_rising_astro = new Date(
      stateObj.attributes.sun_next_rising_astro
    ).toLocaleTimeString(lang, {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    sun_next_setting_astro = new Date(
      stateObj.attributes.sun_next_setting_astro
    ).toLocaleTimeString(lang, {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    moon_next_rising = new Date(
      stateObj.attributes.moon_next_rising
    ).toLocaleTimeString(lang, {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    moon_next_setting = new Date(
      stateObj.attributes.moon_next_setting
    ).toLocaleTimeString(lang, {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    moon_next_new_moon = new Date(
      stateObj.attributes.moon_next_new_moon
    ).toLocaleDateString(lang, {
      month: "2-digit",
      day: "2-digit",
    });
    moon_next_full_moon = new Date(
      stateObj.attributes.moon_next_full_moon
    ).toLocaleDateString(lang, {
      month: "2-digit",
      day: "2-digit",
    });
    moon_next_dark_night = new Date(
      stateObj.attributes.moon_next_dark_night
    ).toLocaleDateString(lang, {
      month: "2-digit",
      day: "2-digit",
    });
    let diff = new Date().getTimezoneOffset();
    local_time = new Date(
      Date.now() + stateObj.attributes.time_shift * 1000 + diff * 60000
    ).toLocaleTimeString(lang, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    var asd_duration = stateObj.attributes.night_duration_astronomical / 60;
    var asd_h = Math.floor(asd_duration / 60);
    var asd_m = Math.round(asd_duration - asd_h * 60);

    var dsd_duration = stateObj.attributes.deep_sky_darkness / 60;
    var dsd_h = Math.floor(dsd_duration / 60);
    var dsd_m = Math.round(dsd_duration - dsd_h * 60);

    this._numberElements++;

    return html`
      <div class="details ${this._numberElements > 1 ? "spacer" : ""}">
        <li>
          <ha-icon icon="mdi:shield-sun"></ha-icon>
          <b>ASD: ${asd_h}h ${asd_m}min</b>
        </li>
        <li>
          <ha-icon icon="mdi:shield-moon"></ha-icon>
          <b>DSD: ${dsd_h}h ${dsd_m}min</b>
        </li>
        <li>
          <ha-icon icon="mdi:weather-snowy-rainy"></ha-icon>
          <b
            >Condition: ${stateObj.attributes.condition_percentage}<span
              class="unit"
            >
              %
            </span></b
          >
        </li>
        <li>
          <ha-icon icon="mdi:weather-night-partly-cloudy"></ha-icon>
          <b
            >Cloudless: ${stateObj.attributes.cloudless_percentage}<span
              class="unit"
            >
              %
            </span></b
          >
        </li>
        <li>
          <ha-icon icon="mdi:waves"></ha-icon>
          <b
            >Seeing: ${stateObj.attributes.seeing}<span class="unit">
              asec</span
            ></b
          >
        </li>
        <li>
          <ha-icon icon="mdi:safety-goggles"></ha-icon>
          <b
            >Transp: ${stateObj.attributes.transparency}<span class="unit">
              mag</span
            ></b
          >
        </li>
        <li>
          <ha-icon icon="mdi:thermometer"></ha-icon>
          <b
            >Temp: ${stateObj.attributes.temperature}
            ${this._getUnit("temperature")}</b
          >
        </li>
        <li>
          <ha-icon icon="mdi:water-percent"></ha-icon>
          <b>Humidity: ${stateObj.attributes.humidity} %</b>
        </li>
        <li>
          <ha-icon icon="mdi:thermometer"></ha-icon>
          <b
            >Dewpoint: ${stateObj.attributes.dewpoint}<span class="unit">
              °C</span
            ></b
          >
        </li>
        <li>
          <b
            >Precip:
            ${stateObj.attributes.precipitation_amount >= 2
              ? html` <ha-icon icon="mdi:weather-pouring"></ha-icon> `
              : stateObj.attributes.precipitation_amount >= 0.2
                ? html` <ha-icon icon="mdi:weather-rainy"></ha-icon> `
                : stateObj.attributes.precipitation_amount >= 0
                  ? html` <ha-icon icon="mdi:weather-cloudy"></ha-icon> `
                  : ""}
            ${stateObj.attributes.precipitation_amount}
            ${this._getUnit("precipitation")}</b
          >
        </li>
        <li>
          <ha-icon icon="mdi:windsock"></ha-icon>
          <b
            >Wind: ${stateObj.attributes.wind_bearing}
            ${this._getUnit("wind_speed") == "m/s"
              ? stateObj.attributes.wind_speed
              : Math.round(stateObj.attributes.wind_speed * 2.23694)}
            ${this._getUnit("wind_speed")}</b
          >
        </li>
        <li>
          <ha-icon icon="mdi:hand-pointing-up"></ha-icon>
          <b
            >LI: ${stateObj.attributes.lifted_index}<span class="unit">
              °C</span
            ></b
          >
        </li>
        <li>
          <ha-icon icon="mdi:weather-sunset-down"></ha-icon>
          Civil: ${sun_next_setting}
        </li>
        <li>
          <ha-icon icon="mdi:weather-sunset-up"></ha-icon>
          Civil: ${sun_next_rising}
        </li>
        <li>
          <ha-icon icon="mdi:weather-sunset-down"></ha-icon>
          Naut: ${sun_next_setting_nautical}
        </li>
        <li>
          <ha-icon icon="mdi:weather-sunset-up"></ha-icon>
          Naut: ${sun_next_rising_nautical}
        </li>
        <li>
          <ha-icon icon="mdi:weather-sunset-down"></ha-icon>
          Astro: ${sun_next_setting_astro}
        </li>
        <li>
          <ha-icon icon="mdi:weather-sunset-up"></ha-icon>
          Astro: ${sun_next_rising_astro}
        </li>
        <li>
          <ha-icon icon="mdi:arrow-down-circle-outline"></ha-icon>
          Moon: ${moon_next_setting}
        </li>
        <li>
          <ha-icon icon="mdi:arrow-up-circle-outline"></ha-icon>
          Moon: ${moon_next_rising}
        </li>
        <li>
          <ha-icon icon="mdi:moon-new"></ha-icon>
          New Moon: ${moon_next_new_moon}
        </li>
        <li>
          <ha-icon icon="mdi:moon-full"></ha-icon>
          Full Moon: ${moon_next_full_moon}
        </li>
        <li>
          <ha-icon icon="mdi:${stateObj.attributes.moon_icon}"></ha-icon>
          Phase: ${stateObj.attributes.moon_phase} %
        </li>
        <li>
          <ha-icon icon="mdi:rocket-launch-outline"></ha-icon>
          Dark Night: ${moon_next_dark_night}
        </li>
        <li>
          <ha-icon icon="mdi:map-clock-outline"></ha-icon>
          Local Time: ${local_time}
        </li>
      </div>
    `;
  }

  private _renderDeepSkyForecast(stateObj) {
    this._numberElements++;

    return html`
      <div
        class="deepskyforecast clear ${this._numberElements > 1
          ? "spacer"
          : ""}"
      >
        ${stateObj.attributes.deepsky_forecast_today_plain
          ? html`
              <li>
                <ha-icon icon="mdi:weather-night"></ha-icon>
                <b>${stateObj.attributes.deepsky_forecast_today_dayname}:</b>
                ${stateObj.attributes.deepsky_forecast_today_plain}
              </li>
              <li>
                <ha-icon icon="mdi:image-text"></ha-icon>
                <b
                  >${stateObj.attributes.deepsky_forecast_today_desc}
                  ${stateObj.attributes
                    .deepsky_forecast_today_precipitation_amount6 > 0
                    ? html`, Precip:
                      ${stateObj.attributes
                        .deepsky_forecast_today_precipitation_amount6}
                      ${this._getUnit("precipitation")}`
                    : ""}
                </b>
              </li>
            `
          : ""}
        ${stateObj.attributes.deepsky_forecast_tomorrow_plain
          ? html`
              <li>
                <ha-icon icon="mdi:weather-night"></ha-icon>
                <b>${stateObj.attributes.deepsky_forecast_tomorrow_dayname}:</b>
                ${stateObj.attributes.deepsky_forecast_tomorrow_plain}
              </li>
              <li>
                <ha-icon icon="mdi:image-text"></ha-icon>
                <b
                  >${stateObj.attributes.deepsky_forecast_tomorrow_desc}
                  ${stateObj.attributes
                    .deepsky_forecast_tomorrow_precipitation_amount6 > 0
                    ? html`, Precip:
                      ${stateObj.attributes
                        .deepsky_forecast_tomorrow_precipitation_amount6}
                      ${this._getUnit("precipitation")}`
                    : ""}
                </b>
              </li>
            `
          : ""}
      </div>
    `;
  }

  private _renderForecast(lang) {
    if (!this._forecasts || !this._forecasts.length || !this._config) {
      return [];
    }

    this._numberElements++;
    return html`
      <div class="forecast clear ${this._numberElements > 1 ? "spacer" : ""}">
        <div class="forecastrow">
          <ha-icon icon="mdi:progress-clock"></ha-icon><br />
          ${this._config.graph_condition
            ? html`<ha-icon icon="mdi:weather-snowy-rainy"></ha-icon><br />`
            : ""}
          ${this._config.graph_cloudless
            ? html`<ha-icon icon="mdi:weather-night-partly-cloudy"></ha-icon
                ><br />`
            : ""}
          ${this._config.graph_seeing
            ? html`<ha-icon icon="mdi:waves"></ha-icon><br />`
            : ""}
          ${this._config.graph_transparency
            ? html`<ha-icon icon="mdi:safety-goggles"></ha-icon><br />`
            : ""}
          ${this._config.graph_calm
            ? html`<ha-icon icon="mdi:windsock"></ha-icon><br />`
            : ""}
          ${this._config.graph_li
            ? html`<ha-icon icon="mdi:hand-pointing-up"></ha-icon><br />`
            : ""}
          ${this._config.graph_precip
            ? html`<ha-icon icon="mdi:weather-rainy"></ha-icon>`
            : ""}
          ${this._config.graph_fog
            ? html`<ha-icon icon="mdi:weather-fog"></ha-icon>`
            : ""}
        </div>
        ${this._forecasts
          ? this._forecasts
              .slice(
                0,
                this._config.number_of_forecasts
                  ? this._config.number_of_forecasts > 7
                    ? 7
                    : this._config.number_of_forecasts
                  : 5
              )
              .map(
                (hourly) => html`
                  <div class="forecastrow">
                    <div class="forecastrowname">
                      ${new Date(hourly.datetime).toLocaleTimeString(lang, {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })}
                      ${this._config.graph_condition
                        ? html`<div class="value_item_bold">
                            ${hourly.condition}
                          </div>`
                        : ""}
                      ${this._config.graph_cloudless
                        ? html`<div class="value_item">
                            ${hourly.cloudcover_percentage}
                          </div>`
                        : ""}
                      ${this._config.graph_seeing
                        ? html`<div class="value_item">
                            ${(
                              ((100 - hourly.seeing_percentage) * 2.5) /
                              100
                            ).toFixed(2)}
                          </div>`
                        : ""}
                      ${this._config.graph_transparency
                        ? html`<div class="value_item">
                            ${(
                              ((100 - hourly.transparency_percentage) * 1) /
                              100
                            ).toFixed(2)}
                          </div>`
                        : ""}
                      ${this._config.graph_calm
                        ? html`<div class="value_item">
                            ${this._getUnit("wind_speed") == "m/s"
                              ? hourly.wind_speed
                              : Math.round(hourly.wind_speed * 2.23694)}
                          </div>`
                        : ""}
                      ${this._config.graph_li
                        ? html`<div class="value_item">
                            ${hourly.lifted_index}
                          </div>`
                        : ""}
                      ${this._config.graph_precip
                        ? html`<div class="value_item">
                            ${hourly.precipitation_amount}
                          </div>`
                        : ""}
                      ${this._config.graph_fog
                        ? html`<div class="value_item">
                            ${hourly.fog_area_fraction}
                          </div>`
                        : ""}
                    </div>
                  </div>
                `
              )
          : ""}
        <div class="forecastrow">
          <br />
          ${this._config.graph_condition ? html`%<br />` : ""}
          ${this._config.graph_cloudless ? html`%<br />` : ""}
          ${this._config.graph_seeing ? html`asec<br />` : ""}
          ${this._config.graph_transparency ? html`mag<br />` : ""}
          ${this._config.graph_calm ? html`m/s<br />` : ""}
          ${this._config.graph_li ? html`°C<br />` : ""}
          ${this._config.graph_precip ? html`mm<br />` : ""}
          ${this._config.graph_fog ? html`mm<br />` : ""}
        </div>
      </div>
    `;
  }

  private _drawChart(chartCanvas: HTMLCanvasElement) {
    var lang = "en";
    if (this._hass) {
      lang = this._hass.selectedLanguage || this._hass.language;
    }

    if (!this._forecasts || !this._config || !chartCanvas) {
      return [];
    }

    const ctx = chartCanvas.getContext("2d");
    if (!ctx) {
      return [];
    }

    // Render forecast
    const forecast = this._forecasts
      ? this._forecasts.slice(
          0,
          this._config.number_of_forecasts
            ? this._config.number_of_forecasts
            : 5
        )
      : [];
    const mode = "hourly";

    const graphCondition = this._config.graph_condition;
    const graphCloudless = this._config.graph_cloudless;
    const graphSeeing = this._config.graph_seeing;
    const graphTransparency = this._config.graph_transparency;
    const graphCalm = this._config.graph_calm;
    const graphLi = this._config.graph_li;
    const graphPrecip = this._config.graph_precip;
    const graphFog = this._config.graph_fog;

    const style = getComputedStyle(document.body);
    const backgroundColor = style.getPropertyValue("--card-background-color");
    const textColor = style.getPropertyValue("--primary-text-color");

    const colorCondition = this._config.line_color_condition
      ? this._config.line_color_condition
      : "#f07178";
    const colorConditionNight = this._config.line_color_condition_night
      ? this._config.line_color_condition_night
      : "#eeffff";
    const colorCloudless = this._config.line_color_cloudless
      ? this._config.line_color_cloudless
      : "#c3e88d";
    const colorCloudlessLevels = colorCloudless + "80";
    const colorSeeing = this._config.line_color_seeing
      ? this._config.line_color_seeing
      : "#ffcb6b";
    const colorTransparency = this._config.line_color_transparency
      ? this._config.line_color_transparency
      : "#82aaff";
    const colorCalm = this._config.line_color_calm
      ? this._config.line_color_calm
      : "#ff5370";
    const colorLi = this._config.line_color_li
      ? this._config.line_color_li
      : "#89ddff";
    const colorPrecip = this._config.line_color_precip
      ? this._config.line_color_precip
      : "#82aaff";
    const colorFog = this._config.line_color_fog
      ? this._config.line_color_fog
      : "#dde8ff";
    const colorDivider = style.getPropertyValue("--divider-color");
    const fillLine = false;

    var dateTime: string[] = [];
    var condition: number[] = [];
    var clouds: number[] = [];
    var clouds_high: number[] = [];
    var clouds_medium: number[] = [];
    var clouds_low: number[] = [];
    var seeing: number[] = [];
    var transparency: number[] = [];
    var calm: number[] = [];
    var li: number[] = [];
    var precip: number[] = [];
    var fog: number[] = [];

    Chart.defaults.color = textColor;
    Chart.defaults.scale.grid.color = colorDivider;
    Chart.defaults.elements.line.fill = false;
    Chart.defaults.elements.line.tension = 0.4;
    Chart.defaults.elements.line.borderWidth = 1.5;
    Chart.defaults.elements.point.radius = 2;
    Chart.defaults.elements.point.hitRadius = 10;
    Chart.defaults.plugins.legend.position = "bottom";
    Chart.defaults.animation = false;
    Chart.defaults.transitions.active.animation.duration = 0;

    var colorConditionGradient = ctx.createLinearGradient(0, 0, 0, 300);
    var colorCloudlessGradient = ctx.createLinearGradient(0, 0, 0, 300);
    var colorSeeingGradient = ctx.createLinearGradient(0, 0, 0, 300);
    var colorTransparencyGradient = ctx.createLinearGradient(0, 0, 0, 300);
    var colorCalmGradient = ctx.createLinearGradient(0, 0, 0, 300);
    var colorLiGradient = ctx.createLinearGradient(0, 0, 0, 300);
    var colorPrecipGradient = ctx.createLinearGradient(0, 0, 0, 300);
    var colorFogGradient = ctx.createLinearGradient(0, 0, 0, 300);
    colorConditionGradient.addColorStop(0, colorCondition);
    colorConditionGradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    colorCloudlessGradient.addColorStop(0, colorCloudless);
    colorCloudlessGradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    colorSeeingGradient.addColorStop(0, colorSeeing);
    colorSeeingGradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    colorTransparencyGradient.addColorStop(0, colorTransparency);
    colorTransparencyGradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    colorCalmGradient.addColorStop(0, colorCalm);
    colorCalmGradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    colorLiGradient.addColorStop(0, colorLi);
    colorLiGradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    colorPrecipGradient.addColorStop(0, colorPrecip);
    colorPrecipGradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    colorFogGradient.addColorStop(0, colorFog);
    colorFogGradient.addColorStop(1, "rgba(0, 0, 0, 0)");

    var sun_next_setting_astro = new Date(
      this._weather.attributes.sun_next_setting_astro
    ).getHours();
    var sun_next_rising_astro = new Date(
      this._weather.attributes.sun_next_rising_astro
    ).getHours();

    const astroDarknessBackgroundPlugin = {
      id: "astroDarknessBackground",
      beforeDraw(chart: any, _args: any, pluginOptions: any) {
        const {
          ctx,
          chartArea: { top, bottom, left, right },
        } = chart;

        const xAxis = chart.scales["x"];
        const labels = (chart.data.labels || []) as string[];
        if (!xAxis || !labels.length || !pluginOptions) return;

        const sunSetHour: number = pluginOptions.sunSetHour;
        const sunRiseHour: number = pluginOptions.sunRiseHour;
        const color: string =
          pluginOptions.color || "rgba(255, 255, 255, 0.06)"; // tweak to taste

        // Build mask per label: is this point in astronomical darkness?
        const darkMask = labels.map((label) => {
          const hour = new Date(label).getHours();
          if (Number.isNaN(hour)) return false;

          if (sunSetHour < sunRiseHour) {
            // Darkness between same-evening set and next-morning rise
            return hour >= sunSetHour && hour <= sunRiseHour;
          } else {
            // Darkness spans midnight
            return hour >= sunSetHour || hour <= sunRiseHour;
          }
        });

        ctx.save();
        ctx.fillStyle = color;

        // Find contiguous dark segments and draw rectangles
        let segmentStart: number | null = null;
        for (let i = 0; i < darkMask.length; i++) {
          const isDark = darkMask[i];
          const isLast = i === darkMask.length - 1;

          if (isDark && segmentStart === null) {
            segmentStart = i;
          }

          if ((segmentStart !== null && !isDark) || (segmentStart !== null && isLast)) {
            const startIndex = segmentStart;
            const endIndex = isLast && isDark ? i : i - 1;

            // Convert label positions to pixels on x-axis
            const xStart = xAxis.getPixelForValue(labels[startIndex]);
            const xEnd = xAxis.getPixelForValue(labels[endIndex]);
            const width = xEnd - xStart || 0;

            if (width !== 0) {
              ctx.fillRect(xStart, top, width, bottom - top);
            }
            segmentStart = null;
          }
        }

        ctx.restore();
      },
    };

    this._forecastChart ||= new Chart(ctx, {
      type: "bar",
      data: {
        labels: dateTime,
        datasets: [
          {
            label: "Condition",
            type: "line",
            data: condition,
            yAxisID: "PercentageAxis",
            backgroundColor: colorConditionGradient,
            borderDash: [2, 4],
            fill: fillLine,
            borderWidth: 4,
            borderColor: colorCondition,
            pointStyle: "star",
          },
          {
            label: "Cloudless",
            type: "line",
            data: clouds,
            yAxisID: "PercentageAxis",
            backgroundColor: colorCloudlessGradient,
            fill: fillLine,
            borderColor: colorCloudless,
            pointBorderColor: colorCloudless,
            pointRadius: 0,
            pointStyle: "rect",
          },
          {
            label: "H",
            type: "line",
            data: clouds_high,
            borderDash: [9, 2],
            yAxisID: "PercentageAxis",
            backgroundColor: colorCloudlessGradient,
            fill: fillLine,
            borderColor: colorCloudlessLevels,
            pointBorderColor: colorCloudless,
            pointRadius: 0,
            pointStyle: "rect",
          },
          {
            label: "M",
            type: "line",
            data: clouds_medium,
            borderDash: [6, 2],
            yAxisID: "PercentageAxis",
            backgroundColor: colorCloudlessGradient,
            fill: fillLine,
            borderColor: colorCloudlessLevels,
            pointBorderColor: colorCloudless,
            pointRadius: 0,
            pointStyle: "rect",
          },
          {
            label: "L",
            type: "line",
            data: clouds_low,
            borderDash: [3, 2],
            yAxisID: "PercentageAxis",
            backgroundColor: colorCloudlessGradient,
            fill: fillLine,
            borderColor: colorCloudlessLevels,
            pointBorderColor: colorCloudless,
            pointRadius: 0,
            pointStyle: "rect",
          },

          {
            label: "Seeing",
            type: "line",
            data: seeing,
            yAxisID: "PercentageAxis",
            backgroundColor: colorSeeingGradient,
            fill: fillLine,
            borderColor: colorSeeing,
            pointBorderColor: colorSeeing,
            pointRadius: 0,
            pointStyle: "triangle",
          },

          {
            label: "Transp",
            type: "line",
            data: transparency,
            yAxisID: "PercentageAxis",
            backgroundColor: colorTransparencyGradient,
            fill: fillLine,
            borderColor: colorTransparency,
            pointBorderColor: colorTransparency,
            pointRadius: 0,
            pointStyle: "circle",
          },

          {
            label: "Calm",
            type: "line",
            data: calm,
            yAxisID: "PercentageAxis",
            backgroundColor: colorCalmGradient,
            fill: fillLine,
            borderColor: colorCalm,
            pointBorderColor: colorCalm,
            pointRadius: 0,
            pointStyle: "circle",
          },

          {
            label: "LI",
            type: "line",
            data: li,
            yAxisID: "LiftedIndexAxis",
            backgroundColor: colorLiGradient,
            fill: fillLine,
            borderColor: colorLi,
            pointBorderColor: colorLi,
            pointRadius: 0,
            pointStyle: "circle",
          },

          {
            label: "Precip",
            type: "bar",
            data: precip,
            yAxisID: "PrecipitationAxis",
            backgroundColor: colorPrecipGradient,
            borderColor: colorPrecip,
            pointStyle: "circle",
          },

          {
            label: "Fog",
            type: "bar",
            data: fog,
            yAxisID: "PercentageAxis",
            backgroundColor: colorFogGradient,
            borderColor: colorFog,
            pointStyle: "circle",
          },
        ],
      },
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: true,
        layout: {
          padding: {
            bottom: 10,
          },
        },
        scales: {
          DateTimeAxis: {
            position: "top",
            grid: {
              display: false,
              drawTicks: false,
            },
            ticks: {
              maxRotation: 0,
              padding: 8,
              font: {
                size: 8,
              },
              callback: function (value) {
                var datetime = this.getLabelForValue(Number(value));
                var weekday = new Date(datetime).toLocaleDateString(lang, {
                  weekday: "short",
                });
                var time = new Date(datetime).toLocaleTimeString(lang, {
                  hour12: false,
                  hour: "numeric",
                  minute: "numeric",
                });
                if (mode == "hourly") {
                  return time;
                }
                return weekday;
              },
            },
          },
          PercentageAxis: {
            position: "left",
            beginAtZero: true,
            min: 0,
            max: 100,
            grid: {
              display: false,
              drawTicks: true,
            },
            ticks: {
              display: true,
              font: {
                size: 8,
              },
              callback: function (value) {
                return value + "%"; // Add unit
              },
            },
          },
          LiftedIndexAxis: {
            position: "right",
            beginAtZero: true,
            min: -7,
            max: 7,
            grid: {
              display: false,
              drawTicks: true,
            },
            ticks: {
              display: graphLi !== undefined ? !!graphLi : true,
              font: {
                size: 8,
              },
              callback: function (value) {
                return value + "°C"; // Add unit
              },
            },
          },
          PrecipitationAxis: {
            position: "right",
            beginAtZero: true,
            min: 0,
            max: 1,
            grid: {
              display: false,
              drawTicks: true,
            },
            ticks: {
              display: graphPrecip !== undefined ? !!graphPrecip : true,
              font: {
                size: 8,
              },
              callback: function (value) {
                return value + "mm"; // Add unit
              },
            },
          },
          x: {
            grid: {
              display: false,
              drawTicks: true,
            },
            ticks: {
              display: false, // ✅ Hides X-axis labels
            },
          },
        },
        plugins: {
          legend: {
            display: true,
            position: "bottom",
            onClick: (e, legendItem, legend) => {
              const index = legendItem.datasetIndex;
              const ci = legend.chart;
              ci.setDatasetVisibility(
                Number(index),
                !ci.isDatasetVisible(Number(index))
              );
              ci.update();
            },
            labels: {
              boxWidth: 10,
              font: {
                size: 8,
              },
              padding: 5,
              pointStyle: "circle",
              usePointStyle: true,
              generateLabels: (chart) => {
                return chart.data.datasets.map((ds: any, i) => ({
                  text: ds.label ?? "",
                  fontColor: textColor,
                  strokeStyle: ds.borderColor as any,
                  fillStyle: backgroundColor as any,
                  lineWidth: 2, //ds.borderWidth,
                  lineDash: ds.borderDash || [],
                  lineDashOffset: ds.borderDashOffset || 0,
                  hidden: !chart.isDatasetVisible(i),
                  index: i,
                }));
              },
              filter: function (legendItem) {
                return (
                  (legendItem.text == "Condition" && graphCondition) ||
                  ((legendItem.text == "Cloudless" ||
                    legendItem.text == "H" ||
                    legendItem.text == "M" ||
                    legendItem.text == "L") &&
                    graphCloudless) ||
                  (legendItem.text == "Seeing" && graphSeeing) ||
                  (legendItem.text == "Transp" && graphTransparency) ||
                  (legendItem.text == "Calm" && graphCalm) ||
                  (legendItem.text == "LI" && graphLi) ||
                  (legendItem.text == "Precip" && graphPrecip) ||
                  (legendItem.text == "Fog" && graphFog)
                );
              },
            },
          },
          tooltip: {
            caretSize: 0,
            caretPadding: 15,
            callbacks: {
              title: function (tooltipItem) {
                var datetime = tooltipItem[0].label;
                return new Date(datetime).toLocaleDateString(lang, {
                  month: "short",
                  day: "numeric",
                  weekday: "short",
                  hour: "numeric",
                  minute: "numeric",
                });
              },
              label: function (tooltipItem) {
                const units = {
                  0: "%",
                  1: "%",
                  2: "%",
                  3: "%",
                  4: "%",
                  5: "%",
                  6: "%",
                  7: "%",
                  8: "°C",
                  9: "mm",
                  10: "%",
                };

                // Get dataset index and corresponding unit
                const datasetIndex = tooltipItem.datasetIndex; // Index of the data point
                const dataIndex = tooltipItem.dataIndex;

                const unit = units[datasetIndex] || "";
                const label = tooltipItem.dataset.label || "";
                const value = tooltipItem.raw;

                // Format tooltip text
                return `${label}: ${value}${unit}`;
              },
            },
          },
          astroDarknessBackground: {
            sunSetHour: sun_next_setting_astro,
            sunRiseHour: sun_next_rising_astro,
            color: "rgba(0, 0, 0, 0.25)", // or rgba(255,255,255,0.06) for a light band
          },
        },
      },
      plugins: [
        astroDarknessBackgroundPlugin,
      ],
    });
  }

  private _updateChart() {
    if (!this._forecasts || !this._config || !this._forecastChart) {
      return;
    }

    // Update forecast
    const forecast = this._forecasts
      ? this._forecasts.slice(
          0,
          this._config.number_of_forecasts
            ? this._config.number_of_forecasts
            : 5
        )
      : [];

    const graphCondition = this._config.graph_condition;
    const graphCloudless = this._config.graph_cloudless;
    const graphSeeing = this._config.graph_seeing;
    const graphTransparency = this._config.graph_transparency;
    const graphCalm = this._config.graph_calm;
    const graphLi = this._config.graph_li;
    const graphPrecip = this._config.graph_precip;
    const graphFog = this._config.graph_fog;

    let i: number;
    const dateTime: string[] = [];
    const condition: number[] = [];
    const clouds: number[] = [];
    const clouds_high: number[] = [];
    const clouds_medium: number[] = [];
    const clouds_low: number[] = [];
    const seeing: number[] = [];
    const transparency: number[] = [];
    const calm: number[] = [];
    const li: number[] = [];
    const precip: number[] = [];
    var precipMax: number = 0;
    const fog: number[] = [];

    for (i = 0; i < forecast.length; i++) {
      var d = forecast[i];
      dateTime.push(d.datetime);
      if (graphCondition != undefined ? graphCondition : true) {
        condition.push(d.condition);
      }
      if (graphCloudless != undefined ? graphCloudless : true) {
        clouds.push(d.cloudless_percentage);
        clouds_high.push(100 - d.cloud_area_fraction_high);
        clouds_medium.push(100 - d.cloud_area_fraction_medium);
        clouds_low.push(100 - d.cloud_area_fraction_low);
      }
      if (graphSeeing != undefined ? graphSeeing : true) {
        seeing.push(d.seeing_percentage);
      }
      if (graphTransparency != undefined ? graphTransparency : true) {
        transparency.push(d.transparency_percentage);
      }
      if (graphCalm != undefined ? graphCalm : true) {
        calm.push(d.calm_percentage);
      }
      if (graphLi != undefined ? graphLi : true) {
        li.push(d.lifted_index);
      }
      if (graphPrecip != undefined ? graphPrecip : true) {
        precip.push(d.precipitation_amount);
        if (d.precipitation_amount > precipMax) {
          precipMax = d.precipitation_amount;
        }
      }
      if (graphFog != undefined ? graphFog : true) {
        fog.push(d.fog_area_fraction);
      }
    }

    // Highlight points during astronomical darkness
    const sun_next_setting_astro = new Date(
      this._weather.attributes.sun_next_setting_astro
    ).getHours();
    const sun_next_rising_astro = new Date(
      this._weather.attributes.sun_next_rising_astro
    ).getHours();

    const colorCondition =
      this._config.line_color_condition || "#f07178";
    const colorConditionNight =
      this._config.line_color_condition_night || "#eeffff";

    const condPointBorderColor: string[] = [];
    const condPointRadius: number[] = [];

    for (let idx = 0; idx < dateTime.length; idx++) {
      const hour = new Date(dateTime[idx]).getHours();

      let inAstroDarkness = false;
      if (sun_next_setting_astro < sun_next_rising_astro) {
        // Darkness between same-evening set and next-morning rise
        inAstroDarkness =
          hour >= sun_next_setting_astro && hour <= sun_next_rising_astro;
      } else {
        // Darkness spans midnight (set late, rise next day)
        inAstroDarkness =
          hour >= sun_next_setting_astro || hour <= sun_next_rising_astro;
      }

      if (inAstroDarkness) {
        condPointBorderColor.push(colorConditionNight); // white
        condPointRadius.push(5);                        // visible point
      } else {
        condPointBorderColor.push(colorCondition);      // normal color or none
        condPointRadius.push(0);                        // hidden point
      }
    }

    function rescaleY(
      chart,
      {
        axisId = "y",
        precipMax = 1,
        pad = 0.1, // 10% headroom
        beginAtZero = true, // clamp min to 0 if desired
        hard = false, // false -> use suggested*, true -> use hard min/max
      } = {}
    ) {
      const yMax = precipMax; //getVisibleYMax(chart, axisId);
      const paddedMax = yMax * (1 + pad);

      const scaleOpts = (chart.options.scales[axisId] ||= {});
      scaleOpts.beginAtZero = beginAtZero;

      if (hard) {
        delete scaleOpts.suggestedMin;
        delete scaleOpts.suggestedMax;
        scaleOpts.min = beginAtZero ? 0 : undefined;
        scaleOpts.max = paddedMax || (beginAtZero ? 1 : undefined);
      } else {
        delete scaleOpts.min;
        delete scaleOpts.max;
        scaleOpts.suggestedMin = beginAtZero ? 0 : undefined;
        scaleOpts.suggestedMax = paddedMax || (beginAtZero ? 1 : undefined);
      }
    }

    if (this._forecastChart) {
      this._forecastChart.data.labels = dateTime;
      this._forecastChart.data.datasets[0].data = condition;
      this._forecastChart.data.datasets[1].data = clouds;
      this._forecastChart.data.datasets[2].data = clouds_high;
      this._forecastChart.data.datasets[3].data = clouds_medium;
      this._forecastChart.data.datasets[4].data = clouds_low;
      this._forecastChart.data.datasets[5].data = seeing;
      this._forecastChart.data.datasets[6].data = transparency;
      this._forecastChart.data.datasets[7].data = calm;
      this._forecastChart.data.datasets[8].data = li;
      this._forecastChart.data.datasets[9].data = precip;
      this._forecastChart.data.datasets[10].data = fog;

      // Apply the per-point styling to the "Condition" dataset
      const conditionDataset: any = this._forecastChart.data.datasets[0];
      conditionDataset.pointBorderColor = condPointBorderColor;
      conditionDataset.pointRadius = condPointRadius;

      rescaleY(this._forecastChart, {
        axisId: "PrecipitationAxis",
        precipMax: precipMax,
        pad: 0.15,
      });

      this._forecastChart.update("none");
    }
  }

  private _getUnit(measure) {
    if (this._hass) {
      const lengthUnit = this._hass.config.unit_system.length;
      switch (measure) {
        case "air_pressure":
          return lengthUnit === "km" ? "hPa" : "inHg";
        case "length":
          return lengthUnit;
        case "precipitation":
          return lengthUnit === "km" ? "mm" : "in";
        case "temperature":
          return lengthUnit === "km" ? "°C" : "°F";
        case "wind_speed":
          return lengthUnit === "km" ? "m/s" : "mph";
        default:
          return this._hass.config.unit_system.length || "";
      }
    } else {
      return "km";
    }
  }

  private _handlePopup(e, entity) {
    e.stopPropagation();
    this._handleClick(
      this,
      this._hass,
      this._config.tap_action,
      entity.entity_id || entity
    );
  }

  private _handleClick(node, hass, actionConfig, entityId) {
    let e;

    if (actionConfig) {
      switch (actionConfig.action) {
        case "more-info": {
          e = new Event("hass-more-info", { composed: true });
          e.detail = { entityId };
          node.dispatchEvent(e);
          break;
        }
        case "navigate": {
          if (!actionConfig.navigation_path) return;
          window.history.pushState(null, "", actionConfig.navigation_path);
          e = new Event("location-changed", { composed: true });
          e.detail = { replace: false };
          window.dispatchEvent(e);
          break;
        }
        case "call-service": {
          if (!actionConfig.service) return;
          const [domain, service] = actionConfig.service.split(".", 2);
          const data = { ...actionConfig.data };
          hass.callService(domain, service, data);
          break;
        }
        case "url": {
          if (!actionConfig.url_path) return;
          window.location.href = actionConfig.url_path;
          break;
        }
        case "fire-dom-event": {
          e = new Event("ll-custom", { composed: true, bubbles: true });
          e.detail = actionConfig;
          node.dispatchEvent(e);
          break;
        }
      }
    }
  }
}
