import React, { useState, useEffect } from 'react';
import { Search, Plus, TrendingUp, TrendingDown, X, Globe, MapPin, Edit2, Trash2, FolderPlus, Save, MoreVertical, ChevronDown, ChevronRight, Star, StarOff, Folder, Bitcoin, BarChart3, Coins, Settings } from 'lucide-react';
import { Symbol, Watchlist, WatchlistData, WatchlistSection, StockPreference } from '../types/trading';
import { fetchSymbolData, searchSymbols, POPULAR_SYMBOLS } from '../services/yahooFinance';
import { StockSettings } from './StockSettings';

interface WatchlistManagerProps {
  selectedSymbol: string;
  onSymbolSelect: (symbol: string) => void;
  watchlists: Watchlist[];
  onWatchlistsUpdate: (watchlists: Watchlist[]) => void;
  stockPreferences: StockPreference[];
  onStockPreferencesUpdate: (preferences: StockPreference[]) => void;
}

export function WatchlistManager({ 
  selectedSymbol, 
  onSymbolSelect, 
  watchlists, 
  onWatchlistsUpdate,
  stockPreferences,
  onStockPreferencesUpdate
}: WatchlistManagerProps) {
  const [activeWatchlistId, setActiveWatchlistId] = useState<string>(() => {
    return localStorage.getItem('activeWatchlistId') || '';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<Symbol[]>([]);
  const [watchlistsData, setWatchlistsData] = useState<WatchlistData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showPopular, setShowPopular] = useState(false);
  const [showCreateWatchlist, setShowCreateWatchlist] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState('');
  const [editingWatchlist, setEditingWatchlist] = useState<string | null>(null);
  const [editWatchlistName, setEditWatchlistName] = useState('');
  const [showWatchlistMenu, setShowWatchlistMenu] = useState<string | null>(null);
  const [showCreateSection, setShowCreateSection] = useState<string | null>(null);
  const [newSectionName, setNewSectionName] = useState('');
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editSectionName, setEditSectionName] = useState('');
  const [flashingSymbols, setFlashingSymbols] = useState<Set<string>>(new Set());
  const [showStockSettings, setShowStockSettings] = useState(false);

  // Save active watchlist to localStorage when it changes
  useEffect(() => {
    if (activeWatchlistId) {
      localStorage.setItem('activeWatchlistId', activeWatchlistId);
    }
  }, [activeWatchlistId]);

  // Initialize with default watchlist if none exist
  useEffect(() => {
    if (watchlists.length === 0) {
      const defaultWatchlist: Watchlist = {
        id: 'default',
        name: 'My Watchlist',
        sections: [
          {
            id: 'us-stocks',
            name: 'US Stocks',
            symbols: ['AAPL', 'GOOGL', 'MSFT', 'TSLA'],
            expanded: true,
            createdAt: Date.now()
          },
          {
            id: 'indian-stocks',
            name: 'Indian Stocks',
            symbols: ['RELIANCE.NS', 'TCS.NS'],
            expanded: true,
            createdAt: Date.now()
          }
        ],
        isFavorite: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      onWatchlistsUpdate([defaultWatchlist]);
      setActiveWatchlistId('default');
    } else if (!activeWatchlistId && watchlists.length > 0) {
      // Load saved active watchlist or default to first one
      const savedActiveId = localStorage.getItem('activeWatchlistId');
      const validWatchlist = watchlists.find(w => w.id === savedActiveId);
      setActiveWatchlistId(validWatchlist ? savedActiveId! : watchlists[0].id);
    }
  }, [watchlists, activeWatchlistId, onWatchlistsUpdate]);

  const activeWatchlist = watchlists.find(w => w.id === activeWatchlistId);
  const activeWatchlistData = watchlistsData.find(wd => wd.watchlist.id === activeWatchlistId);

  // Fetch watchlist data with flash animation
  useEffect(() => {
    const fetchWatchlistsData = async () => {
      if (watchlists.length === 0) return;
      
      setLoading(true);
      const promises = watchlists.map(async (watchlist) => {
        const allSymbols = watchlist.sections?.flatMap(section => section.symbols) || [];
        const symbolPromises = allSymbols.map(symbol => fetchSymbolData(symbol));
        const symbolResults = await Promise.all(symbolPromises);
        const validResults = symbolResults.filter((result): result is Symbol => result !== null);
        return { watchlist, symbolData: validResults };
      });
      
      const results = await Promise.all(promises);
      
      // Check for price changes and trigger flash animation
      const newFlashingSymbols = new Set<string>();
      results.forEach(result => {
        result.symbolData.forEach(newSymbol => {
          const oldData = watchlistsData.find(wd => wd.watchlist.id === result.watchlist.id);
          const oldSymbol = oldData?.symbolData.find(s => s.symbol === newSymbol.symbol);
          if (oldSymbol && oldSymbol.price !== newSymbol.price) {
            newFlashingSymbols.add(newSymbol.symbol);
          }
        });
      });
      
      if (newFlashingSymbols.size > 0) {
        setFlashingSymbols(newFlashingSymbols);
        setTimeout(() => setFlashingSymbols(new Set()), 2000); // Slower flash duration - 2 seconds
      }
      
      setWatchlistsData(results);
      setLoading(false);
    };

    fetchWatchlistsData();
    
    // Set up auto-refresh every 1 minute
    const interval = setInterval(fetchWatchlistsData, 60000);
    return () => clearInterval(interval);
  }, [watchlists]);

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

  const createWatchlist = () => {
    if (!newWatchlistName.trim()) return;
    
    const newWatchlist: Watchlist = {
      id: Date.now().toString(),
      name: newWatchlistName.trim(),
      sections: [
        {
          id: 'default-section',
          name: 'Default',
          symbols: [],
          expanded: true,
          createdAt: Date.now()
        }
      ],
      isFavorite: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    onWatchlistsUpdate([...watchlists, newWatchlist]);
    setActiveWatchlistId(newWatchlist.id);
    setNewWatchlistName('');
    setShowCreateWatchlist(false);
  };

  const updateWatchlistName = (watchlistId: string, newName: string) => {
    if (!newName.trim()) return;
    
    const updatedWatchlists = watchlists.map(w => 
      w.id === watchlistId 
        ? { ...w, name: newName.trim(), updatedAt: Date.now() }
        : w
    );
    onWatchlistsUpdate(updatedWatchlists);
    setEditingWatchlist(null);
    setEditWatchlistName('');
  };

  const toggleWatchlistFavorite = (watchlistId: string) => {
    const updatedWatchlists = watchlists.map(w => 
      w.id === watchlistId 
        ? { ...w, isFavorite: !w.isFavorite, updatedAt: Date.now() }
        : w
    );
    onWatchlistsUpdate(updatedWatchlists);
  };

  const deleteWatchlist = (watchlistId: string) => {
    if (watchlists.length <= 1) return;
    
    const updatedWatchlists = watchlists.filter(w => w.id !== watchlistId);
    onWatchlistsUpdate(updatedWatchlists);
    
    if (activeWatchlistId === watchlistId) {
      setActiveWatchlistId(updatedWatchlists[0]?.id || '');
    }
    setShowWatchlistMenu(null);
  };

  const createSection = (watchlistId: string) => {
    if (!newSectionName.trim()) return;
    
    const updatedWatchlists = watchlists.map(w => 
      w.id === watchlistId 
        ? { 
            ...w, 
            sections: [...(w.sections || []), {
              id: Date.now().toString(),
              name: newSectionName.trim(),
              symbols: [],
              expanded: true,
              createdAt: Date.now()
            }],
            updatedAt: Date.now() 
          }
        : w
    );
    onWatchlistsUpdate(updatedWatchlists);
    setNewSectionName('');
    setShowCreateSection(null);
  };

  const updateSectionName = (watchlistId: string, sectionId: string, newName: string) => {
    if (!newName.trim()) return;
    
    const updatedWatchlists = watchlists.map(w => 
      w.id === watchlistId 
        ? { 
            ...w, 
            sections: (w.sections || []).map(s => 
              s.id === sectionId 
                ? { ...s, name: newName.trim() }
                : s
            ),
            updatedAt: Date.now() 
          }
        : w
    );
    onWatchlistsUpdate(updatedWatchlists);
    setEditingSection(null);
    setEditSectionName('');
  };

  const deleteSection = (watchlistId: string, sectionId: string) => {
    const watchlist = watchlists.find(w => w.id === watchlistId);
    if (!watchlist || !watchlist.sections || watchlist.sections.length <= 1) return;
    
    const updatedWatchlists = watchlists.map(w => 
      w.id === watchlistId 
        ? { 
            ...w, 
            sections: (w.sections || []).filter(s => s.id !== sectionId),
            updatedAt: Date.now() 
          }
        : w
    );
    onWatchlistsUpdate(updatedWatchlists);
  };

  const toggleSection = (watchlistId: string, sectionId: string) => {
    const updatedWatchlists = watchlists.map(w => 
      w.id === watchlistId 
        ? { 
            ...w, 
            sections: (w.sections || []).map(s => 
              s.id === sectionId 
                ? { ...s, expanded: !s.expanded }
                : s
            ),
            updatedAt: Date.now() 
          }
        : w
    );
    onWatchlistsUpdate(updatedWatchlists);
  };

  const addToSection = async (symbol: string, sectionId: string) => {
    if (!activeWatchlist) return;
    
    const section = activeWatchlist.sections?.find(s => s.id === sectionId);
    if (!section || section.symbols.includes(symbol)) return;
    
    const totalSymbols = activeWatchlist.sections?.reduce((total, s) => total + s.symbols.length, 0) || 0;
    if (totalSymbols >= 250) {
      alert('Watchlist is full (250 symbols maximum)');
      return;
    }

    const updatedWatchlists = watchlists.map(w => 
      w.id === activeWatchlistId 
        ? { 
            ...w, 
            sections: (w.sections || []).map(s => 
              s.id === sectionId 
                ? { ...s, symbols: [...s.symbols, symbol] }
                : s
            ),
            updatedAt: Date.now() 
          }
        : w
    );
    onWatchlistsUpdate(updatedWatchlists);
    
    setShowSearch(false);
    setShowPopular(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeFromSection = (symbol: string, sectionId: string) => {
    if (!activeWatchlist) return;
    
    const updatedWatchlists = watchlists.map(w => 
      w.id === activeWatchlistId 
        ? { 
            ...w, 
            sections: (w.sections || []).map(s => 
              s.id === sectionId 
                ? { ...s, symbols: s.symbols.filter(sym => sym !== symbol) }
                : s
            ),
            updatedAt: Date.now() 
          }
        : w
    );
    onWatchlistsUpdate(updatedWatchlists);
  };

  const addPopularSymbol = (symbol: string) => {
    if (!activeWatchlist || !activeWatchlist.sections || activeWatchlist.sections.length === 0) return;
    
    // Add to the first section by default
    addToSection(symbol, activeWatchlist.sections[0].id);
  };

  const handleSymbolSelect = (symbol: string) => {
    onSymbolSelect(symbol);
  };

  const renderSymbolItem = (symbol: Symbol, sectionId: string) => {
    const changePercent = isNaN(symbol.changePercent) ? 0 : symbol.changePercent;
    const isFlashing = flashingSymbols.has(symbol.symbol);
    const hasPreferences = stockPreferences.some(p => p.symbol === symbol.symbol);
    
    return (
      <div
        key={symbol.symbol}
        className={`group px-3 py-1.5 border-b border-gray-100 cursor-pointer transition-all duration-700 ease-out hover:bg-gray-50 ${
          selectedSymbol === symbol.symbol ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
        } ${isFlashing ? 'bg-yellow-100 animate-pulse' : ''}`}
        onClick={() => handleSymbolSelect(symbol.symbol)}
      >
        <div className="flex items-center">
          {/* Symbol - 40% width */}
          <div className="w-[40%] min-w-0 pr-2">
            <div className="flex items-center space-x-1">
              <span className="font-semibold text-gray-900 text-sm truncate block">{symbol.symbol}</span>
              {hasPreferences && (
                <Star className="w-2 h-2 text-yellow-500 fill-current flex-shrink-0" />
              )}
            </div>
          </div>
          
          {/* Price - 30% width */}
          <div className="w-[30%] text-right pr-2">
            <span className="font-bold text-sm text-gray-900">${symbol.price.toFixed(2)}</span>
          </div>
          
          {/* Change % and Remove Button - 30% width */}
          <div className="w-[30%] flex items-center justify-end space-x-1">
            <div className={`text-xs font-medium transition-colors duration-400 ease-out ${
              changePercent >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(1)}%
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeFromSection(symbol.symbol, sectionId);
              }}
              className="p-0.5 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out border border-gray-300 ml-1"
            >
              <X className="w-2 h-2 text-gray-600" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const favoriteWatchlists = watchlists.filter(w => w.isFavorite);
  const regularWatchlists = watchlists.filter(w => !w.isFavorite);

  return (
    <div className="bg-white border-l-2 border-gray-300 w-72 flex flex-col flex-shrink-0">
      {/* Compact Watchlist Header */}
      <div className="p-3 border-b-2 border-gray-300 bg-gray-50">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-900">Watchlists</h2>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setShowStockSettings(true)}
              className="p-1 hover:bg-gray-200 rounded transition-all duration-400 ease-out border border-gray-300"
              title="Stock settings"
            >
              <Star className="w-3 h-3 text-yellow-500" />
            </button>
            <button
              onClick={() => setShowCreateWatchlist(true)}
              className="p-1 hover:bg-gray-200 rounded transition-all duration-400 ease-out border border-gray-300"
              title="Create new watchlist"
            >
              <FolderPlus className="w-3 h-3 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Watchlist Dropdown */}
        <div className="mb-2">
          <select
            value={activeWatchlistId}
            onChange={(e) => setActiveWatchlistId(e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-400 ease-out"
          >
            {favoriteWatchlists.length > 0 && (
              <optgroup label="⭐ Favorites">
                {favoriteWatchlists.map(watchlist => (
                  <option key={watchlist.id} value={watchlist.id}>
                    {watchlist.name} ({watchlist.sections?.reduce((total, s) => total + s.symbols.length, 0) || 0})
                  </option>
                ))}
              </optgroup>
            )}
            {regularWatchlists.length > 0 && (
              <optgroup label="📁 Watchlists">
                {regularWatchlists.map(watchlist => (
                  <option key={watchlist.id} value={watchlist.id}>
                    {watchlist.name} ({watchlist.sections?.reduce((total, s) => total + s.symbols.length, 0) || 0})
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        {/* Watchlist Actions */}
        {activeWatchlist && (
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-1">
              <button
                onClick={() => toggleWatchlistFavorite(activeWatchlist.id)}
                className="p-1 hover:bg-gray-200 rounded transition-all duration-400 ease-out border border-gray-300"
                title={activeWatchlist.isFavorite ? "Remove from favorites" : "Add to favorites"}
              >
                {activeWatchlist.isFavorite ? (
                  <Star className="w-3 h-3 text-yellow-500 fill-current" />
                ) : (
                  <StarOff className="w-3 h-3 text-gray-600" />
                )}
              </button>
              <button
                onClick={() => setShowCreateSection(activeWatchlist.id)}
                className="p-1 hover:bg-gray-200 rounded transition-all duration-400 ease-out border border-gray-300"
                title="Create new section"
              >
                <Folder className="w-3 h-3 text-gray-600" />
              </button>
              <button
                onClick={() => setShowWatchlistMenu(showWatchlistMenu === activeWatchlist.id ? null : activeWatchlist.id)}
                className="p-1 hover:bg-gray-200 rounded transition-all duration-400 ease-out border border-gray-300"
              >
                <MoreVertical className="w-3 h-3 text-gray-600" />
              </button>
            </div>
            
            <div className="flex items-center space-x-1">
              <button
                onClick={() => {
                  setShowPopular(!showPopular);
                  setShowSearch(false);
                }}
                className="p-1 hover:bg-gray-200 rounded transition-all duration-400 ease-out border border-gray-300"
                title="Popular symbols"
              >
                <Globe className="w-3 h-3 text-gray-600" />
              </button>
              <button
                onClick={() => {
                  setShowSearch(!showSearch);
                  setShowPopular(false);
                }}
                className="p-1 hover:bg-gray-200 rounded transition-all duration-400 ease-out border border-gray-300"
              >
                {showSearch ? <X className="w-3 h-3 text-gray-600" /> : <Plus className="w-3 h-3 text-gray-600" />}
              </button>
            </div>
          </div>
        )}

        {/* Watchlist Menu */}
        {showWatchlistMenu === activeWatchlist?.id && (
          <div className="absolute top-20 right-4 bg-white border-2 border-gray-300 rounded-lg shadow-lg z-20 min-w-32">
            <button
              onClick={() => {
                setEditingWatchlist(activeWatchlist.id);
                setEditWatchlistName(activeWatchlist.name);
                setShowWatchlistMenu(null);
              }}
              className="w-full px-2 py-1 text-left text-xs hover:bg-gray-100 flex items-center space-x-1 text-gray-700 transition-colors duration-300 ease-out"
            >
              <Edit2 className="w-2 h-2" />
              <span>Rename</span>
            </button>
            {watchlists.length > 1 && (
              <button
                onClick={() => deleteWatchlist(activeWatchlist.id)}
                className="w-full px-2 py-1 text-left text-xs hover:bg-gray-100 text-red-600 flex items-center space-x-1 transition-colors duration-300 ease-out"
              >
                <Trash2 className="w-2 h-2" />
                <span>Delete</span>
              </button>
            )}
          </div>
        )}

        {/* Create/Edit Forms */}
        {showCreateWatchlist && (
          <div className="mb-2 p-2 bg-white rounded border border-gray-300">
            <div className="flex space-x-1">
              <input
                type="text"
                value={newWatchlistName}
                onChange={(e) => setNewWatchlistName(e.target.value)}
                placeholder="Name"
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-400 ease-out"
                maxLength={20}
                onKeyPress={(e) => e.key === 'Enter' && createWatchlist()}
              />
              <button onClick={createWatchlist} className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 border border-blue-600 transition-colors duration-300 ease-out">
                <Save className="w-3 h-3" />
              </button>
              <button onClick={() => setShowCreateWatchlist(false)} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200 border border-gray-300 transition-colors duration-300 ease-out">
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {editingWatchlist && (
          <div className="mb-2 p-2 bg-white rounded border border-gray-300">
            <div className="flex space-x-1">
              <input
                type="text"
                value={editWatchlistName}
                onChange={(e) => setEditWatchlistName(e.target.value)}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-400 ease-out"
                maxLength={20}
                onKeyPress={(e) => e.key === 'Enter' && updateWatchlistName(editingWatchlist, editWatchlistName)}
              />
              <button onClick={() => updateWatchlistName(editingWatchlist, editWatchlistName)} className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 border border-blue-600 transition-colors duration-300 ease-out">
                <Save className="w-3 h-3" />
              </button>
              <button onClick={() => { setEditingWatchlist(null); setEditWatchlistName(''); }} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200 border border-gray-300 transition-colors duration-300 ease-out">
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {showCreateSection && (
          <div className="mb-2 p-2 bg-white rounded border border-gray-300">
            <div className="flex space-x-1">
              <input
                type="text"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                placeholder="Section name"
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-400 ease-out"
                maxLength={20}
                onKeyPress={(e) => e.key === 'Enter' && createSection(showCreateSection)}
              />
              <button onClick={() => createSection(showCreateSection)} className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 border border-blue-600 transition-colors duration-300 ease-out">
                <Save className="w-3 h-3" />
              </button>
              <button onClick={() => { setShowCreateSection(null); setNewSectionName(''); }} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200 border border-gray-300 transition-colors duration-300 ease-out">
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Compact Popular Symbols */}
        {showPopular && (
          <div className="mt-2 p-2 bg-white rounded text-xs border border-gray-300 max-h-48 overflow-y-auto">
            <div className="space-y-2">
              <div>
                <div className="flex items-center space-x-1 mb-1">
                  <Globe className="w-2 h-2 text-blue-500" />
                  <span className="font-medium text-gray-700">US Stocks</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {POPULAR_SYMBOLS.US.slice(0, 8).map(symbol => (
                    <button
                      key={symbol}
                      onClick={() => addPopularSymbol(symbol)}
                      className="px-1 py-0.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-all duration-300 ease-out text-xs border border-blue-200"
                    >
                      {symbol}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center space-x-1 mb-1">
                  <MapPin className="w-2 h-2 text-orange-500" />
                  <span className="font-medium text-gray-700">Indian Stocks</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {POPULAR_SYMBOLS.INDIAN.slice(0, 6).map(symbol => (
                    <button
                      key={symbol}
                      onClick={() => addPopularSymbol(symbol)}
                      className="px-1 py-0.5 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition-all duration-300 ease-out text-xs border border-orange-200"
                    >
                      {symbol.replace('.NS', '')}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center space-x-1 mb-1">
                  <Bitcoin className="w-2 h-2 text-yellow-500" />
                  <span className="font-medium text-gray-700">Crypto</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {POPULAR_SYMBOLS.CRYPTO.slice(0, 6).map(symbol => (
                    <button
                      key={symbol}
                      onClick={() => addPopularSymbol(symbol)}
                      className="px-1 py-0.5 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition-all duration-300 ease-out text-xs border border-yellow-200"
                    >
                      {symbol.replace('-USD', '')}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center space-x-1 mb-1">
                  <Coins className="w-2 h-2 text-amber-600" />
                  <span className="font-medium text-gray-700">Commodities</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {POPULAR_SYMBOLS.COMMODITIES.slice(0, 6).map(symbol => (
                    <button
                      key={symbol}
                      onClick={() => addPopularSymbol(symbol)}
                      className="px-1 py-0.5 bg-amber-100 text-amber-700 rounded hover:bg-amber-200 transition-all duration-300 ease-out text-xs border border-amber-200"
                    >
                      {symbol.replace('=F', '')}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center space-x-1 mb-1">
                  <BarChart3 className="w-2 h-2 text-purple-500" />
                  <span className="font-medium text-gray-700">Indices</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {POPULAR_SYMBOLS.INDICES.slice(0, 6).map(symbol => (
                    <button
                      key={symbol}
                      onClick={() => addPopularSymbol(symbol)}
                      className="px-1 py-0.5 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-all duration-300 ease-out text-xs border border-purple-200"
                    >
                      {symbol.replace('^', '')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Compact Search */}
        {showSearch && (
          <div className="mt-2 relative">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 w-3 h-3" />
              <input
                type="text"
                placeholder="Search symbols..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-6 pr-3 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-400 ease-out"
                autoFocus
              />
            </div>
            
            {searchLoading && (
              <div className="absolute top-full left-0 right-0 bg-white border-2 border-gray-300 rounded shadow-lg mt-1 p-2 z-10">
                <div className="text-center text-gray-600 text-xs">Searching...</div>
              </div>
            )}
            
            {searchResults.length > 0 && !searchLoading && activeWatchlist && (
              <div className="absolute top-full left-0 right-0 bg-white border-2 border-gray-300 rounded shadow-lg mt-1 max-h-32 overflow-y-auto z-10">
                {searchResults.map((symbol) => (
                  <div key={symbol.symbol} className="border-b border-gray-100 last:border-b-0">
                    <div className="px-2 py-1 text-xs">
                      <div className="font-medium text-gray-900">{symbol.symbol}</div>
                      <div className="text-gray-600 truncate">{symbol.name}</div>
                    </div>
                    <div className="px-2 pb-1">
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            addToSection(symbol.symbol, e.target.value);
                          }
                        }}
                        className="w-full text-xs border border-gray-300 rounded px-1 py-0.5 transition-all duration-300 ease-out"
                        defaultValue=""
                      >
                        <option value="">Add to section...</option>
                        {(activeWatchlist.sections || []).map(section => (
                          <option key={section.id} value={section.id}>
                            {section.name} ({section.symbols.length})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Symbol Count */}
        {activeWatchlist && (
          <div className="text-xs text-gray-600 text-center">
            {activeWatchlist.sections?.reduce((total, s) => total + s.symbols.length, 0) || 0}/250 symbols
          </div>
        )}
      </div>

      {/* Column Headers */}
      <div className="px-3 py-2 bg-gray-100 border-b border-gray-200 text-xs font-medium text-gray-600">
        <div className="flex items-center">
          <div className="w-[40%]">Symbol</div>
          <div className="w-[30%] text-right pr-2">Last</div>
          <div className="w-[30%] text-right pr-6">Chg%</div>
        </div>
      </div>

      {/* Watchlist Content with Sections */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {loading && (!activeWatchlistData || activeWatchlistData.symbolData.length === 0) ? (
          <div className="p-3 text-center text-gray-600 text-xs">Loading...</div>
        ) : !activeWatchlist || !activeWatchlist.sections || activeWatchlist.sections.length === 0 ? (
          <div className="p-3 text-center text-gray-600 text-xs">
            <div className="mb-1">No sections</div>
            <div className="text-xs">Create a section to add symbols</div>
          </div>
        ) : (
          activeWatchlist.sections.map((section) => {
            const sectionSymbols = activeWatchlistData?.symbolData.filter(symbol => 
              section.symbols.includes(symbol.symbol)
            ) || [];

            return (
              <div key={section.id} className="border-b border-gray-200">
                <div className="bg-gray-100 hover:bg-gray-200 flex items-center justify-between text-left border-b border-gray-200 px-2 py-1 transition-colors duration-400 ease-out">
                  <button
                    onClick={() => toggleSection(activeWatchlist.id, section.id)}
                    className="flex items-center space-x-1 flex-1"
                  >
                    <span className="text-xs font-medium text-gray-700">{section.name}</span>
                    <span className="text-xs text-gray-500">({sectionSymbols.length})</span>
                    {section.expanded ? (
                      <ChevronDown className="w-3 h-3 text-gray-500 transition-transform duration-300 ease-out" />
                    ) : (
                      <ChevronRight className="w-3 h-3 text-gray-500 transition-transform duration-300 ease-out" />
                    )}
                  </button>
                  
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => {
                        setEditingSection(section.id);
                        setEditSectionName(section.name);
                      }}
                      className="p-0.5 hover:bg-gray-300 rounded transition-colors duration-300 ease-out"
                      title="Edit section"
                    >
                      <Edit2 className="w-2 h-2 text-gray-600" />
                    </button>
                    {activeWatchlist.sections && activeWatchlist.sections.length > 1 && (
                      <button
                        onClick={() => deleteSection(activeWatchlist.id, section.id)}
                        className="p-0.5 hover:bg-gray-300 rounded transition-colors duration-300 ease-out"
                        title="Delete section"
                      >
                        <Trash2 className="w-2 h-2 text-red-600" />
                      </button>
                    )}
                  </div>
                </div>
                
                {editingSection === section.id && (
                  <div className="p-2 bg-white border-b border-gray-200">
                    <div className="flex space-x-1">
                      <input
                        type="text"
                        value={editSectionName}
                        onChange={(e) => setEditSectionName(e.target.value)}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-400 ease-out"
                        maxLength={20}
                        onKeyPress={(e) => e.key === 'Enter' && updateSectionName(activeWatchlist.id, section.id, editSectionName)}
                      />
                      <button onClick={() => updateSectionName(activeWatchlist.id, section.id, editSectionName)} className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors duration-300 ease-out">
                        <Save className="w-3 h-3" />
                      </button>
                      <button onClick={() => { setEditingSection(null); setEditSectionName(''); }} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200 transition-colors duration-300 ease-out">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
                
                {section.expanded && (
                  <div>
                    {sectionSymbols.length === 0 ? (
                      <div className="p-2 text-center text-gray-500 text-xs">
                        No symbols in this section
                      </div>
                    ) : (
                      sectionSymbols.map(symbol => renderSymbolItem(symbol, section.id))
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="p-2 border-t-2 border-gray-300 bg-gray-50">
        <div className="text-xs text-gray-600 text-center">
          Auto-refresh: 1min
        </div>
      </div>

      {/* Stock Settings Modal */}
      {showStockSettings && (
        <StockSettings
          onClose={() => setShowStockSettings(false)}
          onPreferencesUpdate={onStockPreferencesUpdate}
          currentPreferences={stockPreferences}
        />
      )}
    </div>
  );
}