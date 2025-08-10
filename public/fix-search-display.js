// Fix for search display issues
console.log('🔧 Search Display Fix Loaded');

// Ensure search results are visible after search
const originalSearchProducts = window.searchProducts;
window.searchProducts = async function() {
    console.log('🔧 FIX: Intercepting searchProducts');
    
    // Ensure we're on the search tab
    const searchTab = document.getElementById('search-tab');
    if (searchTab && !searchTab.classList.contains('active')) {
        console.log('🔧 FIX: search initiated, but staying on current tab');
    }
    
    // Ensure search results container is visible
    const searchResults = document.getElementById('searchResults');
    if (searchResults) {
        searchResults.style.display = 'block';
        // Remove any hiding classes
        searchResults.classList.remove('hidden', 'd-none', 'hide');
    }
    
    // Call original function
    const result = await originalSearchProducts.apply(this, arguments);
    
    // Force visibility after search completes
    setTimeout(() => {
        const resultsHeader = document.getElementById('searchResultsHeader');
        const searchResults = document.getElementById('searchResults');
        const noResultsState = document.getElementById('noResultsState');
        
        // Make sure something is visible
        if (currentProducts && currentProducts.length > 0) {
            if (resultsHeader) resultsHeader.style.display = 'block';
            if (searchResults) searchResults.style.display = 'block';
            if (noResultsState) noResultsState.style.display = 'none';
            console.log('🔧 FIX: Forced results visibility');
        } else {
            if (resultsHeader) resultsHeader.style.display = 'none';
            if (searchResults) searchResults.style.display = 'none';
            if (noResultsState) noResultsState.style.display = 'block';
            console.log('🔧 FIX: Showing no results state');
        }
    }, 100);
    
    return result;
};

// Auto-select first store if none selected
window.addEventListener('load', async () => {
    setTimeout(async () => {
        if (!selectedStoreId) {
            console.log('🔧 FIX: No store selected, finding stores...');
            
            try {
                const response = await fetch('/api/stores/nearby?zipCode=43123&radius=10');
                const stores = await response.json();
                
                if (stores && stores.length > 0) {
                    selectedStoreId = stores[0].locationId;
                    selectedStoreName = stores[0].name;
                    
                    // Update UI
                    const currentStoreEl = document.getElementById('currentStore');
                    if (currentStoreEl) {
                        currentStoreEl.textContent = selectedStoreName;
                    }
                    
                    console.log('🔧 FIX: Auto-selected store:', selectedStoreName, selectedStoreId);
                    // Quiet success without toast spam
                    // showToast('Store Selected', `Using ${selectedStoreName} for searches`, 'info');
                }
            } catch (error) {
                console.error('🔧 FIX: Failed to auto-select store:', error);
            }
        }
    }, 1000);
});

console.log('🔧 Search Display Fix Active');
console.log('🔧 Try searching now - results should be visible');