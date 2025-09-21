import React, { useRef, useEffect } from 'react';
import { Candle, RSIData, Timeframe } from '../types/trading';

interface ChartProps {
  symbol: string;
  timeframe: Timeframe;
  candles: Candle[];
  rsi: RSIData[];
  showRSI: boolean;
  className?: string;
}

export function Chart({ symbol, timeframe, candles, rsi, showRSI, className = '' }: ChartProps) {
  const priceCanvasRef = useRef<HTMLCanvasElement>(null);
  const rsiCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!candles.length || !priceCanvasRef.current) return;

    const canvas = priceCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Calculate price range
    const prices = candles.map(c => [c.high, c.low]).flat();
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    const padding = priceRange * 0.1;

    // Chart dimensions
    const chartWidth = rect.width - 80;
    const chartHeight = rect.height - 60;
    const chartLeft = 60;
    const chartTop = 20;

    // Draw grid
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = chartTop + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(chartLeft, y);
      ctx.lineTo(chartLeft + chartWidth, y);
      ctx.stroke();
    }

    // Vertical grid lines
    const timeStep = Math.max(1, Math.floor(candles.length / 10));
    for (let i = 0; i < candles.length; i += timeStep) {
      const x = chartLeft + (chartWidth / (candles.length - 1)) * i;
      ctx.beginPath();
      ctx.moveTo(x, chartTop);
      ctx.lineTo(x, chartTop + chartHeight);
      ctx.stroke();
    }

    // Draw price line
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.beginPath();

    candles.forEach((candle, index) => {
      const x = chartLeft + (chartWidth / (candles.length - 1)) * index;
      const y = chartTop + chartHeight - ((candle.close - minPrice + padding) / (priceRange + 2 * padding)) * chartHeight;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw price labels
    ctx.fillStyle = '#666';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    
    for (let i = 0; i <= 5; i++) {
      const price = maxPrice + padding - ((priceRange + 2 * padding) / 5) * i;
      const y = chartTop + (chartHeight / 5) * i + 4;
      ctx.fillText(`$${price.toFixed(2)}`, chartLeft - 10, y);
    }

    // Draw time labels
    ctx.textAlign = 'center';
    for (let i = 0; i < candles.length; i += timeStep) {
      const x = chartLeft + (chartWidth / (candles.length - 1)) * i;
      const date = new Date(candles[i].timestamp);
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      ctx.fillText(timeStr, x, chartTop + chartHeight + 20);
    }

  }, [candles]);

  useEffect(() => {
    if (!showRSI || !rsi.length || !rsiCanvasRef.current) return;

    const canvas = rsiCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Chart dimensions
    const chartWidth = rect.width - 80;
    const chartHeight = rect.height - 40;
    const chartLeft = 60;
    const chartTop = 20;

    // Draw grid
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines (RSI levels)
    const rsiLevels = [0, 30, 50, 70, 100];
    rsiLevels.forEach(level => {
      const y = chartTop + chartHeight - (level / 100) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(chartLeft, y);
      ctx.lineTo(chartLeft + chartWidth, y);
      ctx.stroke();
      
      // Special styling for 30 and 70 levels
      if (level === 30 || level === 70) {
        ctx.strokeStyle = level === 30 ? '#ef4444' : '#10b981';
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(chartLeft, y);
        ctx.lineTo(chartLeft + chartWidth, y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = '#f0f0f0';
      }
    });

    // Ensure RSI data matches candle data length
    const syncedRSI = rsi.slice(0, candles.length);
    
    // Draw RSI line
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.beginPath();

    syncedRSI.forEach((rsiPoint, index) => {
      if (index >= candles.length) return; // Safety check
      
      const x = chartLeft + (chartWidth / (candles.length - 1)) * index;
      const y = chartTop + chartHeight - (rsiPoint.value / 100) * chartHeight;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw RSI SMA line
    if (syncedRSI.some(r => r.ma !== r.value)) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      ctx.beginPath();

      syncedRSI.forEach((rsiPoint, index) => {
        if (index >= candles.length) return; // Safety check
        
        const x = chartLeft + (chartWidth / (candles.length - 1)) * index;
        const y = chartTop + chartHeight - (rsiPoint.ma / 100) * chartHeight;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();
    }

    // Draw Bollinger Bands
    if (syncedRSI.some(r => r.upperBB !== undefined && r.lowerBB !== undefined)) {
      ctx.strokeStyle = '#9ca3af';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);

      // Upper band
      ctx.beginPath();
      syncedRSI.forEach((rsiPoint, index) => {
        if (index >= candles.length || !rsiPoint.upperBB) return;
        
        const x = chartLeft + (chartWidth / (candles.length - 1)) * index;
        const y = chartTop + chartHeight - (Math.min(100, Math.max(0, rsiPoint.upperBB)) / 100) * chartHeight;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      // Lower band
      ctx.beginPath();
      syncedRSI.forEach((rsiPoint, index) => {
        if (index >= candles.length || !rsiPoint.lowerBB) return;
        
        const x = chartLeft + (chartWidth / (candles.length - 1)) * index;
        const y = chartTop + chartHeight - (Math.min(100, Math.max(0, rsiPoint.lowerBB)) / 100) * chartHeight;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      ctx.setLineDash([]);
    }

    // Draw RSI labels
    ctx.fillStyle = '#666';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    
    rsiLevels.forEach(level => {
      const y = chartTop + chartHeight - (level / 100) * chartHeight + 4;
      ctx.fillStyle = level === 30 ? '#ef4444' : level === 70 ? '#10b981' : '#666';
      ctx.fillText(level.toString(), chartLeft - 10, y);
    });

  }, [rsi, showRSI, candles.length]);

  return (
    <div className={`h-full flex flex-col bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Price Chart */}
      <div className="flex-1 p-4">
        <div className="h-full relative">
          <canvas
            ref={priceCanvasRef}
            className="w-full h-full"
            style={{ display: 'block' }}
          />
        </div>
      </div>

      {/* RSI Chart */}
      {showRSI && (
        <div className="h-32 border-t border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">RSI (14)</span>
            <div className="flex items-center space-x-4 text-xs">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-0.5 bg-blue-500 rounded"></div>
                <span className="text-gray-600">RSI</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-0.5 bg-yellow-500 rounded"></div>
                <span className="text-gray-600">SMA</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-0.5 bg-gray-400 rounded border-dashed"></div>
                <span className="text-gray-600">BB</span>
              </div>
            </div>
          </div>
          <div className="h-full relative">
            <canvas
              ref={rsiCanvasRef}
              className="w-full h-full"
              style={{ display: 'block' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}