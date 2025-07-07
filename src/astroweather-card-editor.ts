import { LitElement, html, TemplateResult, css } from "lit";
import {
  HomeAssistant,
  LovelaceCardEditor,
  LovelaceCardConfig,
  fireEvent,
} from "custom-card-helpers";
import { customElement, property, state } from "lit/decorators.js";

interface CardConfig extends LovelaceCardConfig {
  entity: string;
  [key: string]: any;
}

@customElement("astroweather-card-editor")
export class AstroWeatherCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _hass!: HomeAssistant;
  @state() private _config!: CardConfig;
  @state() private _helpers?: any;
  private _glanceCard?: any;

  private _initialized = false;

  public setConfig(config: CardConfig): void {
    this._config = { ...config };
    this.loadCardHelpers();
    this.render();
  }

  protected shouldUpdate(): boolean {
    if (!this._initialized) {
      this._initialize();
    }
    return true;
  }

  private _initialize(): void {
    if (this.hass === undefined) return;
    if (this._config === undefined) return;
    if (this._helpers === undefined) return;
    this._initialized = true;
  }

  private async loadCardHelpers(): Promise<void> {
    this._helpers = await (window as any).loadCardHelpers();

    // Load the ha-entity-picker
    if (!this._glanceCard) {
      this._glanceCard = customElements.get("hui-glance-card");
      this._glanceCard.getConfigElement().then(() => this.requestUpdate());
    }
  }

  firstUpdated() {
    this._helpers.then((help) => {
      if (help.importMoreInfoControl) {
        help.importMoreInfoControl("fan");
      }
    });
  }

  static get properties() {
    return { hass: {}, _config: {} };
  }

  get _entity() {
    return this._config?.entity || "";
  }

  get _current() {
    return this._config?.current !== false;
  }

  get _details() {
    return this._config?.details !== false;
  }

  get _deepskydetails() {
    return this._config?.deepskydetails !== false;
  }

  get _forecast() {
    return this._config?.forecast !== false;
  }

  get _graph() {
    return this._config?.graph !== false;
  }

  get _graph_condition() {
    return this._config?.graph_condition !== false;
  }

  get _graph_cloudless() {
    return this._config?.graph_cloudless !== false;
  }

  get _graph_seeing() {
    return this._config?.graph_seeing !== false;
  }

  get _graph_transparency() {
    return this._config?.graph_transparency !== false;
  }

  get _graph_calm() {
    return this._config?.graph_calm !== false;
  }

  get _graph_li() {
    return this._config?.graph_li !== false;
  }

  get _graph_precip() {
    return this._config?.graph_precip !== false;
  }

  get _graph_fog() {
    return this._config?.graph_fog !== false;
  }

  get _line_color_condition() {
    return this._config?.line_color_condition || "#f07178";
  }

  get _line_color_condition_night() {
    return this._config?.line_color_condition_night || "#eeffff";
  }

  get _line_color_cloudless() {
    return this._config?.line_color_cloudless || "#c3e88d";
  }

  get _line_color_seeing() {
    return this._config?.line_color_seeing || "#ffcb6b";
  }

  get _line_color_transparency() {
    return this._config?.line_color_transparency || "#82aaff";
  }

  get _line_color_calm() {
    return this._config?.line_color_calm || "#ff5370";
  }

  get _line_color_li() {
    return this._config?.line_color_li || "#89ddff";
  }

  get _line_color_precip() {
    return this._config?.line_color_precip || "#82aaff";
  }

  get _line_color_fog() {
    return this._config?.line_color_fog || "#dde8ff";
  }

  get _hourly_forecast() {
    return true;
    // return this._config?.hourly_forecast !== false;
  }

  get _number_of_forecasts() {
    return this._config?.number_of_forecasts || 8;
  }

  protected render(): TemplateResult | void {
    if (!this.hass || !this._config) {
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
                  ></ha-switch>
                  <span>Graph condition</span>
                  <div style="margin-left: auto;">
                    <span
                      ><input
                        type="color"
                        .value=${this._line_color_condition || "#ffffff"}
                        .configValue="${"line_color_condition"}"
                        @input="${this._valueChanged}" /><input
                        type="color"
                        .value=${this._line_color_condition_night || "#ffffff"}
                        .configValue="${"line_color_condition_night"}"
                        @input="${this._valueChanged}"
                    /></span>
                  </div>
                </div>
                <div class="switch">
                  <ha-switch
                    .checked=${this._graph_cloudless}
                    .configValue="${"graph_cloudless"}"
                    @change="${this._valueChanged}"
                  ></ha-switch
                  ><span>Graph cloudless</span>
                  <div style="margin-left: auto;">
                    <span>
                      <input
                        type="color"
                        .value=${this._line_color_cloudless || "#ffffff"}
                        .configValue="${"line_color_cloudless"}"
                        @input="${this._valueChanged}"
                      />
                    </span>
                  </div>
                </div>
                <div class="switch">
                  <ha-switch
                    .checked=${this._graph_seeing}
                    .configValue="${"graph_seeing"}"
                    @change="${this._valueChanged}"
                  ></ha-switch
                  ><span>Graph seeing</span>
                  <div style="margin-left: auto;">
                    <span>
                      <input
                        type="color"
                        .value=${this._line_color_seeing || "#ffffff"}
                        .configValue="${"line_color_seeing"}"
                        @input="${this._valueChanged}"
                      />
                    </span>
                  </div>
                </div>
                <div class="switch">
                  <ha-switch
                    .checked=${this._graph_transparency}
                    .configValue="${"graph_transparency"}"
                    @change="${this._valueChanged}"
                  ></ha-switch
                  ><span>Graph transparency</span>
                  <div style="margin-left: auto;">
                    <span>
                      <input
                        type="color"
                        .value=${this._line_color_transparency || "#ffffff"}
                        .configValue="${"line_color_transparency"}"
                        @input="${this._valueChanged}"
                      />
                    </span>
                  </div>
                </div>
                <div class="switch">
                  <ha-switch
                    .checked=${this._graph_calm}
                    .configValue="${"graph_calm"}"
                    @change="${this._valueChanged}"
                  ></ha-switch
                  ><span>Graph calmness</span>
                  <div style="margin-left: auto;">
                    <span>
                      <input
                        type="color"
                        .value=${this._line_color_calm || "#ffffff"}
                        .configValue="${"line_color_calm"}"
                        @input="${this._valueChanged}"
                      />
                    </span>
                  </div>
                </div>
                <div class="switch">
                  <ha-switch
                    .checked=${this._graph_li}
                    .configValue="${"graph_li"}"
                    @change="${this._valueChanged}"
                  ></ha-switch
                  ><span>Graph lifted index</span>
                  <div style="margin-left: auto;">
                    <span>
                      <input
                        type="color"
                        .value=${this._line_color_li || "#ffffff"}
                        .configValue="${"line_color_li"}"
                        @input="${this._valueChanged}"
                      />
                    </span>
                  </div>
                </div>
                <div class="switch">
                  <ha-switch
                    .checked=${this._graph_precip}
                    .configValue="${"graph_precip"}"
                    @change="${this._valueChanged}"
                  ></ha-switch
                  ><span>Graph precipitation</span>
                  <div style="margin-left: auto;">
                    <span>
                      <input
                        type="color"
                        .value=${this._line_color_precip || "#ffffff"}
                        .configValue="${"line_color_precip"}"
                        @input="${this._valueChanged}"
                      />
                    </span>
                  </div>
                </div>
                <div class="switch">
                  <ha-switch
                    .checked=${this._graph_fog}
                    .configValue="${"graph_fog"}"
                    @change="${this._valueChanged}"
                  ></ha-switch
                  ><span>Graph fog density</span>
                  <div style="margin-left: auto;">
                    <span>
                      <input
                        type="color"
                        .value=${this._line_color_fog || "#ffffff"}
                        .configValue="${"line_color_fog"}"
                        @input="${this._valueChanged}"
                      />
                    </span>
                  </div>
                </div>
              </div>`
            : ""}
        </div>
      </div>
    `;
  }

  _valueChanged(ev) {
    if (!this.hass || !this._config) {
      return;
    }
    const target = ev.target;
    if (this[`_${target.configValue}`] === target.value) {
      return;
    }
    if (target.configValue) {
      if (target.value === "") {
        delete this._config[target.configValue];
      }
      if (target.value !== undefined) {
        this._config = {
          ...this._config,
          [target.configValue]: target.value,
        };
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
