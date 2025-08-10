// State management - simplified
let selectedStoreId = null;
let selectedStoreName = 'None';
let shoppingList = [];
let cart = [];
let currentProducts = [];
let currentView = 'grid';
let isInitializing = true; // Flag to track app initialization

// Store manager integration flag
let useStoreManager = true;

// Filter state management
let activeCategoryFilters = new Set();
let activeQuickFilters = new Set();
let allProducts = [];

// Simple cache
const searchCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Cache busting utility for development
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.forceCacheRefresh = function() {
        fetch('/api/dev/refresh-cache')
            .then(response => response.json())
            .then(data => {
                console.log('Cache refreshed:', data);
                alert('Cache refreshed! Reloading page...');
                window.location.reload(true);
            })
            .catch(error => {
                console.error('Error refreshing cache:', error);
            });
    };
    
    // Add keyboard shortcut Ctrl+Shift+R for force refresh
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.shiftKey && e.key === 'R') {
            e.preventDefault();
            window.forceCacheRefresh();
        }
    });
    
    console.log('🔄 Development mode: Use Ctrl+Shift+R to force cache refresh or call forceCacheRefresh()');
    
    // Integration test function
    window.testIntegration = async function() {
        try {
            const response = await fetch('/api/integration-test');
            const data = await response.json();
            console.log('⚡ Integration test result:', data);
            return data;
        } catch (error) {
            console.error('Integration test failed:', error);
            return null;
        }
    };
    
    console.log('🔗 Integration test available: call testIntegration()');
}

