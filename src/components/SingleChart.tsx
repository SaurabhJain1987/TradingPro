import React, { useState, useEffect } from 'react';
import { Chart } from './Chart';
import { TimeframeSelector } from './TimeframeSelector';
import { SymbolSearch } from './SymbolSearch';
import { Timeframe, ChartData } from '../types/trading';
import { fetchChartData, fetchSymbolData } from '../services/yahooFinance';
import { RefreshCw, BarChart3, Grid3X3 } from 'lucide-react';

interface SingleChartProps {
  symbol: string;
  viewMode: 'single' | 'multi';
  onViewModeChange: (mode: 'single' | 'multi') => void;
  onSymbolChange: (symbol: string) => void;
}

export function SingleChart({ symbol, viewMode, onViewModeChange, onSymbolChange }: SingleChartProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>(() => {
    return (localStorage.getItem('selectedTimeframe') as Timeframe) || '1h';
  });
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [symbolData, setSymbolData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSymbolSearch, setShowSymbolSearch] = useState(false);

  // Save timeframe to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('selectedTimeframe', selectedTimeframe);
  }, [selectedTimeframe]);

  useEffect(() => {
    fetchData();
  }, [symbol, selectedTimeframe]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [chartResult, symbolResult] = await Promise.all([
        fetchChartData(symbol, selectedTimeframe),
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

  const handleSymbolSelect = (newSymbol: string) => {
    onSymbolChange(newSymbol);
    setShowSymbolSearch(false);
  };

  const currentPrice = symbolData?.price || (chartData?.candles[chartData.candles.length - 1]?.close) || 0;
  const previousPrice = chartData?.candles[chartData.candles.length - 2]?.close || 0;
  const priceChange = symbolData?.change || (currentPrice - previousPrice);
  const priceChangePercent = symbolData?.changePercent || ((priceChange / previousPrice) * 100);

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
      {/* Ultra Compact Header */}
      <div className="px-4 py-2 border-b border-gray-300 flex-shrink-0 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowSymbolSearch(true)}
                className="text-lg font-bold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer"
                title="Click to search symbols"
              >
                {symbol}
              </button>
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
            <TimeframeSelector
              selectedTimeframe={selectedTimeframe}
              onTimeframeChange={setSelectedTimeframe}
            />

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
              title="Refresh data"
            >
              <RefreshCw className="w-3 h-3 text-gray-600" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Chart Container - Maximum height */}
      <div className="flex-1 p-3 min-h-0 bg-gray-50">
        {chartData ? (
          <Chart
            symbol={symbol}
            timeframe={selectedTimeframe}
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