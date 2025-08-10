// Simulation of the store selection fix working
console.log('🧪 Testing store selection fix...');

// Simulate app initialization
let selectedStoreId = null;
let selectedStoreName = 'None';

// Simulate DOM elements
const mockZipInput = { value: '' };
const mockStoreList = { innerHTML: '', options: [], value: '', appendChild: () => {} };

// Mock localStorage
const mockLocalStorage = {
    data: {},
    getItem: function(key) { return this.data[key] || null; },
    setItem: function(key, value) { this.data[key] = value; }
};

// Mock document.getElementById
function mockGetElementById(id) {
    if (id === 'zipCode') return mockZipInput;
    if (id === 'storeList') return mockStoreList;
    return null;
}

// Simulated loadPreferences function (with fix)
function loadPreferences() {
    console.log('📝 Loading preferences...');
    
    // Load saved ZIP code (THE FIX)
    const savedZipCode = mockLocalStorage.getItem('currentZipCode');
    if (savedZipCode) {
        const zipInput = mockGetElementById('zipCode');
        if (zipInput) {
            zipInput.value = savedZipCode;
            console.log(`✅ Loaded saved ZIP code: ${savedZipCode}`);
        }
    } else {
        console.log('❌ No saved ZIP code found');
    }
}

// Simulated findStoresSilent function (with fix)
async function findStoresSilent() {
    console.log('🏪 Finding stores silently...');
    
    let zipCode = mockGetElementById('zipCode').value;
    
    if (!zipCode) {
        // Try to use a default ZIP code for initial store loading (THE FIX)
        const defaultZip = '45202'; // Cincinnati, OH - central location
        console.log(`No zip code provided, using default: ${defaultZip}`);
        zipCode = defaultZip;
        
        // Set the default ZIP in the input for user reference
        const zipInput = mockGetElementById('zipCode');
        if (zipInput) {
            zipInput.value = defaultZip;
            mockLocalStorage.setItem('currentZipCode', defaultZip);
        }
    }
    
    console.log(`Finding stores for zip code: ${zipCode} (silent mode)`);
    
    try {
        // Simulate API call
        const response = await fetch(`http://localhost:3000/api/stores/nearby?zipCode=${zipCode}&radius=50`);
        const stores = await response.json();
        console.log(`Found ${stores.length} stores (silent mode)`);
        
        if (stores.length > 0) {
            // Auto-select first store (existing logic)
            selectedStoreId = stores[0].locationId;
            selectedStoreName = stores[0].name;
            console.log(`✅ Auto-selected store: ${selectedStoreName} (${selectedStoreId})`);
            return true;
        }
    } catch (error) {
        console.error('Store lookup error:', error);
        return false;
    }
    
    return false;
}

// Simulate app initialization
async function testAppInit() {
    console.log('🚀 App initializing...');
    console.log('Current state - selectedStoreId:', selectedStoreId);
    
    // Load preferences (now includes ZIP code loading)
    loadPreferences();
    
    // Find stores automatically
    const storeSelected = await findStoresSilent();
    
    console.log('After initialization:');
    console.log('- selectedStoreId:', selectedStoreId);
    console.log('- selectedStoreName:', selectedStoreName);
    console.log('- ZIP code:', mockGetElementById('zipCode').value);
    
    if (selectedStoreId) {
        console.log('✅ STORE SELECTION FIX WORKING: Store auto-selected successfully!');
        console.log('🔍 Search should now work without manual store selection');
    } else {
        console.log('❌ STORE SELECTION FIX FAILED: No store selected');
    }
}

// Test scenarios
async function runTests() {
    console.log('\n=== Test 1: Fresh install (no saved ZIP) ===');
    mockLocalStorage.data = {};
    mockZipInput.value = '';
    selectedStoreId = null;
    selectedStoreName = 'None';
    await testAppInit();
    
    console.log('\n=== Test 2: Returning user (saved ZIP) ===');
    mockLocalStorage.data = { 'currentZipCode': '90210' };
    mockZipInput.value = '';
    selectedStoreId = null;
    selectedStoreName = 'None';
    await testAppInit();
}

// Run the tests
runTests();