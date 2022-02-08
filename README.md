# Lovelace AstroWeather Card

This is the weather card for my custom Home Assistant integration AstroWeather.

<img src="./images/astroweather-card.png" alt="AstroWeather Card" width="400"/>

The percentages calculated for the clouds, seeing and transparency are to be read like 100% is perfect, 0% is bad. This also means, that a percentage of e.g. 87% for cloud does stand for a sky being nearly cloud free ;-).

Thanks for all picking this card up.

## Installation

### HACS installation

TODO

### Manual Installation

To add the AstroWeather card to your installation, download the [astroweather-card.js](https://raw.githubusercontent.com/mawinkler/astroweather-card/main/src/astroweather-card.js) and [astroweather-card-editor.js](https://raw.githubusercontent.com/mawinkler/astroweather-card/main/src/astroweather-card-editor.js) to `/config/www/custom-lovelace/astroweather-card/`.

Add the card to your dashboard by choosing `[Edit Dashboard]` and then `[Manage Resources]`.

Use `/local/custom-lovelace/astroweather-card/astroweather-card.js` for the URL parameter and set the resource type to `JavaScript Module`.

Alternatively, add the following to resources in your lovelace config:

```yaml
resources:
  - url: /local/custom-lovelace/astroweather-card/astroweather-card.js
    type: module
```

## Configuration

And add a card with type `custom:astroweather-card`:

```yaml
type: custom:astroweather-card
entity: weather.astroweather_LONGITUTE_LATITUDE
name: AstroWeather
forecast: true
deepskydetails: true
details: true
current: true
```

You can choose wich elements of the weather card you want to show:

The 4 different rows, being:

- The title and current view conditions
- The details about the current weather
- The deep sky forecast for today and tomorrow in plain text
- The three hourly forecast for clouds, seeing, transparency, view conditions and temperature

The card owns a card editor which pops up if you click on `[Edit]`.

## ToDos

- HACS
- Translations
