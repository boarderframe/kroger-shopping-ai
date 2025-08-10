# Store Persistence Architecture - Comprehensive Solution

## Executive Summary
This document outlines a robust, scalable architecture to fix the default store persistence issues in the Kroger Shopping AI application. The solution ensures consistent store data management across all pages, prevents "store not set" errors, and provides a maintainable foundation for future enhancements.

## Current Issues Identified

### 1. Fragmented Store Management
- Multiple JS files checking store state independently
- Inconsistent localStorage key usage (defaultStoreId vs selectedStoreId)
- No centralized store management system
- Race conditions between different components

### 2. Validation Inconsistencies
- Different validation logic across files
- No standardized error handling
- Missing validation on critical operations

### 3. Initialization Problems
- loadDefaultStore() may not complete before user actions
- No guarantee store data is ready when needed
- Missing initialization sequence management

### 4. Data Synchronization Issues
- Store data not synchronized between tabs
- Page refreshes lose context
- Backend/frontend state mismatch

## Proposed Architecture

### 1. Centralized Store Management Service

```javascript
// StoreManager.js - Single source of truth for store operations
class StoreManager {
  constructor() {
    this.STORAGE_KEYS = {
      STORE_ID: 'kroger_store_id',
      STORE_NAME: 'kroger_store_name',
      STORE_ADDRESS: 'kroger_store_address',
      STORE_PHONE: 'kroger_store_phone',
      STORE_LOCATION_ID: 'kroger_location_id',
      STORE_DIVISION: 'kroger_store_division',
      LAST_UPDATED: 'kroger_store_last_updated',
      STORE_HASH: 'kroger_store_hash'
    };
    
    this.currentStore = null;
    this.isInitialized = false;
    this.initPromise = null;
    this.listeners = new Set();
    this.syncChannel = null;
  }

  // Initialize store manager
  async initialize() {
    if (this.initPromise) return this.initPromise;
    
    this.initPromise = this._performInitialization();
    return this.initPromise;
  }

  async _performInitialization() {
    try {
      // Load store from localStorage
      await this.loadStore();
      
      // Setup cross-tab synchronization
      this.setupCrossTabSync();
      
      // Validate store data
      await this.validateStore();
      
      // Setup periodic validation
      this.setupPeriodicValidation();
      
      this.isInitialized = true;
      this.notifyListeners('initialized', this.currentStore);
      
      return this.currentStore;
    } catch (error) {
      console.error('Store initialization failed:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  // Load store from localStorage with migration support
  async loadStore() {
    try {
      // Try new keys first
      let storeData = this.loadFromNewFormat();
      
      // Fallback to legacy keys if needed
      if (!storeData) {
        storeData = this.migrateFromLegacyFormat();
      }
      
      if (storeData && this.isValidStoreData(storeData)) {
        this.currentStore = storeData;
        return storeData;
      }
      
      return null;
    } catch (error) {
      console.error('Error loading store:', error);
      return null;
    }
  }

  loadFromNewFormat() {
    const id = localStorage.getItem(this.STORAGE_KEYS.STORE_ID);
    if (!id) return null;
    
    return {
      id: id,
      locationId: localStorage.getItem(this.STORAGE_KEYS.STORE_LOCATION_ID),
      name: localStorage.getItem(this.STORAGE_KEYS.STORE_NAME),
      address: localStorage.getItem(this.STORAGE_KEYS.STORE_ADDRESS),
      phone: localStorage.getItem(this.STORAGE_KEYS.STORE_PHONE),
      division: localStorage.getItem(this.STORAGE_KEYS.STORE_DIVISION),
      lastUpdated: localStorage.getItem(this.STORAGE_KEYS.LAST_UPDATED),
      hash: localStorage.getItem(this.STORAGE_KEYS.STORE_HASH)
    };
  }

  migrateFromLegacyFormat() {
    // Check for old format keys
    const legacyId = localStorage.getItem('defaultStoreId') || 
                     localStorage.getItem('selectedStoreId');
    
    if (!legacyId) return null;
    
    const storeData = {
      id: legacyId,
      locationId: legacyId, // Assume same as ID for legacy
      name: localStorage.getItem('defaultStoreName') || 
            localStorage.getItem('selectedStoreName'),
      address: localStorage.getItem('defaultStoreAddress'),
      phone: localStorage.getItem('defaultStorePhone'),
      division: null,
      lastUpdated: new Date().toISOString(),
      hash: null
    };
    
    // Save in new format
    this.saveStore(storeData);
    
    // Clean up legacy keys
    this.cleanupLegacyKeys();
    
    return storeData;
  }

  cleanupLegacyKeys() {
    const legacyKeys = [
      'defaultStoreId', 'defaultStoreName', 'defaultStoreAddress', 'defaultStorePhone',
      'selectedStoreId', 'selectedStoreName'
    ];
    
    legacyKeys.forEach(key => localStorage.removeItem(key));
  }

  // Save store with validation and hash
  saveStore(storeData) {
    if (!this.isValidStoreData(storeData)) {
      throw new Error('Invalid store data');
    }
    
    // Generate hash for integrity check
    storeData.hash = this.generateStoreHash(storeData);
    storeData.lastUpdated = new Date().toISOString();
    
    // Save to localStorage
    localStorage.setItem(this.STORAGE_KEYS.STORE_ID, storeData.id);
    localStorage.setItem(this.STORAGE_KEYS.STORE_LOCATION_ID, storeData.locationId || storeData.id);
    localStorage.setItem(this.STORAGE_KEYS.STORE_NAME, storeData.name);
    localStorage.setItem(this.STORAGE_KEYS.STORE_ADDRESS, storeData.address || '');
    localStorage.setItem(this.STORAGE_KEYS.STORE_PHONE, storeData.phone || '');
    localStorage.setItem(this.STORAGE_KEYS.STORE_DIVISION, storeData.division || '');
    localStorage.setItem(this.STORAGE_KEYS.LAST_UPDATED, storeData.lastUpdated);
    localStorage.setItem(this.STORAGE_KEYS.STORE_HASH, storeData.hash);
    
    this.currentStore = storeData;
    
    // Notify all listeners
    this.notifyListeners('store-changed', storeData);
    
    // Sync across tabs
    this.broadcastStoreChange(storeData);
    
    return storeData;
  }

  // Validate store data integrity
  isValidStoreData(storeData) {
    if (!storeData) return false;
    
    // Required fields
    if (!storeData.id || !storeData.name) return false;
    
    // Check hash if present
    if (storeData.hash) {
      const expectedHash = this.generateStoreHash(storeData);
      if (storeData.hash !== expectedHash) {
        console.warn('Store data hash mismatch - data may be corrupted');
        return false;
      }
    }
    
    return true;
  }

  generateStoreHash(storeData) {
    const data = `${storeData.id}|${storeData.name}|${storeData.address}|${storeData.phone}`;
    return btoa(data).substring(0, 16); // Simple hash for integrity
  }

  // Validate store against backend
  async validateStore() {
    if (!this.currentStore) return false;
    
    try {
      const response = await fetch(`/api/stores/${this.currentStore.locationId || this.currentStore.id}/validate`);
      if (!response.ok) {
        console.warn('Store validation failed:', response.status);
        return false;
      }
      
      const validationResult = await response.json();
      if (!validationResult.valid) {
        console.warn('Store is no longer valid:', validationResult.reason);
        this.handleInvalidStore();
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Store validation error:', error);
      // Don't invalidate on network errors
      return true;
    }
  }

  handleInvalidStore() {
    this.clearStore();
    this.notifyListeners('store-invalid', null);
  }

  // Clear store data
  clearStore() {
    Object.values(this.STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    
    this.currentStore = null;
    this.notifyListeners('store-cleared', null);
    this.broadcastStoreChange(null);
  }

  // Cross-tab synchronization
  setupCrossTabSync() {
    // Use BroadcastChannel if available
    if ('BroadcastChannel' in window) {
      this.syncChannel = new BroadcastChannel('kroger_store_sync');
      this.syncChannel.onmessage = (event) => {
        this.handleSyncMessage(event.data);
      };
    } else {
      // Fallback to storage events
      window.addEventListener('storage', (event) => {
        if (event.key && Object.values(this.STORAGE_KEYS).includes(event.key)) {
          this.handleStorageChange(event);
        }
      });
    }
  }

  broadcastStoreChange(storeData) {
    if (this.syncChannel) {
      this.syncChannel.postMessage({
        type: 'store-changed',
        store: storeData,
        timestamp: Date.now()
      });
    }
  }

  handleSyncMessage(message) {
    if (message.type === 'store-changed') {
      this.currentStore = message.store;
      this.notifyListeners('store-synced', message.store);
    }
  }

  handleStorageChange(event) {
    // Reload store data when changed in another tab
    this.loadStore().then(() => {
      this.notifyListeners('store-synced', this.currentStore);
    });
  }

  // Periodic validation
  setupPeriodicValidation() {
    // Validate every 5 minutes
    setInterval(() => {
      if (this.currentStore) {
        this.validateStore();
      }
    }, 5 * 60 * 1000);
  }

  // Event system
  addEventListener(event, callback) {
    this.listeners.add({ event, callback });
  }

  removeEventListener(event, callback) {
    this.listeners.forEach(listener => {
      if (listener.event === event && listener.callback === callback) {
        this.listeners.delete(listener);
      }
    });
  }

  notifyListeners(event, data) {
    this.listeners.forEach(listener => {
      if (listener.event === event) {
        try {
          listener.callback(data);
        } catch (error) {
          console.error('Listener error:', error);
        }
      }
    });
  }

  // Public API methods
  getStore() {
    return this.currentStore;
  }

  hasStore() {
    return !!this.currentStore && !!this.currentStore.id;
  }

  async setStore(storeData) {
    return this.saveStore(storeData);
  }

  async ensureStoreSelected() {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    if (!this.hasStore()) {
      throw new Error('No store selected');
    }
    
    return this.currentStore;
  }

  getStoreId() {
    return this.currentStore?.id || null;
  }

  getLocationId() {
    return this.currentStore?.locationId || this.currentStore?.id || null;
  }

  getStoreName() {
    return this.currentStore?.name || 'No store selected';
  }
}

// Create singleton instance
window.storeManager = new StoreManager();
```

