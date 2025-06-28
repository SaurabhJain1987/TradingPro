# Complete Prompt for Recreating TradingHub Pro

Use this comprehensive prompt to recreate the TradingHub Pro trading platform from scratch:

---

## Project Overview
Create a professional trading platform called "TradingHub Pro" using Python Flask backend and modern frontend technologies. The platform should provide real-time market data, multiple watchlist management, and advanced charting capabilities for US and Indian stock markets.

## Core Requirements

### 1. Backend (Python Flask)
- **Framework**: Flask with session management
- **Data Source**: Yahoo Finance API using yfinance library
- **Market Support**: US stocks (NASDAQ, NYSE), Indian stocks (NSE, BSE), Cryptocurrencies
- **API Endpoints**: Symbol data, chart data, search, watchlist management
- **Technical Indicators**: RSI, Moving Averages, Bollinger Bands

### 2. Frontend (HTML/CSS/JavaScript)
- **Styling**: Tailwind CSS for modern, responsive design
- **Icons**: Lucide icons for consistent iconography
- **Charts**: Chart.js for interactive price and RSI charts
- **Layout**: Professional sidebar + main content area
- **Responsive**: Mobile-friendly design

### 3. Key Features
- **Multiple Watchlists**: Create, rename, delete watchlists (up to 250 symbols each)
- **Real-time Data**: Live price updates every 30 seconds
- **Symbol Search**: Search US and Indian stocks with autocomplete
- **Popular Symbols**: Quick access to trending stocks
- **Timeframe Selection**: 1m, 5m, 15m, 1h, 4h, 1d, 1w, 1M support
- **Technical Analysis**: RSI indicator with Bollinger Bands
- **Session Persistence**: Watchlists saved in browser session

## Detailed Implementation

### Backend Structure (app.py)
```python
# Core components needed:
1. TradingPlatform class with methods:
   - format_symbol_for_yahoo()
   - fetch_symbol_data()
   - fetch_chart_data()
   - search_symbols()
   - calculate_rsi()
   - calculate_bollinger_bands()

2. Flask routes:
   - GET / (main page)
   - GET /api/symbol/<symbol>
   - GET /api/chart/<symbol>/<timeframe>
   - GET /api/search?q=<query>
   - GET /api/popular
   - GET/POST /api/watchlists
   - GET /api/watchlist/<id>/data

3. Popular symbols dictionary:
   - US: ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'NVDA', 'META', 'SPY', 'QQQ', 'BTC-USD', 'ETH-USD']
   - INDIAN: ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', etc.]
```

### Frontend Structure (templates/index.html)
```html
<!-- Layout components needed: -->
1. Header with app title and view mode toggle
2. Sidebar with:
   - Watchlist tabs
   - Create/manage watchlist forms
   - Symbol search
   - Popular symbols
   - Watchlist content
3. Main chart area with:
   - Symbol info and price display
   - Timeframe selector
   - Price chart canvas
   - RSI chart canvas
   - Chart controls
```

### JavaScript Application (static/js/app.js)
```javascript
// TradingApp class with methods:
1. Initialization and event listeners
2. Watchlist management (create, delete, switch)
3. Symbol search and addition
4. Chart rendering with Chart.js
5. Real-time data updates
6. Session persistence
7. UI state management
```

### Styling Requirements
- **Color Scheme**: Blue primary (#3b82f6), gray neutrals, green/red for gains/losses
- **Typography**: Clean, readable fonts with proper hierarchy
- **Layout**: Fixed sidebar (320px), flexible main content
- **Interactions**: Hover effects, smooth transitions, loading states
- **Responsive**: Mobile breakpoints, touch-friendly controls

### Technical Specifications

#### Data Flow
1. User selects symbol → Frontend calls API → Backend fetches from Yahoo Finance → Returns formatted data
2. Chart updates → Fetch OHLCV data → Calculate indicators → Render with Chart.js
3. Watchlist changes → Update session storage → Re-render UI components

#### Error Handling
- API failures with user-friendly messages
- Invalid symbol handling
- Network timeout management
- Graceful degradation for missing data

#### Performance Optimizations
- Debounced search input
- Cached popular symbols
- Efficient chart re-rendering
- Minimal DOM manipulation

## File Structure
```
flask-trading-platform/
├── app.py                 # Main Flask application
├── run.py                 # Application runner
├── requirements.txt       # Dependencies
├── README.md             # Documentation
├── templates/
│   └── index.html        # Main template
└── static/
    ├── js/
    │   └── app.js        # Frontend logic
    └── css/
        └── style.css     # Custom styles
```

## Dependencies
```
Flask==2.3.3
yfinance==0.2.18
pandas==2.0.3
numpy==1.24.3
requests==2.31.0
python-dotenv==1.0.0
```

## Design Guidelines
- **Professional Appearance**: Clean, modern interface suitable for financial applications
- **Apple-level Polish**: Attention to micro-interactions, spacing, and visual hierarchy
- **Accessibility**: Proper contrast ratios, keyboard navigation, screen reader support
- **Performance**: Fast loading, smooth animations, responsive interactions

## Implementation Steps
1. Set up Flask application with basic routing
2. Implement Yahoo Finance data fetching
3. Create HTML template with Tailwind CSS
4. Build JavaScript application class
5. Implement watchlist management
6. Add chart rendering with Chart.js
7. Integrate real-time data updates
8. Add search and popular symbols
9. Implement responsive design
10. Add error handling and loading states

## Testing Checklist
- [ ] Symbol data fetching works for US/Indian stocks
- [ ] Chart renders correctly for all timeframes
- [ ] Watchlist CRUD operations function properly
- [ ] Search returns relevant results
- [ ] Real-time updates work consistently
- [ ] Responsive design works on mobile
- [ ] Error states display appropriately
- [ ] Session persistence maintains data

This prompt provides everything needed to recreate the TradingHub Pro platform with all its features and professional polish.