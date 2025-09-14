import { Candle, Symbol, RSIData, Timeframe, ChartData } from '../types/trading';

const SYMBOLS: Symbol[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', price: 178.25, change: 2.15, changePercent: 1.22 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 142.87, change: -1.23, changePercent: -0.85 },
  { symbol: 'MSFT', name: 'Microsoft Corp.', price: 378.90, change: 5.67, changePercent: 1.52 },
  { symbol: 'TSLA', name: 'Tesla Inc.', price: 248.42, change: -8.90, changePercent: -3.46 },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 155.73, change: 3.22, changePercent: 2.11 },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 875.28, change: 12.45, changePercent: 1.44 },
  { symbol: 'META', name: 'Meta Platforms Inc.', price: 485.67, change: -2.89, changePercent: -0.59 },
  { symbol: 'BTC', name: 'Bitcoin', price: 67250.00, change: 1250.75, changePercent: 1.89 },
  { symbol: 'ETH', name: 'Ethereum', price: 3425.80, change: -45.20, changePercent: -1.30 },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF', price: 542.18, change: 2.87, changePercent: 0.53 }
];

const timeframeMinutes: Record<string, number> = {
  '1m': 1,
  '5m': 5,
  '15m': 15,
  '1h': 60,
  '4h': 240,
  '1d': 1440,
  '2d': 2880,
  '3d': 4320,
  '1w': 10080,
  '2w': 20160,
  '3w': 30240,
  '1M': 43200,
  '2M': 86400,
  '3M': 129600,
  '6M': 259200,
  '1Y': 525600
};

function parseCustomTimeframe(timeframe: string): number {
  const match = timeframe.match(/^(\d+)([mhdwMY])$/);
  if (!match) return timeframeMinutes[timeframe] || 60;
  
  const [, value, unit] = match;
  const num = parseInt(value);
  
  switch (unit) {
    case 'm': return num;
    case 'h': return num * 60;
    case 'd': return num * 1440;
    case 'w': return num * 10080;
    case 'M': return num * 43200;
    case 'Y': return num * 525600;
    default: return 60;
  }
}

function generateRandomWalk(startPrice: number, periods: number, volatility: number = 0.02): number[] {
  const prices = [startPrice];
  for (let i = 1; i < periods; i++) {
    const change = (Math.random() - 0.5) * volatility * prices[i - 1];
    prices.push(Math.max(prices[i - 1] + change, 0.01));
  }
  return prices;
}

function generateCandles(symbol: string, timeframe: Timeframe, periods: number = 200): Candle[] {
  const basePrice = SYMBOLS.find(s => s.symbol === symbol)?.price || 100;
  const prices = generateRandomWalk(basePrice, periods * 4, 0.015);
  const candles: Candle[] = [];
  const intervalMs = parseCustomTimeframe(timeframe) * 60 * 1000;
  const now = Date.now();

  for (let i = 0; i < periods; i++) {
    const startIdx = i * 4;
    const candlePrices = prices.slice(startIdx, startIdx + 4);
    const open = candlePrices[0];
    const close = candlePrices[3];
    const high = Math.max(...candlePrices);
    const low = Math.min(...candlePrices);
    const volume = Math.floor(Math.random() * 1000000) + 100000;

    candles.push({
      timestamp: now - (periods - i) * intervalMs,
      open,
      high,
      low,
      close,
      volume
    });
  }

  return candles;
}

function calculateSMA(values: number[], period: number): number[] {
  const sma: number[] = [];
  
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      sma.push(values[i]); // Use current value for insufficient data
      continue;
    }

    const sum = values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    sma.push(sum / period);
  }

  return sma;
}

function calculateBollingerBands(values: number[], period: number = 20, multiplier: number = 2): { upper: number[], lower: number[] } {
  const sma = calculateSMA(values, period);
  const upper: number[] = [];
  const lower: number[] = [];

  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      upper.push(values[i] + 10); // Default bands for insufficient data
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

function calculateRSI(prices: number[], period: number = 14): number[] {
  const rsi: number[] = [];
  
  for (let i = 0; i < prices.length; i++) {
    if (i < period) {
      rsi.push(50); // Default RSI value for insufficient data
      continue;
    }

    let gains = 0;
    let losses = 0;

    for (let j = i - period + 1; j <= i; j++) {
      const change = prices[j] - prices[j - 1];
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsiValue = 100 - (100 / (1 + rs));

    rsi.push(rsiValue);
  }

  return rsi;
}

export function getSymbols(): Symbol[] {
  return SYMBOLS;
}

export function generateChartData(symbol: string, timeframe: Timeframe): ChartData {
  const candles = generateCandles(symbol, timeframe);
  const closePrices = candles.map(c => c.close);
  const rsiValues = calculateRSI(closePrices);
  const rsiMA = calculateSMA(rsiValues, 9); // 9-period moving average of RSI
  const rsiBB = calculateBollingerBands(rsiValues, 20, 2); // Bollinger Bands on RSI
  
  const rsi: RSIData[] = candles.map((candle, index) => ({
    timestamp: candle.timestamp,
    value: rsiValues[index],
    ma: rsiMA[index],
    upperBB: rsiBB.upper[index],
    lowerBB: rsiBB.lower[index]
  }));

  return { candles, rsi };
}

export function searchSymbols(query: string): Symbol[] {
  const lowercaseQuery = query.toLowerCase();
  return SYMBOLS.filter(symbol => 
    symbol.symbol.toLowerCase().includes(lowercaseQuery) ||
    symbol.name.toLowerCase().includes(lowercaseQuery)
  );
}