import axios from 'axios';
import { Symbol, Candle, ChartData, RSIData, Timeframe } from '../types/trading';

// Yahoo Finance API endpoints
const YAHOO_FINANCE_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';
const YAHOO_SEARCH_BASE = 'https://query2.finance.yahoo.com/v1/finance/search';

// CORS proxy for development (you may need to replace this with your own proxy in production)
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

interface YahooQuoteResponse {
  chart: {
    result: Array<{
      meta: {
        symbol: string;
        regularMarketPrice: number;
        previousClose: number;
        currency: string;
        exchangeName: string;
      };
      timestamp: number[];
      indicators: {
        quote: Array<{
          open: number[];
          high: number[];
          low: number[];
          close: number[];
          volume: number[];
        }>;
      };
    }>;
  };
}

interface YahooSearchResponse {
  quotes: Array<{
    symbol: string;
    shortname: string;
    longname: string;
    exchDisp: string;
    typeDisp: string;
  }>;
}

// Convert timeframe to Yahoo Finance interval and determine if custom aggregation is needed
function getYahooParams(timeframe: Timeframe): { interval: string; period: string; needsAggregation: boolean; aggregationFactor: number } {
  // For timeframes that Yahoo Finance supports directly
  const directSupport: Record<string, { interval: string; period: string }> = {
    '1h': { interval: '1h', period: '1mo' },
    '1d': { interval: '1d', period: '2y' },
    '1w': { interval: '1wk', period: '5y' },
    '1M': { interval: '1mo', period: '10y' },
    '3M': { interval: '3mo', period: 'max' }
  };

  if (directSupport[timeframe]) {
    return { ...directSupport[timeframe], needsAggregation: false, aggregationFactor: 1 };
  }

  // For custom timeframes that need aggregation
  if (timeframe.endsWith('h') || timeframe.endsWith('H')) {
    const hours = parseInt(timeframe.replace(/[hH]/, ''));
    return { 
      interval: '1h', 
      period: `${Math.min(hours * 30, 90)}d`,
      needsAggregation: true, 
      aggregationFactor: hours 
    };
  }

  if (timeframe.endsWith('d') || timeframe.endsWith('D')) {
    const days = parseInt(timeframe.replace(/[dD]/, ''));
    return { 
      interval: '1d', 
      period: `${Math.min(days * 300, 1000)}d`,
      needsAggregation: true, 
      aggregationFactor: days 
    };
  }

  if (timeframe.endsWith('w') || timeframe.endsWith('W')) {
    const weeks = parseInt(timeframe.replace(/[wW]/, ''));
    return { 
      interval: '1wk', 
      period: `${Math.min(weeks * 150, 400)}wk`,
      needsAggregation: true, 
      aggregationFactor: weeks 
    };
  }

  if (timeframe.endsWith('M')) {
    const months = parseInt(timeframe.replace('M', ''));
    return { 
      interval: '1mo', 
      period: `${Math.min(months * 80, 200)}mo`,
      needsAggregation: true, 
      aggregationFactor: months 
    };
  }

  // Default fallback
  return { interval: '1d', period: '2y', needsAggregation: false, aggregationFactor: 1 };
}

