// Search Integration Patch
// Final fixes to ensure smooth search functionality

(function() {
    console.log('🔧 Search Integration Patch Loading...');
    
    // Ensure showToast function exists
    if (!window.showToast) {
        window.showToast = function(title, message, type = 'info') {
            console.log(`[${type.toUpperCase()}] ${title}: ${message}`);
            
            const toastContainer = document.getElementById('toastContainer');
            if (!toastContainer) return;
            
            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            toast.innerHTML = `
                <div class="toast-header">${title}</div>
                <div class="toast-body">${message}</div>
            `;
            
            toastContainer.appendChild(toast);
            
            setTimeout(() => {
                toast.classList.add('show');
            }, 10);
            
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        };
    }
    
    // Ensure showTab function exists
    if (!window.showTab) {
        window.showTab = function(tabName) {
            console.log(`Switching to ${tabName} tab`);
            
            // Hide all tabs
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Show selected tab
            const selectedTab = document.getElementById(`${tabName}-tab`);
            if (selectedTab) {
                selectedTab.classList.add('active');
            }
            
            // Update tab buttons
            document.querySelectorAll('.tab-button').forEach(btn => {
                btn.classList.remove('active');
                btn.setAttribute('aria-selected', 'false');
            });
            
            // Find and activate the corresponding button
            const activeButton = Array.from(document.querySelectorAll('.tab-button')).find(
                btn => btn.textContent.toLowerCase().includes(tabName.toLowerCase())
            );
            if (activeButton) {
                activeButton.classList.add('active');
                activeButton.setAttribute('aria-selected', 'true');
            }
        };
    }
    
    // Fix search input focus issues
    function fixSearchInput() {
        const searchInput = document.getElementById('searchTerm');
        if (!searchInput) return;
        
        // Prevent auto-focus causing unwanted searches
        searchInput.setAttribute('autocomplete', 'off');
        
        // Clear any pre-filled values
        if (searchInput.value && !sessionStorage.getItem('intentionalSearch')) {
            searchInput.value = '';
        }
        
        // Add better placeholder based on store selection
        function updatePlaceholder() {
            if (window.selectedStoreId) {
                searchInput.placeholder = 'Search for products, brands, or categories...';
                searchInput.disabled = false;
            } else {
                searchInput.placeholder = 'Select a store first to search products';
                searchInput.disabled = true;
            }
        }
        
        updatePlaceholder();
        
        // Update placeholder when store changes
        const observer = new MutationObserver(updatePlaceholder);
        const footerStore = document.getElementById('currentStore');
        if (footerStore) {
            observer.observe(footerStore, { childList: true, characterData: true, subtree: true });
        }
    }
    
    // Add toast notification styles
    function addToastStyles() {
        if (document.getElementById('toastStyles')) return;
        
        const style = document.createElement('style');
        style.id = 'toastStyles';
        style.textContent = `
            .toast-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                pointer-events: none;
            }
            
            .toast {
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                margin-bottom: 12px;
                min-width: 300px;
                max-width: 400px;
                overflow: hidden;
                opacity: 0;
                transform: translateX(100%);
                transition: all 0.3s ease;
                pointer-events: auto;
            }
            
            .toast.show {
                opacity: 1;
                transform: translateX(0);
            }
            
            .toast-header {
                padding: 12px 16px;
                font-weight: 600;
                border-bottom: 1px solid #eee;
            }
            
            .toast-body {
                padding: 12px 16px;
                font-size: 14px;
                color: #666;
            }
            
            .toast-success .toast-header {
                background: #d4edda;
                color: #155724;
            }
            
            .toast-error .toast-header {
                background: #f8d7da;
                color: #721c24;
            }
            
            .toast-warning .toast-header {
                background: #fff3cd;
                color: #856404;
            }
            
            .toast-info .toast-header {
                background: #d1ecf1;
                color: #0c5460;
            }
            
            @media (max-width: 768px) {
                .toast-container {
                    left: 10px;
                    right: 10px;
                    top: 10px;
                }
                
                .toast {
                    min-width: auto;
                    max-width: none;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Ensure search functionality is properly initialized
    function ensureSearchFunctionality() {
        // Check if critical functions exist
        const requiredFunctions = [
            'searchProducts',
            'displaySearchResults',
            'displayProducts',
            'filterProducts',
            'selectStore',
            'findStores'
        ];
        
        const missingFunctions = requiredFunctions.filter(fn => !window[fn]);
        
        if (missingFunctions.length > 0) {
            console.warn('Missing functions:', missingFunctions);
            
            // Provide basic fallback for searchProducts if missing
            if (!window.searchProducts) {
                window.searchProducts = async function() {
                    const searchInput = document.getElementById('searchTerm');
                    const searchTerm = searchInput?.value?.trim();
                    
                    if (!searchTerm) {
                        // Quiet mode: avoid info toast
                        // showToast('Search', 'Please enter a search term', 'info');
                        return;
                    }
                    
                    if (!window.selectedStoreId) {
                        // Quiet mode
                        // showToast('Store Required', 'Please select a store first', 'warning');
                        showTab('settings');
                        return;
                    }
                    
                    // Quiet mode
                    // showToast('Search', `Searching for "${searchTerm}"...`, 'info');
                };
            }
        }
    }
    
    // Monitor for search result updates
    function monitorSearchResults() {
        const searchResults = document.getElementById('searchResults');
        if (!searchResults) return;
        
        // Create observer to detect when results are added
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length > 0) {
                    // Ensure results are visible
                    searchResults.style.display = 'grid';
                    searchResults.style.visibility = 'visible';
                    searchResults.style.opacity = '1';
                    
                    // Log for debugging
                    const productCards = searchResults.querySelectorAll('.product-card');
                    console.log(`✅ Search results updated: ${productCards.length} products displayed`);
                }
            });
        });
        
        observer.observe(searchResults, {
            childList: true,
            subtree: true
        });
    }
    
    // Initialize all patches
    function initialize() {
        console.log('🚀 Initializing search integration patches...');
        
        // Add required styles
        addToastStyles();
        
        // Fix search input
        fixSearchInput();
        
        // Ensure functionality
        ensureSearchFunctionality();
        
        // Monitor results
        monitorSearchResults();
        
        // Set initialization flag
        sessionStorage.setItem('searchPatchApplied', 'true');
        
        console.log('✅ Search integration patches applied');
    }
    
    // Apply patches after other scripts have loaded
    if (document.readyState === 'complete') {
        setTimeout(initialize, 500);
    } else {
        window.addEventListener('load', () => {
            setTimeout(initialize, 500);
        });
    }
    
})();