// UI Reset function to ensure responsiveness
function resetUIState() {
    console.log('🔄 Resetting UI state to ensure responsiveness...');
    
    // Reset body overflow (in case modal was stuck open)
    document.body.style.overflow = 'auto';
    document.body.style.pointerEvents = 'auto';
    
    // Ensure modal is closed
    const modal = document.getElementById('productModal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    // Clear any potential overlay elements
    const overlays = document.querySelectorAll('[style*="position: fixed"]');
    overlays.forEach(overlay => {
        if (overlay.style.zIndex > 100 && !overlay.classList.contains('toast')) {
            overlay.style.display = 'none';
        }
    });
    
    // Reset any disabled states on critical elements
    const criticalButtons = document.querySelectorAll('.tab-button, button[onclick]');
    criticalButtons.forEach(btn => {
        if (btn.disabled && !btn.id.includes('checkout')) {
            btn.disabled = false;
        }
    });
    
    // Clear any stuck loading states
    const loadingElements = document.querySelectorAll('.btn-loading');
    loadingElements.forEach(el => {
        el.classList.remove('btn-loading');
    });
    
    console.log('✅ UI state reset complete - UI should be responsive now');
}

// ============================================
// PREMIUM TOAST NOTIFICATION SYSTEM
// ============================================

// Only define if not already loaded from js/ToastManager.js
if (!window.ToastManager) {
class ToastManager {
    constructor() {
        this.container = document.getElementById('toastContainer');
        this.toasts = new Map();
        this.toastId = 0;
        
        // Initialize container if it doesn't exist
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'toastContainer';
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        }
    }

    show(options) {
        const {
            title = '',
            message = '',
            type = 'info', // success, error, warning, info, cart-add
            duration = 4000,
            persistent = false,
            icon = this.getDefaultIcon(type)
        } = options;

        const toastId = ++this.toastId;
        const toast = this.createToastElement(toastId, title, message, type, icon, persistent, duration);
        
        this.container.appendChild(toast);
        this.toasts.set(toastId, toast);

        // Enhance accessibility
        if (window.accessibilityManager) {
            accessibilityManager.enhanceToastAccessibility(toast, type);
        }

        // Trigger show animation
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Auto-dismiss if not persistent
        if (!persistent && duration > 0) {
            this.startProgressBar(toast, duration);
            setTimeout(() => {
                this.hide(toastId);
            }, duration);
        }

        return toastId;
    }

    createToastElement(id, title, message, type, icon, persistent, duration) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.dataset.toastId = id;

        const progressBar = !persistent && duration > 0 ? 
            '<div class="toast-progress"></div>' : '';

        toast.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-content">
                ${title ? `<div class="toast-title">${title}</div>` : ''}
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" onclick="toastManager.hide(${id})" title="Close">×</button>
            ${progressBar}
        `;

        return toast;
    }

    startProgressBar(toast, duration) {
        const progressBar = toast.querySelector('.toast-progress');
        if (progressBar) {
            progressBar.style.width = '100%';
            progressBar.style.transitionDuration = `${duration}ms`;
            
            requestAnimationFrame(() => {
                progressBar.style.width = '0%';
            });
        }
    }

    hide(toastId) {
        const toast = this.toasts.get(toastId);
        if (!toast) return;

        toast.classList.add('hide');
        toast.classList.remove('show');

        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
            this.toasts.delete(toastId);
        }, 300);
    }

    getDefaultIcon(type) {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ',
            'cart-add': '🛒'
        };
        return icons[type] || icons.info;
    }

    // Convenience methods
    success(title, message, options = {}) {
        return this.show({ ...options, title, message, type: 'success' });
    }

    error(title, message, options = {}) {
        return this.show({ ...options, title, message, type: 'error', duration: 6000 });
    }

    warning(title, message, options = {}) {
        return this.show({ ...options, title, message, type: 'warning' });
    }

    info(title, message, options = {}) {
        return this.show({ ...options, title, message, type: 'info' });
    }

    cartAdd(productName, quantity = 1, options = {}) {
        const title = 'Added to Cart';
        const message = `${productName}${quantity > 1 ? ` (×${quantity})` : ''}`;
        return this.show({ 
            ...options, 
            title, 
            message, 
            type: 'cart-add',
            duration: 3000
        });
    }

    // Clear all toasts
    clear() {
        this.toasts.forEach((toast, id) => {
            this.hide(id);
        });
    }
}

} // End of ToastManager class conditional

// Initialize global toast manager
if (!window.toastManager) {
    window.toastManager = window.ToastManager ? new window.ToastManager() : new ToastManager();
}
const toastManager = window.toastManager;

// Global kill switch for all toasts
window.DISABLE_TOASTS = true;
// Harden: neutralize any toast methods if present
try {
    ['show','success','error','warning','info','showSuccess','showError','showWarning','showInfo','showLoading','clear','update','cartAdd']
      .forEach((name) => {
        if (toastManager && typeof toastManager[name] === 'function') {
            toastManager[name] = () => null;
        }
      });
} catch (_) {}

// Quiet toast controls to reduce notification noise
const ToastControl = (() => {
    const STORAGE_KEY = 'quietToasts';
    const DEFAULT_QUIET = true;
    const suppressedTypesWhenQuiet = new Set(['info', 'warning']);
    const recentToasts = new Map(); // key: title|message|type -> timestamp
    const SUPPRESS_WINDOW_MS = 5000;
    
    function isQuiet() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === null) return DEFAULT_QUIET;
        return stored === 'true';
    }
    
    function shouldSuppress(title, message, type) {
        const now = Date.now();
        // Suppress low-priority toasts entirely when quiet
        if (isQuiet() && suppressedTypesWhenQuiet.has(type)) return true;
        
        // Suppress rapid duplicates of the same content
        const key = `${type}|${title}|${message}`;
        const last = recentToasts.get(key) || 0;
        if (now - last < SUPPRESS_WINDOW_MS) return true;
        recentToasts.set(key, now);
        return false;
    }
    
    // Allow runtime tuning of max toasts/durations if supported
    try {
        if (toastManager) {
            if ('maxToasts' in toastManager) toastManager.maxToasts = 1;
            if ('defaultDuration' in toastManager) toastManager.defaultDuration = 2000;
        }
    } catch (_) {}
    
    return { isQuiet, shouldSuppress };
})();

// Global convenience functions (respect quiet mode and dedupe)
function showToast(title, message, type = 'info', options = {}) {
    return null;
}

function showSuccessToast(title, message, options = {}) { return null; }

function showErrorToast(title, message, options = {}) { return null; }

function showCartAddToast(productName, quantity = 1, options = {}) {
    return toastManager.cartAdd(productName, quantity, options);
}

// ============================================
// PREMIUM SKELETON LOADING SYSTEM
// ============================================

class SkeletonLoader {
    static createProductGridSkeleton(count = 8) {
        const gridColumns = document.getElementById('gridSize')?.value || 4;
        
        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton-container';
        skeleton.innerHTML = `
            <div class="skeleton-search-results">
                <div class="skeleton-search-header">
                    <div class="skeleton skeleton-search-info"></div>
                    <div class="skeleton-search-actions">
                        <div class="skeleton skeleton-search-action"></div>
                        <div class="skeleton skeleton-search-action"></div>
                    </div>
                </div>
                <div class="skeleton-product-grid" style="--grid-columns: ${gridColumns}">
                    ${Array(count).fill(0).map(() => this.createProductCardSkeleton()).join('')}
                </div>
            </div>
        `;
        
        return skeleton;
    }

    static createProductCardSkeleton() {
        return `
            <div class="skeleton-product-card">
                <div class="skeleton skeleton-product-image"></div>
                <div class="skeleton skeleton-product-title"></div>
                <div class="skeleton skeleton-product-brand"></div>
                <div class="skeleton skeleton-product-price"></div>
                <div class="skeleton-product-buttons">
                    <div class="skeleton skeleton-product-button"></div>
                    <div class="skeleton skeleton-product-button"></div>
                </div>
            </div>
        `;
    }

    static createTableSkeleton(rows = 10) {
        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton-container';
        skeleton.innerHTML = `
            <div class="skeleton-table-container">
                <div class="skeleton-table-header">
                    <div class="skeleton skeleton-table-title"></div>
                    <div class="skeleton-table-controls">
                        <div class="skeleton skeleton-table-control"></div>
                        <div class="skeleton skeleton-table-control"></div>
                        <div class="skeleton skeleton-table-control"></div>
                    </div>
                </div>
                <div class="skeleton-table-rows">
                    ${Array(rows).fill(0).map(() => this.createTableRowSkeleton()).join('')}
                </div>
            </div>
        `;
        
        return skeleton;
    }

    static createTableRowSkeleton() {
        return `
            <div class="skeleton-table-row">
                <div class="skeleton skeleton-table-cell checkbox"></div>
                <div class="skeleton skeleton-table-cell image"></div>
                <div class="skeleton skeleton-table-cell"></div>
                <div class="skeleton skeleton-table-cell"></div>
                <div class="skeleton skeleton-table-cell"></div>
                <div class="skeleton skeleton-table-cell"></div>
                <div class="skeleton skeleton-table-cell button"></div>
                <div class="skeleton skeleton-table-cell button"></div>
            </div>
        `;
    }

    static createStoreListSkeleton(count = 5) {
        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton-store-list';
        skeleton.innerHTML = Array(count).fill(0).map(() => 
            '<div class="skeleton skeleton-store-item"></div>'
        ).join('');
        
        return skeleton;
    }

    static createCartSkeleton(count = 3) {
        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton-container';
        skeleton.innerHTML = Array(count).fill(0).map(() => `
            <div class="skeleton-cart-item">
                <div class="skeleton skeleton-cart-image"></div>
                <div class="skeleton-cart-details">
                    <div class="skeleton skeleton-cart-name"></div>
                    <div class="skeleton skeleton-cart-brand"></div>
                </div>
                <div class="skeleton-cart-controls">
                    <div class="skeleton skeleton-cart-quantity"></div>
                    <div class="skeleton skeleton-cart-price"></div>
                </div>
            </div>
        `).join('');
        
        return skeleton;
    }

    static showSearchSkeleton() {
        const searchResults = document.getElementById('searchResults');
        const tableResults = document.getElementById('tableResults');
        const searchHeader = document.getElementById('searchResultsHeader');
        
        // Hide existing content
        if (searchHeader) searchHeader.style.display = 'none';
        
        if (currentView === 'grid') {
            if (searchResults) {
                searchResults.innerHTML = '';
                searchResults.appendChild(this.createProductGridSkeleton());
            }
            if (tableResults) tableResults.style.display = 'none';
        } else {
            if (tableResults) {
                tableResults.style.display = 'block';
                const tableBody = tableResults.querySelector('#tableBody');
                if (tableBody) {
                    tableBody.innerHTML = '';
                }
                // Add skeleton to table container
                const existingSkeleton = tableResults.querySelector('.skeleton-container');
                if (existingSkeleton) {
                    existingSkeleton.remove();
                }
                tableResults.appendChild(this.createTableSkeleton());
            }
            if (searchResults) searchResults.innerHTML = '';
        }
    }

    static hideSearchSkeleton() {
        const searchResults = document.getElementById('searchResults');
        const tableResults = document.getElementById('tableResults');
        
        // Remove skeleton elements
        if (searchResults) {
            const skeleton = searchResults.querySelector('.skeleton-container');
            if (skeleton) skeleton.remove();
        }
        
        if (tableResults) {
            const skeleton = tableResults.querySelector('.skeleton-container');
            if (skeleton) skeleton.remove();
        }
    }

    static showButtonLoading(button) {
        if (!button) return;
        
        button.classList.add('skeleton-loading');
        button.disabled = true;
        
        return () => {
            button.classList.remove('skeleton-loading');
            button.disabled = false;
        };
    }
}

// ============================================
// ENHANCED BUTTON STATES SYSTEM
// ============================================

class ButtonStateManager {
    static enhanceButton(button, options = {}) {
        if (!button) return null;
        
        const originalText = button.innerHTML;
        const originalDisabled = button.disabled;
        
        return {
            showLoading: (text = 'Loading...') => {
                button.classList.add('btn-loading');
                button.disabled = true;
                button.innerHTML = `
                    <div class="btn-spinner"></div>
                    <span>${text}</span>
                `;
            },
            
            showSuccess: (text = 'Success!', duration = 2000) => {
                button.classList.remove('btn-loading');
                button.classList.add('btn-success');
                button.innerHTML = `
                    <div class="btn-checkmark">✓</div>
                    <span>${text}</span>
                `;
                
                if (duration > 0) {
                    setTimeout(() => {
                        this.reset();
                    }, duration);
                }
            },
            
            showError: (text = 'Error', duration = 3000) => {
                button.classList.remove('btn-loading');
                button.classList.add('btn-error');
                button.innerHTML = `
                    <div class="btn-error-icon">✕</div>
                    <span>${text}</span>
                `;
                
                // Add shake animation
                button.style.animation = 'error 0.5s ease-out';
                setTimeout(() => {
                    button.style.animation = '';
                }, 500);
                
                if (duration > 0) {
                    setTimeout(() => {
                        this.reset();
                    }, duration);
                }
            },
            
            reset: () => {
                button.classList.remove('btn-loading', 'btn-success', 'btn-error');
                button.disabled = originalDisabled;
                button.innerHTML = originalText;
                button.style.animation = '';
            }
        };
    }
    
    static async executeWithStates(button, asyncFn, options = {}) {
        const {
            loadingText = 'Loading...',
            successText = 'Success!',
            errorText = 'Error',
            successDuration = 2000,
            errorDuration = 3000
        } = options;
        
        const btnManager = this.enhanceButton(button);
        if (!btnManager) return;
        
        try {
            btnManager.showLoading(loadingText);
            const result = await asyncFn();
            btnManager.showSuccess(successText, successDuration);
            return result;
        } catch (error) {
            btnManager.showError(errorText, errorDuration);
            throw error;
        }
    }
}

// Global convenience function
function enhanceButton(button, options = {}) {
    return ButtonStateManager.enhanceButton(button, options);
}

// ============================================
// PREMIUM ACCESSIBILITY SYSTEM
// ============================================

class AccessibilityManager {
    constructor() {
        this.srStatus = document.getElementById('sr-status');
        this.srAlerts = document.getElementById('sr-alerts');
        this.keyboardShortcuts = this.createKeyboardShortcuts();
        this.setupKeyboardNavigation();
        this.setupARIAUpdates();
    }

    // Announce to screen readers
    announceToScreenReader(message, isAlert = false) {
        const target = isAlert ? this.srAlerts : this.srStatus;
        if (target) {
            target.textContent = message;
            // Clear after a delay to allow re-announcing the same message
            setTimeout(() => {
                target.textContent = '';
            }, 1000);
        }
    }

    // Update tab navigation ARIA attributes
    updateTabNavigation(activeTabId) {
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            const isActive = button.getAttribute('aria-controls') === activeTabId;
            button.setAttribute('aria-selected', isActive.toString());
            button.classList.toggle('active', isActive);
        });
        
        // Announce tab change
        const activeTab = document.querySelector(`[aria-controls="${activeTabId}"]`);
        if (activeTab) {
            this.announceToScreenReader(`${activeTab.textContent.trim()} tab selected`);
        }
    }

    // Enhance toast notifications for accessibility
    enhanceToastAccessibility(toastElement, type) {
        toastElement.setAttribute('role', type === 'error' ? 'alert' : 'status');
        toastElement.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
        toastElement.setAttribute('aria-atomic', 'true');
        
        // Announce toast content
        const title = toastElement.querySelector('.toast-title')?.textContent || '';
        const message = toastElement.querySelector('.toast-message')?.textContent || '';
        this.announceToScreenReader(`${title} ${message}`, type === 'error');
    }

    // Setup keyboard shortcuts
    createKeyboardShortcuts() {
        const shortcuts = {
            '1': () => this.showTab('search'),
            '2': () => this.showTab('list'),
            '3': () => this.showTab('cart'),
            '4': () => this.showTab('settings'),
            '/': () => this.focusSearchInput(),
            'Escape': () => this.handleEscape(),
            'Enter': (e) => this.handleEnter(e),
            'ArrowDown': (e) => this.handleArrowNavigation(e, 'down'),
            'ArrowUp': (e) => this.handleArrowNavigation(e, 'up'),
            'ArrowLeft': (e) => this.handleArrowNavigation(e, 'left'),
            'ArrowRight': (e) => this.handleArrowNavigation(e, 'right'),
            'h': () => this.toggleKeyboardHelp()
        };

        return shortcuts;
    }

    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            // Don't interfere with typing in inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
                if (e.key === 'Escape') {
                    e.target.blur();
                    this.announceToScreenReader('Input field cleared focus');
                }
                return;
            }

            const shortcut = this.keyboardShortcuts[e.key];
            if (shortcut) {
                e.preventDefault();
                shortcut(e);
            }

            // Show keyboard help on ? key
            if (e.key === '?' && !e.ctrlKey && !e.altKey && !e.metaKey) {
                e.preventDefault();
                this.toggleKeyboardHelp();
            }
        });
    }

    setupARIAUpdates() {
        // Update search results count for screen readers
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.target.id === 'resultsCount') {
                    const count = mutation.target.textContent;
                    this.announceToScreenReader(`Search results updated: ${count}`);
                }
            });
        });

        const resultsCount = document.getElementById('resultsCount');
        if (resultsCount) {
            observer.observe(resultsCount, { childList: true, characterData: true });
        }
    }

    showTab(tabId) {
        const event = new Event('tabchange');
        event.tabId = tabId;
        document.dispatchEvent(event);
        
        if (window.showTab) {
            showTab(tabId);
        }
    }

    focusSearchInput() {
        const searchInput = document.getElementById('searchTerm');
        if (searchInput) {
            searchInput.focus();
            this.announceToScreenReader('Search input focused. Type to search for products.');
        }
    }

    handleEscape() {
        // Close modals, clear focus, etc.
        const modal = document.querySelector('.modal[style*="block"]');
        if (modal) {
            if (window.closeProductModal) {
                closeProductModal();
            }
            return;
        }

        // Clear search focus
        const activeElement = document.activeElement;
        if (activeElement && activeElement.tagName !== 'BODY') {
            activeElement.blur();
            this.announceToScreenReader('Focus cleared');
        }
    }

    handleEnter(e) {
        if (e.target.tagName === 'BUTTON' || e.target.getAttribute('role') === 'button') {
            e.target.click();
        }
    }

    handleArrowNavigation(e, direction) {
        // Handle arrow key navigation in tables, grids, etc.
        const currentElement = e.target;
        
        if (currentElement.closest('.enhanced-product-table')) {
            this.navigateTable(currentElement, direction);
        } else if (currentElement.closest('.product-grid')) {
            this.navigateGrid(currentElement, direction);
        } else if (currentElement.closest('.tab-nav')) {
            this.navigateTabBar(currentElement, direction);
        }
    }

    navigateTable(element, direction) {
        const row = element.closest('tr');
        if (!row) return;

        const table = row.closest('table');
        const rows = Array.from(table.querySelectorAll('tr'));
        const currentIndex = rows.indexOf(row);

        let newIndex;
        if (direction === 'up') {
            newIndex = Math.max(0, currentIndex - 1);
        } else if (direction === 'down') {
            newIndex = Math.min(rows.length - 1, currentIndex + 1);
        } else {
            return;
        }

        const newRow = rows[newIndex];
        const focusableElement = newRow.querySelector('button, input, select, [tabindex]');
        if (focusableElement) {
            focusableElement.focus();
        }
    }

    navigateGrid(element, direction) {
        const card = element.closest('.product-card');
        if (!card) return;

        const grid = card.closest('.product-grid');
        const cards = Array.from(grid.querySelectorAll('.product-card'));
        const currentIndex = cards.indexOf(card);
        const gridColumns = parseInt(getComputedStyle(grid).getPropertyValue('grid-template-columns').split(' ').length) || 4;

        let newIndex;
        switch (direction) {
            case 'left':
                newIndex = Math.max(0, currentIndex - 1);
                break;
            case 'right':
                newIndex = Math.min(cards.length - 1, currentIndex + 1);
                break;
            case 'up':
                newIndex = Math.max(0, currentIndex - gridColumns);
                break;
            case 'down':
                newIndex = Math.min(cards.length - 1, currentIndex + gridColumns);
                break;
            default:
                return;
        }

        const newCard = cards[newIndex];
        const focusableElement = newCard.querySelector('button, input, select, [tabindex]');
        if (focusableElement) {
            focusableElement.focus();
        }
    }

    navigateTabBar(element, direction) {
        const tabs = Array.from(document.querySelectorAll('.tab-button'));
        const currentIndex = tabs.indexOf(element);

        let newIndex;
        if (direction === 'left') {
            newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
        } else if (direction === 'right') {
            newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
        } else {
            return;
        }

        tabs[newIndex].focus();
    }

    toggleKeyboardHelp() {
        let helpDiv = document.getElementById('keyboard-shortcuts-help');
        
        if (!helpDiv) {
            helpDiv = document.createElement('div');
            helpDiv.id = 'keyboard-shortcuts-help';
            helpDiv.className = 'keyboard-shortcuts';
            helpDiv.innerHTML = `
                <h4>Keyboard Shortcuts</h4>
                <ul>
                    <li><span>Search</span><kbd>/</kbd></li>
                    <li><span>Tab 1-4</span><kbd>1-4</kbd></li>
                    <li><span>Navigate</span><kbd>←→↑↓</kbd></li>
                    <li><span>Escape</span><kbd>Esc</kbd></li>
                    <li><span>Help</span><kbd>?</kbd></li>
                </ul>
                <button onclick="accessibilityManager.toggleKeyboardHelp()" style="margin-top: 0.5rem; padding: 0.25rem 0.5rem; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; border-radius: 4px; cursor: pointer;">Close</button>
            `;
            document.body.appendChild(helpDiv);
        }

        const isVisible = helpDiv.classList.contains('show');
        helpDiv.classList.toggle('show', !isVisible);
        
        this.announceToScreenReader(
            isVisible ? 'Keyboard shortcuts help closed' : 'Keyboard shortcuts help opened'
        );
    }

    // Enhance form validation messages
    announceFormError(fieldId, message) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.setAttribute('aria-invalid', 'true');
            field.setAttribute('aria-describedby', `${fieldId}-error`);
            
            let errorDiv = document.getElementById(`${fieldId}-error`);
            if (!errorDiv) {
                errorDiv = document.createElement('div');
                errorDiv.id = `${fieldId}-error`;
                errorDiv.className = 'error-message';
                errorDiv.setAttribute('role', 'alert');
                field.parentNode.appendChild(errorDiv);
            }
            
            errorDiv.textContent = message;
            this.announceToScreenReader(`Form error: ${message}`, true);
        }
    }

    clearFormError(fieldId) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.removeAttribute('aria-invalid');
            field.removeAttribute('aria-describedby');
            
            const errorDiv = document.getElementById(`${fieldId}-error`);
            if (errorDiv) {
                errorDiv.remove();
            }
        }
    }
}

// Initialize accessibility manager
const accessibilityManager = new AccessibilityManager();

// Initialize the app
window.onload = async function() {
    console.log('🚀 App initializing with StoreManager integration...');
    console.log('Current state - selectedStoreId:', selectedStoreId);
    console.log('Current state - selectedStoreName:', selectedStoreName);
    
    // FIRST: Reset UI state to ensure responsiveness
    resetUIState();
    
    // Initialize StoreManager if available
    if (window.initManager) {
        console.log('Using InitializationManager for startup');
        // InitializationManager will handle everything
        return;
    }
    
    // Fallback initialization
    console.log('Fallback initialization (InitManager not available)');
    
    // IMPORTANT: Clear search field on page load to prevent auto-searches
    const searchInput = document.getElementById('searchTerm');
    if (searchInput) {
        searchInput.value = '';  // Clear any auto-filled or cached value
        searchInput.setAttribute('autocomplete', 'off');  // Prevent browser auto-fill
    }
    
    // Clear search results on startup
    const searchResults = document.getElementById('searchResults');
    const tableResults = document.getElementById('tableResults');
    if (searchResults) searchResults.innerHTML = '';
    if (tableResults) tableResults.style.display = 'none';
    
    // Hide search results header on startup
    const searchHeader = document.getElementById('searchResultsHeader');
    if (searchHeader) searchHeader.style.display = 'none';
    
    // Start on search tab
    showTab('search');
    
    // Load user preferences and default store first
    loadPreferences();
    await loadDefaultStore();
    
    // Find stores automatically (SILENT - no notifications)
    findStoresSilent();
    
    // Initialize cart from localStorage if exists
    loadCartFromStorage();
    updateCart();
    updateFooter();
    
    // Setup event listeners
    setupEventListeners();
    setupZipCodeListener();
    
    // Update default store badge
    updateDefaultStoreBadge();
    
    // Load grid size preference
    const savedGridSize = localStorage.getItem('preferredGridSize');
    if (savedGridSize) {
        document.getElementById('gridSize').value = savedGridSize;
        updateGridSize();
    }
    
    // Update settings data info
    updateDataInfo();
    
    // Initialize search features
    initializeSearchFeatures();
    
    console.log('App initialized successfully');
    
    // Show welcome toast after a brief delay
    setTimeout(() => {
        showSuccessToast('Welcome!', 'Kroger Shopping AI Assistant is ready to help you find the best deals.', {
            duration: 5000
        });
    }, 1000);
    
    // Mark initialization as complete after a delay to prevent auto-triggered searches
    setTimeout(() => {
        isInitializing = false;
        console.log('App initialization period ended - user interactions now show notifications');
    }, 5000); // 5 second buffer
    
    // Start UI health monitoring (check every 30 seconds for stuck states)
    setInterval(() => {
        // Check if UI might be stuck
        const modal = document.getElementById('productModal');
        const bodyOverflow = document.body.style.overflow;
        const bodyPointerEvents = document.body.style.pointerEvents;
        
        // If modal is supposed to be hidden but body is still locked
        if (modal && modal.style.display === 'none' && bodyOverflow === 'hidden') {
            console.warn('🔧 Detected stuck modal state - auto-fixing...');
            document.body.style.overflow = 'auto';
            document.body.classList.remove('modal-open');
        }
        
        // If body pointer events are disabled for no reason
        if (bodyPointerEvents === 'none' && (!modal || modal.style.display === 'none')) {
            console.warn('🔧 Detected disabled pointer events - auto-fixing...');
            document.body.style.pointerEvents = 'auto';
        }
    }, 30000); // Check every 30 seconds
};

// Setup all event listeners
function setupEventListeners() {
    // Search input events
    const searchInput = document.getElementById('searchTerm');
    const clearBtn = document.getElementById('clearSearchBtn');
    
    searchInput.addEventListener('input', (e) => {
        clearBtn.style.display = e.target.value.trim() ? 'flex' : 'none';
    });
    
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchProducts();
        }
    });
    
    // Clear button
    clearBtn.addEventListener('click', clearSearch);
    
    // Modal close events
    window.onclick = function(event) {
        const modal = document.getElementById('productModal');
        if (event.target === modal) {
            closeProductModal();
        }
    };
    
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeProductModal();
        }
    });
}

// Tab Navigation
function showTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const tabs = ['search', 'list', 'cart', 'settings'];
    const tabIndex = tabs.indexOf(tabName) + 1;
    document.querySelector(`.tab-button:nth-child(${tabIndex})`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Update accessibility attributes
    if (window.accessibilityManager) {
        accessibilityManager.updateTabNavigation(`${tabName}-tab`);
    }
}

// User Preferences & Settings Functions
function loadPreferences() {
    const preferences = [
        'autoSaveCart',
        'showDeals', 
        'compactView',
        'enableNotifications'
    ];
    
    preferences.forEach(pref => {
        const saved = localStorage.getItem(`pref_${pref}`);
        if (saved !== null) {
            const value = JSON.parse(saved);
            const checkbox = document.getElementById(pref);
            if (checkbox) {
                checkbox.checked = value;
                applyPreference(pref, value);
            }
        }
    });
    
    // Load saved ZIP code
    const savedZipCode = localStorage.getItem('currentZipCode');
    if (savedZipCode) {
        const zipInput = document.getElementById('zipCode');
        if (zipInput) {
            zipInput.value = savedZipCode;
            console.log(`✅ Loaded saved ZIP code: ${savedZipCode}`);
        }
    } else {
        console.log('❌ No saved ZIP code found');
    }
}

function savePreferences() {
    const preferences = {
        autoSaveCart: document.getElementById('autoSaveCart')?.checked || false,
        showDeals: document.getElementById('showDeals')?.checked || false,
        compactView: document.getElementById('compactView')?.checked || false,
        enableNotifications: document.getElementById('enableNotifications')?.checked || false
    };
    
    // Save each preference individually
    Object.entries(preferences).forEach(([key, value]) => {
        localStorage.setItem(`pref_${key}`, JSON.stringify(value));
        applyPreference(key, value);
    });
    
    // Removed unnecessary toast - preferences save is immediate
}

// Store Management & Settings Functions
async function loadDefaultStore() {
    console.log('🏪 Loading default store...');
    
    // Use new StoreManager if available
    if (window.storeManager && useStoreManager) {
        try {
            await window.storeManager.initialize();
            const store = window.storeManager.getStore();
            
            if (store) {
                selectedStoreId = store.locationId || store.id;
                selectedStoreName = store.name;
                console.log(`✅ Loaded store via StoreManager: ${selectedStoreName} (${selectedStoreId})`);
                updateFooter();
                updateDataInfo();
                updateSelectedStoreDisplay();
                return true;
            }
        } catch (error) {
            console.error('Error loading store via StoreManager:', error);
        }
    }
    
    // Fallback to old method
    const defaultStoreId = localStorage.getItem('defaultStoreId');
    const defaultStoreName = localStorage.getItem('defaultStoreName');
    
    console.log('localStorage defaultStoreId:', defaultStoreId);
    console.log('localStorage defaultStoreName:', defaultStoreName);
    
    if (defaultStoreId && defaultStoreName) {
        selectedStoreId = defaultStoreId;
        selectedStoreName = defaultStoreName;
        console.log(`✅ Loaded default store: ${defaultStoreName} (${defaultStoreId})`);
        updateFooter();
        updateDataInfo();
        return true;
    } else {
        console.log('❌ No default store found');
        return false;
    }
}

function updateDefaultStoreBadge() {
    const badge = document.getElementById('defaultStoreBadge');
    const defaultStoreId = localStorage.getItem('defaultStoreId');
    if (badge) {
        badge.style.display = defaultStoreId ? 'flex' : 'none';
    }
}

// Silent version for app initialization
async function findStoresSilent() {
    let zipCode = document.getElementById('zipCode').value;
    const storeList = document.getElementById('storeList');
    
    if (!zipCode) {
        // Try to use a default ZIP code for initial store loading
        const defaultZip = '45202'; // Cincinnati, OH - central location
        console.log(`No zip code provided, using default: ${defaultZip}`);
        zipCode = defaultZip;
        
        // Set the default ZIP in the input for user reference
        const zipInput = document.getElementById('zipCode');
        if (zipInput) {
            zipInput.value = defaultZip;
            localStorage.setItem('currentZipCode', defaultZip);
        }
    }
    
    console.log(`Finding stores for zip code: ${zipCode} (silent mode)`);
    storeList.innerHTML = '<option value="">🔄 Finding stores...</option>';
    
    try {
        const response = await fetch(`/api/stores/nearby?zipCode=${zipCode}&radius=50`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const stores = await response.json();
        console.log(`Found ${stores.length} stores (silent mode)`);
        
        storeList.innerHTML = '';
        
        if (stores.length === 0) {
            storeList.innerHTML = '<option value="">No stores found in this area</option>';
            return;
        }
        
        stores.forEach(store => {
            const option = document.createElement('option');
            option.value = store.locationId;
            option.textContent = `${store.name} - ${store.address.addressLine1}, ${store.address.city}`;
            option.dataset.storeName = store.name;
            option.dataset.storeAddress = `${store.address.addressLine1}, ${store.address.city}, ${store.address.state} ${store.address.zipCode}`;
            option.dataset.storePhone = store.phone || 'N/A';
            storeList.appendChild(option);
        });
        
        // Update store count and show actions
        const storeCount = document.getElementById('storeCount');
        const storeListActions = document.getElementById('storeListActions');
        storeCount.style.display = 'inline';
        storeCount.textContent = `(${stores.length} found)`;
        storeListActions.style.display = 'flex';
        
        // Auto-select first store or try to select default store
        const defaultStoreId = localStorage.getItem('defaultStoreId');
        let storeSelected = false;
        
        if (defaultStoreId) {
            // Try to select the default store if it exists in the list
            for (let option of storeList.options) {
                if (option.value === defaultStoreId) {
                    storeList.value = defaultStoreId;
                    selectStoreSilent();
                    storeSelected = true;
                    break;
                }
            }
        }
        
        // If no default store found or no default set, select first store
        if (!storeSelected && stores.length > 0 && !selectedStoreId) {
            storeList.value = stores[0].locationId;
            selectStoreSilent();
        }
        
        // No notifications during initialization
        
    } catch (error) {
        console.error('Store lookup error:', error);
        storeList.innerHTML = '<option value="">Error loading stores - please try again</option>';
        // Only show error toast for actual errors during silent load
    }
}

async function findStores() {
    const zipCode = document.getElementById('zipCode').value;
    const storeList = document.getElementById('storeList');
    const findBtn = document.getElementById('findStoresBtn');
    
    if (!zipCode) {
        showErrorToast('Missing ZIP Code', 'Please enter a ZIP code to search for stores');
        return;
    }
    
    console.log(`Finding stores for zip code: ${zipCode}`);
    
    // Show skeleton loading for store list
    storeList.innerHTML = '';
        // Optional: lighter inline loading state instead of skeletons
        const loadingEl = document.createElement('div');
        loadingEl.className = 'loading-inline';
        loadingEl.textContent = 'Loading stores...';
        storeList.parentNode.appendChild(loadingEl);
    
    // Use enhanced button states - declare outside try block for error handling
    const btnManager = ButtonStateManager.enhanceButton(findBtn);
        // quiet loading (no button state toast)
    
    try {
        const response = await fetch(`/api/stores/nearby?zipCode=${zipCode}&radius=50`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const stores = await response.json();
        console.log(`Found ${stores.length} stores`);
        
        // Remove skeleton
        const loadingInline = storeList.parentNode.querySelector('.loading-inline');
        if (loadingInline) loadingInline.remove();
        
        storeList.innerHTML = '';
        
        if (stores.length === 0) {
            storeList.innerHTML = '<option value="">No stores found in this area</option>';
            if (btnManager) {
                btnManager.showError('No Stores Found', 2000);
            }
            showErrorToast('No Stores Found', 'No stores found in this area. Try a different ZIP code.');
            return;
        }
        
        // quiet success (no toast)
        
        stores.forEach(store => {
            const option = document.createElement('option');
            option.value = store.locationId;
            option.textContent = `${store.name} - ${store.address.addressLine1}, ${store.address.city}`;
            option.dataset.storeName = store.name;
            option.dataset.storeAddress = `${store.address.addressLine1}, ${store.address.city}, ${store.address.state} ${store.address.zipCode}`;
            option.dataset.storePhone = store.phone || 'N/A';
            storeList.appendChild(option);
        });
        
        // Update store count and show actions
        const storeCount = document.getElementById('storeCount');
        const storeListActions = document.getElementById('storeListActions');
        storeCount.style.display = 'inline';
        storeCount.textContent = `(${stores.length} found)`;
        storeListActions.style.display = 'flex';
        
        // Auto-select first store or try to select default store
        const defaultStoreId = localStorage.getItem('defaultStoreId');
        let storeSelected = false;
        
        if (defaultStoreId) {
            // Try to select the default store if it exists in the list
            for (let option of storeList.options) {
                if (option.value === defaultStoreId) {
                    storeList.value = defaultStoreId;
                    selectStore();
                    storeSelected = true;
                    break;
                }
            }
        }
        
        // If no default store found or no default set, select first store
        if (!storeSelected && stores.length > 0) {
            storeList.value = stores[0].locationId;
            selectStore();
        }
        
        // Silent success - stores will appear in the list
        
    } catch (error) {
        console.error('Store lookup error:', error);
        
        // Remove skeleton if it exists
        const loadingInline2 = storeList.parentNode.querySelector('.loading-inline');
        if (loadingInline2) loadingInline2.remove();
        
        storeList.innerHTML = '<option value="">Error loading stores - please try again</option>';
        
        // Restore button state on error
        // quiet error (no toast)
        
        // toasts disabled
    }
}

// Silent version for app initialization
async function selectStoreSilent() {
    const storeList = document.getElementById('storeList');
    const selectedOption = storeList.options[storeList.selectedIndex];
    
    console.log('🔧 selectStoreSilent() called');
    console.log('Store list element:', storeList);
    console.log('Selected option:', selectedOption);
    console.log('Selected option value:', selectedOption?.value);
    
    if (selectedOption && selectedOption.value) {
        selectedStoreId = selectedOption.value;
        selectedStoreName = selectedOption.dataset.storeName;
        
        console.log(`✅ Selected store (silent): ${selectedStoreName} (${selectedStoreId})`);
        
        // Save to StoreManager if available
        if (window.storeManager && useStoreManager) {
            const storeData = {
                id: selectedOption.value,
                locationId: selectedOption.value,
                name: selectedOption.dataset.storeName,
                address: selectedOption.dataset.storeAddress || '',
                phone: selectedOption.dataset.storePhone || '',
                division: selectedOption.dataset.storeDivision || ''
            };
            
            try {
                await window.storeManager.setStore(storeData);
                console.log('Store saved to StoreManager (silent)');
            } catch (error) {
                console.error('Error saving to StoreManager:', error);
            }
        }
        
        // Update the store card display
        updateSelectedStoreDisplay();
        updateFooter();
        updateDefaultStoreBadge();
        // No notifications during initialization
    } else {
        console.log('❌ selectStoreSilent: No valid option selected');
    }
}

async function selectStore() {
    const storeList = document.getElementById('storeList');
    const selectedOption = storeList.options[storeList.selectedIndex];
    
    if (selectedOption && selectedOption.value) {
        selectedStoreId = selectedOption.value;
        selectedStoreName = selectedOption.dataset.storeName;
        
        console.log(`Selected store: ${selectedStoreName} (${selectedStoreId})`);
        
        // Save to StoreManager if available
        if (window.storeManager && useStoreManager) {
            const storeData = {
                id: selectedOption.value,
                locationId: selectedOption.value,
                name: selectedOption.dataset.storeName,
                address: selectedOption.dataset.storeAddress || '',
                phone: selectedOption.dataset.storePhone || '',
                division: selectedOption.dataset.storeDivision || ''
            };
            
            try {
                await window.storeManager.setStore(storeData);
                console.log('Store saved to StoreManager');
            } catch (error) {
                console.error('Error saving to StoreManager:', error);
            }
        }
        
        // Update the store card display
        updateSelectedStoreDisplay();
        updateFooter();
        updateDefaultStoreBadge();
        
        // Do not auto-switch tabs; remain on Settings per user preference
    }
}

// Enhanced Settings Functions
function handleZipEnter(event) {
    if (event.key === 'Enter') {
        findStores();
    }
}

function validateZipCode(input) {
    const zipCode = input.value.trim();
    const validation = document.getElementById('zipValidation');
    
    // Remove any non-numeric characters
    input.value = zipCode.replace(/\D/g, '');
    
    if (zipCode.length > 0 && zipCode.length < 5) {
        validation.style.display = 'block';
        validation.innerHTML = '<span class="validation-error">⚠️ ZIP code must be exactly 5 digits</span>';
        validation.className = 'zip-validation error';
    } else if (zipCode.length === 5) {
        validation.style.display = 'block';
        validation.innerHTML = '<span class="validation-success">✅ Valid ZIP code - searching for stores...</span>';
        validation.className = 'zip-validation success';
        
        // Auto-search stores if ZIP code is valid and different from current
        const currentStoreZip = localStorage.getItem('currentZipCode');
        if (zipCode !== currentStoreZip) {
            localStorage.setItem('currentZipCode', zipCode);
            // Use silent version during initialization to prevent toasts
            if (isInitializing) {
                setTimeout(() => findStoresSilent(), 500);
            } else {
                setTimeout(() => findStores(), 500);
            }
        }
    } else {
        validation.style.display = 'none';
    }
}

function highlightZipInput(input) {
    const wrapper = input.parentElement;
    wrapper.classList.add('focused');
    input.select(); // Select all text when focused for easy editing
}

function unhighlightZipInput(input) {
    const wrapper = input.parentElement;
    wrapper.classList.remove('focused');
}

function updateSelectedStoreDisplay() {
    const selectedStore = document.getElementById('selectedStore');
    const storeList = document.getElementById('storeList');
    const selectedOption = storeList.options[storeList.selectedIndex];
    
    if (selectedOption && selectedOption.value) {
        selectedStore.style.display = 'block';
        
        // Update store details
        selectedStore.querySelector('.store-name').textContent = selectedOption.dataset.storeName;
        selectedStore.querySelector('.address-text').textContent = selectedOption.dataset.storeAddress;
        selectedStore.querySelector('.phone-text').textContent = selectedOption.dataset.storePhone || 'N/A';
        
        // Check if this is the default store
        const defaultStoreId = localStorage.getItem('defaultStoreId');
        const setDefaultBtn = document.getElementById('setDefaultBtn');
        const removeDefaultBtn = document.getElementById('removeDefaultBtn');
        const defaultStoreBadge = document.getElementById('defaultStoreBadge');
        
        if (defaultStoreId === selectedOption.value) {
            setDefaultBtn.style.display = 'none';
            removeDefaultBtn.style.display = 'inline-flex';
            defaultStoreBadge.style.display = 'inline-flex';
            selectedStore.querySelector('.status-text').textContent = 'Default Store - Currently Selected';
        } else {
            setDefaultBtn.style.display = 'inline-flex';
            removeDefaultBtn.style.display = 'none';
            selectedStore.querySelector('.status-text').textContent = 'Currently Selected';
        }
    } else {
        selectedStore.style.display = 'none';
    }
    
    updateDataInfo();
}

async function setDefaultStore() {
    if (!selectedStoreId || !selectedStoreName) {
        // toasts disabled
        return;
    }
    
    const storeList = document.getElementById('storeList');
    const selectedOption = storeList.options[storeList.selectedIndex];
    
    if (selectedOption && selectedOption.value) {
        // Save using StoreManager if available
        if (window.storeManager && useStoreManager) {
            const storeData = {
                id: selectedStoreId,
                locationId: selectedStoreId,
                name: selectedStoreName,
                address: selectedOption.dataset.storeAddress || '',
                phone: selectedOption.dataset.storePhone || '',
                division: selectedOption.dataset.storeDivision || ''
            };
            
            try {
                await window.storeManager.setStore(storeData);
                console.log('Default store saved via StoreManager');
            } catch (error) {
                console.error('Error saving default store:', error);
            }
        } else {
            // Fallback to old method
            localStorage.setItem('defaultStoreId', selectedStoreId);
            localStorage.setItem('defaultStoreName', selectedStoreName);
            localStorage.setItem('defaultStoreAddress', selectedOption.dataset.storeAddress);
            localStorage.setItem('defaultStorePhone', selectedOption.dataset.storePhone || 'N/A');
        }
        
        // Update UI
        updateSelectedStoreDisplay();
        updateDataInfo();
        
        // toasts disabled
        
        // Show success animation
        const setDefaultBtn = document.getElementById('setDefaultBtn');
        setDefaultBtn.style.transform = 'scale(0.95)';
        setTimeout(() => {
            setDefaultBtn.style.transform = 'scale(1)';
        }, 150);
    }
}

function removeDefaultStore() {
    const defaultStoreName = localStorage.getItem('defaultStoreName');
    
    // Remove from localStorage
    localStorage.removeItem('defaultStoreId');
    localStorage.removeItem('defaultStoreName');
    localStorage.removeItem('defaultStoreAddress');
    localStorage.removeItem('defaultStorePhone');
    
    // Update UI
    updateSelectedStoreDisplay();
    updateDataInfo();
    
    // Silent removal - UI updates are sufficient feedback
}

function savePreference(key, value) {
    localStorage.setItem(`pref_${key}`, JSON.stringify(value));
    // Silent preference save - immediate UI update is sufficient
    
    // Apply preference immediately
    applyPreference(key, value);
}

function applyPreference(key, value) {
    switch (key) {
        case 'compactView':
            document.body.classList.toggle('compact-view', value);
            break;
        case 'showDeals':
            document.body.classList.toggle('hide-deals', !value);
            break;
        case 'autoSaveCart':
            if (value) {
                saveCartToStorage();
            }
            break;
    }
}

function updateDataInfo() {
    // Update default store info
    const defaultStoreName = localStorage.getItem('defaultStoreName') || 'None set';
    document.getElementById('currentDefaultStore').textContent = defaultStoreName;
    
    // Update cart items count
    document.getElementById('cartItemsCount').textContent = cart.length;
    
    // Update search history count
    const searchHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    document.getElementById('searchHistoryCount').textContent = `${searchHistory.length} searches`;
}

function exportData() {
    const data = {
        defaultStore: {
            id: localStorage.getItem('defaultStoreId'),
            name: localStorage.getItem('defaultStoreName'),
            address: localStorage.getItem('defaultStoreAddress'),
            phone: localStorage.getItem('defaultStorePhone')
        },
        preferences: {},
        cart: cart,
        shoppingList: shoppingList,
        searchHistory: JSON.parse(localStorage.getItem('searchHistory') || '[]'),
        exportDate: new Date().toISOString()
    };
    
    // Get all preferences
    const prefKeys = Object.keys(localStorage).filter(key => key.startsWith('pref_'));
    prefKeys.forEach(key => {
        const prefName = key.replace('pref_', '');
        data.preferences[prefName] = JSON.parse(localStorage.getItem(key));
    });
    
    // Create and download file
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kroger-shopping-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('Data exported successfully', 'success');
}

function clearSearchHistory() {
    if (confirm('Are you sure you want to clear your search history? This cannot be undone.')) {
        localStorage.removeItem('searchHistory');
        updateDataInfo();
        // Silent clear - UI update is sufficient
    }
}

function resetAllSettings() {
    if (confirm('Are you sure you want to reset ALL settings? This will:\n\n• Clear your default store\n• Reset all preferences\n• Clear search history\n• Clear cart (if not saved)\n\nThis cannot be undone.')) {
        // Clear all settings
        const keysToRemove = Object.keys(localStorage).filter(key => 
            key.startsWith('pref_') || 
            key.startsWith('default') || 
            key === 'searchHistory' ||
            key === 'currentZipCode'
        );
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        // Reset form values
        document.getElementById('zipCode').value = '43123';
        document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.checked = cb.id === 'showDeals'; // Only showDeals is checked by default
        });
        
        // Clear current selections
        selectedStoreId = null;
        selectedStoreName = 'None';
        document.getElementById('selectedStore').style.display = 'none';
        document.getElementById('defaultStoreBadge').style.display = 'none';
        
        // Update displays
        updateFooter();
        updateDataInfo();
        
        // Apply default preferences
        loadPreferences();
        
        showToast('Settings reset to defaults', 'info');
    }
}

// Product Search - SIMPLIFIED AND RELIABLE
async function searchProducts() {
    console.log('🔍 searchProducts() called');
    
    // Check for store using StoreManager first
    if (window.storeManager && useStoreManager) {
        try {
            const store = await window.storeManager.ensureStoreSelected();
            selectedStoreId = store.locationId || store.id;
            selectedStoreName = store.name;
            console.log(`Using store from StoreManager: ${selectedStoreName} (${selectedStoreId})`);
        } catch (error) {
            if (error.message === 'No store selected') {
                console.log('❌ No store selected via StoreManager');
                if (window.toastManager) {
            // toasts disabled
                } else {
                    showToast('Store Required', 'Select a store to continue', 'warning');
                }
                showTab('settings');
                return;
            }
            console.error('Error checking store:', error);
        }
    }
    
    // Fallback check
    if (!selectedStoreId) {
        console.log('❌ No store selected, trying to find stores...');
        if (window.toastManager) {
        // toasts disabled
        } else {
            // Auto-finding stores - no toast needed
        }
        // Try to find stores automatically with default ZIP
        await findStoresSilent();
        
        // If still no store, go to settings
        if (!selectedStoreId) {
            console.log('❌ Still no store after findStoresSilent');
            if (window.toastManager) {
                // toasts disabled
            } else {
                showToast('Store Required', 'Select a store to continue', 'warning');
            }
            showTab('settings');
            return;
        }
    }
    
    const searchInput = document.getElementById('searchTerm');
    const searchTerm = searchInput ? searchInput.value.trim() : '';
    console.log('Search term:', searchTerm);
    console.log('Search input element:', searchInput);
    
    // Guard against empty or unintentional searches
    if (!searchTerm || searchTerm.length === 0) {
        console.log('❌ Empty search term');
        showToast('Search Required', 'Enter a product to search', 'warning');
        return;
    }
    
    // Note: Removed problematic auto-search prevention that was clearing search input
    // This was causing issues where users couldn't search for common terms like "milk"
    
    console.log(`✅ Starting search for "${searchTerm}" at store ${selectedStoreId}`);
    
    // Show loading state
    showSearchLoadingState();
    
    // Check cache
    const cacheKey = `${searchTerm}_${selectedStoreId}`;
    const cached = searchCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        console.log('Using cached results');
        currentProducts = cached.products;
        allProducts = [...cached.products]; // Store original products for filtering
        displaySearchResults(cached.products, searchTerm);
        displayProducts(cached.products);  // Fixed: displayProducts only takes one parameter
        return;
    }
    
    // Make API call - Kroger API maximum limit is 50
    const apiUrl = `/api/products/search?term=${encodeURIComponent(searchTerm)}&locationId=${selectedStoreId}&limit=50`;
    console.log('🔗 API URL:', apiUrl);
    
    try {
        console.log('📡 Making fetch request...');
        const response = await fetch(apiUrl);
        console.log('📡 Response received:', response.status, response.statusText);
        
        if (!response.ok) {
            console.log('❌ Response not OK:', response.status, response.statusText);
            throw new Error(`Search failed: ${response.status}`);
        }
        
        console.log('📦 Parsing JSON response...');
        const products = await response.json();
        console.log(`✅ Found ${products.length} products`);
        
        // Sort products (sale items first)
        products.sort((a, b) => {
            const aSale = (a.salePrice && a.salePrice > 0) ? 1 : 0;
            const bSale = (b.salePrice && b.salePrice > 0) ? 1 : 0;
            return bSale - aSale;
        });
        
        currentProducts = products;
        allProducts = [...products]; // Store original products for filtering
        
        // Cache results
        searchCache.set(cacheKey, {
            products: products,
            timestamp: Date.now()
        });
        
        // Keep cache size reasonable
        if (searchCache.size > 20) {
            const firstKey = searchCache.keys().next().value;
            searchCache.delete(firstKey);
        }
        
        // Use the comprehensive search results display
        console.log('🎨 CRITICAL DEBUG: About to call displaySearchResults with', products.length, 'products');
        console.log('🎨 CRITICAL DEBUG: Search results container exists?', !!document.getElementById('searchResults'));
        displaySearchResults(products, searchTerm);
        console.log('🎨 CRITICAL DEBUG: After displaySearchResults, now calling displayProducts');
        displayProducts(products);  // Fixed: displayProducts only takes one parameter
        console.log('✅ CRITICAL DEBUG: Search completed - checking if results are visible');
        console.log('✅ CRITICAL DEBUG: searchResults innerHTML length:', document.getElementById('searchResults')?.innerHTML?.length || 'ELEMENT NOT FOUND');
        console.log('✅ CRITICAL DEBUG: searchResultsHeader display:', document.getElementById('searchResultsHeader')?.style?.display || 'ELEMENT NOT FOUND');
        
    } catch (error) {
        console.error('❌ Search error details:', {
            error: error,
            message: error.message,
            stack: error.stack,
            searchTerm: searchTerm,
            storeId: selectedStoreId
        });
        showSearchError();
        showToast('Search Failed', 'Unable to complete search. Please try again.', 'error');
        
        // CRITICAL FIX: Provide fallback mock data so users can see search interface working
        console.log('🚨 FALLBACK: API failed, providing mock data for demonstration');
        const mockProducts = createMockProductsForSearch(searchTerm);
        if (mockProducts.length > 0) {
            console.log('🚨 Displaying mock products as fallback');
            currentProducts = mockProducts;
            allProducts = [...mockProducts];
            displaySearchResults(mockProducts, searchTerm + ' (Demo Mode)');
            displayProducts(mockProducts);
            showToast('Demo Mode', 'Showing sample data', 'info');
        }
    }
}

function showSearchLoadingState() {
    // Show premium skeleton loading
    SkeletonLoader.showSearchSkeleton();
    
    // Add loading state to search button
    const searchBtn = document.querySelector('.search-btn');
    if (searchBtn) {
        searchBtn.classList.add('skeleton-loading');
        searchBtn.disabled = true;
    }
    
    // Show loading indicator in search input
    const searchLoader = document.getElementById('searchLoader');
    if (searchLoader) {
        searchLoader.style.display = 'block';
    }
}

function showSearchError() {
    // Hide skeleton loading
    SkeletonLoader.hideSearchSkeleton();
    
    // Reset search button state
    const searchBtn = document.querySelector('.search-btn');
    if (searchBtn) {
        searchBtn.classList.remove('skeleton-loading');
        searchBtn.disabled = false;
    }
    
    // Hide search loader
    const searchLoader = document.getElementById('searchLoader');
    if (searchLoader) {
        searchLoader.style.display = 'none';
    }
    
    const resultsDiv = document.getElementById('searchResults');
    
    if (resultsDiv) {
        resultsDiv.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <div style="font-size: 3rem;">⚠️</div>
                <h3>Search Failed</h3>
                <p>Unable to search products. Please try again.</p>
                <button onclick="searchProducts()" class="search-btn">Retry Search</button>
            </div>
        `;
        resultsDiv.style.display = 'block';
    } else {
        console.error('SearchResults element not found when showing search error');
    }
    
    const tableResults = document.getElementById('tableResults');
    if (tableResults) {
        tableResults.style.display = 'none';
    }
}


