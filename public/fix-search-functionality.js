// Fix Search Functionality - Comprehensive Solution
// This file fixes all search-related issues in the Kroger Shopping AI

(function() {
    console.log('🔧 Search Functionality Fix Loading...');
    
    // Configuration
    const DEFAULT_ZIP = '45202'; // Cincinnati, OH - central location
    const SEARCH_DEBOUNCE_DELAY = 300;
    
    // Fix 1: Auto-store selection on page load
    async function autoSelectStore() {
        console.log('🏪 Auto-selecting store...');
        
        // Check if store already selected
        if (window.selectedStoreId) {
            console.log('✅ Store already selected:', window.selectedStoreName);
            return true;
        }
        
        // Try to load from localStorage
        const savedStoreId = localStorage.getItem('selectedStoreId');
        const savedStoreName = localStorage.getItem('selectedStoreName');
        
        if (savedStoreId && savedStoreName) {
            window.selectedStoreId = savedStoreId;
            window.selectedStoreName = savedStoreName;
            updateStoreDisplay();
            console.log('✅ Loaded saved store:', savedStoreName);
            return true;
        }
        
        // Auto-find stores with default or saved ZIP
        const zipInput = document.getElementById('zipCode');
        let zipCode = zipInput?.value || localStorage.getItem('lastZipCode') || DEFAULT_ZIP;
        
        if (zipInput && zipCode !== zipInput.value) {
            zipInput.value = zipCode;
        }
        
        try {
            const response = await fetch(`/api/stores/search?zip=${zipCode}`);
            if (!response.ok) throw new Error('Failed to fetch stores');
            
            const data = await response.json();
            const stores = data.data || [];
            
            if (stores.length > 0) {
                // Select first store automatically
                const firstStore = stores[0];
                window.selectedStoreId = firstStore.locationId;
                window.selectedStoreName = firstStore.name || `Store #${firstStore.locationId}`;
                
                // Save to localStorage
                localStorage.setItem('selectedStoreId', window.selectedStoreId);
                localStorage.setItem('selectedStoreName', window.selectedStoreName);
                localStorage.setItem('lastZipCode', zipCode);
                
                updateStoreDisplay();
                updateStoreDropdown(stores);
                
                console.log('✅ Auto-selected store:', window.selectedStoreName);
                return true;
            }
        } catch (error) {
            console.error('❌ Auto-store selection failed:', error);
        }
        
        return false;
    }
    
    // Fix 2: Ensure search results are properly displayed
    function fixSearchResultsDisplay() {
        const searchResults = document.getElementById('searchResults');
        const tableResults = document.getElementById('tableResults');
        const searchHeader = document.getElementById('searchResultsHeader');
        const noResultsState = document.getElementById('noResultsState');
        
        // Ensure containers exist and are visible when needed
        if (searchResults) {
            searchResults.style.display = 'grid';
            searchResults.style.visibility = 'visible';
            searchResults.style.opacity = '1';
        }
        
        if (tableResults) {
            // Table view is hidden by default
            tableResults.style.display = 'none';
        }
        
        // Fix any CSS issues that might hide results
        const style = document.createElement('style');
        style.textContent = `
            #searchResults {
                display: grid !important;
                visibility: visible !important;
                opacity: 1 !important;
                min-height: 100px;
            }
            #searchResults:not(:empty) {
                padding: 20px;
            }
            .product-card {
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Fix 3: Improved error handling
    function setupImprovedErrorHandling() {
        // Override the original searchProducts function
        const originalSearchProducts = window.searchProducts;
        
        window.searchProducts = async function() {
            console.log('🔍 Enhanced searchProducts called');
            
            // Ensure store is selected
            if (!window.selectedStoreId) {
                const storeSelected = await autoSelectStore();
                if (!storeSelected) {
                    // Quiet mode: keep UI hint, no toast spam
                    // showToast('Store Required', 'Please select a store to search products', 'warning');
                    showTab('settings');
                    return;
                }
            }
            
            const searchTerm = document.getElementById('searchTerm')?.value?.trim();
            if (!searchTerm) {
                // Quiet mode
                // showToast('Search Term Required', 'Please enter a product to search', 'info');
                return;
            }
            
            // Show loading state
            showLoadingState();
            
            try {
                // Call original function if it exists
                if (originalSearchProducts) {
                    await originalSearchProducts.call(this);
                } else {
                    // Fallback implementation
                    await performSearch(searchTerm);
                }
                
                // Ensure results are visible
                fixSearchResultsDisplay();
                
            } catch (error) {
                console.error('❌ Search error:', error);
                hideLoadingState();
                showSearchError(error.message);
            }
        };
    }
    
    // Fix 4: Add proper loading states
    function showLoadingState() {
        const searchBtn = document.querySelector('.search-btn');
        const searchResults = document.getElementById('searchResults');
        const searchHeader = document.getElementById('searchResultsHeader');
        const noResultsState = document.getElementById('noResultsState');
        
        if (searchBtn) {
            searchBtn.disabled = true;
            searchBtn.innerHTML = '<span class="spinner"></span> Searching...';
        }
        
        if (searchResults) {
            searchResults.innerHTML = createLoadingSkeleton();
        }
        
        if (searchHeader) searchHeader.style.display = 'none';
        if (noResultsState) noResultsState.style.display = 'none';
    }
    
    function hideLoadingState() {
        const searchBtn = document.querySelector('.search-btn');
        
        if (searchBtn) {
            searchBtn.disabled = false;
            searchBtn.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                </svg>
                <span>Search</span>
            `;
        }
    }
    
    function createLoadingSkeleton() {
        return `
            <div class="skeleton-container">
                ${Array(8).fill('').map(() => `
                    <div class="skeleton-card">
                        <div class="skeleton skeleton-image"></div>
                        <div class="skeleton skeleton-text"></div>
                        <div class="skeleton skeleton-text short"></div>
                        <div class="skeleton skeleton-price"></div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    // Fix 5: Persist store selection
    function setupStorePersistence() {
        // Save store selection whenever it changes
        const originalSelectStore = window.selectStore;
        window.selectStore = function() {
            if (originalSelectStore) {
                originalSelectStore.call(this);
            }
            
            // Save to localStorage
            if (window.selectedStoreId && window.selectedStoreName) {
                localStorage.setItem('selectedStoreId', window.selectedStoreId);
                localStorage.setItem('selectedStoreName', window.selectedStoreName);
                console.log('💾 Saved store selection:', window.selectedStoreName);
            }
        };
    }
    
    // Helper functions
    function updateStoreDisplay() {
        const currentStoreElem = document.getElementById('currentStore');
        const selectedStoreCard = document.getElementById('selectedStore');
        
        if (currentStoreElem) {
            currentStoreElem.textContent = window.selectedStoreName || 'None';
        }
        
        if (selectedStoreCard && window.selectedStoreId) {
            const storeName = selectedStoreCard.querySelector('.store-name');
            if (storeName) {
                storeName.textContent = window.selectedStoreName;
            }
            selectedStoreCard.style.display = 'block';
        }
    }
    
    function updateStoreDropdown(stores) {
        const storeList = document.getElementById('storeList');
        if (!storeList) return;
        
        storeList.innerHTML = '';
        stores.forEach(store => {
            const option = document.createElement('option');
            option.value = store.locationId;
            option.dataset.storeName = store.name || `Store #${store.locationId}`;
            option.dataset.storeAddress = store.address?.addressLine1 || 'Address not available';
            option.textContent = `${store.name || `Store #${store.locationId}`} - ${store.address?.addressLine1 || ''}`;
            
            if (store.locationId === window.selectedStoreId) {
                option.selected = true;
            }
            
            storeList.appendChild(option);
        });
    }
    
    function showSearchError(message) {
        const searchResults = document.getElementById('searchResults');
        const noResultsState = document.getElementById('noResultsState');
        const searchHeader = document.getElementById('searchResultsHeader');
        
        hideLoadingState();
        
        if (searchHeader) searchHeader.style.display = 'none';
        
        if (searchResults) {
            searchResults.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">❌</div>
                    <h3>Search Error</h3>
                    <p>${message || 'Failed to search products. Please try again.'}</p>
                    <button onclick="searchProducts()" class="retry-btn">
                        Try Again
                    </button>
                </div>
            `;
        }
    }
    
    async function performSearch(searchTerm) {
        const apiUrl = `/api/products/search?term=${encodeURIComponent(searchTerm)}&locationId=${window.selectedStoreId}&limit=50`;
        
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error('Search request failed');
        }
        
        const data = await response.json();
        const products = data.data || [];
        
        // Update global state
        window.currentProducts = products;
        window.allProducts = [...products];
        
        // Display results
        if (window.displaySearchResults) {
            window.displaySearchResults(products, searchTerm);
        }
        if (window.displayProducts) {
            window.displayProducts(products);
        }
        
        hideLoadingState();
    }
    
    // Initialize fixes when DOM is ready
    function initializeFixes() {
        console.log('🚀 Initializing search functionality fixes...');
        
        // Apply all fixes
        fixSearchResultsDisplay();
        setupImprovedErrorHandling();
        setupStorePersistence();
        
        // Auto-select store on load
        autoSelectStore().then(success => {
            if (success) {
                console.log('✅ Store auto-selection complete');
            } else {
                console.log('⚠️ No store auto-selected, user needs to select one');
            }
        });
        
        // Add CSS for loading states
        const style = document.createElement('style');
        style.textContent = `
            .spinner {
                display: inline-block;
                width: 14px;
                height: 14px;
                border: 2px solid #f3f3f3;
                border-top: 2px solid #0066cc;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .skeleton-container {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                gap: 20px;
                padding: 20px;
            }
            
            .skeleton-card {
                background: #fff;
                border-radius: 8px;
                padding: 16px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .skeleton {
                background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                background-size: 200% 100%;
                animation: loading 1.5s infinite;
                border-radius: 4px;
            }
            
            .skeleton-image {
                height: 200px;
                margin-bottom: 12px;
            }
            
            .skeleton-text {
                height: 16px;
                margin-bottom: 8px;
            }
            
            .skeleton-text.short {
                width: 60%;
            }
            
            .skeleton-price {
                height: 24px;
                width: 80px;
                margin-top: 12px;
            }
            
            @keyframes loading {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }
            
            .error-state {
                text-align: center;
                padding: 60px 20px;
                grid-column: 1 / -1;
            }
            
            .error-icon {
                font-size: 60px;
                margin-bottom: 20px;
            }
            
            .retry-btn {
                background: #0066cc;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 16px;
                margin-top: 20px;
            }
            
            .retry-btn:hover {
                background: #0052a3;
            }
        `;
        document.head.appendChild(style);
        
        console.log('✅ Search functionality fixes applied');
    }
    
    // Wait for DOM and other scripts to load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeFixes);
    } else {
        // DOM already loaded, wait a bit for other scripts
        setTimeout(initializeFixes, 100);
    }
    
    // Also hook into window.onload to ensure we run after app.js
    const originalOnload = window.onload;
    window.onload = function() {
        if (originalOnload) {
            originalOnload.call(this);
        }
        setTimeout(initializeFixes, 200);
    };
    
})();