class TradingApp {
    constructor() {
        this.selectedSymbol = 'AAPL';
        this.selectedTimeframe = '1h';
        this.watchlists = [];
        this.activeWatchlistId = '';
        this.viewMode = 'single';
        this.showRSI = true;
        this.priceChart = null;
        this.rsiChart = null;
        this.refreshInterval = null;
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadWatchlists();
        await this.loadSymbolData();
        await this.loadChartData();
        this.startAutoRefresh();
        
        // Initialize Lucide icons
        lucide.createIcons();
    }

    setupEventListeners() {
        // View mode buttons
        document.getElementById('singleChartBtn').addEventListener('click', () => this.setViewMode('single'));
        document.getElementById('multiChartBtn').addEventListener('click', () => this.setViewMode('multi'));

        // Watchlist management
        document.getElementById('createWatchlistBtn').addEventListener('click', () => this.showCreateWatchlistForm());
        document.getElementById('saveWatchlistBtn').addEventListener('click', () => this.createWatchlist());
        document.getElementById('cancelWatchlistBtn').addEventListener('click', () => this.hideCreateWatchlistForm());
        document.getElementById('newWatchlistName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.createWatchlist();
        });

        // Search and popular symbols
        document.getElementById('searchBtn').addEventListener('click', () => this.toggleSearch());
        document.getElementById('popularBtn').addEventListener('click', () => this.togglePopular());
        document.getElementById('searchInput').addEventListener('input', (e) => this.handleSearch(e.target.value));

        // Chart controls
        document.getElementById('refreshBtn').addEventListener('click', () => this.refreshData());
        document.getElementById('showRSI').addEventListener('change', (e) => {
            this.showRSI = e.target.checked;
            this.updateRSIVisibility();
        });

