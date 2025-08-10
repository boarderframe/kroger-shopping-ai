/**
 * Automated UI Test Verification Script
 * Run this in the browser console to verify UI implementation
 */

class UITestVerifier {
    constructor() {
        this.testResults = {
            passed: 0,
            failed: 0,
            warnings: 0,
            issues: []
        };
        this.startTime = performance.now();
    }

    log(message, type = 'info') {
        const styles = {
            info: 'color: #0066cc',
            success: 'color: #28a745; font-weight: bold',
            error: 'color: #dc3545; font-weight: bold',
            warning: 'color: #ffc107; font-weight: bold'
        };
        console.log(`%c[UI TEST] ${message}`, styles[type]);
    }

    assert(condition, description, type = 'error') {
        if (condition) {
            this.testResults.passed++;
            this.log(`✅ ${description}`, 'success');
            return true;
        } else {
            if (type === 'warning') {
                this.testResults.warnings++;
                this.log(`⚠️ ${description}`, 'warning');
            } else {
                this.testResults.failed++;
                this.log(`❌ ${description}`, 'error');
            }
            this.testResults.issues.push({
                type,
                description,
                timestamp: new Date().toISOString()
            });
            return false;
        }
    }

    // Test DOM Elements Existence
    testDOMElements() {
        this.log('Testing DOM Elements...', 'info');

        // Essential elements
        this.assert(
            document.getElementById('searchTerm') !== null,
            'Search input field exists'
        );

        this.assert(
            document.getElementById('searchResults') !== null,
            'Search results container exists'
        );

        this.assert(
            document.getElementById('cartItems') !== null,
            'Cart items container exists'
        );

        this.assert(
            document.getElementById('productModal') !== null,
            'Product modal exists'
        );

        // Navigation tabs
        const tabButtons = document.querySelectorAll('.tab-button');
        this.assert(
            tabButtons.length === 4,
            'All 4 navigation tabs exist (Search, List, Cart, Settings)'
        );

        // Filter controls
        this.assert(
            document.getElementById('sortBy') !== null,
            'Sort dropdown exists'
        );

        this.assert(
            document.getElementById('filterBrand') !== null,
            'Brand filter dropdown exists'
        );

        this.assert(
            document.getElementById('onSaleOnly') !== null,
            'On Sale filter checkbox exists'
        );

        // View controls
        this.assert(
            document.getElementById('gridViewBtn') !== null && 
            document.getElementById('tableViewBtn') !== null,
            'Grid and table view buttons exist'
        );

        this.assert(
            document.getElementById('gridSize') !== null,
            'Grid size selector exists'
        );
    }

    // Test CSS Classes and Styling
    testStyling() {
        this.log('Testing CSS Styling...', 'info');

        // Check if main CSS is loaded
        const stylesheets = Array.from(document.styleSheets);
        const hasMainCSS = stylesheets.some(sheet => 
            sheet.href && sheet.href.includes('styles.css')
        );
        
        this.assert(
            hasMainCSS,
            'Main stylesheet (styles.css) is loaded'
        );

        // Test critical CSS classes exist
        const criticalClasses = [
            'product-card',
            'search-header',
            'filter-bar',
            'cart-item',
            'modal',
            'toast'
        ];

        criticalClasses.forEach(className => {
            const element = document.querySelector(`.${className}`);
            this.assert(
                element !== null || this.cssClassExists(className),
                `CSS class '${className}' exists or is properly defined`,
                'warning'
            );
        });

        // Test responsive breakpoints
        const computedStyle = getComputedStyle(document.documentElement);
        this.assert(
            window.getComputedStyle !== undefined,
            'Computed styles are accessible for responsive testing'
        );
    }

    // Test JavaScript Functionality
    testJavaScriptFunctionality() {
        this.log('Testing JavaScript Functionality...', 'info');

        // Check global variables
        this.assert(
            typeof cart !== 'undefined',
            'Global cart variable exists'
        );

        this.assert(
            typeof shoppingList !== 'undefined',
            'Global shoppingList variable exists'
        );

        this.assert(
            typeof currentProducts !== 'undefined',
            'Global currentProducts variable exists'
        );

        // Check critical functions
        const criticalFunctions = [
            'searchProducts',
            'addToCart',
            'updateCart',
            'showProductModal',
            'closeProductModal',
            'showTab',
            'filterProducts',
            'sortProducts'
        ];

        criticalFunctions.forEach(funcName => {
            this.assert(
                typeof window[funcName] === 'function',
                `Function '${funcName}' is defined and callable`
            );
        });

        // Test localStorage functionality
        try {
            localStorage.setItem('test', 'value');
            const retrieved = localStorage.getItem('test');
            localStorage.removeItem('test');
            this.assert(
                retrieved === 'value',
                'localStorage is functional'
            );
        } catch (e) {
            this.assert(
                false,
                'localStorage is functional'
            );
        }
    }

