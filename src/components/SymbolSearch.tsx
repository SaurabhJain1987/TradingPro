import React, { useState, useEffect } from 'react';
import { Search, X, Globe, MapPin, Bitcoin, Coins, BarChart3 } from 'lucide-react';
import { searchSymbols, POPULAR_SYMBOLS } from '../services/yahooFinance';
import { Symbol } from '../types/trading';

interface SymbolSearchProps {
  onSymbolSelect: (symbol: string) => void;
  onClose: () => void;
}

export function SymbolSearch({ onSymbolSelect, onClose }: SymbolSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Symbol[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'popular'>('search');

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length > 1) {
      setLoading(true);
      try {
        const results = await searchSymbols(query);
        setSearchResults(results);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      }
      setLoading(false);
    } else {
      setSearchResults([]);
    }
  };

  const handleSymbolClick = (symbol: string) => {
    onSymbolSelect(symbol);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Search Symbols</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('search')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'search'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Search
          </button>
          <button
            onClick={() => setActiveTab('popular')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'popular'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Popular
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'search' ? (
            <div className="p-4">
              {/* Search Input */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search symbols (e.g., AAPL, RELIANCE.NS, BTC-USD)..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                  autoFocus
                />
              </div>

              {/* Search Results */}
              <div className="max-h-96 overflow-y-auto">
                {loading && (
                  <div className="text-center py-8 text-gray-500">Searching...</div>
                )}

                {!loading && searchQuery.length > 1 && searchResults.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <div className="mb-2">No results found</div>
                    <div className="text-sm">
                      Try searching for:
                      <div className="mt-2">
                        <div>• US stocks: AAPL, GOOGL, MSFT</div>
                        <div>• Indian stocks: RELIANCE.NS, TCS.NS</div>
                        <div>• Crypto: BTC-USD, ETH-USD</div>
                      </div>
                    </div>
                  </div>
                )}

                {searchResults.map((symbol) => (
                  <button
                    key={symbol.symbol}
                    onClick={() => handleSymbolClick(symbol.symbol)}
                    className="w-full p-4 hover:bg-gray-50 flex items-center justify-between text-left border-b border-gray-100 last:border-b-0 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 text-lg">{symbol.symbol}</div>
                      <div className="text-gray-600 truncate">{symbol.name}</div>
                    </div>
                    <div className="text-gray-400">
                      <Search className="w-5 h-5" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 max-h-96 overflow-y-auto">
              {/* Popular Symbols */}
              <div className="space-y-6">
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <Globe className="w-5 h-5 text-blue-500" />
                    <h3 className="font-semibold text-gray-900">US Stocks</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {POPULAR_SYMBOLS.US.map(symbol => (
                      <button
                        key={symbol}
                        onClick={() => handleSymbolClick(symbol)}
                        className="p-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors font-medium"
                      >
                        {symbol}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <MapPin className="w-5 h-5 text-orange-500" />
                    <h3 className="font-semibold text-gray-900">Indian Stocks</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {POPULAR_SYMBOLS.INDIAN.map(symbol => (
                      <button
                        key={symbol}
                        onClick={() => handleSymbolClick(symbol)}
                        className="p-3 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors font-medium"
                      >
                        {symbol.replace('.NS', '')}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <Bitcoin className="w-5 h-5 text-yellow-500" />
                    <h3 className="font-semibold text-gray-900">Cryptocurrencies</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {POPULAR_SYMBOLS.CRYPTO.map(symbol => (
                      <button
                        key={symbol}
                        onClick={() => handleSymbolClick(symbol)}
                        className="p-3 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors font-medium"
                      >
                        {symbol.replace('-USD', '')}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <Coins className="w-5 h-5 text-amber-600" />
                    <h3 className="font-semibold text-gray-900">Commodities</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {POPULAR_SYMBOLS.COMMODITIES.map(symbol => (
                      <button
                        key={symbol}
                        onClick={() => handleSymbolClick(symbol)}
                        className="p-3 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors font-medium"
                      >
                        {symbol.replace('=F', '')}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <BarChart3 className="w-5 h-5 text-purple-500" />
                    <h3 className="font-semibold text-gray-900">Indices</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {POPULAR_SYMBOLS.INDICES.map(symbol => (
                      <button
                        key={symbol}
                        onClick={() => handleSymbolClick(symbol)}
                        className="p-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors font-medium"
                      >
                        {symbol.replace('^', '')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}