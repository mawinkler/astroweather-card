# Changelog

## [0.83.0](https://github.com/mawinkler/astroweather-card/compare/v0.82.0...v0.83.0) (2026-10-26)

### Improvements

- **Card translated**: All labels of the card and the card editor are translated into the languages of the AstroWeather integration (English, German, French, Italian, Polish, Slovak), following the Home Assistant language. Other languages fall back to English. This includes the details, the deep sky forecast, the chart legend and tooltips, the current condition ("Excellent" … "Bad"), the GFS status and error messages. Abbreviations like ASD, DSD and LI stay the same in all languages.

### Fixes

- **Chart legend toggling**: Clicking a legend entry now shows or hides the dataset. The legend items were missing their dataset index.

## [0.82.0](https://github.com/mawinkler/astroweather-card/compare/v0.80.1...v0.82.0) (2026-10-26)

### Improvements

- **Translated deep sky forecast description**: With AstroWeather 0.82.0 or later the card shows the translated state of the deep sky forecast description sensors (e.g. "Teilweise bewölkt" instead of "Partlycloudy night"). With older AstroWeather versions it keeps showing the description attribute of the weather entity ([astroweather#71](https://github.com/mawinkler/astroweather/issues/71)).
- **Localized day names**: The day names of the deep sky forecast are shown in the user's language.

## [0.80.1](https://github.com/mawinkler/astroweather-card/compare/v0.80.0...v0.80.1) (2026-09-08)

### Fix

- A minor fix has been made to support variable-width cards in the Lovelace Sections layout.

## [0.80.0](https://github.com/mawinkler/astroweather-card/compare/v0.74.2...v0.80.0) (2026-05-29)

### New Features

- **GFS status in `_renderDetails`** (`astroweather-card.ts`): The details panel now shows whether GFS (Global Forecast System — NOAA's global NWP model) supplementary data was active during the last update cycle. The item uses the `mdi:satellite-uplink` icon and displays "Active" when GFS data was successfully fetched, or "Estimated" when the fetch failed and atmospheric parameters (seeing, fog density, lifted index) were derived from surface observations only. The value is read from `stateObj.attributes.gfs_supplementary_data` on the weather entity.
