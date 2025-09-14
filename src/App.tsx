import React, { useState, useEffect } from 'react';
import { WatchlistManager } from './components/WatchlistManager';
import { SingleChart } from './components/SingleChart';
import { MultiChart } from './components/MultiChart';
import { BarChart3, Grid3X3 } from 'lucide-react';
import { Watchlist, StockPreference } from './types/trading';

type ViewMode = 'single' | 'multi';

function App() {
  const [selectedSymbol, setSelectedSymbol] = useState(() => {
    return localStorage.getItem('selectedSymbol') || 'AAPL';
  });
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem('viewMode') as ViewMode) || 'single';
  });
  const [stockPreferences, setStockPreferences] = useState<StockPreference[]>(() => {
    const saved = localStorage.getItem('stockPreferences');
    return saved ? JSON.parse(saved) : [];
  });

  // Save selected symbol to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('selectedSymbol', selectedSymbol);
  }, [selectedSymbol]);

  // Save view mode to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('viewMode', viewMode);
  }, [viewMode]);

  // Save stock preferences to localStorage when they change
  useEffect(() => {
    localStorage.setItem('stockPreferences', JSON.stringify(stockPreferences));
  }, [stockPreferences]);

  // Load watchlists from localStorage on mount
  useEffect(() => {
    const savedWatchlists = localStorage.getItem('tradingWatchlists');
    if (savedWatchlists) {
      try {
        const parsed = JSON.parse(savedWatchlists);
        setWatchlists(parsed);
      } catch (error) {
        console.error('Error loading watchlists:', error);
      }
    }
  }, []);

  // Save watchlists to localStorage whenever they change
  useEffect(() => {
    if (watchlists.length > 0) {
      localStorage.setItem('tradingWatchlists', JSON.stringify(watchlists));
    }
  }, [watchlists]);

  return (
    <div className="h-screen bg-white flex">
      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {viewMode === 'single' ? (
          <SingleChart 
            symbol={selectedSymbol} 
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onSymbolChange={setSelectedSymbol}
          />
        ) : (
          <MultiChart 
            symbol={selectedSymbol} 
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onSymbolChange={setSelectedSymbol}
            stockPreferences={stockPreferences}
          />
        )}
      </div>
      
      <WatchlistManager
        selectedSymbol={selectedSymbol}
        onSymbolSelect={setSelectedSymbol}
        watchlists={watchlists}
        onWatchlistsUpdate={setWatchlists}
        stockPreferences={stockPreferences}
        onStockPreferencesUpdate={setStockPreferences}
      />
    </div>
  );
}

export default App;