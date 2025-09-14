import React, { useState, useEffect } from 'react';
import { Chart } from './Chart';
import { SymbolSearch } from './SymbolSearch';
import { Timeframe, ChartData, StockPreference } from '../types/trading';
import { fetchChartData, fetchSymbolData } from '../services/yahooFinance';
import { RefreshCw, ChevronLeft, ChevronRight, BarChart3, Grid3X3 } from 'lucide-react';

interface MultiChartProps {
  symbol: string;
  viewMode: 'single' | 'multi';
  onViewModeChange: (mode: 'single' | 'multi') => void;
  onSymbolChange: (symbol: string) => void;
  stockPreferences: StockPreference[];
}

const AVAILABLE_TIMEFRAMES: { label: string; value: Timeframe }[] = [
  { label: '1H', value: '1h' },
  { label: '2H', value: '2h' },
  { label: '3H', value: '3h' },
  { label: '4H', value: '4h' },
  { label: '6H', value: '6h' },
  { label: '8H', value: '8h' },
  { label: '12H', value: '12h' },
  { label: '18H', value: '18h' },
  { label: '1D', value: '1d' },
  { label: '2D', value: '2d' },
  { label: '3D', value: '3d' },
  { label: '4D', value: '4d' },
  { label: '1W', value: '1w' },
  { label: '6D', value: '6d' },
  { label: '7D', value: '7d' },
  { label: '2W', value: '2w' },
  { label: '3W', value: '3w' },
  { label: '1M', value: '1M' },
  { label: '5W', value: '5w' },
  { label: '6W', value: '6w' },
  { label: '2M', value: '2M' },
  { label: '3M', value: '3M' },
  { label: '6M', value: '6M' }
];

