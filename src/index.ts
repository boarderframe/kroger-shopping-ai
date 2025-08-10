import { config, validateConfig } from './config';
import { KrogerApi } from './api';

async function main() {
  try {
    validateConfig();
    
    const krogerApi = new KrogerApi();
    
    console.log('Kroger Shopping AI Assistant initialized successfully!');
    console.log('API Base URL:', config.kroger.apiBaseUrl);
    
    // Example: Get all Kroger chains
    console.log('\nFetching Kroger chains...');
    const chains = await krogerApi.locations.getChains();
    console.log(`Found ${chains.length} Kroger chains`);
    
    // Example: Search for locations by ZIP code
    if (config.defaults.zipCode) {
      console.log(`\nSearching for locations near ${config.defaults.zipCode}...`);
      const locations = await krogerApi.locations.searchByZipCode(
        config.defaults.zipCode,
        10,
        5
      );
      console.log(`Found ${locations.length} locations`);
      
      if (locations.length > 0) {
        const firstLocation = locations[0];
        console.log(`\nClosest location: ${firstLocation.name}`);
        console.log(`Address: ${firstLocation.address.addressLine1}, ${firstLocation.address.city}, ${firstLocation.address.state} ${firstLocation.address.zipCode}`);
        
        // Example: Search for products at this location
        console.log(`\nSearching for milk products at location ${firstLocation.locationId}...`);
        const products = await krogerApi.products.searchByTerm(
          'milk',
          firstLocation.locationId,
          5
        );
        console.log(`Found ${products.length} milk products`);
        
        products.forEach((product, index) => {
          console.log(`${index + 1}. ${product.description} - ${product.brand}`);
          if (product.items?.[0]?.price?.regular) {
            console.log(`   Price: $${product.items[0].price.regular}`);
          }
        });
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}