### 2. Initialization Orchestrator

```javascript
// InitializationManager.js - Ensures proper startup sequence
class InitializationManager {
  constructor() {
    this.initSteps = [];
    this.initialized = false;
    this.initPromise = null;
  }

  async initialize() {
    if (this.initialized) return true;
    if (this.initPromise) return this.initPromise;
    
    this.initPromise = this._performInitialization();
    return this.initPromise;
  }

  async _performInitialization() {
    console.log('Starting application initialization...');
    
    try {
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
      
      this.initialized = true;
      console.log('Application initialization complete');
      
      return true;
    } catch (error) {
      console.error('Initialization failed:', error);
      this.handleInitializationError(error);
      throw error;
    }
  }

  async initializeStoreManager() {
    console.log('Initializing store manager...');
    
    await window.storeManager.initialize();
    
    // Listen for store changes
    window.storeManager.addEventListener('store-changed', (store) => {
      this.handleStoreChange(store);
    });
    
    window.storeManager.addEventListener('store-invalid', () => {
      this.handleStoreInvalid();
    });
    
    return true;
  }

  async initializeUI() {
    console.log('Initializing UI components...');
    
    // Show loading state
    this.showLoadingState();
    
    // Initialize toast notifications
    if (!window.toastManager) {
      window.toastManager = new ToastManager();
    }
    
    // Update store display
    this.updateStoreDisplay();
    
    // Hide loading state
    this.hideLoadingState();
    
    return true;
  }

  async loadUserPreferences() {
    // Load any user preferences
    const preferences = localStorage.getItem('user_preferences');
    if (preferences) {
      try {
        window.userPreferences = JSON.parse(preferences);
      } catch (error) {
        console.warn('Failed to load user preferences:', error);
      }
    }
    return true;
  }

  setupEventHandlers() {
    // Setup global error handler
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
      this.handleGlobalError(event.error);
    });
    
    // Setup unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      this.handleGlobalError(event.reason);
    });
    
    // Page visibility change
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        // Re-validate store when page becomes visible
        window.storeManager.validateStore();
      }
    });
  }

  enableFeatures() {
    const hasStore = window.storeManager.hasStore();
    
    // Enable/disable search
    const searchInput = document.getElementById('searchTerm');
    if (searchInput) {
      searchInput.disabled = !hasStore;
      searchInput.placeholder = hasStore 
        ? 'Search for products, brands, or categories...'
        : 'Select a store first to search products';
    }
    
    // Enable/disable other features
    document.querySelectorAll('[data-requires-store]').forEach(element => {
      element.disabled = !hasStore;
    });
    
    // Update UI indicators
    if (!hasStore) {
      this.showStoreSelectionPrompt();
    }
  }

  handleStoreChange(store) {
    console.log('Store changed:', store);
    this.updateStoreDisplay();
    this.enableFeatures();
    
    if (store) {
      window.toastManager?.showSuccess('Store Selected', `Now shopping at ${store.name}`);
    }
  }

  handleStoreInvalid() {
    console.warn('Store is invalid');
    window.toastManager?.showError('Store Invalid', 'Please select a different store');
    this.showStoreSelectionPrompt();
  }

  updateStoreDisplay() {
    const store = window.storeManager.getStore();
    
    // Update footer display
    const footerStore = document.getElementById('currentStore');
    if (footerStore) {
      footerStore.textContent = store ? store.name : 'No store selected';
    }
    
    // Update all store display elements
    document.querySelectorAll('[data-store-display]').forEach(element => {
      const field = element.dataset.storeDisplay;
      element.textContent = store ? (store[field] || 'N/A') : 'Not set';
    });
  }

  showStoreSelectionPrompt() {
    // Check if we should auto-show settings tab
    const shouldAutoShow = !sessionStorage.getItem('store_prompt_shown');
    
    if (shouldAutoShow) {
      sessionStorage.setItem('store_prompt_shown', 'true');
      
      // Show settings tab
      if (window.showTab) {
        window.showTab('settings');
      }
      
      // Show toast
      window.toastManager?.showInfo(
        'Store Required',
        'Please select a store to start shopping',
        5000
      );
    }
  }

  showLoadingState() {
    const loader = document.getElementById('appLoader');
    if (loader) {
      loader.style.display = 'flex';
    }
  }

  hideLoadingState() {
    const loader = document.getElementById('appLoader');
    if (loader) {
      loader.style.display = 'none';
    }
  }

  handleInitializationError(error) {
    console.error('Failed to initialize application:', error);
    
    // Show error UI
    const errorContainer = document.getElementById('initError');
    if (errorContainer) {
      errorContainer.style.display = 'block';
      errorContainer.innerHTML = `
        <div class="error-message">
          <h3>Initialization Error</h3>
          <p>Failed to start the application. Please refresh the page.</p>
          <button onclick="location.reload()">Refresh Page</button>
        </div>
      `;
    }
  }

  handleGlobalError(error) {
    console.error('Global error handler:', error);
    
    // Don't show toast for network errors during initialization
    if (!this.initialized && error.message?.includes('network')) {
      return;
    }
    
    window.toastManager?.showError('Error', 'An unexpected error occurred');
  }
}

// Create and start initialization
window.initManager = new InitializationManager();

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.initManager.initialize();
  });
} else {
  window.initManager.initialize();
}
```

