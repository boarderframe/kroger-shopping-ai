// Fix for Store List Refresh Button
// This script ensures the refresh button works properly

(function() {
    'use strict';
    
    console.log('Store Refresh Fix: Initializing...');
    
    // Function to ensure refresh button is properly bound
    function fixRefreshButton() {
        const refreshBtn = document.querySelector('.refresh-stores-btn');
        const storeListActions = document.getElementById('storeListActions');
        
        if (!refreshBtn) {
            console.log('Store Refresh Fix: Refresh button not found yet');
            return false;
        }
        
        console.log('Store Refresh Fix: Found refresh button');
        
        // Remove any existing onclick handler and re-add it
        refreshBtn.removeAttribute('onclick');
        
        // Add proper click handler
        refreshBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Store Refresh Fix: Refresh button clicked');
            
            // Check if findStores function exists
            if (typeof window.findStores === 'function') {
                console.log('Store Refresh Fix: Calling findStores()');
                
                // Show visual feedback
                const originalHTML = refreshBtn.innerHTML;
                refreshBtn.innerHTML = '<span class="btn-icon">⏳</span> Refreshing...';
                refreshBtn.disabled = true;
                
                // Call findStores and handle promise
                Promise.resolve(window.findStores()).then(() => {
                    console.log('Store Refresh Fix: findStores completed successfully');
                }).catch(error => {
                    console.error('Store Refresh Fix: Error in findStores:', error);
                }).finally(() => {
                    // Restore button state
                    refreshBtn.innerHTML = originalHTML;
                    refreshBtn.disabled = false;
                });
            } else {
                console.error('Store Refresh Fix: findStores function not found!');
                alert('Error: Store refresh function not available. Please refresh the page.');
            }
        });
        
        // Also ensure the button is visible when stores are loaded
        const storeList = document.getElementById('storeList');
        if (storeList && storeList.options.length > 1) {
            if (storeListActions) {
                storeListActions.style.display = 'flex';
                console.log('Store Refresh Fix: Made refresh button visible');
            }
        }
        
        // Add hover effect for better UX
        refreshBtn.style.cursor = 'pointer';
        refreshBtn.title = 'Click to refresh the store list';
        
        console.log('Store Refresh Fix: Button handler attached successfully');
        return true;
    }
    
    // Function to monitor store list changes and ensure button visibility
    function monitorStoreList() {
        const storeList = document.getElementById('storeList');
        const storeListActions = document.getElementById('storeListActions');
        
        if (!storeList || !storeListActions) {
            return;
        }
        
        // Create observer to watch for store list changes
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList') {
                    // Check if stores are loaded
                    if (storeList.options.length > 1 && storeList.options[0].value !== '') {
                        storeListActions.style.display = 'flex';
                        console.log('Store Refresh Fix: Stores loaded, showing refresh button');
                    }
                }
            });
        });
        
        // Start observing
        observer.observe(storeList, {
            childList: true,
            subtree: false
        });
        
        console.log('Store Refresh Fix: Store list observer attached');
    }
    
    // Function to add visual feedback
    function addVisualFeedback() {
        const style = document.createElement('style');
        style.textContent = `
            .refresh-stores-btn {
                transition: all 0.3s ease;
            }
            .refresh-stores-btn:hover:not(:disabled) {
                background: #e9ecef !important;
                border-color: #0066cc !important;
                transform: scale(1.02);
            }
            .refresh-stores-btn:active:not(:disabled) {
                transform: scale(0.98);
            }
            .refresh-stores-btn:disabled {
                opacity: 0.6;
                cursor: not-allowed !important;
            }
            .refresh-stores-btn .btn-icon {
                display: inline-block;
                transition: transform 0.5s ease;
            }
            .refresh-stores-btn:hover .btn-icon {
                transform: rotate(180deg);
            }
        `;
        document.head.appendChild(style);
        console.log('Store Refresh Fix: Added visual feedback styles');
    }
    
    // Main initialization
    function initialize() {
        console.log('Store Refresh Fix: Starting initialization...');
        
        // Add visual feedback styles
        addVisualFeedback();
        
        // Try to fix the button immediately
        if (!fixRefreshButton()) {
            // If button not found, wait for DOM
            console.log('Store Refresh Fix: Waiting for DOM...');
            
            // Use multiple strategies to ensure we catch the button
            
            // Strategy 1: DOMContentLoaded
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', function() {
                    console.log('Store Refresh Fix: DOM loaded');
                    setTimeout(fixRefreshButton, 100);
                    monitorStoreList();
                });
            }
            
            // Strategy 2: MutationObserver for button appearance
            const bodyObserver = new MutationObserver(function(mutations, observer) {
                if (fixRefreshButton()) {
                    observer.disconnect();
                    monitorStoreList();
                }
            });
            
            bodyObserver.observe(document.body, {
                childList: true,
                subtree: true
            });
            
            // Strategy 3: Periodic check (fallback)
            let attempts = 0;
            const checkInterval = setInterval(function() {
                attempts++;
                console.log(`Store Refresh Fix: Attempt ${attempts} to find button...`);
                
                if (fixRefreshButton() || attempts > 20) {
                    clearInterval(checkInterval);
                    monitorStoreList();
                    if (attempts > 20) {
                        console.error('Store Refresh Fix: Max attempts reached');
                    }
                }
            }, 500);
        } else {
            // Button found immediately
            monitorStoreList();
        }
        
        // Also fix any Find Stores buttons
        setTimeout(function() {
            const findStoresBtn = document.getElementById('findStoresBtn');
            if (findStoresBtn && !findStoresBtn.hasAttribute('data-fixed')) {
                findStoresBtn.setAttribute('data-fixed', 'true');
                console.log('Store Refresh Fix: Enhanced Find Stores button');
            }
        }, 1000);
    }
    
    // Start the fix
    initialize();
    
    // Expose debug function
    window.debugRefreshButton = function() {
        const refreshBtn = document.querySelector('.refresh-stores-btn');
        const storeListActions = document.getElementById('storeListActions');
        const storeList = document.getElementById('storeList');
        
        console.log('=== Refresh Button Debug Info ===');
        console.log('Refresh button found:', !!refreshBtn);
        if (refreshBtn) {
            console.log('- HTML:', refreshBtn.outerHTML);
            console.log('- onclick attribute:', refreshBtn.getAttribute('onclick'));
            console.log('- onclick property:', refreshBtn.onclick);
            console.log('- Disabled:', refreshBtn.disabled);
            console.log('- Display style:', window.getComputedStyle(refreshBtn).display);
            console.log('- Visibility:', window.getComputedStyle(refreshBtn).visibility);
        }
        console.log('Store list actions found:', !!storeListActions);
        if (storeListActions) {
            console.log('- Display:', storeListActions.style.display);
            console.log('- Computed display:', window.getComputedStyle(storeListActions).display);
        }
        console.log('Store list found:', !!storeList);
        if (storeList) {
            console.log('- Options count:', storeList.options.length);
            console.log('- First option:', storeList.options[0]?.text);
        }
        console.log('findStores function available:', typeof window.findStores === 'function');
        console.log('=================================');
    };
    
    console.log('Store Refresh Fix: Script loaded. Use debugRefreshButton() to debug.');
    
})();