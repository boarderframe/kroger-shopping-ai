/**
 * InitializationManager.js - Application initialization orchestrator
 * Ensures proper startup sequence and dependency management
 */

class InitializationManager {
  constructor() {
    this.initSteps = [];
    this.initialized = false;
    this.initPromise = null;
    this.startTime = null;
  }

  /**
   * Initialize the application
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    if (this.initialized) return true;
    if (this.initPromise) return this.initPromise;
    
    this.initPromise = this._performInitialization();
    return this.initPromise;
  }

  async _performInitialization() {
    console.log('[InitManager] Starting application initialization...');
    this.startTime = performance.now();
    
    try {
      // Show loading state
      this.showLoadingState();
      
      // Step 1: Initialize store manager
      await this.initializeStoreManager();
      
      // Step 2: Setup UI components
      await this.initializeUI();
      
      // Step 3: Load user preferences
      await this.loadUserPreferences();
      
      // Step 4: Setup event handlers
      this.setupEventHandlers();
      
      // Step 5: Enable features based on store selection
      this.enableFeatures();
      
      // Step 6: Perform cleanup of old data
      this.performCleanup();
      
      this.initialized = true;
      const duration = Math.round(performance.now() - this.startTime);
      console.log(`[InitManager] Application initialization complete in ${duration}ms`);
      
      // Hide loading state
      this.hideLoadingState();
      
      // Show welcome message if first visit
      this.showWelcomeIfNeeded();
      
      return true;
      
    } catch (error) {
      console.error('[InitManager] Initialization failed:', error);
      this.handleInitializationError(error);
      throw error;
    }
  }

  /**
   * Initialize the store manager
   */
  async initializeStoreManager() {
    console.log('[InitManager] Initializing store manager...');
    
    if (!window.storeManager) {
      throw new Error('StoreManager not found. Please ensure StoreManager.js is loaded.');
    }
    
    await window.storeManager.initialize();
    
    // Listen for store changes
    window.storeManager.addEventListener('store-changed', (store) => {
      this.handleStoreChange(store);
    });
    
    window.storeManager.addEventListener('store-invalid', () => {
      this.handleStoreInvalid();
    });
    
    window.storeManager.addEventListener('store-synced', (store) => {
      this.handleStoreSync(store);
    });
    
    console.log('[InitManager] Store manager initialized');
    return true;
  }

  /**
   * Initialize UI components
   */
  async initializeUI() {
    console.log('[InitManager] Initializing UI components...');
    
    // Initialize toast notifications
    if (!window.toastManager) {
      window.toastManager = new ToastManager();
    }
    
    // Update store display
    this.updateStoreDisplay();
    
    // Setup tab navigation if not already done
    this.setupTabNavigation();
    
    // Initialize search functionality
    this.initializeSearch();
    
    console.log('[InitManager] UI components initialized');
    return true;
  }

  /**
   * Load user preferences
   */
  async loadUserPreferences() {
    console.log('[InitManager] Loading user preferences...');
    
    const preferences = localStorage.getItem('user_preferences');
    if (preferences) {
      try {
        window.userPreferences = JSON.parse(preferences);
        console.log('[InitManager] User preferences loaded:', window.userPreferences);
      } catch (error) {
        console.warn('[InitManager] Failed to load user preferences:', error);
        window.userPreferences = {};
      }
    } else {
      window.userPreferences = {};
    }
    
    return true;
  }