### 3. Enhanced Toast Notification System

```javascript
// ToastManager.js - Unified notification system
class ToastManager {
  constructor() {
    this.container = null;
    this.queue = [];
    this.activeToasts = new Map();
    this.setupContainer();
  }

  setupContainer() {
    // Check if container exists
    this.container = document.getElementById('toastContainer');
    
    if (!this.container) {
      // Create container
      this.container = document.createElement('div');
      this.container.id = 'toastContainer';
      this.container.className = 'toast-container';
      this.container.setAttribute('aria-live', 'polite');
      this.container.setAttribute('aria-atomic', 'true');
      document.body.appendChild(this.container);
    }
  }

  show(title, message, type = 'info', duration = 3000, options = {}) {
    const toast = {
      id: `toast-${Date.now()}-${Math.random()}`,
      title,
      message,
      type,
      duration,
      options
    };
    
    // Check for duplicates
    if (this.isDuplicate(title, message)) {
      return;
    }
    
    // Add to queue
    this.queue.push(toast);
    this.processQueue();
    
    return toast.id;
  }

  isDuplicate(title, message) {
    for (const [id, toast] of this.activeToasts) {
      if (toast.title === title && toast.message === message) {
        return true;
      }
    }
    return false;
  }

  processQueue() {
    if (this.queue.length === 0) return;
    
    const toast = this.queue.shift();
    this.displayToast(toast);
    
    // Process next toast after a short delay
    if (this.queue.length > 0) {
      setTimeout(() => this.processQueue(), 100);
    }
  }

  displayToast(toast) {
    const element = document.createElement('div');
    element.id = toast.id;
    element.className = `toast toast-${toast.type}`;
    element.setAttribute('role', 'alert');
    
    // Add icon based on type
    const icon = this.getIcon(toast.type);
    
    element.innerHTML = `
      <div class="toast-content">
        <div class="toast-icon">${icon}</div>
        <div class="toast-text">
          <div class="toast-header">${this.escapeHtml(toast.title)}</div>
          <div class="toast-body">${this.escapeHtml(toast.message)}</div>
        </div>
        <button class="toast-close" aria-label="Close notification">×</button>
      </div>
      ${toast.options.progress ? '<div class="toast-progress"></div>' : ''}
    `;
    
    // Add close handler
    const closeBtn = element.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => this.removeToast(toast.id));
    
    // Add to container
    this.container.appendChild(element);
    this.activeToasts.set(toast.id, toast);
    
    // Trigger animation
    requestAnimationFrame(() => {
      element.classList.add('show');
    });
    
    // Auto-remove if duration is set
    if (toast.duration > 0) {
      setTimeout(() => this.removeToast(toast.id), toast.duration);
    }
  }

  removeToast(toastId) {
    const element = document.getElementById(toastId);
    if (!element) return;
    
    element.classList.remove('show');
    element.classList.add('hide');
    
    setTimeout(() => {
      element.remove();
      this.activeToasts.delete(toastId);
    }, 300);
  }

  getIcon(type) {
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ',
      loading: '↻'
    };
    return icons[type] || icons.info;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Convenience methods
  showSuccess(title, message, duration = 3000) {
    return this.show(title, message, 'success', duration);
  }

  showError(title, message, duration = 5000) {
    return this.show(title, message, 'error', duration);
  }

  showWarning(title, message, duration = 4000) {
    return this.show(title, message, 'warning', duration);
  }

  showInfo(title, message, duration = 3000) {
    return this.show(title, message, 'info', duration);
  }

  showLoading(title, message) {
    return this.show(title, message, 'loading', 0, { progress: true });
  }

  clear() {
    this.queue = [];
    this.activeToasts.forEach((toast, id) => {
      this.removeToast(id);
    });
  }
}
```

