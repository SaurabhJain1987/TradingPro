import React, { useEffect, useRef, useState } from 'react';
import { Candle, RSIData, Timeframe } from '../types/trading';

interface ChartProps {
  symbol: string;
  timeframe: Timeframe;
  candles: Candle[];
  rsi: RSIData[];
  showRSI?: boolean;
}

interface CrosshairData {
  x: number;
  y: number;
  visible: boolean;
  canvasX: number;
  canvasY: number;
  price: number;
  timestamp: number;
  rsi: number;
  candleIndex: number;
}

interface TechnicalIndicators {
  sma9: number[];
  sma50: number[];
  sma100: number[];
  sma200: number[];
  bbUpper: number[];
  bbMiddle: number[];
  bbLower: number[];
}

interface TouchState {
  touches: Touch[];
  initialDistance: number;
  initialPanOffset: number;
  initialZoomLevel: number;
  lastPanX: number;
  isPanning: boolean;
  isZooming: boolean;
}

export function Chart({ symbol, timeframe, candles, rsi, showRSI = true }: ChartProps) {
  const candleChartRef = useRef<HTMLCanvasElement>(null);
  const rsiChartRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [crosshair, setCrosshair] = useState<CrosshairData>({ 
    x: 0, y: 0, visible: false, canvasX: 0, canvasY: 0, price: 0, timestamp: 0, rsi: 0, candleIndex: -1
  });
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMouseX, setLastMouseX] = useState(0);
  const [extendedCandles, setExtendedCandles] = useState<Candle[]>([]);
  const [indicators, setIndicators] = useState<TechnicalIndicators | null>(null);
  const [touchState, setTouchState] = useState<TouchState>({
    touches: [],
    initialDistance: 0,
    initialPanOffset: 0,
    initialZoomLevel: 1,
    lastPanX: 0,
    isPanning: false,
    isZooming: false
  });

  // Generate extended timeline with historical data and future blank periods
  useEffect(() => {
    if (candles.length === 0) return;

    const timeInterval = candles.length > 1 ? candles[1].timestamp - candles[0].timestamp : getTimeIntervalMs(timeframe);
    const now = Date.now();
    const lastCandleTime = candles[candles.length - 1].timestamp;
    
    // Generate historical data (simulated for demo)
    const historicalCandles: Candle[] = [];
    const firstCandle = candles[0];
    const basePrice = firstCandle.open;
    
    for (let i = 500; i > 0; i--) {
      const variation = (Math.random() - 0.5) * 0.02 * basePrice;
      const price = Math.max(basePrice + variation, 0.01);
      
      historicalCandles.push({
        timestamp: firstCandle.timestamp - (timeInterval * i),
        open: price,
        high: price * (1 + Math.random() * 0.01),
        low: price * (1 - Math.random() * 0.01),
        close: price + (Math.random() - 0.5) * 0.01 * price,
        volume: Math.floor(Math.random() * 1000000) + 100000
      });
    }

    // Generate future timeline (blank periods)
    const futureCandles: Candle[] = [];
    const futurePeriods = 200; // Show 200 future periods
    
    for (let i = 1; i <= futurePeriods; i++) {
      futureCandles.push({
        timestamp: lastCandleTime + (timeInterval * i),
        open: 0,
        high: 0,
        low: 0,
        close: 0,
        volume: 0
      });
    }

    // Combine all periods: historical + real data + future
    setExtendedCandles([...historicalCandles, ...candles, ...futureCandles]);
  }, [candles, timeframe]);

  // Get time interval in milliseconds based on timeframe
  const getTimeIntervalMs = (timeframe: Timeframe): number => {
    const intervals: Record<string, number> = {
      '1h': 3600000,
      '2h': 7200000,
      '3h': 10800000,
      '4h': 14400000,
      '6h': 21600000,
      '8h': 28800000,
      '12h': 43200000,
      '18h': 64800000,
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
  };

  // Calculate technical indicators
  useEffect(() => {
    if (extendedCandles.length === 0) return;

    // Only calculate indicators for historical + real data (exclude future blank periods)
    const realDataLength = extendedCandles.length - 200; // Subtract future periods
    const realCandles = extendedCandles.slice(0, realDataLength);
    const closePrices = realCandles.map(c => c.close);
    
    const sma9 = calculateSMA(closePrices, 9);
    const sma50 = calculateSMA(closePrices, 50);
    const sma100 = calculateSMA(closePrices, 100);
    const sma200 = calculateSMA(closePrices, 200);
    
    const bb = calculateBollingerBands(closePrices, 20, 2);
    
    // Extend indicators with NaN for future periods
    const futureNaN = new Array(200).fill(NaN);
    
    setIndicators({
      sma9: [...sma9, ...futureNaN],
      sma50: [...sma50, ...futureNaN],
      sma100: [...sma100, ...futureNaN],
      sma200: [...sma200, ...futureNaN],
      bbUpper: [...bb.upper, ...futureNaN],
      bbMiddle: [...bb.middle, ...futureNaN],
      bbLower: [...bb.lower, ...futureNaN]
    });
  }, [extendedCandles]);

  // Calculate visible candles based on zoom and pan with enhanced contraction capability
  const calculateVisibleCandles = () => {
    const canvas = candleChartRef.current;
    if (!canvas) return { displayCandles: [], startIndex: 0, endIndex: 0 };

    const rect = canvas.getBoundingClientRect();
    const marginLeft = 20; // Reduced left margin since scale moved to right
    const marginRight = 80; // Increased right margin for scale
    const chartWidth = rect.width - marginLeft - marginRight;
    
    // Enhanced contraction settings - allow much more aggressive compression
    const minCandleWidth = 0.3; // Ultra-thin minimum for extreme contraction
    const minGapWidth = 0.3; // Minimum gap for extreme contraction
    const preferredGapWidth = 1; // Reduced preferred gap
    const minTotalWidth = minCandleWidth + minGapWidth; // Minimum space per candle
    
    // Calculate maximum candles that can fit with extreme compression
    const maxCandlesForWidth = Math.floor(chartWidth / minTotalWidth);
    
    // Enhanced zoom-based calculation for much more aggressive contraction
    const baseMaxCandles = 200; // Increased base number for more data visibility
    const zoomBasedMaxCandles = Math.floor(baseMaxCandles / Math.pow(zoomLevel, 0.7)); // Less aggressive zoom scaling for more contraction
    
    // Allow much higher maximum candles for extreme contraction
    const maxCandles = Math.min(maxCandlesForWidth, zoomBasedMaxCandles, 2000); // Significantly increased max limit
    
    // Position current time around 70% from the left (showing more historical data)
    const currentTimeIndex = extendedCandles.length - 200 - 1; // Last real data point
    const defaultStartIndex = Math.max(0, currentTimeIndex - Math.floor(maxCandles * 0.7));
    
    const startIndex = Math.max(0, Math.min(extendedCandles.length - maxCandles, defaultStartIndex + panOffset));
    const endIndex = Math.min(extendedCandles.length, startIndex + maxCandles);
    const displayCandles = extendedCandles.slice(startIndex, endIndex);
    
    return { displayCandles, startIndex, endIndex };
  };

  const { displayCandles, startIndex, endIndex } = calculateVisibleCandles();
  
  // Create synchronized RSI data that matches displayCandles exactly
  const synchronizedRsi: RSIData[] = [];
  const historicalCandlesCount = extendedCandles.length - candles.length - 200; // Historical + future
  
  displayCandles.forEach((candle, index) => {
    const globalIndex = startIndex + index;
    
    if (globalIndex >= historicalCandlesCount && globalIndex < historicalCandlesCount + rsi.length) {
      // This is a real candle with RSI data
      const rsiIndex = globalIndex - historicalCandlesCount;
      synchronizedRsi.push(rsi[rsiIndex]);
    } else {
      // This is a historical or future candle, generate mock/empty RSI
      const mockRsi = globalIndex >= extendedCandles.length - 200 ? 50 : 45 + Math.random() * 10;
      synchronizedRsi.push({
        timestamp: candle.timestamp,
        value: mockRsi,
        ma: mockRsi,
        upperBB: mockRsi + 10,
        lowerBB: mockRsi - 10
      });
    }
  });

  useEffect(() => {
    drawCandlestickChart();
    if (showRSI) {
      drawRSIChart();
    }
  }, [displayCandles, synchronizedRsi, showRSI, zoomLevel, panOffset, indicators, crosshair]);

  // Helper function to get distance between two touches
  const getTouchDistance = (touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Helper function to get center point between two touches
  const getTouchCenter = (touch1: Touch, touch2: Touch): { x: number; y: number } => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    };
  };

  // Enhanced event handlers with touch support and improved zoom range
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      // Check if this is a trackpad gesture (typically has smaller deltaY values and ctrlKey for pinch)
      const isTrackpadPinch = e.ctrlKey;
      const isTrackpadScroll = Math.abs(e.deltaY) < 50 && Math.abs(e.deltaX) > 0;
      
      if (isTrackpadPinch) {
        // Handle trackpad pinch-to-zoom with enhanced range
        const delta = e.deltaY > 0 ? 0.95 : 1.05;
        setZoomLevel(prev => Math.max(0.05, Math.min(20, prev * delta))); // Extended zoom range
      } else if (isTrackpadScroll && Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        // Handle trackpad horizontal scroll for panning
        const panSensitivity = 0.5;
        const panDelta = Math.round(e.deltaX * panSensitivity);
        
        setPanOffset(prev => {
          const { displayCandles } = calculateVisibleCandles();
          const maxCandles = displayCandles.length;
          const newOffset = prev + panDelta;
          const maxOffset = Math.max(0, extendedCandles.length - maxCandles);
          return Math.max(-maxOffset, Math.min(maxOffset, newOffset));
        });
      } else {
        // Handle regular mouse wheel zoom with enhanced range
        const delta = e.deltaY > 0 ? 0.975 : 1.025;
        setZoomLevel(prev => Math.max(0.05, Math.min(20, prev * delta))); // Extended zoom range
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const touches = Array.from(e.touches);
      
      if (touches.length === 2) {
        // Two-finger gesture
        const distance = getTouchDistance(touches[0], touches[1]);
        const center = getTouchCenter(touches[0], touches[1]);
        
        setTouchState({
          touches,
          initialDistance: distance,
          initialPanOffset: panOffset,
          initialZoomLevel: zoomLevel,
          lastPanX: center.x,
          isPanning: false,
          isZooming: false
        });
      } else if (touches.length === 1) {
        // Single finger drag
        setIsDragging(true);
        setLastMouseX(touches[0].clientX);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touches = Array.from(e.touches);
      
      if (touches.length === 2 && touchState.touches.length === 2) {
        const currentDistance = getTouchDistance(touches[0], touches[1]);
        const currentCenter = getTouchCenter(touches[0], touches[1]);
        
        // Calculate zoom based on distance change with enhanced range
        const distanceRatio = currentDistance / touchState.initialDistance;
        const newZoomLevel = Math.max(0.05, Math.min(20, touchState.initialZoomLevel * distanceRatio)); // Extended zoom range
        
        // Calculate pan based on horizontal movement of center point
        const panDelta = (currentCenter.x - touchState.lastPanX) * 0.5;
        
        // Determine if this is primarily a zoom or pan gesture
        const zoomChange = Math.abs(distanceRatio - 1);
        const panChange = Math.abs(panDelta);
        
        if (zoomChange > 0.05) {
          // Primarily zooming
          setZoomLevel(newZoomLevel);
          setTouchState(prev => ({ ...prev, isZooming: true, isPanning: false }));
        } else if (panChange > 5 && !touchState.isZooming) {
          // Primarily panning horizontally
          setPanOffset(prev => {
            const { displayCandles } = calculateVisibleCandles();
            const maxCandles = displayCandles.length;
            const newOffset = touchState.initialPanOffset - Math.round(panDelta * 0.2);
            const maxOffset = Math.max(0, extendedCandles.length - maxCandles);
            return Math.max(-maxOffset, Math.min(maxOffset, newOffset));
          });
          setTouchState(prev => ({ ...prev, isPanning: true, lastPanX: currentCenter.x }));
        }
      } else if (touches.length === 1 && isDragging) {
        // Single finger drag for panning
        const deltaX = touches[0].clientX - lastMouseX;
        const sensitivity = 0.125;
        const panDelta = Math.round(deltaX * sensitivity);
        
        setPanOffset(prev => {
          const { displayCandles } = calculateVisibleCandles();
          const maxCandles = displayCandles.length;
          const newOffset = prev - panDelta;
          const maxOffset = Math.max(0, extendedCandles.length - maxCandles);
          return Math.max(-maxOffset, Math.min(maxOffset, newOffset));
        });
        
        setLastMouseX(touches[0].clientX);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      const touches = Array.from(e.touches);
      
      if (touches.length === 0) {
        // All fingers lifted
        setTouchState({
          touches: [],
          initialDistance: 0,
          initialPanOffset: 0,
          initialZoomLevel: 1,
          lastPanX: 0,
          isPanning: false,
          isZooming: false
        });
        setIsDragging(false);
      } else if (touches.length === 1 && touchState.touches.length === 2) {
        // Went from two fingers to one
        setTouchState(prev => ({
          ...prev,
          touches: [],
          isPanning: false,
          isZooming: false
        }));
        setIsDragging(true);
        setLastMouseX(touches[0].clientX);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - lastMouseX;
        const sensitivity = 0.125;
        const panDelta = Math.round(deltaX * sensitivity);
        
        setPanOffset(prev => {
          const { displayCandles } = calculateVisibleCandles();
          const maxCandles = displayCandles.length;
          const newOffset = prev - panDelta;
          const maxOffset = Math.max(0, extendedCandles.length - maxCandles);
          return Math.max(-maxOffset, Math.min(maxOffset, newOffset));
        });
        
        setLastMouseX(e.clientX);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    const container = containerRef.current;
    if (container) {
      // Mouse events
      container.addEventListener('wheel', handleWheel, { passive: false });
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      // Touch events
      container.addEventListener('touchstart', handleTouchStart, { passive: false });
      container.addEventListener('touchmove', handleTouchMove, { passive: false });
      container.addEventListener('touchend', handleTouchEnd, { passive: false });
      
      return () => {
        container.removeEventListener('wheel', handleWheel);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchmove', handleTouchMove);
        container.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, lastMouseX, extendedCandles.length, touchState, panOffset, zoomLevel]);

  const calculateSMA = (prices: number[], period: number): number[] => {
    const sma: number[] = [];
    for (let i = 0; i < prices.length; i++) {
      if (i < period - 1) {
        sma.push(NaN);
      } else {
        const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        sma.push(sum / period);
      }
    }
    return sma;
  };

  const calculateBollingerBands = (prices: number[], period: number = 20, multiplier: number = 2): { upper: number[], middle: number[], lower: number[] } => {
    const sma = calculateSMA(prices, period);
    const upper: number[] = [];
    const middle: number[] = [];
    const lower: number[] = [];

    for (let i = 0; i < prices.length; i++) {
      if (i < period - 1) {
        upper.push(NaN);
        middle.push(NaN);
        lower.push(NaN);
      } else {
        const slice = prices.slice(i - period + 1, i + 1);
        const mean = sma[i];
        const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
        const stdDev = Math.sqrt(variance);

        upper.push(mean + (multiplier * stdDev));
        middle.push(mean);
        lower.push(mean - (multiplier * stdDev));
      }
    }

    return { upper, middle, lower };
  };

  const formatPrice = (price: number): string => {
    if (price >= 1000) {
      return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return price.toFixed(2);
  };

  const formatDate = (timestamp: number, timeframe: Timeframe): string => {
    const date = new Date(timestamp);
    
    if (timeframe.includes('h') || timeframe.includes('H')) {
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    } else if (timeframe.includes('d') || timeframe.includes('D') || timeframe.includes('w') || timeframe.includes('W')) {
      // Format as "8-Jul'25"
      const day = date.getDate();
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      const year = date.getFullYear().toString().slice(-2);
      return `${day}-${month}'${year}`;
    } else {
      // For monthly timeframes, show month and year
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      const year = date.getFullYear().toString().slice(-2);
      return `${month}'${year}`;
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setLastMouseX(e.clientX);
  };

  const handleMouseMoveChart = (e: React.MouseEvent, chartType: 'price' | 'rsi') => {
    const canvas = chartType === 'price' ? candleChartRef.current : rsiChartRef.current;
    if (!canvas || displayCandles.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const marginLeft = 20; // Updated margin
    const marginRight = 80; // Updated margin
    const chartWidth = rect.width - marginLeft - marginRight;
    
    if (x < marginLeft || x > marginLeft + chartWidth) {
      setCrosshair(prev => ({ ...prev, visible: false }));
      return;
    }

    // Calculate the data index based on mouse position
    const relativeX = (x - marginLeft) / chartWidth;
    const dataIndex = Math.floor(relativeX * displayCandles.length);
    
    if (dataIndex >= 0 && dataIndex < displayCandles.length) {
      const candle = displayCandles[dataIndex];
      const rsiData = synchronizedRsi[dataIndex];
      
      // Calculate the actual price at the cursor Y position
      const marginTop = 15;
      const marginBottom = 25;
      const chartHeight = rect.height - marginTop - marginBottom;
      
      // Get price range from real data only
      const realCandles = displayCandles.filter(c => c.close > 0);
      if (realCandles.length === 0) return;
      
      const prices = realCandles.flatMap(c => [c.high, c.low]).filter(p => p > 0);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      
      const logMin = Math.log(minPrice);
      const logMax = Math.log(maxPrice);
      const logRange = logMax - logMin;
      const padding = logRange * 0.05;
      
      const adjustedLogMin = logMin - padding;
      const adjustedLogMax = logMax + padding;
      const adjustedLogRange = adjustedLogMax - adjustedLogMin;
      
      // Calculate price at cursor Y position
      const relativeY = (y - marginTop) / chartHeight;
      const logPrice = adjustedLogMax - (relativeY * adjustedLogRange);
      const priceAtCursor = Math.exp(logPrice);
      
      // Show crosshair for all positions within the chart area
      setCrosshair({
        x: e.clientX,
        y: e.clientY,
        visible: true,
        canvasX: x,
        canvasY: y,
        price: priceAtCursor, // Use calculated price at cursor position
        timestamp: candle.timestamp,
        rsi: rsiData?.value || 0,
        candleIndex: dataIndex
      });
    }
  };

  const handleMouseLeave = () => {
    setCrosshair(prev => ({ ...prev, visible: false }));
  };

  // Get current candle data for OHLC display
  const getCurrentCandleData = () => {
    if (crosshair.candleIndex >= 0 && crosshair.candleIndex < displayCandles.length) {
      const candle = displayCandles[crosshair.candleIndex];
      if (candle.close > 0) { // Only show for real candles
        return candle;
      }
    }
    // Default to last real candle if no crosshair or invalid candle
    const lastRealCandle = displayCandles.filter(c => c.close > 0).pop();
    return lastRealCandle || null;
  };

  const currentCandle = getCurrentCandleData();

  const drawCandlestickChart = () => {
    const canvas = candleChartRef.current;
    if (!canvas || displayCandles.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    const width = rect.width;
    const height = rect.height;
    
    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    
    const marginTop = 15;
    const marginBottom = 25;
    const marginLeft = 20; // Reduced left margin
    const marginRight = 80; // Increased right margin for scale
    
    const chartWidth = width - marginLeft - marginRight;
    const chartHeight = height - marginTop - marginBottom;
    
    // Calculate price range only from real data (exclude future blank periods)
    const realCandles = displayCandles.filter(c => c.close > 0);
    if (realCandles.length === 0) return;
    
    const prices = realCandles.flatMap(c => [c.high, c.low]).filter(p => p > 0);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    const logMin = Math.log(minPrice);
    const logMax = Math.log(maxPrice);
    const logRange = logMax - logMin;
    const padding = logRange * 0.05;
    
    const adjustedLogMin = logMin - padding;
    const adjustedLogMax = logMax + padding;
    const adjustedLogRange = adjustedLogMax - adjustedLogMin;
    
    // Find current time position for visual separation
    const currentTimeIndex = extendedCandles.length - 200 - 1;
    const currentTimePosition = currentTimeIndex - startIndex;
    const currentTimeX = marginLeft + (chartWidth / (displayCandles.length - 1)) * currentTimePosition;
    
    // Draw future area background (lighter)
    if (currentTimePosition >= 0 && currentTimePosition < displayCandles.length) {
      ctx.fillStyle = '#f8f9fa';
      ctx.fillRect(currentTimeX, marginTop, chartWidth - (currentTimeX - marginLeft), chartHeight);
    }
    
    // Draw background grid
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    
    const priceGridLines = 5;
    for (let i = 0; i <= priceGridLines; i++) {
      const y = marginTop + (chartHeight / priceGridLines) * i;
      ctx.beginPath();
      ctx.moveTo(marginLeft, y);
      ctx.lineTo(marginLeft + chartWidth, y);
      ctx.stroke();
    }
    
    const timeGridLines = Math.min(6, displayCandles.length);
    for (let i = 0; i <= timeGridLines; i++) {
      const x = marginLeft + (chartWidth / timeGridLines) * i;
      ctx.beginPath();
      ctx.moveTo(x, marginTop);
      ctx.lineTo(x, marginTop + chartHeight);
      ctx.stroke();
    }

    // Draw Bollinger Bands area (only for real data)
    if (indicators) {
      const startIdx = startIndex;
      const bbUpper = indicators.bbUpper.slice(startIdx, startIdx + displayCandles.length);
      const bbLower = indicators.bbLower.slice(startIdx, startIdx + displayCandles.length);
      
      ctx.beginPath();
      let pathStarted = false;
      
      // Draw upper band
      bbUpper.forEach((value, index) => {
        if (!isNaN(value) && displayCandles[index].close > 0) {
          const x = marginLeft + (chartWidth / (displayCandles.length - 1)) * index;
          const y = marginTop + ((adjustedLogMax - Math.log(value)) / adjustedLogRange) * chartHeight;
          if (!pathStarted) {
            ctx.moveTo(x, y);
            pathStarted = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      
      // Draw lower band in reverse
      for (let i = bbLower.length - 1; i >= 0; i--) {
        const value = bbLower[i];
        if (!isNaN(value) && displayCandles[i].close > 0) {
          const x = marginLeft + (chartWidth / (displayCandles.length - 1)) * i;
          const y = marginTop + ((adjustedLogMax - Math.log(value)) / adjustedLogRange) * chartHeight;
          ctx.lineTo(x, y);
        }
      }
      
      ctx.closePath();
      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.fill();

      // Draw Bollinger Band lines
      const drawBBLine = (values: number[], color: string, lineWidth: number) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        let lineStarted = false;
        
        values.forEach((value, index) => {
          if (!isNaN(value) && displayCandles[index].close > 0) {
            const x = marginLeft + (chartWidth / (displayCandles.length - 1)) * index;
            const y = marginTop + ((adjustedLogMax - Math.log(value)) / adjustedLogRange) * chartHeight;
            
            if (!lineStarted) {
              ctx.moveTo(x, y);
              lineStarted = true;
            } else {
              ctx.lineTo(x, y);
            }
          }
        });
        
        ctx.stroke();
      };

      drawBBLine(bbUpper, '#3b82f6', 1);
      drawBBLine(indicators.bbMiddle.slice(startIdx, startIdx + displayCandles.length), '#3b82f6', 1);
      drawBBLine(bbLower, '#3b82f6', 1);
    }

    // Draw SMA lines (only for real data)
    if (indicators) {
      const drawSMALine = (values: number[], color: string, lineWidth: number) => {
        const smaValues = values.slice(startIndex, startIndex + displayCandles.length);
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        let lineStarted = false;
        
        smaValues.forEach((value, index) => {
          if (!isNaN(value) && displayCandles[index].close > 0) {
            const x = marginLeft + (chartWidth / (displayCandles.length - 1)) * index;
            const y = marginTop + ((adjustedLogMax - Math.log(value)) / adjustedLogRange) * chartHeight;
            
            if (!lineStarted) {
              ctx.moveTo(x, y);
              lineStarted = true;
            } else {
              ctx.lineTo(x, y);
            }
          }
        });
        
        ctx.stroke();
      };

      drawSMALine(indicators.sma9, '#3b82f6', 1);
      drawSMALine(indicators.sma50, '#ef4444', 2);
      drawSMALine(indicators.sma100, '#fbbf24', 2); // Changed from '#eab308' to '#fbbf24' (lighter yellow)
      drawSMALine(indicators.sma200, '#1e40af', 2);
    }
    
    // Draw price labels on the RIGHT side
    ctx.fillStyle = '#6b7280';
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left'; // Changed from 'right' to 'left'
    ctx.textBaseline = 'middle';
    
    for (let i = 0; i <= priceGridLines; i++) {
      const y = marginTop + (chartHeight / priceGridLines) * i;
      const logPrice = adjustedLogMax - (adjustedLogRange / priceGridLines) * i;
      const price = Math.exp(logPrice);
      ctx.fillText('$' + formatPrice(price), marginLeft + chartWidth + 10, y); // Moved to right side
    }
    
    // Draw crosshair price label if visible on the RIGHT side
    if (crosshair.visible) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(marginLeft + chartWidth + 5, crosshair.canvasY - 10, 70, 20); // Moved to right side
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1;
      ctx.strokeRect(marginLeft + chartWidth + 5, crosshair.canvasY - 10, 70, 20); // Moved to right side
      ctx.fillStyle = '#3b82f6';
      ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'left'; // Changed from 'right' to 'left'
      ctx.fillText('$' + formatPrice(crosshair.price), marginLeft + chartWidth + 10, crosshair.canvasY); // Moved to right side
      ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#6b7280';
    }
    
    // Draw time labels
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#6b7280';
    const labelInterval = Math.max(1, Math.floor(displayCandles.length / 6));
    
    for (let i = 0; i < displayCandles.length; i += labelInterval) {
      const x = marginLeft + (chartWidth / (displayCandles.length - 1)) * i;
      const timeLabel = formatDate(displayCandles[i].timestamp, timeframe);
      
      // Different color for future dates
      const isFuture = displayCandles[i].close === 0;
      ctx.fillStyle = isFuture ? '#9ca3af' : '#6b7280';
      ctx.fillText(timeLabel, x, marginTop + chartHeight + 8);
    }
    
    // Draw crosshair time label if visible
    if (crosshair.visible) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(crosshair.canvasX - 40, marginTop + chartHeight + 3, 80, 20);
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1;
      ctx.strokeRect(crosshair.canvasX - 40, marginTop + chartHeight + 3, 80, 20);
      ctx.fillStyle = '#3b82f6';
      ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(formatDate(crosshair.timestamp, timeframe), crosshair.canvasX, marginTop + chartHeight + 13);
      ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#6b7280';
    }
    
    // Enhanced candle dimensions calculation with thinner candles and more visible gaps
    const totalCandleSpace = chartWidth / displayCandles.length;
    
    // New settings for thinner candles with more visible gaps
    const minCandleWidth = 0.2; // Even thinner minimum for extreme contraction
    const maxCandleWidth = 8; // Reduced maximum width for thinner candles
    const minGapWidth = 0.4; // Increased minimum gap for better visibility
    const preferredGapWidth = 2; // Increased preferred gap for better separation
    const maxGapWidth = 6; // Reduced maximum gap to balance with thinner candles
    
    let candleWidth: number;
    let gapWidth: number;
    
    if (totalCandleSpace <= minCandleWidth + minGapWidth) {
      // Extreme contraction - prioritize gap visibility
      gapWidth = minGapWidth;
      candleWidth = Math.max(minCandleWidth, totalCandleSpace - gapWidth);
    } else if (totalCandleSpace >= maxCandleWidth + maxGapWidth) {
      // Plenty of space - use maximum candle width with balanced gap
      candleWidth = maxCandleWidth;
      gapWidth = Math.min(maxGapWidth, totalCandleSpace - candleWidth);
    } else {
      // Calculate proportional sizing with emphasis on gap visibility
      const availableSpace = totalCandleSpace - minGapWidth;
      
      // Adjust ratio to favor gaps over candle width for better visibility
      const contractionLevel = Math.min(1, totalCandleSpace / 6); // 0 = extreme contraction, 1 = normal
      const candleRatio = 0.3 + (contractionLevel * 0.4); // 0.3 to 0.7 range (favoring gaps)
      
      candleWidth = Math.max(minCandleWidth, Math.min(maxCandleWidth, availableSpace * candleRatio));
      gapWidth = totalCandleSpace - candleWidth;
      
      // Ensure minimum gap is always maintained
      if (gapWidth < minGapWidth) {
        gapWidth = minGapWidth;
        candleWidth = Math.max(minCandleWidth, totalCandleSpace - gapWidth);
      }
    }
    
    // Calculate spacing between candle centers
    const candleSpacing = chartWidth / (displayCandles.length - 1);
    
    // Draw candles (only for real data) with thinner design and better gap visibility
    displayCandles.forEach((candle, index) => {
      if (candle.close === 0) return; // Skip future blank periods
      
      const centerX = marginLeft + index * candleSpacing;
      
      // Calculate Y positions using logarithmic scale
      const openY = marginTop + ((adjustedLogMax - Math.log(candle.open)) / adjustedLogRange) * chartHeight;
      const closeY = marginTop + ((adjustedLogMax - Math.log(candle.close)) / adjustedLogRange) * chartHeight;
      const highY = marginTop + ((adjustedLogMax - Math.log(candle.high)) / adjustedLogRange) * chartHeight;
      const lowY = marginTop + ((adjustedLogMax - Math.log(candle.low)) / adjustedLogRange) * chartHeight;
      
      const isGreen = candle.close >= candle.open;
      const color = isGreen ? '#15803d' : '#ef4444';
      
      // Draw wick with adaptive width for extreme contraction
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(0.2, Math.min(1.5, candleWidth * 0.3)); // Thinner adaptive wick width
      ctx.lineCap = 'butt';
      ctx.beginPath();
      ctx.moveTo(Math.round(centerX), Math.round(highY));
      ctx.lineTo(Math.round(centerX), Math.round(lowY));
      ctx.stroke();
      
      // Draw candle body with thinner design
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(0.4, Math.abs(closeY - openY)); // Slightly increased minimum height for visibility
      
      // Calculate candle body position
      const candleLeft = centerX - (candleWidth / 2);
      
      // Use sub-pixel positioning for extreme contraction
      const sharpX = candleLeft;
      const sharpY = bodyTop;
      const sharpWidth = candleWidth;
      const sharpHeight = bodyHeight;
      
      // Fill candle body
      ctx.fillStyle = color;
      ctx.fillRect(sharpX, sharpY, sharpWidth, sharpHeight);
      
      // Add border only if candle is wide enough (reduced threshold)
      if (candleWidth > 0.5) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 0.3; // Thinner border
        ctx.lineCap = 'butt';
        ctx.lineJoin = 'miter';
        ctx.strokeRect(sharpX, sharpY, sharpWidth, sharpHeight);
      }
    });

    // Draw crosshair lines if visible
    if (crosshair.visible) {
      ctx.strokeStyle = '#6b7280';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      
      // Vertical line
      ctx.beginPath();
      ctx.moveTo(crosshair.canvasX, marginTop);
      ctx.lineTo(crosshair.canvasX, marginTop + chartHeight);
      ctx.stroke();
      
      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(marginLeft, crosshair.canvasY);
      ctx.lineTo(marginLeft + chartWidth, crosshair.canvasY);
      ctx.stroke();
      
      ctx.setLineDash([]);
    }
    
    // Draw chart border
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    ctx.strokeRect(marginLeft, marginTop, chartWidth, chartHeight);
  };

  const drawRSIChart = () => {
    const canvas = rsiChartRef.current;
    if (!canvas || synchronizedRsi.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    const width = rect.width;
    const height = rect.height;
    
    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    
    const marginTop = 10;
    const marginBottom = 20;
    const marginLeft = 20; // Reduced left margin
    const marginRight = 80; // Increased right margin for scale
    
    const chartWidth = width - marginLeft - marginRight;
    const chartHeight = height - marginTop - marginBottom;
    
    const rsiMin = 20;
    const rsiMax = 85;
    const rsiRange = rsiMax - rsiMin;
    
    // Find current time position
    const currentTimeIndex = extendedCandles.length - 200 - 1;
    const currentTimePosition = currentTimeIndex - startIndex;
    const currentTimeX = marginLeft + (chartWidth / (synchronizedRsi.length - 1)) * currentTimePosition;
    
    // Draw future area background
    if (currentTimePosition >= 0 && currentTimePosition < synchronizedRsi.length) {
      ctx.fillStyle = '#f8f9fa';
      ctx.fillRect(currentTimeX, marginTop, chartWidth - (currentTimeX - marginLeft), chartHeight);
    }
    
    // Draw background
    ctx.fillStyle = '#f9fafb';
    ctx.fillRect(marginLeft, marginTop, chartWidth, chartHeight);
    
    // Draw RSI zones
    const zone40Y = marginTop + (chartHeight * (rsiMax - 40)) / rsiRange;
    const zone60Y = marginTop + (chartHeight * (rsiMax - 60)) / rsiRange;
    
    ctx.fillStyle = 'rgba(147, 51, 234, 0.1)';
    ctx.fillRect(marginLeft, zone60Y, chartWidth, zone40Y - zone60Y);
    
    // Draw Bollinger Bands background on RSI (only for real data)
    const pointSpacing = chartWidth / (synchronizedRsi.length - 1);
    
    ctx.beginPath();
    let pathStarted = false;
    
    synchronizedRsi.forEach((point, index) => {
      // Only draw for real data (before current time)
      if (index < currentTimePosition || currentTimePosition < 0) {
        const x = marginLeft + index * pointSpacing;
        const y = marginTop + (chartHeight * (rsiMax - Math.min(rsiMax, Math.max(rsiMin, point.upperBB)))) / rsiRange;
        if (!pathStarted) {
          ctx.moveTo(x, y);
          pathStarted = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
    });
    
    for (let i = Math.min(currentTimePosition - 1, synchronizedRsi.length - 1); i >= 0; i--) {
      const x = marginLeft + i * pointSpacing;
      const y = marginTop + (chartHeight * (rsiMax - Math.min(rsiMax, Math.max(rsiMin, synchronizedRsi[i].lowerBB)))) / rsiRange;
      ctx.lineTo(x, y);
    }
    
    ctx.closePath();
    ctx.fillStyle = 'rgba(34, 197, 94, 0.1)';
    ctx.fill();
    
    // Draw reference lines
    const referenceLines = [
      { value: 40, color: '#9ca3af', width: 1.2 },
      { value: 50, color: '#d1d5db', width: 1 },
      { value: 60, color: '#9ca3af', width: 1.2 }
    ];
    
    referenceLines.forEach(({ value, color, width }) => {
      const y = marginTop + (chartHeight * (rsiMax - value)) / rsiRange;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(marginLeft, y);
      ctx.lineTo(marginLeft + chartWidth, y);
      ctx.stroke();
    });
    
    ctx.setLineDash([]);
    
    // RSI labels on the RIGHT side
    ctx.fillStyle = '#6b7280';
    ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left'; // Changed from 'right' to 'left'
    ctx.textBaseline = 'middle';
    
    const labelValues = [80, 60, 50, 40, 25];
    labelValues.forEach(value => {
      if (value >= rsiMin && value <= rsiMax) {
        const y = marginTop + (chartHeight * (rsiMax - value)) / rsiRange;
        ctx.fillText(value.toString(), marginLeft + chartWidth + 5, y); // Moved to right side
      }
    });
    
    // Draw crosshair RSI label if visible on the RIGHT side
    if (crosshair.visible) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(marginLeft + chartWidth + 5, crosshair.canvasY - 8, 30, 16); // Moved to right side
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1;
      ctx.strokeRect(marginLeft + chartWidth + 5, crosshair.canvasY - 8, 30, 16); // Moved to right side
      ctx.fillStyle = '#3b82f6';
      ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'left'; // Changed from 'right' to 'left'
      ctx.fillText(crosshair.rsi.toFixed(1), marginLeft + chartWidth + 10, crosshair.canvasY); // Moved to right side
      ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#6b7280';
    }
    
    // Draw time labels
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#6b7280';
    const labelInterval = Math.max(1, Math.floor(synchronizedRsi.length / 6));
    
    for (let i = 0; i < synchronizedRsi.length; i += labelInterval) {
      const x = marginLeft + (chartWidth / (synchronizedRsi.length - 1)) * i;
      const timeLabel = formatDate(synchronizedRsi[i].timestamp, timeframe);
      
      // Different color for future dates
      const isFuture = i >= currentTimePosition;
      ctx.fillStyle = isFuture ? '#9ca3af' : '#6b7280';
      ctx.fillText(timeLabel, x, marginTop + chartHeight + 8);
    }
    
    // Draw Bollinger Bands lines on RSI (only for real data)
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    
    // Upper Bollinger Band
    ctx.beginPath();
    let upperLineStarted = false;
    synchronizedRsi.forEach((point, index) => {
      if (index < currentTimePosition || currentTimePosition < 0) {
        const x = marginLeft + index * pointSpacing;
        const y = marginTop + (chartHeight * (rsiMax - Math.min(rsiMax, Math.max(rsiMin, point.upperBB)))) / rsiRange;
        if (!upperLineStarted) {
          ctx.moveTo(x, y);
          upperLineStarted = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
    });
    ctx.stroke();
    
    // Lower Bollinger Band
    ctx.beginPath();
    let lowerLineStarted = false;
    synchronizedRsi.forEach((point, index) => {
      if (index < currentTimePosition || currentTimePosition < 0) {
        const x = marginLeft + index * pointSpacing;
        const y = marginTop + (chartHeight * (rsiMax - Math.min(rsiMax, Math.max(rsiMin, point.lowerBB)))) / rsiRange;
        if (!lowerLineStarted) {
          ctx.moveTo(x, y);
          lowerLineStarted = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
    });
    ctx.stroke();
    
    // Draw RSI-SMA (only for real data)
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    let smaLineStarted = false;
    
    synchronizedRsi.forEach((point, index) => {
      if (index < currentTimePosition || currentTimePosition < 0) {
        const x = marginLeft + index * pointSpacing;
        const y = marginTop + (chartHeight * (rsiMax - Math.min(rsiMax, Math.max(rsiMin, point.ma)))) / rsiRange;
        
        if (!smaLineStarted) {
          ctx.moveTo(x, y);
          smaLineStarted = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
    });
    
    ctx.stroke();
    
    // Draw RSI line (only for real data) - Changed to darker purple
    ctx.strokeStyle = '#7c3aed'; // Changed from '#8b5cf6' to '#7c3aed' (darker purple)
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    let rsiLineStarted = false;
    
    synchronizedRsi.forEach((point, index) => {
      if (index < currentTimePosition || currentTimePosition < 0) {
        const x = marginLeft + index * pointSpacing;
        const y = marginTop + (chartHeight * (rsiMax - Math.min(rsiMax, Math.max(rsiMin, point.value)))) / rsiRange;
        
        if (!rsiLineStarted) {
          ctx.moveTo(x, y);
          rsiLineStarted = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
    });
    
    ctx.stroke();

    // Draw crosshair lines if visible
    if (crosshair.visible) {
      ctx.strokeStyle = '#6b7280';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      
      // Vertical line
      ctx.beginPath();
      ctx.moveTo(crosshair.canvasX, marginTop);
      ctx.lineTo(crosshair.canvasX, marginTop + chartHeight);
      ctx.stroke();
      
      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(marginLeft, crosshair.canvasY);
      ctx.lineTo(marginLeft + chartWidth, crosshair.canvasY);
      ctx.stroke();
      
      ctx.setLineDash([]);
    }
    
    // Draw chart border
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    ctx.strokeRect(marginLeft, marginTop, chartWidth, chartHeight);
  };

  return (
    <div 
      ref={containerRef} 
      className="bg-white border border-gray-300 rounded-lg shadow-sm flex flex-col h-full transition-all duration-300"
    >
      {/* OHLC Display Header - Reduced height and centered */}
      {currentCandle && (
        <div className="px-4 py-1 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-center space-x-6 text-sm">
            <div className="flex items-center space-x-1">
              <span className="text-gray-600">O</span>
              <span className="font-semibold text-gray-900">{formatPrice(currentCandle.open)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-gray-600">H</span>
              <span className="font-semibold text-gray-900">{formatPrice(currentCandle.high)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-gray-600">L</span>
              <span className="font-semibold text-gray-900">{formatPrice(currentCandle.low)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-gray-600">C</span>
              <span className="font-semibold text-gray-900">{formatPrice(currentCandle.close)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className={`font-semibold ${
                currentCandle.close >= currentCandle.open ? 'text-green-600' : 'text-red-600'
              }`}>
                {currentCandle.close >= currentCandle.open ? '+' : ''}
                {((currentCandle.close - currentCandle.open) / currentCandle.open * 100).toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-0">
        <div className={showRSI ? "h-3/4" : "h-full"}>
          <canvas
            ref={candleChartRef}
            className="w-full h-full cursor-crosshair"
            onMouseMove={(e) => handleMouseMoveChart(e, 'price')}
            onMouseLeave={handleMouseLeave}
            onMouseDown={handleMouseDown}
          />
        </div>
        
        {showRSI && (
          <>
            <div className="h-1 bg-gradient-to-r from-transparent via-gray-400 to-transparent my-1"></div>
            
            <div className="h-1/4">
              <div className="flex items-center justify-between text-xs text-gray-600 mb-1 px-3">
                <span className="font-medium">RSI (14)</span>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-0.5 bg-violet-600 rounded"></div>
                    <span>RSI</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-0.5 bg-red-500 rounded"></div>
                    <span>SMA</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-0.5 bg-green-500 rounded"></div>
                    <span>BB</span>
                  </div>
                </div>
              </div>
              <canvas
                ref={rsiChartRef}
                className="w-full h-full cursor-crosshair"
                onMouseMove={(e) => handleMouseMoveChart(e, 'rsi')}
                onMouseLeave={handleMouseLeave}
                onMouseDown={handleMouseDown}
              />
            </div>
          </>
        )}
      </div>

      {/* Legend */}
      <div className="px-3 py-1 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-0.5 bg-blue-500 rounded"></div>
              <span>SMA9</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-0.5 bg-red-500 rounded" style={{ height: '2px' }}></div>
              <span>SMA50</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-0.5 bg-yellow-400 rounded" style={{ height: '2px' }}></div>
              <span>SMA100</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-0.5 bg-blue-800 rounded" style={{ height: '2px' }}></div>
              <span>SMA200</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-2 bg-blue-200 border border-blue-500 rounded"></div>
              <span>Bollinger Bands</span>
            </div>
            <div className="text-xs text-gray-500">
              Zoom: {zoomLevel.toFixed(1)}x | Candles: {displayCandles.length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}