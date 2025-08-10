/**
 * Search Diagnostic and Auto-Fix Script
 * This script diagnoses and fixes search display issues
 */

(function() {
    console.log('🔍 Search Diagnostic: Starting comprehensive diagnosis...');
    
    let diagnosticResults = {
        backendWorking: false,
        domElementsPresent: false,
        functionsPresent: false,
        displayIssue: false,
        rootCause: null
    };
    
    // Test 1: Check if all required DOM elements exist
    function checkDOMElements() {
        console.log('🔍 Test 1: Checking DOM elements...');
        const requiredElements = [
            'searchTerm',
            'searchResults', 
            'searchResultsHeader',
            'noResultsState',
            'search-tab'
        ];
        
        let allPresent = true;
        requiredElements.forEach(id => {
            const element = document.getElementById(id);
            if (!element) {
                console.error(`  ❌ Missing element: #${id}`);
                allPresent = false;
            } else {
                console.log(`  ✅ Found element: #${id}`);
            }
        });
        
        diagnosticResults.domElementsPresent = allPresent;
        return allPresent;
    }
    
    // Test 2: Check if required functions exist
    function checkFunctions() {
        console.log('🔍 Test 2: Checking functions...');
        const requiredFunctions = [
            'searchProducts',
            'displayProducts',
            'displaySearchResults',
            'createProductCard',
            'showTab'
        ];
        
        let allPresent = true;
        requiredFunctions.forEach(fn => {
            if (typeof window[fn] !== 'function') {
                console.error(`  ❌ Missing function: ${fn}`);
                allPresent = false;
            } else {
                console.log(`  ✅ Found function: ${fn}`);
            }
        });
        
        diagnosticResults.functionsPresent = allPresent;
        return allPresent;
    }
    
    // Test 3: Test backend API
    async function testBackendAPI() {
        console.log('🔍 Test 3: Testing backend API...');
        try {
            const testStoreId = window.selectedStoreId || localStorage.getItem('defaultStoreId') || '01400943';
            const response = await fetch(`/api/products/search?term=milk&locationId=${testStoreId}&limit=5`);
            
            if (!response.ok) {
                console.error(`  ❌ API returned error: ${response.status}`);
                return false;
            }
            
            const data = await response.json();
            if (data && data.length > 0) {
                console.log(`  ✅ API working: returned ${data.length} products`);
                diagnosticResults.backendWorking = true;
                return true;
            } else {
                console.error('  ❌ API returned no products');
                return false;
            }
        } catch (error) {
            console.error('  ❌ API test failed:', error);
            return false;
        }
    }
    
    // Test 4: Check display chain
    async function testDisplayChain() {
        console.log('🔍 Test 4: Testing display chain...');
        
        // Create test products
        const testProducts = [
            {
                id: 'test1',
                name: 'Test Product 1',
                brand: 'Test Brand',
                price: 9.99,
                image: null
            }
        ];
        
        // Set global variables
        window.currentProducts = testProducts;
        window.allProducts = testProducts;
        
        // Try to display
        if (window.displayProducts) {
            console.log('  Calling displayProducts...');
            window.displayProducts(testProducts);
            
            // Check if products were rendered
            setTimeout(() => {
                const searchResults = document.getElementById('searchResults');
                if (searchResults && searchResults.children.length > 0) {
                    console.log(`  ✅ Display chain working: ${searchResults.children.length} items rendered`);
                } else {
                    console.error('  ❌ Display chain broken: no items rendered');
                    diagnosticResults.displayIssue = true;
                }
            }, 500);
        }
    }
    
    // Apply fixes based on diagnosis
    function applyFixes() {
        console.log('🔧 Applying fixes based on diagnosis...');
        
        // Fix 1: Ensure search tab is visible
        const searchTab = document.getElementById('search-tab');
        if (searchTab) {
            searchTab.classList.add('active');
            searchTab.style.display = 'block';
            console.log('  ✅ Fixed: Search tab made active');
        }
        
        // Fix 2: Override displayProducts to force visibility
        const originalDisplayProducts = window.displayProducts;
        window.displayProducts = function(products) {
            console.log('  🔧 Fixed displayProducts called with', products?.length || 0, 'products');
            
            // Call original
            if (originalDisplayProducts) {
                originalDisplayProducts.call(this, products);
            }
            
            // Force visibility
            const searchResults = document.getElementById('searchResults');
            if (searchResults) {
                // Clear any conflicting styles
                searchResults.style.display = '';
                searchResults.style.visibility = '';
                searchResults.style.opacity = '';
                
                // Apply correct display based on layout
                if (window.currentGridLayout === 'masonry') {
                    searchResults.style.display = 'block';
                } else {
                    searchResults.style.display = 'grid';
                }
                
                // Ensure parent containers are visible
                let parent = searchResults.parentElement;
                while (parent && parent !== document.body) {
                    if (window.getComputedStyle(parent).display === 'none') {
                        parent.style.display = '';
                    }
                    parent = parent.parentElement;
                }
                
                console.log('  ✅ Fixed: Forced searchResults visibility');
            }
        };
        
        // Fix 3: Override searchProducts to ensure complete flow
        const originalSearchProducts = window.searchProducts;
        window.searchProducts = async function() {
            console.log('  🔧 Fixed searchProducts called');
            
            try {
                // Call original
                if (originalSearchProducts) {
                    await originalSearchProducts.call(this);
                }
                
                // Ensure visibility after search
                setTimeout(() => {
                    const searchResults = document.getElementById('searchResults');
                    const resultsHeader = document.getElementById('searchResultsHeader');
                    
                    if (window.currentProducts && window.currentProducts.length > 0) {
                        if (searchResults) {
                            searchResults.style.display = window.currentGridLayout === 'masonry' ? 'block' : 'grid';
                            console.log('  ✅ Post-search: Made searchResults visible');
                        }
                        if (resultsHeader) {
                            resultsHeader.style.display = 'block';
                            console.log('  ✅ Post-search: Made resultsHeader visible');
                        }
                    }
                }, 100);
                
            } catch (error) {
                console.error('  ❌ Error in fixed searchProducts:', error);
            }
        };
        
        console.log('🔧 All fixes applied!');
    }
    
    // Run diagnostics
    async function runDiagnostics() {
        console.log('🔍 Running comprehensive diagnostics...');
        
        checkDOMElements();
        checkFunctions();
        await testBackendAPI();
        await testDisplayChain();
        
        // Determine root cause
        if (!diagnosticResults.domElementsPresent) {
            diagnosticResults.rootCause = 'Missing DOM elements';
        } else if (!diagnosticResults.functionsPresent) {
            diagnosticResults.rootCause = 'Missing JavaScript functions';
        } else if (!diagnosticResults.backendWorking) {
            diagnosticResults.rootCause = 'Backend API not responding';
        } else if (diagnosticResults.displayIssue) {
            diagnosticResults.rootCause = 'Display/rendering issue';
        } else {
            diagnosticResults.rootCause = 'Unknown issue';
        }
        
        console.log('📊 Diagnostic Summary:', diagnosticResults);
        
        // Apply fixes
        applyFixes();
        
        // Add manual test button
        addManualTestButton();
    }
    
    // Add a button for manual testing
    function addManualTestButton() {
        const button = document.createElement('button');
        button.textContent = '🔍 Test Search';
        button.style.cssText = `
            position: fixed;
            bottom: 70px;
            right: 20px;
            z-index: 10000;
            padding: 10px 20px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
        `;
        button.onclick = async function() {
            console.log('🔍 Manual test triggered');
            
            // Ensure we have a store
            if (!window.selectedStoreId) {
                const storeId = localStorage.getItem('defaultStoreId');
                if (storeId) {
                    window.selectedStoreId = storeId;
                    window.selectedStoreName = localStorage.getItem('defaultStoreName') || 'Default Store';
                } else {
                    alert('Please select a store first!');
                    return;
                }
            }
            
            // Set search term
            const searchInput = document.getElementById('searchTerm');
            if (searchInput) {
                searchInput.value = 'milk';
            }
            
            // Trigger search
            if (window.searchProducts) {
                await window.searchProducts();
                
                // Check results
                setTimeout(() => {
                    const searchResults = document.getElementById('searchResults');
                    if (searchResults && searchResults.children.length > 0) {
                        alert(`Success! ${searchResults.children.length} products displayed.`);
                    } else {
                        alert('Search completed but no products visible. Check console for details.');
                    }
                }, 1000);
            }
        };
        document.body.appendChild(button);
    }
    
    // Wait for page to load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runDiagnostics);
    } else {
        // Delay to ensure app.js is loaded
        setTimeout(runDiagnostics, 1000);
    }
    
    console.log('🔍 Search Diagnostic: Script loaded');
})();