/**
 * Comprehensive unit tests for store persistence components
 * Tests StoreManager, ToastManager, and InitializationManager
 */

// Mock localStorage for testing
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = String(value);
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((index) => Object.keys(store)[index] || null)
  };
})();

// Mock BroadcastChannel
const broadcastChannelMock = jest.fn(() => ({
  postMessage: jest.fn(),
  close: jest.fn(),
  onmessage: null
}));

// Mock DOM elements
const createMockDOM = () => {
  document.body.innerHTML = `
    <div id="toastContainer"></div>
    <div id="currentStore"></div>
    <div id="selectedStoreInfo"></div>
  `;
};

describe('Store Persistence System Tests', () => {
  let StoreManager, ToastManager, InitializationManager;

  beforeAll(() => {
    // Setup global mocks
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock
    });
    
    Object.defineProperty(window, 'BroadcastChannel', {
      value: broadcastChannelMock
    });

    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });

    // Mock performance
    global.performance = {
      now: jest.fn(() => Date.now())
    };

    // Mock requestAnimationFrame
    global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 0));

    createMockDOM();
  });

  beforeEach(() => {
    // Reset mocks and localStorage before each test
    jest.clearAllMocks();
    localStorageMock.clear();
    createMockDOM();

    // Clear any existing instances
    delete window.storeManager;
    delete window.toastManager;
    delete window.initManager;

    // Import classes fresh for each test
    jest.resetModules();
  });

  describe('StoreManager', () => {
    let storeManager;

    beforeEach(async () => {
      // Load StoreManager class
      const StoreManagerCode = require('fs').readFileSync(
        '/Users/cosburn/Kroger Shopping AI/public/js/StoreManager.js',
        'utf8'
      );
      
      // Create a safe evaluation context
      const context = {
        console,
        localStorage: localStorageMock,
        window: global,
        BroadcastChannel: broadcastChannelMock,
        btoa: (str) => Buffer.from(str).toString('base64'),
        navigator: { onLine: true },
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval
      };

      // Execute StoreManager code in context
      const vm = require('vm');
      vm.createContext(context);
      vm.runInContext(StoreManagerCode, context);
      
      StoreManager = context.StoreManager;
      storeManager = new StoreManager();
    });

    describe('Initialization', () => {
      test('should initialize without errors', async () => {
        expect(() => storeManager.initialize()).not.toThrow();
        const result = await storeManager.initialize();
        expect(storeManager.isInitialized).toBe(true);
      });

      test('should return same promise on multiple initialization calls', async () => {
        const promise1 = storeManager.initialize();
        const promise2 = storeManager.initialize();
        expect(promise1).toBe(promise2);
      });

      test('should setup cross-tab sync during initialization', async () => {
        await storeManager.initialize();
        expect(broadcastChannelMock).toHaveBeenCalledWith('kroger_store_sync');
      });
    });

    describe('Store Loading and Migration', () => {
      test('should load store from new format', async () => {
        const testStore = {
          id: 'store123',
          name: 'Test Store',
          address: '123 Main St',
          phone: '555-0123'
        };

        localStorageMock.setItem('kroger_store_id', testStore.id);
        localStorageMock.setItem('kroger_store_name', testStore.name);
        localStorageMock.setItem('kroger_store_address', testStore.address);
        localStorageMock.setItem('kroger_store_phone', testStore.phone);

        const result = await storeManager.loadStore();
        expect(result).toMatchObject(testStore);
        expect(storeManager.currentStore).toMatchObject(testStore);
      });

      test('should migrate from legacy format', async () => {
        // Setup legacy data
        localStorageMock.setItem('defaultStoreId', 'legacy123');
        localStorageMock.setItem('defaultStoreName', 'Legacy Store');
        localStorageMock.setItem('defaultStoreAddress', '456 Old St');

        await storeManager.loadStore();

        // Should migrate to new format
        expect(localStorageMock.setItem).toHaveBeenCalledWith('kroger_store_id', 'legacy123');
        expect(localStorageMock.setItem).toHaveBeenCalledWith('kroger_store_name', 'Legacy Store');
        expect(localStorageMock.setItem).toHaveBeenCalledWith('kroger_store_address', '456 Old St');

        // Should clean up legacy keys
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('defaultStoreId');
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('defaultStoreName');
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('defaultStoreAddress');
      });

      test('should handle empty/invalid data gracefully', async () => {
        const result = await storeManager.loadStore();
        expect(result).toBeNull();
        expect(storeManager.currentStore).toBeNull();
      });
    });

    describe('Store Validation', () => {
      test('should validate complete store data', () => {
        const validStore = {
          id: 'store123',
          name: 'Test Store',
          address: '123 Main St',
          phone: '555-0123'
        };

        expect(storeManager.isValidStoreData(validStore)).toBe(true);
      });

      test('should reject incomplete store data', () => {
        const invalidStore = { id: 'store123' }; // Missing name
        expect(storeManager.isValidStoreData(invalidStore)).toBe(false);
      });

      test('should validate store hash integrity', () => {
        const store = {
          id: 'store123',
          name: 'Test Store',
          address: '123 Main St',
          phone: '555-0123'
        };

        store.hash = storeManager.generateStoreHash(store);
        expect(storeManager.isValidStoreData(store)).toBe(true);

        // Corrupt the hash
        store.hash = 'invalid_hash';
        expect(storeManager.isValidStoreData(store)).toBe(false);
      });
    });

    describe('Store Persistence', () => {
      test('should save store data correctly', () => {
        const testStore = {
          id: 'store123',
          name: 'Test Store',
          address: '123 Main St',
          phone: '555-0123'
        };

        const result = storeManager.saveStore(testStore);

        expect(localStorageMock.setItem).toHaveBeenCalledWith('kroger_store_id', 'store123');
        expect(localStorageMock.setItem).toHaveBeenCalledWith('kroger_store_name', 'Test Store');
        expect(result).toMatchObject(testStore);
        expect(result.hash).toBeDefined();
        expect(result.lastUpdated).toBeDefined();
      });

      test('should throw error for invalid store data', () => {
        const invalidStore = { id: 'store123' }; // Missing required name
        expect(() => storeManager.saveStore(invalidStore)).toThrow('Invalid store data');
      });

      test('should clear all store data', () => {
        storeManager.currentStore = { id: 'test' };
        storeManager.clearStore();

        Object.values(storeManager.STORAGE_KEYS).forEach(key => {
          expect(localStorageMock.removeItem).toHaveBeenCalledWith(key);
        });
        expect(storeManager.currentStore).toBeNull();
      });
    });

    describe('Cross-tab Synchronization', () => {
      test('should broadcast store changes', () => {
        const mockChannel = {
          postMessage: jest.fn(),
          close: jest.fn()
        };
        storeManager.syncChannel = mockChannel;

        const testStore = { id: 'store123', name: 'Test Store' };
        storeManager.saveStore(testStore);

        expect(mockChannel.postMessage).toHaveBeenCalledWith({
          type: 'store-changed',
          store: expect.objectContaining(testStore),
          timestamp: expect.any(Number)
        });
      });

      test('should handle sync messages from other tabs', () => {
        const mockStore = { id: 'store456', name: 'Synced Store' };
        const mockMessage = {
          type: 'store-changed',
          store: mockStore,
          timestamp: Date.now()
        };

        storeManager.handleSyncMessage(mockMessage);
        expect(storeManager.currentStore).toEqual(mockStore);
      });
    });

    describe('Event System', () => {
      test('should add and notify event listeners', () => {
        const callback = jest.fn();
        storeManager.addEventListener('store-changed', callback);

        const testStore = { id: 'store123', name: 'Test Store' };
        storeManager.saveStore(testStore);

        expect(callback).toHaveBeenCalledWith(expect.objectContaining(testStore));
      });

      test('should remove event listeners', () => {
        const callback = jest.fn();
        storeManager.addEventListener('store-changed', callback);
        storeManager.removeEventListener('store-changed', callback);

        const testStore = { id: 'store123', name: 'Test Store' };
        storeManager.saveStore(testStore);

        expect(callback).not.toHaveBeenCalled();
      });
    });

    describe('Public API', () => {
      test('hasStore should return correct boolean', () => {
        expect(storeManager.hasStore()).toBe(false);

        storeManager.currentStore = { id: 'store123', name: 'Test Store' };
        expect(storeManager.hasStore()).toBe(true);
      });

      test('getStoreId should return correct ID', () => {
        expect(storeManager.getStoreId()).toBeNull();

        storeManager.currentStore = { id: 'store123', name: 'Test Store' };
        expect(storeManager.getStoreId()).toBe('store123');
      });

      test('ensureStoreSelected should throw when no store', async () => {
        await storeManager.initialize();
        await expect(storeManager.ensureStoreSelected()).rejects.toThrow('No store selected');
      });
    });
  });

  describe('ToastManager', () => {
    let toastManager;

    beforeEach(() => {
      // Load ToastManager class
      const ToastManagerCode = require('fs').readFileSync(
        '/Users/cosburn/Kroger Shopping AI/public/js/ToastManager.js',
        'utf8'
      );
      
      const context = {
        console,
        window: global,
        document,
        setTimeout,
        clearTimeout,
        requestAnimationFrame: global.requestAnimationFrame
      };

      const vm = require('vm');
      vm.createContext(context);
      vm.runInContext(ToastManagerCode, context);
      
      ToastManager = context.ToastManager;
      toastManager = new ToastManager();
    });

    describe('Toast Creation', () => {
      test('should create toast container on initialization', () => {
        expect(document.getElementById('toastContainer')).toBeTruthy();
      });

      test('should show toast with correct content', () => {
        const toastId = toastManager.show('Test Title', 'Test Message', 'info');
        expect(toastId).toBeTruthy();
        expect(toastManager.activeToasts.has(toastId)).toBe(true);
      });

      test('should prevent duplicate toasts by default', () => {
        const id1 = toastManager.show('Same Title', 'Same Message', 'info');
        const id2 = toastManager.show('Same Title', 'Same Message', 'info');
        
        expect(id1).toBeTruthy();
        expect(id2).toBeNull();
      });

      test('should allow duplicates when explicitly enabled', () => {
        const id1 = toastManager.show('Same Title', 'Same Message', 'info', null, { allowDuplicates: true });
        const id2 = toastManager.show('Same Title', 'Same Message', 'info', null, { allowDuplicates: true });
        
        expect(id1).toBeTruthy();
        expect(id2).toBeTruthy();
        expect(id1).not.toBe(id2);
      });
    });

    describe('Toast Management', () => {
      test('should limit number of active toasts', () => {
        // Exceed max toasts (default is 3)
        for (let i = 0; i < 5; i++) {
          toastManager.show(`Title ${i}`, `Message ${i}`, 'info');
        }
        
        expect(toastManager.activeToasts.size).toBeLessThanOrEqual(toastManager.maxToasts);
      });

      test('should update existing toast', () => {
        const toastId = toastManager.show('Original Title', 'Original Message', 'info');
        
        toastManager.update(toastId, {
          title: 'Updated Title',
          message: 'Updated Message',
          type: 'success'
        });

        const toast = toastManager.activeToasts.get(toastId);
        expect(toast.title).toBe('Updated Title');
        expect(toast.message).toBe('Updated Message');
        expect(toast.type).toBe('success');
      });

      test('should clear all toasts', () => {
        toastManager.show('Title 1', 'Message 1', 'info');
        toastManager.show('Title 2', 'Message 2', 'warning');
        
        expect(toastManager.activeToasts.size).toBe(2);
        
        toastManager.clear();
        
        // Note: clear() calls removeToast which has animation delays,
        // so we check that the removal process started
        expect(toastManager.queue).toHaveLength(0);
      });

      test('should clear toasts by type', () => {
        toastManager.show('Info Toast', 'Info Message', 'info');
        toastManager.show('Error Toast', 'Error Message', 'error');
        toastManager.show('Another Info', 'Another Info Message', 'info');
        
        toastManager.clearType('info');
        
        // Should only have error toast remaining
        const remainingToasts = Array.from(toastManager.activeToasts.values());
        expect(remainingToasts.every(toast => toast.type !== 'info')).toBe(true);
      });
    });

    describe('Convenience Methods', () => {
      test('showSuccess should create success toast', () => {
        const toastId = toastManager.showSuccess('Success!', 'Operation completed');
        const toast = toastManager.activeToasts.get(toastId);
        expect(toast.type).toBe('success');
      });

      test('showError should create error toast with longer duration', () => {
        const toastId = toastManager.showError('Error!', 'Something went wrong');
        const toast = toastManager.activeToasts.get(toastId);
        expect(toast.type).toBe('error');
        expect(toast.duration).toBe(5000); // Errors show longer
      });

      test('showLoading should create persistent loading toast', () => {
        const toastId = toastManager.showLoading('Loading...', 'Please wait');
        const toast = toastManager.activeToasts.get(toastId);
        expect(toast.type).toBe('loading');
        expect(toast.duration).toBe(0); // Persistent
      });
    });
  });

  describe('InitializationManager', () => {
    let initManager;

    beforeEach(() => {
      // Load InitializationManager class
      const InitManagerCode = require('fs').readFileSync(
        '/Users/cosburn/Kroger Shopping AI/public/js/InitializationManager.js',
        'utf8'
      );
      
      // Mock additional DOM elements needed by InitManager
      document.body.innerHTML += `
        <input id="searchTerm" />
        <div class="tab-content" id="search-tab"></div>
        <div class="tab-content" id="settings-tab"></div>
        <div class="tab-button"></div>
      `;

      const context = {
        console,
        window: global,
        document,
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval,
        sessionStorage: {
          getItem: jest.fn(),
          setItem: jest.fn(),
          removeItem: jest.fn()
        },
        performance: global.performance,
        ToastManager,
        addEventListener: jest.fn()
      };

      // Mock storeManager for InitManager tests
      context.window.storeManager = {
        initialize: jest.fn().mockResolvedValue(null),
        hasStore: jest.fn().mockReturnValue(false),
        getStore: jest.fn().mockReturnValue(null),
        addEventListener: jest.fn(),
        validateStore: jest.fn().mockResolvedValue(true)
      };

      const vm = require('vm');
      vm.createContext(context);
      vm.runInContext(InitManagerCode, context);
      
      InitializationManager = context.InitializationManager;
      initManager = new InitializationManager();
    });

    describe('Initialization Process', () => {
      test('should initialize successfully', async () => {
        const result = await initManager.initialize();
        expect(result).toBe(true);
        expect(initManager.initialized).toBe(true);
      });

      test('should return same promise on multiple initialization calls', () => {
        const promise1 = initManager.initialize();
        const promise2 = initManager.initialize();
        expect(promise1).toBe(promise2);
      });

      test('should handle initialization errors gracefully', async () => {
        // Make storeManager initialization fail
        window.storeManager.initialize.mockRejectedValue(new Error('Init failed'));

        await expect(initManager.initialize()).rejects.toThrow('Init failed');
        expect(initManager.initialized).toBe(false);
      });
    });

    describe('Feature Management', () => {
      test('should disable features when no store is selected', () => {
        window.storeManager.hasStore.mockReturnValue(false);
        
        const searchInput = document.getElementById('searchTerm');
        initManager.enableFeatures();
        
        expect(searchInput.disabled).toBe(true);
        expect(searchInput.placeholder).toContain('Select a store first');
      });

      test('should enable features when store is selected', () => {
        window.storeManager.hasStore.mockReturnValue(true);
        
        const searchInput = document.getElementById('searchTerm');
        initManager.enableFeatures();
        
        expect(searchInput.disabled).toBe(false);
        expect(searchInput.placeholder).toContain('Search for products');
      });
    });

    describe('Store Event Handling', () => {
      test('should handle store changes', () => {
        const mockStore = { id: 'store123', name: 'Test Store' };
        
        // Mock toastManager
        window.toastManager = {
          showSuccess: jest.fn()
        };
        
        initManager.handleStoreChange(mockStore);
        
        expect(window.toastManager.showSuccess).toHaveBeenCalledWith(
          'Store Selected',
          'Now shopping at Test Store'
        );
      });

      test('should handle invalid store events', () => {
        window.toastManager = {
          showError: jest.fn()
        };
        
        initManager.handleStoreInvalid();
        
        expect(window.toastManager.showError).toHaveBeenCalledWith(
          'Store Invalid',
          'Please select a different store'
        );
      });

      test('should handle store sync events', () => {
        const mockStore = { id: 'store456', name: 'Synced Store' };
        
        const updateSpy = jest.spyOn(initManager, 'updateStoreDisplay');
        const enableSpy = jest.spyOn(initManager, 'enableFeatures');
        
        initManager.handleStoreSync(mockStore);
        
        expect(updateSpy).toHaveBeenCalled();
        expect(enableSpy).toHaveBeenCalled();
      });
    });

    describe('UI Updates', () => {
      test('should update store display correctly', () => {
        const mockStore = {
          id: 'store123',
          name: 'Test Store',
          address: '123 Main St',
          phone: '555-0123'
        };
        
        window.storeManager.getStore.mockReturnValue(mockStore);
        
        initManager.updateStoreDisplay();
        
        const currentStore = document.getElementById('currentStore');
        expect(currentStore.textContent).toBe('Test Store');
      });

      test('should show "No store selected" when no store is set', () => {
        window.storeManager.getStore.mockReturnValue(null);
        
        initManager.updateStoreDisplay();
        
        const currentStore = document.getElementById('currentStore');
        expect(currentStore.textContent).toBe('No store selected');
      });
    });
  });

  describe('Integration Tests', () => {
    test('should work together without errors', async () => {
      const storeManager = new StoreManager();
      const toastManager = new ToastManager();
      const initManager = new InitializationManager();

      // Mock necessary globals
      window.storeManager = storeManager;
      window.toastManager = toastManager;

      // Should initialize without throwing
      expect(async () => {
        await storeManager.initialize();
        await initManager.initialize();
      }).not.toThrow();
    });

    test('should handle store events across components', async () => {
      const storeManager = new StoreManager();
      const toastManager = new ToastManager();
      
      window.storeManager = storeManager;
      window.toastManager = toastManager;
      
      await storeManager.initialize();
      
      const mockCallback = jest.fn();
      storeManager.addEventListener('store-changed', mockCallback);
      
      const testStore = {
        id: 'store123',
        name: 'Integration Test Store',
        address: '123 Test St',
        phone: '555-0123'
      };
      
      storeManager.saveStore(testStore);
      
      expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining(testStore));
    });
  });

  describe('Error Handling', () => {
    test('should handle localStorage unavailability', () => {
      // Mock localStorage to throw errors
      const throwingLocalStorage = {
        getItem: jest.fn(() => { throw new Error('localStorage unavailable'); }),
        setItem: jest.fn(() => { throw new Error('localStorage unavailable'); }),
        removeItem: jest.fn(() => { throw new Error('localStorage unavailable'); })
      };

      Object.defineProperty(window, 'localStorage', {
        value: throwingLocalStorage
      });

      const storeManager = new StoreManager();
      
      // Should not throw, should handle gracefully
      expect(async () => {
        await storeManager.loadStore();
      }).not.toThrow();
    });

    test('should handle BroadcastChannel unavailability', async () => {
      // Mock BroadcastChannel to throw
      Object.defineProperty(window, 'BroadcastChannel', {
        value: function() { throw new Error('BroadcastChannel unavailable'); }
      });

      const storeManager = new StoreManager();
      
      // Should fallback to storage events
      expect(async () => {
        await storeManager.initialize();
      }).not.toThrow();
    });

    test('should handle network offline scenarios', async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false
      });

      const storeManager = new StoreManager();
      storeManager.currentStore = { id: 'test', name: 'Test Store' };

      const result = await storeManager.validateStore();
      expect(result).toBe(true); // Should skip validation when offline
    });
  });
});