### 4. API Integration Layer

```javascript
// ApiClient.js - Centralized API communication
class ApiClient {
  constructor() {
    this.baseUrl = window.location.origin;
    this.defaultHeaders = {
      'Content-Type': 'application/json'
    };
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config = {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...options.headers
      }
    };
    
    // Add store context if available
    const store = window.storeManager?.getStore();
    if (store && store.locationId) {
      config.headers['X-Store-Location'] = store.locationId;
    }
    
    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new ApiError(response.status, await response.text());
      }
      
      return await response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new NetworkError(error.message);
    }
  }

  // Store-related endpoints
  async validateStore(storeId) {
    return this.request(`/api/stores/${storeId}/validate`);
  }

  async searchStores(zipCode, radius = 10) {
    return this.request(`/api/stores/nearby?zipCode=${zipCode}&radius=${radius}`);
  }

  async getStoreDetails(storeId) {
    return this.request(`/api/stores/${storeId}`);
  }

  // Product-related endpoints
  async searchProducts(term, locationId, limit = 20) {
    if (!locationId) {
      throw new Error('Store location required for product search');
    }
    
    return this.request(`/api/products/search?term=${encodeURIComponent(term)}&locationId=${locationId}&limit=${limit}`);
  }

  async getProductDetails(productId, locationId) {
    return this.request(`/api/products/${productId}?locationId=${locationId}`);
  }
}

// Custom error classes
class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

class NetworkError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NetworkError';
  }
}

// Create singleton instance
window.apiClient = new ApiClient();
```

