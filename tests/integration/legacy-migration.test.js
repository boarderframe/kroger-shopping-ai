/**
 * Integration tests for legacy localStorage migration
 * Tests migration from old storage keys to new unified format
 */

const { test, expect } = require('@playwright/test');

test.describe('Legacy localStorage Migration Tests', () => {
  const baseURL = 'http://localhost:3001';

  test.beforeEach(async ({ page }) => {
    await page.goto(baseURL);
    
    // Clear all storage before each test
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test.describe('Migration from Legacy Keys', () => {
    test('should migrate defaultStoreId pattern to new format', async ({ page }) => {
      // Set up legacy data pattern 1
      await page.evaluate(() => {
        localStorage.setItem('defaultStoreId', '62600309');
        localStorage.setItem('defaultStoreName', 'Kroger Pharmacy');
        localStorage.setItem('defaultStoreAddress', '840 W 5th Ave, Columbus, OH 43212');
        localStorage.setItem('defaultStorePhone', '(614) 486-1462');
      });

      // Reload to trigger migration
      await page.reload();
      await page.waitForFunction(() => window.storeManager && window.storeManager.isInitialized);

      // Check migration occurred
      const migratedData = await page.evaluate(() => ({
        // New format keys
        newId: localStorage.getItem('kroger_store_id'),
        newName: localStorage.getItem('kroger_store_name'),
        newAddress: localStorage.getItem('kroger_store_address'),
        newPhone: localStorage.getItem('kroger_store_phone'),
        newLocationId: localStorage.getItem('kroger_location_id'),
        newLastUpdated: localStorage.getItem('kroger_store_last_updated'),
        newHash: localStorage.getItem('kroger_store_hash'),
        
        // Legacy keys (should be removed)
        legacyId: localStorage.getItem('defaultStoreId'),
        legacyName: localStorage.getItem('defaultStoreName'),
        legacyAddress: localStorage.getItem('defaultStoreAddress'),
        legacyPhone: localStorage.getItem('defaultStorePhone')
      }));

      // Verify migration to new format
      expect(migratedData.newId).toBe('62600309');
      expect(migratedData.newName).toBe('Kroger Pharmacy');
      expect(migratedData.newAddress).toBe('840 W 5th Ave, Columbus, OH 43212');
      expect(migratedData.newPhone).toBe('(614) 486-1462');
      expect(migratedData.newLocationId).toBe('62600309'); // Should default to same as ID
      expect(migratedData.newLastUpdated).toBeTruthy();
      expect(migratedData.newHash).toBeTruthy();

      // Verify legacy keys are removed
      expect(migratedData.legacyId).toBeNull();
      expect(migratedData.legacyName).toBeNull();
      expect(migratedData.legacyAddress).toBeNull();
      expect(migratedData.legacyPhone).toBeNull();

      // Verify UI shows migrated store
      const displayedStore = await page.textContent('#currentStore');
      expect(displayedStore).toBe('Kroger Pharmacy');
    });

    test('should migrate selectedStoreId pattern to new format', async ({ page }) => {
      // Set up legacy data pattern 2
      await page.evaluate(() => {
        localStorage.setItem('selectedStoreId', '62600315');
        localStorage.setItem('selectedStoreName', 'Kroger Marketplace');
      });

      // Reload to trigger migration
      await page.reload();
      await page.waitForFunction(() => window.storeManager && window.storeManager.isInitialized);

      const migratedData = await page.evaluate(() => ({
        newId: localStorage.getItem('kroger_store_id'),
        newName: localStorage.getItem('kroger_store_name'),
        newAddress: localStorage.getItem('kroger_store_address'),
        
        legacyId: localStorage.getItem('selectedStoreId'),
        legacyName: localStorage.getItem('selectedStoreName')
      }));

      expect(migratedData.newId).toBe('62600315');
      expect(migratedData.newName).toBe('Kroger Marketplace');
      expect(migratedData.newAddress).toBe(''); // Should default to empty for missing data

      // Legacy keys should be cleaned up
      expect(migratedData.legacyId).toBeNull();
      expect(migratedData.legacyName).toBeNull();
    });

    test('should handle partial legacy data gracefully', async ({ page }) => {
      // Set up incomplete legacy data
      await page.evaluate(() => {
        localStorage.setItem('defaultStoreId', '62600320');
        // Missing other fields
      });

      await page.reload();
      await page.waitForFunction(() => window.storeManager && window.storeManager.isInitialized);

      const migratedData = await page.evaluate(() => ({
        newId: localStorage.getItem('kroger_store_id'),
        newName: localStorage.getItem('kroger_store_name'),
        newAddress: localStorage.getItem('kroger_store_address'),
        newPhone: localStorage.getItem('kroger_store_phone')
      }));

      expect(migratedData.newId).toBe('62600320');
      expect(migratedData.newName).toBe('Unknown Store'); // Should use default
      expect(migratedData.newAddress).toBe('');
      expect(migratedData.newPhone).toBe('');
    });

    test('should prefer defaultStoreId over selectedStoreId when both exist', async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem('defaultStoreId', '62600309');
        localStorage.setItem('defaultStoreName', 'Default Store');
        localStorage.setItem('selectedStoreId', '62600315');
        localStorage.setItem('selectedStoreName', 'Selected Store');
      });

      await page.reload();
      await page.waitForFunction(() => window.storeManager && window.storeManager.isInitialized);

      const migratedData = await page.evaluate(() => ({
        id: localStorage.getItem('kroger_store_id'),
        name: localStorage.getItem('kroger_store_name')
      }));

      // Should prefer defaultStore* over selectedStore*
      expect(migratedData.id).toBe('62600309');
      expect(migratedData.name).toBe('Default Store');
    });

    test('should not migrate when new format already exists', async ({ page }) => {
      // Set up both legacy and new format data
      await page.evaluate(() => {
        // New format (should take precedence)
        localStorage.setItem('kroger_store_id', 'new123');
        localStorage.setItem('kroger_store_name', 'New Format Store');
        
        // Legacy format (should be ignored)
        localStorage.setItem('defaultStoreId', 'legacy456');
        localStorage.setItem('defaultStoreName', 'Legacy Store');
      });

      await page.reload();
      await page.waitForFunction(() => window.storeManager && window.storeManager.isInitialized);

      const finalData = await page.evaluate(() => ({
        id: localStorage.getItem('kroger_store_id'),
        name: localStorage.getItem('kroger_store_name'),
        legacyId: localStorage.getItem('defaultStoreId')
      }));

      // Should use new format data
      expect(finalData.id).toBe('new123');
      expect(finalData.name).toBe('New Format Store');
      
      // Legacy data should remain (not cleaned up since new format was already present)
      expect(finalData.legacyId).toBe('legacy456');
    });
  });

  test.describe('Migration Validation and Error Handling', () => {
    test('should validate migrated data integrity', async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem('defaultStoreId', '62600309');
        localStorage.setItem('defaultStoreName', 'Test Store');
        localStorage.setItem('defaultStoreAddress', '123 Test St');
        localStorage.setItem('defaultStorePhone', '555-0123');
      });

      await page.reload();
      await page.waitForFunction(() => window.storeManager && window.storeManager.isInitialized);

      // Check that migrated data passes validation
      const isValid = await page.evaluate(() => {
        const store = window.storeManager.getStore();
        return window.storeManager.isValidStoreData(store);
      });

      expect(isValid).toBe(true);

      // Check that hash was generated correctly
      const storeData = await page.evaluate(() => window.storeManager.getStore());
      expect(storeData.hash).toBeTruthy();
      expect(storeData.lastUpdated).toBeTruthy();
    });

    test('should handle corrupted legacy data', async ({ page }) => {
      await page.evaluate(() => {
        // Set corrupted data
        localStorage.setItem('defaultStoreId', '');
        localStorage.setItem('defaultStoreName', '');
      });

      await page.reload();
      await page.waitForFunction(() => window.storeManager && window.storeManager.isInitialized);

      // Should not crash and should result in no store selected
      const hasStore = await page.evaluate(() => window.storeManager.hasStore());
      expect(hasStore).toBe(false);

      const currentStore = await page.textContent('#currentStore');
      expect(currentStore).toMatch(/None|No store selected/);
    });

    test('should handle localStorage access errors during migration', async ({ page }) => {
      // Set up legacy data first
      await page.evaluate(() => {
        localStorage.setItem('defaultStoreId', '62600309');
        localStorage.setItem('defaultStoreName', 'Test Store');
      });

      // Override localStorage to simulate errors during migration
      await page.addInitScript(() => {
        const originalGetItem = localStorage.getItem.bind(localStorage);
        const originalSetItem = localStorage.setItem.bind(localStorage);
        const originalRemoveItem = localStorage.removeItem.bind(localStorage);

        let errorCount = 0;
        
        localStorage.setItem = function(key, value) {
          // Simulate occasional errors
          if (key.startsWith('kroger_') && errorCount < 2) {
            errorCount++;
            throw new Error('localStorage write error');
          }
          return originalSetItem(key, value);
        };

        localStorage.removeItem = function(key) {
          // Simulate occasional errors
          if (key.startsWith('default') && errorCount < 1) {
            errorCount++;
            throw new Error('localStorage remove error');
          }
          return originalRemoveItem(key);
        };
      });

      // Should not crash during migration despite localStorage errors
      await page.reload();
      await page.waitForFunction(() => window.storeManager, {}, { timeout: 10000 });

      // App should still be functional
      const appVisible = await page.isVisible('main');
      expect(appVisible).toBe(true);
    });
  });

  test.describe('Migration Persistence and Cross-Session', () => {
    test('should persist migrated data across browser sessions', async ({ page, context }) => {
      // Set up legacy data and migrate
      await page.evaluate(() => {
        localStorage.setItem('defaultStoreId', '62600309');
        localStorage.setItem('defaultStoreName', 'Session Test Store');
        localStorage.setItem('defaultStoreAddress', '789 Session St');
      });

      await page.reload();
      await page.waitForFunction(() => window.storeManager && window.storeManager.isInitialized);

      // Verify migration occurred
      const migratedName = await page.textContent('#currentStore');
      expect(migratedName).toBe('Session Test Store');

      // Close and reopen context (simulates new browser session)
      await context.close();
      const newContext = await page.context().browser().newContext();
      const newPage = await newContext.newPage();

      await newPage.goto(baseURL);
      await newPage.waitForFunction(() => window.storeManager && window.storeManager.isInitialized);

      // Verify data persisted in new session
      const persistedName = await newPage.textContent('#currentStore');
      expect(persistedName).toBe('Session Test Store');

      // Verify new format is being used (no re-migration)
      const storageData = await newPage.evaluate(() => ({
        newFormat: localStorage.getItem('kroger_store_id'),
        legacyFormat: localStorage.getItem('defaultStoreId')
      }));

      expect(storageData.newFormat).toBe('62600309');
      expect(storageData.legacyFormat).toBeNull(); // Should be cleaned up

      await newContext.close();
    });

    test('should handle concurrent migration across multiple tabs', async ({ browser }) => {
      // Create multiple tabs with legacy data
      const context = await browser.newContext();
      const page1 = await context.newPage();
      const page2 = await context.newPage();

      // Set up legacy data in both tabs
      await page1.goto(baseURL);
      await page1.evaluate(() => {
        localStorage.setItem('defaultStoreId', '62600309');
        localStorage.setItem('defaultStoreName', 'Concurrent Test Store');
      });

      await page2.goto(baseURL);

      // Trigger migration in both tabs simultaneously
      const migration1Promise = page1.reload().then(() => 
        page1.waitForFunction(() => window.storeManager && window.storeManager.isInitialized)
      );
      const migration2Promise = page2.reload().then(() => 
        page2.waitForFunction(() => window.storeManager && window.storeManager.isInitialized)
      );

      await Promise.all([migration1Promise, migration2Promise]);

      // Both tabs should show the same migrated data
      const store1 = await page1.textContent('#currentStore');
      const store2 = await page2.textContent('#currentStore');

      expect(store1).toBe('Concurrent Test Store');
      expect(store2).toBe('Concurrent Test Store');

      // Verify data consistency in localStorage
      const data1 = await page1.evaluate(() => localStorage.getItem('kroger_store_id'));
      const data2 = await page2.evaluate(() => localStorage.getItem('kroger_store_id'));

      expect(data1).toBe('62600309');
      expect(data2).toBe('62600309');

      await context.close();
    });
  });

  test.describe('Real-world Migration Scenarios', () => {
    test('should migrate actual legacy data patterns from production', async ({ page }) => {
      // Test with real legacy data patterns observed in production
      const legacyPatterns = [
        {
          name: 'Classic defaultStore pattern',
          data: {
            'defaultStoreId': '62600309',
            'defaultStoreName': 'Kroger Pharmacy',
            'defaultStoreAddress': '840 W 5th Ave, Columbus, OH 43212',
            'defaultStorePhone': '(614) 486-1462'
          },
          expected: {
            id: '62600309',
            name: 'Kroger Pharmacy'
          }
        },
        {
          name: 'selectedStore pattern only',
          data: {
            'selectedStoreId': '62600315',
            'selectedStoreName': 'Kroger Marketplace'
          },
          expected: {
            id: '62600315',
            name: 'Kroger Marketplace'
          }
        },
        {
          name: 'Mixed legacy keys',
          data: {
            'defaultStoreId': '62600320',
            'selectedStoreName': 'Mixed Pattern Store'
          },
          expected: {
            id: '62600320',
            name: 'Unknown Store' // Should use default when name is from different pattern
          }
        }
      ];

      for (const pattern of legacyPatterns) {
        // Clear storage and set up pattern
        await page.evaluate(() => localStorage.clear());
        await page.evaluate((data) => {
          Object.entries(data).forEach(([key, value]) => {
            localStorage.setItem(key, value);
          });
        }, pattern.data);

        // Trigger migration
        await page.reload();
        await page.waitForFunction(() => window.storeManager && window.storeManager.isInitialized);

        // Verify migration
        const migrated = await page.evaluate(() => ({
          id: localStorage.getItem('kroger_store_id'),
          name: localStorage.getItem('kroger_store_name')
        }));

        expect(migrated.id).toBe(pattern.expected.id);
        expect(migrated.name).toBe(pattern.expected.name);

        // Verify UI reflects migration
        const displayedStore = await page.textContent('#currentStore');
        expect(displayedStore).toBe(pattern.expected.name);

        console.log(`✓ Successfully migrated: ${pattern.name}`);
      }
    });

    test('should handle edge cases in legacy data', async ({ page }) => {
      const edgeCases = [
        {
          name: 'Empty string values',
          data: {
            'defaultStoreId': '',
            'defaultStoreName': ''
          }
        },
        {
          name: 'Null-like string values', 
          data: {
            'defaultStoreId': 'null',
            'defaultStoreName': 'undefined'
          }
        },
        {
          name: 'Whitespace-only values',
          data: {
            'defaultStoreId': '   ',
            'defaultStoreName': '\t\n'
          }
        },
        {
          name: 'Very long values',
          data: {
            'defaultStoreId': '123456789012345678901234567890',
            'defaultStoreName': 'A'.repeat(1000)
          }
        },
        {
          name: 'Special characters',
          data: {
            'defaultStoreId': '62600309',
            'defaultStoreName': 'Store with "quotes" & <tags>',
            'defaultStoreAddress': 'Address with émojis 🏪 and ñeña'
          }
        }
      ];

      for (const testCase of edgeCases) {
        await page.evaluate(() => localStorage.clear());
        await page.evaluate((data) => {
          Object.entries(data).forEach(([key, value]) => {
            localStorage.setItem(key, value);
          });
        }, testCase.data);

        // Should not crash during migration
        await page.reload();
        await page.waitForFunction(() => window.storeManager, {}, { timeout: 10000 });

        // App should remain functional
        const appVisible = await page.isVisible('main');
        expect(appVisible).toBe(true);

        console.log(`✓ Handled edge case: ${testCase.name}`);
      }
    });
  });
});