function displayProducts(products) {
    console.log('🗺 displayProducts() called with:', products?.length || 'NO PRODUCTS', 'products');
    // If products are passed, update currentProducts and use them
    if (products) {
        currentProducts = products;
        console.log('🗺 Updated currentProducts with', currentProducts.length, 'products');
    }
    
    const filtered = filterCurrentProducts();
    console.log('🗺 After filtering, displaying', filtered.length, 'products in', currentView, 'view');
    
    if (currentView === 'grid') {
        console.log('🗺 Calling displayGridView with', filtered.length, 'products');
        displayGridView(filtered);
    } else {
        console.log('🗺 Calling displayTableView with', filtered.length, 'products');
        displayTableView(filtered);
    }
    console.log('🗺 displayProducts() completed');
}

function displayGridView(products) {
    console.log('🗺🗺 displayGridView() called with', products?.length || 'NO PRODUCTS', 'products');
    const resultsDiv = document.getElementById('searchResults');
    if (!resultsDiv) {
        console.error('❌❌ CRITICAL ERROR: SearchResults element not found in displayGridView');
        console.error('❌❌ Available elements with similar IDs:', document.querySelectorAll('[id*="search"]'));
        return;
    }
    
    console.log('🗺🗺 Found searchResults element, clearing innerHTML and setting up grid');
    resultsDiv.innerHTML = '';
    
    // Set appropriate display based on current grid layout
    if (currentGridLayout === 'masonry') {
        resultsDiv.style.display = 'block';
        console.log('🗺🗺 Set masonry layout (block display)');
    } else {
        resultsDiv.style.display = 'grid';
        console.log('🗺🗺 Set grid layout (grid display)');
    }
    
    const tableResults = document.getElementById('tableResults');
    if (tableResults) {
        tableResults.style.display = 'none';
    }
    
    console.log('🗺🗺 About to create', products.length, 'product cards');
    products.forEach((product, index) => {
        console.log('🗺🗺 Creating card', index + 1, 'for product:', product?.name || 'UNNAMED PRODUCT');
        const card = createProductCard(product, index);
        if (card) {
            resultsDiv.appendChild(card);
            console.log('🗺🗺 Successfully appended card', index + 1, 'to resultsDiv');
        } else {
            console.error('❌❌ CRITICAL: createProductCard returned null/undefined for product:', product);
        }
    });
    console.log('🗺🗺 Finished creating all product cards. ResultsDiv innerHTML length:', resultsDiv.innerHTML.length);
    console.log('🗺🗺 ResultsDiv children count:', resultsDiv.children.length);
}

