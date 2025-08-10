/**
 * StoreManager.js - Centralized store management system
 * Handles all store-related operations with consistency and reliability
 */

class StoreManager {
  constructor() {
    // Define consistent storage keys
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
    this.validationInterval = null;
  }

  /**
   * Initialize the store manager
   * @returns {Promise<Object|null>} Current store data or null
   */
  async initialize() {
    if (this.initPromise) return this.initPromise;
    
    this.initPromise = this._performInitialization();
    return this.initPromise;
  }

  async _performInitialization() {
    try {
      console.log('[StoreManager] Initializing...');
      
      // Load store from localStorage
      await this.loadStore();
      
      // Setup cross-tab synchronization
      this.setupCrossTabSync();
      
      // Validate store data if exists
      if (this.currentStore) {
        const isValid = await this.validateStore();
        if (!isValid) {
          console.warn('[StoreManager] Store validation failed, clearing store');
          this.clearStore();
        }
      }
      
      // Setup periodic validation
      this.setupPeriodicValidation();
      
      this.isInitialized = true;
      this.notifyListeners('initialized', this.currentStore);
      
      console.log('[StoreManager] Initialization complete', this.currentStore);
      return this.currentStore;
      
    } catch (error) {
      console.error('[StoreManager] Initialization failed:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  /**
   * Load store from localStorage with migration support
   */
  async loadStore() {
    try {
      // Try new format first
      let storeData = this.loadFromNewFormat();
      
      // Fallback to legacy format if needed
      if (!storeData) {
        storeData = this.migrateFromLegacyFormat();
      }
      
      if (storeData && this.isValidStoreData(storeData)) {
        this.currentStore = storeData;
        console.log('[StoreManager] Store loaded:', storeData);
        return storeData;
      }
      
      console.log('[StoreManager] No valid store data found');
      return null;
      
    } catch (error) {
      console.error('[StoreManager] Error loading store:', error);
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
    console.log('[StoreManager] Checking for legacy store data...');
    
    // Check for old format keys
    const legacyId = localStorage.getItem('defaultStoreId') || 
                     localStorage.getItem('selectedStoreId');
    
    if (!legacyId) {
      console.log('[StoreManager] No legacy data found');
      return null;
    }
    
    const storeData = {
      id: legacyId,
      locationId: legacyId, // Assume same as ID for legacy
      name: localStorage.getItem('defaultStoreName') || 
            localStorage.getItem('selectedStoreName') || 
            'Unknown Store',
      address: localStorage.getItem('defaultStoreAddress') || '',
      phone: localStorage.getItem('defaultStorePhone') || '',
      division: null,
      lastUpdated: new Date().toISOString(),
      hash: null
    };
    
    console.log('[StoreManager] Migrating legacy data:', storeData);
    
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
    
    console.log('[StoreManager] Cleaning up legacy keys...');
    legacyKeys.forEach(key => {
      if (localStorage.getItem(key) !== null) {
        console.log(`[StoreManager] Removing legacy key: ${key}`);
        localStorage.removeItem(key);
      }
    });
  }

  /**
   * Save store data to localStorage
   * @param {Object} storeData Store data to save
   * @returns {Object} Saved store data
   */
  saveStore(storeData) {
    if (!this.isValidStoreData(storeData)) {
      throw new Error('Invalid store data');
    }
    
    // Generate hash for integrity check
    storeData.hash = this.generateStoreHash(storeData);
    storeData.lastUpdated = new Date().toISOString();
    
    // Save to localStorage
    localStorage.setItem(this.STORAGE_KEYS.STORE_ID, storeData.id || '');
    localStorage.setItem(this.STORAGE_KEYS.STORE_LOCATION_ID, storeData.locationId || storeData.id || '');
    localStorage.setItem(this.STORAGE_KEYS.STORE_NAME, storeData.name || '');
    localStorage.setItem(this.STORAGE_KEYS.STORE_ADDRESS, storeData.address || '');
    localStorage.setItem(this.STORAGE_KEYS.STORE_PHONE, storeData.phone || '');
    localStorage.setItem(this.STORAGE_KEYS.STORE_DIVISION, storeData.division || '');
    localStorage.setItem(this.STORAGE_KEYS.LAST_UPDATED, storeData.lastUpdated);
    localStorage.setItem(this.STORAGE_KEYS.STORE_HASH, storeData.hash);
    
    this.currentStore = storeData;
    
    console.log('[StoreManager] Store saved:', storeData);
    
    // Notify all listeners
    this.notifyListeners('store-changed', storeData);
    
    // Sync across tabs
    this.broadcastStoreChange(storeData);
    
    return storeData;
  }

  /**
   * Validate store data integrity
   */
  isValidStoreData(storeData) {
    if (!storeData) return false;
    
    // Required fields
    if (!storeData.id || !storeData.name) {
      console.warn('[StoreManager] Missing required fields in store data');
      return false;
    }
    
    // Check hash if present
    if (storeData.hash) {
      const expectedHash = this.generateStoreHash(storeData);
      if (storeData.hash !== expectedHash) {
        console.warn('[StoreManager] Store data hash mismatch - data may be corrupted');
        return false;
      }
    }
    
    return true;
  }

  generateStoreHash(storeData) {
    const data = `${storeData.id}|${storeData.name}|${storeData.address}|${storeData.phone}`;
    // Simple hash using btoa
    try {
      return btoa(data).substring(0, 16);
    } catch (e) {
      // Fallback for non-ASCII characters
      return data.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0).toString(36);
    }
  }

  /**
   * Validate store against backend
   */
  async validateStore() {
    if (!this.currentStore) return false;
    
    try {
      // Skip validation if we're offline
      if (!navigator.onLine) {
        console.log('[StoreManager] Offline, skipping validation');
        return true;
      }
      
      // For now, just check if store data exists and is valid
      // In production, this would call the backend API
      const isValid = this.isValidStoreData(this.currentStore);
      
      if (!isValid) {
        console.warn('[StoreManager] Store validation failed');
        this.handleInvalidStore();
        return false;
      }
      
      return true;
      
    } catch (error) {
      console.error('[StoreManager] Store validation error:', error);
      // Don't invalidate on network errors
      return true;
    }
  }

  handleInvalidStore() {
    this.clearStore();
    this.notifyListeners('store-invalid', null);
  }

  /**
   * Clear all store data
   */
  clearStore() {
    console.log('[StoreManager] Clearing store data...');
    
    Object.values(this.STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    
    this.currentStore = null;
    this.notifyListeners('store-cleared', null);
    this.broadcastStoreChange(null);
  }

  /**
   * Setup cross-tab synchronization
   */
  setupCrossTabSync() {
    // Use BroadcastChannel if available
    if ('BroadcastChannel' in window) {
      try {
        this.syncChannel = new BroadcastChannel('kroger_store_sync');
        this.syncChannel.onmessage = (event) => {
          this.handleSyncMessage(event.data);
        };
        console.log('[StoreManager] BroadcastChannel sync enabled');
      } catch (error) {
        console.warn('[StoreManager] BroadcastChannel failed, falling back to storage events');
        this.setupStorageEventSync();
      }
    } else {
      this.setupStorageEventSync();
    }
  }

  setupStorageEventSync() {
    // Fallback to storage events
    window.addEventListener('storage', (event) => {
      if (event.key && Object.values(this.STORAGE_KEYS).includes(event.key)) {
        this.handleStorageChange(event);
      }
    });
    console.log('[StoreManager] Storage event sync enabled');
  }

  broadcastStoreChange(storeData) {
    if (this.syncChannel) {
      try {
        this.syncChannel.postMessage({
          type: 'store-changed',
          store: storeData,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error('[StoreManager] Failed to broadcast store change:', error);
      }
    }
  }

  handleSyncMessage(message) {
    if (message.type === 'store-changed') {
      console.log('[StoreManager] Received store change from another tab');
      this.currentStore = message.store;
      this.notifyListeners('store-synced', message.store);
    }
  }

  handleStorageChange(event) {
    console.log('[StoreManager] Storage changed in another tab:', event.key);
    // Reload store data when changed in another tab
    this.loadStore().then(() => {
      this.notifyListeners('store-synced', this.currentStore);
    });
  }

  /**
   * Setup periodic validation
   */
  setupPeriodicValidation() {
    // Clear any existing interval
    if (this.validationInterval) {
      clearInterval(this.validationInterval);
    }
    
    // Validate every 5 minutes
    this.validationInterval = setInterval(() => {
      if (this.currentStore) {
        this.validateStore();
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Event system
   */
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
          console.error('[StoreManager] Listener error:', error);
        }
      }
    });
  }

  /**
   * Public API methods
   */
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

  getStoreAddress() {
    return this.currentStore?.address || '';
  }

  getStorePhone() {
    return this.currentStore?.phone || '';
  }

  /**
   * Cleanup method
   */
  destroy() {
    if (this.validationInterval) {
      clearInterval(this.validationInterval);
    }
    
    if (this.syncChannel) {
      this.syncChannel.close();
    }
    
    this.listeners.clear();
  }
}

// Create singleton instance
if (!window.storeManager) {
  window.storeManager = new StoreManager();
  console.log('[StoreManager] Singleton instance created');
}