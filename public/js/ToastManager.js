/**
 * ToastManager.js - Unified notification system
 * Provides consistent toast notifications across the application
 */

class ToastManager {
  constructor() {
    this.container = null;
    this.queue = [];
    this.activeToasts = new Map();
    this.maxToasts = 1; // reduce on-screen noise
    this.defaultDuration = 2000; // shorter duration
    this.setupContainer();
    this.addStyles();
  }

  /**
   * Setup the toast container
   */
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

  /**
   * Add toast styles if not already present
   */
  addStyles() {
    if (document.getElementById('toastManagerStyles')) return;
    
    const style = document.createElement('style');
    style.id = 'toastManagerStyles';
    style.textContent = `
      .toast-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        pointer-events: none;
        max-width: 400px;
      }
      
      .toast {
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        margin-bottom: 12px;
        min-width: 300px;
        overflow: hidden;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        pointer-events: auto;
      }
      
      .toast.show {
        opacity: 1;
        transform: translateX(0);
      }
      
      .toast.hide {
        opacity: 0;
        transform: translateX(100%);
      }
      
      .toast-content {
        display: flex;
        align-items: flex-start;
        padding: 12px;
      }
      
      .toast-icon {
        flex-shrink: 0;
        width: 24px;
        height: 24px;
        margin-right: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        border-radius: 50%;
      }
      
      .toast-text {
        flex: 1;
        min-width: 0;
      }
      
      .toast-header {
        font-weight: 600;
        margin-bottom: 4px;
        color: #333;
      }
      
      .toast-body {
        font-size: 14px;
        color: #666;
        line-height: 1.4;
      }
      
      .toast-close {
        flex-shrink: 0;
        width: 24px;
        height: 24px;
        margin-left: 12px;
        background: none;
        border: none;
        cursor: pointer;
        opacity: 0.5;
        transition: opacity 0.2s;
        font-size: 20px;
        line-height: 1;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .toast-close:hover {
        opacity: 1;
      }
      
      .toast-progress {
        height: 3px;
        background: rgba(0,0,0,0.1);
        position: relative;
        overflow: hidden;
      }
      
      .toast-progress-bar {
        height: 100%;
        background: currentColor;
        animation: progress linear;
        transform-origin: left;
      }
      
      @keyframes progress {
        from { transform: scaleX(1); }
        to { transform: scaleX(0); }
      }
      
      /* Toast types */
      .toast-success {
        border-left: 4px solid #28a745;
      }
      
      .toast-success .toast-icon {
        color: #28a745;
        background: rgba(40, 167, 69, 0.1);
      }
      
      .toast-success .toast-progress-bar {
        color: #28a745;
      }
      
      .toast-error {
        border-left: 4px solid #dc3545;
      }
      
      .toast-error .toast-icon {
        color: #dc3545;
        background: rgba(220, 53, 69, 0.1);
      }
      
      .toast-error .toast-progress-bar {
        color: #dc3545;
      }
      
      .toast-warning {
        border-left: 4px solid #ffc107;
      }
      
      .toast-warning .toast-icon {
        color: #ffc107;
        background: rgba(255, 193, 7, 0.1);
      }
      
      .toast-warning .toast-progress-bar {
        color: #ffc107;
      }
      
      .toast-info {
        border-left: 4px solid #17a2b8;
      }
      
      .toast-info .toast-icon {
        color: #17a2b8;
        background: rgba(23, 162, 184, 0.1);
      }
      
      .toast-info .toast-progress-bar {
        color: #17a2b8;
      }
      
      .toast-loading {
        border-left: 4px solid #6c757d;
      }
      
      .toast-loading .toast-icon {
        color: #6c757d;
        background: rgba(108, 117, 125, 0.1);
        animation: spin 1s linear infinite;
      }
      
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      
      /* Responsive */
      @media (max-width: 768px) {
        .toast-container {
          left: 10px;
          right: 10px;
          top: 10px;
          max-width: none;
        }
        
        .toast {
          min-width: auto;
        }
      }
      
      /* Accessibility */
      @media (prefers-reduced-motion: reduce) {
        .toast {
          transition: opacity 0.3s;
          transform: none !important;
        }
        
        .toast-loading .toast-icon {
          animation: none;
        }
      }
      
      /* Dark mode support */
      @media (prefers-color-scheme: dark) {
        .toast {
          background: #2d2d2d;
          color: #fff;
        }
        
        .toast-header {
          color: #fff;
        }
        
        .toast-body {
          color: #ccc;
        }
        
        .toast-close {
          color: #fff;
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Show a toast notification
   * @param {string} title Toast title
   * @param {string} message Toast message
   * @param {string} type Toast type (success, error, warning, info, loading)
   * @param {number} duration Duration in milliseconds (0 for persistent)
   * @param {Object} options Additional options
   * @returns {string} Toast ID
   */
  show(title, message, type = 'info', duration = null, options = {}) {
    const toast = {
      id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      message,
      type,
      duration: duration !== null ? duration : this.defaultDuration,
      options
    };
    
    // Check for duplicates
    if (!options.allowDuplicates && this.isDuplicate(title, message)) {
      console.log('[ToastManager] Duplicate toast prevented:', title);
      return null;
    }
    
    // Check if we've reached max toasts
    if (this.activeToasts.size >= this.maxToasts) {
      // Remove oldest toast
      const oldestId = this.activeToasts.keys().next().value;
      this.removeToast(oldestId);
    }
    
    // Global kill switch: disable all toasts
    if (window.DISABLE_TOASTS === true) {
      return null;
    }
    
    // Add to queue or display immediately
    if (options.queue) {
      this.queue.push(toast);
      this.processQueue();
    } else {
      this.displayToast(toast);
    }
    
    return toast.id;
  }

  /**
   * Check if a toast with the same title and message is already active
   */
  isDuplicate(title, message) {
    for (const [id, toast] of this.activeToasts) {
      if (toast.title === title && toast.message === message) {
        return true;
      }
    }
    return false;
  }

  /**
   * Process the toast queue
   */
  processQueue() {
    if (this.queue.length === 0) return;
    if (this.activeToasts.size >= this.maxToasts) return;
    
    const toast = this.queue.shift();
    this.displayToast(toast);
    
    // Process next toast after a short delay
    if (this.queue.length > 0) {
      setTimeout(() => this.processQueue(), 100);
    }
  }

  /**
   * Display a toast
   */
  displayToast(toast) {
    const element = document.createElement('div');
    element.id = toast.id;
    element.className = `toast toast-${toast.type}`;
    element.setAttribute('role', 'alert');
    
    // Get icon for toast type
    const icon = this.getIcon(toast.type);
    
    // Build toast HTML
    const showProgress = toast.duration > 0 && toast.options.progress !== false;
    
    element.innerHTML = `
      <div class="toast-content">
        <div class="toast-icon" aria-hidden="true">${icon}</div>
        <div class="toast-text">
          <div class="toast-header">${this.escapeHtml(toast.title)}</div>
          ${toast.message ? `<div class="toast-body">${this.escapeHtml(toast.message)}</div>` : ''}
        </div>
        <button class="toast-close" aria-label="Close notification" type="button">&times;</button>
      </div>
      ${showProgress ? `
        <div class="toast-progress">
          <div class="toast-progress-bar" style="animation-duration: ${toast.duration}ms"></div>
        </div>
      ` : ''}
    `;
    
    // Add event listeners
    const closeBtn = element.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => this.removeToast(toast.id));
    
    // Add click handler if provided
    if (toast.options.onClick) {
      element.style.cursor = 'pointer';
      element.addEventListener('click', (e) => {
        if (e.target !== closeBtn) {
          toast.options.onClick();
        }
      });
    }
    
    // Add to container
    this.container.appendChild(element);
    this.activeToasts.set(toast.id, toast);
    
    // Trigger show animation
    requestAnimationFrame(() => {
      element.classList.add('show');
    });
    
    // Auto-remove if duration is set
    if (toast.duration > 0) {
      toast.timeoutId = setTimeout(() => {
        this.removeToast(toast.id);
      }, toast.duration);
    }
    
    // Call onShow callback if provided
    if (toast.options.onShow) {
      toast.options.onShow(toast.id);
    }
    
    return toast.id;
  }

  /**
   * Remove a toast
   * @param {string} toastId Toast ID to remove
   */
  removeToast(toastId) {
    const element = document.getElementById(toastId);
    const toast = this.activeToasts.get(toastId);
    
    if (!element) return;
    
    // Clear timeout if exists
    if (toast && toast.timeoutId) {
      clearTimeout(toast.timeoutId);
    }
    
    // Hide animation
    element.classList.remove('show');
    element.classList.add('hide');
    
    // Remove after animation
    setTimeout(() => {
      element.remove();
      this.activeToasts.delete(toastId);
      
      // Call onClose callback if provided
      if (toast && toast.options.onClose) {
        toast.options.onClose(toastId);
      }
      
      // Process queue if there are pending toasts
      this.processQueue();
    }, 300);
  }

  /**
   * Get icon for toast type
   */
  getIcon(type) {
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ',
      loading: '⟳'
    };
    return icons[type] || icons.info;
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Convenience methods
   */
  showSuccess(title, message, duration) {
    return this.show(title, message, 'success', duration);
  }

  showError(title, message, duration) {
    return this.show(title, message, 'error', duration || 5000);
  }

  showWarning(title, message, duration) {
    return this.show(title, message, 'warning', duration || 4000);
  }

  showInfo(title, message, duration) {
    return this.show(title, message, 'info', duration);
  }

  showLoading(title, message) {
    return this.show(title, message, 'loading', 0, { progress: false });
  }

  /**
   * Update an existing toast
   * @param {string} toastId Toast ID to update
   * @param {Object} updates Updates to apply
   */
  update(toastId, updates) {
    const element = document.getElementById(toastId);
    const toast = this.activeToasts.get(toastId);
    
    if (!element || !toast) return;
    
    if (updates.title !== undefined) {
      const header = element.querySelector('.toast-header');
      if (header) header.textContent = updates.title;
      toast.title = updates.title;
    }
    
    if (updates.message !== undefined) {
      const body = element.querySelector('.toast-body');
      if (body) {
        body.textContent = updates.message;
      } else if (updates.message) {
        // Add body if it doesn't exist
        const textDiv = element.querySelector('.toast-text');
        const newBody = document.createElement('div');
        newBody.className = 'toast-body';
        newBody.textContent = updates.message;
        textDiv.appendChild(newBody);
      }
      toast.message = updates.message;
    }
    
    if (updates.type !== undefined) {
      element.className = `toast toast-${updates.type} show`;
      const icon = element.querySelector('.toast-icon');
      if (icon) icon.textContent = this.getIcon(updates.type);
      toast.type = updates.type;
    }
  }

  /**
   * Clear all toasts
   */
  clear() {
    this.queue = [];
    this.activeToasts.forEach((toast, id) => {
      this.removeToast(id);
    });
  }

  /**
   * Clear toasts of a specific type
   * @param {string} type Toast type to clear
   */
  clearType(type) {
    this.activeToasts.forEach((toast, id) => {
      if (toast.type === type) {
        this.removeToast(id);
      }
    });
    
    // Remove from queue
    this.queue = this.queue.filter(toast => toast.type !== type);
  }

  /**
   * Get active toast count
   */
  getActiveCount() {
    return this.activeToasts.size;
  }

  /**
   * Check if a toast is active
   * @param {string} toastId Toast ID to check
   */
  isActive(toastId) {
    return this.activeToasts.has(toastId);
  }
}

// Create singleton instance
if (!window.toastManager) {
  window.toastManager = new ToastManager();
  console.log('[ToastManager] Singleton instance created');
  
  // Also expose as showToast for backward compatibility
  window.showToast = function(title, message, type) {
    return window.toastManager.show(title, message, type);
  };
}