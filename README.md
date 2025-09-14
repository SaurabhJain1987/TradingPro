# TradingHub Pro - Flask Trading Platform

A professional trading platform built with Python Flask, featuring real-time market data, multiple watchlists, and advanced charting capabilities.

## Features

### 🚀 Core Features
- **Real-time Market Data**: Live stock prices from Yahoo Finance API
- **Multiple Watchlists**: Create and manage up to multiple watchlists with 250 symbols each
- **Advanced Charting**: Candlestick charts with RSI indicators and Bollinger Bands
- **Multi-timeframe Analysis**: Support for various timeframes (1m, 5m, 1h, 1d, 1w, 1M, etc.)
- **Symbol Search**: Search and add US and Indian market symbols
- **Popular Symbols**: Quick access to popular US and Indian stocks
- **Responsive Design**: Works on desktop and mobile devices

### 📊 Supported Markets
- **US Markets**: NASDAQ, NYSE (AAPL, GOOGL, MSFT, TSLA, etc.)
- **Indian Markets**: NSE, BSE (RELIANCE.NS, TCS.NS, etc.)
- **Cryptocurrencies**: BTC-USD, ETH-USD, etc.

### 📈 Technical Indicators
- **RSI (Relative Strength Index)**: 14-period RSI with moving average
- **Bollinger Bands**: On RSI for overbought/oversold signals
- **Price Charts**: Real-time candlestick charts
- **Volume Analysis**: Trading volume data

## Installation

### Prerequisites
- Python 3.8 or higher
- pip (Python package installer)

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd flask-trading-platform
   ```

2. **Create a virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set environment variables** (optional)
   ```bash
   export FLASK_ENV=development
   export FLASK_DEBUG=True
   export SECRET_KEY=your-secret-key-here
   ```

5. **Run the application**
   ```bash
   python run.py
   ```

6. **Access the application**
   Open your browser and navigate to `http://localhost:5000`

## Project Structure

```
flask-trading-platform/
├── app.py                 # Main Flask application
├── run.py                 # Application runner
├── requirements.txt       # Python dependencies
├── README.md             # Project documentation
├── templates/
│   └── index.html        # Main HTML template
└── static/
    ├── js/
    │   └── app.js        # Frontend JavaScript
    └── css/
        └── style.css     # Custom CSS styles
```

## API Endpoints

### Market Data
- `GET /api/symbol/<symbol>` - Get current symbol data
- `GET /api/chart/<symbol>/<timeframe>` - Get chart data
- `GET /api/search?q=<query>` - Search symbols
- `GET /api/popular` - Get popular symbols

### Watchlist Management
- `GET /api/watchlists` - Get user watchlists
- `POST /api/watchlists` - Save watchlists
- `GET /api/watchlist/<id>/data` - Get watchlist symbol data

## Technologies Used

### Backend
- **Flask**: Python web framework
- **yfinance**: Yahoo Finance API wrapper
- **pandas**: Data manipulation and analysis
- **numpy**: Numerical computing

### Frontend
- **HTML5**: Modern web markup
- **Tailwind CSS**: Utility-first CSS framework
- **JavaScript (ES6+)**: Modern JavaScript
- **Chart.js**: Interactive charts
- **Lucide Icons**: Beautiful icon library

### Data Sources
- **Yahoo Finance**: Real-time market data
- **Session Storage**: Watchlist persistence

## Usage Guide

### Creating Watchlists
1. Click the "+" button next to "Watchlists"
2. Enter a name for your watchlist
3. Click save to create

### Adding Symbols
1. Click the "+" button in the watchlist section
2. Search for symbols or browse popular symbols
3. Click on a symbol to add it to your active watchlist

### Viewing Charts
1. Click on any symbol in your watchlist
2. Select different timeframes using the timeframe buttons
3. Toggle RSI indicator on/off as needed

### Managing Watchlists
- Switch between watchlists using the tabs
- Rename watchlists by clicking the menu button
- Delete watchlists (minimum 1 required)
- Each watchlist supports up to 250 symbols

## Configuration

### Environment Variables
- `FLASK_ENV`: Set to 'development' or 'production'
- `FLASK_DEBUG`: Enable/disable debug mode
- `SECRET_KEY`: Secret key for session management
- `PORT`: Port number (default: 5000)

### Customization
- Modify `app.py` to add new API endpoints
- Update `static/js/app.js` for frontend functionality
- Customize styling in `static/css/style.css`
- Add new templates in the `templates/` directory

## Deployment

### Local Development
```bash
python run.py
```

### Production Deployment
1. Set environment variables:
   ```bash
   export FLASK_ENV=production
   export FLASK_DEBUG=False
   export SECRET_KEY=your-secure-secret-key
   ```

2. Use a production WSGI server:
   ```bash
   pip install gunicorn
   gunicorn -w 4 -b 0.0.0.0:5000 app:app
   ```

### Docker Deployment
```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 5000

CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "app:app"]
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the API endpoints

## Roadmap

### Upcoming Features
- [ ] Multi-chart view implementation
- [ ] More technical indicators (MACD, EMA, SMA)
- [ ] Price alerts and notifications
- [ ] Portfolio tracking
- [ ] Export functionality
- [ ] Dark mode theme
- [ ] Mobile app version

### Performance Improvements
- [ ] Data caching
- [ ] WebSocket real-time updates
- [ ] Database integration
- [ ] API rate limiting