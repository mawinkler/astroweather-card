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

const LitElement = customElements.get("hui-masonry-view")
  ? Object.getPrototypeOf(customElements.get("hui-masonry-view"))
  : Object.getPrototypeOf(customElements.get("hui-view"));
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;
const HELPERS = window.loadCardHelpers();

export class AstroWeatherCardEditor extends LitElement {
  setConfig(config) {
    this._config = { ...config };
  }

  static get properties() {
    return { hass: {}, _config: {} };
  }

  get _entity() {
    return this._config.entity || "";
  }

  get _current() {
    return this._config.current !== false;
  }

  get _details() {
    return this._config.details !== false;
  }

  get _deepskydetails() {
    return this._config.deepskydetails !== false;
  }

  get _forecast() {
    return this._config.forecast !== false;
  }

  get _graph() {
    return this._config.graph !== false;
  }

  get _graph_condition() {
    return this._config.graph_condition !== false;
  }

  get _graph_cloudless() {
    return this._config.graph_cloudless !== false;
  }

  get _graph_seeing() {
    return this._config.graph_seeing !== false;
  }

  get _graph_transparency() {
    return this._config.graph_transparency !== false;
  }

  get _graph_calm() {
    return this._config.graph_calm !== false;
  }

  get _graph_li() {
    return this._config.graph_li !== false;
  }

  get _graph_precip() {
    return this._config.graph_precip !== false;
  }

  get _line_color_condition() {
    return this._config.line_color_condition || "#f07178";
  }

  get _line_color_condition_night() {
    return this._config.line_color_condition_night || "#eeffff";
  }

  get _line_color_cloudless() {
    return this._config.line_color_cloudless || "#c3e88d";
  }

  get _line_color_seeing() {
    return this._config.line_color_seeing || "#ffcb6b";
  }

  get _line_color_transparency() {
    return this._config.line_color_transparency || "#82aaff";
  }

  get _line_color_calm() {
    return this._config.line_color_calm || "#ff5370";
  }

  get _line_color_li() {
    return this._config.line_color_li || "#89ddff";
  }

  get _line_color_precip() {
    return this._config.line_color_precip || "#82aaff";
  }

  get _hourly_forecast() {
    return true;
    // return this._config.hourly_forecast !== false;
  }

  get _number_of_forecasts() {
    return this._config.number_of_forecasts || 8;
  }

  firstUpdated() {
    HELPERS.then((help) => {
      if (help.importMoreInfoControl) {
        help.importMoreInfoControl("fan");
      }
    });
  }

