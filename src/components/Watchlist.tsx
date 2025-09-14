import React, { useState, useEffect } from 'react';
import { Search, Plus, TrendingUp, TrendingDown, X, Globe, MapPin } from 'lucide-react';
import { Symbol } from '../types/trading';
import { fetchSymbolData, searchSymbols, POPULAR_SYMBOLS } from '../services/yahooFinance';

interface WatchlistProps {
  selectedSymbol: string;
  onSymbolSelect: (symbol: string) => void;
  watchlist: string[];
  onWatchlistUpdate: (watchlist: string[]) => void;
}

export function Watchlist({ selectedSymbol, onSymbolSelect, watchlist, onWatchlistUpdate }: WatchlistProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<Symbol[]>([]);
  const [watchlistData, setWatchlistData] = useState<Symbol[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showPopular, setShowPopular] = useState(false);

  // Fetch watchlist data
  useEffect(() => {
    const fetchWatchlistData = async () => {
      setLoading(true);
      const promises = watchlist.map(symbol => fetchSymbolData(symbol));
      const results = await Promise.all(promises);
      const validResults = results.filter((result): result is Symbol => result !== null);
      setWatchlistData(validResults);
      setLoading(false);
    };

    if (watchlist.length > 0) {
      fetchWatchlistData();
      
      // Set up auto-refresh every 30 seconds
      const interval = setInterval(fetchWatchlistData, 30000);
      return () => clearInterval(interval);
    } else {
      setWatchlistData([]);
      setLoading(false);
    }
  }, [watchlist]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length > 1) {
      setSearchLoading(true);
      try {
        const results = await searchSymbols(query);
        setSearchResults(results);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      }
      setSearchLoading(false);
    } else {
      setSearchResults([]);
    }
  };

  const addToWatchlist = async (symbol: string) => {
    if (!watchlist.includes(symbol)) {
      onWatchlistUpdate([...watchlist, symbol]);
    }
    setShowSearch(false);
    setShowPopular(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeFromWatchlist = (symbol: string) => {
    onWatchlistUpdate(watchlist.filter(s => s !== symbol));
  };

  const addPopularSymbol = (symbol: string) => {
    addToWatchlist(symbol);
  };

  return (
    <div className="bg-white border-r border-gray-200 w-80 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Watchlist</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setShowPopular(!showPopular);
                setShowSearch(false);
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Popular symbols"
            >
              <Globe className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setShowSearch(!showSearch);
                setShowPopular(false);
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {showSearch ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {showPopular && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Popular Symbols</h3>
            <div className="space-y-2">
              <div>
                <div className="flex items-center space-x-1 mb-1">
                  <Globe className="w-3 h-3 text-blue-500" />
                  <span className="text-xs font-medium text-gray-600">US Markets</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {POPULAR_SYMBOLS.US.map(symbol => (
                    <button
                      key={symbol}
                      onClick={() => addPopularSymbol(symbol)}
                      className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                    >
                      {symbol}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center space-x-1 mb-1">
                  <MapPin className="w-3 h-3 text-orange-500" />
                  <span className="text-xs font-medium text-gray-600">Indian Markets</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {POPULAR_SYMBOLS.INDIAN.map(symbol => (
                    <button
                      key={symbol}
                      onClick={() => addPopularSymbol(symbol)}
                      className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition-colors"
                    >
                      {symbol.replace('.NS', '')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {showSearch && (
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search symbols (e.g., AAPL, RELIANCE.NS)..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>
            
            {searchLoading && (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 p-4 z-10">
                <div className="text-center text-gray-500">Searching...</div>
              </div>
            )}
            
            {searchResults.length > 0 && !searchLoading && (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto z-10">
                {searchResults.map((symbol) => (
                  <button
                    key={symbol.symbol}
                    onClick={() => addToWatchlist(symbol.symbol)}
                    className="w-full px-4 py-3 hover:bg-gray-50 flex items-center justify-between text-left"
                  >
                    <div>
                      <div className="font-medium text-gray-900">{symbol.symbol}</div>
                      <div className="text-sm text-gray-500 truncate">{symbol.name}</div>
                    </div>
                    <Plus className="w-4 h-4 text-gray-400" />
                  </button>
                ))}
              </div>
            )}

            {searchQuery.length > 1 && searchResults.length === 0 && !searchLoading && (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 p-4 z-10">
                <div className="text-center text-gray-500">
                  No results found. Try searching for:
                  <div className="mt-2 text-xs">
                    <div>• US stocks: AAPL, GOOGL, MSFT</div>
                    <div>• Indian stocks: RELIANCE.NS, TCS.NS</div>
                    <div>• Crypto: BTC-USD, ETH-USD</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && watchlistData.length === 0 ? (
          <div className="p-4 text-center text-gray-500">Loading watchlist...</div>
        ) : watchlistData.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <div className="mb-2">Your watchlist is empty</div>
            <div className="text-sm">Click the + button to add symbols</div>
          </div>
        ) : (
          watchlistData.map((symbol) => (
            <div
              key={symbol.symbol}
              className={`group p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                selectedSymbol === symbol.symbol ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
              }`}
              onClick={() => onSymbolSelect(symbol.symbol)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-gray-900">{symbol.symbol}</span>
                      {symbol.symbol.includes('.NS') && (
                        <span className="text-xs bg-orange-100 text-orange-600 px-1 rounded">NSE</span>
                      )}
                      {symbol.symbol.includes('.BO') && (
                        <span className="text-xs bg-orange-100 text-orange-600 px-1 rounded">BSE</span>
                      )}
                      {symbol.symbol.includes('-USD') && (
                        <span className="text-xs bg-yellow-100 text-yellow-600 px-1 rounded">CRYPTO</span>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromWatchlist(symbol.symbol);
                      }}
                      className="p-1 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="text-sm text-gray-500 mb-2 truncate">{symbol.name}</div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-lg">${symbol.price.toFixed(2)}</span>
                    <div className={`flex items-center space-x-1 text-sm ${
                      symbol.change >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {symbol.change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      <span>{symbol.change >= 0 ? '+' : ''}{symbol.change.toFixed(2)}</span>
                      <span>({symbol.changePercent >= 0 ? '+' : ''}{symbol.changePercent.toFixed(2)}%)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-500 text-center">
          Data refreshes every 30 seconds
        </div>
      </div>
    </div>
  );
}