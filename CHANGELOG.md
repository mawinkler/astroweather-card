# Changelog

## [Unreleased]

### Bug Fixes

- **CSS: `ha-card` layout regression** — Removed `display: flex` from `ha-card` that had previously been silently ignored by the browser due to a missing semicolon. After the CSS syntax fix it became active for the first time, collapsing the chart to zero width when `current: false`.
- **CSS: Missing semicolons** — Added missing semicolons after `letter-spacing` and `align-items` declarations that caused entire property blocks to be discarded by the CSS parser.
- **CSS: Invalid comment syntax** — Replaced `// font-size: 14px;` with `/* font-size: 14px; */`.
- **CSS: Indentation and typo** — Fixed misaligned `.current-condition` rule and `margin  -right` typo (extra space) in `.forecastrow`.
- **CSS: `contain` property** — Removed `size` from `contain: size layout paint` so `max-height` on `.chart-container` is respected; added `max-height: 200px` to cap chart height.
- **Chart not rendering without `current: true`** — Added `_initChartIfNeeded()` called from both `firstUpdated()` and `updated()` so the canvas is found regardless of which sections are rendered.
- **`shouldUpdate` wrong property name** — Fixed `changedProperties.has("weather")` → `changedProperties.has("_weather")` so chart updates trigger correctly.
- **`_valueChanged` switch state lost** — Rewrote `_valueChanged` in the editor to check `target.checked !== undefined` first (for `ha-switch`), then empty string (delete key), then string value. Previous `if`/`if` logic re-added deleted keys immediately.
- **`loadCardHelpers` promise misuse** — `_helpers` was being set to the Promise instead of the resolved value. Moved `importMoreInfoControl` call inside `loadCardHelpers` after `await`; removed broken `firstUpdated()` that called `.then()` on the resolved value.
- **Legend filter for Temperature dataset** — Fixed label match `"Temp"` → `"Temperature"` in the legend `filter` callback.
- **Null guard for `_weather` in `_drawChart`** — Added conditional so `sun_next_setting_astro` / `sun_next_rising_astro` default to `0` when `_weather` is not yet set.
- **`attribution` access without optional chaining** — Changed `stateObj.attributes.attribution.startsWith(...)` to `stateObj.attributes.attribution?.startsWith(...)` to avoid crash when attribute is undefined.
- **`getStubConfig` unused parameter warning** — Renamed `hass` to `_hass` to silence the TypeScript unused-variable warning.
- **Forecast count: `number_of_forecasts` coercion** — Used `Number(this._config.number_of_forecasts) || 5` consistently in `_drawChart`, `_updateChart`, and `_renderForecast` instead of loose comparisons.
- **`_forecastSubscriber` not unsubscribed** — Added cleanup call in `disconnectedCallback()` to prevent memory leaks.
- **`rescaleY` defined inside `_updateChart`** — Moved `rescaleY` to module scope so it is not redefined on every chart update.
- **TypeScript: `@ts-ignore` for custom Chart.js plugin options** — Added `// @ts-ignore` comment for `astroDarknessBackground` plugin options that are not in Chart.js type definitions.

### Refactoring

- **`DATASET` constants** — Replaced magic indices `[0]`…`[11]` in dataset access with a named `DATASET` object (`DATASET.CONDITION`, `DATASET.CLOUDLESS`, etc.).
- **`var` → `const`/`let`** — All `var` declarations in `_drawChart`, `_updateChart`, `_renderDetails`, and the loop in `_updateChart` replaced with `const` or `let`.
- **Removed dead code** — Removed unused `const mode = "hourly"` and the `weekday`/`mode` branch in the DateTimeAxis tick callback; simplified callback to always return the time string.
- **Removed `_numberElements`** — Eliminated the `_numberElements` counter and the conditional `"spacer"` classes from `_renderDetails`, `_renderDeepSkyForecast`, and `_renderForecast`.
- **Removed `initialise()` / `isComponentLoaded()`** — Removed polling loop waiting for the `wiser` integration component, which is unrelated to AstroWeather.
- **Removed empty `connectedCallback()`** — Removed no-op override.
- **Removed duplicate `static get properties()`** — Removed the redundant static properties getter now that `@property`/`@state` decorators are used.
- **Removed `_component_loaded` state** — Was set but never read.
- **Moved `.not-found` style into `style.ts`** — Removed inline `<style>` tags from error HTML templates; style is now part of the shared stylesheet.
- **`_renderForecast` capped at 7** — Forecast table is limited to `Math.min(number_of_forecasts, 7)` columns to prevent layout overflow.