### 5. Migration Script

```javascript
// migrate-store-data.js - One-time migration script
(function() {
  console.log('Running store data migration...');
  
  // Check if migration has already been done
  const migrationVersion = localStorage.getItem('store_migration_version');
  if (migrationVersion === '2.0') {
    console.log('Migration already completed');
    return;
  }
  
  // Backup existing data
  const backup = {};
  const keysToBackup = [
    'defaultStoreId', 'defaultStoreName', 'defaultStoreAddress', 'defaultStorePhone',
    'selectedStoreId', 'selectedStoreName'
  ];
  
  keysToBackup.forEach(key => {
    const value = localStorage.getItem(key);
    if (value !== null) {
      backup[key] = value;
    }
  });
  
  if (Object.keys(backup).length > 0) {
    localStorage.setItem('store_data_backup', JSON.stringify(backup));
    console.log('Backed up existing store data:', backup);
  }
  
  // Perform migration
  const storeId = backup.defaultStoreId || backup.selectedStoreId;
  const storeName = backup.defaultStoreName || backup.selectedStoreName;
  
  if (storeId && storeName) {
    // Save in new format
    localStorage.setItem('kroger_store_id', storeId);
    localStorage.setItem('kroger_store_name', storeName);
    localStorage.setItem('kroger_location_id', storeId);
    
    if (backup.defaultStoreAddress) {
      localStorage.setItem('kroger_store_address', backup.defaultStoreAddress);
    }
    
    if (backup.defaultStorePhone) {
      localStorage.setItem('kroger_store_phone', backup.defaultStorePhone);
    }
    
    localStorage.setItem('kroger_store_last_updated', new Date().toISOString());
    
    console.log('Successfully migrated store data to new format');
    
    // Clean up old keys
    keysToBackup.forEach(key => {
      localStorage.removeItem(key);
    });
    
    console.log('Cleaned up legacy keys');
  }
  
  // Mark migration as complete
  localStorage.setItem('store_migration_version', '2.0');
  console.log('Store data migration completed');
})();
```

