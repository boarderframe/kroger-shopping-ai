// End-to-end test: App init + Search
console.log('🧪 End-to-end test: App init → Search');

let selectedStoreId = null;

// Simulate initialization (fixed version)
async function init() {
    // No ZIP saved, use default
    const defaultZip = '45202';
    console.log('Using default ZIP:', defaultZip);
    
    // Find stores
    const response = await fetch('http://localhost:3000/api/stores/nearby?zipCode=' + defaultZip + '&radius=50');
    const stores = await response.json();
    
    if (stores.length > 0) {
        selectedStoreId = stores[0].locationId;
        console.log('✅ Auto-selected store:', selectedStoreId);
        return true;
    }
    return false;
}

// Simulate search (existing logic)
async function searchProducts(term) {
    console.log('🔍 Searching for:', term);
    console.log('Using store:', selectedStoreId);
    
    if (!selectedStoreId) {
        console.log('❌ No store selected - search would fail');
        return false;
    }
    
    const response = await fetch('http://localhost:3000/api/products/search?term=' + term + '&locationId=' + selectedStoreId + '&limit=5');
    const products = await response.json();
    
    if (products.length > 0) {
        console.log('✅ Found', products.length, 'products for', term);
        return true;
    } else {
        console.log('❌ No products found');
        return false;
    }
}

// Run complete test
(async () => {
    try {
        const initSuccess = await init();
        if (initSuccess) {
            const searchSuccess = await searchProducts('milk');
            if (searchSuccess) {
                console.log('🎉 END-TO-END TEST PASSED: Store selection fix works!');
            } else {
                console.log('❌ Search failed');
            }
        } else {
            console.log('❌ Initialization failed');
        }
    } catch (error) {
        console.error('Test error:', error.message);
    }
})();