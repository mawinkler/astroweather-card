const LitElement = customElements.get("ha-panel-lovelace")
  ? Object.getPrototypeOf(customElements.get("ha-panel-lovelace"))
  : Object.getPrototypeOf(customElements.get("hc-lovelace"));
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

const CARD_VERSION = "v0.50.2";

console.info(
  `%c  ASTROWEATHER-CARD  \n%c Version ${CARD_VERSION}  `,
  "color: yellow; font-weight: bold; background: navy",
  "color: white; font-weight: bold; background: black"
);

import { Chart, registerables } from "https://unpkg.com/chart.js@3.7.1?module";
Chart.register(...registerables);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "astroweather-card",
  name: "AstroWeather Card",
  description: "A custom weather card made for AstroWeather.",
  preview: true,
  documentationURL: "https://github.com/mawinkler/astroweather-card",
});

const fireEvent = (node, type, detail, options) => {
  options = options || {};
  detail = detail === null || detail === undefined ? {} : detail;
  const event = new Event(type, {
    bubbles: options.bubbles === undefined ? true : options.bubbles,
    cancelable: Boolean(options.cancelable),
    composed: options.composed === undefined ? true : options.composed,
  });
  event.detail = detail;
  node.dispatchEvent(event);
  return event;
};

// Lazy loading
const cardHelpers = await window.loadCardHelpers();
const entitiesCard = await cardHelpers.createCardElement({
  type: "entities",
  entities: [],
}); // A valid config avoids errors

// Then we make it load its editor through the static getConfigElement method
entitiesCard.constructor.getConfigElement();

if (!customElements.get("ha-gauge")) {
  const cardHelpers = await window.loadCardHelpers();
  cardHelpers.createCardElement({ type: "gauge" });
}
// -Lazy loading

function hasConfigOrEntityChanged(element, changedProps) {
  if (changedProps.has("_config")) {
    return true;
  }

  const oldHass = changedProps.get("hass");
  if (oldHass) {
    return (
      oldHass.states[element._config.entity] !==
        element.hass.states[element._config.entity] ||
      oldHass.states["sun.sun"] !== element.hass.states["sun.sun"]
    );
  }

  return true;
}

class AstroWeatherCard extends LitElement {
  static get properties() {
    return {
      _config: {},
      hass: {},
      forecastChart: { type: Object },
      forecastItems: { type: Number },
    };
  }

  static async getConfigElement() {
    await import("./astroweather-card-editor.js");
    return document.createElement("astroweather-card-editor");
  }

  static getStubConfig(hass, unusedEntities, allEntities) {
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
      number_of_forecasts: "8",
      line_color_condition: "#f07178", // magenta
      line_color_condition_night: "#eeffff", // white
      line_color_cloudless: "#c3e88d", // green
      line_color_seeing: "#ffcb6b", // yellow
      line_color_transparency: "#82aaff", // blue
      line_color_calm: "#ff5370", // red
      line_color_li: "#89ddff", // cyan
      line_color_precip: "#82aaff", // blue
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

  setConfig(config) {
    if (!config.entity) {
      throw new Error("Please define an AstroWeather entity");
    }
    if (!config.entity.startsWith("weather.astroweather")) {
      throw new Error("Entity is not an AstroWeather entity");
    }
    this._config = config;
    this.requestUpdate();
  }

  set hass(hass) {
    this._hass = hass;
    this._weather =
      this._config.entity in hass.states
        ? hass.states[this._config.entity]
        : null;

    if (this._weather && !this.forecastSubscriber) {
      this.subscribeForecastEvents();
    }
  }

  subscribeForecastEvents() {
    const callback = (event) => {
      this.forecasts = event.forecast;
      this.requestUpdate();
      this.drawChart();
    };

    this.forecastSubscriber = this._hass.connection.subscribeMessage(callback, {
      type: "weather/subscribe_forecast",
      forecast_type: "hourly",
      entity_id: this._config.entity,
    });
  }

  supportsFeature(feature) {
    return (this._weather.attributes.supported_features & feature) !== 0;
  }

  constructor() {
    super();
  }

  connectedCallback() {
    super.connectedCallback();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.forecastSubscriber) {
      this.forecastSubscriber.then((unsub) => unsub());
      this.forecastSubscriber = undefined;
    }
  }

