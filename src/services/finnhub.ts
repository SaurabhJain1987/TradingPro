import axios from 'axios';
import { Symbol, Candle, ChartData, RSIData, Timeframe } from '../types/trading';

// Finnhub API configuration
const FINNHUB_BASE = 'https://finnhub.io/api/v1';
const API_KEY = 'sandbox_c8k2aiad3r6o6rrqjjog'; // Using sandbox key - get free key from finnhub.io

// Fallback mock data for when API limits are reached
const MOCK_SYMBOLS: Record<string, Symbol> = {
  'AAPL': { symbol: 'AAPL', name: 'Apple Inc.', price: 178.25, change: 2.15, changePercent: 1.22 },
  'GOOGL': { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 142.87, change: -1.23, changePercent: -0.85 },
  'MSFT': { symbol: 'MSFT', name: 'Microsoft Corp.', price: 378.90, change: 5.67, changePercent: 1.52 },
  'TSLA': { symbol: 'TSLA', name: 'Tesla Inc.', price: 248.42, change: -8.90, changePercent: -3.46 },
  'AMZN': { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 155.73, change: 3.22, changePercent: 2.11 },
  'NVDA': { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 875.28, change: 12.45, changePercent: 1.44 },
  'META': { symbol: 'META', name: 'Meta Platforms Inc.', price: 485.67, change: -2.89, changePercent: -0.59 },
  'BTC-USD': { symbol: 'BTC-USD', name: 'Bitcoin USD', price: 67250.00, change: 1250.75, changePercent: 1.89 },
  'ETH-USD': { symbol: 'ETH-USD', name: 'Ethereum USD', price: 3425.80, change: -45.20, changePercent: -1.30 },
  'SPY': { symbol: 'SPY', name: 'SPDR S&P 500 ETF', price: 542.18, change: 2.87, changePercent: 0.53 },
  'QQQ': { symbol: 'QQQ', name: 'Invesco QQQ Trust', price: 425.67, change: 3.45, changePercent: 0.82 },
  'RELIANCE.NS': { symbol: 'RELIANCE.NS', name: 'Reliance Industries Ltd.', price: 2456.75, change: 23.45, changePercent: 0.96 },
  'TCS.NS': { symbol: 'TCS.NS', name: 'Tata Consultancy Services Ltd.', price: 3441.10, change: -12.30, changePercent: -0.36 },
  'HDFCBANK.NS': { symbol: 'HDFCBANK.NS', name: 'HDFC Bank Ltd.', price: 1515.40, change: 8.75, changePercent: 0.58 },
  'INFY.NS': { symbol: 'INFY.NS', name: 'Infosys Ltd.', price: 1789.25, change: -5.60, changePercent: -0.31 }
};

interface FinnhubQuoteResponse {
  c: number; // Current price
  d: number; // Change
  dp: number; // Percent change
  h: number; // High price of the day
  l: number; // Low price of the day
  o: number; // Open price of the day
  pc: number; // Previous close price
  t: number; // Timestamp
}

interface FinnhubCandleResponse {
  c: number[]; // Close prices
  h: number[]; // High prices
  l: number[]; // Low prices
  o: number[]; // Open prices
  s: string; // Status
  t: number[]; // Timestamps
  v: number[]; // Volume
}

interface FinnhubSearchResponse {
  count: number;
  result: Array<{
    description: string;
    displaySymbol: string;
    symbol: string;
    type: string;
  }>;
}

interface FinnhubCompanyProfile {
  country: string;
  currency: string;
  exchange: string;
  ipo: string;
  marketCapitalization: number;
  name: string;
  phone: string;
  shareOutstanding: number;
  ticker: string;
  weburl: string;
  logo: string;
  finnhubIndustry: string;
}

// Convert timeframe to Finnhub resolution
function getFinnhubResolution(timeframe: Timeframe): string {
  const resolutionMap: Record<string, string> = {
    '1h': '60',
    '2h': '60', // Will aggregate
    '3h': '60', // Will aggregate
    '4h': '60', // Will aggregate
    '1d': 'D',
    '2d': 'D', // Will aggregate
    '3d': 'D', // Will aggregate
    '4d': 'D', // Will aggregate
    '1w': 'W',
    '2w': 'W', // Will aggregate
    '3w': 'W', // Will aggregate
    '1M': 'M',
    '2M': 'M', // Will aggregate
    '3M': 'M' // Will aggregate
  };
  return resolutionMap[timeframe] || 'D';
}

