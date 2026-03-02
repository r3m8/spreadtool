# FAQ - Stock Spread Calculator

Frequently asked questions about using the stock spread calculator.

## General Questions

### What is a stock spread?

A stock spread is the difference between the price you paid for a stock and the actual market price at the time of the transaction. It helps you evaluate whether you got good execution or paid more than the market rate.

### How does this calculator work?

Enter your transaction details: ISIN, number of units, total amount paid, fees, and the exact date/time of the transaction. The calculator fetches the historical price from Yahoo Finance and compares it to your execution price.

### What is an ISIN?

ISIN (International Securities Identification Number) is a unique 12-character alphanumeric code that identifies a specific security. You can usually find it on your broker's statement or by searching for the stock online.

## Data & Accuracy

### Where does the market data come from?

The calculator fetches historical price data from Yahoo Finance, which provides reliable data for most publicly traded securities worldwide.

### Why do I need to specify the timezone?

Stock prices change throughout the trading day. Specifying the timezone ensures we fetch the correct market price for the exact time of your transaction, accounting for different market opening hours around the world.

### How is the spread calculated?

The spread is calculated using the typical price formula (high+low+close)/3 for more accurate results. Due to Yahoo Finance API restrictions, we can only fetch 8 days of 1-minute granularity data per request, which limits historical accuracy beyond this timeframe.

## Trade Republic

### How do I retrieve my spreads on Trade Republic?

To analyze your Trade Republic spreads:

1. Export your transaction statements from the app
2. Identify the ISINs of your securities
3. Enter each transaction into the calculator with the exact date and time
4. Compare results with market data

### Why do prices differ from the Lang & Schwarz statement?

Differences from the Lang & Schwarz statement can be explained by:

- The price calculation method (typical price vs execution price)
- Data publication delays
- Differences in data sources

## Navigation

- [Stock Spread Calculator](/en/index.html.md)
- [Home](/en/index.html.md)