  getCardSize() {
    return 4;
  }

  shouldUpdate(changedProps) {
    return hasConfigOrEntityChanged(this, changedProps);
  }

  firstUpdated() {
    if (this._config.graph !== false) {
      this.drawChart();
    }
  }

  async updated(changedProperties) {
    await this.updateComplete;

    if (
      changedProperties.has("config") &&
      changedProperties.get("config") !== undefined
    ) {
      const oldConfig = changedProperties.get("_config");

      const entityChanged =
        oldConfig && this._config.entity !== oldConfig.entity;
      // const forecastTypeChanged = oldConfig && this._config.forecast.type !== oldConfig.forecast.type;

      // if (entityChanged || forecastTypeChanged) {
      if (entityChanged) {
        if (
          this.forecastSubscriber &&
          typeof this.forecastSubscriber === "function"
        ) {
          this.forecastSubscriber();
        }

        this.subscribeForecastEvents();
      }

      if (this.forecasts && this.forecasts.length) {
        this.drawChart();
      }
    }

    if (this._config.graph !== false) {
      if (
        changedProperties.has("_config") &&
        changedProperties.get("_config") !== undefined
      ) {
        this.drawChart();
      }
      if (changedProperties.has("weather")) {
        this.updateChart();
      }
    }
  }

  render() {
    if (!this._config || !this._hass) {
      return html``;
    }

    this.numberElements = 0;

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
    if (
      stateObj.attributes.attribution != "Powered by 7Timer and Met.no" &&
      stateObj.attributes.attribution != "Powered by Met.no"
    ) {
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
      <ha-card @click="${this._handleClick}">
        <div class="card-content">
          ${this._config.current !== false ? this.renderCurrent(stateObj) : ""}
          ${this._config.details !== false
            ? this.renderDetails(stateObj, lang)
            : ""}
          ${this._config.deepskydetails !== false
            ? this.renderDeepSkyForecast(stateObj, lang)
            : ""}
          ${this._config.forecast !== false
            ? this.renderForecast(stateObj.attributes.forecast, lang)
            : ""}
          ${this._config.graph !== false
            ? html`<div class="chart-container">
                <canvas id="forecastChart"></canvas>
              </div>`
            : ""}
        </div>
      </ha-card>
    `;
  }

  renderCurrent(stateObj) {
    this.numberElements++;

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

  renderDetails(stateObj, lang) {
    const sun = this._hass.states["sun.sun"];
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

    this.numberElements++;

    return html`
      <div class="details ${this.numberElements > 1 ? "spacer" : ""}">
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
          Temp: ${stateObj.attributes.temperature}
          ${this.getUnit("temperature")}
        </li>
        <li>
          <ha-icon icon="mdi:water-percent"></ha-icon>
          Humidity: ${stateObj.attributes.humidity} %
        </li>
        <li>
          <ha-icon icon="mdi:windsock"></ha-icon>
          <b
            >Wind: ${stateObj.attributes.wind_bearing}
            ${this.getUnit("wind_speed") == "m/s"
              ? stateObj.attributes.wind_speed
              : Math.round(stateObj.attributes.wind_speed * 2.23694)}
            ${this.getUnit("wind_speed")}</b
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
            ${this.getUnit("precipitation")}</b
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
          <ha-icon icon="mdi:moon-waning-gibbous"></ha-icon>
          Phase: ${stateObj.attributes.moon_phase} %
        </li>
        <li>
          <ha-icon icon="mdi:hand-pointing-up"></ha-icon>
          LI: ${stateObj.attributes.lifted_index}<span class="unit"> °C</span>
        </li>
        <li>
          <ha-icon icon="mdi:map-clock-outline"></ha-icon>
          Local Time: ${local_time}
        </li>
      </div>
    `;
  }

  renderDeepSkyForecast(stateObj) {
    this.numberElements++;

    return html`
      <div
        class="deepskyforecast clear ${this.numberElements > 1 ? "spacer" : ""}"
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
                <b>${stateObj.attributes.deepsky_forecast_today_desc}</b>
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
                <b>${stateObj.attributes.deepsky_forecast_tomorrow_desc}</b>
              </li>
            `
          : ""}
      </div>
    `;
  }

  renderForecast(forecast, lang) {
    if (!this.forecasts || !this.forecasts.length) {
      return [];
    }

    this.numberElements++;
    return html`
      <div class="forecast clear ${this.numberElements > 1 ? "spacer" : ""}">
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
        </div>
        ${this.forecasts
          ? this.forecasts
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
                        ? html`<div class="value_item">${hourly.seeing}</div>`
                        : ""}
                      ${this._config.graph_transparency
                        ? html`<div class="value_item">
                            ${hourly.transparency}
                          </div>`
                        : ""}
                      ${this._config.graph_calm
                        ? html`<div class="value_item">
                            ${this.getUnit("wind_speed") == "m/s"
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
        </div>
      </div>
    `;
  }

  drawChart({ config, language, forecastItems } = this) {
    if (!this.forecasts || !this.forecasts.length) {
      return [];
    }

    const chartCanvas =
      this.renderRoot && this.renderRoot.querySelector("#forecastChart");
    if (!chartCanvas) {
      return [];
    }

    const ctx =
      this.renderRoot &&
      this.renderRoot.querySelector("#forecastChart").getContext("2d");
    if (!ctx) {
      return [];
    }

    if (this.forecastChart) {
      this.forecastChart.destroy();
    }

    const forecast = this.forecasts
      ? this.forecasts.slice(
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
    const colorDivider = style.getPropertyValue("--divider-color");

    const fillLine = false;

    var i;
    var dateTime = [];
    var condition = [];
    var clouds = [];
    var clouds_high = [];
    var clouds_medium = [];
    var clouds_low = [];
    var seeing = [];
    var transparency = [];
    var calm = [];
    var li = [];
    var precip = [];

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
      }
    }

    Chart.defaults.color = textColor;
    Chart.defaults.scale.grid.color = colorDivider;
    Chart.defaults.elements.line.fill = false;
    Chart.defaults.elements.line.tension = 0.4;
    Chart.defaults.elements.line.borderWidth = 1.5;
    Chart.defaults.elements.point.radius = 2;
    Chart.defaults.elements.point.hitRadius = 10;
    Chart.defaults.plugins.legend.position = "bottom";

    var colorConditionGradient = ctx.createLinearGradient(0, 0, 0, 300);
    var colorCloudlessGradient = ctx.createLinearGradient(0, 0, 0, 300);
    var colorSeeingGradient = ctx.createLinearGradient(0, 0, 0, 300);
    var colorTransparencyGradient = ctx.createLinearGradient(0, 0, 0, 300);
    var colorCalmGradient = ctx.createLinearGradient(0, 0, 0, 300);
    var colorLiGradient = ctx.createLinearGradient(0, 0, 0, 300);
    var colorPrecipGradient = ctx.createLinearGradient(0, 0, 0, 300);
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

    var sun_next_setting_astro = new Date(
      this._weather.attributes.sun_next_setting_astro
    ).getHours();
    var sun_next_rising_astro = new Date(
      this._weather.attributes.sun_next_rising_astro
    ).getHours();

    this.forecastChart = new Chart(ctx, {
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
            fill: fillLine,
            borderWidth: 4,
            borderColor: colorCondition,
            pointBorderColor: function (context) {
              var index = context.dataIndex;
              var hour = new Date(dateTime[index]).getHours();
              if (sun_next_setting_astro < sun_next_rising_astro) {
                return hour >= sun_next_setting_astro &&
                  hour <= sun_next_rising_astro
                  ? colorConditionNight
                  : colorCondition;
              } else {
                return hour >= sun_next_setting_astro ||
                  hour <= sun_next_rising_astro
                  ? colorConditionNight
                  : colorCondition;
              }
            },
            pointRadius: function (context) {
              var index = context.dataIndex;
              var hour = new Date(dateTime[index]).getHours();
              if (sun_next_setting_astro < sun_next_rising_astro) {
                return hour >= sun_next_setting_astro &&
                  hour <= sun_next_rising_astro
                  ? 5
                  : 0;
              } else {
                return hour >= sun_next_setting_astro ||
                  hour <= sun_next_rising_astro
                  ? 5
                  : 0;
              }
            },
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
            fill: fillLine,
            borderColor: colorPrecip,
            pointBorderColor: colorPrecip,
            pointRadius: 0,
            pointStyle: "circle",
          },
        ],
      },
      options: {
        animation: false,
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
              drawBorder: false,
              drawTicks: false,
              zeroLineColor: colorDivider,
            },
            ticks: {
              maxRotation: 0,
              padding: 8,
              font: {
                size: 8,
              },
              callback: function (value, index, values) {
                var datetime = this.getLabelForValue(value);
                var weekday = new Date(datetime).toLocaleDateString(language, {
                  weekday: "short",
                });
                var time = new Date(datetime).toLocaleTimeString(language, {
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
              drawBorder: false,
              drawTicks: true,
            },
            ticks: {
              display: true,
              font: {
                size: 8,
              },
            },
          },
          LiftedIndexAxis: {
            position: "right",
            beginAtZero: true,
            min: -15,
            max: 15,
            grid: {
              display: false,
              drawBorder: false,
              drawTicks: true,
            },
            ticks: {
              display: function (display) {
                if (graphLi != undefined ? graphLi : true) {
                  return true;
                }
              },
              fontColor: colorLi,
              font: {
                size: 8,
              },
            },
          },
          PrecipitationAxis: {
            position: "right",
            beginAtZero: true,
            min: 0,
            max: 10,
            grid: {
              display: false,
              drawBorder: false,
              drawTicks: true,
            },
            ticks: {
              display: function (display) {
                if (graphPrecip != undefined ? graphPrecip : true) {
                  return true;
                }
              },
              fontColor: colorPrecip,
              font: {
                size: 8,
              },
            },
          },
        },
        plugins: {
          legend: {
            display: true,
            position: "bottom",
            labels: {
              boxWitdth: 10,
              font: {
                size: 8,
              },
              padding: 5,
              pointStyle: "circle",
              pointStyleWidth: 1,
              usePointStyle: true,
              filter: function (legendItem, data) {
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
                  (legendItem.text == "Precip" && graphPrecip)
                );
              },
            },
          },
          datalabels: {
            backgroundColor: backgroundColor,
            borderColor: (context) => context.dataset.backgroundColor,
            borderRadius: 8,
            borderWidth: 1.5,
            padding: 4,
            font: {
              lineHeight: 0.7,
            },
            formatter: function (value, context) {
              return context.dataset.data[context.dataIndex] + "%";
            },
          },
          tooltip: {
            caretSize: 0,
            caretPadding: 15,
            callbacks: {
              title: function (TooltipItem) {
                var datetime = TooltipItem[0].label;
                return new Date(datetime).toLocaleDateString(language, {
                  month: "short",
                  day: "numeric",
                  weekday: "short",
                  hour: "numeric",
                  minute: "numeric",
                });
              },
            },
          },
        },
      },
    });
  }

  updateChart({ forecastItems, forecastChart } = this) {
    if (!this.forecasts || !this.forecasts.length) {
      return [];
    }
    if (this.forecastChart) {
      this.forecastChart.destroy();
    }
    const forecast = this.forecasts
      ? this.forecasts.slice(
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

    var i;
    var dateTime = [];
    var condition = [];
    var clouds = [];
    var clouds_high = [];
    var clouds_medium = [];
    var clouds_low = [];
    var seeing = [];
    var transparency = [];
    var calm = [];
    var li = [];
    var precip = [];

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
        li.push(((10 + d.lifted_index) * 100) / 20);
      }
      if (graphPrecip != undefined ? graphPrecip : true) {
        precip.push(d.precipitation_amount);
      }
    }

    if (forecastChart) {
      forecastChart.data.labels = dateTime;
      forecastChart.data.datasets[0].data = condition;
      forecastChart.data.datasets[1].data = clouds;
      forecastChart.data.datasets[2].data = clouds_high;
      forecastChart.data.datasets[3].data = clouds_medium;
      forecastChart.data.datasets[4].data = clouds_low;
      forecastChart.data.datasets[5].data = seeing;
      forecastChart.data.datasets[6].data = transparency;
      forecastChart.data.datasets[7].data = calm;
      forecastChart.data.datasets[8].data = li;
      forecastChart.data.datasets[9].data = precip;
      forecastChart.update();
    }
  }

  getUnit(measure) {
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
  }

  _handleClick() {
    // fireEvent(this, "hass-more-info", { entityId: this._config.entity });
  }

  static get styles() {
    return css`
      ha-card {
        cursor: pointer;
        overflow: hidden;
        display: flex
        letter-spacing: -0.288px
        font-weight: 400;
      }

      .spacer {
      }

      .clear {
        clear: both;
      }

      .current {
        margin-bottom: 4px;
        font-size: 24px;
        color: var(--primary-text-color);
        line-height: 48px;
        align-items: center
      }

      .current-location {
        position: relative;
        font-size: 24px;
      }

      .current-condition {
        position: absolute;
        // font-size: 14px;
        right: 16px;
      }

      .details {
        font-size: 14px;
        display: flex;
        flex-flow: row wrap;
        justify-content: space-between;
        color: var(--primary-text-color);
        list-style: none;
        margin-bottom: 16px;
      }

      .details ha-icon {
        height: 12px;
        font-size: 14px;
        color: var(--paper-item-icon-color);
      }

      .details li {
        flex-basis: auto;
        width: 50%;
      }

      .details li:nth-child(2n) {
        text-align: right;
        width: 50%;
      }

      .details li:nth-child(2n) ha-icon {
        height: 12px;
        font-size: 14px;
        margin-right: 0;
        margin-left: 5px;
        float: right;
      }

      .deepskyforecast {
        font-size: 14px;
        display: flex;
        flex-flow: column wrap;
        justify-content: space-between;
        color: var(--primary-text-color);
        list-style: none;
        margin-bottom: 16px;
      }

      .deepskyforecast ha-icon {
        height: 12px;
        font-size: 14px;
        color: var(--paper-item-icon-color);
      }

      .deepskyforecast li {
        flex-basis: auto;
        width: 100%;
      }

      .unit {
        font-size: 12px;
      }

      .forecast {
        width: 100%;
        margin: 0 auto;
        display: flex;
        margin-bottom: 16px;
      }

      .forecast ha-icon {
        height: 12px;
        font-size: 12px;
        margin-right: 5px;
        color: var(--paper-item-icon-color);
        text-align: left;
      }

      .forecastrow {
        font-size: 14px;
        flex: 1;
        display: block;
        text-align: right;
        color: var(--primary-text-color);
        line-height: 2;
        box-sizing: border-box;
      }

      .forecastrowname {
        text-transform: uppercase;
      }

      .forecast .forecastrow:first-child {
        margin-left: 0;
        text-align: left;
      }

      .forecast .forecastrow:nth-last-child(1) {
        border-right: none;
        margin-right: 0;
      }

      .value_item {
      }

      .value_item_bold {
        font-weight: bold;
      }

      .label {
        font-weight: bold;
        text-align: center;
      }
    `;
  }
}

customElements.define("astroweather-card", AstroWeatherCard);
