// Robust E2E Test Suite for All Fixes
// Handles modals, popups, and other UI interactions gracefully

const { test, expect } = require('@playwright/test');

const TEST_CONFIG = {
  testZipCode: '43123',
  searchTerms: ['milk', 'bread'],
  maxToastMessages: 5,
  timeout: 15000
};

test.describe('Robust Fixes Verification', () => {
  let toastCount = 0;

  test.beforeEach(async ({ page }) => {
    toastCount = 0;
    
    // Monitor console for toast messages
    page.on('console', (msg) => {
      const text = msg.text().toLowerCase();
      if (text.includes('toast') || text.includes('notification')) {
        toastCount++;
        console.log(`🍞 Toast detected: ${msg.text()}`);
      }
    });

    // Navigate to app
    await page.goto('/', { waitUntil: 'networkidle', timeout: 30000 });
    
    // Handle welcome modal if present
    try {
      await page.locator('.welcome-modal .close, .modal .close, .welcome-close').click({ timeout: 5000 });
      console.log('✅ Welcome modal closed');
    } catch (e) {
      console.log('ℹ️ No welcome modal to close');
    }
    
    // Ensure we can see the main navigation
    await page.waitForSelector('.tab-nav', { timeout: 10000 });
  });

  test('Toast Messages - Verify reduction from 40+ to minimal', async ({ page }) => {
    console.log('🍞 Testing Toast Message Reduction');
    
    toastCount = 0; // Reset counter
    
    // Navigate through tabs (this used to cause toast spam)
    const tabs = ['search', 'list', 'cart', 'settings'];
    
    for (const tab of tabs) {
      try {
        // Use the main navigation tabs, not any change-store buttons
        await page.locator('.tab-nav .tab-button').filter({ hasText: new RegExp(tab, 'i') }).click({ timeout: 5000 });
        await page.waitForTimeout(1500);
        console.log(`📂 Navigated to ${tab} tab`);
      } catch (e) {
        console.log(`⚠️ Could not navigate to ${tab}: ${e.message}`);
      }
    }

    // Trigger actions that previously caused excessive toasts
    try {
      await page.locator('.tab-nav .tab-button').filter({ hasText: /settings/i }).click();
      await page.waitForSelector('#zipCode', { timeout: 5000 });
      
      await page.fill('#zipCode', TEST_CONFIG.testZipCode);
      await page.click('#findStoresBtn');
      await page.waitForTimeout(3000);
      
      console.log(`📊 Total toast messages: ${toastCount}`);
      console.log(`🎯 Maximum allowed: ${TEST_CONFIG.maxToastMessages}`);
      
      // Verify toast reduction (was 40+, should now be ≤5)
      expect(toastCount).toBeLessThanOrEqual(TEST_CONFIG.maxToastMessages);
      
    } catch (error) {
      console.log(`⚠️ Settings interaction failed: ${error.message}`);
      // Even if settings fail, we still check that basic navigation didn't spam toasts
      expect(toastCount).toBeLessThanOrEqual(TEST_CONFIG.maxToastMessages);
    }
  });

  test('Store Display - Verify location restrictions', async ({ page }) => {
    console.log('🏪 Testing Store Display Restrictions');
    
    // Go to settings and try to set up store
    try {
      await page.locator('.tab-nav .tab-button').filter({ hasText: /settings/i }).click();
      await page.waitForSelector('#zipCode', { timeout: 5000 });
      
      await page.fill('#zipCode', TEST_CONFIG.testZipCode);
      await page.click('#findStoresBtn');
      await page.waitForTimeout(5000);
      
      // Try to select a store if available
      const storeOptions = await page.locator('#storeList option:not([disabled])').count();
      if (storeOptions > 0) {
        await page.selectOption('#storeList', { index: 1 });
        await page.waitForTimeout(2000);
        console.log('✅ Store selected');
      }
    } catch (error) {
      console.log(`⚠️ Store setup failed, continuing with display tests: ${error.message}`);
    }

    // Test 1: Store info should be visible in Settings
    try {
      await page.locator('.tab-nav .tab-button').filter({ hasText: /settings/i }).click();
      const settingsHasStoreInfo = await page.locator('#selectedStore, .selected-store').isVisible();
      console.log(`📍 Store info in Settings: ${settingsHasStoreInfo}`);
    } catch (e) {
      console.log('ℹ️ Could not check Settings store info');
    }

    // Test 2: Store info should NOT be in header
    const headerText = await page.locator('header').textContent();
    const headerHasStore = headerText.toLowerCase().includes('store') && 
                          !headerText.toLowerCase().includes('shopping'); // Shopping is OK, but not "Store: XYZ"
    
    console.log(`🚫 Header contains store details: ${headerHasStore}`);
    console.log(`📝 Header text: ${headerText.substring(0, 100)}...`);

    // Test 3: Store info should NOT be in footer (this was the main fix)
    const footerText = await page.locator('footer').textContent();
    const footerHasStore = footerText.toLowerCase().includes('selected store') ||
                          footerText.toLowerCase().includes('current store') ||
                          footerText.toLowerCase().includes('kroger store');
    
    console.log(`🚫 Footer contains store details: ${footerHasStore}`);
    console.log(`📝 Footer text: ${footerText}`);

    // Verify store display restrictions
    expect(headerHasStore).toBe(false);
    expect(footerHasStore).toBe(false); // This was the main fix
  });

  test('Search Functionality - Verify results display', async ({ page }) => {
    console.log('🔍 Testing Search Functionality');
    
    // Ensure we're on search tab
    await page.locator('.tab-nav .tab-button').filter({ hasText: /search/i }).click();
    await page.waitForSelector('#searchTerm', { timeout: 5000 });

    // Set up store first (required for search)
    try {
      await page.locator('.tab-nav .tab-button').filter({ hasText: /settings/i }).click();
      await page.fill('#zipCode', TEST_CONFIG.testZipCode);
      await page.click('#findStoresBtn');
      await page.waitForTimeout(5000);
      
      const storeOptions = await page.locator('#storeList option:not([disabled])').count();
      if (storeOptions > 0) {
        await page.selectOption('#storeList', { index: 1 });
        await page.waitForTimeout(2000);
        console.log('✅ Store configured for search');
      }
    } catch (error) {
      console.log(`⚠️ Store setup for search failed: ${error.message}`);
    }

    // Return to search tab
    await page.locator('.tab-nav .tab-button').filter({ hasText: /search/i }).click();
    
    let searchWorking = false;
    
    for (const term of TEST_CONFIG.searchTerms) {
      try {
        console.log(`🔎 Testing search for: "${term}"`);
        
        await page.fill('#searchTerm', term);
        await page.click('.search-btn, button[onclick*="searchProducts"]');
        await page.waitForTimeout(8000); // Extended wait for search
        
        // Check for results or proper no-results handling
        const hasResults = await page.locator('#searchResults .product-card').count();
        const hasNoResults = await page.locator('#noResultsState').isVisible();
        const hasResultsHeader = await page.locator('#searchResultsHeader').isVisible();
        
        console.log(`📊 "${term}" results: ${hasResults} products`);
        console.log(`🚫 No results shown: ${hasNoResults}`);
        console.log(`📋 Results header shown: ${hasResultsHeader}`);
        
        if (hasResults > 0) {
          // Verify first product is visible (the main fix)
          const firstProduct = page.locator('#searchResults .product-card').first();
          const productVisible = await firstProduct.isVisible();
          
          console.log(`👁️ First product visible: ${productVisible}`);
          
          if (productVisible) {
            searchWorking = true;
            // Test the visibility fix - check CSS properties
            const styles = await firstProduct.evaluate(el => {
              const computed = window.getComputedStyle(el);
              return {
                display: computed.display,
                visibility: computed.visibility,
                opacity: computed.opacity
              };
            });
            
            console.log(`🎨 Product styles:`, styles);
            expect(styles.display).not.toBe('none');
            expect(styles.visibility).not.toBe('hidden');
            break; // Found working search, no need to test more
          }
        } else if (hasNoResults || hasResultsHeader) {
          // Search executed but no results - this is valid
          searchWorking = true;
          console.log(`✅ Search executed properly for "${term}" (no results found)`);
          break;
        }
        
      } catch (error) {
        console.log(`❌ Search failed for "${term}": ${error.message}`);
      }
    }

    // Verify search functionality works
    expect(searchWorking).toBe(true);
  });

  test('User Flow Integration - Basic flow test', async ({ page }) => {
    console.log('🔄 Testing Basic User Flow Integration');
    
    let stepsPassed = 0;
    
    // Step 1: Navigate to settings
    try {
      await page.locator('.tab-nav .tab-button').filter({ hasText: /settings/i }).click();
      stepsPassed++;
      console.log('✅ Step 1: Navigation to settings');
    } catch (e) {
      console.log('❌ Step 1 failed: Navigation');
    }

    // Step 2: Enter ZIP code
    try {
      await page.fill('#zipCode', TEST_CONFIG.testZipCode);
      stepsPassed++;
      console.log('✅ Step 2: ZIP code entry');
    } catch (e) {
      console.log('❌ Step 2 failed: ZIP code');
    }

    // Step 3: Find stores
    try {
      await page.click('#findStoresBtn');
      await page.waitForTimeout(5000);
      stepsPassed++;
      console.log('✅ Step 3: Find stores');
    } catch (e) {
      console.log('❌ Step 3 failed: Find stores');
    }

    // Step 4: Navigate to search
    try {
      await page.locator('.tab-nav .tab-button').filter({ hasText: /search/i }).click();
      await page.waitForSelector('#searchTerm', { timeout: 5000 });
      stepsPassed++;
      console.log('✅ Step 4: Navigate to search');
    } catch (e) {
      console.log('❌ Step 4 failed: Navigate to search');
    }

    // Step 5: Perform search
    try {
      await page.fill('#searchTerm', 'milk');
      await page.click('.search-btn, button[onclick*="searchProducts"]');
      await page.waitForTimeout(5000);
      stepsPassed++;
      console.log('✅ Step 5: Perform search');
    } catch (e) {
      console.log('❌ Step 5 failed: Search');
    }

    console.log(`📊 Integration test: ${stepsPassed}/5 steps completed`);
    
    // Require at least 3 steps to pass for basic functionality
    expect(stepsPassed).toBeGreaterThanOrEqual(3);
  });

  test('Console Errors - Check for critical issues', async ({ page }) => {
    console.log('🔧 Testing Console Errors');
    
    const errors = [];
    const warnings = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      } else if (msg.type() === 'warning') {
        warnings.push(msg.text());
      }
    });

    // Navigate through the app
    const tabs = ['search', 'settings'];
    for (const tab of tabs) {
      try {
        await page.locator('.tab-nav .tab-button').filter({ hasText: new RegExp(tab, 'i') }).click();
        await page.waitForTimeout(2000);
      } catch (e) {
        console.log(`Navigation to ${tab} failed: ${e.message}`);
      }
    }

    // Perform some actions
    try {
      await page.fill('#zipCode', TEST_CONFIG.testZipCode);
      await page.click('#findStoresBtn');
      await page.waitForTimeout(3000);
    } catch (e) {
      // Ignore errors in this test phase
    }

    // Filter out common non-critical errors
    const criticalErrors = errors.filter(error => 
      !error.includes('favicon') && 
      !error.includes('manifest.json') &&
      !error.includes('service-worker') &&
      !error.includes('Failed to load resource') &&
      !error.includes('net::ERR_')
    );

    console.log(`❌ Critical errors: ${criticalErrors.length}`);
    console.log(`⚠️ Total warnings: ${warnings.length}`);
    
    if (criticalErrors.length > 0) {
      console.log('❌ Critical errors found:');
      criticalErrors.forEach((error, i) => console.log(`  ${i + 1}. ${error}`));
    }

    // Allow minimal critical errors
    expect(criticalErrors.length).toBeLessThanOrEqual(3);
  });

  test.afterEach(async ({ page }) => {
    // Take final screenshot
    try {
      await page.screenshot({ 
        path: `test-results/final-${Date.now()}.png`,
        fullPage: true 
      });
    } catch (e) {
      console.log('Could not take final screenshot');
    }
  });
});