# Stock Spread Calculator

Open source MIT-licensed web tool for analyzing stock transaction execution quality. Calculates the spread between your purchase price and the typical market price at the time of transaction using HOLC data from diverse providers (currently only Yahoo).

![Stock Spread Calculator](banner.jpg)

## Overview

This tool helps investors evaluate how well their broker executed a stock purchase by comparing the price paid against the typical market price at the exact transaction time (minute precision). It calculates both absolute and percentage spreads, providing insight into execution quality.

## Features

- **ISIN Resolution** : Automatic lookup of stock tickers from ISIN codes
- **Historical Price Data** : 1-minute granularity price retrieval for exact transaction times
- **Calculation History** : Local storage of up to 100 calculations with average spread tracking
- **Multi-language** : Full support for French and English

## Architecture

### Data Source
- Yahoo Finance API for ISIN resolution and historical price data
- Typical price calculation: `(high + low + close) / 3`

## Calculation Methodology

The application calculates:

1. **Unit Price (excluding fees)** : `(totalPaid - fees) / units`
2. **Unit Price (including fees)** : `totalPaid / units`
3. **Market Price** : Retrieved from Yahoo Finance 1-minute candle data
4. **Spread** : Difference between user price and market price in both absolute value and percentage

## CORS Proxy

Yahoo Finance API enforces strict CORS policies that prevent direct browser access. A Cloudflare Worker (`cloudflare.js`) acts as a proxy to:

- Handle CORS preflight requests
- Strip problematic headers (Origin, Referer)
- Set appropriate User-Agent
- Return CORS-enabled responses

The worker must be deployed separately to Cloudflare Workers infrastructure. As far as know, they are any other free EU alternative for this ; Cloudflare is DPF-compliant so RGPD is valid.

## Deployment

Continuous deployment is configured via GitHub Actions:

- **Action** : [SamKirkland/FTP-Deploy-Action@v4.3.6](https://github.com/SamKirkland/FTP-Deploy-Action)
- **Hosting** : OVH (EU sovereign provider)

See `.github/workflows/deploy.yml` for configuration details.

## Limitations

- **Historical Data Window** : Yahoo Finance API limits 1-minute granularity to 8 days per request
- **Data Source** : Uses Euronext data (not Lang & Schwarz) due to API constraints
- **Browser Storage** : Calculation history stored in LocalStorage ; clearing browser data removes history
- **API Dependency** : Requires active Yahoo Finance API access via Cloudflare proxy