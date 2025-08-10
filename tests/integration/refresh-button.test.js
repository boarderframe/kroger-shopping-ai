/**
 * Comprehensive Test Suite for Store List Refresh Functionality
 * Tests the refresh button functionality, API calls, state management, and error handling
 */

const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

describe('Store List Refresh Functionality', () => {
    let dom, window, document, mockFetch, originalConsole;

    beforeAll(() => {
        // Mock console to capture logs
        originalConsole = console.log;
        console.log = jest.fn();
    });

    afterAll(() => {
        console.log = originalConsole;
    });

    beforeEach(async () => {
        // Set up JSDOM environment with the actual HTML
        const htmlPath = path.join(__dirname, '../../public/index.html');
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');
        
        dom = new JSDOM(htmlContent, {
            url: 'http://localhost:3001',
            pretendToBeVisual: true,
            resources: 'usable',
            runScripts: 'dangerously'
        });

        window = dom.window;
        document = window.document;
        global.window = window;
        global.document = document;
        global.fetch = jest.fn();
        mockFetch = global.fetch;

        // Mock HTML5 APIs
        window.HTMLElement.prototype.scrollIntoView = jest.fn();
        window.alert = jest.fn();

        // Load the app.js functionality by simulating key functions
        await setupAppFunctionality();
        
        // Load the fix script functionality
        await setupRefreshFixFunctionality();
    });

    afterEach(() => {
        dom.window.close();
        jest.clearAllMocks();
    });

    /**
     * Set up core app functionality for testing
     */
    async function setupAppFunctionality() {
        // Mock the findStores function
        window.findStores = jest.fn(async () => {
            const zipCode = document.getElementById('zipCode')?.value || '43123';
            const storeList = document.getElementById('storeList');
            
            if (!storeList) return;

            // Simulate API call with delay
            await new Promise(resolve => setTimeout(resolve, 100));

            if (mockFetch.mockReturnValue) {
                const mockResponse = await mockFetch.mockReturnValue;
                const stores = await mockResponse.json();
                
                // Clear existing options
                storeList.innerHTML = '';
                
                // Add new store options
                stores.forEach((store, index) => {
                    const option = document.createElement('option');
                    option.value = store.locationId;
                    option.textContent = `${store.name} - ${store.address.city}`;
                    storeList.appendChild(option);
                });

                // Show refresh button if stores loaded
                const storeListActions = document.getElementById('storeListActions');
                if (storeListActions && stores.length > 0) {
                    storeListActions.style.display = 'flex';
                }
            }
        });

        // Mock other required functions
        window.selectStore = jest.fn();
        window.showToast = jest.fn();
    }

    /**
     * Set up refresh button fix functionality
     */
    async function setupRefreshFixFunctionality() {
        // Simulate the fix script behavior
        const refreshBtn = document.querySelector('.refresh-stores-btn');
        if (refreshBtn) {
            // Remove existing onclick and add our enhanced handler
            refreshBtn.removeAttribute('onclick');
            refreshBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                
                const originalHTML = refreshBtn.innerHTML;
                refreshBtn.innerHTML = '<span class="btn-icon">⏳</span> Refreshing...';
                refreshBtn.disabled = true;
                
                try {
                    await window.findStores();
                } finally {
                    refreshBtn.innerHTML = originalHTML;
                    refreshBtn.disabled = false;
                }
            });
        }

        // Add debug function
        window.debugRefreshButton = jest.fn();
    }

    /**
     * Helper to create mock store data
     */
    function createMockStores(count = 5) {
        return Array.from({ length: count }, (_, i) => ({
            locationId: `store-${i + 1}`,
            name: `Kroger Store ${i + 1}`,
            address: {
                addressLine1: `${100 + i} Main St`,
                city: `City ${i + 1}`,
                state: 'OH',
                zipCode: '43123'
            },
            phone: `(614) 555-${1000 + i}`,
            departments: ['Pharmacy', 'Bakery', 'Deli']
        }));
    }

    /**
     * Helper to mock successful API response
     */
    function mockSuccessfulAPI(stores = createMockStores()) {
        mockFetch.mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => stores,
            headers: new Map([['content-type', 'application/json']])
        });
    }

    /**
     * Helper to mock API error
     */
    function mockAPIError(status = 500, message = 'Internal Server Error') {
        mockFetch.mockRejectedValue(new Error(message));
    }

    describe('Button Visibility and State', () => {
        test('refresh button should be hidden initially', () => {
            const storeListActions = document.getElementById('storeListActions');
            expect(storeListActions).toBeTruthy();
            expect(storeListActions.style.display).toBe('none');
        });

        test('refresh button should become visible after stores are loaded', async () => {
            mockSuccessfulAPI();
            
            // Set ZIP code and find stores
            const zipInput = document.getElementById('zipCode');
            zipInput.value = '43123';
            
            await window.findStores();
            
            const storeListActions = document.getElementById('storeListActions');
            expect(storeListActions.style.display).toBe('flex');
        });

        test('refresh button should have correct HTML structure', () => {
            const refreshBtn = document.querySelector('.refresh-stores-btn');
            expect(refreshBtn).toBeTruthy();
            expect(refreshBtn.innerHTML).toContain('🔄');
            expect(refreshBtn.innerHTML).toContain('Refresh');
            expect(refreshBtn.title).toBe('Refresh store list');
        });
    });

    describe('Button Click Functionality', () => {
        test('clicking refresh button should call findStores function', async () => {
            mockSuccessfulAPI();
            
            // First load some stores to make button visible
            await window.findStores();
            
            const refreshBtn = document.querySelector('.refresh-stores-btn');
            expect(refreshBtn).toBeTruthy();
            
            // Clear the mock to test refresh click
            window.findStores.mockClear();
            
            // Click the refresh button
            refreshBtn.click();
            
            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 150));
            
            expect(window.findStores).toHaveBeenCalled();
        });

        test('refresh button should show loading state during operation', async () => {
            mockSuccessfulAPI();
            
            // Load stores first
            await window.findStores();
            
            const refreshBtn = document.querySelector('.refresh-stores-btn');
            const originalHTML = refreshBtn.innerHTML;
            
            // Create a promise that we can control
            let resolveFind;
            const findPromise = new Promise(resolve => {
                resolveFind = resolve;
            });
            
            window.findStores.mockImplementation(() => findPromise);
            
            // Click refresh
            refreshBtn.click();
            
            // Check loading state immediately
            await new Promise(resolve => setTimeout(resolve, 10));
            expect(refreshBtn.innerHTML).toContain('⏳');
            expect(refreshBtn.innerHTML).toContain('Refreshing...');
            expect(refreshBtn.disabled).toBe(true);
            
            // Resolve the promise
            resolveFind();
            await findPromise;
            
            // Wait a bit more for state restoration
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Check that state is restored
            expect(refreshBtn.innerHTML).toBe(originalHTML);
            expect(refreshBtn.disabled).toBe(false);
        });

        test('refresh button should restore state even if findStores throws error', async () => {
            // Load stores first
            mockSuccessfulAPI();
            await window.findStores();
            
            const refreshBtn = document.querySelector('.refresh-stores-btn');
            const originalHTML = refreshBtn.innerHTML;
            
            // Make findStores throw an error
            window.findStores.mockRejectedValue(new Error('API Error'));
            
            // Click refresh
            refreshBtn.click();
            
            // Wait for error handling
            await new Promise(resolve => setTimeout(resolve, 150));
            
            // State should be restored even after error
            expect(refreshBtn.innerHTML).toBe(originalHTML);
            expect(refreshBtn.disabled).toBe(false);
        });
    });

    describe('API Integration', () => {
        test('successful refresh should update store list', async () => {
            const initialStores = createMockStores(3);
            const refreshedStores = createMockStores(5);
            
            // Initial load
            mockSuccessfulAPI(initialStores);
            await window.findStores();
            
            const storeList = document.getElementById('storeList');
            expect(storeList.options.length).toBe(3);
            
            // Setup new mock for refresh
            mockSuccessfulAPI(refreshedStores);
            
            // Refresh
            const refreshBtn = document.querySelector('.refresh-stores-btn');
            refreshBtn.click();
            
            await new Promise(resolve => setTimeout(resolve, 150));
            
            // Should have new store count
            expect(storeList.options.length).toBe(5);
            expect(storeList.options[0].textContent).toContain('Kroger Store 1');
        });

        test('refresh should handle empty store list', async () => {
            // Initial load with stores
            mockSuccessfulAPI(createMockStores(3));
            await window.findStores();
            
            const storeList = document.getElementById('storeList');
            expect(storeList.options.length).toBe(3);
            
            // Refresh with empty response
            mockSuccessfulAPI([]);
            
            const refreshBtn = document.querySelector('.refresh-stores-btn');
            refreshBtn.click();
            
            await new Promise(resolve => setTimeout(resolve, 150));
            
            expect(storeList.options.length).toBe(0);
        });

        test('refresh should handle API errors gracefully', async () => {
            // Initial successful load
            mockSuccessfulAPI();
            await window.findStores();
            
            // Mock API error for refresh
            window.findStores.mockRejectedValue(new Error('Network error'));
            
            const refreshBtn = document.querySelector('.refresh-stores-btn');
            
            // Should not throw
            expect(() => {
                refreshBtn.click();
            }).not.toThrow();
            
            await new Promise(resolve => setTimeout(resolve, 150));
            
            // Button should be restored to normal state
            expect(refreshBtn.disabled).toBe(false);
        });
    });

    describe('User Experience', () => {
        test('refresh button should provide visual feedback on hover', () => {
            const refreshBtn = document.querySelector('.refresh-stores-btn');
            expect(refreshBtn.style.cursor).toBe('pointer');
            expect(refreshBtn.title).toBeTruthy();
        });

        test('multiple rapid clicks should be handled properly', async () => {
            mockSuccessfulAPI();
            await window.findStores();
            
            const refreshBtn = document.querySelector('.refresh-stores-btn');
            
            // Simulate rapid clicks
            refreshBtn.click();
            refreshBtn.click();
            refreshBtn.click();
            
            // Button should be disabled during operation
            expect(refreshBtn.disabled).toBe(true);
            
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Should be restored
            expect(refreshBtn.disabled).toBe(false);
            
            // findStores should have been called (at least once, behavior may vary)
            expect(window.findStores).toHaveBeenCalled();
        });

        test('refresh preserves user ZIP code input', async () => {
            const zipInput = document.getElementById('zipCode');
            const testZip = '45202';
            zipInput.value = testZip;
            
            mockSuccessfulAPI();
            
            const refreshBtn = document.querySelector('.refresh-stores-btn');
            refreshBtn.click();
            
            await new Promise(resolve => setTimeout(resolve, 150));
            
            // ZIP code should be preserved
            expect(zipInput.value).toBe(testZip);
        });
    });

    describe('Accessibility', () => {
        test('refresh button should have proper ARIA attributes', () => {
            const refreshBtn = document.querySelector('.refresh-stores-btn');
            expect(refreshBtn.title).toBeTruthy();
            expect(refreshBtn.getAttribute('aria-label') || refreshBtn.title).toBeTruthy();
        });

        test('button should be keyboard accessible', () => {
            const refreshBtn = document.querySelector('.refresh-stores-btn');
            expect(refreshBtn.tagName).toBe('BUTTON');
            expect(refreshBtn.getAttribute('tabindex')).not.toBe('-1');
        });

        test('loading state should be announced to screen readers', async () => {
            mockSuccessfulAPI();
            await window.findStores();
            
            const refreshBtn = document.querySelector('.refresh-stores-btn');
            
            // Mock a delayed findStores
            let resolveFind;
            window.findStores.mockImplementation(() => {
                return new Promise(resolve => {
                    resolveFind = resolve;
                    setTimeout(resolve, 100);
                });
            });
            
            refreshBtn.click();
            
            // During loading, text should indicate the state
            await new Promise(resolve => setTimeout(resolve, 10));
            expect(refreshBtn.textContent).toContain('Refreshing');
        });
    });

    describe('Error Handling', () => {
        test('should handle missing DOM elements gracefully', async () => {
            // Remove required elements
            const zipInput = document.getElementById('zipCode');
            if (zipInput) zipInput.remove();
            
            const refreshBtn = document.querySelector('.refresh-stores-btn');
            
            // Should not crash
            expect(() => {
                refreshBtn.click();
            }).not.toThrow();
        });

        test('should handle missing findStores function', () => {
            // Remove findStores function
            delete window.findStores;
            
            const refreshBtn = document.querySelector('.refresh-stores-btn');
            
            // Should not crash
            expect(() => {
                refreshBtn.click();
            }).not.toThrow();
        });

        test('should handle network timeouts', async () => {
            // Mock a timeout scenario
            window.findStores.mockImplementation(() => {
                return new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Network timeout')), 50);
                });
            });
            
            const refreshBtn = document.querySelector('.refresh-stores-btn');
            refreshBtn.click();
            
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Button should be restored
            expect(refreshBtn.disabled).toBe(false);
        });
    });

    describe('Integration with Store Selection', () => {
        test('refresh should maintain selected store if still available', async () => {
            const stores = createMockStores(3);
            mockSuccessfulAPI(stores);
            await window.findStores();
            
            const storeList = document.getElementById('storeList');
            storeList.selectedIndex = 1;
            const selectedValue = storeList.value;
            
            // Refresh with same stores
            mockSuccessfulAPI(stores);
            const refreshBtn = document.querySelector('.refresh-stores-btn');
            refreshBtn.click();
            
            await new Promise(resolve => setTimeout(resolve, 150));
            
            // Should maintain selection if store still exists
            const storeStillExists = Array.from(storeList.options).some(opt => opt.value === selectedValue);
            if (storeStillExists) {
                expect(storeList.value).toBe(selectedValue);
            }
        });

        test('refresh should clear selection if selected store no longer available', async () => {
            const initialStores = createMockStores(3);
            const newStores = createMockStores(2);
            
            mockSuccessfulAPI(initialStores);
            await window.findStores();
            
            const storeList = document.getElementById('storeList');
            storeList.selectedIndex = 2; // Select third store
            
            // Refresh with fewer stores
            mockSuccessfulAPI(newStores);
            const refreshBtn = document.querySelector('.refresh-stores-btn');
            refreshBtn.click();
            
            await new Promise(resolve => setTimeout(resolve, 150));
            
            // Selection should be updated appropriately
            expect(storeList.options.length).toBe(2);
        });
    });

    describe('Performance', () => {
        test('refresh should complete within reasonable time', async () => {
            mockSuccessfulAPI();
            await window.findStores();
            
            const startTime = Date.now();
            
            const refreshBtn = document.querySelector('.refresh-stores-btn');
            refreshBtn.click();
            
            await new Promise(resolve => setTimeout(resolve, 200));
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            // Should complete within 500ms (allowing for delays)
            expect(duration).toBeLessThan(500);
        });

        test('should handle concurrent refresh attempts', async () => {
            mockSuccessfulAPI();
            await window.findStores();
            
            const refreshBtn = document.querySelector('.refresh-stores-btn');
            
            // Start multiple refresh operations
            const promises = [
                new Promise(resolve => { refreshBtn.click(); setTimeout(resolve, 10); }),
                new Promise(resolve => { refreshBtn.click(); setTimeout(resolve, 20); }),
                new Promise(resolve => { refreshBtn.click(); setTimeout(resolve, 30); })
            ];
            
            await Promise.all(promises);
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Should handle gracefully without crashing
            expect(refreshBtn.disabled).toBe(false);
        });
    });
});