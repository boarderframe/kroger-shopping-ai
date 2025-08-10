/**
 * End-to-End Tests for Store Refresh Functionality
 * Tests the complete user workflow in a real browser environment
 */

const { test, expect } = require('@playwright/test');

test.describe('Store List Refresh E2E Tests', () => {
    const BASE_URL = process.env.TEST_URL || 'http://localhost:3001';

    test.beforeEach(async ({ page }) => {
        // Navigate to the application
        await page.goto(BASE_URL);
        
        // Wait for page to load
        await page.waitForLoadState('networkidle');
        
        // Navigate to the Settings tab where store selection happens
        await page.click('button[onclick="showTab(\'settings\')"]');
        
        // Wait for settings tab to be visible
        await page.waitForSelector('#settings-tab.active');
    });

    test('should show and hide refresh button based on store availability', async ({ page }) => {
        // Initially, refresh button should be hidden
        const refreshButtonContainer = page.locator('#storeListActions');
        await expect(refreshButtonContainer).toHaveCSS('display', 'none');
        
        // Enter a ZIP code
        const zipInput = page.locator('#zipCode');
        await zipInput.fill('43123');
        
        // Click find stores
        await page.click('#findStoresBtn');
        
        // Wait for stores to load
        await page.waitForSelector('#storeList option[value]:not([value=""])', { timeout: 10000 });
        
        // Refresh button container should now be visible
        await expect(refreshButtonContainer).toBeVisible();
        
        // The actual refresh button should be present and visible
        const refreshButton = page.locator('.refresh-stores-btn');
        await expect(refreshButton).toBeVisible();
        await expect(refreshButton).toContainText('Refresh');
    });

    test('should successfully refresh store list when clicked', async ({ page }) => {
        // Load initial stores
        await page.locator('#zipCode').fill('43123');
        await page.click('#findStoresBtn');
        
        // Wait for stores to load
        await page.waitForSelector('#storeList option[value]:not([value=""])', { timeout: 10000 });
        
        // Count initial stores
        const initialStoreCount = await page.locator('#storeList option').count();
        expect(initialStoreCount).toBeGreaterThan(1); // Should have at least one store + disabled option
        
        // Click refresh button
        const refreshButton = page.locator('.refresh-stores-btn');
        await refreshButton.click();
        
        // Wait for refresh to complete - look for loading state first
        await expect(refreshButton).toContainText('Refreshing...', { timeout: 2000 });
        
        // Then wait for it to return to normal state
        await expect(refreshButton).toContainText('Refresh', { timeout: 10000 });
        
        // Verify stores are still loaded (count should be > 1)
        const finalStoreCount = await page.locator('#storeList option').count();
        expect(finalStoreCount).toBeGreaterThan(1);
    });

    test('should show loading state during refresh operation', async ({ page }) => {
        // Load stores first
        await page.locator('#zipCode').fill('43123');
        await page.click('#findStoresBtn');
        await page.waitForSelector('#storeList option[value]:not([value=""])', { timeout: 10000 });
        
        const refreshButton = page.locator('.refresh-stores-btn');
        
        // Verify initial state
        await expect(refreshButton).toContainText('Refresh');
        await expect(refreshButton).toBeEnabled();
        
        // Start refresh operation
        await refreshButton.click();
        
        // Should immediately show loading state
        await expect(refreshButton).toContainText('Refreshing...', { timeout: 1000 });
        await expect(refreshButton).toBeDisabled();
        
        // Should eventually return to normal state
        await expect(refreshButton).toContainText('Refresh', { timeout: 10000 });
        await expect(refreshButton).toBeEnabled();
    });

    test('should handle different ZIP codes correctly', async ({ page }) => {
        const testZipCodes = ['43123', '45202', '44101'];
        
        for (const zipCode of testZipCodes) {
            // Clear and enter new ZIP code
            const zipInput = page.locator('#zipCode');
            await zipInput.fill('');
            await zipInput.fill(zipCode);
            
            // Find stores
            await page.click('#findStoresBtn');
            
            // Wait for stores to load
            await page.waitForSelector('#storeList option[value]:not([value=""])', { timeout: 10000 });
            
            // Refresh should work
            const refreshButton = page.locator('.refresh-stores-btn');
            await refreshButton.click();
            
            // Wait for refresh to complete
            await expect(refreshButton).toContainText('Refreshing...', { timeout: 2000 });
            await expect(refreshButton).toContainText('Refresh', { timeout: 10000 });
            
            // Verify ZIP code is preserved
            await expect(zipInput).toHaveValue(zipCode);
        }
    });

    test('should preserve selected store after refresh when possible', async ({ page }) => {
        // Load stores
        await page.locator('#zipCode').fill('43123');
        await page.click('#findStoresBtn');
        await page.waitForSelector('#storeList option[value]:not([value=""])', { timeout: 10000 });
        
        const storeList = page.locator('#storeList');
        
        // Select a store (not the first disabled option)
        const storeOptions = await storeList.locator('option[value]:not([value=""])').all();
        if (storeOptions.length > 0) {
            const firstStoreValue = await storeOptions[0].getAttribute('value');
            await storeList.selectOption(firstStoreValue);
            
            // Verify selection
            await expect(storeList).toHaveValue(firstStoreValue);
            
            // Refresh
            await page.locator('.refresh-stores-btn').click();
            await expect(page.locator('.refresh-stores-btn')).toContainText('Refreshing...', { timeout: 2000 });
            await expect(page.locator('.refresh-stores-btn')).toContainText('Refresh', { timeout: 10000 });
            
            // Check if store is still available and selected
            const updatedOptions = await storeList.locator('option[value]:not([value=""])').all();
            const storeStillExists = await Promise.all(
                updatedOptions.map(async opt => await opt.getAttribute('value'))
            ).then(values => values.includes(firstStoreValue));
            
            if (storeStillExists) {
                await expect(storeList).toHaveValue(firstStoreValue);
            }
        }
    });

    test('should handle multiple rapid clicks gracefully', async ({ page }) => {
        // Load stores
        await page.locator('#zipCode').fill('43123');
        await page.click('#findStoresBtn');
        await page.waitForSelector('#storeList option[value]:not([value=""])', { timeout: 10000 });
        
        const refreshButton = page.locator('.refresh-stores-btn');
        
        // Click multiple times rapidly
        await refreshButton.click();
        await refreshButton.click();
        await refreshButton.click();
        
        // Should handle gracefully - button should be disabled
        await expect(refreshButton).toBeDisabled();
        await expect(refreshButton).toContainText('Refreshing...');
        
        // Should eventually return to normal
        await expect(refreshButton).toContainText('Refresh', { timeout: 10000 });
        await expect(refreshButton).toBeEnabled();
    });

    test('should work with keyboard navigation', async ({ page }) => {
        // Load stores
        await page.locator('#zipCode').fill('43123');
        await page.click('#findStoresBtn');
        await page.waitForSelector('#storeList option[value]:not([value=""])', { timeout: 10000 });
        
        const refreshButton = page.locator('.refresh-stores-btn');
        
        // Focus the button using keyboard
        await refreshButton.focus();
        await expect(refreshButton).toBeFocused();
        
        // Press Enter to activate
        await page.keyboard.press('Enter');
        
        // Should work the same as clicking
        await expect(refreshButton).toContainText('Refreshing...', { timeout: 2000 });
        await expect(refreshButton).toContainText('Refresh', { timeout: 10000 });
    });

    test('should update store count indicator correctly', async ({ page }) => {
        // Load stores
        await page.locator('#zipCode').fill('43123');
        await page.click('#findStoresBtn');
        await page.waitForSelector('#storeList option[value]:not([value=""])', { timeout: 10000 });
        
        // Check if store count is displayed
        const storeCountElement = page.locator('#storeCount');
        if (await storeCountElement.isVisible()) {
            const initialCountText = await storeCountElement.textContent();
            
            // Refresh stores
            await page.locator('.refresh-stores-btn').click();
            await expect(page.locator('.refresh-stores-btn')).toContainText('Refreshing...', { timeout: 2000 });
            await expect(page.locator('.refresh-stores-btn')).toContainText('Refresh', { timeout: 10000 });
            
            // Store count should still be displayed (may be same or different)
            await expect(storeCountElement).toBeVisible();
            const finalCountText = await storeCountElement.textContent();
            expect(finalCountText).toBeTruthy();
        }
    });

    test('should handle API errors gracefully', async ({ page }) => {
        // Load stores first
        await page.locator('#zipCode').fill('43123');
        await page.click('#findStoresBtn');
        await page.waitForSelector('#storeList option[value]:not([value=""])', { timeout: 10000 });
        
        // Mock API failure by intercepting network requests
        await page.route('**/api/stores/**', route => route.abort());
        
        const refreshButton = page.locator('.refresh-stores-btn');
        
        // Click refresh - should handle error gracefully
        await refreshButton.click();
        
        // Button should show loading state briefly
        await expect(refreshButton).toContainText('Refreshing...', { timeout: 2000 });
        
        // Should return to normal state even on error
        await expect(refreshButton).toContainText('Refresh', { timeout: 10000 });
        await expect(refreshButton).toBeEnabled();
        
        // Page should not crash or show uncaught errors
        const errors = [];
        page.on('pageerror', error => errors.push(error));
        
        // Wait a bit to see if any errors occur
        await page.waitForTimeout(1000);
        
        expect(errors.length).toBe(0);
    });

    test('should maintain accessibility standards', async ({ page }) => {
        // Load stores
        await page.locator('#zipCode').fill('43123');
        await page.click('#findStoresBtn');
        await page.waitForSelector('#storeList option[value]:not([value=""])', { timeout: 10000 });
        
        const refreshButton = page.locator('.refresh-stores-btn');
        
        // Check accessibility attributes
        await expect(refreshButton).toHaveAttribute('title');
        
        // Should be keyboard accessible
        await refreshButton.focus();
        await expect(refreshButton).toBeFocused();
        
        // Should have proper role (button elements have implicit button role)
        const role = await refreshButton.getAttribute('role');
        if (role) {
            expect(role).toBe('button');
        }
        
        // Should be able to activate with Space key
        await page.keyboard.press('Space');
        await expect(refreshButton).toContainText('Refreshing...', { timeout: 2000 });
    });

    test('should work correctly after page refresh', async ({ page }) => {
        // Load stores
        await page.locator('#zipCode').fill('43123');
        await page.click('#findStoresBtn');
        await page.waitForSelector('#storeList option[value]:not([value=""])', { timeout: 10000 });
        
        // Verify refresh button works
        const refreshButton = page.locator('.refresh-stores-btn');
        await refreshButton.click();
        await expect(refreshButton).toContainText('Refreshing...', { timeout: 2000 });
        await expect(refreshButton).toContainText('Refresh', { timeout: 10000 });
        
        // Refresh the page
        await page.reload();
        await page.waitForLoadState('networkidle');
        
        // Navigate back to settings
        await page.click('button[onclick="showTab(\'settings\')"]');
        await page.waitForSelector('#settings-tab.active');
        
        // Should work again after page refresh
        await page.locator('#zipCode').fill('43123');
        await page.click('#findStoresBtn');
        await page.waitForSelector('#storeList option[value]:not([value=""])', { timeout: 10000 });
        
        const newRefreshButton = page.locator('.refresh-stores-btn');
        await newRefreshButton.click();
        await expect(newRefreshButton).toContainText('Refreshing...', { timeout: 2000 });
        await expect(newRefreshButton).toContainText('Refresh', { timeout: 10000 });
    });

    test('should provide visual feedback on hover', async ({ page }) => {
        // Load stores
        await page.locator('#zipCode').fill('43123');
        await page.click('#findStoresBtn');
        await page.waitForSelector('#storeList option[value]:not([value=""])', { timeout: 10000 });
        
        const refreshButton = page.locator('.refresh-stores-btn');
        
        // Get initial styles
        const initialCursor = await refreshButton.evaluate(el => 
            window.getComputedStyle(el).cursor
        );
        
        // Hover over button
        await refreshButton.hover();
        
        // Check cursor changes to pointer
        const hoveredCursor = await refreshButton.evaluate(el => 
            window.getComputedStyle(el).cursor
        );
        
        expect(hoveredCursor).toBe('pointer');
    });
});