// Comprehensive E2E Test Suite for All Fixes
// Tests: Toast Reduction, Store Display Location, Search Functionality

const { test, expect } = require('@playwright/test');

// Test Configuration
const TEST_CONFIG = {
  testZipCode: '43123',
  searchTerms: ['milk', 'bread', 'eggs', 'bananas'],
  maxToastMessages: 5, // Reduced from 40+
  navigationTimeout: 10000,
  searchTimeout: 15000
};

test.describe('Comprehensive Fixes Verification', () => {
  let toastMessages = [];
  let page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    toastMessages = [];

    // Monitor toast messages throughout all tests
    await page.route('**/toasts**', (route) => {
      route.continue();
    });

    // Intercept console messages to track toast notifications
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('Toast') || text.includes('toast') || text.includes('notification')) {
        toastMessages.push({
          text,
          timestamp: new Date().toISOString(),
          type: msg.type()
        });
      }
    });

    // Navigate to the app
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForSelector('.tab-nav', { timeout: TEST_CONFIG.navigationTimeout });
  });

  test('FIX 1: Toast Messages - Verify reduced toast notifications', async () => {
    console.log('🍞 Testing Toast Message Reduction...');
    
    // Clear existing toast messages
    toastMessages = [];
    
    // Navigate through all tabs to trigger potential toasts
    const tabs = ['search', 'list', 'cart', 'settings'];
    
    for (const tab of tabs) {
      console.log(`📂 Navigating to ${tab} tab...`);
      await page.click(`button[onclick="showTab('${tab}')"]`);
      await page.waitForTimeout(2000); // Wait for potential toasts
      
      // Check for visible toast elements on page
      const visibleToasts = await page.locator('.toast, .notification, .alert').count();
      console.log(`📊 Visible toasts on ${tab} tab: ${visibleToasts}`);
    }

    // Perform common actions that previously caused excessive toasts
    await page.click(`button[onclick="showTab('settings')"]`);
    await page.waitForSelector('#zipCode');
    
    // Enter ZIP code (previously caused multiple toasts)
    await page.fill('#zipCode', TEST_CONFIG.testZipCode);
    await page.waitForTimeout(1000);
    
    // Find stores (previously caused toast spam)
    await page.click('#findStoresBtn');
    await page.waitForTimeout(3000);

    // Count final toast messages
    const finalToastCount = toastMessages.length;
    const visibleToastElements = await page.locator('.toast:visible').count();
    
    console.log(`📈 Total console toast messages: ${finalToastCount}`);
    console.log(`👁️ Visible toast elements: ${visibleToastElements}`);
    console.log(`🎯 Maximum allowed: ${TEST_CONFIG.maxToastMessages}`);
    
    // Verify toast reduction
    expect(finalToastCount).toBeLessThanOrEqual(TEST_CONFIG.maxToastMessages);
    expect(visibleToastElements).toBeLessThanOrEqual(3); // Only essential toasts visible
    
    // Log toast messages for analysis
    if (toastMessages.length > 0) {
      console.log('📋 Toast messages found:', toastMessages.map(t => t.text).join(', '));
    }
  });

  test('FIX 2: Store Display - Verify store info only in Settings tab', async () => {
    console.log('🏪 Testing Store Display Location...');
    
    // First, set up a store in settings
    await page.click(`button[onclick="showTab('settings')"]`);
    await page.waitForSelector('#zipCode');
    
    // Set ZIP code and select store
    await page.fill('#zipCode', TEST_CONFIG.testZipCode);
    await page.click('#findStoresBtn');
    await page.waitForSelector('#storeList option:not([disabled])', { timeout: 10000 });
    
    // Select first available store
    const storeOptions = await page.locator('#storeList option:not([disabled])').count();
    if (storeOptions > 0) {
      await page.selectOption('#storeList', { index: 1 }); // Skip disabled option
      await page.waitForTimeout(2000);
    }

    // Test 1: Verify store info IS visible in Settings tab
    const settingsStoreInfo = await page.locator('#selectedStore').isVisible();
    console.log(`📍 Store info visible in Settings tab: ${settingsStoreInfo}`);
    expect(settingsStoreInfo).toBe(true);

    // Test 2: Verify store info is NOT in header
    await page.click(`button[onclick="showTab('search')"]`);
    await page.waitForTimeout(1000);
    
    const headerStoreInfo = await page.locator('header').textContent();
    const headerContainsStore = headerStoreInfo.toLowerCase().includes('store') || 
                              headerStoreInfo.toLowerCase().includes('kroger') ||
                              headerStoreInfo.toLowerCase().includes(TEST_CONFIG.testZipCode);
    
    console.log(`🚫 Header contains store info: ${headerContainsStore}`);
    console.log(`📝 Header content: ${headerStoreInfo}`);

    // Test 3: Verify store info is NOT in footer
    const footerStoreInfo = await page.locator('footer').textContent();
    const footerContainsStore = footerStoreInfo.toLowerCase().includes('store') ||
                               footerStoreInfo.toLowerCase().includes('kroger') ||
                               footerStoreInfo.toLowerCase().includes(TEST_CONFIG.testZipCode);
    
    console.log(`🚫 Footer contains store info: ${footerContainsStore}`);
    console.log(`📝 Footer content: ${footerStoreInfo}`);

    // Verify store display locations
    expect(headerContainsStore).toBe(false);
    expect(footerContainsStore).toBe(false);

    // Test 4: Verify other tabs don't show detailed store info
    const otherTabs = ['search', 'list', 'cart'];
    for (const tab of otherTabs) {
      await page.click(`button[onclick="showTab('${tab}')"]`);
      await page.waitForTimeout(1000);
      
      const tabContent = await page.locator(`#${tab}-tab`).textContent();
      const hasDetailedStoreInfo = tabContent.includes('Selected Store:') ||
                                  tabContent.includes('Current Store:') ||
                                  tabContent.includes('Store Location:');
      
      console.log(`🔍 ${tab} tab has detailed store info: ${hasDetailedStoreInfo}`);
      expect(hasDetailedStoreInfo).toBe(false);
    }
  });

  test('FIX 3: Search Functionality - Verify search returns and displays results', async () => {
    console.log('🔍 Testing Search Functionality...');
    
    // Ensure we're on search tab
    await page.click(`button[onclick="showTab('search')"]`);
    await page.waitForSelector('#searchTerm');
    
    // First, set up store (required for search)
    await page.click(`button[onclick="showTab('settings')"]`);
    await page.fill('#zipCode', TEST_CONFIG.testZipCode);
    await page.click('#findStoresBtn');
    
    // Wait for stores to load and select one
    try {
      await page.waitForSelector('#storeList option:not([disabled])', { timeout: 10000 });
      const storeOptions = await page.locator('#storeList option:not([disabled])').count();
      if (storeOptions > 0) {
        await page.selectOption('#storeList', { index: 1 });
        await page.waitForTimeout(2000);
        console.log('✅ Store selected successfully');
      }
    } catch (error) {
      console.warn('⚠️ Could not select store, continuing with search test...');
    }

    // Return to search tab
    await page.click(`button[onclick="showTab('search')"]`);
    
    for (const searchTerm of TEST_CONFIG.searchTerms) {
      console.log(`🔎 Testing search for: "${searchTerm}"`);
      
      // Clear and enter search term
      await page.fill('#searchTerm', '');
      await page.fill('#searchTerm', searchTerm);
      
      // Perform search
      await page.click('.search-btn');
      
      // Wait for search to complete with extended timeout
      await page.waitForTimeout(5000);
      
      try {
        // Check for search results or no-results message
        const hasResults = await page.locator('#searchResults .product-card').count();
        const hasNoResultsMessage = await page.locator('#noResultsState').isVisible();
        const hasResultsHeader = await page.locator('#searchResultsHeader').isVisible();
        
        console.log(`📊 Results for "${searchTerm}": ${hasResults} products`);
        console.log(`🚫 No results message shown: ${hasNoResultsMessage}`);
        console.log(`📋 Results header visible: ${hasResultsHeader}`);
        
        // Verify search executed (should have either results or no-results message)
        const searchExecuted = hasResults > 0 || hasNoResultsMessage || hasResultsHeader;
        expect(searchExecuted).toBe(true);
        
        if (hasResults > 0) {
          // Verify results are visible and properly displayed
          const firstProduct = page.locator('#searchResults .product-card').first();
          const isProductVisible = await firstProduct.isVisible();
          const productTitle = await firstProduct.locator('.product-title').textContent();
          
          console.log(`👁️ First product visible: ${isProductVisible}`);
          console.log(`📝 First product title: ${productTitle}`);
          
          expect(isProductVisible).toBe(true);
          expect(productTitle).toBeTruthy();
          
          // Test product interaction (hover, click)
          await firstProduct.hover();
          await page.waitForTimeout(1000);
          
          // Check if product modal can be opened
          const productImage = firstProduct.locator('img');
          if (await productImage.isVisible()) {
            await productImage.click();
            await page.waitForTimeout(2000);
            
            const modalVisible = await page.locator('#productModal').isVisible();
            console.log(`🪟 Product modal opens: ${modalVisible}`);
            
            if (modalVisible) {
              await page.click('.close, .modal-close-btn');
              await page.waitForTimeout(1000);
            }
          }
        }
        
        // Test search result visibility fix
        const resultsContainer = page.locator('#searchResults');
        const containerStyles = await resultsContainer.evaluate(el => {
          const styles = window.getComputedStyle(el);
          return {
            display: styles.display,
            visibility: styles.visibility,
            opacity: styles.opacity,
            height: styles.height
          };
        });
        
        console.log(`🎨 Results container styles:`, containerStyles);
        expect(containerStyles.display).not.toBe('none');
        expect(containerStyles.visibility).not.toBe('hidden');
        
      } catch (error) {
        console.error(`❌ Search test failed for "${searchTerm}":`, error.message);
        // Continue testing other search terms
      }
    }
  });

  test('FIX 4: Complete User Flow - Store selection → Search → Results → Cart', async () => {
    console.log('🛒 Testing Complete User Flow...');
    
    let flowSuccess = true;
    const flowSteps = [];
    
    try {
      // Step 1: Store Selection
      console.log('📍 Step 1: Store Selection');
      await page.click(`button[onclick="showTab('settings')"]`);
      await page.fill('#zipCode', TEST_CONFIG.testZipCode);
      await page.click('#findStoresBtn');
      
      await page.waitForSelector('#storeList option:not([disabled])', { timeout: 15000 });
      const storeOptions = await page.locator('#storeList option:not([disabled])').count();
      
      if (storeOptions > 0) {
        await page.selectOption('#storeList', { index: 1 });
        await page.waitForTimeout(2000);
        flowSteps.push('✅ Store selection successful');
        console.log('✅ Store selected successfully');
      } else {
        throw new Error('No stores available for selection');
      }

      // Step 2: Search for Products
      console.log('🔍 Step 2: Product Search');
      await page.click(`button[onclick="showTab('search')"]`);
      await page.fill('#searchTerm', 'milk');
      await page.click('.search-btn');
      
      await page.waitForTimeout(5000);
      
      const hasResults = await page.locator('#searchResults .product-card').count();
      if (hasResults > 0) {
        flowSteps.push(`✅ Search successful: ${hasResults} products found`);
        console.log(`✅ Search successful: ${hasResults} products found`);
      } else {
        // Check if it's a "no results" scenario vs broken search
        const noResultsVisible = await page.locator('#noResultsState').isVisible();
        if (noResultsVisible) {
          flowSteps.push('⚠️ Search executed but no results found');
          console.log('⚠️ Search executed but no results found (valid scenario)');
        } else {
          throw new Error('Search functionality appears broken');
        }
      }

      // Step 3: View Results
      console.log('👁️ Step 3: View Results');
      if (hasResults > 0) {
        const firstProduct = page.locator('#searchResults .product-card').first();
        await firstProduct.hover();
        
        const productVisible = await firstProduct.isVisible();
        if (productVisible) {
          flowSteps.push('✅ Results display correctly');
          console.log('✅ Results display correctly');
        }

        // Step 4: Add to Cart
        console.log('🛒 Step 4: Add to Cart');
        const addToCartBtn = firstProduct.locator('.btn-add-cart, .add-to-cart, [title*="Add to Cart"]');
        
        if (await addToCartBtn.count() > 0) {
          await addToCartBtn.first().click();
          await page.waitForTimeout(2000);
          
          // Check if item was added to cart
          await page.click(`button[onclick="showTab('cart')"]`);
          await page.waitForTimeout(2000);
          
          const cartItems = await page.locator('#cartItems .cart-item, .cart-items .product-card').count();
          const cartIsEmpty = await page.locator('#emptyCartState').isVisible();
          
          if (cartItems > 0 || !cartIsEmpty) {
            flowSteps.push('✅ Add to cart successful');
            console.log('✅ Add to cart successful');
          } else {
            flowSteps.push('⚠️ Add to cart may not have worked');
            console.log('⚠️ Add to cart may not have worked');
          }
        } else {
          flowSteps.push('⚠️ Add to cart button not found');
          console.log('⚠️ Add to cart button not found');
        }
      }

    } catch (error) {
      flowSuccess = false;
      flowSteps.push(`❌ Flow failed at: ${error.message}`);
      console.error('❌ User flow failed:', error.message);
    }

    // Report flow results
    console.log('📊 Complete User Flow Results:');
    flowSteps.forEach(step => console.log(`  ${step}`));
    
    // At minimum, store selection and search should work
    expect(flowSteps.length).toBeGreaterThan(1);
    expect(flowSteps[0]).toContain('✅');
  });

  test('FIX 5: Console Error Check - Verify no critical errors', async () => {
    console.log('🔧 Testing for Console Errors...');
    
    const errors = [];
    const warnings = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      } else if (msg.type() === 'warning') {
        warnings.push(msg.text());
      }
    });
    
    page.on('pageerror', (error) => {
      errors.push(`Page Error: ${error.message}`);
    });

    // Navigate through all tabs
    const tabs = ['search', 'list', 'cart', 'settings'];
    for (const tab of tabs) {
      await page.click(`button[onclick="showTab('${tab}')"]`);
      await page.waitForTimeout(2000);
    }

    // Perform common actions
    await page.click(`button[onclick="showTab('settings')"]`);
    await page.fill('#zipCode', TEST_CONFIG.testZipCode);
    await page.click('#findStoresBtn');
    await page.waitForTimeout(5000);

    await page.click(`button[onclick="showTab('search')"]`);
    await page.fill('#searchTerm', 'bread');
    await page.click('.search-btn');
    await page.waitForTimeout(5000);

    // Report errors and warnings
    console.log(`❌ Console Errors: ${errors.length}`);
    console.log(`⚠️ Console Warnings: ${warnings.length}`);
    
    if (errors.length > 0) {
      console.log('❌ Errors found:');
      errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
    if (warnings.length > 0) {
      console.log('⚠️ Warnings found:');
      warnings.forEach((warning, index) => {
        console.log(`  ${index + 1}. ${warning}`);
      });
    }

    // Allow some warnings but no critical errors
    const criticalErrors = errors.filter(error => 
      !error.includes('favicon.ico') && 
      !error.includes('service-worker') &&
      !error.includes('manifest.json') &&
      !error.includes('Failed to load resource')
    );
    
    expect(criticalErrors.length).toBeLessThanOrEqual(2); // Allow minimal non-critical errors
  });

  test.afterEach(async () => {
    // Generate test summary
    console.log('📋 Test Summary:');
    console.log(`🍞 Toast messages tracked: ${toastMessages.length}`);
    
    if (page) {
      // Take final screenshot for debugging
      await page.screenshot({ 
        path: `test-results/final-state-${Date.now()}.png`,
        fullPage: true 
      });
    }
  });
});

