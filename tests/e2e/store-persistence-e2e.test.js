/**
 * End-to-End tests for store persistence functionality
 * Tests cross-tab synchronization, page refresh, and real browser scenarios
 */

const { test, expect, chromium } = require('@playwright/test');

test.describe('Store Persistence E2E Tests', () => {
  let browser;
  let context;
  let page;
  
  const baseURL = 'http://localhost:3001';
  
  test.beforeAll(async () => {
    browser = await chromium.launch();
  });

  test.afterAll(async () => {
    await browser.close();
  });

  test.beforeEach(async () => {
    context = await browser.newContext();
    page = await context.newPage();
    
    // Clear localStorage before each test
    await page.goto(baseURL);
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test.afterEach(async () => {
    await context.close();
  });

  test.describe('Store Selection and Persistence', () => {
    test('should persist store selection after page refresh', async () => {
      await page.goto(baseURL);
      
      // Wait for app initialization
      await page.waitForFunction(() => window.initManager && window.initManager.initialized);
      
      // Go to settings tab
      await page.click('button[onclick*="settings"]');
      
      // Enter ZIP code
      await page.fill('#zipCode', '43123');
      await page.click('#findStoresBtn');
      
      // Wait for stores to load
      await page.waitForFunction(() => {
        const storeList = document.getElementById('storeList');
        return storeList && storeList.options.length > 1;
      }, { timeout: 10000 });
      
      // Select the first store
      await page.selectOption('#storeList', { index: 1 });
      
      // Verify store is selected
      const selectedStoreName = await page.textContent('#selectedStore .store-name');
      expect(selectedStoreName).toBeTruthy();
      
      // Refresh the page
      await page.reload();
      
      // Wait for app initialization after refresh
      await page.waitForFunction(() => window.initManager && window.initManager.initialized);
      
      // Verify store persisted after refresh
      const persistedStoreName = await page.textContent('#currentStore');
      expect(persistedStoreName).not.toBe('None');
      expect(persistedStoreName).not.toBe('No store selected');
      
      // Verify store is still shown in footer
      expect(persistedStoreName).toBe(selectedStoreName);
    });

    test('should not show false "store not set" messages', async () => {
      await page.goto(baseURL);
      
      // Set up toast message monitoring
      const toastMessages = [];
      page.on('console', msg => {
        if (msg.text().includes('Toast')) {
          toastMessages.push(msg.text());
        }
      });
      
      // Set up a store first
      await page.click('button[onclick*="settings"]');
      await page.fill('#zipCode', '43123');
      await page.click('#findStoresBtn');
      
      await page.waitForFunction(() => {
        const storeList = document.getElementById('storeList');
        return storeList && storeList.options.length > 1;
      }, { timeout: 10000 });
      
      await page.selectOption('#storeList', { index: 1 });
      
      // Wait a bit for any false toast messages
      await page.waitForTimeout(2000);
      
      // Check for any "default store is not set" messages
      const falseMessages = toastMessages.filter(msg => 
        msg.toLowerCase().includes('default store is not set') ||
        msg.toLowerCase().includes('store not set')
      );
      
      expect(falseMessages).toHaveLength(0);
      
      // Navigate between tabs to ensure no false messages appear
      await page.click('button[onclick*="search"]');
      await page.waitForTimeout(500);
      await page.click('button[onclick*="cart"]');
      await page.waitForTimeout(500);
      await page.click('button[onclick*="list"]');
      await page.waitForTimeout(500);
      
      // Check again for false messages
      const moreFalseMessages = toastMessages.filter(msg => 
        msg.toLowerCase().includes('default store is not set') ||
        msg.toLowerCase().includes('store not set')
      );
      
      expect(moreFalseMessages).toHaveLength(0);
    });

    test('should properly load store before enabling features', async () => {
      await page.goto(baseURL);
      
      // Wait for initialization to complete
      await page.waitForFunction(() => window.initManager && window.initManager.initialized);
      
      // Check that search is disabled initially (no store set)
      const searchInputDisabled = await page.isDisabled('#searchTerm');
      expect(searchInputDisabled).toBe(true);
      
      const searchPlaceholder = await page.getAttribute('#searchTerm', 'placeholder');
      expect(searchPlaceholder).toContain('Select a store first');
      
      // Now set a store
      await page.click('button[onclick*="settings"]');
      await page.fill('#zipCode', '43123');
      await page.click('#findStoresBtn');
      
      await page.waitForFunction(() => {
        const storeList = document.getElementById('storeList');
        return storeList && storeList.options.length > 1;
      }, { timeout: 10000 });
      
      await page.selectOption('#storeList', { index: 1 });
      
      // Go back to search tab
      await page.click('button[onclick*="search"]');
      
      // Verify search is now enabled
      await page.waitForFunction(() => {
        const searchInput = document.getElementById('searchTerm');
        return searchInput && !searchInput.disabled;
      });
      
      const enabledSearchPlaceholder = await page.getAttribute('#searchTerm', 'placeholder');
      expect(enabledSearchPlaceholder).toContain('Search for products');
    });
  });

  test.describe('Cross-Tab Synchronization', () => {
    test('should sync store selection across multiple tabs', async () => {
      // Create two tabs
      const page1 = await context.newPage();
      const page2 = await context.newPage();
      
      await page1.goto(baseURL);
      await page2.goto(baseURL);
      
      // Wait for both tabs to initialize
      await page1.waitForFunction(() => window.initManager && window.initManager.initialized);
      await page2.waitForFunction(() => window.initManager && window.initManager.initialized);
      
      // Select store in first tab
      await page1.click('button[onclick*="settings"]');
      await page1.fill('#zipCode', '43123');
      await page1.click('#findStoresBtn');
      
      await page1.waitForFunction(() => {
        const storeList = document.getElementById('storeList');
        return storeList && storeList.options.length > 1;
      }, { timeout: 10000 });
      
      await page1.selectOption('#storeList', { index: 1 });
      
      const selectedStoreName = await page1.textContent('#selectedStore .store-name');
      
      // Wait for sync to occur in second tab
      await page2.waitForFunction((expectedName) => {
        const currentStore = document.getElementById('currentStore');
        return currentStore && currentStore.textContent === expectedName;
      }, selectedStoreName, { timeout: 5000 });
      
      // Verify store synced to second tab
      const syncedStoreName = await page2.textContent('#currentStore');
      expect(syncedStoreName).toBe(selectedStoreName);
      
      // Verify features are enabled in second tab
      await page2.click('button[onclick*="search"]');
      const searchEnabled = await page2.isEnabled('#searchTerm');
      expect(searchEnabled).toBe(true);
      
      await page1.close();
      await page2.close();
    });

    test('should handle store clearing across tabs', async () => {
      const page1 = await context.newPage();
      const page2 = await context.newPage();
      
      await page1.goto(baseURL);
      await page2.goto(baseURL);
      
      await page1.waitForFunction(() => window.initManager && window.initManager.initialized);
      await page2.waitForFunction(() => window.initManager && window.initManager.initialized);
      
      // Set store in first tab
      await page1.click('button[onclick*="settings"]');
      await page1.fill('#zipCode', '43123');
      await page1.click('#findStoresBtn');
      
      await page1.waitForFunction(() => {
        const storeList = document.getElementById('storeList');
        return storeList && storeList.options.length > 1;
      }, { timeout: 10000 });
      
      await page1.selectOption('#storeList', { index: 1 });
      
      // Wait for sync in second tab
      await page2.waitForFunction(() => {
        const currentStore = document.getElementById('currentStore');
        return currentStore && currentStore.textContent !== 'None' && currentStore.textContent !== 'No store selected';
      }, { timeout: 5000 });
      
      // Clear store in first tab
      await page1.evaluate(() => {
        if (window.storeManager) {
          window.storeManager.clearStore();
        }
      });
      
      // Wait for clear to sync to second tab
      await page2.waitForFunction(() => {
        const currentStore = document.getElementById('currentStore');
        return currentStore && (currentStore.textContent === 'None' || currentStore.textContent === 'No store selected');
      }, { timeout: 5000 });
      
      // Verify store cleared in second tab
      const clearedStoreName = await page2.textContent('#currentStore');
      expect(clearedStoreName).toMatch(/None|No store selected/);
      
      await page1.close();
      await page2.close();
    });
  });

  test.describe('Legacy Migration', () => {
    test('should migrate from legacy localStorage keys', async () => {
      await page.goto(baseURL);
      
      // Set legacy data before app initialization
      await page.evaluate(() => {
        // Clear any existing data first
        localStorage.clear();
        
        // Set legacy format data
        localStorage.setItem('defaultStoreId', 'legacy123');
        localStorage.setItem('defaultStoreName', 'Legacy Store Name');
        localStorage.setItem('defaultStoreAddress', '456 Legacy Street, Legacy City, OH 43456');
        localStorage.setItem('defaultStorePhone', '(555) 123-4567');
      });
      
      // Refresh to trigger migration
      await page.reload();
      await page.waitForFunction(() => window.initManager && window.initManager.initialized);
      
      // Check that data migrated to new format
      const migratedData = await page.evaluate(() => {
        return {
          newId: localStorage.getItem('kroger_store_id'),
          newName: localStorage.getItem('kroger_store_name'),
          newAddress: localStorage.getItem('kroger_store_address'),
          newPhone: localStorage.getItem('kroger_store_phone'),
          // Check legacy keys are gone
          legacyId: localStorage.getItem('defaultStoreId'),
          legacyName: localStorage.getItem('defaultStoreName')
        };
      });
      
      expect(migratedData.newId).toBe('legacy123');
      expect(migratedData.newName).toBe('Legacy Store Name');
      expect(migratedData.newAddress).toBe('456 Legacy Street, Legacy City, OH 43456');
      expect(migratedData.newPhone).toBe('(555) 123-4567');
      
      // Legacy keys should be removed
      expect(migratedData.legacyId).toBeNull();
      expect(migratedData.legacyName).toBeNull();
      
      // Verify UI shows migrated store
      const displayedStoreName = await page.textContent('#currentStore');
      expect(displayedStoreName).toBe('Legacy Store Name');
    });
  });

  test.describe('All Pages Store Access', () => {
    test('should have access to selected store on all pages', async () => {
      await page.goto(baseURL);
      await page.waitForFunction(() => window.initManager && window.initManager.initialized);
      
      // Set up store first
      await page.click('button[onclick*="settings"]');
      await page.fill('#zipCode', '43123');
      await page.click('#findStoresBtn');
      
      await page.waitForFunction(() => {
        const storeList = document.getElementById('storeList');
        return storeList && storeList.options.length > 1;
      }, { timeout: 10000 });
      
      await page.selectOption('#storeList', { index: 1 });
      
      const selectedStoreName = await page.textContent('#selectedStore .store-name');
      
      // Test each tab has access to store
      const tabs = ['search', 'list', 'cart', 'settings'];
      
      for (const tab of tabs) {
        await page.click(`button[onclick*="${tab}"]`);
        
        // Wait for tab to be active
        await page.waitForFunction((tabName) => {
          const tabContent = document.getElementById(`${tabName}-tab`);
          return tabContent && tabContent.classList.contains('active');
        }, tab);
        
        // Check footer still shows store
        const footerStoreName = await page.textContent('#currentStore');
        expect(footerStoreName).toBe(selectedStoreName);
        
        // Check that storeManager is available and has store
        const hasStore = await page.evaluate(() => {
          return window.storeManager && window.storeManager.hasStore();
        });
        expect(hasStore).toBe(true);
        
        const storeId = await page.evaluate(() => {
          return window.storeManager ? window.storeManager.getStoreId() : null;
        });
        expect(storeId).toBeTruthy();
      }
    });

    test('should enable/disable features consistently across all pages', async () => {
      await page.goto(baseURL);
      await page.waitForFunction(() => window.initManager && window.initManager.initialized);
      
      // Initially no store - features should be disabled
      await page.click('button[onclick*="search"]');
      const searchDisabled = await page.isDisabled('#searchTerm');
      expect(searchDisabled).toBe(true);
      
      // Set a store
      await page.click('button[onclick*="settings"]');
      await page.fill('#zipCode', '43123');
      await page.click('#findStoresBtn');
      
      await page.waitForFunction(() => {
        const storeList = document.getElementById('storeList');
        return storeList && storeList.options.length > 1;
      }, { timeout: 10000 });
      
      await page.selectOption('#storeList', { index: 1 });
      
      // Go back to search - should now be enabled
      await page.click('button[onclick*="search"]');
      await page.waitForFunction(() => {
        const searchInput = document.getElementById('searchTerm');
        return searchInput && !searchInput.disabled;
      });
      
      const searchEnabled = await page.isEnabled('#searchTerm');
      expect(searchEnabled).toBe(true);
      
      // Test other tabs have appropriate features enabled
      await page.click('button[onclick*="list"]');
      const listInput = await page.isEnabled('#newItem');
      expect(listInput).toBe(true);
      
      await page.click('button[onclick*="cart"]');
      // Cart should show empty state but be functional
      const emptyCartState = await page.isVisible('#emptyCartState');
      expect(emptyCartState).toBe(true);
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle localStorage being unavailable', async () => {
      await page.goto(baseURL);
      
      // Override localStorage to simulate unavailability
      await page.addInitScript(() => {
        Object.defineProperty(window, 'localStorage', {
          value: {
            getItem: () => { throw new Error('localStorage unavailable'); },
            setItem: () => { throw new Error('localStorage unavailable'); },
            removeItem: () => { throw new Error('localStorage unavailable'); }
          }
        });
      });
      
      // Should still initialize without crashing
      await page.waitForFunction(() => window.initManager, {}, { timeout: 10000 });
      
      // App should be functional even without localStorage
      const appContent = await page.isVisible('main');
      expect(appContent).toBe(true);
    });

    test('should handle offline scenarios gracefully', async () => {
      await page.goto(baseURL);
      await page.waitForFunction(() => window.initManager && window.initManager.initialized);
      
      // Set store first while online
      await page.click('button[onclick*="settings"]');
      await page.fill('#zipCode', '43123');
      await page.click('#findStoresBtn');
      
      await page.waitForFunction(() => {
        const storeList = document.getElementById('storeList');
        return storeList && storeList.options.length > 1;
      }, { timeout: 10000 });
      
      await page.selectOption('#storeList', { index: 1 });
      
      // Simulate going offline
      await page.setOfflineMode(true);
      
      // Refresh page while offline
      await page.reload();
      await page.waitForFunction(() => window.initManager && window.initManager.initialized);
      
      // Store should still be available offline
      const offlineStoreName = await page.textContent('#currentStore');
      expect(offlineStoreName).not.toMatch(/None|No store selected/);
      
      // Re-enable online mode
      await page.setOfflineMode(false);
    });

    test('should show appropriate toast messages for store events', async () => {
      await page.goto(baseURL);
      
      const toastMessages = [];
      
      // Monitor for toast notifications
      await page.exposeFunction('captureToast', (title, message, type) => {
        toastMessages.push({ title, message, type });
      });
      
      // Override toast manager to capture messages
      await page.addInitScript(() => {
        const originalShow = window.ToastManager ? window.ToastManager.prototype.show : null;
        if (originalShow) {
          window.ToastManager.prototype.show = function(title, message, type) {
            window.captureToast(title, message, type);
            return originalShow.call(this, title, message, type);
          };
        }
      });
      
      await page.waitForFunction(() => window.initManager && window.initManager.initialized);
      
      // Select a store - should show success toast
      await page.click('button[onclick*="settings"]');
      await page.fill('#zipCode', '43123');
      await page.click('#findStoresBtn');
      
      await page.waitForFunction(() => {
        const storeList = document.getElementById('storeList');
        return storeList && storeList.options.length > 1;
      }, { timeout: 10000 });
      
      await page.selectOption('#storeList', { index: 1 });
      
      // Wait for toast message
      await page.waitForTimeout(1000);
      
      // Should have appropriate success message
      const successToasts = toastMessages.filter(toast => 
        toast.type === 'success' && toast.title === 'Store Selected'
      );
      expect(successToasts.length).toBeGreaterThan(0);
      
      // Should not have any false error messages
      const errorToasts = toastMessages.filter(toast => 
        toast.type === 'error' && toast.message.includes('not set')
      );
      expect(errorToasts).toHaveLength(0);
    });

    test('should handle rapid store changes without race conditions', async () => {
      await page.goto(baseURL);
      await page.waitForFunction(() => window.initManager && window.initManager.initialized);
      
      // Set initial store
      await page.click('button[onclick*="settings"]');
      await page.fill('#zipCode', '43123');
      await page.click('#findStoresBtn');
      
      await page.waitForFunction(() => {
        const storeList = document.getElementById('storeList');
        return storeList && storeList.options.length > 1;
      }, { timeout: 10000 });
      
      // Rapidly change store selections
      await page.selectOption('#storeList', { index: 1 });
      await page.waitForTimeout(100);
      await page.selectOption('#storeList', { index: 2 });
      await page.waitForTimeout(100);
      await page.selectOption('#storeList', { index: 1 });
      
      // Wait for final selection to settle
      await page.waitForTimeout(1000);
      
      // Verify final state is consistent
      const finalStoreName = await page.textContent('#selectedStore .store-name');
      const footerStoreName = await page.textContent('#currentStore');
      
      expect(finalStoreName).toBe(footerStoreName);
      
      // Verify no duplicate or conflicting data in localStorage
      const storeData = await page.evaluate(() => {
        return {
          id: localStorage.getItem('kroger_store_id'),
          name: localStorage.getItem('kroger_store_name')
        };
      });
      
      expect(storeData.id).toBeTruthy();
      expect(storeData.name).toBe(finalStoreName);
    });
  });

  test.describe('Performance and Reliability', () => {
    test('should initialize within acceptable time limits', async () => {
      const startTime = Date.now();
      
      await page.goto(baseURL);
      await page.waitForFunction(() => window.initManager && window.initManager.initialized);
      
      const initTime = Date.now() - startTime;
      
      // Should initialize within 5 seconds even with network calls
      expect(initTime).toBeLessThan(5000);
    });

    test('should handle concurrent localStorage access without corruption', async () => {
      await page.goto(baseURL);
      await page.waitForFunction(() => window.initManager && window.initManager.initialized);
      
      // Simulate concurrent operations
      await page.evaluate(() => {
        const promises = [];
        for (let i = 0; i < 10; i++) {
          promises.push(
            window.storeManager.saveStore({
              id: `store${i}`,
              name: `Store ${i}`,
              address: `${i} Test St`,
              phone: `555-000${i}`
            })
          );
        }
        return Promise.all(promises);
      });
      
      // Check that final state is valid
      const finalStore = await page.evaluate(() => {
        return window.storeManager ? window.storeManager.getStore() : null;
      });
      
      expect(finalStore).toBeTruthy();
      expect(finalStore.id).toBeTruthy();
      expect(finalStore.name).toBeTruthy();
    });
  });
});