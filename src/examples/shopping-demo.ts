import { config, validateConfig } from '../config';
import { KrogerApi } from '../api';
import { ShoppingAssistant } from '../services/shopping-assistant';

async function runShoppingDemo() {
  try {
    validateConfig();

    const krogerApi = new KrogerApi();
    const assistant = new ShoppingAssistant(krogerApi);

    console.log('🛒 Kroger Shopping AI Assistant Demo\n');

    // Find nearest store
    console.log(`📍 Finding stores near ${config.defaults.zipCode}...`);
    const nearbyStores = await krogerApi.locations.searchByZipCode(
      config.defaults.zipCode,
      10,
      5
    );

    if (nearbyStores.length === 0) {
      console.log('No stores found nearby.');
      return;
    }

    const primaryStore = nearbyStores[0];
    console.log(`\n✅ Primary store: ${primaryStore.name}`);
    console.log(`   ${primaryStore.address.addressLine1}, ${primaryStore.address.city}, ${primaryStore.address.state} ${primaryStore.address.zipCode}`);
    console.log(`   Phone: ${primaryStore.phone || 'N/A'}\n`);

    // Demo 1: Find best deals on a shopping list
    console.log('💰 Finding best deals on your shopping list...');
    const shoppingList = [
      { name: 'milk', quantity: 1 },
      { name: 'bread', quantity: 1 },
      { name: 'eggs', quantity: 1 },
      { name: 'chicken breast', quantity: 1 },
      { name: 'bananas', quantity: 1 }
    ];

    const deals = await assistant.findBestDeals(shoppingList, primaryStore.locationId);
    
    console.log('\nBest deals found:');
    deals.forEach((deal, index) => {
      console.log(`${index + 1}. ${assistant.formatProduct(deal.product)}`);
      console.log(`   ${deal.reason}`);
    });

    // Demo 2: Build a smart shopping list within budget
    console.log('\n💵 Building a smart shopping list with $30 budget...');
    const budgetList = ['milk', 'bread', 'eggs', 'butter', 'cheese', 'apples'];
    const smartList = await assistant.buildSmartShoppingList(
      budgetList,
      primaryStore.locationId,
      30
    );

    console.log('\nSmart shopping list:');
    smartList.items.forEach((item, index) => {
      console.log(`${index + 1}. ${assistant.formatProduct(item.product)}`);
    });
    console.log(`\nTotal: ${assistant.formatPrice(smartList.total)}`);
    console.log(`Within budget: ${smartList.withinBudget ? '✅ Yes' : '❌ No'}`);

    // Demo 3: Find product location in store
    console.log('\n🗺️  Finding product locations in store...');
    const productToFind = 'Gatorade';
    const location = await assistant.findProductInAisle(productToFind, primaryStore.locationId);
    
    if (location) {
      console.log(`\nFound: ${location.product.description}`);
      console.log(`Location: ${location.aisle}`);
    } else {
      console.log(`\nCouldn't find ${productToFind} location information.`);
    }

    // Demo 4: Compare prices across stores
    if (nearbyStores.length > 1) {
      console.log('\n📊 Comparing milk prices across nearby stores...');
      const storeIds = nearbyStores.slice(0, 3).map(s => s.locationId);
      const priceComparison = await assistant.compareProductPrices('milk gallon', storeIds);

      console.log('\nPrice comparison:');
      priceComparison.forEach((result, index) => {
        console.log(`${index + 1}. ${result.location.name}: ${assistant.formatPrice(result.price)}`);
      });
    }

    // Demo 5: Find stores with specific items
    console.log('\n🏪 Finding stores with all items on your list...');
    const essentialItems = ['milk', 'bread', 'eggs'];
    const storeWithItems = await assistant.findNearestStoreWithItems(
      essentialItems,
      config.defaults.zipCode,
      15
    );

    if (storeWithItems) {
      console.log(`\n✅ ${storeWithItems.store.name} has all items!`);
      console.log(`   Available: ${storeWithItems.availableItems.join(', ')}`);
    }

  } catch (error) {
    console.error('Error in shopping demo:', error);
  }
}

if (require.main === module) {
  runShoppingDemo();
}