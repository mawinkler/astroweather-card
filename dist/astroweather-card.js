const LitElement = customElements.get("ha-panel-lovelace")
  ? Object.getPrototypeOf(customElements.get("ha-panel-lovelace"))
  : Object.getPrototypeOf(customElements.get("hc-lovelace"));
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

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
    };
  }

  static async getConfigElement() {
    await import("./astroweather-card-editor.js");
    return document.createElement("astroweather-card-editor");
  }

  static getStubConfig(hass, unusedEntities, allEntities) {
    let entity = unusedEntities.find((eid) => eid.split(".")[0] === "weather");
    if (!entity) {
      entity = allEntities.find((eid) => eid.split(".")[0] === "weather");
    }
    return { entity };
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error("Please define an AstroWeather entity");
    }
    this._config = config;
  }

  shouldUpdate(changedProps) {
    return hasConfigOrEntityChanged(this, changedProps);
  }

  render() {
    if (!this._config || !this.hass) {
      return html``;
    }

    this.numberElements = 0;

    const lang = this.hass.selectedLanguage || this.hass.language;
    const stateObj = this.hass.states[this._config.entity];

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
    if (!stateObj.attributes.condition_percentage) {
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
            Entity is not an AstroWeather entity: ${this._config.entity}
          </div>
        </ha-card>
      `;
    }

    // Cloud Cover ${stateObj.attributes.cloudcover}<span class="unit">
    // Seeing ${stateObj.attributes.seeing}<span class="unit">
    // Transparency ${stateObj.attributes.transparency}<span class="unit">

    return html`
      <ha-card @click="${this._handleClick}">
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
      </ha-card>
    `;
  }

  renderCurrent(stateObj) {
    this.numberElements++;

    return html`
      <div class="current ${this.numberElements > 1 ? "spacer" : ""}">
        ${this._config.name
          ? html` <span class="title"> ${this._config.name} </span> `
          : ""}

        <span class="condition"> ${stateObj.attributes.condition_plain}</span>
      </div>
    `;
  }

  renderDetails(stateObj, lang) {
    const sun = this.hass.states["sun.sun"];
    let sun_next_rising;
    let sun_next_setting;
    let moon_next_rising;
    let moon_next_setting;
    let data_timestamp;

    sun_next_rising = new Date(
      stateObj.attributes.sun_next_rising_astro
    ).toLocaleTimeString(lang, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    sun_next_setting = new Date(
      stateObj.attributes.sun_next_setting_astro
    ).toLocaleTimeString(lang, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    moon_next_rising = new Date(
      stateObj.attributes.moon_next_rising
    ).toLocaleTimeString(lang, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    moon_next_setting = new Date(
      stateObj.attributes.moon_next_setting
    ).toLocaleTimeString(lang, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    data_timestamp = new Date(stateObj.attributes.timestamp).toLocaleTimeString(
      lang,
      {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }
    );

    this.numberElements++;

    return html`
      <ul class="details ${this.numberElements > 1 ? "spacer" : ""}">
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
            >Cloud Cover: ${stateObj.attributes.cloudcover_percentage}<span
              class="unit"
            >
              %
            </span></b
          >
        </li>
        <li>
          <ha-icon icon="mdi:waves"></ha-icon>
          <b
            >Seeing: ${stateObj.attributes.seeing_percentage}<span class="unit">
              %
            </span></b
          >
        </li>
        <li>
          <ha-icon icon="mdi:safety-goggles"></ha-icon>
          <b
            >Transparency: ${stateObj.attributes.transparency_percentage}<span
              class="unit"
            >
              %
            </span></b
          >
        </li>
        <li>
          <ha-icon icon="mdi:thermometer"></ha-icon>
          Temperature: ${stateObj.attributes.temperature} °C
        </li>
        <li>
          <ha-icon icon="mdi:water-percent"></ha-icon>
          Humidity: ${stateObj.attributes.humidity} %
        </li>
        <li>
          <ha-icon icon="mdi:windsock"></ha-icon>
          Wind: ${stateObj.attributes.wind_bearing}
          ${stateObj.attributes.wind_speed} m/s
        </li>
        <li>
          ${stateObj.attributes.prec_type == "Snow"
            ? html` <ha-icon icon="mdi:weather-snowy"></ha-icon> `
            : stateObj.attributes.prec_type == "Rain"
            ? html` <ha-icon icon="mdi:weather-rainy"></ha-icon> `
            : stateObj.attributes.prec_type == "Frzr"
            ? html` <ha-icon icon="mdi:weather-snowy-rainy"></ha-icon> `
            : stateObj.attributes.prec_type == "Icep"
            ? html` <ha-icon icon="mdi:weather-hail"></ha-icon> `
            : stateObj.attributes.prec_type == "None"
            ? html` <ha-icon icon="mdi:weather-rainy"></ha-icon> `
            : ""}
          Precipitation: ${stateObj.attributes.prec_type}
        </li>
        <li>
          <ha-icon icon="mdi:weather-sunset-up"></ha-icon>
          Sun Rising: ${sun_next_rising}
        </li>
        <li>
          <ha-icon icon="mdi:weather-sunset-down"></ha-icon>
          Sun Setting: ${sun_next_setting}
        </li>
        <li>
          <ha-icon icon="mdi:arrow-up-circle-outline"></ha-icon>
          Moon Rising: ${moon_next_rising}
        </li>
        <li>
          <ha-icon icon="mdi:arrow-down-circle-outline"></ha-icon>
          Moon Setting: ${moon_next_setting}
        </li>
      </ul>
    `;
  }

  renderDeepSkyForecast(stateObj) {
    this.numberElements++;

    return html`
      <ul
        class="deepskyforecast clear ${this.numberElements > 1 ? "spacer" : ""}"
      >
        <li>
          <ha-icon icon="mdi:weather-night"></ha-icon>
          Today: ${stateObj.attributes.deepsky_forecast_today_plain}
        </li>
        <li>
          <ha-icon icon="mdi:image-text"></ha-icon>
          ${stateObj.attributes.deepsky_forecast_today_desc}
        </li>

        <li>
          <ha-icon icon="mdi:weather-night"></ha-icon>
          Tomorrow: ${stateObj.attributes.deepsky_forecast_tomorrow_plain}
        </li>
        <li>
          <ha-icon icon="mdi:image-text"></ha-icon>
          ${stateObj.attributes.deepsky_forecast_tomorrow_desc}
        </li>
      </ul>
    `;
  }

  renderForecast(forecast, lang) {
    if (!forecast || forecast.length === 0) {
      return html``;
    }

    this.numberElements++;
    return html`
      <div class="forecast clear ${this.numberElements > 1 ? "spacer" : ""}">
        <div class="forecastrow">
          <div class="label">Time</div>
          <div class="label">Cond</div>
          <div class="label">Clouds</div>
          <div class="label">Seeing</div>
          <div class="label">Trans</div>
          <div class="label">LI</div>
          <div class="label">Temp</div>
        </div>
        ${forecast
          .slice(
            0,
            this._config.number_of_forecasts
              ? this._config.number_of_forecasts
              : 5
          )
          .map(
            (daily) => html`
              <div class="forecastrow">
                <div class="forecastrowname">
                  ${new Date(daily.datetime).toLocaleTimeString(lang, {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })}
                  <div class="value_item_bold">${daily.condition} %</div>
                  <div class="value_item">${daily.cloudcover_percentage} %</div>
                  <div class="value_item">${daily.seeing_percentage} %</div>
                  <div class="value_item">
                    ${daily.transparency_percentage} %
                  </div>
                  <div class="value_item">${daily.lifted_index} °</div>
                  <div class="value_item">
                    ${daily.temperature} ${this.getUnit("temperature")}
                  </div>
                </div>
              </div>
            `
          )}
      </div>
    `;
    // <!-- ${this._config.hourly_forecast
    //   ? new Date(daily.datetime).toLocaleTimeString(lang, {
    //       hour: "2-digit",
    //       minute: "2-digit",
    //       hour12: false,
    //     })
    //   : new Date(daily.datetime).toLocaleDateString(lang, {
    //       weekday: "short",
    //     })} -->
  }

  getUnit(measure) {
    return this.hass.config.unit_system[measure] || "";
  }

  _handleClick() {
    fireEvent(this, "hass-more-info", { entityId: this._config.entity });
  }

  getCardSize() {
    return 3;
  }

  static get styles() {
    return css`
      ha-card {
        cursor: pointer;
        margin: auto;
        overflow: hidden;
        padding-top: 1.3em;
        padding-bottom: 1.3em;
        padding-left: 1em;
        padding-right: 1em;
        position: relative;
      }

      .spacer {
        padding-top: 1em;
      }

      .clear {
        clear: both;
      }

      .title {
        position: absolute;
        font-weight: 400;
        font-size: 2em;
        color: var(--primary-text-color);
      }

      .condition {
        font-size: 1.2rem;
        color: var(--primary-text-color);
        position: absolute;
        right: 1em;
      }

      .conditiondesc {
        font-size: 1.2rem;
        color: var(--primary-text-color);
      }

      .current {
        padding: 1.2em 0;
        margin-bottom: 3.5em;
      }

      .details {
        display: flex;
        flex-flow: row wrap;
        justify-content: space-between;
        font-weight: 300;
        color: var(--primary-text-color);
        list-style: none;
        padding: 0 1em;
        margin: 0;
      }

      .details ha-icon {
        height: 22px;
        margin-right: 5px;
        color: var(--paper-item-icon-color);
      }

      .details li {
        flex-basis: auto;
        width: 50%;
      }

      .details li:nth-child(2n) {
        text-align: right;
      }

      .details li:nth-child(2n) ha-icon {
        margin-right: 0;
        margin-left: 8px;
        float: right;
      }

      .deepskyforecast {
        display: flex;
        flex-flow: row wrap;
        justify-content: space-between;
        font-weight: 300;
        color: var(--primary-text-color);
        list-style: none;
        padding: 0 1em;
        margin-top: 1;
      }

      .deepskyforecast ha-icon {
        height: 22px;
        margin-right: 5px;
        color: var(--paper-item-icon-color);
      }

      .deepskyforecast li {
        flex-basis: auto;
        width: 100%;
      }

      .unit {
        font-size: 0.8em;
      }

      .forecast {
        width: 100%;
        margin: 0 auto;
        display: flex;
      }

      .forecastrow {
        flex: 1;
        display: block;
        text-align: center;
        color: var(--primary-text-color);
        border-right: 0.1em solid #d9d9d9;
        line-height: 2;
        box-sizing: border-box;
      }

      .forecastrowname {
        text-transform: uppercase;
      }

      .forecast .forecastrow:first-child {
        margin-left: 0;
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