    // Test Event Listeners
    testEventListeners() {
        this.log('Testing Event Listeners...', 'info');

        const searchInput = document.getElementById('searchTerm');
        if (searchInput) {
            // Test if input events are properly bound
            const hasInputListener = this.hasEventListener(searchInput, 'input');
            this.assert(
                hasInputListener,
                'Search input has event listeners attached',
                'warning'
            );
        }

        // Test tab button event listeners
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach((button, index) => {
            const hasClickListener = this.hasEventListener(button, 'click') || 
                                   button.onclick !== null ||
                                   button.getAttribute('onclick') !== null;
            this.assert(
                hasClickListener,
                `Tab button ${index + 1} has click handler`,
                'warning'
            );
        });
    }

    // Test Accessibility Features
    testAccessibility() {
        this.log('Testing Accessibility Features...', 'info');

        // Check for alt text on images
        const images = document.querySelectorAll('img');
        images.forEach((img, index) => {
            this.assert(
                img.alt !== '',
                `Image ${index + 1} has alt text`,
                'warning'
            );
        });

        // Check for proper heading hierarchy
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        this.assert(
            headings.length > 0,
            'Page has heading elements for structure',
            'warning'
        );

        // Check for focus management
        const focusableElements = document.querySelectorAll(
            'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])'
        );
        this.assert(
            focusableElements.length > 0,
            'Page has focusable elements'
        );

        // Check for ARIA labels where appropriate
        const interactiveElements = document.querySelectorAll('button, input');
        let hasAriaLabels = false;
        interactiveElements.forEach(element => {
            if (element.getAttribute('aria-label') || 
                element.getAttribute('aria-labelledby') ||
                element.getAttribute('title')) {
                hasAriaLabels = true;
            }
        });
        this.assert(
            hasAriaLabels,
            'Some interactive elements have ARIA labels or titles',
            'warning'
        );
    }

    // Test Performance Characteristics
    testPerformance() {
        this.log('Testing Performance Characteristics...', 'info');

        // Check for performance monitoring
        this.assert(
            typeof performanceMetrics !== 'undefined',
            'Performance metrics tracking is implemented',
            'warning'
        );

        // Check for service worker
        this.assert(
            'serviceWorker' in navigator,
            'Browser supports service workers'
        );

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(registrations => {
                this.assert(
                    registrations.length > 0,
                    'Service worker is registered',
                    'warning'
                );
            });
        }

        // Check for caching mechanisms
        this.assert(
            typeof searchCache !== 'undefined' && searchCache instanceof Map,
            'Search caching is implemented'
        );

        this.assert(
            typeof imageCache !== 'undefined' && imageCache instanceof Map,
            'Image caching is implemented'
        );

