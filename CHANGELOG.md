# Changelog

## [0.80.0](https://github.com/mawinkler/astroweather-card/compare/v0.74.2...v0.80.0) (2026-05-29)

### New Features

- **GFS status in `_renderDetails`** (`astroweather-card.ts`): The details panel now shows whether GFS (Global Forecast System — NOAA's global NWP model) supplementary data was active during the last update cycle. The item uses the `mdi:satellite-uplink` icon and displays "Active" when GFS data was successfully fetched, or "Estimated" when the fetch failed and atmospheric parameters (seeing, fog density, lifted index) were derived from surface observations only. The value is read from `stateObj.attributes.gfs_supplementary_data` on the weather entity.
