// Direct test of the search functionality
const axios = require('axios');

async function testSearch() {
    console.log('Testing Kroger Shopping AI Search...\n');
    
    // Test 1: Check if server is running
    try {
        console.log('1. Testing server connection...');
        const serverCheck = await axios.get('http://localhost:3000/api/stores/nearby?zipCode=43123');
        console.log('✓ Server is running\n');
    } catch (error) {
        console.log('✗ Server is not running on port 3000');
        console.log('Error:', error.message);
        return;
    }
    
    // Test 2: Find stores
    try {
        console.log('2. Finding stores near ZIP 43123...');
        const storesResponse = await axios.get('http://localhost:3000/api/stores/nearby?zipCode=43123&radius=10');
        const stores = storesResponse.data;
        console.log(`✓ Found ${stores.length} stores`);
        
        if (stores.length > 0) {
            const firstStore = stores[0];
            console.log(`   First store: ${firstStore.name} (ID: ${firstStore.locationId})\n`);
            
            // Test 3: Search for products
            const storeId = firstStore.locationId;
            const searchTerm = 'milk';
            
            console.log(`3. Searching for "${searchTerm}" at store ${storeId}...`);
            
            try {
                const searchUrl = `http://localhost:3000/api/products/search?term=${searchTerm}&locationId=${storeId}&limit=5`;
                console.log(`   URL: ${searchUrl}`);
                
                const searchResponse = await axios.get(searchUrl);
                const products = searchResponse.data;
                
                console.log(`✓ Found ${products.length} products`);
                
                if (products.length > 0) {
                    console.log('\nFirst product:');
                    console.log(JSON.stringify(products[0], null, 2));
                } else {
                    console.log('✗ No products returned');
                }
            } catch (searchError) {
                console.log('✗ Search failed');
                console.log('Status:', searchError.response?.status);
                console.log('Error:', searchError.response?.data || searchError.message);
                
                // Log full error details
                if (searchError.response) {
                    console.log('\nFull error response:');
                    console.log(JSON.stringify(searchError.response.data, null, 2));
                }
            }
        }
    } catch (error) {
        console.log('✗ Failed to find stores');
        console.log('Error:', error.message);
    }
}

// Run the test
testSearch().catch(console.error);