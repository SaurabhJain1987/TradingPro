import React, { useState, useEffect } from 'react';
import { X, Save, Star, Settings, Trash2, Plus, Search } from 'lucide-react';
import { searchSymbols } from '../services/yahooFinance';
import { Symbol, Timeframe } from '../types/trading';

interface StockPreference {
  symbol: string;
  name: string;
  timeframes: {
    chart1: Timeframe;
    chart2: Timeframe;
    chart3: Timeframe;
    chart4: Timeframe;
  };
  createdAt: number;
  updatedAt: number;
}

interface StockSettingsProps {
  onClose: () => void;
  onPreferencesUpdate: (preferences: StockPreference[]) => void;
  currentPreferences: StockPreference[];
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

export function StockSettings({ onClose, onPreferencesUpdate, currentPreferences }: StockSettingsProps) {
  const [preferences, setPreferences] = useState<StockPreference[]>(currentPreferences);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Symbol[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showAddStock, setShowAddStock] = useState(false);
  const [editingStock, setEditingStock] = useState<string | null>(null);

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

  const addStockPreference = (symbol: Symbol) => {
    const existingPreference = preferences.find(p => p.symbol === symbol.symbol);
    if (existingPreference) return;

    const newPreference: StockPreference = {
      symbol: symbol.symbol,
      name: symbol.name,
      timeframes: {
        chart1: '1h',
        chart2: '4h',
        chart3: '1d',
        chart4: '1w'
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const updatedPreferences = [...preferences, newPreference];
    setPreferences(updatedPreferences);
    setShowAddStock(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const updateStockTimeframes = (symbol: string, timeframes: StockPreference['timeframes']) => {
    const updatedPreferences = preferences.map(p =>
      p.symbol === symbol
        ? { ...p, timeframes, updatedAt: Date.now() }
        : p
    );
    setPreferences(updatedPreferences);
  };

  const removeStockPreference = (symbol: string) => {
    const updatedPreferences = preferences.filter(p => p.symbol !== symbol);
    setPreferences(updatedPreferences);
  };

  const savePreferences = () => {
    onPreferencesUpdate(preferences);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Star className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Stock Settings</h2>
              <p className="text-sm text-gray-500">Configure timeframe preferences for your favorite stocks</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Add Stock Section */}
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Manage Stock Preferences</h3>
              <button
                onClick={() => setShowAddStock(!showAddStock)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Stock</span>
              </button>
            </div>

            {showAddStock && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search stocks (e.g., AAPL, RELIANCE.NS, BTC-USD)..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                  />
                </div>

                {searchLoading && (
                  <div className="text-center py-4 text-gray-500">Searching...</div>
                )}

                {!searchLoading && searchQuery.length > 1 && searchResults.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    <div className="mb-2">No results found</div>
                    <div className="text-sm">
                      Try searching for US stocks, Indian stocks (.NS), or crypto (-USD)
                    </div>
                  </div>
                )}

                {searchResults.length > 0 && (
                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                    {searchResults.map((symbol) => (
                      <button
                        key={symbol.symbol}
                        onClick={() => addStockPreference(symbol)}
                        className="w-full p-3 hover:bg-gray-50 flex items-center justify-between text-left border-b border-gray-100 last:border-b-0 transition-colors"
                        disabled={preferences.some(p => p.symbol === symbol.symbol)}
                      >
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">{symbol.symbol}</div>
                          <div className="text-gray-600 text-sm truncate">{symbol.name}</div>
                        </div>
                        {preferences.some(p => p.symbol === symbol.symbol) ? (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Added</span>
                        ) : (
                          <Plus className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Stock Preferences List */}
          <div className="flex-1 overflow-y-auto p-6">
            {preferences.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <div className="text-lg font-medium mb-2">No stock preferences yet</div>
                <div className="text-sm">Add stocks to configure custom timeframe settings</div>
              </div>
            ) : (
              <div className="space-y-4">
                {preferences.map((preference) => (
                  <div
                    key={preference.symbol}
                    className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                          <Settings className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{preference.symbol}</h4>
                          <p className="text-sm text-gray-500 truncate max-w-64">{preference.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setEditingStock(editingStock === preference.symbol ? null : preference.symbol)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Edit timeframes"
                        >
                          <Settings className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => removeStockPreference(preference.symbol)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Remove stock"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>

                    {/* Timeframe Configuration */}
                    <div className="grid grid-cols-4 gap-4">
                      {(['chart1', 'chart2', 'chart3', 'chart4'] as const).map((chartKey, index) => (
                        <div key={chartKey} className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Chart {index + 1}
                          </label>
                          <select
                            value={preference.timeframes[chartKey]}
                            onChange={(e) => {
                              const newTimeframes = {
                                ...preference.timeframes,
                                [chartKey]: e.target.value as Timeframe
                              };
                              updateStockTimeframes(preference.symbol, newTimeframes);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            disabled={editingStock !== preference.symbol && editingStock !== null}
                          >
                            {AVAILABLE_TIMEFRAMES.map(tf => (
                              <option key={tf.value} value={tf.value}>{tf.label}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>

                    {editingStock === preference.symbol && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="text-sm text-gray-600">
                          <strong>Tip:</strong> These timeframes will automatically load when you select this stock from your watchlist in multi-chart view.
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {preferences.length} stock{preferences.length !== 1 ? 's' : ''} configured
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={savePreferences}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Save Preferences</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}