function displayTableView(products) {
    const searchResults = document.getElementById('searchResults');
    const tableResults = document.getElementById('tableResults');
    const tableResultsCount = document.getElementById('tableResultsCount');
    const tableBody = document.getElementById('tableBody');
    
    if (!searchResults || !tableResults || !tableResultsCount || !tableBody) {
        console.error('Required table elements not found in displayTableView');
        return;
    }
    
    searchResults.style.display = 'none';
    tableResults.style.display = 'block';
    
    // Update table result count
    tableResultsCount.textContent = `${products.length} products`;
    
    tableBody.innerHTML = '';
    
    // Setup pagination if needed
    setupTablePagination(products);
    
    // Get current page products
    const paginatedProducts = getCurrentPageProducts(products);
    
    paginatedProducts.forEach(product => {
        const row = createProductRow(product);
        tableBody.appendChild(row);
    });
    
    // Update pagination display
    updateTablePagination(products.length);
}

function createProductCard(product, index) {
    console.log('🃏 Creating product card for:', product?.name || 'UNNAMED', 'index:', index);
    
    if (!product) {
        console.error('❌❌ CRITICAL: createProductCard called with null/undefined product');
        return null;
    }
    
    const card = document.createElement('div');
    const isOnSale = product.salePrice && product.salePrice > 0;
    card.className = isOnSale ? 'product-card premium-card on-sale' : 'product-card premium-card';
    console.log('🃏 Card element created with className:', card.className);
    
    const price = isOnSale ? product.salePrice : (product.price || 0);
    const originalPrice = isOnSale ? product.price : null;
    
    // Calculate discount percentage
    let discountPercent = 0;
    if (originalPrice && product.salePrice) {
        discountPercent = Math.round(((originalPrice - product.salePrice) / originalPrice) * 100);
    }
    
    // Generate stock status
    const stockStatus = generateStockStatus(product);
    
    // Check if product is in cart or wishlist
    const isInCart = cart.some(item => item.product.id === product.id);
    const isInWishlist = (JSON.parse(localStorage.getItem('wishlist') || '[]')).some(item => item.id === product.id);
    
    // Generate rating display (mock data for demo)
    const rating = Math.floor(Math.random() * 2) + 4; // 4-5 stars for demo
    const reviewCount = Math.floor(Math.random() * 500) + 50;
    
    // Add selection checkbox and data attribute
    card.setAttribute('data-product-index', index);
    card.addEventListener('click', (e) => {
        // Don't select if clicking on buttons or other interactive elements
        if (!e.target.closest('.quick-actions, .premium-actions, .premium-image-container, .product-name')) {
            toggleProductSelection(index);
        }
    });
    
    card.innerHTML = `
        <!-- Selection Checkbox -->
        <div class="selection-checkbox" onclick="event.stopPropagation(); toggleProductSelection(${index})">
            <input type="checkbox" id="select-${index}" ${selectedProducts.has(index) ? 'checked' : ''}>
            <label for="select-${index}" class="checkbox-label"></label>
        </div>
        
        <!-- Quick Actions Overlay -->
        <div class="quick-actions">
            <button class="quick-action-btn favorite-btn ${isInWishlist ? 'active' : ''}" 
                    onclick="toggleWishlist('${product.id}')" 
                    title="${isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="${isInWishlist ? 'currentColor' : 'none'}" stroke="currentColor" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
            </button>
            <button class="quick-action-btn compare-btn" 
                    onclick="addToComparison('${product.id}')" 
                    title="Add to comparison">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="5,12 5,5 12,5"></polyline>
                    <polyline points="19,12 19,19 12,19"></polyline>
                    <line x1="12" y1="5" x2="19" y2="12"></line>
                    <line x1="5" y1="12" x2="12" y2="19"></line>
                </svg>
            </button>
            <button class="quick-action-btn quick-view-btn" 
                    onclick="showQuickView('${product.id}')" 
                    title="Quick view">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                </svg>
            </button>
        </div>

        <!-- Sale Badge -->
        ${isOnSale && discountPercent > 0 ? `
            <div class="sale-badge-corner">
                <span class="sale-text">SAVE</span>
                <span class="sale-percent">${discountPercent}%</span>
            </div>
        ` : ''}

        <!-- Product Image -->
        <div class="premium-image-container" onclick="showProductModalById('${product.id}')">
            <div class="image-wrapper">
                ${product.image 
                    ? `<img src="${product.image}" alt="${product.name.replace(/"/g, '&quot;')}" 
                           onerror="this.onerror=null; this.parentElement.innerHTML='<div class=&quot;premium-placeholder&quot;><svg width=&quot;40&quot; height=&quot;40&quot; viewBox=&quot;0 0 24 24&quot; fill=&quot;none&quot; stroke=&quot;currentColor&quot; strokeWidth=&quot;1.5&quot;><rect x=&quot;3&quot; y=&quot;3&quot; width=&quot;18&quot; height=&quot;18&quot; rx=&quot;2&quot; ry=&quot;2&quot;></rect><circle cx=&quot;8.5&quot; cy=&quot;8.5&quot; r=&quot;1.5&quot;></circle><polyline points=&quot;21,15 16,10 5,21&quot;></polyline></svg><span>No Image</span></div>'">`
                    : `<div class="premium-placeholder">
                           <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                               <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                               <circle cx="8.5" cy="8.5" r="1.5"></circle>
                               <polyline points="21,15 16,10 5,21"></polyline>
                           </svg>
                           <span>No Image</span>
                       </div>`
                }
            </div>
            <div class="image-overlay">
                <button class="overlay-btn" onclick="event.stopPropagation(); showQuickView('${product.id}')">
                    Quick View
                </button>
            </div>
        </div>

        <!-- Product Info -->
        <div class="premium-product-info">
            <!-- Brand -->
            ${product.brand ? `<div class="product-brand">${product.brand}</div>` : ''}
            
            <!-- Product Name -->
            <h3 class="product-name" onclick="showProductModalById('${product.id}')" 
                title="${product.name.replace(/"/g, '&quot;')}">
                ${product.name}
            </h3>
            
            <!-- Rating -->
            <div class="product-rating">
                <div class="stars">
                    ${Array.from({length: 5}, (_, i) => `
                        <svg class="star ${i < rating ? 'filled' : ''}" width="12" height="12" viewBox="0 0 24 24" fill="${i < rating ? 'currentColor' : 'none'}" stroke="currentColor" strokeWidth="2">
                            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"></polygon>
                        </svg>
                    `).join('')}
                </div>
                <span class="review-count">(${reviewCount})</span>
            </div>
            
            <!-- Size -->
            ${product.size ? `<div class="product-size-badge">${product.size}</div>` : ''}
            
            <!-- Stock Status -->
            <div class="stock-status ${stockStatus.class}">
                <div class="stock-indicator"></div>
                <span>${stockStatus.text}</span>
            </div>
        </div>

        <!-- Price Section -->
        <div class="premium-price-section">
            <div class="price-row">
                ${originalPrice ? `<span class="original-price">$${originalPrice.toFixed(2)}</span>` : ''}
                <span class="current-price">$${price.toFixed(2)}</span>
                ${isOnSale && discountPercent > 0 ? `<span class="savings">Save $${(originalPrice - price).toFixed(2)}</span>` : ''}
            </div>
            ${isOnSale ? `<div class="sale-indicator">🔥 Limited Time Deal</div>` : ''}
        </div>

        <!-- Actions -->
        <div class="premium-actions">
            <div class="quantity-selector ${isInCart ? 'show' : ''}">
                <button class="qty-btn minus" onclick="updateCardQuantity('${product.id}', -1)">−</button>
                <input type="number" class="qty-input" value="${getCartQuantity(product.id)}" 
                       min="0" max="99" onchange="setCartQuantity('${product.id}', this.value)">
                <button class="qty-btn plus" onclick="updateCardQuantity('${product.id}', 1)">+</button>
            </div>
            
            <button class="premium-add-to-cart ${isInCart ? 'in-cart' : ''}" 
                    onclick="handleCardAddToCart('${product.id}')">
                <div class="btn-content">
                    <svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        ${isInCart 
                            ? '<polyline points="20,6 9,17 4,12"></polyline>' 
                            : '<circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>'
                        }
                    </svg>
                    <span class="btn-text">${isInCart ? 'In Cart' : 'Add to Cart'}</span>
                </div>
                <div class="btn-loader">
                    <div class="spinner"></div>
                </div>
            </button>
            
            <button class="premium-add-to-list" onclick="addProductToList(\`${product.name.replace(/'/g, "\\\'")}\`)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 11l3 3L22 4"></path>
                    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
                </svg>
                Add to List
            </button>
        </div>
    `;
    
    // Add animation entrance
    card.style.animationDelay = `${Math.random() * 0.3}s`;
    
    console.log('🃏 Product card completed for:', product.name, 'innerHTML length:', card.innerHTML.length);
    
    return card;
}

// Mock product creation for fallback when API fails
function createMockProductsForSearch(searchTerm) {
    console.log('🧪 Creating mock products for search term:', searchTerm);
    
    const baseProducts = [
        {
            id: 'mock-1',
            name: 'Organic Broccoli Crowns',
            brand: 'Simple Truth Organic',
            size: '1 lb',
            price: 2.99,
            salePrice: 2.49,
            image: '/api/placeholder/product-image',
            description: 'Fresh organic broccoli crowns'
        },
        {
            id: 'mock-2', 
            name: 'Organic Carrots',
            brand: 'Simple Truth Organic',
            size: '2 lb bag',
            price: 3.99,
            salePrice: null,
            image: '/api/placeholder/product-image',
            description: 'Fresh organic carrots'
        },
        {
            id: 'mock-3',
            name: 'Organic Baby Spinach',
            brand: 'Simple Truth Organic', 
            size: '5 oz',
            price: 4.49,
            salePrice: 3.99,
            image: '/api/placeholder/product-image',
            description: 'Fresh organic baby spinach leaves'
        },
        {
            id: 'mock-4',
            name: 'Whole Milk',
            brand: 'Kroger',
            size: '1 gallon',
            price: 3.79,
            salePrice: null,
            image: '/api/placeholder/product-image',
            description: 'Fresh whole milk'
        },
        {
            id: 'mock-5',
            name: 'Large Eggs',
            brand: 'Kroger',
            size: '12 count',
            price: 2.99,
            salePrice: 2.49,
            image: '/api/placeholder/product-image',
            description: 'Grade A large eggs'
        }
    ];
    
    // Filter products based on search term
    const filtered = baseProducts.filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // If no matches, return a few random products for demo
    if (filtered.length === 0) {
        return baseProducts.slice(0, 3);
    }
    
    return filtered;
}

// ============================================
// PREMIUM PRODUCT CARD HELPER FUNCTIONS
// ============================================

function generateStockStatus(product) {
    // Mock stock status generation for demo
    const stockLevel = Math.random();
    if (stockLevel > 0.7) {
        return { class: 'in-stock', text: 'In Stock' };
    } else if (stockLevel > 0.3) {
        return { class: 'low-stock', text: 'Low Stock' };
    } else {
        return { class: 'out-of-stock', text: 'Out of Stock' };
    }
}

function getCartQuantity(productId) {
    const cartItem = cart.find(item => item.product.id === productId);
    return cartItem ? cartItem.quantity : 0;
}

function updateCardQuantity(productId, change) {
    const product = currentProducts.find(p => p.id === productId);
    if (!product) return;
    
    const currentQty = getCartQuantity(productId);
    const newQty = Math.max(0, currentQty + change);
    
    if (newQty === 0) {
        removeFromCart(productId);
    } else {
        const cartItem = cart.find(item => item.product.id === productId);
        if (cartItem) {
            cartItem.quantity = newQty;
        } else {
            cart.push({ product, quantity: newQty });
        }
    }
    
    updateCartUI();
    displayProducts(); // Refresh cards to show updated state
}

function setCartQuantity(productId, quantity) {
    const product = currentProducts.find(p => p.id === productId);
    if (!product) return;
    
    const qty = Math.max(0, parseInt(quantity) || 0);
    
    if (qty === 0) {
        removeFromCart(productId);
    } else {
        const cartItem = cart.find(item => item.product.id === productId);
        if (cartItem) {
            cartItem.quantity = qty;
        } else {
            cart.push({ product, quantity: qty });
        }
    }
    
    updateCartUI();
    displayProducts();
}

function handleCardAddToCart(productId) {
    const product = currentProducts.find(p => p.id === productId);
    if (!product) return;
    
    const button = document.querySelector(`[onclick="handleCardAddToCart('${productId}')"]`);
    if (button) {
        button.classList.add('loading');
        
        setTimeout(() => {
            addToCart(product);
            button.classList.remove('loading');
        }, 500);
    }
}

function toggleWishlist(productId) {
    const product = currentProducts.find(p => p.id === productId);
    if (!product) return;
    
    let wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
    const existingIndex = wishlist.findIndex(item => item.id === productId);
    
    if (existingIndex >= 0) {
        wishlist.splice(existingIndex, 1);
        // Silent wishlist update - button state change is sufficient
    } else {
        wishlist.push(product);
    }
    
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
    displayProducts(); // Refresh to update wishlist state
}

// ============================================
// PREMIUM GRID LAYOUT FUNCTIONS
// ============================================

let currentGridLayout = 'standard';

function setGridLayout(layout) {
    currentGridLayout = layout;
    const grid = document.getElementById('searchResults');
    const layoutOptions = document.querySelectorAll('.layout-option');
    
    // Set current view to grid when changing grid layout
    currentView = 'grid';
    
    // Update active button
    layoutOptions.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.layout === layout) {
            btn.classList.add('active');
        }
    });
    
    // Apply layout classes
    grid.classList.remove('masonry', 'standard');
    if (layout === 'masonry') {
        grid.classList.add('masonry');
    } else {
        grid.classList.add('standard');
    }
    
    // Ensure we're in grid view and hide table
    const searchResults = document.getElementById('searchResults');
    const tableResults = document.getElementById('tableResults');
    
    // For masonry, use block display, for standard use grid
    if (layout === 'masonry') {
        searchResults.style.display = 'block';
    } else {
        searchResults.style.display = 'grid';
    }
    tableResults.style.display = 'none';
    
    // Show grid density slider for grid views
    const gridDensitySlider = document.querySelector('.grid-density-slider');
    if (gridDensitySlider) {
        gridDensitySlider.style.display = 'flex';
    }
    
    // Re-display products if we have them
    if (currentProducts.length > 0) {
        displayProducts();
    }
    
    // Silent layout change - visual change is sufficient feedback
}

function updateGridDensity(value) {
    const grid = document.getElementById('searchResults');
    const label = document.getElementById('densityLabel');
    
    grid.style.setProperty('--grid-columns', value);
    label.textContent = value;
    
    localStorage.setItem('gridDensity', value);
}

function applyQuickFilter(filterType) {
    const button = document.querySelector('[data-filter="' + filterType + '"]');
    
    if (activeQuickFilters.has(filterType)) {
        activeQuickFilters.delete(filterType);
        button.classList.remove('active');
    } else {
        activeQuickFilters.add(filterType);
        button.classList.add('active');
    }
    
    filterProducts();
    
    // Silent filter toggle - visual feedback is sufficient
}

// Enhanced filter function with price range and quick filters
function filterCurrentProducts() {
    const brandFilter = document.getElementById('filterBrand')?.value || '';
    const onSaleOnly = document.getElementById('onSaleOnly')?.checked || false;
    const inStockOnly = document.getElementById('inStockOnly')?.checked || false;
    const minPrice = parseFloat(document.getElementById('minPrice')?.value) || 0;
    const maxPrice = parseFloat(document.getElementById('maxPrice')?.value) || Infinity;
    
    return currentProducts.filter(product => {
        const price = (product.salePrice && product.salePrice > 0) ? product.salePrice : (product.price || 0);
        
        // Basic filters
        if (brandFilter && product.brand !== brandFilter) return false;
        if (onSaleOnly && !(product.salePrice && product.salePrice > 0)) return false;
        if (inStockOnly) {
            const stockStatus = generateStockStatus(product);
            if (stockStatus.class === 'out-of-stock') return false;
        }
        
        // Price range filter
        if (price < minPrice || price > maxPrice) return false;
        
        // Quick filters
        if (activeQuickFilters.has('under-5') && price >= 5) return false;
        if (activeQuickFilters.has('organic') && !product.name.toLowerCase().includes('organic')) return false;
        if (activeQuickFilters.has('deals') && !(product.salePrice && product.salePrice > 0)) return false;
        if (activeQuickFilters.has('popular')) {
            // Mock popularity check - in real app would use actual data
            const popularCheck = Math.random() > 0.5;
            if (!popularCheck) return false;
        }
        
        return true;
    });
}

function addToComparison(productId) {
    const product = currentProducts.find(p => p.id === productId);
    if (!product) return;
    
    let comparison = JSON.parse(localStorage.getItem('comparison') || '[]');
    
    if (comparison.length >= 4) {
        showToast('Comparison Full', 'Maximum 4 products', 'warning');
        return;
    }
    
    if (comparison.some(item => item.id === productId)) {
        // Product already in comparison - silent
        return;
    }
    
    comparison.push(product);
    localStorage.setItem('comparison', JSON.stringify(comparison));
    // Silent addition - comparison count is visible
}

function showQuickView(productId) {
    const product = currentProducts.find(p => p.id === productId);
    if (!product) return;
    
    // For now, just show the regular modal - can enhance later
    showProductModal(product);
}