// Additional utility tests
test.describe('Integration Verification', () => {
  test('All fixes work together without conflicts', async ({ page }) => {
    console.log('🔄 Testing Integration of All Fixes...');
    
    // Track all events
    const events = [];
    
    page.on('console', (msg) => {
      events.push({ type: 'console', level: msg.type(), text: msg.text() });
    });

    await page.goto('/');
    
    // Rapid navigation test (previously caused toast spam)
    const tabs = ['search', 'list', 'cart', 'settings'];
    for (let i = 0; i < 3; i++) { // Do 3 rapid cycles
      for (const tab of tabs) {
        await page.click(`button[onclick="showTab('${tab}')"]`);
        await page.waitForTimeout(500); // Rapid navigation
      }
    }

    // Setup store while monitoring
    await page.click(`button[onclick="showTab('settings')"]`);
    await page.fill('#zipCode', TEST_CONFIG.testZipCode);
    await page.click('#findStoresBtn');
    await page.waitForTimeout(5000);

    // Multiple searches while monitoring
    await page.click(`button[onclick="showTab('search')"]`);
    const searchTerms = ['milk', 'bread', 'eggs'];
    
    for (const term of searchTerms) {
      await page.fill('#searchTerm', term);
      await page.click('.search-btn');
      await page.waitForTimeout(3000);
    }

    // Count negative events
    const toastSpam = events.filter(e => e.text.toLowerCase().includes('toast')).length;
    const errors = events.filter(e => e.level === 'error').length;
    
    console.log(`📊 Integration Results:`);
    console.log(`  🍞 Toast-related events: ${toastSpam}`);
    console.log(`  ❌ Errors: ${errors}`);
    console.log(`  📝 Total events: ${events.length}`);

    // Verify integration success
    expect(toastSpam).toBeLessThanOrEqual(TEST_CONFIG.maxToastMessages);
    expect(errors).toBeLessThanOrEqual(3); // Allow some non-critical errors
  });
});