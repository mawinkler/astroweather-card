# Lovelace AstroWeather Card

![GitHub release](https://img.shields.io/badge/release-v0.50.4-blue)
[![hacs_badge](https://img.shields.io/badge/HACS-Default-orange.svg)](https://github.com/custom-components/hacs)

This is a custom weather card for my custom [Home Assistant](https://www.home-assistant.io/) integration [AstroWeather](https://github.com/mawinkler/astroweather).

<img src="./images/astroweather-card.png" alt="AstroWeather Card" width="400"/>

The percentages that are calculated and graphed are to be read like 100% is perfect, 0% is bad. This also means, that a percentage of e.g. 87% for cloud does stand for a sky being nearly cloud free ;-).

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
entity: weather.astroweather_backyard
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
line_color_calm: '#ff5370'
number_of_forecasts: '48'
graph_cloudless: true
graph_seeing: false
graph_transparency: false
graph_condition: true
graph_calm: false
graph_li: false
```

Optionally, you can define custom tap actions to happen when clicking on the card. Below are some examples:

```yaml
tap_action:
  action: more-info
```

```yaml
# Assumes an input boolean to put your house into stargazer mode
tap_action:
  action: call-service
  service: input_boolean.toggle
  data:
    entity_id: input_boolean.stargazer_mode
```

```yaml
# Assumes you have a view called astroweather
tap_action:
  action: navigate
  navigation_path: /lovelace/astroweather
```

```yaml
# Navigates you to Meteoblue seeing forecast
tap_action:
  action: url
  url_path: https://www.meteoblue.com/en/weather/outdoorsports/seeing
```

```yaml
# Assumes you have UpTonight and browser_mod
tap_action:
  action: fire-dom-event
  browser_mod:
    service: browser_mod.popup
    data:
      title: UpTonight
      size: wide
      content:
        type: picture-entity
        entity: image.uptonight
```

You can choose wich elements of the weather card you want to show:

- The title and current view conditions.
- The details about the current weather.
- The deep sky forecast for today and tomorrow in plain text.
- The hourly forecast for clouds, seeing, transparency, view conditions and temperature.
- The graphical forecast. You can configure which conditions to display and define the line colors. 

If you enable either the forecast or the graph you can define the number of future forecasts in hourly steps. It is best to only choose the forecast table or the graphical forcast since the graphical variant can display 48hs easily which is not possible with the table. You might create a dedicated card for the table view, simply clone the card and enable forecast only.

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
