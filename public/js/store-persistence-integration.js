/**
 * Store Persistence Integration
 * Integrates the new store management architecture with existing code
 */

(function() {
  console.log('[Integration] Starting store persistence integration...');
  
  // Wait for dependencies to load
  function waitForDependencies() {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (window.storeManager && window.initManager && window.toastManager) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 10000);
    });
  }
  
  // Override existing store functions with new implementation
  function overrideStoreFunctions() {
    console.log('[Integration] Overriding existing store functions...');
    
    // Override loadDefaultStore if it exists
    if (typeof window.loadDefaultStore === 'function') {
      const originalLoadDefaultStore = window.loadDefaultStore;
      window.loadDefaultStore = async function() {
        console.log('[Integration] loadDefaultStore called - using new StoreManager');
        
        try {
          await window.storeManager.initialize();
          const store = window.storeManager.getStore();
          
          if (store) {
            // Set global variables for backward compatibility
            window.selectedStoreId = store.locationId || store.id;
            window.selectedStoreName = store.name;
            
            // Update UI
            updateStoreDisplay();
            
            return true;
          }
          
          return false;
        } catch (error) {
          console.error('[Integration] Error in loadDefaultStore:', error);
          // Fall back to original implementation
          return originalLoadDefaultStore.call(this);
        }
      };
    }
    
    // Override selectStore if it exists
    if (typeof window.selectStore === 'function') {
      const originalSelectStore = window.selectStore;
      window.selectStore = async function(storeId) {
        console.log('[Integration] selectStore called - using new StoreManager');
        
        try {
          // Find the store element to get full data
          const storeOption = document.querySelector(`option[value="${storeId}"]`);
          if (!storeOption) {
            console.error('[Integration] Store option not found:', storeId);
            return originalSelectStore.call(this, storeId);
          }
          
          const storeData = {
            id: storeId,
            locationId: storeId,
            name: storeOption.textContent || 'Unknown Store',
            address: storeOption.dataset.storeAddress || '',
            phone: storeOption.dataset.storePhone || '',
            division: storeOption.dataset.storeDivision || ''
          };
          
          // Save using new StoreManager
          await window.storeManager.setStore(storeData);
          
          // Set global variables for backward compatibility
          window.selectedStoreId = storeData.locationId;
          window.selectedStoreName = storeData.name;
          
          // Update UI
          updateStoreDisplay();
          
          // Show success message
          // toasts disabled
          
          return true;
        } catch (error) {
          console.error('[Integration] Error in selectStore:', error);
          // Fall back to original implementation
          return originalSelectStore.call(this, storeId);
        }
      };
    }
    
    // Override searchProducts to ensure store is selected
    if (typeof window.searchProducts === 'function') {
      const originalSearchProducts = window.searchProducts;
      window.searchProducts = async function() {
        console.log('[Integration] searchProducts called - checking store first');
        
        try {
          // Ensure store is selected
          const store = await window.storeManager.ensureStoreSelected();
          
          // Set global variables for backward compatibility
          window.selectedStoreId = store.locationId || store.id;
          window.selectedStoreName = store.name;
          
          // Call original search function
          return originalSearchProducts.call(this);
          
        } catch (error) {
          if (error.message === 'No store selected') {
            // toasts disabled
            window.showTab('settings');
            return;
          }
          
          console.error('[Integration] Error in searchProducts:', error);
          throw error;
        }
      };
    }
  }
  
  // Update store display across the UI
  function updateStoreDisplay() {
    const store = window.storeManager.getStore();
    
    // Update footer
    const footerStore = document.getElementById('currentStore');
    if (footerStore) {
      footerStore.textContent = store ? store.name : 'No store selected';
    }
    
    // Update settings tab
    const selectedStoreInfo = document.getElementById('selectedStoreInfo');
    if (selectedStoreInfo && store) {
      selectedStoreInfo.innerHTML = `
        <div class="store-info-card">
          <h3>Current Store</h3>
          <p class="store-name"><strong>${store.name}</strong></p>
          ${store.address ? `<p class="store-address">${store.address}</p>` : ''}
          ${store.phone ? `<p class="store-phone">Phone: ${store.phone}</p>` : ''}
          <button onclick="changeStore()" class="btn btn-secondary btn-sm">Change Store</button>
        </div>
      `;
    }
    
    // Update store selector if it exists
    const storeSelector = document.getElementById('storeSelect');
    if (storeSelector && store) {
      // Try to select the current store in the dropdown
      const option = storeSelector.querySelector(`option[value="${store.id}"]`);
      if (option) {
        storeSelector.value = store.id;
      }
    }
  }
  
  // Add change store functionality
  window.changeStore = function() {
    window.showTab('settings');
    const storeSelector = document.getElementById('storeSelect');
    if (storeSelector) {
      storeSelector.focus();
    }
  };
  
  // Monitor for dynamic content changes
  function setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        // Check if store selector was added
        if (mutation.type === 'childList') {
          const storeSelector = document.getElementById('storeSelect');
          if (storeSelector && !storeSelector.dataset.integrated) {
            storeSelector.dataset.integrated = 'true';
            
            // Add change listener
            storeSelector.addEventListener('change', async (e) => {
              const storeId = e.target.value;
              if (storeId) {
                await window.selectStore(storeId);
              }
            });
            
            // Set current store if exists
            const store = window.storeManager.getStore();
            if (store) {
              storeSelector.value = store.id;
            }
          }
        }
      });
    });
    
    // Observe the entire document for changes
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  // Setup event listeners for store changes
  function setupStoreListeners() {
    // Listen for store changes
    window.storeManager.addEventListener('store-changed', (store) => {
      console.log('[Integration] Store changed event:', store);
      
      // Update global variables
      if (store) {
        window.selectedStoreId = store.locationId || store.id;
        window.selectedStoreName = store.name;
      } else {
        window.selectedStoreId = null;
        window.selectedStoreName = null;
      }
      
      // Update display
      updateStoreDisplay();
      
      // Enable/disable search
      const searchInput = document.getElementById('searchTerm');
      if (searchInput) {
        searchInput.disabled = !store;
        searchInput.placeholder = store 
          ? 'Search for products, brands, or categories...'
          : 'Select a store first to search products';
      }
    });
    
    // Listen for store sync events
    window.storeManager.addEventListener('store-synced', (store) => {
      console.log('[Integration] Store synced from another tab:', store);
      updateStoreDisplay();
    });
  }
  
  // Fix any existing localStorage issues
  function fixLegacyStorage() {
    console.log('[Integration] Checking for legacy storage issues...');
    
    // List of all possible legacy keys
    const legacyKeys = [
      'defaultStoreId', 'defaultStoreName', 'defaultStoreAddress', 'defaultStorePhone',
      'selectedStoreId', 'selectedStoreName'
    ];
    
    // Check if we have any legacy data
    let hasLegacyData = false;
    legacyKeys.forEach(key => {
      if (localStorage.getItem(key) !== null) {
        hasLegacyData = true;
      }
    });
    
    if (hasLegacyData) {
      console.log('[Integration] Found legacy data, migration will be handled by StoreManager');
    }
  }
  
  // Main initialization
  async function initialize() {
    try {
      console.log('[Integration] Waiting for dependencies...');
      await waitForDependencies();
      
      console.log('[Integration] Dependencies loaded');
      
      // Fix legacy storage
      fixLegacyStorage();
      
      // Override existing functions
      overrideStoreFunctions();
      
      // Setup listeners
      setupStoreListeners();
      
      // Setup mutation observer
      setupMutationObserver();
      
      // Initial store load
      const store = window.storeManager.getStore();
      if (store) {
        window.selectedStoreId = store.locationId || store.id;
        window.selectedStoreName = store.name;
        updateStoreDisplay();
      }
      
      console.log('[Integration] Store persistence integration complete');
      
    } catch (error) {
      console.error('[Integration] Failed to initialize:', error);
    }
  }
  
  // Start initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
  
})();