function createProductRow(product) {
    const row = document.createElement('tr');
    const price = (product.salePrice && product.salePrice > 0) ? product.salePrice : (product.price || 0);
    const originalPrice = (product.salePrice && product.salePrice > 0) ? product.price : null;
    const isOnSale = originalPrice && product.salePrice && product.salePrice < originalPrice;
    const discountPercent = isOnSale ? Math.round(((originalPrice - product.salePrice) / originalPrice) * 100) : 0;
    
    // Check if product is in cart
    const cartItem = cart.find(item => item.product.id === product.id);
    const quantityInCart = cartItem ? cartItem.quantity : 0;
    
    row.className = 'table-product-row';
    row.dataset.productId = product.id;
    
    row.innerHTML = `
        <td class="select-column">
            <label class="row-checkbox">
                <input type="checkbox" class="product-checkbox" onchange="toggleRowSelection(this)">
                <span class="checkmark"></span>
            </label>
        </td>
        <td class="image-column">
            ${product.image 
                ? `<img src="${product.image}" alt="${product.name.replace(/"/g, '&quot;')}" class="product-image-thumb" onclick="showProductModalById('${product.id}')" onerror="this.parentElement.innerHTML='<div class=&quot;product-image-placeholder&quot;>📦</div>'">`
                : '<div class="product-image-placeholder">📦</div>'
            }
        </td>
        <td>
            <div class="enhanced-product-name" onclick="showProductModalById('${product.id}')" title="${product.name.replace(/"/g, '&quot;')}">
                ${product.name}
            </div>
        </td>
        <td>
            <div class="product-brand">${product.brand || '-'}</div>
        </td>
        <td>
            <div class="product-size">${product.size || '-'}</div>
        </td>
        <td class="price-column">
            <div class="price-container">
                ${originalPrice ? `<div class="original-price">$${originalPrice.toFixed(2)}</div>` : ''}
                <div class="${isOnSale ? 'sale-price' : 'current-price'}">$${price.toFixed(2)}</div>
                ${isOnSale ? `<div class="price-badge">${discountPercent}% OFF</div>` : ''}
            </div>
        </td>
        <td class="quantity-column">
            <div class="table-quantity-controls">
                <button onclick="updateTableQuantity('${product.id}', -1)" ${quantityInCart <= 0 ? 'disabled' : ''}>-</button>
                <input type="number" value="${quantityInCart}" min="0" max="99" onchange="setTableQuantity('${product.id}', this.value)" readonly>
                <button onclick="updateTableQuantity('${product.id}', 1)">+</button>
            </div>
        </td>
        <td class="actions-column">
            <div class="table-product-actions">
                <button class="table-action-btn-small add-to-cart-btn" onclick='addToCart(${JSON.stringify(product)})' title="Add to Cart">
                    🛒
                </button>
                <button class="table-action-btn-small add-to-list-btn" onclick='addProductToList("${product.name.replace(/"/g, "&quot;")}")' title="Add to List">
                    📝
                </button>
                <button class="table-action-btn-small view-details-btn" onclick="showProductModalById('${product.id}')" title="View Details">
                    👁️
                </button>
            </div>
        </td>
    `;
    
    return row;
}

// View Controls
function setView(view) {
    currentView = view;
    
    // Update active button state for layout options
    const layoutOptions = document.querySelectorAll('.layout-option');
    layoutOptions.forEach(btn => {
        btn.classList.remove('active');
        if ((view === 'grid' && (btn.dataset.layout === 'standard' || btn.dataset.layout === 'masonry')) || 
            (view === 'table' && btn.dataset.layout === 'table')) {
            // For grid view, activate the current grid layout button
            if (view === 'grid' && btn.dataset.layout === currentGridLayout) {
                btn.classList.add('active');
            } else if (view === 'table' && btn.dataset.layout === 'table') {
                btn.classList.add('active');
            }
        }
    });
    
    // Handle grid density slider visibility
    const gridDensitySlider = document.querySelector('.grid-density-slider');
    if (gridDensitySlider) {
        gridDensitySlider.style.display = view === 'grid' ? 'flex' : 'none';
    }
    
    if (currentProducts.length > 0) {
        displayProducts();
    }
    
    // Silent view switch - visual change is sufficient
}

function updateGridSize() {
    const gridSize = document.getElementById('gridSize').value;
    const resultsDiv = document.getElementById('searchResults');
    resultsDiv.style.setProperty('--grid-columns', gridSize);
    localStorage.setItem('preferredGridSize', gridSize);
}

// Helper function to calculate discount percentage
function calculateDiscountPercent(product) {
    if (!product.salePrice || !product.price || product.salePrice >= product.price) {
        return 0;
    }
    return ((product.price - product.salePrice) / product.price) * 100;
}

// Sorting and Filtering
function sortProducts() {
    const sortBy = document.getElementById('sortBy').value;
    
    if (!sortBy) {
        // Default: sale items first
        currentProducts.sort((a, b) => {
            const aSale = (a.salePrice && a.salePrice > 0) ? 1 : 0;
            const bSale = (b.salePrice && b.salePrice > 0) ? 1 : 0;
            return bSale - aSale;
        });
    } else {
        switch (sortBy) {
            case 'price-low':
                currentProducts.sort((a, b) => {
                    const aPrice = (a.salePrice && a.salePrice > 0) ? a.salePrice : (a.price || 0);
                    const bPrice = (b.salePrice && b.salePrice > 0) ? b.salePrice : (b.price || 0);
                    return aPrice - bPrice;
                });
                break;
            case 'price-high':
                currentProducts.sort((a, b) => {
                    const aPrice = (a.salePrice && a.salePrice > 0) ? a.salePrice : (a.price || 0);
                    const bPrice = (b.salePrice && b.salePrice > 0) ? b.salePrice : (b.price || 0);
                    return bPrice - aPrice;
                });
                break;
            case 'name':
                currentProducts.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'brand':
                currentProducts.sort((a, b) => (a.brand || '').localeCompare(b.brand || ''));
                break;
            case 'discount':
                currentProducts.sort((a, b) => {
                    const aDiscount = calculateDiscountPercent(a);
                    const bDiscount = calculateDiscountPercent(b);
                    return bDiscount - aDiscount; // Biggest discount first
                });
                break;
        }
    }
    
    displayProducts();
}

function filterProducts() {
    displayProducts();
}

// Removed duplicate filterCurrentProducts function - using the more complete version above

function updateBrandFilter() {
    // Use allProducts instead of currentProducts to show all available brands
    const sourceProducts = allProducts.length > 0 ? allProducts : currentProducts;
    const brands = [...new Set(sourceProducts.map(p => p.brand).filter(b => b))];
    const brandFilter = document.getElementById('filterBrand');
    if (brandFilter) {
        brandFilter.innerHTML = '<option value="">All Brands</option>';
        brands.sort().forEach(brand => {
            const option = document.createElement('option');
            option.value = brand;
            option.textContent = brand;
            brandFilter.appendChild(option);
        });
    }
}

// Shopping List Management
function addToList() {
    const input = document.getElementById('newItem');
    const item = input.value.trim();
    
    if (item) {
        shoppingList.push({ name: item, quantity: 1 });
        input.value = '';
        updateShoppingList();
        // Silent addition - item appears in list
    }
}

function addProductToList(productName) {
    shoppingList.push({ name: productName, quantity: 1 });
    updateShoppingList();
    // Silent addition - item appears in list
}

function updateShoppingList() {
    const listElement = document.getElementById('shoppingItems');
    if (!listElement) {
        console.error('Shopping list element not found');
        return;
    }
    
    listElement.innerHTML = '';
    
    if (shoppingList.length === 0) {
        listElement.innerHTML = '<li style="text-align: center; color: #666;">Your shopping list is empty</li>';
        return;
    }
    
    shoppingList.forEach((item, index) => {
        const li = document.createElement('li');
        const span = document.createElement('span');
        span.textContent = item.name;
        
        const button = document.createElement('button');
        button.textContent = 'Remove';
        button.onclick = () => removeFromList(index);
        
        li.appendChild(span);
        li.appendChild(button);
        listElement.appendChild(li);
    });
}

function removeFromList(index) {
    const item = shoppingList[index];
    shoppingList.splice(index, 1);
    updateShoppingList();
    // Silent removal - item disappears from list
}

function handleListEnter(event) {
    if (event.key === 'Enter') {
        addToList();
    }
}

// Cart Management - SIMPLIFIED
function addToCart(product) {
    const existingItem = cart.find(item => item.product.id === product.id);
    
    if (existingItem) {
        existingItem.quantity++;
        showCartAddToast(product.name, existingItem.quantity);
        showSuccessToast('Quantity Updated', `${product.name} quantity increased to ${existingItem.quantity}`);
    } else {
        cart.push({
            product: product,
            quantity: 1
        });
        showCartAddToast(product.name, 1);
    }
    
    updateCart();
    updateFooter();
    saveCartToStorage();
    
    // Enhanced cart tab animation
    const cartTab = document.querySelector('.tab-button:nth-child(3)');
    if (cartTab) {
        cartTab.style.animation = 'bounce 0.6s ease-out';
        setTimeout(() => {
            cartTab.style.animation = '';
        }, 600);
    }
    
    // Add subtle shake animation to cart count
    const cartCount = document.getElementById('cartCount');
    if (cartCount) {
        cartCount.style.animation = 'pulse 0.4s ease-out';
        setTimeout(() => {
            cartCount.style.animation = '';
        }, 400);
    }
}

function updateCart() {
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    const cartSubtotal = document.getElementById('cartSubtotal');
    const estimatedTax = document.getElementById('estimatedTax');
    const cartItemCount = document.getElementById('cartItemCount');
    const summaryItemCount = document.getElementById('summaryItemCount');
    const emptyCartState = document.getElementById('emptyCartState');
    const clearCartBtn = document.getElementById('clearCartBtn');
    const checkoutBtn = document.getElementById('checkoutBtn');
    
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    if (cart.length === 0) {
        // Show empty state
        cartItems.innerHTML = '';
        if (emptyCartState) {
            cartItems.appendChild(emptyCartState);
            emptyCartState.style.display = 'block';
        }
        cartTotal.textContent = '$0.00';
        cartSubtotal.textContent = '$0.00';
        estimatedTax.textContent = '$0.00';
        if (clearCartBtn) clearCartBtn.style.display = 'none';
        if (checkoutBtn) checkoutBtn.disabled = true;
        if (cartItemCount) cartItemCount.textContent = '0';
        if (summaryItemCount) summaryItemCount.textContent = '0';
        return;
    }
    
    // Hide empty state
    if (emptyCartState) emptyCartState.style.display = 'none';
    if (clearCartBtn) clearCartBtn.style.display = 'flex';
    if (checkoutBtn) checkoutBtn.disabled = false;
    
    cartItems.innerHTML = '';
    let subtotal = 0;
    
    cart.forEach((item, index) => {
        const currentPrice = (item.product.salePrice && item.product.salePrice > 0) 
            ? item.product.salePrice 
            : (item.product.price || 0);
        const itemSubtotal = currentPrice * item.quantity;
        subtotal += itemSubtotal;
        
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        
        // Create info container
        const infoDiv = document.createElement('div');
        infoDiv.className = 'cart-item-info';
        
        const nameDiv = document.createElement('div');
        nameDiv.className = 'cart-item-name';
        nameDiv.textContent = item.product.name;
        
        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'cart-item-details';
        detailsDiv.textContent = (item.product.brand || 'Generic') + ' • ' + (item.product.size || 'Standard');
        
        if (item.product.salePrice && item.product.salePrice > 0) {
            const saleBadge = document.createElement('span');
            saleBadge.className = 'sale-badge';
            saleBadge.textContent = 'Sale';
            detailsDiv.appendChild(saleBadge);
        }
        
        const priceDiv = document.createElement('div');
        priceDiv.className = 'cart-item-price';
        priceDiv.textContent = '$' + currentPrice.toFixed(2) + ' each';
        
        infoDiv.appendChild(nameDiv);
        infoDiv.appendChild(detailsDiv);
        infoDiv.appendChild(priceDiv);
        
        // Create quantity controls
        const quantityDiv = document.createElement('div');
        quantityDiv.className = 'quantity-controls';
        
        const minusBtn = document.createElement('button');
        minusBtn.textContent = '-';
        minusBtn.onclick = () => updateQuantity(index, -1);
        
        const quantitySpan = document.createElement('span');
        quantitySpan.className = 'quantity-display';
        quantitySpan.textContent = item.quantity.toString();
        
        const plusBtn = document.createElement('button');
        plusBtn.textContent = '+';
        plusBtn.onclick = () => updateQuantity(index, 1);
        
        quantityDiv.appendChild(minusBtn);
        quantityDiv.appendChild(quantitySpan);
        quantityDiv.appendChild(plusBtn);
        
        // Create subtotal
        const subtotalDiv = document.createElement('div');
        subtotalDiv.className = 'cart-item-subtotal';
        subtotalDiv.textContent = '$' + itemSubtotal.toFixed(2);
        
        // Create remove button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-item-btn';
        removeBtn.textContent = '×';
        removeBtn.onclick = () => removeFromCart(index);
        
        cartItem.appendChild(infoDiv);
        cartItem.appendChild(quantityDiv);
        cartItem.appendChild(subtotalDiv);
        cartItem.appendChild(removeBtn);
        
        cartItems.appendChild(cartItem);
    });
    
    const tax = subtotal * 0.08; // 8% tax estimate
    const total = subtotal + tax;
    
    // Update totals
    if (cartItemCount) cartItemCount.textContent = totalItems;
    if (summaryItemCount) summaryItemCount.textContent = totalItems;
    cartSubtotal.textContent = `$${subtotal.toFixed(2)}`;
    estimatedTax.textContent = `$${tax.toFixed(2)}`;
    cartTotal.textContent = `$${total.toFixed(2)}`;
}

function updateQuantity(index, change) {
    cart[index].quantity += change;
    
    if (cart[index].quantity <= 0) {
        removeFromCart(index);
    } else {
        updateCart();
        updateFooter();
        saveCartToStorage();
    }
}

function removeFromCart(index) {
    const item = cart[index];
    cart.splice(index, 1);
    updateCart();
    updateFooter();
    saveCartToStorage();
    // Silent removal - cart update is visible
}

function clearCart() {
    if (cart.length === 0) return;
    
    if (confirm('Are you sure you want to clear your cart?')) {
        cart = [];
        updateCart();
        updateFooter();
        saveCartToStorage();
        // Silent clear - cart is visibly empty
    }
}

function checkout() {
    if (cart.length === 0) {
        showToast('Cart Empty', 'Add items before checkout', 'warning');
        return;
    }
    
    const total = document.getElementById('cartTotal').textContent;
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    alert('Checkout Summary:\n\nItems: ' + itemCount + '\nTotal: ' + total + '\n\nThis would redirect to Kroger\'s checkout.');
}

// Cart Storage
function saveCartToStorage() {
    localStorage.setItem('krogerCart', JSON.stringify(cart));
}

function loadCartFromStorage() {
    const saved = localStorage.getItem('krogerCart');
    if (saved) {
        try {
            cart = JSON.parse(saved);
            console.log('Loaded cart from storage:', cart.length, 'items');
        } catch (e) {
            console.error('Failed to load cart from storage:', e);
            cart = [];
        }
    }
}

// Helper function to show modal by product ID
function showProductModalById(productId) {
    const product = currentProducts.find(p => p.id === productId);
    if (!product) {
        console.error('Product not found:', productId);
        // Product not found - silent error
        return;
    }
    showProductModal(product);
}

// Product Modal - SIMPLIFIED
function showProductModal(product) {
    const modal = document.getElementById('productModal');
    if (!modal) return;
    
    // Add to recently viewed
    addToRecentlyViewed(product);
    
    // Update modal content
    document.getElementById('modalTitle').textContent = product.name;
    document.getElementById('modalBrand').textContent = product.brand || 'N/A';
    document.getElementById('modalSize').textContent = product.size || 'N/A';
    
    // Image
    const modalImage = document.getElementById('modalImage');
    if (modalImage) {
        modalImage.src = product.image || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iI2NjYyIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';
        modalImage.alt = product.name;
    }
    
    // Price
    const price = (product.salePrice && product.salePrice > 0) ? product.salePrice : (product.price || 0);
    const originalPrice = (product.salePrice && product.salePrice > 0) ? product.price : null;
    const priceHtml = originalPrice 
        ? '<span class="original-price">$' + originalPrice.toFixed(2) + '</span> $' + price.toFixed(2)
        : '$' + price.toFixed(2);
    document.getElementById('modalPrice').innerHTML = priceHtml;
    
    // Store reference for modal actions
    window.currentModalProduct = product;
    
    // Show modal
    modal.style.display = 'block';
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
}

function closeProductModal() {
    const modal = document.getElementById('productModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
        document.body.style.overflow = 'auto';
        document.body.style.pointerEvents = 'auto';
        window.currentModalProduct = null;
    }
    
    // Extra safety: Ensure no other modals or overlays are blocking
    const overlays = document.querySelectorAll('.modal, [style*="z-index"]');
    overlays.forEach(overlay => {
        if (overlay !== modal && overlay.style.display === 'block' && overlay.style.zIndex > 100) {
            overlay.style.display = 'none';
        }
    });
}

function addToCartFromModal() {
    if (window.currentModalProduct) {
        addToCart(window.currentModalProduct);
    }
}

function addToListFromModal() {
    if (window.currentModalProduct) {
        addProductToList(window.currentModalProduct.name);
    }
}

// Utility Functions
function updateFooter() {
    // Only update cart count - store info is only in Settings tab
    const cartCountEl = document.getElementById('cartCount');
    
    if (cartCountEl) cartCountEl.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
}

function clearSearch() {
    document.getElementById('searchTerm').value = '';
    document.getElementById('clearSearchBtn').style.display = 'none';
    document.getElementById('searchTerm').focus();
}

// Handle Enter key in search input
function handleSearchEnter(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        searchProducts();
    }
}

// Handle Enter key in list input
function handleListEnter(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        addToList();
    }
}

// Handle Enter key in ZIP code input
function handleZipEnter(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        findStores();
    }
}

// Toast notification system now uses the ToastManager class defined above

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    @keyframes pulse {
        0%, 100% {
            transform: scale(1);
        }
        50% {
            transform: scale(1.05);
        }
    }
    
    .loading-spinner {
        border: 3px solid rgba(0, 102, 204, 0.2);
        border-top: 3px solid #0066cc;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

// Additional ZIP code input event listener setup
function setupZipCodeListener() {
    const zipInput = document.getElementById('zipCode');
    if (zipInput) {
        zipInput.addEventListener('input', function() {
            if (this.value.length === 5 && /^\d+$/.test(this.value)) {
                // Use silent version during initialization to prevent toasts
                if (isInitializing) {
                    findStoresSilent();
                } else {
                    findStores();
                }
            }
        });
    }
}

// Make UI reset function globally available for emergency use
window.resetUIState = resetUIState;

// Add missing functions referenced in HTML but not implemented
function clearAllFilters() {
    // Reset all filters
    document.getElementById('sortBy').value = '';
    document.getElementById('filterBrand').value = '';
    document.getElementById('onSaleOnly').checked = false;
    document.getElementById('inStockOnly').checked = false;
    
    // Redisplay products
    if (currentProducts.length > 0) {
        displayProducts();
    }
    
    // Silent filter clear - visual change is sufficient
}

function selectAllProducts() {
    const checkboxes = document.querySelectorAll('.product-grid .checkbox, .product-table .checkbox');
    checkboxes.forEach(cb => cb.checked = true);
    // Silent selection - checkbox states show selection
}

function addSelectedToCart() {
    const checkboxes = document.querySelectorAll('.product-checkbox:checked');
    if (checkboxes.length === 0) {
        showToast('No Selection', 'Select products to add', 'warning');
        return;
    }
    
    let addedCount = 0;
    checkboxes.forEach(checkbox => {
        const row = checkbox.closest('tr');
        if (row && row.dataset.productId) {
            const product = currentProducts.find(p => p.id === row.dataset.productId);
            if (product) {
                addToCart(product);
                addedCount++;
            }
        }
    });
    
    // Clear selections
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
        toggleRowSelection(checkbox);
    });
    
    document.getElementById('selectAllTable').checked = false;
    
    showToast(`Added ${addedCount} to cart`, 'success');
}

function sortByColumn(column) {
    // Basic column sorting for table view
    if (currentProducts.length === 0) return;
    
    switch (column) {
        case 'name':
            currentProducts.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'brand':
            currentProducts.sort((a, b) => (a.brand || '').localeCompare(b.brand || ''));
            break;
        case 'price':
            currentProducts.sort((a, b) => {
                const aPrice = (a.salePrice && a.salePrice > 0) ? a.salePrice : (a.price || 0);
                const bPrice = (b.salePrice && b.salePrice > 0) ? b.salePrice : (b.price || 0);
                return aPrice - bPrice;
            });
            break;
        case 'size':
            currentProducts.sort((a, b) => (a.size || '').localeCompare(b.size || ''));
            break;
            break;
    }
    
    displayProducts();
    // Silent sort - visual change is sufficient
}

function findDeals() {
    if (shoppingList.length === 0) {
        showToast('List Empty', 'Add items to find deals', 'warning');
        return;
    }
    
    showToast('Finding deals...', 'info');
    // This would require API implementation
}

function buildSmartList() {
    const budget = document.getElementById('budget')?.value || 50;
    showToast('Optimizing list...', 'info');
    // This would require API implementation
}

function saveCartForLater() {
    if (cart.length === 0) {
        showToast('Cart is empty', 'warning');
        return;
    }
    
    localStorage.setItem('savedCart', JSON.stringify(cart));
    showToast('Cart saved', 'success');
}

function applyPromoCode() {
    const promoCode = document.getElementById('promoCode')?.value?.trim();
    if (!promoCode) {
        showToast('Please enter a promo code', 'warning');
        return;
    }
    
    // Promo code feature not yet implemented
}

function updateModalQuantity(change) {
    const quantityInput = document.getElementById('modalQuantity');
    if (quantityInput) {
        const currentValue = parseInt(quantityInput.value) || 1;
        const newValue = Math.max(1, currentValue + change);
        quantityInput.value = newValue;
    }
}

function validateModalQuantity() {
    const quantityInput = document.getElementById('modalQuantity');
    if (quantityInput) {
        const value = parseInt(quantityInput.value) || 1;
        quantityInput.value = Math.max(1, value);
    }
}

function removeFromCartModal() {
    if (window.currentModalProduct) {
        const cartItem = cart.find(item => item.product.id === window.currentModalProduct.id);
        if (cartItem) {
            const index = cart.indexOf(cartItem);
            removeFromCart(index);
            closeProductModal();
        } else {
            // Product not in cart - silent
        }
    }
}

function toggleRawData() {
    const rawDataDiv = document.getElementById('modalRawData');
    if (rawDataDiv) {
        const isVisible = rawDataDiv.style.display !== 'none';
        rawDataDiv.style.display = isVisible ? 'none' : 'block';
        
        if (!isVisible && window.currentModalProduct) {
            document.getElementById('modalRawJson').textContent = JSON.stringify(window.currentModalProduct, null, 2);
        }
    }
}

// Add emergency UI fix keyboard shortcut (Ctrl+Shift+U)
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'U') {
        e.preventDefault();
        resetUIState();
        // UI reset complete
    }
});

// DEBUG: Add a simple test function for manual testing
window.testSearch = function(term = 'milk') {
    console.log('🧪 Manual test search for:', term);
    const searchInput = document.getElementById('searchTerm');
    if (searchInput) {
        searchInput.value = term;
        searchProducts();
    } else {
        console.error('Search input not found');
    }
};

// Expose all functions used in HTML onclick/onchange handlers to global scope
// This is necessary when using ES6 modules (type="module" script tag)
window.showTab = showTab;
window.clearSearch = clearSearch;
window.searchProducts = searchProducts;
window.setView = setView;
window.clearAllFilters = clearAllFilters;
window.selectAllProducts = selectAllProducts;
window.addSelectedToCart = addSelectedToCart;
window.sortByColumn = sortByColumn;
window.addToList = addToList;
window.findDeals = findDeals;
window.buildSmartList = buildSmartList;
window.clearCart = clearCart;
window.saveCartForLater = saveCartForLater;
window.applyPromoCode = applyPromoCode;
window.checkout = checkout;
window.findStores = findStores;
window.setDefaultStore = setDefaultStore;
window.removeDefaultStore = removeDefaultStore;
window.exportData = exportData;
window.clearSearchHistory = clearSearchHistory;
window.resetAllSettings = resetAllSettings;
window.closeProductModal = closeProductModal;
window.updateModalQuantity = updateModalQuantity;
window.addToCartFromModal = addToCartFromModal;
window.removeFromCartModal = removeFromCartModal;
window.addToListFromModal = addToListFromModal;
window.toggleRawData = toggleRawData;

// Event handlers
window.handleSearchEnter = handleSearchEnter;
window.sortProducts = sortProducts;
window.filterProducts = filterProducts;
window.updateGridSize = updateGridSize;
window.handleListEnter = handleListEnter;
window.handleZipEnter = handleZipEnter;
window.highlightZipInput = highlightZipInput;
window.unhighlightZipInput = unhighlightZipInput;
window.selectStore = selectStore;
window.savePreference = savePreference;
window.validateModalQuantity = validateModalQuantity;

// Functions that are called dynamically from generated HTML
window.showProductModal = showProductModal;
window.addToCart = addToCart;
window.addProductToList = addProductToList;
window.removeFromList = removeFromList;
window.updateQuantity = updateQuantity;
window.removeFromCart = removeFromCart;

// Enhanced Table Functionality

// Table pagination variables
let currentTablePage = 1;
let tablePageSize = 25;
let totalTablePages = 1;
let currentTableProducts = [];

// Table sorting state
let currentSortColumn = '';
let currentSortDirection = 'asc'; // 'asc' or 'desc'

// Setup table pagination
function setupTablePagination(products) {
    currentTableProducts = products;
    totalTablePages = Math.ceil(products.length / tablePageSize);
    currentTablePage = Math.min(currentTablePage, totalTablePages); // Ensure current page is valid
    
    const pagination = document.getElementById('tablePagination');
    if (products.length > tablePageSize) {
        pagination.style.display = 'flex';
    } else {
        pagination.style.display = 'none';
    }
}

// Get products for current page
function getCurrentPageProducts(products) {
    const start = (currentTablePage - 1) * tablePageSize;
    const end = start + tablePageSize;
    return products.slice(start, end);
}

// Update pagination display
function updateTablePagination(totalProducts) {
    const start = Math.min((currentTablePage - 1) * tablePageSize + 1, totalProducts);
    const end = Math.min(currentTablePage * tablePageSize, totalProducts);
    
    document.getElementById('paginationStart').textContent = start;
    document.getElementById('paginationEnd').textContent = end;
    document.getElementById('paginationTotal').textContent = totalProducts;
    
    // Update pagination controls
    const firstBtn = document.getElementById('firstPageBtn');
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    const lastBtn = document.getElementById('lastPageBtn');
    
    firstBtn.disabled = currentTablePage === 1;
    prevBtn.disabled = currentTablePage === 1;
    nextBtn.disabled = currentTablePage === totalTablePages;
    lastBtn.disabled = currentTablePage === totalTablePages;
    
    // Update page numbers
    updatePageNumbers();
}

// Update page number buttons
function updatePageNumbers() {
    const pageNumbers = document.getElementById('pageNumbers');
    pageNumbers.innerHTML = '';
    
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentTablePage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalTablePages, startPage + maxVisiblePages - 1);
    
    // Adjust start if we're near the end
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `page-number ${i === currentTablePage ? 'active' : ''}`;
        pageBtn.textContent = i;
        pageBtn.onclick = () => goToTablePage(i);
        pageNumbers.appendChild(pageBtn);
    }
}

// Navigate to specific page
function goToTablePage(page) {
    if (page < 1 || page > totalTablePages) return;
    currentTablePage = page;
    displayProducts(); // Refresh display with new page
}

// Change page size
function changeTablePageSize() {
    const newPageSize = parseInt(document.getElementById('tablePagSize').value);
    tablePageSize = newPageSize;
    currentTablePage = 1; // Reset to first page
    displayProducts(); // Refresh display
}

// Enhanced sorting with visual indicators
function sortByColumn(column) {
    if (currentProducts.length === 0) return;
    
    // Update sort state
    if (currentSortColumn === column) {
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortColumn = column;
        currentSortDirection = 'asc';
    }
    
    // Update visual indicators
    updateSortIndicators(column, currentSortDirection);
    
    // Sort products
    currentProducts.sort((a, b) => {
        let aValue, bValue;
        
        switch (column) {
            case 'name':
                aValue = a.name.toLowerCase();
                bValue = b.name.toLowerCase();
                break;
            case 'brand':
                aValue = (a.brand || '').toLowerCase();
                bValue = (b.brand || '').toLowerCase();
                break;
            case 'price':
                aValue = (a.salePrice && a.salePrice > 0) ? a.salePrice : (a.price || 0);
                bValue = (b.salePrice && b.salePrice > 0) ? b.salePrice : (b.price || 0);
                break;
            case 'size':
                aValue = (a.size || '').toLowerCase();
                bValue = (b.size || '').toLowerCase();
                break;
                break;
            default:
                return 0;
        }
        
        if (aValue < bValue) return currentSortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return currentSortDirection === 'asc' ? 1 : -1;
        return 0;
    });
    
    displayProducts();
    // Silent sort - visual indicators show the sort state
}

// Update sort indicators in table header
function updateSortIndicators(activeColumn, direction) {
    // Reset all sort indicators
    document.querySelectorAll('.sortable-column').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
    });
    
    // Set active sort indicator
    const activeHeader = document.querySelector(`[data-sort="${activeColumn}"]`);
    if (activeHeader) {
        activeHeader.classList.add(`sort-${direction}`);
    }
}

// Toggle compact table view
function toggleCompactTable() {
    const container = document.getElementById('tableResults');
    const isCompact = document.getElementById('compactTableView').checked;
    
    if (isCompact) {
        container.classList.add('compact');
    } else {
        container.classList.remove('compact');
    }
    
    // Silent view change - visual change is sufficient
}

// Row selection functions
function toggleRowSelection(checkbox) {
    const row = checkbox.closest('tr');
    if (checkbox.checked) {
        row.classList.add('selected');
    } else {
        row.classList.remove('selected');
    }
    
    updateBulkActionButtons();
}

function toggleSelectAllTable() {
    const selectAll = document.getElementById('selectAllTable');
    const checkboxes = document.querySelectorAll('.product-checkbox');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAll.checked;
        toggleRowSelection(checkbox);
    });
}

function updateBulkActionButtons() {
    const selectedCount = document.querySelectorAll('.product-checkbox:checked').length;
    const bulkActions = document.querySelector('.results-actions');
    
    if (bulkActions) {
        const bulkButton = bulkActions.querySelector('[onclick="addSelectedToCart()"]');
        if (bulkButton) {
            bulkButton.textContent = selectedCount > 0 
                ? `Add Selected (${selectedCount}) to Cart` 
                : 'Add Selected to Cart';
        }
    }
}

// Table quantity controls
function updateTableQuantity(productId, change) {
    const product = currentProducts.find(p => p.id === productId);
    if (!product) return;
    
    const cartItem = cart.find(item => item.product.id === productId);
    let newQuantity = cartItem ? cartItem.quantity + change : (change > 0 ? change : 0);
    newQuantity = Math.max(0, newQuantity);
    
    if (newQuantity === 0 && cartItem) {
        // Remove from cart
        const index = cart.indexOf(cartItem);
        cart.splice(index, 1);
        // Silent removal - cart update is visible
    } else if (newQuantity > 0) {
        if (cartItem) {
            cartItem.quantity = newQuantity;
            // Silent quantity update - visual feedback is sufficient
        } else {
            cart.push({ product: product, quantity: newQuantity });
            // Silent cart update - visual feedback is sufficient
        }
    }
    
    updateCart();
    updateFooter();
    saveCartToStorage();
    
    // Update the quantity display in the table
    updateTableQuantityDisplay(productId);
}

function setTableQuantity(productId, newQuantity) {
    newQuantity = parseInt(newQuantity) || 0;
    newQuantity = Math.max(0, Math.min(99, newQuantity));
    
    const product = currentProducts.find(p => p.id === productId);
    if (!product) return;
    
    const cartItem = cart.find(item => item.product.id === productId);
    
    if (newQuantity === 0 && cartItem) {
        // Remove from cart
        const index = cart.indexOf(cartItem);
        cart.splice(index, 1);
        // Silent removal - cart update is visible
    } else if (newQuantity > 0) {
        if (cartItem) {
            cartItem.quantity = newQuantity;
        } else {
            cart.push({ product: product, quantity: newQuantity });
        }
        // Silent quantity update - visual feedback is sufficient
    }
    
    updateCart();
    updateFooter();
    saveCartToStorage();
    updateTableQuantityDisplay(productId);
}

function updateTableQuantityDisplay(productId) {
    const row = document.querySelector(`[data-product-id="${productId}"]`);
    if (!row) return;
    
    const cartItem = cart.find(item => item.product.id === productId);
    const quantity = cartItem ? cartItem.quantity : 0;
    
    const input = row.querySelector('.table-quantity-controls input');
    const minusBtn = row.querySelector('.table-quantity-controls button:first-child');
    
    if (input) input.value = quantity;
    if (minusBtn) minusBtn.disabled = quantity <= 0;
}

// Table action functions
function expandAllRows() {
    // Feature not yet implemented
    // This would expand all expandable rows if implemented
}

function collapseAllRows() {
    // Feature not yet implemented
    // This would collapse all expandable rows if implemented
}

function exportTableData() {
    if (currentProducts.length === 0) {
        showToast('Nothing to Export', 'Add products first', 'warning');
        return;
    }
    
    // Create CSV data
    const headers = ['Product', 'Brand', 'Size', 'Price', 'Sale Price', 'Aisle'];
    const csvData = [headers];
    
    currentProducts.forEach(product => {
        const row = [
            product.name || '',
            product.brand || '',
            product.size || '',
            product.price || '',
            product.salePrice || '',
''
        ];
        csvData.push(row);
    });
    
    // Convert to CSV string
    const csvString = csvData.map(row => 
        row.map(cell => '"' + cell.toString().replace(/"/g, '""') + '"').join(',')
    ).join('\n');
    
    // Download file
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kroger-products-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('Data exported', 'success');
}

// ============================================
// COMPREHENSIVE SEARCH EXPERIENCE FUNCTIONALITY
// ============================================

// Global state for search features
let searchHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]');
let selectedProducts = new Set();
let comparisonProducts = [];
let recentlyViewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
let searchStartTime = null;
let currentSuggestionIndex = -1;
let voiceRecognition = null;
let isVoiceRecording = false;

// Initialize search features when DOM is loaded
// NOTE: Removed duplicate DOMContentLoaded listener to prevent conflicts with window.onload
// document.addEventListener('DOMContentLoaded', function() {
//     initializeSearchFeatures();
// });

function initializeSearchFeatures() {
    console.log('🔍 Initializing comprehensive search features...');
    
    // Initialize search input listeners
    const searchInput = document.getElementById('searchTerm');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearchInput, 300));
        searchInput.addEventListener('focus', handleSearchFocus);
        searchInput.addEventListener('blur', handleSearchBlur);
        searchInput.addEventListener('keydown', handleSearchKeydown);
    }
    
    // Initialize scroll listener for back to top button
    window.addEventListener('scroll', handleScroll);
    
    // Initialize voice recognition if available
    initializeVoiceRecognition();
    
    // Load recently viewed products
    loadRecentlyViewed();
    
    console.log('✅ Search features initialized successfully');
}

// Enhanced search input handling
function handleSearchInput(event) {
    const query = event.target.value.trim();
    const clearBtn = document.getElementById('clearSearchBtn');
    
    if (query.length > 0) {
        clearBtn.style.display = 'block';
        if (query.length >= 2) {
            showSearchSuggestions(query);
        }
    } else {
        clearBtn.style.display = 'none';
        hideSearchSuggestions();
        showSearchHistory();
    }
}

function handleSearchFocus(event) {
    const query = event.target.value.trim();
    if (query.length === 0) {
        showSearchHistory();
    } else if (query.length >= 2) {
        showSearchSuggestions(query);
    }
}

function handleSearchBlur(event) {
    // Delay hiding to allow clicking on suggestions
    setTimeout(() => {
        hideSearchSuggestions();
        hideSearchHistory();
    }, 200);
}

function handleSearchKeydown(event) {
    const suggestions = document.querySelectorAll('.suggestion-list li');
    const historyItems = document.querySelectorAll('.recent-item, .trending-item, .category-chip');
    const allItems = [...suggestions, ...historyItems];
    
    switch (event.key) {
        case 'ArrowDown':
            event.preventDefault();
            currentSuggestionIndex = Math.min(currentSuggestionIndex + 1, allItems.length - 1);
            updateSuggestionHighlight(allItems);
            break;
        case 'ArrowUp':
            event.preventDefault();
            currentSuggestionIndex = Math.max(currentSuggestionIndex - 1, -1);
            updateSuggestionHighlight(allItems);
            break;
        case 'Enter':
            event.preventDefault();
            if (currentSuggestionIndex >= 0 && allItems[currentSuggestionIndex]) {
                allItems[currentSuggestionIndex].click();
            } else {
                performSearch(event.target.value);
            }
            break;
        case 'Escape':
            hideSearchSuggestions();
            hideSearchHistory();
            event.target.blur();
            break;
    }
}

function updateSuggestionHighlight(items) {
    items.forEach((item, index) => {
        if (index === currentSuggestionIndex) {
            item.classList.add('highlighted');
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.classList.remove('highlighted');
        }
    });
}

// Enhanced search suggestions
async function showSearchSuggestions(query) {
    const suggestionsContainer = document.getElementById('searchSuggestions');
    const historyContainer = document.getElementById('searchHistory');
    
    hideSearchHistory();
    
    try {
        // Mock suggestions - replace with actual API call
        const suggestions = await generateSearchSuggestions(query);
        
        if (suggestions.products.length > 0 || suggestions.categories.length > 0 || suggestions.brands.length > 0) {
            populateSuggestions(suggestions);
            suggestionsContainer.style.display = 'block';
            document.getElementById('searchTerm').setAttribute('aria-expanded', 'true');
        } else {
            hideSearchSuggestions();
        }
    } catch (error) {
        console.error('Error loading suggestions:', error);
        hideSearchSuggestions();
    }
}

async function generateSearchSuggestions(query) {
    // Mock suggestion generation - replace with actual API
    const mockSuggestions = {
        products: [
            `${query} - Organic`,
            `${query} - Premium`,
            `${query} - Low Fat`,
        ],
        categories: [
            `${query} Products`,
            `Fresh ${query}`,
        ],
        brands: [
            `${query} Brand A`,
            `${query} Brand B`,
        ]
    };
    
    return mockSuggestions;
}

function populateSuggestions(suggestions) {
    const productSection = document.getElementById('productSuggestions');
    const categorySection = document.getElementById('categorySuggestions');
    const brandSection = document.getElementById('brandSuggestions');
    
    // Populate product suggestions
    if (suggestions.products.length > 0) {
        const productList = productSection.querySelector('.suggestion-list');
        productList.innerHTML = suggestions.products.map(product => 
            `<li onclick="searchForTerm('${product}')" role="option">
                <svg class="suggestion-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                </svg>
                ${product}
            </li>`
        ).join('');
        productSection.style.display = 'block';
    } else {
        productSection.style.display = 'none';
    }
    
    // Populate category suggestions
    if (suggestions.categories.length > 0) {
        const categoryList = categorySection.querySelector('.suggestion-list');
        categoryList.innerHTML = suggestions.categories.map(category => 
            `<li onclick="searchForTerm('${category}')" role="option">
                <svg class="suggestion-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
                ${category}
            </li>`
        ).join('');
        categorySection.style.display = 'block';
    } else {
        categorySection.style.display = 'none';
    }
    
    // Populate brand suggestions
    if (suggestions.brands.length > 0) {
        const brandList = brandSection.querySelector('.suggestion-list');
        brandList.innerHTML = suggestions.brands.map(brand => 
            `<li onclick="searchForTerm('${brand}')" role="option">
                <svg class="suggestion-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                </svg>
                ${brand}
            </li>`
        ).join('');
        brandSection.style.display = 'block';
    } else {
        brandSection.style.display = 'none';
    }
}

function hideSearchSuggestions() {
    const suggestionsContainer = document.getElementById('searchSuggestions');
    suggestionsContainer.style.display = 'none';
    document.getElementById('searchTerm').setAttribute('aria-expanded', 'false');
    currentSuggestionIndex = -1;
}

// Search history and trending
function showSearchHistory() {
    const historyContainer = document.getElementById('searchHistory');
    const recentSection = document.getElementById('recentSearchesSection');
    
    if (searchHistory.length > 0) {
        const recentItems = recentSection.querySelector('.recent-items');
        recentItems.innerHTML = searchHistory.slice(0, 5).map(term => 
            `<button class="recent-item" onclick="searchForTerm('${term}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12,6 12,12 16,14"></polyline>
                </svg>
                ${term}
            </button>`
        ).join('');
        recentSection.style.display = 'block';
    } else {
        recentSection.style.display = 'none';
    }
    
    historyContainer.style.display = 'block';
}

function hideSearchHistory() {
    const historyContainer = document.getElementById('searchHistory');
    historyContainer.style.display = 'none';
}

function addToSearchHistory(term) {
    if (!term || term.trim().length === 0) return;
    
    const cleanTerm = term.trim();
    
    // Remove if already exists
    searchHistory = searchHistory.filter(item => item !== cleanTerm);
    
    // Add to beginning
    searchHistory.unshift(cleanTerm);
    
    // Keep only last 10 searches
    searchHistory = searchHistory.slice(0, 10);
    
    // Save to localStorage
    localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
}

function clearSearchHistory() {
    searchHistory = [];
    localStorage.removeItem('searchHistory');
    hideSearchHistory();
    // Silent clear - history list is visibly empty
}

// Enhanced search execution
function searchForTerm(term) {
    const searchInput = document.getElementById('searchTerm');
    searchInput.value = term;
    performSearch(term);
    hideSearchSuggestions();
    hideSearchHistory();
}

function performSearch(query) {
    if (!query || query.trim().length === 0) return;
    
    const cleanQuery = query.trim();
    addToSearchHistory(cleanQuery);
    
    // Show search progress
    showSearchProgress();
    
    // Update breadcrumb
    updateBreadcrumb(cleanQuery);
    
    // Record search start time
    searchStartTime = Date.now();
    
    // Perform the actual search
    searchProducts();
}

function showSearchProgress() {
    const progressContainer = document.getElementById('searchProgress');
    progressContainer.style.display = 'block';
    
    // Hide after 2 seconds or when results are loaded
    setTimeout(() => {
        progressContainer.style.display = 'none';
    }, 2000);
}

function updateBreadcrumb(query) {
    const breadcrumbNav = document.getElementById('breadcrumbNav');
    const currentCrumb = document.getElementById('currentSearchCrumb');
    
    currentCrumb.innerHTML = `<span>Search: "${query}"</span>`;
    breadcrumbNav.style.display = 'block';
}

function clearSearchAndBreadcrumbs() {
    const searchInput = document.getElementById('searchTerm');
    const breadcrumbNav = document.getElementById('breadcrumbNav');
    const searchResults = document.getElementById('searchResults');
    const searchResultsHeader = document.getElementById('searchResultsHeader');
    const noResultsState = document.getElementById('noResultsState');
    
    if (searchInput) searchInput.value = '';
    if (breadcrumbNav) breadcrumbNav.style.display = 'none';
    
    // Clear results
    if (searchResults) searchResults.innerHTML = '';
    if (searchResultsHeader) searchResultsHeader.style.display = 'none';
    if (noResultsState) noResultsState.style.display = 'none';
    
    // Silent clear - visual update is sufficient
}

// Enhanced search results display
function displaySearchResults(products, query) {
    console.log('🎨 displaySearchResults() called with:', products?.length || 'NO PRODUCTS', 'products, query:', query);
    const resultsHeader = document.getElementById('searchResultsHeader');
    const noResultsState = document.getElementById('noResultsState');
    console.log('🎨 DOM elements found - resultsHeader:', !!resultsHeader, 'noResultsState:', !!noResultsState);
    // FIXED: Removed reference to non-existent searchSidebar element
    
    // Hide skeleton loading
    SkeletonLoader.hideSearchSkeleton();
    
    // Reset search button state
    const searchBtn = document.querySelector('.search-btn');
    if (searchBtn) {
        searchBtn.classList.remove('skeleton-loading');
        searchBtn.disabled = false;
    }
    
    // Hide search loader
    const searchLoader = document.getElementById('searchLoader');
    if (searchLoader) {
        searchLoader.style.display = 'none';
    }
    
    // Update filters
    updateBrandFilter();
    
    if (products && products.length > 0) {
        console.log('🎨 CRITICAL: Products found, showing results header and updating UI');
        // Update results header
        updateResultsHeader(products, query);
        console.log('🎨 CRITICAL: After updateResultsHeader, resultsHeader display should be visible');
        
        // Show results header
        if (resultsHeader) {
            resultsHeader.style.display = 'block';
            console.log('🎨 CRITICAL: Set resultsHeader display to block');
        }
        
        // No sidebar to show anymore - removed during filter consolidation
        
        // Hide no results state
        if (noResultsState) {
            noResultsState.style.display = 'none';
        }
        
        // Show results header
        if (resultsHeader) {
            resultsHeader.style.display = 'block';
        }
        
        console.log('🎨 CRITICAL: displaySearchResults completed successfully - results should now be visible');
        console.log('🎨 CRITICAL: Final check - resultsHeader display:', resultsHeader?.style?.display);
        
        // Populate sidebar filters with all products to show complete filter options
        populateSidebarFilters(allProducts.length > 0 ? allProducts : products);
        
    } else {
        console.log('🎨 No products found, showing no results state');
        // Show no results state  
        if (noResultsState) {
            noResultsState.style.display = 'block';
        }
        if (resultsHeader) {
            resultsHeader.style.display = 'none';
        }
        // FIXED: Removed reference to non-existent searchSidebar
        
        // Check for "did you mean" suggestion
        showDidYouMeanSuggestion(query);
        console.log('🎨 CRITICAL: No products case completed');
    }
}

function updateResultsHeader(products, query) {
    const resultsCount = document.getElementById('resultsCount');
    const searchTiming = document.getElementById('searchTiming');
    const searchQuery = document.getElementById('searchQuery');
    
    resultsCount.textContent = `${products.length} product${products.length !== 1 ? 's' : ''} found`;
    
    if (searchStartTime) {
        const searchTime = ((Date.now() - searchStartTime) / 1000).toFixed(2);
        searchTiming.textContent = `(${searchTime}s)`;
        searchTiming.style.display = 'inline';
    }
    
    if (query) {
        searchQuery.textContent = `for "${query}"`;
        searchQuery.style.display = 'inline';
    }
}

function showDidYouMeanSuggestion(query) {
    // Mock "did you mean" logic - replace with actual spell checking
    const suggestions = generateSpellingSuggestions(query);
    
    if (suggestions.length > 0) {
        const suggestionsLine = document.getElementById('searchSuggestionsLine');
        const suggestionLink = document.getElementById('suggestionLink');
        
        suggestionLink.textContent = suggestions[0];
        suggestionLink.onclick = () => searchForTerm(suggestions[0]);
        
        suggestionsLine.style.display = 'flex';
    }
}

function generateSpellingSuggestions(query) {
    // Mock spelling suggestions - replace with actual spell checker
    const mockSuggestions = {
        'mlik': ['milk'],
        'bred': ['bread'],
        'aples': ['apples'],
        'chiken': ['chicken'],
        'bana': ['banana']
    };
    
    return mockSuggestions[query.toLowerCase()] || [];
}

// Sidebar functionality
function populateSidebarFilters(products) {
    populateCategories(products);
    populateBrands(products);
    updateRecentlyViewed();
}

function populateCategories(products) {
    const categoriesList = document.getElementById('categoriesList');
    const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
    
    categoriesList.innerHTML = categories.map(category => 
        `<label class="refinement-checkbox">
            <input type="checkbox" onchange="filterByCategory('${category}')">
            <span class="checkmark"></span>
            <span class="label-text">${category}</span>
        </label>`
    ).join('');
}

function populateBrands(products) {
    const brandsList = document.getElementById('brandsList');
    const brands = [...new Set(products.map(p => p.brand).filter(Boolean))];
    
    brandsList.innerHTML = brands.map(brand => 
        `<label class="refinement-checkbox">
            <input type="checkbox" onchange="filterByBrand('${brand}')">
            <span class="checkmark"></span>
            <span class="label-text">${brand}</span>
        </label>`
    ).join('');
}

// REMOVED: toggleSidebar function - searchSidebar element was removed during filter consolidation
// function toggleSidebar() {
//     const sidebar = document.getElementById('searchSidebar');
//     sidebar.style.display = sidebar.style.display === 'none' ? 'block' : 'none';
// }

// Product selection and bulk actions
function selectAllProducts() {
    const productCards = document.querySelectorAll('.product-card');
    const selectAllBtn = document.getElementById('selectAllBtn');
    
    if (selectedProducts.size === productCards.length) {
        // Deselect all
        selectedProducts.clear();
        productCards.forEach(card => card.classList.remove('selected'));
        selectAllBtn.textContent = 'Select All';
    } else {
        // Select all
        productCards.forEach((card, index) => {
            selectedProducts.add(index);
            card.classList.add('selected');
        });
        selectAllBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9,11 12,14 22,4"></polyline>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
            </svg>
            Deselect All
        `;
    }
    
    updateBulkActionButtons();
}

