import { css } from "lit";

const style = css`
    .chart-container {
        position: relative;
        aspect-ratio: 16/9;
        height:auto;
        width: 100%;
        will-change: transform;
        transform: translateZ(0);       /* helps WKWebView compositing */
        backface-visibility: hidden;
        contain: size layout paint;     /* isolate layout/paint */
    }
    canvas {
        width: 100% !important;
        height: 100% !important;
    }

    ha-card {
        cursor: pointer;
        overflow: hidden;
        display: flex
        letter-spacing: -0.288px
        font-weight: 400;
    }

    .spacer {
    }

    .clear {
        clear: both;
    }

    .current {
        margin-bottom: 4px;
        font-size: 24px;
        color: var(--primary-text-color);
        line-height: 48px;
        align-items: center
    }

    .current-location {
        position: relative;
        font-size: 24px;
    }

        .current-condition {
        position: absolute;
        // font-size: 14px;
        right: 16px;
    }

    .details {
        font-size: 14px;
        display: flex;
        flex-flow: row wrap;
        justify-content: space-between;
        color: var(--primary-text-color);
        list-style: none;
        margin-bottom: 16px;
    }

    .details ha-icon {
        height: 12px;
        font-size: 14px;
        color: var(--paper-item-icon-color);
    }

    .details li {
        flex-basis: auto;
        width: 50%;
    }

    .details li:nth-child(2n) {
        text-align: right;
        width: 50%;
    }

    .details li:nth-child(2n) ha-icon {
        height: 12px;
        font-size: 14px;
        margin-right: 0;
        margin-left: 5px;
        float: right;
    }

    .deepskyforecast {
        font-size: 14px;
        display: flex;
        flex-flow: column wrap;
        justify-content: space-between;
        color: var(--primary-text-color);
        list-style: none;
        margin-bottom: 16px;
    }

    .deepskyforecast ha-icon {
        height: 12px;
        font-size: 14px;
        color: var(--paper-item-icon-color);
    }

    .deepskyforecast li {
        flex-basis: auto;
        width: 100%;
    }

    .unit {
        font-size: 12px;
    }

    .forecast {
        width: 100%;
        margin: 0 auto;
        display: flex;
        margin-bottom: 16px;
    }

    .forecast ha-icon {
        height: 12px;
        font-size: 12px;
        margin-right: 5px;
        color: var(--paper-item-icon-color);
        text-align: left;
    }

    .forecastrow {
        font-size: 14px;
        flex: 1;
        display: block;
        text-align: right;
        color: var(--primary-text-color);
        line-height: 2;
        box-sizing: border-box;
    }

    .forecastrowname {
        text-transform: uppercase;
    }

    .forecast .forecastrow:first-child {
        margin-left: 0;
        text-align: left;
    }

    .forecast .forecastrow:nth-last-child(1) {
    border-right: none;
    margin  -right: 0;
    }

    .value_item {
    }

    .value_item_bold {
        font-weight: bold;
    }

    .label {
        font-weight: bold;
        text-align: center;
    }

    .center {
        display: block;
        margin-top: auto;
        margin-bottom: auto;
        margin-left: auto;
        margin-right: auto;
        background: var(
            --ha-card-background,
            var(--card-background-color, white)
        );
        box-shadow: var(--ha-card-box-shadow, none);
        color: var(--primary-text-color);
        transition: all 0.3s ease-out 0s;
        position: relative;
        border-radius: var(--ha-card-border-radius, 12px);
        width: 100%;
    }

    .withMargin {
        margin: 5%;
    }

    .withoutMargin {
        margin: 0;
    }
`;

export default style;
