from flask import Flask, render_template, request, jsonify, session
import yfinance as yf
import pandas as pd
import numpy as np
import json
import uuid
from datetime import datetime, timedelta
import requests
from typing import Dict, List, Optional, Tuple
import os

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'your-secret-key-here')

class TradingPlatform:
    def __init__(self):
        self.popular_symbols = {
            'US': ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'NVDA', 'META', 'SPY', 'QQQ', 'BTC-USD', 'ETH-USD'],
            'INDIAN': ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'HINDUNILVR.NS', 'ITC.NS', 'SBIN.NS', 'BHARTIARTL.NS', 'KOTAKBANK.NS', 'LT.NS']
        }
        
    def format_symbol_for_yahoo(self, symbol: str) -> str:
        """Format symbol for Yahoo Finance API"""
        indian_exchanges = ['.NS', '.BO']
        
        if any(exchange in symbol for exchange in indian_exchanges):
            return symbol
            
        common_us_symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'NVDA', 'META', 'SPY']
        if symbol.upper() in common_us_symbols:
            return symbol
            
        if len(symbol) <= 10 and '.' not in symbol:
            return f"{symbol}.NS"
            
        return symbol

    def get_timeframe_period(self, timeframe: str) -> Tuple[str, str]:
        """Convert timeframe to Yahoo Finance interval and period"""
        interval_map = {
            '1m': ('1m', '1d'),
            '5m': ('5m', '5d'),
            '15m': ('15m', '5d'),
            '1h': ('1h', '1mo'),
            '4h': ('1h', '3mo'),
            '1d': ('1d', '1y'),
            '2d': ('1d', '2y'),
            '3d': ('1d', '2y'),
            '1w': ('1wk', '2y'),
            '2w': ('1wk', '5y'),
            '3w': ('1wk', '5y'),
            '1M': ('1mo', '5y'),
            '2M': ('1mo', '10y'),
            '3M': ('1mo', '10y'),
            '6M': ('1mo', 'max'),
            '1Y': ('1mo', 'max')
        }
        return interval_map.get(timeframe, ('1d', '1y'))

    def calculate_rsi(self, prices: List[float], period: int = 14) -> List[float]:
        """Calculate RSI indicator"""
        if len(prices) < period + 1:
            return [50.0] * len(prices)
            
        deltas = np.diff(prices)
        gains = np.where(deltas > 0, deltas, 0)
        losses = np.where(deltas < 0, -deltas, 0)
        
        rsi_values = []
        for i in range(len(prices)):
            if i < period:
                rsi_values.append(50.0)
                continue
                
            avg_gain = np.mean(gains[max(0, i-period):i])
            avg_loss = np.mean(losses[max(0, i-period):i])
            
            if avg_loss == 0:
                rsi = 100.0
            else:
                rs = avg_gain / avg_loss
                rsi = 100 - (100 / (1 + rs))
                
            rsi_values.append(rsi)
            
        return rsi_values

    def calculate_sma(self, values: List[float], period: int) -> List[float]:
        """Calculate Simple Moving Average"""
        sma = []
        for i in range(len(values)):
            if i < period - 1:
                sma.append(values[i])
            else:
                avg = sum(values[i-period+1:i+1]) / period
                sma.append(avg)
        return sma

    def calculate_bollinger_bands(self, values: List[float], period: int = 20, multiplier: float = 2.0) -> Tuple[List[float], List[float]]:
        """Calculate Bollinger Bands"""
        sma = self.calculate_sma(values, period)
        upper, lower = [], []
        
        for i in range(len(values)):
            if i < period - 1:
                upper.append(values[i] + 10)
                lower.append(values[i] - 10)
            else:
                slice_values = values[i-period+1:i+1]
                mean = sma[i]
                variance = sum((x - mean) ** 2 for x in slice_values) / period
                std_dev = variance ** 0.5
                upper.append(mean + (multiplier * std_dev))
                lower.append(mean - (multiplier * std_dev))
                
        return upper, lower

    def fetch_symbol_data(self, symbol: str) -> Optional[Dict]:
        """Fetch current symbol data"""
        try:
            formatted_symbol = self.format_symbol_for_yahoo(symbol)
            ticker = yf.Ticker(formatted_symbol)
            info = ticker.info
            hist = ticker.history(period='2d')
            
            if hist.empty:
                return None
                
            current_price = hist['Close'].iloc[-1]
            previous_close = hist['Close'].iloc[-2] if len(hist) > 1 else current_price
            change = current_price - previous_close
            change_percent = (change / previous_close) * 100
            
            return {
                'symbol': symbol.upper(),
                'name': info.get('longName', symbol),
                'price': float(current_price),
                'change': float(change),
                'changePercent': float(change_percent)
            }
        except Exception as e:
            print(f"Error fetching data for {symbol}: {e}")
            return None

    def fetch_chart_data(self, symbol: str, timeframe: str) -> Optional[Dict]:
        """Fetch chart data with candlesticks and RSI"""
        try:
            formatted_symbol = self.format_symbol_for_yahoo(symbol)
            interval, period = self.get_timeframe_period(timeframe)
            
            ticker = yf.Ticker(formatted_symbol)
            hist = ticker.history(period=period, interval=interval)
            
            if hist.empty:
                return None
                
            candles = []
            for index, row in hist.iterrows():
                candles.append({
                    'timestamp': int(index.timestamp() * 1000),
                    'open': float(row['Open']),
                    'high': float(row['High']),
                    'low': float(row['Low']),
                    'close': float(row['Close']),
                    'volume': int(row['Volume'])
                })
            
            # Calculate RSI data
            close_prices = [c['close'] for c in candles]
            rsi_values = self.calculate_rsi(close_prices)
            rsi_ma = self.calculate_sma(rsi_values, 9)
            rsi_upper_bb, rsi_lower_bb = self.calculate_bollinger_bands(rsi_values, 20, 2)
            
            rsi_data = []
            for i, candle in enumerate(candles):
                rsi_data.append({
                    'timestamp': candle['timestamp'],
                    'value': rsi_values[i],
                    'ma': rsi_ma[i],
                    'upperBB': rsi_upper_bb[i],
                    'lowerBB': rsi_lower_bb[i]
                })
            
            return {
                'candles': candles,
                'rsi': rsi_data
            }
        except Exception as e:
            print(f"Error fetching chart data for {symbol}: {e}")
            return None

    def search_symbols(self, query: str) -> List[Dict]:
        """Search for symbols"""
        try:
            # Use yfinance's Ticker search functionality
            results = []
            
            # Try direct symbol lookup
            try:
                ticker = yf.Ticker(query.upper())
                info = ticker.info
                if info and 'symbol' in info:
                    results.append({
                        'symbol': info['symbol'],
                        'name': info.get('longName', info.get('shortName', query)),
                        'price': 0,
                        'change': 0,
                        'changePercent': 0
                    })
            except:
                pass
            
            # Try with .NS suffix for Indian stocks
            if not results and len(query) <= 10:
                try:
                    ticker = yf.Ticker(f"{query.upper()}.NS")
                    info = ticker.info
                    if info and 'symbol' in info:
                        results.append({
                            'symbol': info['symbol'],
                            'name': info.get('longName', info.get('shortName', query)),
                            'price': 0,
                            'change': 0,
                            'changePercent': 0
                        })
                except:
                    pass
            
            return results[:10]  # Limit to 10 results
        except Exception as e:
            print(f"Error searching symbols: {e}")
            return []