function toggleProductSelection(index) {
    const productCard = document.querySelector(`[data-product-index="${index}"]`);
    
    if (selectedProducts.has(index)) {
        selectedProducts.delete(index);
        productCard.classList.remove('selected');
    } else {
        selectedProducts.add(index);
        productCard.classList.add('selected');
    }
    
    updateBulkActionButtons();
}

function updateBulkActionButtons() {
    const selectedCount = document.getElementById('selectedCount');
    const addSelectedBtn = document.getElementById('addSelectedBtn');
    const compareBtn = document.getElementById('compareBtn');
    
    selectedCount.textContent = selectedProducts.size;
    
    if (selectedProducts.size > 0) {
        addSelectedBtn.disabled = false;
        compareBtn.disabled = selectedProducts.size < 2 ? true : false;
    } else {
        addSelectedBtn.disabled = true;
        compareBtn.disabled = true;
    }
}

function addSelectedToCart() {
    if (selectedProducts.size === 0) return;
    
    selectedProducts.forEach((index) => {
        const product = currentProducts[index];
        if (product) {
            addToCart(product);
        }
    });
    
    showToast(`Added ${selectedProducts.size} to cart`, 'success');
    selectedProducts.clear();
    updateBulkActionButtons();
    
    // Remove selection styling
    document.querySelectorAll('.product-card.selected').forEach(card => {
        card.classList.remove('selected');
    });
}

