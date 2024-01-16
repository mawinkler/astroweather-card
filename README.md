# Lovelace AstroWeather Card

![GitHub release](https://img.shields.io/badge/release-v0.42.1-blue)
[![hacs_badge](https://img.shields.io/badge/HACS-Default-orange.svg)](https://github.com/custom-components/hacs)

This is a custom weather card for my custom [Home Assistant](https://www.home-assistant.io/) integration [AstroWeather](https://github.com/mawinkler/astroweather).

<img src="./images/astroweather-card.png" alt="AstroWeather Card" width="400"/>

The percentages that are calculated for the clouds, seeing and transparency are to be read like 100% is perfect, 0% is bad. This also means, that a percentage of e.g. 87% for cloud does stand for a sky being nearly cloud free ;-).

Thanks for all picking this card up.

PS: will redo the screenshot with better conditions...

## Installation

### HACS installation

This Integration is part of the default HACS store, so go to the HACS page and search for *AstroWeather* within the Lovelace category.

### Manual Installation

To add the AstroWeather card to your installation, download the [astroweather-card.js](https://raw.githubusercontent.com/mawinkler/astroweather-card/main/dist/astroweather-card.js) and [astroweather-card-editor.js](https://raw.githubusercontent.com/mawinkler/astroweather-card/main/dist/astroweather-card-editor.js) to `/config/www/custom-lovelace/astroweather-card/`.

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
entity: weather.astroweather_LONGITUDE_LATITUDE
name: Backyard
current: true
details: true
deepskydetails: true
forecast: false
graph: true
line_color_condition_night: '#eeffff'
line_color_condition: '#f07178'
line_color_cloudless: '#c3e88d'
line_color_seeing: '#ffcb6b'
line_color_transparency: '#82aaff'
number_of_forecasts: '48'
graph_cloudless: true
graph_seeing: true
graph_transparency: false
graph_condition: true
tap_action:
  action: none
```

You can choose wich elements of the weather card you want to show:

- The title and current view conditions.
- The details about the current weather.
- The deep sky forecast for today and tomorrow in plain text.
- The hourly forecast for clouds, seeing, transparency, view conditions and temperature.
- The graphical forecast. You can configure which conditions to display and define the line colors. 

If you enable either the forecast or the graph you can define the number of future forecasts in hourly steps. It is best to only choose the forecast table or the graphical forcast since the graphical variant can display 48hs easily which is not possible with the table. To easily create a dedicated card for the table view, simply clone the card and enable forecast only.

```yaml
type: custom:astroweather-card
entity: weather.astroweather_LONGITUDE_LATITUDE
name: Backyard
current: false
details: false
deepskydetails: false
forecast: true
graph: false
number_of_forecasts: '8'
```

The card owns a card editor which pops up if you click on `[Edit]` which being in edit mode of your view.