## Implementation Plan

### Phase 1: Core Infrastructure (Day 1-2)
1. Implement StoreManager class
2. Implement InitializationManager class
3. Create migration script
4. Test cross-tab synchronization

### Phase 2: UI Integration (Day 3-4)
1. Implement ToastManager
2. Update all UI components to use StoreManager
3. Add loading states and error handling
4. Test user flows

### Phase 3: API Integration (Day 5)
1. Implement ApiClient
2. Add store validation endpoints
3. Test backend integration
4. Handle edge cases

### Phase 4: Testing & Deployment (Day 6-7)
1. Comprehensive testing across browsers
2. Performance optimization
3. Documentation update
4. Gradual rollout with feature flags

## Benefits of This Architecture

### 1. Centralized Management
- Single source of truth for store data
- Consistent API across all components
- Easier to maintain and debug

### 2. Robust Persistence
- Data integrity checks with hashing
- Automatic migration from legacy format
- Cross-tab synchronization

### 3. Better User Experience
- No more "store not set" errors
- Seamless page refreshes
- Clear feedback on store status

### 4. Scalability
- Event-driven architecture
- Modular components
- Easy to extend with new features

### 5. Developer Experience
- Clear API documentation
- Comprehensive error handling
- Debugging tools built-in

## Testing Strategy