export function MultiChart({ symbol, viewMode, onViewModeChange, onSymbolChange, stockPreferences }: MultiChartProps) {
  const [selectedTimeframes, setSelectedTimeframes] = useState<Timeframe[]>(() => {
    const saved = localStorage.getItem('multiChartTimeframes');
    return saved ? JSON.parse(saved) : ['1h', '4h', '1d', '1w'];
  });
  const [currentChartIndex, setCurrentChartIndex] = useState(() => {
    return parseInt(localStorage.getItem('currentChartIndex') || '0');
  });
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [symbolData, setSymbolData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSymbolSearch, setShowSymbolSearch] = useState(false);

  const currentTimeframe = selectedTimeframes[currentChartIndex];

  // Apply stock preferences when symbol changes
  useEffect(() => {
    const preference = stockPreferences.find(p => p.symbol === symbol);
    if (preference) {
      const newTimeframes = [
        preference.timeframes.chart1,
        preference.timeframes.chart2,
        preference.timeframes.chart3,
        preference.timeframes.chart4
      ];
      setSelectedTimeframes(newTimeframes);
      localStorage.setItem('multiChartTimeframes', JSON.stringify(newTimeframes));
    }
  }, [symbol, stockPreferences]);

  // Save to localStorage when timeframes or chart index changes
  useEffect(() => {
    localStorage.setItem('multiChartTimeframes', JSON.stringify(selectedTimeframes));
  }, [selectedTimeframes]);

  useEffect(() => {
    localStorage.setItem('currentChartIndex', currentChartIndex.toString());
  }, [currentChartIndex]);

  useEffect(() => {
    fetchData();
  }, [symbol, currentChartIndex, selectedTimeframes]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [chartResult, symbolResult] = await Promise.all([
        fetchChartData(symbol, currentTimeframe),
        fetchSymbolData(symbol)
      ]);
      
      if (chartResult) {
        setChartData(chartResult);
      } else {
        setError('Unable to fetch chart data. Please check the symbol and try again.');
      }
      
      if (symbolResult) {
        setSymbolData(symbolResult);
      }
    } catch (err) {
      setError('Failed to fetch data. Please try again.');
      console.error('Error fetching data:', err);
    }
    
    setLoading(false);
  };

  const handleTimeframeChange = (index: number, newTimeframe: Timeframe) => {
    const updatedTimeframes = [...selectedTimeframes];
    updatedTimeframes[index] = newTimeframe;
    setSelectedTimeframes(updatedTimeframes);
  };

  const handlePrevChart = () => {
    setCurrentChartIndex(prev => Math.max(0, prev - 1));
  };

  const handleNextChart = () => {
    setCurrentChartIndex(prev => Math.min(3, prev + 1));
  };

  const handleSymbolSelect = (newSymbol: string) => {
    onSymbolChange(newSymbol);
    setShowSymbolSearch(false);
  };

  const currentPrice = symbolData?.price || (chartData?.candles[chartData.candles.length - 1]?.close) || 0;
  const previousPrice = chartData?.candles[chartData.candles.length - 2]?.close || 0;
  const priceChange = symbolData?.change || (currentPrice - previousPrice);
  const priceChangePercent = symbolData?.changePercent || ((priceChange / previousPrice) * 100);

  // Check if current symbol has saved preferences
  const hasPreferences = stockPreferences.some(p => p.symbol === symbol);

  if (loading && !chartData) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
          <div className="text-gray-400">Loading chart data...</div>
        </div>
      </div>
    );
  }

  if (error && !chartData) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="text-red-400 mb-2">{error}</div>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white border-r-2 border-gray-300">
      {/* Compact Header */}
      <div className="px-4 py-2 border-b border-gray-300 flex-shrink-0 bg-white">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowSymbolSearch(true)}
                className="text-lg font-bold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer"
                title="Click to search symbols"
              >
                {symbol}
              </button>
              {hasPreferences && (
                <div className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                  Custom
                </div>
              )}
              {loading && (
                <RefreshCw className="w-3 h-3 animate-spin text-blue-500" />
              )}
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-lg font-bold text-gray-900">${currentPrice.toFixed(2)}</span>
              <div className={`flex items-center space-x-1 text-xs font-medium ${
                priceChange >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                <span>
                  {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)} ({priceChangePercent >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded p-0.5 border border-gray-300">
              <button
                onClick={() => onViewModeChange('single')}
                className={`px-2 py-1 text-xs font-medium rounded transition-all duration-200 flex items-center ${
                  viewMode === 'single'
                    ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
                title="Single Chart View"
              >
                <BarChart3 className="w-3 h-3" />
              </button>
              <button
                onClick={() => onViewModeChange('multi')}
                className={`px-2 py-1 text-xs font-medium rounded transition-all duration-200 flex items-center ${
                  viewMode === 'multi'
                    ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
                title="Multi Chart View"
              >
                <Grid3X3 className="w-3 h-3" />
              </button>
            </div>

            <button
              onClick={fetchData}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors border border-gray-300"
              title="Refresh chart"
            >
              <RefreshCw className="w-3 h-3 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Timeframe Configuration Row */}
        <div className="flex items-center justify-between">
          {/* 4 Timeframe Dropdowns */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-600 font-medium">Charts:</span>
            {selectedTimeframes.map((timeframe, index) => (
              <select
                key={index}
                value={timeframe}
                onChange={(e) => handleTimeframeChange(index, e.target.value as Timeframe)}
                className={`px-2 py-1 text-xs border rounded transition-colors ${
                  currentChartIndex === index
                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                {AVAILABLE_TIMEFRAMES.map(tf => (
                  <option key={tf.value} value={tf.value}>{tf.label}</option>
                ))}
              </select>
            ))}
          </div>

          {/* Chart Navigation */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrevChart}
              disabled={currentChartIndex === 0}
              className="p-1 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
            
            <div className="text-center min-w-16">
              <div className="text-sm font-bold text-gray-900">
                {AVAILABLE_TIMEFRAMES.find(tf => tf.value === currentTimeframe)?.label}
              </div>
              <div className="text-xs text-gray-600">
                {currentChartIndex + 1} of 4
              </div>
            </div>
            
            <button
              onClick={handleNextChart}
              disabled={currentChartIndex >= 3}
              className="p-1 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Chart Container - Maximum height */}
      <div className="flex-1 p-3 min-h-0 bg-gray-50">
        {chartData ? (
          <Chart
            symbol={symbol}
            timeframe={currentTimeframe}
            candles={chartData.candles}
            rsi={chartData.rsi}
            showRSI={true}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500 bg-white rounded-lg border-2 border-gray-300">
            No chart data available
          </div>
        )}
      </div>

      {/* Symbol Search Modal */}
      {showSymbolSearch && (
        <SymbolSearch
          onSymbolSelect={handleSymbolSelect}
          onClose={() => setShowSymbolSearch(false)}
        />
      )}
    </div>
  );
}