        // Check for intersection observer (lazy loading)
        this.assert(
            'IntersectionObserver' in window,
            'Browser supports Intersection Observer for lazy loading'
        );
    }

    // Test Mobile/Responsive Features
    testResponsiveFeatures() {
        this.log('Testing Responsive Features...', 'info');

        // Check viewport meta tag
        const viewportMeta = document.querySelector('meta[name="viewport"]');
        this.assert(
            viewportMeta !== null,
            'Viewport meta tag exists for mobile responsiveness'
        );

        // Check for touch-friendly button sizes
        const buttons = document.querySelectorAll('button');
        let touchFriendlyButtons = 0;
        buttons.forEach(button => {
            const rect = button.getBoundingClientRect();
            if (rect.width >= 44 && rect.height >= 44) {
                touchFriendlyButtons++;
            }
        });

        this.assert(
            touchFriendlyButtons > 0,
            'Some buttons meet minimum touch target size (44px)',
            'warning'
        );

        // Test CSS media queries
        const hasMediaQueries = this.checkForMediaQueries();
        this.assert(
            hasMediaQueries,
            'CSS media queries are defined for responsive design',
            'warning'
        );
    }

    // Test Error Handling
    testErrorHandling() {
        this.log('Testing Error Handling...', 'info');

        // Check for error handling in critical functions
        const searchFunction = window.searchProducts;
        if (searchFunction) {
            // Check if function has try-catch blocks (basic check)
            const funcString = searchFunction.toString();
            this.assert(
                funcString.includes('try') && funcString.includes('catch'),
                'Search function includes error handling',
                'warning'
            );
        }

        // Check for toast notification system
        this.assert(
            typeof showToast === 'function',
            'Toast notification system is implemented'
        );

        // Check for console error suppression
        const originalError = console.error;
        let errorCount = 0;
        console.error = (...args) => {
            errorCount++;
            originalError.apply(console, args);
        };

        // Reset after a short delay
        setTimeout(() => {
            console.error = originalError;
            this.assert(
                errorCount === 0,
                'No console errors detected during test',
                'warning'
            );
        }, 1000);
    }

    // Helper Methods
    cssClassExists(className) {
        const sheets = document.styleSheets;
        for (let sheet of sheets) {
            try {
                const rules = sheet.cssRules || sheet.rules;
                for (let rule of rules) {
                    if (rule.selectorText && rule.selectorText.includes(`.${className}`)) {
                        return true;
                    }
                }
            } catch (e) {
                // Cross-origin stylesheets may throw errors
                continue;
            }
        }
        return false;
    }

    hasEventListener(element, eventType) {
        // This is a simplified check - actual implementation may vary
        return element[`on${eventType}`] !== null || 
               element.getAttribute(`on${eventType}`) !== null;
    }

    checkForMediaQueries() {
        const sheets = document.styleSheets;
        for (let sheet of sheets) {
            try {
                const rules = sheet.cssRules || sheet.rules;
                for (let rule of rules) {
                    if (rule.type === CSSRule.MEDIA_RULE) {
                        return true;
                    }
                }
            } catch (e) {
                continue;
            }
        }
        return false;
    }

    // Run all tests
    runAllTests() {
        this.log('🚀 Starting Kroger Shopping AI UI Test Suite...', 'info');
        
        try {
            this.testDOMElements();
            this.testStyling();
            this.testJavaScriptFunctionality();
            this.testEventListeners();
            this.testAccessibility();
            this.testPerformance();
            this.testResponsiveFeatures();
            this.testErrorHandling();
        } catch (error) {
            this.log(`Test suite encountered an error: ${error.message}`, 'error');
            this.testResults.failed++;
        }

        this.generateReport();
    }

    // Generate comprehensive test report
    generateReport() {
        const endTime = performance.now();
        const duration = ((endTime - this.startTime) / 1000).toFixed(2);

        console.log('\n' + '='.repeat(60));
        console.log('🏁 KROGER SHOPPING AI - UI TEST REPORT');
        console.log('='.repeat(60));
        
        console.log(`\n📊 TEST SUMMARY:`);
        console.log(`   ✅ Passed: ${this.testResults.passed}`);
        console.log(`   ❌ Failed: ${this.testResults.failed}`);
        console.log(`   ⚠️  Warnings: ${this.testResults.warnings}`);
        console.log(`   ⏱️  Duration: ${duration}s`);

        const totalTests = this.testResults.passed + this.testResults.failed + this.testResults.warnings;
        const passRate = totalTests > 0 ? ((this.testResults.passed / totalTests) * 100).toFixed(1) : 0;
        
        console.log(`\n📈 PASS RATE: ${passRate}%`);

        // Overall assessment
        let assessment = 'FAIL';
        if (this.testResults.failed === 0 && this.testResults.warnings <= 3) {
            assessment = 'EXCELLENT';
        } else if (this.testResults.failed <= 2 && this.testResults.warnings <= 5) {
            assessment = 'GOOD';
        } else if (this.testResults.failed <= 5) {
            assessment = 'NEEDS IMPROVEMENT';
        }

        console.log(`\n🎯 OVERALL ASSESSMENT: ${assessment}`);

        if (this.testResults.issues.length > 0) {
            console.log(`\n🐛 ISSUES FOUND:`);
            this.testResults.issues.forEach((issue, index) => {
                const icon = issue.type === 'warning' ? '⚠️' : '❌';
                console.log(`   ${icon} ${index + 1}. ${issue.description}`);
            });
        }

        console.log(`\n💡 RECOMMENDATIONS:`);
        
        if (this.testResults.failed > 0) {
            console.log(`   🔧 Fix ${this.testResults.failed} critical issues before production`);
        }
        
        if (this.testResults.warnings > 5) {
            console.log(`   ⚡ Address ${this.testResults.warnings} warnings to improve UX`);
        }

        if (this.testResults.failed === 0 && this.testResults.warnings <= 3) {
            console.log(`   🎉 Great job! UI implementation looks solid`);
            console.log(`   📱 Test on multiple devices and browsers`);
            console.log(`   🚀 Ready for user acceptance testing`);
        }

        console.log('\n' + '='.repeat(60));

        // Return results for programmatic access
        return {
            ...this.testResults,
            passRate: parseFloat(passRate),
            assessment,
            duration: parseFloat(duration)
        };
    }
}

// Auto-run tests when script is loaded
const uiTester = new UITestVerifier();

// Add to global scope for manual testing
window.runUITests = () => uiTester.runAllTests();
window.uiTester = uiTester;

// Display instructions
console.log('%c🧪 UI Test Verification Script Loaded!', 'color: #0066cc; font-size: 16px; font-weight: bold');
console.log('%cRun runUITests() to start comprehensive testing', 'color: #666; font-style: italic');
console.log('%cOr run uiTester.runAllTests() for the same result', 'color: #666; font-style: italic');

// Auto-run if page is fully loaded
if (document.readyState === 'complete') {
    setTimeout(() => uiTester.runAllTests(), 1000);
} else {
    window.addEventListener('load', () => {
        setTimeout(() => uiTester.runAllTests(), 1000);
    });
}