  /**
   * Setup global event handlers
   */
  setupEventHandlers() {
    console.log('[InitManager] Setting up event handlers...');
    
    // Global error handler
    window.addEventListener('error', (event) => {
      console.error('[InitManager] Global error:', event.error);
      this.handleGlobalError(event.error);
    });
    
    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      console.error('[InitManager] Unhandled promise rejection:', event.reason);
      this.handleGlobalError(event.reason);
    });
    
    // Page visibility change
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        console.log('[InitManager] Page became visible, validating store...');
        // Re-validate store when page becomes visible
        if (window.storeManager && window.storeManager.hasStore()) {
          window.storeManager.validateStore();
        }
      }
    });
    
    // Online/offline detection
    window.addEventListener('online', () => {
      console.log('[InitManager] Connection restored');
      if (window.toastManager) {
      // toasts disabled
      }
    });
    
    window.addEventListener('offline', () => {
      console.log('[InitManager] Connection lost');
      if (window.toastManager) {
      // toasts disabled
      }
    });
    
    // Before unload - save state
    window.addEventListener('beforeunload', () => {
      this.saveApplicationState();
    });
    
    console.log('[InitManager] Event handlers setup complete');
  }

  /**
   * Enable/disable features based on store selection
   */
  enableFeatures() {
    console.log('[InitManager] Enabling features based on store selection...');
    
    const hasStore = window.storeManager && window.storeManager.hasStore();
    
    // Enable/disable search
    const searchInput = document.getElementById('searchTerm');
    if (searchInput) {
      searchInput.disabled = !hasStore;
      searchInput.placeholder = hasStore 
        ? 'Search for products, brands, or categories...'
        : 'Select a store first to search products';
    }
    
    // Enable/disable search button
    const searchButton = document.querySelector('[onclick*="searchProducts"]');
    if (searchButton) {
      searchButton.disabled = !hasStore;
    }
    
    // Enable/disable other features that require store
    document.querySelectorAll('[data-requires-store]').forEach(element => {
      element.disabled = !hasStore;
      if (!hasStore) {
        element.title = 'Please select a store first';
      } else {
        element.title = '';
      }
    });
    
    // Update UI indicators
    if (!hasStore) {
      this.showStoreSelectionPrompt();
    }
    
    console.log(`[InitManager] Features ${hasStore ? 'enabled' : 'disabled'} (store ${hasStore ? 'selected' : 'not selected'})`);
  }

  /**
   * Initialize search functionality
   */
  initializeSearch() {
    const searchInput = document.getElementById('searchTerm');
    if (!searchInput) return;
    
    // Clear any pre-filled values from browser autocomplete
    if (!sessionStorage.getItem('intentionalSearch')) {
      searchInput.value = '';
    }
    
    // Add input validation
    searchInput.addEventListener('input', (e) => {
      const value = e.target.value;
      // Remove any potentially harmful characters
      const sanitized = value.replace(/[<>]/g, '');
      if (sanitized !== value) {
        e.target.value = sanitized;
      }
    });
  }

  /**
   * Setup tab navigation
   */
  setupTabNavigation() {
    // Ensure showTab function exists
    if (!window.showTab) {
      window.showTab = function(tabName) {
        console.log(`[InitManager] Switching to ${tabName} tab`);
        
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
          btn => btn.textContent.toLowerCase().includes(tabName.toLowerCase()) ||
                 btn.onclick?.toString().includes(`'${tabName}'`)
        );
        if (activeButton) {
          activeButton.classList.add('active');
          activeButton.setAttribute('aria-selected', 'true');
        }
        
        // Save current tab to session
        sessionStorage.setItem('currentTab', tabName);
      };
    }
    
    // Restore last tab if exists
    const lastTab = sessionStorage.getItem('currentTab');
    if (lastTab && lastTab !== 'search') {
      window.showTab(lastTab);
    }
  }

  /**
   * Perform cleanup of old data
   */
  performCleanup() {
    console.log('[InitManager] Performing cleanup...');
    
    // Clean up old session data
    const keysToCheck = ['store_prompt_shown', 'intentionalSearch', 'searchPatchApplied'];
    keysToCheck.forEach(key => {
      const value = sessionStorage.getItem(key);
      if (value) {
        const timestamp = sessionStorage.getItem(`${key}_timestamp`);
        if (timestamp) {
          const age = Date.now() - parseInt(timestamp);
          // Clear if older than 24 hours
          if (age > 24 * 60 * 60 * 1000) {
            sessionStorage.removeItem(key);
            sessionStorage.removeItem(`${key}_timestamp`);
          }
        }
      }
    });
    
    console.log('[InitManager] Cleanup complete');
  }

  /**
   * Handle store change event
   */
  handleStoreChange(store) {
    console.log('[InitManager] Store changed:', store);
    this.updateStoreDisplay();
    this.enableFeatures();
    
    if (store && window.toastManager) {
      // toasts disabled
    }
  }

  /**
   * Handle store sync event
   */
  handleStoreSync(store) {
    console.log('[InitManager] Store synced from another tab:', store);
    this.updateStoreDisplay();
    this.enableFeatures();
  }

  /**
   * Handle invalid store event
   */
  handleStoreInvalid() {
    console.warn('[InitManager] Store is invalid');
    if (window.toastManager) {
      // toasts disabled
    }
    this.showStoreSelectionPrompt();
  }

  /**
   * Update store display in UI
   */
  updateStoreDisplay() {
    const store = window.storeManager ? window.storeManager.getStore() : null;
    
    // Update footer display
    const footerStore = document.getElementById('currentStore');
    if (footerStore) {
      footerStore.textContent = store ? store.name : 'No store selected';
    }
    
    // Update all store display elements
    document.querySelectorAll('[data-store-display]').forEach(element => {
      const field = element.dataset.storeDisplay;
      if (store && store[field]) {
        element.textContent = store[field];
      } else {
        element.textContent = field === 'name' ? 'Not set' : '';
      }
    });
    
    // Update store info in settings tab
    const storeInfo = document.getElementById('selectedStoreInfo');
    if (storeInfo && store) {
      storeInfo.innerHTML = `
        <h3>Current Store</h3>
        <p><strong>${store.name}</strong></p>
        <p>${store.address || 'Address not available'}</p>
        <p>${store.phone || 'Phone not available'}</p>
      `;
    }
  }

  /**
   * Show store selection prompt
   */
  showStoreSelectionPrompt() {
    // Check if we should auto-show settings tab
    const shouldAutoShow = !sessionStorage.getItem('store_prompt_shown');
    
    if (shouldAutoShow) {
      sessionStorage.setItem('store_prompt_shown', 'true');
      sessionStorage.setItem('store_prompt_shown_timestamp', Date.now().toString());
      
      // Show settings tab
      if (window.showTab) {
        window.showTab('settings');
      }
      
      // toasts disabled
    }
  }

  /**
   * Show welcome message for first-time users
   */
  showWelcomeIfNeeded() {
    const hasVisited = localStorage.getItem('has_visited');
    if (!hasVisited) {
      localStorage.setItem('has_visited', 'true');
      
      // toasts disabled
    }
  }

  /**
   * Show loading state
   */
  showLoadingState() {
    // Check if loader exists
    let loader = document.getElementById('appLoader');
    if (!loader) {
      // Create loader if it doesn't exist
      loader = document.createElement('div');
      loader.id = 'appLoader';
      loader.className = 'app-loader';
      loader.innerHTML = `
        <div class="loader-content">
          <div class="spinner"></div>
          <p>Loading application...</p>
        </div>
      `;
      document.body.appendChild(loader);
    }
    loader.style.display = 'flex';
  }

  /**
   * Hide loading state
   */
  hideLoadingState() {
    const loader = document.getElementById('appLoader');
    if (loader) {
      loader.style.display = 'none';
    }
  }

  /**
   * Save application state
   */
  saveApplicationState() {
    const state = {
      timestamp: Date.now(),
      tab: sessionStorage.getItem('currentTab'),
      searchTerm: document.getElementById('searchTerm')?.value
    };
    
    sessionStorage.setItem('app_state', JSON.stringify(state));
  }

  /**
   * Handle initialization error
   */
  handleInitializationError(error) {
    console.error('[InitManager] Failed to initialize application:', error);
    
    this.hideLoadingState();
    
    // Show error UI
    let errorContainer = document.getElementById('initError');
    if (!errorContainer) {
      errorContainer = document.createElement('div');
      errorContainer.id = 'initError';
      errorContainer.className = 'init-error';
      document.body.appendChild(errorContainer);
    }
    
    errorContainer.style.display = 'block';
    errorContainer.innerHTML = `
      <div class="error-message">
        <h3>Initialization Error</h3>
        <p>Failed to start the application. Please refresh the page.</p>
        <p class="error-details">${error.message}</p>
        <button onclick="location.reload()" class="btn btn-primary">Refresh Page</button>
      </div>
    `;
  }

  /**
   * Handle global errors
   */
  handleGlobalError(error) {
    // Don't show toast for network errors during initialization
    if (!this.initialized && error?.message?.includes('network')) {
      return;
    }
    
    // Don't show toast for certain expected errors
    const ignoredErrors = ['ResizeObserver loop limit exceeded'];
    if (ignoredErrors.some(msg => error?.message?.includes(msg))) {
      return;
    }
    
    // Log the error
    console.error('[InitManager] Global error:', error);
    
    // Show user-friendly error message
    if (window.toastManager && this.initialized) {
      // toasts disabled
    }
  }
}

// Create singleton instance
if (!window.initManager) {
  window.initManager = new InitializationManager();
  console.log('[InitManager] Singleton instance created');
  
  // Start initialization when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.initManager.initialize();
    });
  } else {
    // DOM already loaded, start immediately
    window.initManager.initialize();
  }
}