/**
 * Search Functionality Fix
 * This script fixes the issue where search results are not displaying
 * Root cause: Display logic is working but results may be hidden or cleared
 */

(function() {
    console.log('🔧 Search Fix: Initializing search display fix...');
    
    // Store original functions to wrap them
    const originalSearchProducts = window.searchProducts;
    const originalDisplayProducts = window.displayProducts;
    const originalDisplaySearchResults = window.displaySearchResults;
    
    // Override searchProducts to ensure proper display
    window.searchProducts = async function() {
        console.log('🔧 Search Fix: searchProducts intercepted');
        
        try {
            // Call original function
            if (originalSearchProducts) {
                await originalSearchProducts.call(this);
            }
            
            // Ensure search tab is visible
            const searchTab = document.getElementById('search-tab');
            if (searchTab && !searchTab.classList.contains('active')) {
                console.log('🔧 Search Fix: Activating search tab');
                // Do not auto-switch tabs
            }
            
            // Ensure results container is visible
            const searchResults = document.getElementById('searchResults');
            if (searchResults) {
                searchResults.style.display = 'grid';
                searchResults.style.visibility = 'visible';
                searchResults.style.opacity = '1';
                console.log('🔧 Search Fix: Made searchResults visible');
                
                // Check if results were populated
                if (searchResults.children.length === 0 && window.currentProducts && window.currentProducts.length > 0) {
                    console.log('🔧 Search Fix: Results container empty but products exist, re-displaying...');
                    if (window.displayProducts) {
                        window.displayProducts(window.currentProducts);
                    }
                }
            }
            
            // Ensure results header is visible
            const resultsHeader = document.getElementById('searchResultsHeader');
            if (resultsHeader && window.currentProducts && window.currentProducts.length > 0) {
                resultsHeader.style.display = 'block';
                resultsHeader.style.visibility = 'visible';
                console.log('🔧 Search Fix: Made resultsHeader visible');
            }
            
            // Hide no results state if we have products
            const noResultsState = document.getElementById('noResultsState');
            if (noResultsState && window.currentProducts && window.currentProducts.length > 0) {
                noResultsState.style.display = 'none';
                console.log('🔧 Search Fix: Hid no results state');
            }
            
        } catch (error) {
            console.error('🔧 Search Fix: Error in searchProducts wrapper:', error);
        }
    };
    
    // Override displayProducts to ensure visibility
    window.displayProducts = function(products) {
        console.log('🔧 Search Fix: displayProducts intercepted with', products?.length || 0, 'products');
        
        // Call original function
        if (originalDisplayProducts) {
            originalDisplayProducts.call(this, products);
        }
        
        // Ensure container is visible after display
        setTimeout(() => {
            const searchResults = document.getElementById('searchResults');
            if (searchResults) {
                searchResults.style.display = 'grid';
                searchResults.style.visibility = 'visible';
                searchResults.style.opacity = '1';
                
                // Log current state
                console.log('🔧 Search Fix: Post-display check:');
                console.log('  - Children count:', searchResults.children.length);
                console.log('  - Display:', searchResults.style.display);
                console.log('  - Visibility:', searchResults.style.visibility);
                console.log('  - Parent display:', searchResults.parentElement?.style.display);
                
                // Check if parent containers are visible
                let parent = searchResults.parentElement;
                while (parent && parent !== document.body) {
                    if (window.getComputedStyle(parent).display === 'none') {
                        console.warn('🔧 Search Fix: Parent element hidden:', parent);
                        parent.style.display = '';
                    }
                    parent = parent.parentElement;
                }
            }
        }, 100);
    };
    
    // Override displaySearchResults to ensure visibility
    window.displaySearchResults = function(products, query) {
        console.log('🔧 Search Fix: displaySearchResults intercepted');
        
        // Call original function
        if (originalDisplaySearchResults) {
            originalDisplaySearchResults.call(this, products, query);
        }
        
        // Ensure visibility
        const resultsHeader = document.getElementById('searchResultsHeader');
        const searchResults = document.getElementById('searchResults');
        const noResultsState = document.getElementById('noResultsState');
        
        if (products && products.length > 0) {
            if (resultsHeader) {
                resultsHeader.style.display = 'block';
                resultsHeader.style.visibility = 'visible';
            }
            if (searchResults) {
                searchResults.style.display = 'grid';
                searchResults.style.visibility = 'visible';
                searchResults.style.opacity = '1';
            }
            if (noResultsState) {
                noResultsState.style.display = 'none';
            }
            console.log('🔧 Search Fix: Ensured all elements are visible for results display');
        }
    };
    
    // Add a manual fix button for debugging
    function addDebugButton() {
        const button = document.createElement('button');
        button.textContent = '🔧 Fix Search Display';
        button.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 10000;
            padding: 10px 20px;
            background: #ff6b00;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
        `;
        button.onclick = function() {
            console.log('🔧 Manual fix triggered');
            
            // Ensure search tab is active
            // Do not auto-switch tabs
            
            // Make all search elements visible
            const elements = [
                'searchResults',
                'searchResultsHeader',
                'search-tab'
            ];
            
            elements.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.style.display = '';
                    el.style.visibility = 'visible';
                    el.style.opacity = '1';
                    console.log(`🔧 Fixed visibility for #${id}`);
                }
            });
            
            // Re-display current products if they exist
            if (window.currentProducts && window.currentProducts.length > 0) {
                console.log('🔧 Re-displaying', window.currentProducts.length, 'products');
                if (window.displayProducts) {
                    window.displayProducts(window.currentProducts);
                }
            }
            
            alert('Search display fixed! Check console for details.');
        };
        document.body.appendChild(button);
    }
    
    // Initialize fix when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addDebugButton);
    } else {
        addDebugButton();
    }
    
    console.log('🔧 Search Fix: Initialization complete');
})();