// Format symbol for Finnhub
function formatSymbolForFinnhub(symbol: string): string {
  const cleanSymbol = symbol.trim().toUpperCase();
  
  // Crypto mappings for Finnhub
  const cryptoMappings: Record<string, string> = {
    'BTC': 'BINANCE:BTCUSDT',
    'ETH': 'BINANCE:ETHUSDT',
    'ADA': 'BINANCE:ADAUSDT',
    'SOL': 'BINANCE:SOLUSDT',
    'DOT': 'BINANCE:DOTUSDT',
    'LINK': 'BINANCE:LINKUSDT',
    'MATIC': 'BINANCE:MATICUSDT',
    'AVAX': 'BINANCE:AVAXUSDT',
    'BTC-USD': 'BINANCE:BTCUSDT',
    'ETH-USD': 'BINANCE:ETHUSDT'
  };
  
  if (cryptoMappings[cleanSymbol]) {
    return cryptoMappings[cleanSymbol];
  }
  
  // Indian stocks - remove .NS/.BO suffix for Finnhub
  if (cleanSymbol.includes('.NS') || cleanSymbol.includes('.BO')) {
    return cleanSymbol; // Keep as is for now, Finnhub supports NSE symbols
  }
  
  return cleanSymbol;
}

// Generate mock data for symbols
function generateMockSymbolData(symbol: string): Symbol {
  if (MOCK_SYMBOLS[symbol]) {
    const mockData = { ...MOCK_SYMBOLS[symbol] };
    // Add some realistic variation
    const variation = (Math.random() - 0.5) * 0.02; // ±1% variation
    mockData.price = mockData.price * (1 + variation);
    mockData.change = mockData.change + (variation * mockData.price);
    mockData.changePercent = (mockData.change / (mockData.price - mockData.change)) * 100;
    return mockData;
  }

  const basePrice = 50 + Math.random() * 500;
  const change = (Math.random() - 0.5) * 20;
  const changePercent = (change / basePrice) * 100;
  
  return {
    symbol: symbol.toUpperCase(),
    name: `${symbol} Company`,
    price: basePrice,
    change: change,
    changePercent: changePercent
  };
}

// Generate mock chart data
function generateMockChartData(symbol: string, timeframe: Timeframe): ChartData {
  const basePrice = MOCK_SYMBOLS[symbol]?.price || 100;
  const periods = 200;
  const candles: Candle[] = [];
  const intervalMs = getTimeIntervalMs(timeframe);
  const now = Date.now();

  let currentPrice = basePrice * 0.95;
  
  for (let i = 0; i < periods; i++) {
    const volatility = 0.015;
    const change = (Math.random() - 0.5) * volatility * currentPrice;
    const open = currentPrice;
    const close = Math.max(currentPrice + change, 0.01);
    const high = Math.max(open, close) * (1 + Math.random() * 0.008);
    const low = Math.min(open, close) * (1 - Math.random() * 0.008);
    const volume = Math.floor(Math.random() * 1000000) + 100000;

    candles.push({
      timestamp: now - (periods - i) * intervalMs,
      open,
      high,
      low,
      close,
      volume
    });

    currentPrice = close;
  }

  const rsi = calculateRSIData(candles);
  return { candles, rsi };
}

function getTimeIntervalMs(timeframe: Timeframe): number {
  const intervals: Record<string, number> = {
    '1h': 3600000,
    '2h': 7200000,
    '3h': 10800000,
    '4h': 14400000,
    '1d': 86400000,
    '2d': 172800000,
    '3d': 259200000,
    '4d': 345600000,
    '1w': 604800000,
    '6d': 518400000,
    '7d': 604800000,
    '2w': 1209600000,
    '3w': 1814400000,
    '1M': 2592000000,
    '5w': 3024000000,
    '6w': 3628800000,
    '2M': 5184000000,
    '3M': 7776000000
  };
  return intervals[timeframe] || 3600000;
}

