/**
 * Store Data Migration Utility
 * Migrates legacy localStorage data to new format
 */

(function() {
  console.log('[Migration] Store data migration utility starting...');
  
  const MIGRATION_VERSION_KEY = 'store_migration_version';
  const CURRENT_VERSION = '2.0';
  
  /**
   * Check if migration is needed
   */
  function needsMigration() {
    const migrationVersion = localStorage.getItem(MIGRATION_VERSION_KEY);
    return migrationVersion !== CURRENT_VERSION;
  }
  
  /**
   * Perform the migration
   */
  function performMigration() {
    console.log('[Migration] Starting migration to version', CURRENT_VERSION);
    
    // List of all possible legacy keys
    const legacyMappings = {
      // Old format 1: defaultStore* keys
      'defaultStoreId': 'kroger_store_id',
      'defaultStoreName': 'kroger_store_name',
      'defaultStoreAddress': 'kroger_store_address',
      'defaultStorePhone': 'kroger_store_phone',
      
      // Old format 2: selectedStore* keys
      'selectedStoreId': 'kroger_store_id',
      'selectedStoreName': 'kroger_store_name',
      
      // Old format 3: kroger-store-* keys
      'kroger-store-id': 'kroger_store_id',
      'kroger-store-name': 'kroger_store_name',
      'kroger-store-address': 'kroger_store_address',
      'kroger-store-phone': 'kroger_store_phone'
    };
    
    // Track what we've migrated
    const migrated = {};
    let hasData = false;
    
    // Check each legacy key
    for (const [oldKey, newKey] of Object.entries(legacyMappings)) {
      const value = localStorage.getItem(oldKey);
      if (value && value !== 'null' && value !== 'undefined') {
        console.log(`[Migration] Found ${oldKey}: ${value}`);
        
        // Only migrate if we don't already have data in the new key
        const existingValue = localStorage.getItem(newKey);
        if (!existingValue || existingValue === 'null') {
          migrated[newKey] = value;
          hasData = true;
        }
      }
    }
    
    // Apply migrated data
    if (hasData) {
      console.log('[Migration] Migrating data:', migrated);
      
      // Ensure we have required fields
      if (migrated['kroger_store_id']) {
        // Save all migrated data
        for (const [key, value] of Object.entries(migrated)) {
          localStorage.setItem(key, value);
        }
        
        // Add missing fields with defaults
        if (!migrated['kroger_location_id']) {
          localStorage.setItem('kroger_location_id', migrated['kroger_store_id']);
        }
        
        if (!migrated['kroger_store_last_updated']) {
          localStorage.setItem('kroger_store_last_updated', new Date().toISOString());
        }
        
        // Generate hash for data integrity
        const hashData = `${migrated['kroger_store_id']}|${migrated['kroger_store_name'] || ''}`;
        const hash = btoa(hashData).substring(0, 16);
        localStorage.setItem('kroger_store_hash', hash);
        
        console.log('[Migration] Data migrated successfully');
        
        // Clean up old keys
        cleanupLegacyKeys();
      }
    } else {
      console.log('[Migration] No legacy data found to migrate');
    }
    
    // Mark migration as complete
    localStorage.setItem(MIGRATION_VERSION_KEY, CURRENT_VERSION);
    console.log('[Migration] Migration complete');
  }
  
  /**
   * Clean up legacy keys
   */
  function cleanupLegacyKeys() {
    console.log('[Migration] Cleaning up legacy keys...');
    
    const keysToRemove = [
      // Old format keys
      'defaultStoreId', 'defaultStoreName', 'defaultStoreAddress', 'defaultStorePhone',
      'selectedStoreId', 'selectedStoreName',
      'kroger-store-id', 'kroger-store-name', 'kroger-store-address', 'kroger-store-phone',
      
      // Other obsolete keys
      'storeData', 'lastStoreUpdate', 'tempStore', 'pendingStore'
    ];
    
    keysToRemove.forEach(key => {
      if (localStorage.getItem(key) !== null) {
        console.log(`[Migration] Removing legacy key: ${key}`);
        localStorage.removeItem(key);
      }
    });
  }
  
  /**
   * Validate migrated data
   */
  function validateMigratedData() {
    const requiredKeys = ['kroger_store_id', 'kroger_store_name'];
    const missingKeys = [];
    
    requiredKeys.forEach(key => {
      const value = localStorage.getItem(key);
      if (!value || value === 'null' || value === 'undefined') {
        missingKeys.push(key);
      }
    });
    
    if (missingKeys.length > 0) {
      console.warn('[Migration] Missing required keys after migration:', missingKeys);
      return false;
    }
    
    console.log('[Migration] Migrated data validated successfully');
    return true;
  }
  
  /**
   * Export current store data (for debugging)
   */
  window.exportStoreData = function() {
    const storeKeys = [
      'kroger_store_id', 'kroger_store_name', 'kroger_store_address',
      'kroger_store_phone', 'kroger_location_id', 'kroger_store_division',
      'kroger_store_last_updated', 'kroger_store_hash'
    ];
    
    const data = {};
    storeKeys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        data[key] = value;
      }
    });
    
    console.log('Current store data:', data);
    return data;
  };
  
  /**
   * Import store data (for debugging/testing)
   */
  window.importStoreData = function(data) {
    if (!data || typeof data !== 'object') {
      console.error('Invalid data format');
      return false;
    }
    
    // Validate required fields
    if (!data.kroger_store_id || !data.kroger_store_name) {
      console.error('Missing required fields: kroger_store_id and kroger_store_name');
      return false;
    }
    
    // Import the data
    Object.entries(data).forEach(([key, value]) => {
      if (key.startsWith('kroger_')) {
        localStorage.setItem(key, value);
      }
    });
    
    console.log('Store data imported successfully');
    
    // Reload store manager if available
    if (window.storeManager) {
      window.storeManager.loadStore().then(() => {
        console.log('Store manager reloaded with imported data');
      });
    }
    
    return true;
  };
  
  /**
   * Clear all store data (for testing)
   */
  window.clearAllStoreData = function() {
    const storeKeys = [
      'kroger_store_id', 'kroger_store_name', 'kroger_store_address',
      'kroger_store_phone', 'kroger_location_id', 'kroger_store_division',
      'kroger_store_last_updated', 'kroger_store_hash',
      'defaultStoreId', 'defaultStoreName', 'defaultStoreAddress', 'defaultStorePhone',
      'selectedStoreId', 'selectedStoreName'
    ];
    
    storeKeys.forEach(key => {
      localStorage.removeItem(key);
    });
    
    // Clear migration version to allow re-migration
    localStorage.removeItem(MIGRATION_VERSION_KEY);
    
    console.log('All store data cleared');
    
    // Clear store manager if available
    if (window.storeManager) {
      window.storeManager.clearStore();
    }
  };
  
  /**
   * Run the migration
   */
  function initialize() {
    try {
      if (needsMigration()) {
        console.log('[Migration] Migration needed, starting process...');
        performMigration();
        
        if (validateMigratedData()) {
          console.log('[Migration] Migration completed successfully');
        } else {
          console.warn('[Migration] Migration completed with warnings');
        }
      } else {
        console.log('[Migration] Already at version', CURRENT_VERSION, '- no migration needed');
      }
    } catch (error) {
      console.error('[Migration] Migration failed:', error);
    }
  }
  
  // Run migration immediately
  initialize();
  
  // Expose migration status
  window.storeMigrationStatus = {
    version: CURRENT_VERSION,
    needsMigration: needsMigration,
    performMigration: performMigration,
    validateData: validateMigratedData
  };
  
})();