# Initialize trading platform
trading_platform = TradingPlatform()

@app.route('/')
def index():
    """Main page"""
    return render_template('index.html')

@app.route('/api/symbol/<symbol>')
def get_symbol_data(symbol):
    """Get symbol data"""
    data = trading_platform.fetch_symbol_data(symbol)
    if data:
        return jsonify(data)
    return jsonify({'error': 'Symbol not found'}), 404

@app.route('/api/chart/<symbol>/<timeframe>')
def get_chart_data(symbol, timeframe):
    """Get chart data"""
    data = trading_platform.fetch_chart_data(symbol, timeframe)
    if data:
        return jsonify(data)
    return jsonify({'error': 'Chart data not found'}), 404

@app.route('/api/search')
def search_symbols():
    """Search symbols"""
    query = request.args.get('q', '')
    if len(query) < 2:
        return jsonify([])
    
    results = trading_platform.search_symbols(query)
    return jsonify(results)

@app.route('/api/popular')
def get_popular_symbols():
    """Get popular symbols"""
    return jsonify(trading_platform.popular_symbols)

@app.route('/api/watchlists', methods=['GET'])
def get_watchlists():
    """Get user watchlists"""
    watchlists = session.get('watchlists', [])
    return jsonify(watchlists)

@app.route('/api/watchlists', methods=['POST'])
def save_watchlists():
    """Save user watchlists"""
    watchlists = request.json
    session['watchlists'] = watchlists
    return jsonify({'success': True})

@app.route('/api/watchlist/<watchlist_id>/data')
def get_watchlist_data(watchlist_id):
    """Get watchlist symbol data"""
    watchlists = session.get('watchlists', [])
    watchlist = next((w for w in watchlists if w['id'] == watchlist_id), None)
    
    if not watchlist:
        return jsonify({'error': 'Watchlist not found'}), 404
    
    symbol_data = []
    for symbol in watchlist['symbols']:
        data = trading_platform.fetch_symbol_data(symbol)
        if data:
            symbol_data.append(data)
    
    return jsonify({
        'watchlist': watchlist,
        'symbolData': symbol_data
    })

if __name__ == '__main__':
    app.run(debug=True)