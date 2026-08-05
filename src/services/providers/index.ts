// Why this file exists:
// Barrel export for stock market data providers (Finnhub and Yahoo Finance).
// Simplifies imports in marketData.ts and decoupling provider implementations.

export { fetchViaFinnhub } from './finnhubProvider';
export { fetchViaYahooFinance } from './yahooFinanceProvider';