        // Timeframe selector
        document.querySelectorAll('.timeframe-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.setTimeframe(e.target.dataset.timeframe));
        });
    }

    async loadWatchlists() {
        try {
            const response = await fetch('/api/watchlists');
            this.watchlists = await response.json();
            
            if (this.watchlists.length === 0) {
                // Create default watchlist
                const defaultWatchlist = {
                    id: 'default',
                    name: 'My Watchlist',
                    symbols: ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'RELIANCE.NS', 'TCS.NS'],
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                };
                this.watchlists = [defaultWatchlist];
                await this.saveWatchlists();
            }
            
            this.activeWatchlistId = this.watchlists[0].id;
            this.renderWatchlistTabs();
            await this.loadWatchlistData();
        } catch (error) {
            console.error('Error loading watchlists:', error);
        }
    }

    async saveWatchlists() {
        try {
            await fetch('/api/watchlists', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.watchlists)
            });
        } catch (error) {
            console.error('Error saving watchlists:', error);
        }
    }

    renderWatchlistTabs() {
        const container = document.getElementById('watchlistTabs');
        container.innerHTML = '';
        
        this.watchlists.forEach(watchlist => {
            const tab = document.createElement('button');
            tab.className = `watchlist-tab px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center space-x-2 ${
                this.activeWatchlistId === watchlist.id 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`;
            tab.innerHTML = `
                <span class="truncate max-w-20">${watchlist.name}</span>
                <span class="text-xs opacity-75">(${watchlist.symbols.length})</span>
            `;
            tab.addEventListener('click', () => this.setActiveWatchlist(watchlist.id));
            container.appendChild(tab);
        });
        
        this.updateSymbolCount();
    }

    async setActiveWatchlist(watchlistId) {
        this.activeWatchlistId = watchlistId;
        this.renderWatchlistTabs();
        await this.loadWatchlistData();
    }

    async loadWatchlistData() {
        const container = document.getElementById('watchlistContent');
        container.innerHTML = '<div class="p-4 text-center text-gray-500">Loading watchlist...</div>';
        
        try {
            const response = await fetch(`/api/watchlist/${this.activeWatchlistId}/data`);
            const data = await response.json();
            
            if (data.symbolData && data.symbolData.length > 0) {
                this.renderWatchlistSymbols(data.symbolData);
            } else {
                container.innerHTML = `
                    <div class="p-4 text-center text-gray-500">
                        <div class="mb-2">This watchlist is empty</div>
                        <div class="text-sm">Click the + button to add symbols</div>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading watchlist data:', error);
            container.innerHTML = '<div class="p-4 text-center text-red-500">Error loading watchlist</div>';
        }
    }

    renderWatchlistSymbols(symbols) {
        const container = document.getElementById('watchlistContent');
        container.innerHTML = '';
        
        symbols.forEach(symbol => {
            const item = document.createElement('div');
            item.className = `symbol-item group p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                this.selectedSymbol === symbol.symbol ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
            }`;
            
            const changeColor = symbol.change >= 0 ? 'text-green-600' : 'text-red-600';
            const changeIcon = symbol.change >= 0 ? 'trending-up' : 'trending-down';
            
            item.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="flex-1">
                        <div class="flex items-center justify-between mb-1">
                            <div class="flex items-center space-x-2">
                                <span class="font-semibold text-gray-900">${symbol.symbol}</span>
                                ${symbol.symbol.includes('.NS') ? '<span class="text-xs bg-orange-100 text-orange-600 px-1 rounded">NSE</span>' : ''}
                                ${symbol.symbol.includes('-USD') ? '<span class="text-xs bg-yellow-100 text-yellow-600 px-1 rounded">CRYPTO</span>' : ''}
                            </div>
                            <button class="remove-symbol p-1 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100 transition-opacity" data-symbol="${symbol.symbol}">
                                <i data-lucide="x" class="w-3 h-3"></i>
                            </button>
                        </div>
                        <div class="text-sm text-gray-500 mb-2 truncate">${symbol.name}</div>
                        <div class="flex items-center justify-between">
                            <span class="font-bold text-lg">$${symbol.price.toFixed(2)}</span>
                            <div class="flex items-center space-x-1 text-sm ${changeColor}">
                                <i data-lucide="${changeIcon}" class="w-4 h-4"></i>
                                <span>${symbol.change >= 0 ? '+' : ''}${symbol.change.toFixed(2)}</span>
                                <span>(${symbol.changePercent >= 0 ? '+' : ''}${symbol.changePercent.toFixed(2)}%)</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.remove-symbol')) {
                    this.selectSymbol(symbol.symbol);
                }
            });
            
            const removeBtn = item.querySelector('.remove-symbol');
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeFromWatchlist(symbol.symbol);
            });
            
            container.appendChild(item);
        });
        
        // Re-initialize Lucide icons for new elements
        lucide.createIcons();
    }

    async selectSymbol(symbol) {
        this.selectedSymbol = symbol;
        this.renderWatchlistSymbols(await this.getCurrentWatchlistData());
        await this.loadSymbolData();
        await this.loadChartData();
    }

    async getCurrentWatchlistData() {
        try {
            const response = await fetch(`/api/watchlist/${this.activeWatchlistId}/data`);
            const data = await response.json();
            return data.symbolData || [];
        } catch (error) {
            console.error('Error getting current watchlist data:', error);
            return [];
        }
    }

    async loadSymbolData() {
        try {
            const response = await fetch(`/api/symbol/${this.selectedSymbol}`);
            const data = await response.json();
            
            document.getElementById('chartSymbol').textContent = data.symbol;
            document.getElementById('currentPrice').textContent = `$${data.price.toFixed(2)}`;
            document.getElementById('symbolName').textContent = data.name !== data.symbol ? data.name : '';
            
            const changeElement = document.getElementById('priceChange');
            const changeColor = data.change >= 0 ? 'text-green-600' : 'text-red-600';
            const changeIcon = data.change >= 0 ? 'trending-up' : 'trending-down';
            
            changeElement.className = `flex items-center space-x-1 ${changeColor}`;
            changeElement.innerHTML = `
                <i data-lucide="${changeIcon}" class="w-4 h-4"></i>
                <span class="font-medium">${data.change >= 0 ? '+' : ''}${data.change.toFixed(2)} (${data.changePercent >= 0 ? '+' : ''}${data.changePercent.toFixed(2)}%)</span>
            `;
            
            lucide.createIcons();
        } catch (error) {
            console.error('Error loading symbol data:', error);
        }
    }

    async loadChartData() {
        this.showLoading(true);
        
        try {
            const response = await fetch(`/api/chart/${this.selectedSymbol}/${this.selectedTimeframe}`);
            const data = await response.json();
            
            if (data.candles && data.candles.length > 0) {
                this.renderChart(data);
            }
        } catch (error) {
            console.error('Error loading chart data:', error);
        } finally {
            this.showLoading(false);
        }
    }

    renderChart(data) {
        const ctx = document.getElementById('priceChart').getContext('2d');
        const rsiCtx = document.getElementById('rsiChart').getContext('2d');
        
        // Destroy existing charts
        if (this.priceChart) this.priceChart.destroy();
        if (this.rsiChart) this.rsiChart.destroy();
        
        // Prepare data
        const labels = data.candles.map(candle => new Date(candle.timestamp).toLocaleTimeString());
        const prices = data.candles.map(candle => candle.close);
        const rsiValues = data.rsi.map(rsi => rsi.value);
        
        // Price chart
        this.priceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: this.selectedSymbol,
                    data: prices,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        display: true,
                        grid: {
                            color: '#f5f5f5'
                        }
                    },
                    y: {
                        display: true,
                        grid: {
                            color: '#f5f5f5'
                        },
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toFixed(2);
                            }
                        }
                    }
                }
            }
        });
        
        // RSI chart
        if (this.showRSI) {
            this.rsiChart = new Chart(rsiCtx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'RSI',
                        data: rsiValues,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        x: {
                            display: false
                        },
                        y: {
                            min: 0,
                            max: 100,
                            grid: {
                                color: '#f5f5f5'
                            },
                            ticks: {
                                stepSize: 20
                            }
                        }
                    }
                }
            });
        }
    }

    setViewMode(mode) {
        this.viewMode = mode;
        
        // Update buttons
        document.getElementById('singleChartBtn').className = mode === 'single' 
            ? 'px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center space-x-2 bg-white text-gray-900 shadow-sm'
            : 'px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center space-x-2 text-gray-500 hover:text-gray-700';
            
        document.getElementById('multiChartBtn').className = mode === 'multi'
            ? 'px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center space-x-2 bg-white text-gray-900 shadow-sm'
            : 'px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center space-x-2 text-gray-500 hover:text-gray-700';
        
        // Show/hide views
        document.getElementById('singleChartView').style.display = mode === 'single' ? 'flex' : 'none';
        document.getElementById('multiChartView').style.display = mode === 'multi' ? 'block' : 'none';
    }

    setTimeframe(timeframe) {
        this.selectedTimeframe = timeframe;
        
        // Update buttons
        document.querySelectorAll('.timeframe-btn').forEach(btn => {
            btn.className = btn.dataset.timeframe === timeframe
                ? 'timeframe-btn px-3 py-1.5 text-sm font-medium rounded-lg transition-colors bg-blue-500 text-white'
                : 'timeframe-btn px-3 py-1.5 text-sm font-medium rounded-lg transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200';
        });
        
        this.loadChartData();
    }

    updateRSIVisibility() {
        const container = document.getElementById('rsiContainer');
        container.style.display = this.showRSI ? 'block' : 'none';
        
        if (this.showRSI && this.rsiChart) {
            this.loadChartData(); // Reload to show RSI
        }
    }

    showCreateWatchlistForm() {
        document.getElementById('createWatchlistForm').classList.remove('hidden');
        document.getElementById('newWatchlistName').focus();
    }

    hideCreateWatchlistForm() {
        document.getElementById('createWatchlistForm').classList.add('hidden');
        document.getElementById('newWatchlistName').value = '';
    }

    async createWatchlist() {
        const name = document.getElementById('newWatchlistName').value.trim();
        if (!name) return;
        
        const newWatchlist = {
            id: Date.now().toString(),
            name: name,
            symbols: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        
        this.watchlists.push(newWatchlist);
        this.activeWatchlistId = newWatchlist.id;
        
        await this.saveWatchlists();
        this.renderWatchlistTabs();
        await this.loadWatchlistData();
        this.hideCreateWatchlistForm();
    }

    toggleSearch() {
        const container = document.getElementById('searchContainer');
        const isHidden = container.classList.contains('hidden');
        
        container.classList.toggle('hidden', !isHidden);
        document.getElementById('popularSymbols').classList.add('hidden');
        
        if (!isHidden) {
            document.getElementById('searchInput').focus();
        }
        
        // Update button icon
        const btn = document.getElementById('searchBtn');
        btn.innerHTML = isHidden 
            ? '<i data-lucide="x" class="w-4 h-4"></i>'
            : '<i data-lucide="plus" class="w-4 h-4"></i>';
        
        lucide.createIcons();
    }

    async togglePopular() {
        const container = document.getElementById('popularSymbols');
        const isHidden = container.classList.contains('hidden');
        
        container.classList.toggle('hidden', !isHidden);
        document.getElementById('searchContainer').classList.add('hidden');
        
        if (!isHidden) {
            await this.loadPopularSymbols();
        }
    }

    async loadPopularSymbols() {
        try {
            const response = await fetch('/api/popular');
            const data = await response.json();
            
            const usContainer = document.getElementById('usSymbols');
            const indianContainer = document.getElementById('indianSymbols');
            
            usContainer.innerHTML = '';
            indianContainer.innerHTML = '';
            
            data.US.forEach(symbol => {
                const btn = document.createElement('button');
                btn.className = 'px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors';
                btn.textContent = symbol;
                btn.addEventListener('click', () => this.addToWatchlist(symbol));
                usContainer.appendChild(btn);
            });
            
            data.INDIAN.forEach(symbol => {
                const btn = document.createElement('button');
                btn.className = 'px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition-colors';
                btn.textContent = symbol.replace('.NS', '');
                btn.addEventListener('click', () => this.addToWatchlist(symbol));
                indianContainer.appendChild(btn);
            });
        } catch (error) {
            console.error('Error loading popular symbols:', error);
        }
    }

    async handleSearch(query) {
        if (query.length < 2) {
            document.getElementById('searchResults').classList.add('hidden');
            return;
        }
        
        try {
            const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
            const results = await response.json();
            
            const container = document.getElementById('searchResults');
            container.innerHTML = '';
            
            if (results.length > 0) {
                results.forEach(symbol => {
                    const item = document.createElement('button');
                    item.className = 'w-full px-4 py-3 hover:bg-gray-50 flex items-center justify-between text-left';
                    item.innerHTML = `
                        <div>
                            <div class="font-medium text-gray-900">${symbol.symbol}</div>
                            <div class="text-sm text-gray-500 truncate">${symbol.name}</div>
                        </div>
                        <i data-lucide="plus" class="w-4 h-4 text-gray-400"></i>
                    `;
                    item.addEventListener('click', () => this.addToWatchlist(symbol.symbol));
                    container.appendChild(item);
                });
                container.classList.remove('hidden');
                lucide.createIcons();
            } else {
                container.innerHTML = `
                    <div class="p-4 text-center text-gray-500">
                        No results found. Try searching for:
                        <div class="mt-2 text-xs">
                            <div>• US stocks: AAPL, GOOGL, MSFT</div>
                            <div>• Indian stocks: RELIANCE.NS, TCS.NS</div>
                            <div>• Crypto: BTC-USD, ETH-USD</div>
                        </div>
                    </div>
                `;
                container.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Error searching symbols:', error);
        }
    }

    async addToWatchlist(symbol) {
        const activeWatchlist = this.watchlists.find(w => w.id === this.activeWatchlistId);
        if (!activeWatchlist || activeWatchlist.symbols.includes(symbol)) return;
        
        if (activeWatchlist.symbols.length >= 250) {
            alert('Watchlist is full (250 symbols maximum)');
            return;
        }
        
        activeWatchlist.symbols.push(symbol);
        activeWatchlist.updatedAt = Date.now();
        
        await this.saveWatchlists();
        this.renderWatchlistTabs();
        await this.loadWatchlistData();
        
        // Hide search/popular
        document.getElementById('searchContainer').classList.add('hidden');
        document.getElementById('popularSymbols').classList.add('hidden');
        document.getElementById('searchInput').value = '';
    }

    async removeFromWatchlist(symbol) {
        const activeWatchlist = this.watchlists.find(w => w.id === this.activeWatchlistId);
        if (!activeWatchlist) return;
        
        activeWatchlist.symbols = activeWatchlist.symbols.filter(s => s !== symbol);
        activeWatchlist.updatedAt = Date.now();
        
        await this.saveWatchlists();
        this.renderWatchlistTabs();
        await this.loadWatchlistData();
    }

    updateSymbolCount() {
        const activeWatchlist = this.watchlists.find(w => w.id === this.activeWatchlistId);
        if (activeWatchlist) {
            document.getElementById('symbolCount').textContent = `${activeWatchlist.symbols.length}/250 symbols`;
        }
    }

    showLoading(show) {
        document.getElementById('loadingIndicator').classList.toggle('hidden', !show);
    }

    async refreshData() {
        await this.loadSymbolData();
        await this.loadChartData();
        await this.loadWatchlistData();
    }

    startAutoRefresh() {
        // Refresh every 30 seconds
        this.refreshInterval = setInterval(() => {
            this.loadWatchlistData();
        }, 30000);
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TradingApp();
});