// Store Selection Enhancement
// Provides better visual feedback and UX for store selection

(function() {
    console.log('🏪 Store Selection Enhancement Loading...');
    
    // Add store selection indicator to header
    function addStoreIndicator() {
        const header = document.querySelector('header .header-content');
        if (!header) return;
        
        // Check if indicator already exists
        if (document.getElementById('headerStoreIndicator')) return;
        
        const indicator = document.createElement('div');
        indicator.id = 'headerStoreIndicator';
        indicator.className = 'header-store-indicator';
        indicator.innerHTML = `
            <div class="store-indicator-content">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                </svg>
                <span class="store-name" id="headerStoreName">Loading stores...</span>
                <button class="change-store-btn" onclick="showTab('settings')" title="Change Store">
                    Change
                </button>
            </div>
        `;
        
        header.appendChild(indicator);
    }
    
    // Update store indicator
    function updateStoreIndicator() {
        const storeNameElem = document.getElementById('headerStoreName');
        const indicator = document.getElementById('headerStoreIndicator');
        
        if (storeNameElem) {
            if (window.selectedStoreId && window.selectedStoreName) {
                storeNameElem.textContent = window.selectedStoreName;
                if (indicator) {
                    indicator.classList.add('has-store');
                    indicator.classList.remove('no-store');
                }
            } else {
                storeNameElem.textContent = 'No store selected';
                if (indicator) {
                    indicator.classList.add('no-store');
                    indicator.classList.remove('has-store');
                }
            }
        }
    }
    
    // Add welcome modal for first-time users
    function showWelcomeModal() {
        // Check if user has seen welcome
        if (localStorage.getItem('hasSeenWelcome')) return;
        
        const modal = document.createElement('div');
        modal.className = 'welcome-modal';
        modal.innerHTML = `
            <div class="welcome-modal-content">
                <h2>Welcome to Kroger Shopping AI!</h2>
                <p>Let's get you started by selecting your preferred store.</p>
                <div class="welcome-steps">
                    <div class="welcome-step">
                        <div class="step-number">1</div>
                        <div class="step-content">
                            <h4>Enter your ZIP code</h4>
                            <p>We'll find Kroger stores near you</p>
                        </div>
                    </div>
                    <div class="welcome-step">
                        <div class="step-number">2</div>
                        <div class="step-content">
                            <h4>Select your store</h4>
                            <p>Choose your preferred location</p>
                        </div>
                    </div>
                    <div class="welcome-step">
                        <div class="step-number">3</div>
                        <div class="step-content">
                            <h4>Start shopping!</h4>
                            <p>Search for products and build your cart</p>
                        </div>
                    </div>
                </div>
                <button class="welcome-continue-btn" onclick="closeWelcomeModal()">
                    Get Started
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close function
        window.closeWelcomeModal = function() {
            modal.classList.add('closing');
            setTimeout(() => {
                modal.remove();
                localStorage.setItem('hasSeenWelcome', 'true');
                // Navigate to settings if no store selected
                if (!window.selectedStoreId) {
                    showTab('settings');
                }
            }, 300);
        };
    }
    
    // Enhanced store selection feedback
    function enhanceStoreSelection() {
        const originalSelectStore = window.selectStore;
        
        window.selectStore = function() {
            // Call original function
            if (originalSelectStore) {
                originalSelectStore.call(this);
            }
            
            // Update indicator
            updateStoreIndicator();
            
            // Show success feedback
            if (window.selectedStoreId) {
                // Reduce toast noise on selection
                // showToast('Store Selected', `Shopping at ${window.selectedStoreName}`, 'success');
                
                // If on settings tab and store is selected, switch to search
                const activeTab = document.querySelector('.tab-content.active');
                if (activeTab && activeTab.id === 'settings-tab') {
                    setTimeout(() => {
                        // Do not auto-switch to search tab
                        document.getElementById('searchTerm')?.focus();
                    }, 1000);
                }
            }
        };
    }
    
    // Add store selection prompt in search area
    function addSearchAreaPrompt() {
        const searchForm = document.getElementById('search-form');
        if (!searchForm) return;
        
        const prompt = document.createElement('div');
        prompt.id = 'storeSelectionPrompt';
        prompt.className = 'store-selection-prompt';
        prompt.innerHTML = `
            <div class="prompt-content">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                </svg>
                <div class="prompt-text">
                    <h4>Select a store to start shopping</h4>
                    <p>Choose your preferred Kroger location to see available products and prices</p>
                </div>
                <button class="select-store-btn" onclick="showTab('settings')">
                    Select Store
                </button>
            </div>
        `;
        
        searchForm.parentElement.insertBefore(prompt, searchForm);
    }
    
    // Update prompt visibility based on store selection
    function updateSearchPrompt() {
        const prompt = document.getElementById('storeSelectionPrompt');
        const searchForm = document.getElementById('search-form');
        
        if (prompt) {
            if (window.selectedStoreId) {
                prompt.style.display = 'none';
                if (searchForm) searchForm.style.display = 'block';
            } else {
                prompt.style.display = 'block';
                if (searchForm) searchForm.style.display = 'none';
            }
        }
    }
    
    // Add CSS for enhancements
    function addEnhancementStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Header Store Indicator */
            .header-store-indicator {
                position: absolute;
                top: 10px;
                right: 20px;
                background: rgba(255, 255, 255, 0.9);
                border-radius: 20px;
                padding: 8px 16px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                transition: all 0.3s ease;
            }
            
            .store-indicator-content {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 14px;
            }
            
            .store-indicator-content svg {
                color: #0066cc;
            }
            
            .store-name {
                font-weight: 500;
                color: #333;
            }
            
            .change-store-btn {
                background: #0066cc;
                color: white;
                border: none;
                padding: 4px 12px;
                border-radius: 12px;
                font-size: 12px;
                cursor: pointer;
                transition: background 0.2s;
            }
            
            .change-store-btn:hover {
                background: #0052a3;
            }
            
            .header-store-indicator.no-store {
                background: #fff3cd;
                border: 1px solid #ffc107;
            }
            
            .header-store-indicator.no-store .store-name {
                color: #856404;
            }
            
            /* Welcome Modal */
            .welcome-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                animation: fadeIn 0.3s ease;
            }
            
            .welcome-modal.closing {
                animation: fadeOut 0.3s ease;
            }
            
            .welcome-modal-content {
                background: white;
                border-radius: 16px;
                padding: 40px;
                max-width: 500px;
                width: 90%;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                animation: scaleIn 0.3s ease;
            }
            
            .welcome-modal h2 {
                color: #0066cc;
                margin-bottom: 16px;
                text-align: center;
            }
            
            .welcome-modal p {
                text-align: center;
                color: #666;
                margin-bottom: 32px;
            }
            
            .welcome-steps {
                display: flex;
                flex-direction: column;
                gap: 20px;
                margin-bottom: 32px;
            }
            
            .welcome-step {
                display: flex;
                align-items: center;
                gap: 16px;
            }
            
            .step-number {
                width: 40px;
                height: 40px;
                background: #0066cc;
                color: white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                flex-shrink: 0;
            }
            
            .step-content h4 {
                margin-bottom: 4px;
                color: #333;
            }
            
            .step-content p {
                margin: 0;
                font-size: 14px;
                color: #666;
                text-align: left;
            }
            
            .welcome-continue-btn {
                width: 100%;
                background: #0066cc;
                color: white;
                border: none;
                padding: 16px;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: background 0.2s;
            }
            
            .welcome-continue-btn:hover {
                background: #0052a3;
            }
            
            /* Store Selection Prompt */
            .store-selection-prompt {
                background: #f0f7ff;
                border: 2px dashed #0066cc;
                border-radius: 12px;
                padding: 32px;
                margin: 20px 0;
                text-align: center;
                animation: fadeIn 0.5s ease;
            }
            
            .prompt-content {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 16px;
            }
            
            .prompt-content svg {
                color: #0066cc;
                width: 48px;
                height: 48px;
            }
            
            .prompt-text h4 {
                color: #333;
                margin-bottom: 8px;
            }
            
            .prompt-text p {
                color: #666;
                font-size: 14px;
                max-width: 400px;
            }
            
            .select-store-btn {
                background: #0066cc;
                color: white;
                border: none;
                padding: 12px 32px;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .select-store-btn:hover {
                background: #0052a3;
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(0,102,204,0.3);
            }
            
            @keyframes fadeOut {
                to {
                    opacity: 0;
                }
            }
            
            /* Mobile responsiveness */
            @media (max-width: 768px) {
                .header-store-indicator {
                    position: static;
                    margin-top: 10px;
                    width: 100%;
                    border-radius: 8px;
                }
                
                .welcome-modal-content {
                    padding: 24px;
                }
                
                .welcome-steps {
                    gap: 16px;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Initialize enhancements
    function initialize() {
        console.log('🚀 Initializing store selection enhancements...');
        
        // Add styles
        addEnhancementStyles();
        
        // Add UI elements
        addStoreIndicator();
        addSearchAreaPrompt();
        
        // Enhance store selection
        enhanceStoreSelection();
        
        // Update UI based on current state
        updateStoreIndicator();
        updateSearchPrompt();
        
        // Show welcome modal for new users
        if (!window.selectedStoreId && !localStorage.getItem('hasSeenWelcome')) {
            setTimeout(showWelcomeModal, 500);
        }
        
        // Listen for store changes
        const observer = new MutationObserver(() => {
            updateStoreIndicator();
            updateSearchPrompt();
        });
        
        const footerStore = document.getElementById('currentStore');
        if (footerStore) {
            observer.observe(footerStore, { childList: true, characterData: true, subtree: true });
        }
        
        console.log('✅ Store selection enhancements initialized');
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        setTimeout(initialize, 100);
    }
    
})();