// Enhanced symbol formatting for various asset types
function formatSymbolForYahoo(symbol: string): string {
  // Clean the symbol first
  const cleanSymbol = symbol.trim().toUpperCase();
  
  // If it's already formatted with exchange, return as is
  if (cleanSymbol.includes('.') || cleanSymbol.includes('-') || cleanSymbol.includes('=')) {
    return cleanSymbol;
  }
  
  // Crypto mappings
  const cryptoMappings: Record<string, string> = {
    'BTCUSD': 'BTC-USD',
    'BTCUSDT': 'BTC-USD', // Map USDT to USD for Yahoo Finance
    'ETHUSD': 'ETH-USD',
    'ETHUSDT': 'ETH-USD',
    'ADAUSD': 'ADA-USD',
    'ADAUSDT': 'ADA-USD',
    'SOLUSD': 'SOL-USD',
    'SOLUSDT': 'SOL-USD',
    'DOTUSD': 'DOT-USD',
    'DOTUSDT': 'DOT-USD',
    'LINKUSD': 'LINK-USD',
    'LINKUSDT': 'LINK-USD',
    'MATICUSD': 'MATIC-USD',
    'MATICUSDT': 'MATIC-USD',
    'AVAXUSD': 'AVAX-USD',
    'AVAXUSDT': 'AVAX-USD'
  };
  
  if (cryptoMappings[cleanSymbol]) {
    return cryptoMappings[cleanSymbol];
  }
  
  // Currency pairs mappings
  const currencyMappings: Record<string, string> = {
    'USDEUR': 'USDEUR=X',
    'USDJPY': 'USDJPY=X',
    'GBPJPY': 'GBPJPY=X',
    'EURUSD': 'EURUSD=X',
    'GBPUSD': 'GBPUSD=X',
    'USDCAD': 'USDCAD=X',
    'AUDUSD': 'AUDUSD=X',
    'NZDUSD': 'NZDUSD=X',
    'USDCHF': 'USDCHF=X',
    'EURJPY': 'EURJPY=X',
    'EURGBP': 'EURGBP=X',
    'AUDCAD': 'AUDCAD=X',
    'CADJPY': 'CADJPY=X',
    'CHFJPY': 'CHFJPY=X',
    'EURCHF': 'EURCHF=X',
    'EURAUD': 'EURAUD=X',
    'EURNZD': 'EURNZD=X',
    'GBPCHF': 'GBPCHF=X',
    'GBPCAD': 'GBPCAD=X',
    'GBPAUD': 'GBPAUD=X',
    'AUDCHF': 'AUDCHF=X',
    'AUDJPY': 'AUDJPY=X',
    'NZDCAD': 'NZDCAD=X',
    'NZDJPY': 'NZDJPY=X',
    'NZDCHF': 'NZDCHF=X',
    'CADCHF': 'CADCHF=X'
  };
  
  if (currencyMappings[cleanSymbol]) {
    return currencyMappings[cleanSymbol];
  }
  
  // Commodity mappings
  const commodityMappings: Record<string, string> = {
    'GOLD': 'GC=F',
    'SILVER': 'SI=F',
    'CRUDE': 'CL=F',
    'BRENT': 'BZ=F',
    'COPPER': 'HG=F',
    'PLATINUM': 'PL=F',
    'PALLADIUM': 'PA=F',
    'NATURALGAS': 'NG=F',
    'WHEAT': 'ZW=F',
    'CORN': 'ZC=F',
    'SOYBEANS': 'ZS=F'
  };
  
  if (commodityMappings[cleanSymbol]) {
    return commodityMappings[cleanSymbol];
  }
  
  // Index mappings
  const indexMappings: Record<string, string> = {
    'SPX': '^GSPC',
    'SP500': '^GSPC',
    'NASDAQ': '^IXIC',
    'DOW': '^DJI',
    'RUSSELL2000': '^RUT',
    'VIX': '^VIX',
    'NIFTY': '^NSEI',
    'SENSEX': '^BSESN',
    'BANKNIFTY': '^NSEBANK',
    'NIFTYIT': '^CNXIT',
    'SHANGHAI': '000001.SS',
    'HANG_SENG': '^HSI',
    'NIKKEI': '^N225',
    'FTSE': '^FTSE',
    'DAX': '^GDAXI',
    'CAC40': '^FCHI'
  };
  
  if (indexMappings[cleanSymbol]) {
    return indexMappings[cleanSymbol];
  }
  
  // Common US symbols don't need formatting
  const commonUSSymbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'NVDA', 'META', 'SPY', 'QQQ', 'MSTR', 'PLTR', 'QUBT'];
  if (commonUSSymbols.includes(cleanSymbol)) {
    return cleanSymbol;
  }
  
  // For Indian symbols, try NSE first
  if (cleanSymbol.length <= 10 && !cleanSymbol.includes('.')) {
    return `${cleanSymbol}.NS`;
  }
  
  return cleanSymbol;
}

// Aggregate candles for custom timeframes
function aggregateCandles(candles: Candle[], factor: number): Candle[] {
  if (factor <= 1) return candles;

  const aggregated: Candle[] = [];
  
  for (let i = 0; i < candles.length; i += factor) {
    const group = candles.slice(i, i + factor);
    if (group.length === 0) continue;

    const aggregatedCandle: Candle = {
      timestamp: group[0].timestamp,
      open: group[0].open,
      high: Math.max(...group.map(c => c.high)),
      low: Math.min(...group.map(c => c.low)),
      close: group[group.length - 1].close,
      volume: group.reduce((sum, c) => sum + c.volume, 0)
    };

    aggregated.push(aggregatedCandle);
  }

  return aggregated;
}

