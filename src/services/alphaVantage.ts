import axios from 'axios';
import { Symbol, Candle, ChartData, RSIData, Timeframe } from '../types/trading';

// Alpha Vantage API configuration
const ALPHA_VANTAGE_BASE = 'https://www.alphavantage.co/query';
const API_KEY = 'demo'; // Using demo key - you can get a free key from alphavantage.co

// Fallback mock data for when API limits are reached
const MOCK_SYMBOLS: Record<string, Symbol> = {
  'AAPL': { symbol: 'AAPL', name: 'Apple Inc.', price: 178.25, change: 2.15, changePercent: 1.22 },
  'GOOGL': { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 142.87, change: -1.23, changePercent: -0.85 },
  'MSFT': { symbol: 'MSFT', name: 'Microsoft Corp.', price: 378.90, change: 5.67, changePercent: 1.52 },
  'TSLA': { symbol: 'TSLA', name: 'Tesla Inc.', price: 248.42, change: -8.90, changePercent: -3.46 },
  'AMZN': { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 155.73, change: 3.22, changePercent: 2.11 },
  'NVDA': { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 875.28, change: 12.45, changePercent: 1.44 },
  'META': { symbol: 'META', name: 'Meta Platforms Inc.', price: 485.67, change: -2.89, changePercent: -0.59 },
  'BTC': { symbol: 'BTC', name: 'Bitcoin', price: 67250.00, change: 1250.75, changePercent: 1.89 },
  'ETH': { symbol: 'ETH', name: 'Ethereum', price: 3425.80, change: -45.20, changePercent: -1.30 },
  'SPY': { symbol: 'SPY', name: 'SPDR S&P 500 ETF', price: 542.18, change: 2.87, changePercent: 0.53 },
  'QQQ': { symbol: 'QQQ', name: 'Invesco QQQ Trust', price: 425.67, change: 3.45, changePercent: 0.82 },
  'RELIANCE': { symbol: 'RELIANCE', name: 'Reliance Industries Ltd.', price: 2456.75, change: 23.45, changePercent: 0.96 },
  'TCS': { symbol: 'TCS', name: 'Tata Consultancy Services Ltd.', price: 3441.10, change: -12.30, changePercent: -0.36 },
  'HDFCBANK': { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd.', price: 1515.40, change: 8.75, changePercent: 0.58 },
  'INFY': { symbol: 'INFY', name: 'Infosys Ltd.', price: 1789.25, change: -5.60, changePercent: -0.31 }
};

interface AlphaVantageQuoteResponse {
  'Global Quote': {
    '01. symbol': string;
    '02. open': string;
    '03. high': string;
    '04. low': string;
    '05. price': string;
    '06. volume': string;
    '07. latest trading day': string;
    '08. previous close': string;
    '09. change': string;
    '10. change percent': string;
  };
}

interface AlphaVantageTimeSeriesResponse {
  'Meta Data': {
    '1. Information': string;
    '2. Symbol': string;
    '3. Last Refreshed': string;
    '4. Interval'?: string;
    '5. Output Size'?: string;
    '6. Time Zone': string;
  };
  'Time Series (Daily)'?: Record<string, {
    '1. open': string;
    '2. high': string;
    '3. low': string;
    '4. close': string;
    '5. volume': string;
  }>;
  'Time Series (1min)'?: Record<string, {
    '1. open': string;
    '2. high': string;
    '3. low': string;
    '4. close': string;
    '5. volume': string;
  }>;
  'Time Series (5min)'?: Record<string, {
    '1. open': string;
    '2. high': string;
    '3. low': string;
    '4. close': string;
    '5. volume': string;
  }>;
  'Time Series (15min)'?: Record<string, {
    '1. open': string;
    '2. high': string;
    '3. low': string;
    '4. close': string;
    '5. volume': string;
  }>;
  'Time Series (30min)'?: Record<string, {
    '1. open': string;
    '2. high': string;
    '3. low': string;
    '4. close': string;
    '5. volume': string;
  }>;
  'Time Series (60min)'?: Record<string, {
    '1. open': string;
    '2. high': string;
    '3. low': string;
    '4. close': string;
    '5. volume': string;
  }>;
}

interface AlphaVantageSearchResponse {
  bestMatches: Array<{
    '1. symbol': string;
    '2. name': string;
    '3. type': string;
    '4. region': string;
    '5. marketOpen': string;
    '6. marketClose': string;
    '7. timezone': string;
    '8. currency': string;
    '9. matchScore': string;
  }>;
}

// Convert timeframe to Alpha Vantage function and interval
function getAlphaVantageParams(timeframe: Timeframe): { func: string; interval?: string } {
  switch (timeframe) {
    case '1h':
      return { func: 'TIME_SERIES_INTRADAY', interval: '60min' };
    case '2h':
    case '3h':
    case '4h':
      return { func: 'TIME_SERIES_INTRADAY', interval: '60min' }; // Will aggregate later
    case '1d':
    case '2d':
    case '3d':
    case '4d':
      return { func: 'TIME_SERIES_DAILY' };
    case '1w':
    case '2w':
    case '3w':
      return { func: 'TIME_SERIES_WEEKLY' };
    case '1M':
    case '2M':
    case '3M':
      return { func: 'TIME_SERIES_MONTHLY' };
    default:
      return { func: 'TIME_SERIES_DAILY' };
  }
}

// Clean symbol for Alpha Vantage (remove exchange suffixes)
function cleanSymbolForAlphaVantage(symbol: string): string {
  return symbol.replace(/\.(NS|BO)$/, '').replace(/-USD$/, '').toUpperCase();
}

// Generate mock data for symbols
function generateMockSymbolData(symbol: string): Symbol {
  const cleanSymbol = cleanSymbolForAlphaVantage(symbol);
  
  if (MOCK_SYMBOLS[cleanSymbol]) {
    const mockData = { ...MOCK_SYMBOLS[cleanSymbol] };
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
    name: `${cleanSymbol} Company`,
    price: basePrice,
    change: change,
    changePercent: changePercent
  };
}

// Generate mock chart data
function generateMockChartData(symbol: string, timeframe: Timeframe): ChartData {
  const cleanSymbol = cleanSymbolForAlphaVantage(symbol);
  const basePrice = MOCK_SYMBOLS[cleanSymbol]?.price || 100;
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
    const cleanSymbol = cleanSymbolForAlphaVantage(symbol);
    
    const url = `${ALPHA_VANTAGE_BASE}?function=GLOBAL_QUOTE&symbol=${cleanSymbol}&apikey=${API_KEY}`;
    
    const response = await axios.get<AlphaVantageQuoteResponse>(url, {
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    const quote = response.data['Global Quote'];
    
    if (!quote || !quote['05. price']) {
      console.warn(`No data found for ${symbol} from Alpha Vantage, using fallback`);
      return generateMockSymbolData(symbol);
    }

    const price = parseFloat(quote['05. price']);
    const change = parseFloat(quote['09. change']);
    const changePercentStr = quote['10. change percent'].replace('%', '');
    const changePercent = parseFloat(changePercentStr);

    return {
      symbol: symbol.toUpperCase(),
      name: cleanSymbol, // Alpha Vantage doesn't provide company names in quote endpoint
      price: price,
      change: change,
      changePercent: changePercent
    };
  } catch (error) {
    console.warn(`Alpha Vantage API failed for ${symbol}, using fallback data:`, error);
    return generateMockSymbolData(symbol);
  }
}

export async function fetchChartData(symbol: string, timeframe: Timeframe): Promise<ChartData | null> {
  try {
    const cleanSymbol = cleanSymbolForAlphaVantage(symbol);
    const { func, interval } = getAlphaVantageParams(timeframe);
    
    let url = `${ALPHA_VANTAGE_BASE}?function=${func}&symbol=${cleanSymbol}&apikey=${API_KEY}`;
    if (interval) {
      url += `&interval=${interval}`;
    }
    
    const response = await axios.get<AlphaVantageTimeSeriesResponse>(url, {
      timeout: 15000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    let timeSeries: Record<string, any> | undefined;
    
    // Get the appropriate time series data
    if (response.data['Time Series (Daily)']) {
      timeSeries = response.data['Time Series (Daily)'];
    } else if (response.data['Time Series (60min)']) {
      timeSeries = response.data['Time Series (60min)'];
    } else if (response.data['Time Series (30min)']) {
      timeSeries = response.data['Time Series (30min)'];
    } else if (response.data['Time Series (15min)']) {
      timeSeries = response.data['Time Series (15min)'];
    } else if (response.data['Time Series (5min)']) {
      timeSeries = response.data['Time Series (5min)'];
    } else if (response.data['Time Series (1min)']) {
      timeSeries = response.data['Time Series (1min)'];
    }

    if (!timeSeries) {
      console.warn(`No time series data found for ${symbol}, using fallback`);
      return generateMockChartData(symbol, timeframe);
    }

    // Convert to candles
    const candles: Candle[] = Object.entries(timeSeries)
      .map(([timestamp, data]) => ({
        timestamp: new Date(timestamp).getTime(),
        open: parseFloat(data['1. open']),
        high: parseFloat(data['2. high']),
        low: parseFloat(data['3. low']),
        close: parseFloat(data['4. close']),
        volume: parseInt(data['5. volume'])
      }))
      .sort((a, b) => a.timestamp - b.timestamp) // Sort by timestamp ascending
      .slice(-200); // Keep last 200 candles

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
    console.warn(`Alpha Vantage chart API failed for ${symbol}, using fallback data:`, error);
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
    const cleanQuery = cleanSymbolForAlphaVantage(query);
    const mockResults = Object.values(MOCK_SYMBOLS).filter(symbol =>
      symbol.symbol.toLowerCase().includes(cleanQuery.toLowerCase()) ||
      symbol.name.toLowerCase().includes(cleanQuery.toLowerCase())
    );

    if (mockResults.length > 0) {
      return mockResults.slice(0, 10);
    }

    // Try Alpha Vantage search
    const url = `${ALPHA_VANTAGE_BASE}?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(query)}&apikey=${API_KEY}`;
    
    const response = await axios.get<AlphaVantageSearchResponse>(url, {
      timeout: 8000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    const matches = response.data.bestMatches || [];
    
    return matches
      .filter(match => parseFloat(match['9. matchScore']) > 0.5) // Only high-confidence matches
      .slice(0, 10)
      .map(match => ({
        symbol: match['1. symbol'],
        name: match['2. name'],
        price: 0,
        change: 0,
        changePercent: 0
      }));
  } catch (error) {
    console.warn('Alpha Vantage search failed, using mock results:', error);
    
    // Generate some mock search results
    const cleanQuery = cleanSymbolForAlphaVantage(query);
    return [
      { symbol: cleanQuery, name: `${cleanQuery} Company`, price: 0, change: 0, changePercent: 0 },
      { symbol: `${cleanQuery}1`, name: `${cleanQuery} Corp`, price: 0, change: 0, changePercent: 0 }
    ].slice(0, 5);
  }
}

// RSI calculation functions (same as before)
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

// Enhanced popular symbols for Alpha Vantage
export const POPULAR_SYMBOLS = {
  US: ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'NVDA', 'META', 'SPY', 'QQQ', 'MSTR', 'PLTR', 'QUBT'],
  INDIAN: ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'HINDUNILVR', 'ITC', 'SBIN', 'BHARTIARTL', 'KOTAKBANK', 'LT'],
  CRYPTO: ['BTC', 'ETH', 'ADA', 'SOL', 'DOT', 'LINK', 'MATIC', 'AVAX'],
  COMMODITIES: ['GLD', 'SLV', 'USO', 'UNG', 'CORN', 'WEAT', 'SOYB', 'DBA'],
  INDICES: ['SPY', 'QQQ', 'DIA', 'IWM', 'VTI', 'VEA', 'VWO', 'EFA'],
  CURRENCIES: ['UUP', 'FXE', 'FXY', 'FXB', 'FXC', 'FXA', 'FXF', 'CYB']
};