// Debug script to understand display issues
console.log('=== DEBUG DISPLAY SCRIPT LOADED ===');

// Override displayProducts to add more logging
const originalDisplayProducts = window.displayProducts;
window.displayProducts = function(products) {
    console.log('🔍 DEBUG: displayProducts intercepted with', products?.length || 0, 'products');
    
    // Check all relevant DOM elements
    const elements = {
        searchResults: document.getElementById('searchResults'),
        searchResultsHeader: document.getElementById('searchResultsHeader'),
        noResultsState: document.getElementById('noResultsState'),
        tableResults: document.getElementById('tableResults'),
        searchTab: document.getElementById('search-tab')
    };
    
    console.log('🔍 DEBUG: DOM Elements status:');
    Object.entries(elements).forEach(([name, el]) => {
        if (el) {
            console.log(`  ✓ ${name}: exists, display="${el.style.display}", class="${el.className}", visible=${el.offsetHeight > 0}`);
        } else {
            console.log(`  ✗ ${name}: NOT FOUND`);
        }
    });
    
    // Check if we're on the correct tab
    const activeTab = document.querySelector('.tab-content.active');
    console.log('🔍 DEBUG: Active tab:', activeTab?.id || 'NONE');
    
    // Call original function
    const result = originalDisplayProducts.apply(this, arguments);
    
    // Check results after display
    setTimeout(() => {
        const resultsDiv = document.getElementById('searchResults');
        if (resultsDiv) {
            console.log('🔍 DEBUG: After display:');
            console.log('  - innerHTML length:', resultsDiv.innerHTML.length);
            console.log('  - child count:', resultsDiv.children.length);
            console.log('  - first child:', resultsDiv.firstElementChild?.tagName);
            console.log('  - computed display:', getComputedStyle(resultsDiv).display);
            console.log('  - computed visibility:', getComputedStyle(resultsDiv).visibility);
            console.log('  - offsetHeight:', resultsDiv.offsetHeight);
            
            // Check if parent is hiding it
            let parent = resultsDiv.parentElement;
            while (parent && parent !== document.body) {
                const style = getComputedStyle(parent);
                if (style.display === 'none' || style.visibility === 'hidden') {
                    console.log('  ⚠️ Parent element hiding results:', parent.id || parent.className);
                }
                parent = parent.parentElement;
            }
        }
    }, 100);
    
    return result;
};

// Override displayGridView to add logging
const originalDisplayGridView = window.displayGridView;
window.displayGridView = function(products) {
    console.log('🔍 DEBUG: displayGridView intercepted with', products?.length || 0, 'products');
    
    const resultsDiv = document.getElementById('searchResults');
    console.log('🔍 DEBUG: searchResults before grid display:', {
        exists: !!resultsDiv,
        display: resultsDiv?.style.display,
        innerHTML: resultsDiv?.innerHTML.substring(0, 100) + '...'
    });
    
    const result = originalDisplayGridView.apply(this, arguments);
    
    console.log('🔍 DEBUG: searchResults after grid display:', {
        innerHTML: resultsDiv?.innerHTML.substring(0, 100) + '...',
        childCount: resultsDiv?.children.length
    });
    
    return result;
};

// Add a manual test function
window.debugManualDisplay = function() {
    console.log('🔍 DEBUG: Manual display test');
    
    const resultsDiv = document.getElementById('searchResults');
    if (!resultsDiv) {
        console.error('searchResults element not found!');
        return;
    }
    
    // Clear and add test content
    resultsDiv.innerHTML = '<div style="padding: 20px; background: yellow; color: black;">TEST CONTENT - If you see this, the display works!</div>';
    resultsDiv.style.display = 'block';
    
    // Make sure parent elements are visible
    let parent = resultsDiv.parentElement;
    while (parent && parent !== document.body) {
        parent.style.display = 'block';
        parent = parent.parentElement;
    }
    
    console.log('🔍 DEBUG: Test content added. You should see yellow box.');
};

console.log('=== DEBUG FUNCTIONS READY ===');
console.log('Run debugManualDisplay() to test display');