export async function fetchSymbolData(symbol: string): Promise<Symbol | null> {
  try {
    const formattedSymbol = formatSymbolForYahoo(symbol);
    const url = `${CORS_PROXY}${encodeURIComponent(`${YAHOO_FINANCE_BASE}/${formattedSymbol}?interval=1d&range=2d`)}`;
    
    const response = await axios.get<YahooQuoteResponse>(url);
    const result = response.data.chart.result[0];
    
    if (!result) return null;
    
    const meta = result.meta;
    const currentPrice = meta.regularMarketPrice;
    const previousClose = meta.previousClose;
    const change = currentPrice - previousClose;
    const changePercent = (change / previousClose) * 100;
    
    return {
      symbol: symbol.toUpperCase(),
      name: symbol, // We'll get the full name from search if needed
      price: currentPrice,
      change: change,
      changePercent: changePercent
    };
  } catch (error) {
    console.error(`Error fetching data for ${symbol}:`, error);
    return null;
  }
}

export async function fetchChartData(symbol: string, timeframe: Timeframe): Promise<ChartData | null> {
  try {
    const formattedSymbol = formatSymbolForYahoo(symbol);
    const { interval, period, needsAggregation, aggregationFactor } = getYahooParams(timeframe);
    
    const url = `${CORS_PROXY}${encodeURIComponent(`${YAHOO_FINANCE_BASE}/${formattedSymbol}?interval=${interval}&range=${period}`)}`;
    
    const response = await axios.get<YahooQuoteResponse>(url);
    const result = response.data.chart.result[0];
    
    if (!result || !result.timestamp || !result.indicators.quote[0]) {
      return null;
    }
    
    const timestamps = result.timestamp;
    const quote = result.indicators.quote[0];
    
    let candles: Candle[] = timestamps.map((timestamp, index) => ({
      timestamp: timestamp * 1000, // Convert to milliseconds
      open: quote.open[index] || 0,
      high: quote.high[index] || 0,
      low: quote.low[index] || 0,
      close: quote.close[index] || 0,
      volume: quote.volume[index] || 0
    })).filter(candle => candle.open > 0); // Filter out invalid data
    
    // Apply custom aggregation if needed
    if (needsAggregation && aggregationFactor > 1) {
      candles = aggregateCandles(candles, aggregationFactor);
    }
    
    // Limit to 500 candles maximum for performance
    if (candles.length > 500) {
      candles = candles.slice(-500);
    }
    
    // Calculate RSI and related indicators using improved method
    const rsi = calculateRSIData(candles);
    
    return { candles, rsi };
  } catch (error) {
    console.error(`Error fetching chart data for ${symbol}:`, error);
    return null;
  }
}

export async function searchSymbols(query: string): Promise<Symbol[]> {
  try {
    // First try direct symbol lookup with our enhanced formatting
    const formattedSymbol = formatSymbolForYahoo(query);
    const directResult = await fetchSymbolData(query);
    
    if (directResult) {
      return [directResult];
    }
    
    // Then try Yahoo Finance search
    const url = `${CORS_PROXY}${encodeURIComponent(`${YAHOO_SEARCH_BASE}?q=${encodeURIComponent(query)}`)}`;
    
    const response = await axios.get<YahooSearchResponse>(url);
    const quotes = response.data.quotes || [];
    
    return quotes
      .filter(quote => quote.typeDisp === 'Equity' || quote.typeDisp === 'ETF' || quote.typeDisp === 'Index')
      .slice(0, 10) // Limit to 10 results
      .map(quote => ({
        symbol: quote.symbol,
        name: quote.longname || quote.shortname || quote.symbol,
        price: 0, // Price will be fetched separately
        change: 0,
        changePercent: 0
      }));
  } catch (error) {
    console.error('Error searching symbols:', error);
    return [];
  }
}

// Improved RSI calculation using Wilder's smoothing method
function calculateRSI(prices: number[], period: number = 14): number[] {
  const rsi: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];
  
  // Step 1: Calculate gains and losses
  for (let i = 0; i < prices.length; i++) {
    if (i === 0) {
      gains.push(0);
      losses.push(0);
      rsi.push(50); // Default RSI for first value
      continue;
    }
    
    const change = prices[i] - prices[i - 1];
    gains.push(Math.max(0, change));
    losses.push(Math.max(0, -change));
    
    if (i < period) {
      rsi.push(50); // Default RSI for insufficient data
      continue;
    }
    
    let avgGain: number;
    let avgLoss: number;
    
    if (i === period) {
      // First calculation: simple average of first 14 periods
      avgGain = gains.slice(1, period + 1).reduce((sum, gain) => sum + gain, 0) / period;
      avgLoss = losses.slice(1, period + 1).reduce((sum, loss) => sum + loss, 0) / period;
    } else {
      // Subsequent calculations: Wilder's smoothing method
      const prevAvgGain = calculatePreviousAverage(gains, losses, i - 1, period).avgGain;
      const prevAvgLoss = calculatePreviousAverage(gains, losses, i - 1, period).avgLoss;
      
      avgGain = ((prevAvgGain * (period - 1)) + gains[i]) / period;
      avgLoss = ((prevAvgLoss * (period - 1)) + losses[i]) / period;
    }
    
    // Calculate RS and RSI
    if (avgLoss === 0) {
      rsi.push(100);
    } else {
      const rs = avgGain / avgLoss;
      const rsiValue = 100 - (100 / (1 + rs));
      rsi.push(rsiValue);
    }
  }
  
  return rsi;
}