### Unit Tests
```javascript
describe('StoreManager', () => {
  test('should initialize with no store', async () => {
    const manager = new StoreManager();
    await manager.initialize();
    expect(manager.hasStore()).toBe(false);
  });
  
  test('should save and retrieve store', async () => {
    const manager = new StoreManager();
    const storeData = {
      id: '123',
      name: 'Test Store',
      address: '123 Main St'
    };
    
    await manager.setStore(storeData);
    expect(manager.getStore()).toMatchObject(storeData);
  });
  
  test('should migrate legacy format', async () => {
    localStorage.setItem('defaultStoreId', 'legacy-123');
    localStorage.setItem('defaultStoreName', 'Legacy Store');
    
    const manager = new StoreManager();
    await manager.initialize();
    
    expect(manager.getStoreId()).toBe('legacy-123');
    expect(localStorage.getItem('defaultStoreId')).toBeNull();
  });
});
```

### Integration Tests
```javascript
describe('Store Persistence Integration', () => {
  test('should persist store across page refresh', async () => {
    // Set store
    await storeManager.setStore({
      id: 'test-123',
      name: 'Test Store'
    });
    
    // Simulate page refresh
    window.location.reload();
    
    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check store is still there
    expect(storeManager.getStoreId()).toBe('test-123');
  });
  
  test('should sync store across tabs', async () => {
    // Open new tab
    const newTab = window.open('/');
    
    // Set store in current tab
    await storeManager.setStore({
      id: 'sync-123',
      name: 'Sync Store'
    });
    
    // Wait for sync
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check store in new tab
    const newTabStore = await newTab.storeManager.getStore();
    expect(newTabStore.id).toBe('sync-123');
    
    newTab.close();
  });
});
```

## Monitoring & Observability

### Key Metrics to Track
1. Store initialization success rate
2. Store validation failures
3. Cross-tab sync latency
4. LocalStorage read/write errors
5. API validation response times

### Error Tracking
```javascript
// Send errors to monitoring service
window.addEventListener('error', (event) => {
  if (event.error?.name === 'StoreError') {
    // Track store-related errors
    analytics.track('store_error', {
      error: event.error.message,
      store_id: storeManager.getStoreId(),
      timestamp: new Date().toISOString()
    });
  }
});
```

## Rollback Plan

If issues arise during deployment:

1. **Feature Flag Control**: Disable new store management via feature flag
2. **Restore Legacy Code**: Revert to previous localStorage implementation
3. **Data Recovery**: Use backup data stored during migration
4. **Monitor & Fix**: Analyze issues and prepare fixes
5. **Gradual Re-deployment**: Roll out fixes to small percentage of users

## Conclusion

This architecture provides a robust, scalable solution to the store persistence issues. It ensures data consistency, improves user experience, and provides a solid foundation for future enhancements. The modular design allows for easy testing, maintenance, and extension of functionality.