  render() {
    if (!this.hass) {
      return html``;
    }

    const entities = Object.keys(this.hass.states).filter((e) =>
      e.startsWith("weather.astroweather")
    );

    return html`
      <div class="card-config">
        <div>
          <ha-entity-picker
            .hass="${this.hass}"
            .value="${this._entity}"
            .configValue=${"entity"}
            .includeEntities=${entities}
            domain-filter="weather"
            @change="${this._valueChanged}"
            allow-custom-entity
          ></ha-entity-picker>
          <div class="switches">
            <div class="switch">
              <ha-switch
                .checked=${this._current}
                .configValue="${"current"}"
                @change="${this._valueChanged}"
              ></ha-switch
              ><span>Show current</span>
            </div>
            <div class="switch">
              <ha-switch
                .checked=${this._details}
                .configValue="${"details"}"
                @change="${this._valueChanged}"
              ></ha-switch
              ><span>Show details</span>
            </div>
            <div class="switch">
              <ha-switch
                .checked=${this._deepskydetails}
                .configValue="${"deepskydetails"}"
                @change="${this._valueChanged}"
              ></ha-switch
              ><span>Show deepsky details</span>
            </div>
            <div class="switch">
              <ha-switch
                .checked=${this._forecast}
                .configValue="${"forecast"}"
                @change="${this._valueChanged}"
              ></ha-switch
              ><span>Show forecast</span>
            </div>
            <div class="switch">
              <ha-switch
                .checked=${this._graph}
                .configValue="${"graph"}"
                @change="${this._valueChanged}"
              ></ha-switch
              ><span>Show graph</span>
            </div>
            <!-- <div class="switch">
              <ha-switch
                .checked=${this._hourly_forecast}
                .configValue="${"hourly_forecast"}"
                @change="${this._valueChanged}"
              ></ha-switch
              ><span>Show hourly forecast</span>
            </div> -->
          </div>
          ${this._graph == true || this._forecast == true
            ? html`<ha-textfield
                label="Number of future forcasts"
                type="number"
                min="1"
                max="72"
                value=${this._number_of_forecasts}
                .configValue="${"number_of_forecasts"}"
                @change="${this._valueChanged}"
              ></ha-textfield>`
            : ""}
          ${this._graph == true
            ? html` <div class="switches">
                <div class="switch">
                  <ha-switch
                    .checked=${this._graph_condition}
                    .configValue="${"graph_condition"}"
                    @change="${this._valueChanged}"
                  ></ha-switch
                  ><span>Graph condition</span>
                </div>
                <div class="switch">
                  <ha-switch
                    .checked=${this._graph_cloudless}
                    .configValue="${"graph_cloudless"}"
                    @change="${this._valueChanged}"
                  ></ha-switch
                  ><span>Graph cloudless</span>
                </div>
                <div class="switch">
                  <ha-switch
                    .checked=${this._graph_seeing}
                    .configValue="${"graph_seeing"}"
                    @change="${this._valueChanged}"
                  ></ha-switch
                  ><span>Graph seeing</span>
                </div>
                <div class="switch">
                  <ha-switch
                    .checked=${this._graph_transparency}
                    .configValue="${"graph_transparency"}"
                    @change="${this._valueChanged}"
                  ></ha-switch
                  ><span>Graph transparency</span>
                </div>
                <div class="switch">
                  <ha-switch
                    .checked=${this._graph_calm}
                    .configValue="${"graph_calm"}"
                    @change="${this._valueChanged}"
                  ></ha-switch
                  ><span>Graph calmness</span>
                </div>
                <div class="switch">
                  <ha-switch
                    .checked=${this._graph_li}
                    .configValue="${"graph_li"}"
                    @change="${this._valueChanged}"
                  ></ha-switch
                  ><span>Graph lifted index</span>
                </div>
                <div class="switch">
                  <ha-switch
                    .checked=${this._graph_precip}
                    .configValue="${"graph_precip"}"
                    @change="${this._valueChanged}"
                  ></ha-switch
                  ><span>Graph precipitation</span>
                </div>
              </div>`
            : ""}
          ${this._graph_condition == true && this._graph == true
            ? html` <ha-textfield
                  label="Line color condition"
                  type="text"
                  value=${this._line_color_condition}
                  .configValue="${"line_color_condition"}"
                  @change="${this._valueChanged}"
                ></ha-textfield>
                <ha-textfield
                  label="Line color condition night"
                  type="text"
                  value=${this._line_color_condition_night}
                  .configValue="${"line_color_condition_night"}"
                  @change="${this._valueChanged}"
                ></ha-textfield>`
            : ""}
          ${this._graph_cloudless == true && this._graph == true
            ? html` <ha-textfield
                label="Line color cloudless"
                type="text"
                value=${this._line_color_cloudless}
                .configValue="${"line_color_cloudless"}"
                @change="${this._valueChanged}"
              ></ha-textfield>`
            : ""}
          ${this._graph_seeing == true && this._graph == true
            ? html` <ha-textfield
                label="Line color seeing"
                type="text"
                value=${this._line_color_seeing}
                .configValue="${"line_color_seeing"}"
                @change="${this._valueChanged}"
              ></ha-textfield>`
            : ""}
          ${this._graph_transparency == true && this._graph == true
            ? html` <ha-textfield
                label="Line color transparency"
                type="text"
                value=${this._line_color_transparency}
                .configValue="${"line_color_transparency"}"
                @change="${this._valueChanged}"
              ></ha-textfield>`
            : ""}
          ${this._graph_calm == true && this._graph == true
            ? html` <ha-textfield
                label="Line color calmness"
                type="text"
                value=${this._line_color_calm}
                .configValue="${"line_color_calm"}"
                @change="${this._valueChanged}"
              ></ha-textfield>`
            : ""}
          ${this._graph_li == true && this._graph == true
            ? html` <ha-textfield
                label="Line color lifted index"
                type="text"
                value=${this._line_color_li}
                .configValue="${"line_color_li"}"
                @change="${this._valueChanged}"
              ></ha-textfield>`
            : ""}
          ${this._graph_precip == true && this._graph == true
            ? html` <ha-textfield
                label="Line color precipitation"
                type="text"
                value=${this._line_color_precip}
                .configValue="${"line_color_precip"}"
                @change="${this._valueChanged}"
              ></ha-textfield>`
            : ""}
        </div>
      </div>
    `;
  }

  _valueChanged(ev) {
    if (!this._config || !this.hass) {
      return;
    }
    const target = ev.target;
    if (this[`_${target.configValue}`] === target.value) {
      return;
    }
    if (target.configValue) {
      if (target.value === "") {
        delete this._config[target.configValue];
      } else {
        this._config = {
          ...this._config,
          [target.configValue]:
            target.checked !== undefined ? target.checked : target.value,
        };
      }
    }
    fireEvent(this, "config-changed", { config: this._config });
  }

  static get styles() {
    return css`
      .switches {
        margin: 8px 0;
        display: flex;
        justify-content: space-between;
        flex-direction: row;
        display: block;
      }
      .switch {
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        justify-items: center;
      }
      .switches span {
        padding: 0 16px;
      }
      ha-textfield {
        display: block;
      }
    `;
  }
}

customElements.define("astroweather-card-editor", AstroWeatherCardEditor);