// Helper function to calculate previous average for Wilder's method
function calculatePreviousAverage(gains: number[], losses: number[], index: number, period: number): { avgGain: number; avgLoss: number } {
  if (index < period) {
    return { avgGain: 0, avgLoss: 0 };
  }
  
  if (index === period) {
    const avgGain = gains.slice(1, period + 1).reduce((sum, gain) => sum + gain, 0) / period;
    const avgLoss = losses.slice(1, period + 1).reduce((sum, loss) => sum + loss, 0) / period;
    return { avgGain, avgLoss };
  }
  
  // Recursive calculation for Wilder's method
  const prev = calculatePreviousAverage(gains, losses, index - 1, period);
  const avgGain = ((prev.avgGain * (period - 1)) + gains[index]) / period;
  const avgLoss = ((prev.avgLoss * (period - 1)) + losses[index]) / period;
  
  return { avgGain, avgLoss };
}

// Calculate RSI Simple Moving Average (14-period)
function calculateRSISMA(rsiValues: number[], period: number = 14): number[] {
  const rsiSMA: number[] = [];
  
  for (let i = 0; i < rsiValues.length; i++) {
    if (i < period - 1) {
      rsiSMA.push(rsiValues[i]); // Use current RSI value for insufficient data
      continue;
    }
    
    const sum = rsiValues.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    rsiSMA.push(sum / period);
  }
  
  return rsiSMA;
}

function calculateBollingerBands(values: number[], period: number = 20, multiplier: number = 2): { upper: number[], lower: number[] } {
  const sma = calculateRSISMA(values, period);
  const upper: number[] = [];
  const lower: number[] = [];

  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      upper.push(values[i] + 10);
      lower.push(values[i] - 10);
      continue;
    }

    const slice = values.slice(i - period + 1, i + 1);
    const mean = sma[i];
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
    const stdDev = Math.sqrt(variance);

    upper.push(mean + (multiplier * stdDev));
    lower.push(mean - (multiplier * stdDev));
  }

  return { upper, lower };
}

function calculateRSIData(candles: Candle[]): RSIData[] {
  const closePrices = candles.map(c => c.close);
  
  // Calculate RSI using improved Wilder's method
  const rsiValues = calculateRSI(closePrices, 14);
  
  // Calculate RSI-SMA (14-period simple moving average of RSI)
  const rsiSMA = calculateRSISMA(rsiValues, 14);
  
  // Calculate Bollinger Bands on RSI
  const rsiBB = calculateBollingerBands(rsiValues, 20, 2);
  
  return candles.map((candle, index) => ({
    timestamp: candle.timestamp,
    value: rsiValues[index],
    ma: rsiSMA[index], // This is now RSI-SMA (14)
    upperBB: rsiBB.upper[index],
    lowerBB: rsiBB.lower[index]
  }));
}

// Enhanced popular symbols with more asset types including currency pairs
export const POPULAR_SYMBOLS = {
  US: ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'NVDA', 'META', 'MSTR', 'PLTR', 'QUBT', 'SPY', 'QQQ'],
  INDIAN: ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'HINDUNILVR.NS', 'ITC.NS', 'SBIN.NS', 'BHARTIARTL.NS', 'KOTAKBANK.NS', 'LT.NS'],
  CRYPTO: ['BTC-USD', 'ETH-USD', 'ADA-USD', 'SOL-USD', 'DOT-USD', 'LINK-USD', 'MATIC-USD', 'AVAX-USD'],
  COMMODITIES: ['GC=F', 'SI=F', 'CL=F', 'BZ=F', 'HG=F', 'PL=F', 'PA=F', 'NG=F'],
  INDICES: ['^GSPC', '^IXIC', '^DJI', '^RUT', '^VIX', '^NSEI', '^BSESN', '^HSI', '^N225', '^FTSE', '^GDAXI', '^FCHI'],
  CURRENCIES: ['EURUSD=X', 'USDJPY=X', 'GBPUSD=X', 'USDCAD=X', 'AUDUSD=X', 'NZDUSD=X', 'USDCHF=X', 'GBPJPY=X']
};