/**
 * Store Persistence Fix - Complete Solution
 * Fixes all store persistence issues and ensures proper integration
 */

(function() {
  console.log('[StoreFix] Initializing complete store persistence fix...');
  
  let initialized = false;
  let initAttempts = 0;
  const MAX_INIT_ATTEMPTS = 10;
  
  /**
   * Wait for all required dependencies
   */
  function waitForDependencies() {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        initAttempts++;
        
        // Check for required components
        const hasStoreManager = window.storeManager && typeof window.storeManager.initialize === 'function';
        const hasToastManager = window.toastManager && typeof window.toastManager.show === 'function';
        const hasInitManager = window.initManager && typeof window.initManager.initialize === 'function';
        
        if (hasStoreManager && hasToastManager) {
          clearInterval(checkInterval);
          console.log('[StoreFix] All dependencies loaded');
          resolve();
        } else if (initAttempts >= MAX_INIT_ATTEMPTS) {
          clearInterval(checkInterval);
          console.warn('[StoreFix] Dependencies not found after max attempts, proceeding anyway');
          resolve();
        } else {
          console.log(`[StoreFix] Waiting for dependencies... (attempt ${initAttempts})`);
        }
      }, 500);
    });
  }
  
  /**
   * Override problematic functions that show incorrect toast messages
   */
  function overrideProblematicFunctions() {
    console.log('[StoreFix] Overriding problematic functions...');
    
    // Create a wrapper for showToast to filter out incorrect messages
    const originalShowToast = window.showToast;
    if (originalShowToast) {
      window.showToast = function(message, type) {
        // Filter out "default store not set" messages if store actually exists
        if (message && typeof message === 'string') {
          const lowerMessage = message.toLowerCase();
          const hasStoreIssue = lowerMessage.includes('store not') || 
                                lowerMessage.includes('no store') || 
                                lowerMessage.includes('select a store');
          
          if (hasStoreIssue) {
            // Check if we actually have a store
            const store = window.storeManager ? window.storeManager.getStore() : null;
            if (store && store.id) {
              console.log('[StoreFix] Suppressed incorrect "no store" message - store exists:', store.name);
              return; // Don't show the message
            }
          }
        }
        
        // Call original function
        return originalShowToast.call(this, message, type);
      };
    }
    
    // Override searchProducts to ensure proper store checking
    const originalSearchProducts = window.searchProducts;
    if (originalSearchProducts && window.storeManager) {
      window.searchProducts = async function() {
        console.log('[StoreFix] searchProducts intercepted - checking store...');
        
        try {
          // Ensure store is initialized
          if (!window.storeManager.isInitialized) {
            await window.storeManager.initialize();
          }
          
          const store = window.storeManager.getStore();
          if (store && store.id) {
            // Update global variables for backward compatibility
            window.selectedStoreId = store.locationId || store.id;
            window.selectedStoreName = store.name;
            console.log('[StoreFix] Store confirmed:', store.name);
          }
        } catch (error) {
          console.error('[StoreFix] Error checking store:', error);
        }
        
        // Call original function
        return originalSearchProducts.call(this);
      };
    }
  }
  
  /**
   * Fix localStorage synchronization issues
   */
  function fixLocalStorageSync() {
    console.log('[StoreFix] Fixing localStorage synchronization...');
    
    // Listen for storage events from other tabs
    window.addEventListener('storage', (event) => {
      if (!event.key) return;
      
      // Check if it's a store-related key
      const storeKeys = ['kroger_store_id', 'kroger_store_name', 'kroger_store_address'];
      if (storeKeys.includes(event.key)) {
        console.log('[StoreFix] Store data changed in another tab:', event.key);
        
        // Reload store data
        if (window.storeManager) {
          window.storeManager.loadStore().then(() => {
            const store = window.storeManager.getStore();
            if (store) {
              // Update global variables
              window.selectedStoreId = store.locationId || store.id;
              window.selectedStoreName = store.name;
              
              // Update UI
              updateUIWithStore(store);
            }
          });
        }
      }
    });
  }
  
  /**
   * Update UI elements with store information
   */
  function updateUIWithStore(store) {
    if (!store) return;
    
    console.log('[StoreFix] Updating UI with store:', store.name);
    
    // Update footer
    const footerStore = document.getElementById('currentStore');
    if (footerStore) {
      footerStore.textContent = store.name;
    }
    
    // Update settings display
    const selectedStoreInfo = document.getElementById('selectedStoreInfo');
    if (selectedStoreInfo) {
      selectedStoreInfo.innerHTML = `
        <div class="store-info-card">
          <h3>Current Store</h3>
          <p class="store-name"><strong>${store.name}</strong></p>
          ${store.address ? `<p class="store-address">${store.address}</p>` : ''}
          ${store.phone ? `<p class="store-phone">Phone: ${store.phone}</p>` : ''}
        </div>
      `;
    }
    
    // Enable search functionality
    const searchInput = document.getElementById('searchTerm');
    if (searchInput) {
      searchInput.disabled = false;
      searchInput.placeholder = 'Search for products, brands, or categories...';
    }
    
    // Update any store display elements
    document.querySelectorAll('[data-store-display]').forEach(element => {
      const field = element.dataset.storeDisplay;
      if (store[field]) {
        element.textContent = store[field];
      }
    });
  }
  
  /**
   * Monitor and fix race conditions
   */
  function monitorRaceConditions() {
    console.log('[StoreFix] Setting up race condition monitoring...');
    
    // Monitor for elements that might be created dynamically
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          // Check if store selector was added
          const storeSelect = document.getElementById('storeSelect');
          if (storeSelect && !storeSelect.dataset.fixed) {
            storeSelect.dataset.fixed = 'true';
            
            // Ensure current store is selected
            if (window.storeManager) {
              const store = window.storeManager.getStore();
              if (store && store.id) {
                storeSelect.value = store.id;
              }
            }
          }
          
          // Check if search input was added
          const searchInput = document.getElementById('searchTerm');
          if (searchInput && !searchInput.dataset.fixed) {
            searchInput.dataset.fixed = 'true';
            
            // Enable/disable based on store
            if (window.storeManager) {
              const store = window.storeManager.getStore();
              searchInput.disabled = !store || !store.id;
            }
          }
        }
      });
    });
    
    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  /**
   * Ensure store persists across page navigation
   */
  function ensureStorePersistence() {
    console.log('[StoreFix] Ensuring store persistence...');
    
    // Save store before page unload
    window.addEventListener('beforeunload', () => {
      if (window.storeManager) {
        const store = window.storeManager.getStore();
        if (store && store.id) {
          // Force save to localStorage
          try {
            window.storeManager.saveStore(store);
            console.log('[StoreFix] Store saved before unload');
          } catch (error) {
            console.error('[StoreFix] Error saving store:', error);
          }
        }
      }
    });
    
    // Check store on visibility change
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && window.storeManager) {
        window.storeManager.validateStore().then(isValid => {
          if (isValid) {
            const store = window.storeManager.getStore();
            if (store) {
              updateUIWithStore(store);
            }
          }
        });
      }
    });
  }
  
  /**
   * Initialize the complete fix
   */
  async function initialize() {
    if (initialized) {
      console.log('[StoreFix] Already initialized, skipping...');
      return;
    }
    
    try {
      console.log('[StoreFix] Starting initialization...');
      
      // Wait for dependencies
      await waitForDependencies();
      
      // Initialize StoreManager if not already done
      if (window.storeManager && !window.storeManager.isInitialized) {
        console.log('[StoreFix] Initializing StoreManager...');
        await window.storeManager.initialize();
      }
      
      // Load and validate store
      if (window.storeManager) {
        const store = window.storeManager.getStore();
        if (store && store.id) {
          console.log('[StoreFix] Store loaded successfully:', store.name);
          
          // Update global variables
          window.selectedStoreId = store.locationId || store.id;
          window.selectedStoreName = store.name;
          
          // Update UI
          updateUIWithStore(store);
        } else {
          console.log('[StoreFix] No store found, user needs to select one');
        }
      }
      
      // Apply fixes
      overrideProblematicFunctions();
      fixLocalStorageSync();
      monitorRaceConditions();
      ensureStorePersistence();
      
      initialized = true;
      console.log('[StoreFix] Initialization complete - store persistence issues should be resolved');
      
      // Show success message if store is loaded
      if (window.storeManager && window.storeManager.hasStore()) {
        const store = window.storeManager.getStore();
        if (window.toastManager) {
          // Clear any error toasts
          window.toastManager.clearType('error');
          window.toastManager.clearType('warning');
          
          // Show success
          window.toastManager.showSuccess(
            'Store Ready',
            `Shopping at ${store.name}`,
            2000
          );
        }
      }
      
    } catch (error) {
      console.error('[StoreFix] Initialization failed:', error);
    }
  }
  
  // Start initialization based on DOM state
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    // Small delay to ensure other scripts have loaded
    setTimeout(initialize, 100);
  }
  
  // Also try to initialize when window loads (backup)
  window.addEventListener('load', () => {
    if (!initialized) {
      setTimeout(initialize, 500);
    }
  });
  
  // Expose fix status for debugging
  window.storePersistenceFixStatus = {
    isInitialized: () => initialized,
    reinitialize: initialize,
    getStore: () => window.storeManager ? window.storeManager.getStore() : null,
    validateStore: () => window.storeManager ? window.storeManager.validateStore() : Promise.resolve(false)
  };
  
})();