// Product comparison
function compareSelected() {
    if (selectedProducts.size < 2) {
        showToast('Select More', 'Need at least 2 products to compare', 'warning');
        return;
    }
    
    comparisonProducts = Array.from(selectedProducts).map(index => currentProducts[index]);
    showComparisonModal();
}

function showComparisonModal() {
    const modal = document.getElementById('comparisonModal');
    const table = document.getElementById('comparisonTable');
    
    // Build comparison table
    buildComparisonTable(table, comparisonProducts);
    
    modal.style.display = 'block';
    document.body.classList.add('modal-open');
}

function buildComparisonTable(table, products) {
    // Clear existing content
    table.innerHTML = '';
    
    // Create header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    // Feature column
    const featureHeader = document.createElement('th');
    featureHeader.className = 'feature-column';
    featureHeader.textContent = 'Feature';
    headerRow.appendChild(featureHeader);
    
    // Product columns
    products.forEach((product, index) => {
        const productHeader = document.createElement('th');
        productHeader.innerHTML = `
            <div class="product-header">
                <img src="${product.image || '/api/placeholder/60/60'}" alt="${product.name.replace(/"/g, '&quot;')}" style="width: 40px; height: 40px; border-radius: 4px; margin-bottom: 0.5rem;">
                <div style="font-size: 0.8rem; font-weight: 500;">${product.name}</div>
            </div>
        `;
        headerRow.appendChild(productHeader);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create body with comparison rows
    const tbody = document.createElement('tbody');
    
    const features = [
        { key: 'brand', label: 'Brand' },
        { key: 'size', label: 'Size' },
        { key: 'price', label: 'Price' },
        { key: 'salePrice', label: 'Sale Price' },
        { key: 'description', label: 'Description' }
    ];
    
    features.forEach(feature => {
        const row = document.createElement('tr');
        
        // Feature name
        const featureCell = document.createElement('td');
        featureCell.className = 'feature-column';
        featureCell.textContent = feature.label;
        row.appendChild(featureCell);
        
        // Product values
        products.forEach(product => {
            const valueCell = document.createElement('td');
            let value = product[feature.key] || 'N/A';
            
            if (feature.key === 'price' || feature.key === 'salePrice') {
                value = value !== 'N/A' ? `$${value}` : 'N/A';
            }
            
            valueCell.textContent = value;
            row.appendChild(valueCell);
        });
        
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
}

function closeComparison() {
    const modal = document.getElementById('comparisonModal');
    modal.style.display = 'none';
    document.body.classList.remove('modal-open');
}

function addAllComparedToCart() {
    comparisonProducts.forEach(product => addToCart(product));
    showToast(`Added ${comparisonProducts.length} to cart`, 'success');
    closeComparison();
}

function exportComparison() {
    // Create CSV data for comparison
    const headers = ['Feature', ...comparisonProducts.map(p => p.name)];
    const csvData = [headers];
    
    const features = ['Brand', 'Size', 'Price', 'Sale Price', 'Description'];
    const featureKeys = ['brand', 'size', 'price', 'salePrice', 'description'];
    
    features.forEach((feature, index) => {
        const row = [feature, ...comparisonProducts.map(p => p[featureKeys[index]] || 'N/A')];
        csvData.push(row);
    });
    
    // Download CSV
    const csvString = csvData.map(row => 
        row.map(cell => '"' + cell.toString().replace(/"/g, '""') + '"').join(',')
    ).join('\n');
    
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `product-comparison-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('Comparison exported', 'success');
}

function clearComparison() {
    comparisonProducts = [];
    closeComparison();
    // Silent clear - comparison modal closes
}

// Voice search functionality

function startVoiceSearch() {
    const modal = document.getElementById('voiceSearchModal');
    modal.style.display = 'block';
    document.body.classList.add('modal-open');
    
    // Reset state
    document.getElementById('voiceText').textContent = '';
    document.getElementById('voiceStatus').textContent = 'Tap the microphone to start';
    document.querySelector('.voice-search-btn').disabled = true;
}

function toggleVoiceRecording() {
    if (isVoiceRecording) {
        stopVoiceRecording();
    } else {
        startVoiceRecording();
    }
}

function startVoiceRecording() {
    if (!voiceRecognition) {
        showToast('Not Supported', 'Voice search unavailable', 'error');
        return;
    }
    
    isVoiceRecording = true;
    const micBtn = document.getElementById('voiceMicBtn');
    const status = document.getElementById('voiceStatus');
    
    micBtn.classList.add('recording');
    status.textContent = 'Listening... Speak now';
    
    voiceRecognition.start();
}

function stopVoiceRecording() {
    isVoiceRecording = false;
    const micBtn = document.getElementById('voiceMicBtn');
    const status = document.getElementById('voiceStatus');
    
    micBtn.classList.remove('recording');
    status.textContent = 'Tap the microphone to start';
    
    if (voiceRecognition) {
        voiceRecognition.stop();
    }
}

function stopVoiceSearch() {
    const modal = document.getElementById('voiceSearchModal');
    modal.style.display = 'none';
    document.body.classList.remove('modal-open');
    stopVoiceRecording();
}

function executeVoiceSearch() {
    const voiceText = document.getElementById('voiceText').textContent.trim();
    if (voiceText) {
        stopVoiceSearch();
        searchForTerm(voiceText);
        // Silent - search results appear immediately
    }
}

// Barcode scanner functionality
function startBarcodeScanner() {
    const modal = document.getElementById('barcodeScannerModal');
    modal.style.display = 'block';
    document.body.classList.add('modal-open');
    
    // In a real implementation, you would initialize camera here
    document.getElementById('scannerStatus').textContent = 'Position the barcode within the frame';
}

function closeBarcodeScanner() {
    const modal = document.getElementById('barcodeScannerModal');
    modal.style.display = 'none';
    document.body.classList.remove('modal-open');
}

function enterManualBarcode() {
    const manualInput = document.getElementById('manualBarcodeInput');
    manualInput.style.display = manualInput.style.display === 'none' ? 'flex' : 'none';
}

function searchManualBarcode() {
    const barcodeField = document.getElementById('manualBarcodeField');
    const barcode = barcodeField.value.trim();
    
    if (barcode) {
        closeBarcodeScanner();
        searchForTerm(`barcode:${barcode}`);
        // Silent - search results appear immediately
    } else {
        showToast('Barcode Required', 'Enter a barcode to search', 'warning');
    }
}

// Recently viewed products
function addToRecentlyViewed(product) {
    if (!product || !product.upc) return;
    
    // Remove if already exists
    recentlyViewed = recentlyViewed.filter(item => item.upc !== product.upc);
    
    // Add to beginning
    recentlyViewed.unshift({
        upc: product.upc,
        name: product.name,
        price: product.price,
        image: product.image,
        timestamp: Date.now()
    });
    
    // Keep only last 10 items
    recentlyViewed = recentlyViewed.slice(0, 10);
    
    // Save to localStorage
    localStorage.setItem('recentlyViewed', JSON.stringify(recentlyViewed));
    
    // Update sidebar
    updateRecentlyViewed();
}

function updateRecentlyViewed() {
    const recentSection = document.getElementById('recentlyViewedSection');
    const recentList = document.getElementById('recentlyViewedList');
    
    if (recentlyViewed.length > 0) {
        recentList.innerHTML = recentlyViewed.slice(0, 5).map(item => 
            `<div class="recent-product-item" onclick="searchForTerm('${item.name}')">
                <img src="${item.image || '/api/placeholder/40/40'}" alt="${item.name}" class="recent-product-image">
                <div class="recent-product-info">
                    <p class="recent-product-name">${item.name}</p>
                    <p class="recent-product-price">$${item.price}</p>
                </div>
            </div>`
        ).join('');
        recentSection.style.display = 'block';
    } else {
        recentSection.style.display = 'none';
    }
}

function loadRecentlyViewed() {
    updateRecentlyViewed();
}

// Utility functions
function exportResults() {
    if (currentProducts.length === 0) {
        showToast('No results to export', 'warning');
        return;
    }
    
    exportTableData(); // Reuse existing export functionality
}

function shareResults() {
    if (navigator.share && currentProducts.length > 0) {
        navigator.share({
            title: 'Kroger Search Results',
            text: `Found ${currentProducts.length} products`,
            url: window.location.href
        }).then(() => {
            showToast('Link shared', 'success');
        }).catch(err => {
            console.log('Error sharing:', err);
            copyResultsLink();
        });
    } else {
        copyResultsLink();
    }
}

function copyResultsLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
        showToast('Link copied', 'success');
    }).catch(() => {
        showToast('Copy Failed', 'Unable to copy link', 'error');
    });
}

function printResults() {
    if (currentProducts.length === 0) {
        showToast('Nothing to Print', 'Search for products first', 'warning');
        return;
    }
    
    const printContent = generatePrintableResults();
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
}

function generatePrintableResults() {
    const query = document.getElementById('searchTerm').value;
    const resultCount = currentProducts.length;
    
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Kroger Search Results</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1 { color: #0066cc; }
                .product { border-bottom: 1px solid #eee; padding: 10px 0; }
                .product-name { font-weight: bold; }
                .product-price { color: #0066cc; font-size: 1.1em; }
                @media print { body { margin: 0; } }
            </style>
        </head>
        <body>
            <h1>Kroger Search Results</h1>
            <p><strong>Search:</strong> "${query}"</p>
            <p><strong>Results:</strong> ${resultCount} products found</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            <hr>
            ${currentProducts.map(product => `
                <div class="product">
                    <div class="product-name">${product.name}</div>
                    <div><strong>Brand:</strong> ${product.brand || 'N/A'}</div>
                    <div><strong>Size:</strong> ${product.size || 'N/A'}</div>
                    <div class="product-price"><strong>Price:</strong> $${product.price}</div>
                    ${product.salePrice ? `<div style="color: red;"><strong>Sale Price:</strong> $${product.salePrice}</div>` : ''}
                </div>
            `).join('')}
        </body>
        </html>
    `;
}

// Scroll handling
function handleScroll() {
    const backToTopBtn = document.getElementById('backToTopBtn');
    
    if (window.scrollY > 300) {
        backToTopBtn.style.display = 'block';
    } else {
        backToTopBtn.style.display = 'none';
    }
}

function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Filter functions for sidebar
function filterByCategory(category) {
    const checkbox = event.target;
    
    if (checkbox.checked) {
        // Add category to active filters if not already present
        if (!activeCategoryFilters.has(category)) {
            activeCategoryFilters.add(category);
        }
    } else {
        // Remove category from active filters
        activeCategoryFilters.delete(category);
    }
    
    // Apply unified filters which will include category filtering
    applyUnifiedFilters();
    
    // Silent filter change - visual feedback is sufficient
}

function filterByBrand(brand) {
    // Implementation for brand filtering
    console.log('Filtering by brand:', brand);
}

// Utility function for debouncing
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Expose new functions to global scope
window.toggleCompactTable = toggleCompactTable;
window.toggleRowSelection = toggleRowSelection;
window.toggleSelectAllTable = toggleSelectAllTable;
window.expandAllRows = expandAllRows;
window.collapseAllRows = collapseAllRows;
window.exportTableData = exportTableData;
window.goToTablePage = goToTablePage;
window.changeTablePageSize = changeTablePageSize;
window.updateTableQuantity = updateTableQuantity;
window.setTableQuantity = setTableQuantity;

// New search feature functions
window.handleSearchInput = handleSearchInput;
window.handleSearchFocus = handleSearchFocus;
window.handleSearchBlur = handleSearchBlur;
window.searchForTerm = searchForTerm;
window.clearSearchHistory = clearSearchHistory;
window.clearSearchAndBreadcrumbs = clearSearchAndBreadcrumbs;
window.selectAllProducts = selectAllProducts;
window.addSelectedToCart = addSelectedToCart;
window.compareSelected = compareSelected;
window.closeComparison = closeComparison;
window.addAllComparedToCart = addAllComparedToCart;
window.exportComparison = exportComparison;
// Toggle filter bar visibility with smooth animation
function toggleFilterBar() {
    const filterBar = document.getElementById('filterBar');
    const toggleBtn = document.getElementById('filterToggleBtn');
    
    if (filterBar.classList.contains('expanded')) {
        // Hide filter bar
        filterBar.classList.remove('expanded');
        toggleBtn.classList.remove('expanded');
        // Wait for animation to complete before hiding
        setTimeout(() => {
            if (!filterBar.classList.contains('expanded')) {
                filterBar.style.display = 'none';
            }
        }, 300);
    } else {
        // Show filter bar
        filterBar.style.display = 'block';
        // Use setTimeout to ensure display is set before animation
        setTimeout(() => {
            filterBar.classList.add('expanded');
            toggleBtn.classList.add('expanded');
        }, 10);
    }
}

window.clearComparison = clearComparison;
window.toggleFilterBar = toggleFilterBar;
window.toggleSidebar = toggleSidebar;
window.toggleFilterBar = toggleFilterBar;
window.exportResults = exportResults;
window.shareResults = shareResults;
window.printResults = printResults;
window.scrollToTop = scrollToTop;
window.filterByCategory = filterByCategory;
window.filterByBrand = filterByBrand;

// ============================================
// UNIFIED FILTER INTERFACE FUNCTIONS
// ============================================

// Toggle unified filter container visibility with smooth animation
function toggleUnifiedFilters() {
    const filterContainer = document.getElementById('unifiedFilterContainer');
    const toggleBtn = document.getElementById('filterToggleBtn');
    
    if (filterContainer.style.display === 'none' || !filterContainer.style.display) {
        // Show filter container
        filterContainer.style.display = 'block';
        toggleBtn.classList.add('expanded');
        // Use setTimeout to ensure display is set before animation
        setTimeout(() => {
            filterContainer.classList.add('expanded');
        }, 10);
    } else {
        // Hide filter container
        filterContainer.classList.remove('expanded');
        toggleBtn.classList.remove('expanded');
        // Wait for animation to complete before hiding
        setTimeout(() => {
            filterContainer.style.display = 'none';
        }, 400);
    }
}

// Toggle advanced filters section with accordion animation
function toggleAdvancedFilters() {
    const advancedFilters = document.getElementById('advancedFilters');
    const showMoreBtn = document.getElementById('showMoreFiltersBtn');
    const showMoreText = showMoreBtn.querySelector('.show-more-text');
    const isExpanded = showMoreBtn.getAttribute('aria-expanded') === 'true';
    
    if (isExpanded) {
        // Hide advanced filters
        advancedFilters.classList.remove('show');
        showMoreBtn.setAttribute('aria-expanded', 'false');
        showMoreText.textContent = 'Show More Filters';
        // Wait for animation to complete before hiding
        setTimeout(() => {
            if (showMoreBtn.getAttribute('aria-expanded') === 'false') {
                advancedFilters.style.display = 'none';
            }
        }, 400);
    } else {
        // Show advanced filters
        advancedFilters.style.display = 'block';
        showMoreBtn.setAttribute('aria-expanded', 'true');
        showMoreText.textContent = 'Show Less Filters';
        // Use setTimeout to ensure display is set before animation
        setTimeout(() => {
            advancedFilters.classList.add('show');
        }, 10);
    }
}

// Enhanced filter products function for unified interface
function applyUnifiedFilters() {
    if (!allProducts || allProducts.length === 0) {
        return;
    }
    
    let filtered = [...allProducts];
    
    // Get filter values from unified interface
    const minPrice = parseFloat(document.getElementById('minPrice')?.value) || 0;
    const maxPrice = parseFloat(document.getElementById('maxPrice')?.value) || Infinity;
    const brandFilter = document.getElementById('filterBrand')?.value || '';
    const onSaleOnly = document.getElementById('onSaleOnly')?.checked || false;
    const inStockOnly = document.getElementById('inStockOnly')?.checked || false;
    const inStoreOnly = document.getElementById('inStoreOnly')?.checked || false;
    const deliveryAvailable = document.getElementById('deliveryAvailable')?.checked || false;
    
    // Apply price range filter
    if (minPrice > 0 || maxPrice < Infinity) {
        filtered = filtered.filter(product => {
            const price = (product.salePrice && product.salePrice > 0) ? product.salePrice : (product.price || 0);
            return price >= minPrice && price <= maxPrice;
        });
    }
    
    // Apply brand filter
    if (brandFilter) {
        filtered = filtered.filter(product => 
            product.brand && product.brand.toLowerCase().includes(brandFilter.toLowerCase())
        );
    }
    
    // Apply sale filter
    if (onSaleOnly) {
        filtered = filtered.filter(product => 
            product.salePrice && product.salePrice > 0 && product.salePrice < (product.price || 0)
        );
    }
    
    // Apply stock filter
    if (inStockOnly) {
        filtered = filtered.filter(product => 
            product.inventory && product.inventory.stock === 'IN_STOCK'
        );
    }
    
    // Apply availability filters
    if (inStoreOnly || deliveryAvailable) {
        filtered = filtered.filter(product => {
            if (!product.fulfillment) return false;
            
            let matchesFilter = false;
            if (inStoreOnly && product.fulfillment.pickup) matchesFilter = true;
            if (deliveryAvailable && product.fulfillment.delivery) matchesFilter = true;
            
            return matchesFilter;
        });
    }
    
    // Apply category filters
    if (activeCategoryFilters.size > 0) {
        filtered = filtered.filter(product => {
            return product.category && activeCategoryFilters.has(product.category);
        });
    }
    
    // Apply quick filters
    if (activeQuickFilters.size > 0) {
        filtered = filtered.filter(product => {
            let matches = true;
            
            for (const filter of activeQuickFilters) {
                switch (filter) {
                    case 'under-5':
                        const price = (product.salePrice && product.salePrice > 0) ? product.salePrice : (product.price || 0);
                        if (price >= 5) matches = false;
                        break;
                    case 'organic':
                        if (!product.name || !product.name.toLowerCase().includes('organic')) matches = false;
                        break;
                    case 'deals':
                        if (!product.salePrice || product.salePrice <= 0 || product.salePrice >= (product.price || 0)) matches = false;
                        break;
                    case 'popular':
                        // Placeholder for popularity logic - could be based on ratings, reviews, etc.
                        // For now, consider products with sale prices as "popular"
                        if (!product.salePrice || product.salePrice <= 0) matches = false;
                        break;
                }
                if (!matches) break;
            }
            
            return matches;
        });
    }
    
    // Update currentProducts and display
    currentProducts = filtered;
    displayProducts();
    
    // Update active filters display
    updateActiveFilters();
    
    // Update results count
    updateResultsCount();
}

// Update active filters display
function updateActiveFilters() {
    const activeFiltersContainer = document.getElementById('activeFilters');
    const activeFilterTags = activeFiltersContainer?.querySelector('.active-filter-tags');
    
    if (!activeFilterTags) return;
    
    const activeFilters = [];
    
    // Check for active filters
    const minPrice = document.getElementById('minPrice')?.value;
    const maxPrice = document.getElementById('maxPrice')?.value;
    const brandFilter = document.getElementById('filterBrand')?.value;
    const onSaleOnly = document.getElementById('onSaleOnly')?.checked;
    const inStockOnly = document.getElementById('inStockOnly')?.checked;
    const inStoreOnly = document.getElementById('inStoreOnly')?.checked;
    const deliveryAvailable = document.getElementById('deliveryAvailable')?.checked;
    
    if (minPrice || maxPrice) {
        const priceRange = (minPrice || '$0') + ' - ' + (maxPrice || '∞');
        activeFilters.push({ label: 'Price: ' + priceRange, type: 'price' });
    }
    
    if (brandFilter) {
        activeFilters.push({ label: 'Brand: ' + brandFilter, type: 'brand' });
    }
    
    if (onSaleOnly) {
        activeFilters.push({ label: 'On Sale', type: 'sale' });
    }
    
    if (inStockOnly) {
        activeFilters.push({ label: 'In Stock', type: 'stock' });
    }
    
    if (inStoreOnly) {
        activeFilters.push({ label: 'In Store Only', type: 'availability', value: 'inStoreOnly' });
    }
    
    if (deliveryAvailable) {
        activeFilters.push({ label: 'Delivery Available', type: 'availability', value: 'deliveryAvailable' });
    }
    
    // Add category filters
    for (const category of activeCategoryFilters) {
        activeFilters.push({ label: 'Category: ' + category, type: 'category', value: category });
    }
    
    // Add quick filters
    for (const filter of activeQuickFilters) {
        const labels = {
            'under-5': 'Under $5',
            'organic': 'Organic',
            'deals': 'Best Deals',
            'popular': 'Popular'
        };
        activeFilters.push({ label: labels[filter] || filter, type: 'quick', value: filter });
    }
    
    if (activeFilters.length > 0) {
        activeFiltersContainer.style.display = 'block';
        activeFilterTags.innerHTML = activeFilters.map(filter => `
            <span class="active-filter-tag" data-type="${filter.type}" data-value="${filter.value || ''}">
                ${filter.label}
                <button onclick="removeActiveFilter('${filter.type}', '${filter.value || ''}')" class="remove-filter-btn">×</button>
            </span>
        `).join('');
    } else {
        activeFiltersContainer.style.display = 'none';
    }
}

// Remove individual active filter
function removeActiveFilter(type, value) {
    switch (type) {
        case 'price':
            document.getElementById('minPrice').value = '';
            document.getElementById('maxPrice').value = '';
            break;
        case 'brand':
            document.getElementById('filterBrand').value = '';
            break;
        case 'sale':
            document.getElementById('onSaleOnly').checked = false;
            break;
        case 'stock':
            document.getElementById('inStockOnly').checked = false;
            break;
        case 'availability':
            if (value === 'inStoreOnly') {
                document.getElementById('inStoreOnly').checked = false;
            } else if (value === 'deliveryAvailable') {
                document.getElementById('deliveryAvailable').checked = false;
            }
            break;
        case 'category':
            if (activeCategoryFilters.has(value)) {
                activeCategoryFilters.delete(value);
                // Uncheck the corresponding checkbox
                const checkbox = document.querySelector(`input[onchange*="filterByCategory('${value}')"]`);
                if (checkbox) checkbox.checked = false;
            }
            break;
        case 'quick':
            if (activeQuickFilters.has(value)) {
                activeQuickFilters.delete(value);
                const button = document.querySelector('[data-filter="' + value + '"]');
                if (button) button.classList.remove('active');
            }
            break;
    }
    
    // Reapply filters
    applyUnifiedFilters();
}

// Clear all active filters
function clearAllUnifiedFilters() {
    // Clear all filter inputs
    document.getElementById('minPrice').value = '';
    document.getElementById('maxPrice').value = '';
    document.getElementById('filterBrand').value = '';
    document.getElementById('onSaleOnly').checked = false;
    document.getElementById('inStockOnly').checked = false;
    document.getElementById('inStoreOnly').checked = false;
    document.getElementById('deliveryAvailable').checked = false;
    
    // Clear category filters
    activeCategoryFilters.clear();
    document.querySelectorAll('#categoriesList input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Clear quick filters
    activeQuickFilters.clear();
    document.querySelectorAll('.quick-filter-chip').forEach(chip => {
        chip.classList.remove('active');
    });
    
    // Clear sort
    document.getElementById('sortBy').value = '';
    
    // Reset to all products
    currentProducts = [...allProducts];
    displayProducts();
    updateActiveFilters();
    updateResultsCount();
    
    // Silent filter clear - visual change is sufficient
}

// Enhanced quick filter with unified interface support
function applyQuickFilterUnified(filterType) {
    const button = document.querySelector('[data-filter="' + filterType + '"]');
    
    if (activeQuickFilters.has(filterType)) {
        activeQuickFilters.delete(filterType);
        if (button) button.classList.remove('active');
    } else {
        activeQuickFilters.add(filterType);
        if (button) button.classList.add('active');
    }
    
    // Apply the filter logic
    applyUnifiedFilters();
    
    // Silent filter toggle - visual feedback is sufficient
}

// Update results count display
function updateResultsCount() {
    const resultsCount = document.getElementById('resultsCount');
    const tableResultsCount = document.getElementById('tableResultsCount');
    
    if (resultsCount) {
        const count = currentProducts ? currentProducts.length : 0;
        resultsCount.textContent = count + ' product' + (count !== 1 ? 's' : '') + ' found';
    }
    
    if (tableResultsCount) {
        const count = currentProducts ? currentProducts.length : 0;
        tableResultsCount.textContent = count + ' products';
    }
}

// Initialize unified filter interface
function initializeUnifiedFilters() {
    // Add event listeners for real-time filtering
    const filterInputs = [
        'minPrice', 'maxPrice', 'filterBrand', 
        'onSaleOnly', 'inStockOnly', 'inStoreOnly', 'deliveryAvailable'
    ];
    
    filterInputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            const eventType = element.type === 'checkbox' ? 'change' : 'input';
            element.addEventListener(eventType, debounce(() => {
                applyUnifiedFilters();
            }, 300));
        }
    });
    
    // Add event listener for sort dropdown
    const sortBy = document.getElementById('sortBy');
    if (sortBy) {
        sortBy.addEventListener('change', () => {
            sortProducts();
            updateActiveFilters();
        });
    }
}

// Override existing filter functions to use unified interface
function filterProducts() {
    applyUnifiedFilters();
}

// Backwards compatibility - redirect old functions to new unified interface
function toggleFilterBar() {
    toggleUnifiedFilters();
}

function clearAllFilters() {
    clearAllUnifiedFilters();
}

function applyQuickFilter(filterType) {
    applyQuickFilterUnified(filterType);
}

// Expose unified filter functions to global scope
window.toggleUnifiedFilters = toggleUnifiedFilters;
window.toggleAdvancedFilters = toggleAdvancedFilters;
window.applyUnifiedFilters = applyUnifiedFilters;
window.updateActiveFilters = updateActiveFilters;
window.removeActiveFilter = removeActiveFilter;
window.clearAllUnifiedFilters = clearAllUnifiedFilters;
window.applyQuickFilterUnified = applyQuickFilterUnified;
window.updateResultsCount = updateResultsCount;
window.initializeUnifiedFilters = initializeUnifiedFilters;

// Initialize unified filters when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeUnifiedFilters();
});

// Log that the script loaded successfully
console.log('🚀 Kroger Shopping AI with Unified Filter Interface loaded successfully');
console.log('Emergency UI reset: Press Ctrl+Shift+U or call resetUIState() if UI becomes unresponsive');