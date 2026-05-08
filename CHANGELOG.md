# Changelog

## [Unreleased]

### New Features

- **GFS status in `_renderDetails`** (`astroweather-card.ts`): The details panel now shows whether GFS (Global Forecast System — NOAA's global NWP model) supplementary data was active during the last update cycle. The item uses the `mdi:satellite-uplink` icon and displays "Active" when GFS data was successfully fetched, or "Estimated" when the fetch failed and atmospheric parameters (seeing, fog density, lifted index) were derived from surface observations only. The value is read from `stateObj.attributes.gfs_supplementary_data` on the weather entity.

### Bug Fixes

#### CSS

- **`ha-card` layout regression** — Removed `display: flex` from `ha-card` that had previously been silently ignored due to a missing semicolon. After the CSS syntax fix it became active for the first time, collapsing the chart to zero width when `current: false`.
- **Missing semicolons** — Added missing semicolons after `letter-spacing` and `align-items` declarations that caused entire property blocks to be discarded by the CSS parser.
- **Invalid comment syntax** — Replaced `// font-size: 14px;` with `/* font-size: 14px; */`.
- **Indentation and typo** — Fixed misaligned `.current-condition` rule and `margin  -right` typo in `.forecastrow`.
- **`contain` property** — Removed `size` from `contain: size layout paint` so `max-height` on `.chart-container` is respected; added `max-height: 200px` to cap chart height.

#### Chart and rendering

- **Chart not rendering without `current: true`** — Added `_initChartIfNeeded()` called from both `firstUpdated()` and `updated()` so the canvas is found regardless of which sections are rendered.
- **`shouldUpdate` wrong property name** — Fixed `changedProperties.has("weather")` → `changedProperties.has("_weather")` so chart updates trigger correctly.
- **Null guard for `_weather` in `_drawChart`** — Added conditional so `sun_next_setting_astro` / `sun_next_rising_astro` default to `0` when `_weather` is not yet set.
- **Legend filter for Temperature dataset** — Fixed label match `"Temp"` → `"Temperature"` in the legend `filter` callback.

#### Editor

- **`_valueChanged` switch state lost** — Rewrote `_valueChanged` in the editor to check `target.checked !== undefined` first (for `ha-switch`), then empty string (delete key), then string value. Previous `if`/`if` logic re-added deleted keys immediately.
- **`loadCardHelpers` promise misuse** — `_helpers` was being set to the Promise instead of the resolved value. Moved `importMoreInfoControl` call inside `loadCardHelpers` after `await`; removed broken `firstUpdated()` that called `.then()` on the resolved value.

#### Data handling

- **Forecast count: `number_of_forecasts` coercion** — Used `Number(this._config.number_of_forecasts) || 5` consistently in `_drawChart`, `_updateChart`, and `_renderForecast` instead of loose comparisons.
- **`_forecastSubscriber` not unsubscribed** — Added cleanup call in `disconnectedCallback()` to prevent memory leaks.
- **`attribution` access without optional chaining** — Changed `stateObj.attributes.attribution.startsWith(...)` to `stateObj.attributes.attribution?.startsWith(...)` to avoid crash when attribute is undefined.
- **`getStubConfig` unused parameter warning** — Renamed `hass` to `_hass` to silence the TypeScript unused-variable warning.

### Improvements

- **`DATASET` constants** — Replaced magic indices `[0]`…`[11]` in dataset access with a named `DATASET` object (`DATASET.CONDITION`, `DATASET.CLOUDLESS`, etc.).
- **`var` → `const`/`let`** — All `var` declarations in `_drawChart`, `_updateChart`, `_renderDetails`, and the chart update loop replaced with `const` or `let`.
- **`rescaleY` moved to module scope** — Moved from inside `_updateChart` so it is not redefined on every chart update.
- **Removed dead code** — Removed unused `const mode = "hourly"` and the `weekday`/`mode` branch in the DateTimeAxis tick callback; callback now always returns the time string.
- **Removed `_numberElements`** — Eliminated the counter and the conditional `"spacer"` classes from `_renderDetails`, `_renderDeepSkyForecast`, and `_renderForecast`.
- **Removed unrelated code** — Removed polling loop waiting for the `wiser` integration component, empty `connectedCallback()` override, redundant `static get properties()` getter, and unread `_component_loaded` state.
- **Moved `.not-found` style into `style.ts`** — Removed inline `<style>` tags from error HTML templates.
- **`_renderForecast` capped at 7** — Forecast table is limited to `Math.min(number_of_forecasts, 7)` columns to prevent layout overflow.
- **TypeScript: `@ts-ignore` for custom Chart.js plugin options** — Added comment for `astroDarknessBackground` plugin options absent from Chart.js type definitions.