export async function fetchSymbolData(symbol: string): Promise<Symbol | null> {
  try {
    const formattedSymbol = formatSymbolForFinnhub(symbol);
    
    // Fetch quote data
    const quoteUrl = `${FINNHUB_BASE}/quote?symbol=${formattedSymbol}&token=${API_KEY}`;
    
    const response = await axios.get<FinnhubQuoteResponse>(quoteUrl, {
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    const quote = response.data;
    
    if (!quote || quote.c === 0) {
      console.warn(`No data found for ${symbol} from Finnhub, using fallback`);
      return generateMockSymbolData(symbol);
    }

    // Try to get company profile for better name
    let companyName = symbol;
    try {
      const profileUrl = `${FINNHUB_BASE}/stock/profile2?symbol=${formattedSymbol}&token=${API_KEY}`;
      const profileResponse = await axios.get<FinnhubCompanyProfile>(profileUrl, { timeout: 5000 });
      if (profileResponse.data && profileResponse.data.name) {
        companyName = profileResponse.data.name;
      }
    } catch (profileError) {
      // Ignore profile errors, use symbol as name
    }

    return {
      symbol: symbol.toUpperCase(),
      name: companyName,
      price: quote.c,
      change: quote.d,
      changePercent: quote.dp
    };
  } catch (error) {
    console.warn(`Finnhub API failed for ${symbol}, using fallback data:`, error);
    return generateMockSymbolData(symbol);
  }
}

export async function fetchChartData(symbol: string, timeframe: Timeframe): Promise<ChartData | null> {
  try {
    const formattedSymbol = formatSymbolForFinnhub(symbol);
    const resolution = getFinnhubResolution(timeframe);
    
    // Calculate time range
    const now = Math.floor(Date.now() / 1000);
    let from: number;
    
    switch (timeframe) {
      case '1h':
      case '2h':
      case '3h':
      case '4h':
        from = now - (7 * 24 * 60 * 60); // 7 days for hourly data
        break;
      case '1d':
      case '2d':
      case '3d':
      case '4d':
        from = now - (365 * 24 * 60 * 60); // 1 year for daily data
        break;
      case '1w':
      case '2w':
      case '3w':
        from = now - (2 * 365 * 24 * 60 * 60); // 2 years for weekly data
        break;
      case '1M':
      case '2M':
      case '3M':
        from = now - (5 * 365 * 24 * 60 * 60); // 5 years for monthly data
        break;
      default:
        from = now - (365 * 24 * 60 * 60); // Default 1 year
    }
    
    const candleUrl = `${FINNHUB_BASE}/stock/candle?symbol=${formattedSymbol}&resolution=${resolution}&from=${from}&to=${now}&token=${API_KEY}`;
    
    const response = await axios.get<FinnhubCandleResponse>(candleUrl, {
      timeout: 15000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    const data = response.data;
    
    if (!data || data.s !== 'ok' || !data.c || data.c.length === 0) {
      console.warn(`No candle data found for ${symbol}, using fallback`);
      return generateMockChartData(symbol, timeframe);
    }

    // Convert to candles
    const candles: Candle[] = data.t.map((timestamp, index) => ({
      timestamp: timestamp * 1000, // Convert to milliseconds
      open: data.o[index],
      high: data.h[index],
      low: data.l[index],
      close: data.c[index],
      volume: data.v[index]
    })).slice(-200); // Keep last 200 candles

    if (candles.length === 0) {
      console.warn(`No valid candle data for ${symbol}, using fallback`);
      return generateMockChartData(symbol, timeframe);
    }

    // Apply aggregation for custom timeframes if needed
    const aggregatedCandles = aggregateCandles(candles, timeframe);
    
    // Calculate RSI
    const rsi = calculateRSIData(aggregatedCandles);
    
    return { candles: aggregatedCandles, rsi };
  } catch (error) {
    console.warn(`Finnhub chart API failed for ${symbol}, using fallback data:`, error);
    return generateMockChartData(symbol, timeframe);
  }
}

// Aggregate candles for custom timeframes
function aggregateCandles(candles: Candle[], timeframe: Timeframe): Candle[] {
  const aggregationMap: Record<string, number> = {
    '2h': 2,
    '3h': 3,
    '4h': 4,
    '2d': 2,
    '3d': 3,
    '4d': 4,
    '2w': 2,
    '3w': 3,
    '2M': 2,
    '3M': 3
  };

  const factor = aggregationMap[timeframe];
  if (!factor || factor <= 1) return candles;

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

export async function searchSymbols(query: string): Promise<Symbol[]> {
  try {
    // First search in our mock data for quick results
    const mockResults = Object.values(MOCK_SYMBOLS).filter(symbol =>
      symbol.symbol.toLowerCase().includes(query.toLowerCase()) ||
      symbol.name.toLowerCase().includes(query.toLowerCase())
    );

    if (mockResults.length > 0) {
      return mockResults.slice(0, 10);
    }

    // Try Finnhub search
    const searchUrl = `${FINNHUB_BASE}/search?q=${encodeURIComponent(query)}&token=${API_KEY}`;
    
    const response = await axios.get<FinnhubSearchResponse>(searchUrl, {
      timeout: 8000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    const results = response.data.result || [];
    
    return results
      .filter(result => result.type === 'Common Stock' || result.type === 'ETP') // Filter for stocks and ETFs
      .slice(0, 10)
      .map(result => ({
        symbol: result.symbol,
        name: result.description,
        price: 0,
        change: 0,
        changePercent: 0
      }));
  } catch (error) {
    console.warn('Finnhub search failed, using mock results:', error);
    
    // Generate some mock search results
    return [
      { symbol: query.toUpperCase(), name: `${query} Company`, price: 0, change: 0, changePercent: 0 },
      { symbol: `${query}1`, name: `${query} Corp`, price: 0, change: 0, changePercent: 0 }
    ].slice(0, 5);
  }
}

// RSI calculation functions
function calculateRSI(prices: number[], period: number = 14): number[] {
  const rsi: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];
  
  for (let i = 0; i < prices.length; i++) {
    if (i === 0) {
      gains.push(0);
      losses.push(0);
      rsi.push(50);
      continue;
    }
    
    const change = prices[i] - prices[i - 1];
    gains.push(Math.max(0, change));
    losses.push(Math.max(0, -change));
    
    if (i < period) {
      rsi.push(50);
      continue;
    }
    
    let avgGain: number;
    let avgLoss: number;
    
    if (i === period) {
      avgGain = gains.slice(1, period + 1).reduce((sum, gain) => sum + gain, 0) / period;
      avgLoss = losses.slice(1, period + 1).reduce((sum, loss) => sum + loss, 0) / period;
    } else {
      const prevAvgGain = calculatePreviousAverage(gains, losses, i - 1, period).avgGain;
      const prevAvgLoss = calculatePreviousAverage(gains, losses, i - 1, period).avgLoss;
      
      avgGain = ((prevAvgGain * (period - 1)) + gains[i]) / period;
      avgLoss = ((prevAvgLoss * (period - 1)) + losses[i]) / period;
    }
    
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

function calculatePreviousAverage(gains: number[], losses: number[], index: number, period: number): { avgGain: number; avgLoss: number } {
  if (index < period) {
    return { avgGain: 0, avgLoss: 0 };
  }
  
  if (index === period) {
    const avgGain = gains.slice(1, period + 1).reduce((sum, gain) => sum + gain, 0) / period;
    const avgLoss = losses.slice(1, period + 1).reduce((sum, loss) => sum + loss, 0) / period;
    return { avgGain, avgLoss };
  }
  
  const prev = calculatePreviousAverage(gains, losses, index - 1, period);
  const avgGain = ((prev.avgGain * (period - 1)) + gains[index]) / period;
  const avgLoss = ((prev.avgLoss * (period - 1)) + losses[index]) / period;
  
  return { avgGain, avgLoss };
}

function calculateRSISMA(rsiValues: number[], period: number = 14): number[] {
  const rsiSMA: number[] = [];
  
  for (let i = 0; i < rsiValues.length; i++) {
    if (i < period - 1) {
      rsiSMA.push(rsiValues[i]);
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
  
  const rsiValues = calculateRSI(closePrices, 14);
  const rsiSMA = calculateRSISMA(rsiValues, 14);
  const rsiBB = calculateBollingerBands(rsiValues, 20, 2);
  
  return candles.map((candle, index) => ({
    timestamp: candle.timestamp,
    value: rsiValues[index],
    ma: rsiSMA[index],
    upperBB: rsiBB.upper[index],
    lowerBB: rsiBB.lower[index]
  }));
}

// Enhanced popular symbols for Finnhub
export const POPULAR_SYMBOLS = {
  US: ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'NVDA', 'META', 'SPY', 'QQQ', 'MSTR', 'PLTR', 'QUBT'],
  INDIAN: ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'HINDUNILVR.NS', 'ITC.NS', 'SBIN.NS', 'BHARTIARTL.NS', 'KOTAKBANK.NS', 'LT.NS'],
  CRYPTO: ['BTC', 'ETH', 'ADA', 'SOL', 'DOT', 'LINK', 'MATIC', 'AVAX'],
  COMMODITIES: ['GLD', 'SLV', 'USO', 'UNG', 'CORN', 'WEAT', 'SOYB', 'DBA'],
  INDICES: ['SPY', 'QQQ', 'DIA', 'IWM', 'VTI', 'VEA', 'VWO', 'EFA'],
  CURRENCIES: ['UUP', 'FXE', 'FXY', 'FXB', 'FXC', 'FXA', 'FXF', 'CYB']
};