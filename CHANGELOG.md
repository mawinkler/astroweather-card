# Changelog

## Unreleased

### Bug Fixes

- **Stretched card in Sections dashboards** (`astroweather-card.ts`, `style.ts`): The card, especially its "entity not available" / "not an AstroWeather entity" error states, could render badly stretched in Home Assistant's Sections dashboard view. `getCardSize()` previously fell back to a fixed size of 4 rows whenever it was queried before the card had rendered, and the `.not-found` box used `flex: 1` inside a non-flex container, both of which caused an oversized layout. Added `getGridOptions()` so Sections view sizes the card to its actual content (`rows: "auto"`), tightened the `getCardSize()` fallback, and dropped the ineffective `flex: 1` from `.not-found`. Fixes [#23](https://github.com/mawinkler/astroweather-card/issues/23).

## [0.80.0](https://github.com/mawinkler/astroweather-card/compare/v0.74.2...v0.80.0) (2026-05-29)

### New Features

- **GFS status in `_renderDetails`** (`astroweather-card.ts`): The details panel now shows whether GFS (Global Forecast System — NOAA's global NWP model) supplementary data was active during the last update cycle. The item uses the `mdi:satellite-uplink` icon and displays "Active" when GFS data was successfully fetched, or "Estimated" when the fetch failed and atmospheric parameters (seeing, fog density, lifted index) were derived from surface observations only. The value is read from `stateObj.attributes.gfs_supplementary_data` on the weather entity.
