# Professional Trading Platform - Regeneration Prompt

Create a modern React TypeScript trading platform with the following specifications:

## Core Features
- **Dual View Modes**: Single chart view and multi-chart view (4 charts with navigation)
- **Advanced Watchlist Management**: Multiple watchlists with collapsible sections, favorites, drag-and-drop organization
- **Real-time Data**: Yahoo Finance API integration with CORS proxy, auto-refresh every 60 seconds
- **Symbol Search**: Comprehensive search with popular symbols categorized by market type
- **Stock Preferences**: Save custom timeframe configurations per symbol for multi-chart view

## Technical Implementation

### Data Fetching & Custom Timeframes
- Use Yahoo Finance API via CORS proxy: `https://api.allorigins.win/raw?url=`
- For unsupported timeframes (2h, 3h, 6h, etc.), fetch base interval data and aggregate:
  - 2h-18h: Fetch 1h data, aggregate by factor
  - 2d-6d: Fetch 1d data, aggregate by factor
  - 2w-6w: Fetch 1wk data, aggregate by factor
- Enhanced symbol formatting for crypto (-USD), Indian stocks (.NS), commodities (=F), indices (^)

### RSI Calculation (Critical - Use Wilder's Method)
```javascript
// Use Wilder's smoothing method, NOT simple moving average
// First RSI: Simple average of gains/losses over 14 periods
// Subsequent RSI: ((prevAvgGain * 13) + currentGain) / 14
// RS = avgGain / avgLoss, RSI = 100 - (100 / (1 + RS))
```

### Chart Implementation
- **Price Charts**: Candlestick/line charts with volume
- **RSI Indicator**: 14-period RSI with 14-period SMA overlay and Bollinger Bands
- **Multi-Chart**: 4 configurable timeframes with navigation arrows
- **Responsive Design**: Proper scaling on all screen sizes

## UI/UX Design Requirements

### Visual Design
- **Color Scheme**: Blue primary (#3b82f6), clean grays, green/red for price changes
- **Typography**: Clean hierarchy, proper spacing (8px system)
- **Layout**: Fixed sidebar (288px), flexible main content
- **Animations**: Smooth transitions (400-600ms), subtle hover effects, price flash animations

### Watchlist Features
- **Multi-level Organization**: Watchlists → Sections → Symbols
- **Visual Indicators**: Favorite stars, exchange badges (NSE, CRYPTO), custom preferences
- **Real-time Updates**: Price flash animations, auto-refresh indicators
- **Management**: Create/rename/delete watchlists and sections, 250 symbol limit per watchlist

### Chart Interaction
- **Single View**: Full-screen chart with timeframe selector, RSI toggle
- **Multi View**: 4-chart grid with individual timeframe controls, chart navigation
- **Stock Settings**: Modal for configuring custom timeframe preferences per symbol
- **Responsive**: Mobile-friendly with touch interactions

## Key Components Structure
```
App.tsx - Main layout and state management
├── SingleChart.tsx - Full-screen chart view
├── MultiChart.tsx - 4-chart grid view
├── WatchlistManager.tsx - Complete watchlist system
├── StockSettings.tsx - Preferences configuration
├── Chart.tsx - Reusable chart component
└── SymbolSearch.tsx - Search and popular symbols
```

## Data Persistence
- LocalStorage for: watchlists, active selections, view preferences, stock settings
- Session management for real-time data caching
- Automatic save/restore of user configurations

## Performance Optimizations
- Debounced search (300ms)
- Chart data caching and efficient re-rendering
- Lazy loading of chart components
- Optimized API calls with error handling and retries

The result should be a professional, production-ready trading platform with smooth animations, intuitive navigation, and robust data handling comparable to industry-standard trading applications.