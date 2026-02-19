/**
 * Sallety Theme - Main JavaScript
 * @fileoverview Core functionality for the Sallety Shopify theme
 * @author Sallety Theme Team
 * @version 2.0.0
 * @license MIT
 */

(function () {
  'use strict';

  // ============================================================================
  // CONSTANTS
  // ============================================================================

  /**
   * Theme configuration constants
   * @constant {Object}
   */
  const CONFIG = {
    /** Scroll threshold for back-to-top button visibility */
    SCROLL_THRESHOLD: 300,
    /** Default throttle delay in milliseconds */
    THROTTLE_DELAY: 100,
    /** Default debounce delay in milliseconds */
    DEBOUNCE_DELAY: 250,
    /** Animation class prefix */
    ANIMATION_CLASS: 'is-',
    /** Default minimum quantity for products */
    MIN_QUANTITY: 1,
    /** Default maximum quantity for products */
    MAX_QUANTITY: 99999
  };

  /**
   * CSS selectors used throughout the theme
   * @constant {Object}
   */
  const SELECTORS = {
    // Drawers
    DRAWER: '.drawer',
    DRAWER_OPEN: '.drawer.is-open',
    DRAWER_TOGGLE: '[data-drawer-toggle]',
    DRAWER_CLOSE: '[data-drawer-close]',
    DRAWER_OVERLAY: '[data-drawer-overlay]',
    CART_DRAWER_OVERLAY: '.cart-drawer-overlay',

    // Modals
    MODAL: '.modal',
    MODAL_OPEN: '.modal.is-open',
    MODAL_TRIGGER: '[data-modal-open]',
    MODAL_CLOSE: '[data-modal-close]',
    MODAL_OVERLAY: '.modal__overlay',

    // Cart
    CART_COUNT: '[data-cart-count]',
    CART_DRAWER: '#cart-drawer',

    // Components
    ACCORDION: '[data-accordion]',
    ACCORDION_HEADER: '[data-accordion-header]',
    ACCORDION_ITEM: '[data-accordion-item]',
    TABS: '[data-tabs]',
    TAB: '[data-tab]',
    TAB_PANEL: '[data-tab-panel]',
    BACK_TO_TOP: '[data-back-to-top]',

    // Product
    QUANTITY_SELECTOR: '[data-quantity-selector]',
    QUANTITY_INPUT: '[data-quantity-input]',
    QUANTITY_MINUS: '[data-quantity-minus]',
    QUANTITY_PLUS: '[data-quantity-plus]',
    PRODUCT_FORM: '[data-product-form]',
    VARIANT_SELECTOR: '[data-variant-selector]',
    PRODUCT_JSON: '[data-product-json]',
    PRODUCT_PRICE: '[data-product-price]',
    PRODUCT_COMPARE_PRICE: '[data-product-compare-price]',
    VARIANT_INPUT: '[name="id"]',
    OPTION_GROUP: '[data-option]'
  };

  /**
   * CSS classes used for state management
   * @constant {Object}
   */
  const CLASSES = {
    OPEN: 'is-open',
    ACTIVE: 'is-active',
    VISIBLE: 'is-visible',
    HIDDEN: 'is-hidden',
    LOADING: 'is-loading',
    DISABLED: 'is-disabled'
  };

  /**
   * Custom event names
   * @constant {Object}
   */
  const EVENTS = {
    CART_UPDATED: 'cart:updated',
    VARIANT_CHANGED: 'variant:changed',
    DRAWER_OPENED: 'drawer:opened',
    DRAWER_CLOSED: 'drawer:closed',
    MODAL_OPENED: 'modal:opened',
    MODAL_CLOSED: 'modal:closed'
  };

  // ============================================================================
  // THEME NAMESPACE
  // ============================================================================

  /** @namespace Sallety */
  window.Sallety = window.Sallety || {};

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Utility functions for the theme
   * @namespace Sallety.utils
   */
  Sallety.utils = {
    /**
     * Debounce function - delays execution until after wait milliseconds
     * @param {Function} func - The function to debounce
     * @param {number} [wait=250] - The debounce delay in milliseconds
     * @param {boolean} [immediate=false] - Execute on leading edge instead of trailing
     * @returns {Function} The debounced function
     * @example
     * const debouncedSearch = Sallety.utils.debounce(search, 300);
     */
    debounce: function (func, wait = CONFIG.DEBOUNCE_DELAY, immediate = false) {
      if (typeof func !== 'function') {
        console.error('[Sallety] debounce: Expected a function');
        return function () { };
      }

      let timeout;
      return function (...args) {
        const context = this;
        const later = function () {
          timeout = null;
          if (!immediate) func.apply(context, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
      };
    },

    /**
     * Throttle function - limits execution to once per wait milliseconds
     * @param {Function} func - The function to throttle
     * @param {number} [limit=100] - The throttle limit in milliseconds
     * @returns {Function} The throttled function
     * @example
     * const throttledScroll = Sallety.utils.throttle(onScroll, 100);
     */
    throttle: function (func, limit = CONFIG.THROTTLE_DELAY) {
      if (typeof func !== 'function') {
        console.error('[Sallety] throttle: Expected a function');
        return function () { };
      }

      let inThrottle;
      return function (...args) {
        const context = this;
        if (!inThrottle) {
          func.apply(context, args);
          inThrottle = true;
          setTimeout(() => inThrottle = false, limit);
        }
      };
    },

    /**
     * Format money value according to Shopify currency settings
     * @param {number|string} cents - The amount in cents
     * @param {string} [format] - The format string (defaults to Shopify currency format)
     * @returns {string} The formatted money string
     * @example
     * Sallety.utils.formatMoney(1999); // "$19.99"
     */
    formatMoney: function (cents, format) {
      if (cents == null || cents === '') {
        console.warn('[Sallety] formatMoney: Invalid cents value');
        return '';
      }

      if (typeof cents === 'string') {
        cents = cents.replace('.', '');
      }

      cents = parseInt(cents, 10);

      if (isNaN(cents)) {
        console.warn('[Sallety] formatMoney: Could not parse cents value');
        return '';
      }

      const placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
      const formatString = format || window.Shopify?.currency?.format || '${{amount}}';

      const match = formatString.match(placeholderRegex);
      if (!match) {
        console.warn('[Sallety] formatMoney: Invalid format string');
        return String(cents / 100);
      }

      /**
       * Format number with delimiters
       * @param {number} number - The number to format
       * @param {number} [precision=2] - Decimal precision
       * @param {string} [thousands=','] - Thousands separator
       * @param {string} [decimal='.'] - Decimal separator
       * @returns {string} Formatted number string
       */
      function formatWithDelimiters(number, precision = 2, thousands = ',', decimal = '.') {
        if (isNaN(number) || number == null) return '0';

        const fixedNumber = (number / 100.0).toFixed(precision);
        const parts = fixedNumber.split('.');
        const dollarsAmount = parts[0].replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1' + thousands);
        const centsAmount = parts[1] ? decimal + parts[1] : '';

        return dollarsAmount + centsAmount;
      }

      let value = '';
      switch (match[1]) {
        case 'amount':
          value = formatWithDelimiters(cents, 2);
          break;
        case 'amount_no_decimals':
          value = formatWithDelimiters(cents, 0);
          break;
        case 'amount_with_comma_separator':
          value = formatWithDelimiters(cents, 2, '.', ',');
          break;
        case 'amount_no_decimals_with_comma_separator':
          value = formatWithDelimiters(cents, 0, '.', ',');
          break;
        default:
          value = formatWithDelimiters(cents, 2);
      }

      return formatString.replace(placeholderRegex, value);
    },

    /**
     * Fetch JSON wrapper with error handling
     * @async
     * @param {string} url - The URL to fetch
     * @param {Object} [options={}] - Fetch options
     * @returns {Promise<Object>} The parsed JSON response
     * @throws {Error} If the request fails
     * @example
     * const cart = await Sallety.utils.fetchJSON('/cart.js');
     */
    fetchJSON: async function (url, options = {}) {
      if (!url || typeof url !== 'string') {
        throw new Error('[Sallety] fetchJSON: Invalid URL provided');
      }

      const defaults = {
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      };

      try {
        const response = await fetch(url, { ...defaults, ...options });

        if (!response.ok) {
          const errorText = await response.text().catch(() => response.statusText);
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        return response.json();
      } catch (error) {
        console.error('[Sallety] fetchJSON error:', error);
        throw error;
      }
    },

    /**
     * Serialize form data to object
     * @param {HTMLFormElement} form - The form element
     * @returns {Object} Form data as key-value pairs
     * @example
     * const data = Sallety.utils.serializeForm(document.querySelector('form'));
     */
    serializeForm: function (form) {
      if (!(form instanceof HTMLFormElement)) {
        console.error('[Sallety] serializeForm: Expected a form element');
        return {};
      }

      const formData = new FormData(form);
      return Object.fromEntries(formData.entries());
    },

    /**
     * Get URL parameters as object
     * @returns {Object} URL parameters as key-value pairs
     * @example
     * const params = Sallety.utils.getUrlParams(); // { variant: '12345' }
     */
    getUrlParams: function () {
      return Object.fromEntries(new URLSearchParams(window.location.search));
    },

    /**
     * Update URL parameter without page reload
     * @param {string} key - The parameter key
     * @param {string|null} value - The parameter value (null to remove)
     * @example
     * Sallety.utils.updateUrlParam('variant', '12345');
     */
    updateUrlParam: function (key, value) {
      if (!key || typeof key !== 'string') {
        console.error('[Sallety] updateUrlParam: Invalid key provided');
        return;
      }

      const url = new URL(window.location.href);
      if (value != null && value !== '') {
        url.searchParams.set(key, value);
      } else {
        url.searchParams.delete(key);
      }
      window.history.replaceState({}, '', url);
    },

    /**
     * Trap focus within an element (for modals/drawers)
     * @param {HTMLElement} element - The element to trap focus within
     * @returns {Function} Cleanup function to remove the trap
     */
    trapFocus: function (element) {
      if (!(element instanceof HTMLElement)) {
        console.error('[Sallety] trapFocus: Expected an HTML element');
        return function () { };
      }

      const focusableSelectors = [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
      ].join(', ');

      const focusableElements = element.querySelectorAll(focusableSelectors);
      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];

      function handleKeydown(e) {
        if (e.key !== 'Tab') return;

        if (e.shiftKey) {
          if (document.activeElement === firstFocusable) {
            e.preventDefault();
            lastFocusable?.focus();
          }
        } else {
          if (document.activeElement === lastFocusable) {
            e.preventDefault();
            firstFocusable?.focus();
          }
        }
      }

      element.addEventListener('keydown', handleKeydown);
      firstFocusable?.focus();

      return function cleanup() {
        element.removeEventListener('keydown', handleKeydown);
      };
    },

    /**
     * Check if user prefers reduced motion
     * @returns {boolean} True if user prefers reduced motion
     */
    prefersReducedMotion: function () {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    },

    /**
     * Dispatch a custom event
     * @param {string} eventName - The event name
     * @param {Object} [detail={}] - Event detail data
     * @param {HTMLElement} [target=document] - The target element
     */
    dispatchEvent: function (eventName, detail = {}, target = document) {
      if (!eventName || typeof eventName !== 'string') {
        console.error('[Sallety] dispatchEvent: Invalid event name');
        return;
      }

      target.dispatchEvent(new CustomEvent(eventName, {
        detail,
        bubbles: true,
        cancelable: true
      }));
    }
  };

  // ============================================================================
  // CART FUNCTIONALITY
  // ============================================================================

  /**
   * Cart API wrapper
   * @namespace Sallety.cart
   */
  Sallety.cart = {
    /**
     * Get the current cart
     * @async
     * @returns {Promise<Object>} The cart object
     */
    get: async function () {
      try {
        return await Sallety.utils.fetchJSON(window.routes?.cart_url + '.js' || '/cart.js');
      } catch (error) {
        console.error('[Sallety] cart.get error:', error);
        throw error;
      }
    },

    /**
     * Add items to cart
     * @async
     * @param {Array<Object>} items - Array of items to add
     * @param {number} items[].id - Variant ID
     * @param {number} items[].quantity - Quantity to add
     * @returns {Promise<Object>} The updated cart
     */
    add: async function (items) {
      if (!Array.isArray(items) || items.length === 0) {
        throw new Error('[Sallety] cart.add: Expected non-empty items array');
      }

      try {
        return await Sallety.utils.fetchJSON(window.routes?.cart_add_url + '.js' || '/cart/add.js', {
          method: 'POST',
          body: JSON.stringify({ items })
        });
      } catch (error) {
        console.error('[Sallety] cart.add error:', error);
        throw error;
      }
    },

    /**
     * Update cart items
     * @async
     * @param {Object} updates - Object with line item keys and quantities
     * @returns {Promise<Object>} The updated cart
     */
    update: async function (updates) {
      if (!updates || typeof updates !== 'object') {
        throw new Error('[Sallety] cart.update: Expected updates object');
      }

      try {
        return await Sallety.utils.fetchJSON(window.routes?.cart_update_url + '.js' || '/cart/update.js', {
          method: 'POST',
          body: JSON.stringify({ updates })
        });
      } catch (error) {
        console.error('[Sallety] cart.update error:', error);
        throw error;
      }
    },

    /**
     * Change a cart item's quantity
     * @async
     * @param {number} line - The line item index (1-based)
     * @param {number} quantity - The new quantity
     * @returns {Promise<Object>} The updated cart
     */
    change: async function (line, quantity) {
      if (typeof line !== 'number' || line < 1) {
        throw new Error('[Sallety] cart.change: Invalid line number');
      }

      if (typeof quantity !== 'number' || quantity < 0) {
        throw new Error('[Sallety] cart.change: Invalid quantity');
      }

      try {
        return await Sallety.utils.fetchJSON(window.routes?.cart_change_url + '.js' || '/cart/change.js', {
          method: 'POST',
          body: JSON.stringify({ line, quantity })
        });
      } catch (error) {
        console.error('[Sallety] cart.change error:', error);
        throw error;
      }
    },

    /**
     * Clear all items from cart
     * @async
     * @returns {Promise<Object>} The empty cart
     */
    clear: async function () {
      try {
        return await Sallety.utils.fetchJSON('/cart/clear.js', {
          method: 'POST'
        });
      } catch (error) {
        console.error('[Sallety] cart.clear error:', error);
        throw error;
      }
    },

    /**
     * Update cart count display elements
     * @param {number} count - The new cart count
     */
    updateCount: function (count) {
      if (typeof count !== 'number' || count < 0) {
        console.warn('[Sallety] cart.updateCount: Invalid count value');
        return;
      }

      document.querySelectorAll(SELECTORS.CART_COUNT).forEach(el => {
        el.textContent = count;
        el.classList.toggle(CLASSES.HIDDEN, count === 0);
      });
    },

    /**
     * Show loading spinner on the header cart icon
     */
    setIconLoading: function () {
      var cartBtn = document.querySelector('.header__action-btn--cart');
      if (cartBtn) {
        cartBtn.classList.add('is-cart-loading');
      }
    },

    /**
     * Remove loading spinner from the header cart icon
     */
    clearIconLoading: function () {
      var cartBtn = document.querySelector('.header__action-btn--cart');
      if (cartBtn) {
        cartBtn.classList.remove('is-cart-loading');
      }
    }
  };

  // ============================================================================
  // DRAWER FUNCTIONALITY
  // ============================================================================

  /**
   * Drawer component manager
   * @namespace Sallety.drawer
   */
  Sallety.drawer = {
    /** @type {Function|null} Current focus trap cleanup function */
    _focusTrapCleanup: null,

    /** @type {HTMLElement|null} Element that was focused before drawer opened */
    _previousActiveElement: null,

    /**
     * Find the overlay associated with a specific drawer element.
     * Checks siblings first, then falls back to generic selectors.
     * @param {HTMLElement} drawer - The drawer element
     * @returns {HTMLElement|null} The overlay element
     */
    _findOverlay: function (drawer) {
      if (!drawer) return null;
      const next = drawer.nextElementSibling;
      if (next && next.classList.contains('drawer__overlay')) return next;
      const prev = drawer.previousElementSibling;
      if (prev && prev.classList.contains('drawer__overlay')) return prev;
      return document.querySelector(SELECTORS.CART_DRAWER_OVERLAY) ||
        document.querySelector(SELECTORS.DRAWER_OVERLAY);
    },

    /**
     * Open a drawer by ID
     * @param {string} drawerId - The drawer element ID
     */
    open: function (drawerId) {
      if (!drawerId || typeof drawerId !== 'string') {
        console.error('[Sallety] drawer.open: Invalid drawer ID');
        return;
      }

      const drawer = document.getElementById(drawerId);

      if (!drawer) {
        console.warn(`[Sallety] drawer.open: Drawer "${drawerId}" not found`);
        return;
      }

      const overlay = this._findOverlay(drawer);

      // Store previously focused element
      this._previousActiveElement = document.activeElement;

      drawer.classList.add(CLASSES.OPEN);
      drawer.setAttribute('aria-hidden', 'false');

      if (overlay) {
        overlay.classList.add(CLASSES.OPEN);
      }

      document.body.style.overflow = 'hidden';

      // Setup focus trap
      this._focusTrapCleanup = Sallety.utils.trapFocus(drawer);

      // Dispatch event
      Sallety.utils.dispatchEvent(EVENTS.DRAWER_OPENED, { drawerId, drawer });
    },

    /**
     * Close a drawer by ID
     * @param {string} drawerId - The drawer element ID
     */
    close: function (drawerId) {
      if (!drawerId || typeof drawerId !== 'string') {
        console.error('[Sallety] drawer.close: Invalid drawer ID');
        return;
      }

      const drawer = document.getElementById(drawerId);

      if (!drawer) {
        console.warn(`[Sallety] drawer.close: Drawer "${drawerId}" not found`);
        return;
      }

      const overlay = this._findOverlay(drawer);

      drawer.classList.remove(CLASSES.OPEN);
      drawer.setAttribute('aria-hidden', 'true');

      if (overlay) {
        overlay.classList.remove(CLASSES.OPEN);
      }

      document.body.style.overflow = '';

      // Cleanup focus trap
      if (this._focusTrapCleanup) {
        this._focusTrapCleanup();
        this._focusTrapCleanup = null;
      }

      // Restore focus
      if (this._previousActiveElement) {
        this._previousActiveElement.focus();
        this._previousActiveElement = null;
      }

      // Dispatch event
      Sallety.utils.dispatchEvent(EVENTS.DRAWER_CLOSED, { drawerId, drawer });
    },

    /**
     * Close all open drawers
     */
    closeAll: function () {
      document.querySelectorAll(SELECTORS.DRAWER_OPEN).forEach(drawer => {
        const overlay = this._findOverlay(drawer);
        drawer.classList.remove(CLASSES.OPEN);
        drawer.setAttribute('aria-hidden', 'true');
        if (overlay) overlay.classList.remove(CLASSES.OPEN);
      });

      document.body.style.overflow = '';

      // Cleanup focus trap
      if (this._focusTrapCleanup) {
        this._focusTrapCleanup();
        this._focusTrapCleanup = null;
      }
    },

    /**
     * Toggle a drawer open/closed
     * @param {string} drawerId - The drawer element ID
     */
    toggle: function (drawerId) {
      const drawer = document.getElementById(drawerId);
      if (drawer?.classList.contains(CLASSES.OPEN)) {
        this.close(drawerId);
      } else {
        this.open(drawerId);
      }
    }
  };

  // ============================================================================
  // MODAL FUNCTIONALITY
  // ============================================================================

  /**
   * Modal component manager
   * @namespace Sallety.modal
   */
  Sallety.modal = {
    /** @type {Function|null} Current focus trap cleanup function */
    _focusTrapCleanup: null,

    /** @type {HTMLElement|null} Element that was focused before modal opened */
    _previousActiveElement: null,

    /**
     * Open a modal by ID
     * @param {string} modalId - The modal element ID
     */
    open: function (modalId) {
      if (!modalId || typeof modalId !== 'string') {
        console.error('[Sallety] modal.open: Invalid modal ID');
        return;
      }

      const modal = document.getElementById(modalId);

      if (!modal) {
        console.warn(`[Sallety] modal.open: Modal "${modalId}" not found`);
        return;
      }

      // Store previously focused element
      this._previousActiveElement = document.activeElement;

      modal.classList.add(CLASSES.OPEN);
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';

      // Setup focus trap
      this._focusTrapCleanup = Sallety.utils.trapFocus(modal);

      // Dispatch event
      Sallety.utils.dispatchEvent(EVENTS.MODAL_OPENED, { modalId, modal });
    },

    /**
     * Close a modal by ID
     * @param {string} modalId - The modal element ID
     */
    close: function (modalId) {
      if (!modalId || typeof modalId !== 'string') {
        console.error('[Sallety] modal.close: Invalid modal ID');
        return;
      }

      const modal = document.getElementById(modalId);

      if (!modal) {
        console.warn(`[Sallety] modal.close: Modal "${modalId}" not found`);
        return;
      }

      modal.classList.remove(CLASSES.OPEN);
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';

      // Cleanup focus trap
      if (this._focusTrapCleanup) {
        this._focusTrapCleanup();
        this._focusTrapCleanup = null;
      }

      // Restore focus
      if (this._previousActiveElement) {
        this._previousActiveElement.focus();
        this._previousActiveElement = null;
      }

      // Dispatch event
      Sallety.utils.dispatchEvent(EVENTS.MODAL_CLOSED, { modalId, modal });
    }
  };

  // ============================================================================
  // ACCORDION FUNCTIONALITY
  // ============================================================================

  /**
   * Accordion component manager
   * @namespace Sallety.accordion
   */
  Sallety.accordion = {
    /**
     * Initialize all accordions on the page
     */
    init: function () {
      document.querySelectorAll(SELECTORS.ACCORDION).forEach(accordion => {
        this._setupAccordion(accordion);
      });
    },

    /**
     * Setup a single accordion
     * @private
     * @param {HTMLElement} accordion - The accordion container element
     */
    _setupAccordion: function (accordion) {
      const headers = accordion.querySelectorAll(SELECTORS.ACCORDION_HEADER);
      const isSingleMode = accordion.dataset.accordionSingle !== undefined;

      headers.forEach(header => {
        // Skip if already initialized
        if (header.dataset.accordionInitialized) return;
        header.dataset.accordionInitialized = 'true';

        // Ensure proper ARIA attributes
        const item = header.closest(SELECTORS.ACCORDION_ITEM);
        const content = item?.querySelector('[data-accordion-content]');

        if (content) {
          const contentId = content.id || `accordion-content-${Math.random().toString(36).substr(2, 9)}`;
          content.id = contentId;
          header.setAttribute('aria-controls', contentId);
          header.setAttribute('aria-expanded', item.classList.contains(CLASSES.OPEN) ? 'true' : 'false');
        }

        header.addEventListener('click', () => {
          this._toggleItem(accordion, item, isSingleMode);
        });

        // Keyboard support
        header.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this._toggleItem(accordion, item, isSingleMode);
          }
        });
      });
    },

    /**
     * Toggle an accordion item
     * @private
     * @param {HTMLElement} accordion - The accordion container
     * @param {HTMLElement} item - The item to toggle
     * @param {boolean} isSingleMode - Whether to close other items
     */
    _toggleItem: function (accordion, item, isSingleMode) {
      if (!item) return;

      const isOpen = item.classList.contains(CLASSES.OPEN);
      const header = item.querySelector(SELECTORS.ACCORDION_HEADER);

      // Close all items if single mode
      if (isSingleMode) {
        accordion.querySelectorAll(SELECTORS.ACCORDION_ITEM).forEach(i => {
          i.classList.remove(CLASSES.OPEN);
          const h = i.querySelector(SELECTORS.ACCORDION_HEADER);
          h?.setAttribute('aria-expanded', 'false');
        });
      }

      // Toggle current item
      if (!isOpen) {
        item.classList.add(CLASSES.OPEN);
        header?.setAttribute('aria-expanded', 'true');
      } else if (!isSingleMode) {
        item.classList.remove(CLASSES.OPEN);
        header?.setAttribute('aria-expanded', 'false');
      }
    }
  };

  // ============================================================================
  // TABS FUNCTIONALITY
  // ============================================================================

  /**
   * Tabs component manager
   * @namespace Sallety.tabs
   */
  Sallety.tabs = {
    /**
     * Initialize all tab components on the page
     */
    init: function () {
      document.querySelectorAll(SELECTORS.TABS).forEach(tabs => {
        this._setupTabs(tabs);
      });
    },

    /**
     * Setup a single tabs component
     * @private
     * @param {HTMLElement} tabsContainer - The tabs container element
     */
    _setupTabs: function (tabsContainer) {
      const tabItems = tabsContainer.querySelectorAll(SELECTORS.TAB);
      const panels = tabsContainer.querySelectorAll(SELECTORS.TAB_PANEL);

      tabItems.forEach((tab, index) => {
        // Skip if already initialized
        if (tab.dataset.tabInitialized) return;
        tab.dataset.tabInitialized = 'true';

        // Setup ARIA attributes
        const targetId = tab.dataset.tab;
        const panel = tabsContainer.querySelector(`[data-tab-panel="${targetId}"]`);

        if (panel) {
          const panelId = panel.id || `tab-panel-${targetId}`;
          panel.id = panelId;
          tab.setAttribute('aria-controls', panelId);
          tab.setAttribute('role', 'tab');
          panel.setAttribute('role', 'tabpanel');
        }

        tab.setAttribute('aria-selected', tab.classList.contains(CLASSES.ACTIVE) ? 'true' : 'false');

        tab.addEventListener('click', () => {
          this._activateTab(tabsContainer, tabItems, panels, tab, targetId);
        });

        // Keyboard navigation
        tab.addEventListener('keydown', (e) => {
          this._handleKeydown(e, tabItems, index);
        });
      });
    },

    /**
     * Activate a tab
     * @private
     */
    _activateTab: function (container, tabItems, panels, tab, targetId) {
      // Update tabs
      tabItems.forEach(t => {
        t.classList.remove(CLASSES.ACTIVE);
        t.setAttribute('aria-selected', 'false');
        t.setAttribute('tabindex', '-1');
      });

      tab.classList.add(CLASSES.ACTIVE);
      tab.setAttribute('aria-selected', 'true');
      tab.setAttribute('tabindex', '0');

      // Update panels
      panels.forEach(panel => {
        const isTarget = panel.dataset.tabPanel === targetId;
        panel.classList.toggle(CLASSES.ACTIVE, isTarget);
        panel.setAttribute('aria-hidden', isTarget ? 'false' : 'true');
      });
    },

    /**
     * Handle keyboard navigation in tabs
     * @private
     */
    _handleKeydown: function (e, tabItems, currentIndex) {
      const tabsArray = Array.from(tabItems);
      let newIndex = currentIndex;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          newIndex = currentIndex > 0 ? currentIndex - 1 : tabsArray.length - 1;
          break;
        case 'ArrowRight':
          e.preventDefault();
          newIndex = currentIndex < tabsArray.length - 1 ? currentIndex + 1 : 0;
          break;
        case 'Home':
          e.preventDefault();
          newIndex = 0;
          break;
        case 'End':
          e.preventDefault();
          newIndex = tabsArray.length - 1;
          break;
        default:
          return;
      }

      tabsArray[newIndex].focus();
      tabsArray[newIndex].click();
    }
  };

  // ============================================================================
  // BACK TO TOP FUNCTIONALITY
  // ============================================================================

  /**
   * Back to top button manager
   * @namespace Sallety.backToTop
   */
  Sallety.backToTop = {
    /** @type {HTMLElement|null} The button element */
    _button: null,

    /**
     * Initialize the back to top button
     */
    init: function () {
      this._button = document.querySelector(SELECTORS.BACK_TO_TOP);
      if (!this._button) return;

      // Setup visibility toggle
      const toggleVisibility = () => {
        this._button.classList.toggle(CLASSES.VISIBLE, window.scrollY > CONFIG.SCROLL_THRESHOLD);
      };

      window.addEventListener('scroll', Sallety.utils.throttle(toggleVisibility, CONFIG.THROTTLE_DELAY), { passive: true });

      // Setup click handler
      this._button.addEventListener('click', () => {
        this.scrollToTop();
      });

      // Initial check
      toggleVisibility();
    },

    /**
     * Scroll to the top of the page
     * @param {boolean} [smooth=true] - Whether to use smooth scrolling
     */
    scrollToTop: function (smooth = true) {
      const behavior = smooth && !Sallety.utils.prefersReducedMotion() ? 'smooth' : 'auto';
      window.scrollTo({ top: 0, behavior });
    }
  };

  // ============================================================================
  // QUANTITY SELECTOR FUNCTIONALITY
  // ============================================================================

  /**
   * Quantity selector component manager
   * @namespace Sallety.quantitySelector
   */
  Sallety.quantitySelector = {
    /**
     * Initialize all quantity selectors on the page
     */
    init: function () {
      // Use event delegation for better performance
      document.addEventListener('click', (e) => {
        const minusBtn = e.target.closest(SELECTORS.QUANTITY_MINUS);
        const plusBtn = e.target.closest(SELECTORS.QUANTITY_PLUS);

        if (minusBtn) {
          this._handleDecrease(minusBtn);
        } else if (plusBtn) {
          this._handleIncrease(plusBtn);
        }
      });

      // Handle direct input changes
      document.addEventListener('change', (e) => {
        const input = e.target.closest(SELECTORS.QUANTITY_INPUT);
        if (input) {
          this._validateInput(input);
        }
      });
    },

    /**
     * Handle decrease button click
     * @private
     * @param {HTMLElement} btn - The minus button
     */
    _handleDecrease: function (btn) {
      const selector = btn.closest(SELECTORS.QUANTITY_SELECTOR);
      const input = selector?.querySelector(SELECTORS.QUANTITY_INPUT);
      if (!input) return;

      const min = parseInt(input.min) || CONFIG.MIN_QUANTITY;
      const currentValue = parseInt(input.value) || min;
      const newValue = Math.max(min, currentValue - 1);

      if (newValue !== currentValue) {
        input.value = newValue;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    },

    /**
     * Handle increase button click
     * @private
     * @param {HTMLElement} btn - The plus button
     */
    _handleIncrease: function (btn) {
      const selector = btn.closest(SELECTORS.QUANTITY_SELECTOR);
      const input = selector?.querySelector(SELECTORS.QUANTITY_INPUT);
      if (!input) return;

      const max = parseInt(input.max) || CONFIG.MAX_QUANTITY;
      const currentValue = parseInt(input.value) || CONFIG.MIN_QUANTITY;
      const newValue = Math.min(max, currentValue + 1);

      if (newValue !== currentValue) {
        input.value = newValue;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    },

    /**
     * Validate and clamp input value
     * @private
     * @param {HTMLInputElement} input - The quantity input
     */
    _validateInput: function (input) {
      const min = parseInt(input.min) || CONFIG.MIN_QUANTITY;
      const max = parseInt(input.max) || CONFIG.MAX_QUANTITY;
      let value = parseInt(input.value) || min;

      value = Math.max(min, Math.min(max, value));
      input.value = value;

      // Sync with form's hidden quantity input
      this._syncFormQuantity(input);
    },

    /**
     * Sync quantity selector value with the product form's hidden quantity input
     * @private
     * @param {HTMLInputElement} input - The quantity input from the selector
     */
    _syncFormQuantity: function (input) {
      // Find the closest product section or form container
      const productSection = input.closest('.product-page__info') ||
        input.closest('.main-product') ||
        input.closest('[data-section-type="product"]') ||
        input.closest('.quick-view-product');

      if (!productSection) return;

      // Find the form's hidden quantity input
      const formQuantityInput = productSection.querySelector('[data-form-quantity]');
      if (formQuantityInput) {
        formQuantityInput.value = input.value;
      }
    }
  };

  // ============================================================================
  // PRODUCT FORM FUNCTIONALITY
  // ============================================================================

  /**
   * Product form handler
   * @namespace Sallety.productForm
   */
  Sallety.productForm = {
    /**
     * Initialize all product forms on the page
     */
    init: function () {
      document.querySelectorAll(SELECTORS.PRODUCT_FORM).forEach(form => {
        this._setupForm(form);
      });
    },

    /**
     * Setup a single product form
     * @private
     * @param {HTMLFormElement} form - The form element
     */
    _setupForm: function (form) {
      // Skip if already initialized
      if (form.dataset.productFormInitialized) return;
      form.dataset.productFormInitialized = 'true';

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this._handleSubmit(form);
      });
    },

    /**
     * Handle form submission
     * @private
     * @async
     * @param {HTMLFormElement} form - The form element
     */
    _handleSubmit: async function (form) {
      const submitButton = form.querySelector('[type="submit"]');
      const formData = new FormData(form);

      // Validate variant ID
      const variantId = formData.get('id');
      if (!variantId) {
        console.error('[Sallety] productForm: No variant ID found');
        return;
      }

      try {
        // Set loading state
        if (submitButton) {
          submitButton.disabled = true;
          submitButton.classList.add(CLASSES.LOADING);
          submitButton.setAttribute('aria-busy', 'true');
        }

        // Show loading on cart icon
        Sallety.cart.setIconLoading();

        const response = await fetch(window.routes?.cart_add_url + '.js' || '/cart/add.js', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.description || 'Add to cart failed');
        }

        // Update cart count
        const cart = await Sallety.cart.get();
        Sallety.cart.updateCount(cart.item_count);

        // Open cart drawer if enabled
        const cartDrawer = document.querySelector(SELECTORS.CART_DRAWER);
        if (cartDrawer) {
          Sallety.drawer.open('cart-drawer');
        }

        // Dispatch custom event
        Sallety.utils.dispatchEvent(EVENTS.CART_UPDATED, cart);

      } catch (error) {
        console.error('[Sallety] Add to cart error:', error);

        // Show error to user (you could also dispatch an event here)
        const errorMessage = error.message || 'Unable to add to cart. Please try again.';
        alert(errorMessage); // Replace with your preferred notification system

      } finally {
        // Reset loading state
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.classList.remove(CLASSES.LOADING);
          submitButton.setAttribute('aria-busy', 'false');
        }
        // Clear cart icon loading
        Sallety.cart.clearIconLoading();
      }
    }
  };

  // ============================================================================
  // VARIANT SELECTOR FUNCTIONALITY
  // ============================================================================

  /**
   * Variant selector handler
   * @namespace Sallety.variantSelector
   */
  Sallety.variantSelector = {
    /**
     * Initialize all variant selectors on the page
     */
    init: function () {
      document.querySelectorAll(SELECTORS.VARIANT_SELECTOR).forEach(selector => {
        this._setupSelector(selector);
      });
    },

    /**
     * Setup a single variant selector
     * @private
     * @param {HTMLElement} selector - The selector container element
     */
    _setupSelector: function (selector) {
      // Skip if already initialized
      if (selector.dataset.variantSelectorInitialized) return;
      selector.dataset.variantSelectorInitialized = 'true';

      const inputs = selector.querySelectorAll('input[type="radio"], select, [data-option-select]');
      const productJson = selector.closest('[data-product-json]') ||
        document.querySelector(SELECTORS.PRODUCT_JSON);

      if (!productJson) {
        console.warn('[Sallety] variantSelector: No product JSON found');
        return;
      }

      let product;
      try {
        product = JSON.parse(productJson.textContent);
      } catch (error) {
        console.error('[Sallety] variantSelector: Invalid product JSON', error);
        return;
      }

      inputs.forEach(input => {
        input.addEventListener('change', () => {
          const selectedOptions = this._getSelectedOptions(selector);
          const variant = this._findVariant(product.variants, selectedOptions);

          if (variant) {
            this._updateVariant(selector, variant, product);
          }
        });
      });
    },

    /**
     * Get selected options from the selector
     * @private
     * @param {HTMLElement} selector - The selector container
     * @returns {Array<string>} Array of selected option values
     */
    _getSelectedOptions: function (selector) {
      const options = [];
      selector.querySelectorAll(SELECTORS.OPTION_GROUP).forEach(optionGroup => {
        const checkedInput = optionGroup.querySelector('input:checked');
        const selectEl = optionGroup.querySelector('select, [data-option-select]');
        if (checkedInput) {
          options.push(checkedInput.value);
        } else if (selectEl) {
          options.push(selectEl.value);
        }
      });
      return options;
    },

    /**
     * Find a variant by selected options
     * @private
     * @param {Array<Object>} variants - Array of variant objects
     * @param {Array<string>} selectedOptions - Array of selected option values
     * @returns {Object|undefined} The matching variant or undefined
     */
    _findVariant: function (variants, selectedOptions) {
      return variants.find(variant => {
        return variant.options.every((option, index) => option === selectedOptions[index]);
      });
    },

    /**
     * Update the UI with the selected variant
     * @private
     * @param {HTMLElement} selector - The selector container
     * @param {Object} variant - The selected variant
     * @param {Object} product - The product object
     */
    _updateVariant: function (selector, variant, product) {
      // Update hidden input (look in form or nearby section)
      const section = selector.closest('.product-page__info') || selector.closest('.main-product');
      const form = section?.querySelector('[data-product-form]');
      const variantInput = form?.querySelector(SELECTORS.VARIANT_INPUT);
      if (variantInput) {
        variantInput.value = variant.id;
      }

      // Update URL
      Sallety.utils.updateUrlParam('variant', variant.id);

      // Update price display
      document.querySelectorAll(SELECTORS.PRODUCT_PRICE).forEach(el => {
        el.innerHTML = Sallety.utils.formatMoney(variant.price);
      });

      // Update compare price display
      document.querySelectorAll(SELECTORS.PRODUCT_COMPARE_PRICE).forEach(el => {
        if (variant.compare_at_price && variant.compare_at_price > variant.price) {
          el.innerHTML = Sallety.utils.formatMoney(variant.compare_at_price);
          el.style.display = '';
          el.setAttribute('aria-hidden', 'false');
        } else {
          el.style.display = 'none';
          el.setAttribute('aria-hidden', 'true');
        }
      });

      // Update button state
      const addButton = form?.querySelector('[type="submit"]');
      const addButtonText = form?.querySelector('[data-add-to-cart-text]');
      if (addButton) {
        addButton.disabled = !variant.available;
        if (addButtonText) {
          addButtonText.textContent = variant.available
            ? (window.variantStrings?.addToCart || 'أضف إلى السلة')
            : (window.variantStrings?.soldOut || 'نفذت الكمية');
        } else {
          addButton.textContent = variant.available
            ? (window.variantStrings?.addToCart || 'أضف إلى السلة')
            : (window.variantStrings?.soldOut || 'نفذت الكمية');
        }
        addButton.setAttribute('aria-disabled', !variant.available ? 'true' : 'false');
      }

      // Update variant picker active states (buttons/swatches)
      selector.querySelectorAll('[data-option]').forEach((optionGroup, index) => {
        const optionValue = variant.options[index];
        if (!optionValue) return;

        // Update active class on labels
        optionGroup.querySelectorAll('.variant-picker__button, .variant-picker__color').forEach(label => {
          const input = label.querySelector('input');
          if (input && input.value === optionValue) {
            label.classList.add(CLASSES.ACTIVE);
          } else {
            label.classList.remove(CLASSES.ACTIVE);
          }
        });

        // Update selected value display
        const selectedValueEl = optionGroup.querySelector('[data-selected-value]');
        if (selectedValueEl) {
          selectedValueEl.textContent = optionValue;
        }
      });

      // Update installment amounts
      document.querySelectorAll('[data-installment-amount]').forEach(el => {
        const installmentsEl = el.closest('[data-installments]');
        if (installmentsEl) {
          const count = parseInt(installmentsEl.dataset.installmentsCount || '4', 10);
          el.innerHTML = Sallety.utils.formatMoney(Math.round(variant.price / count));
        }
      });

      // Update SKU display
      document.querySelectorAll('[data-product-sku]').forEach(el => {
        el.textContent = variant.sku || '';
        const skuBlock = el.closest('.product-page__block');
        if (skuBlock) {
          skuBlock.style.display = variant.sku ? '' : 'none';
        }
      });

      // Dispatch custom event (gallery listens for this to switch images)
      Sallety.utils.dispatchEvent(EVENTS.VARIANT_CHANGED, { variant, product });
    }
  };

  // ============================================================================
  // PRODUCT GALLERY FUNCTIONALITY
  // ============================================================================

  /**
   * Product gallery handler - thumbnails, navigation, zoom, variant image switching
   * @namespace Sallety.productGallery
   */
  Sallety.productGallery = {
    /** @type {number} Current active slide index */
    _currentIndex: 0,
    /** @type {HTMLElement|null} Gallery container */
    _gallery: null,
    /** @type {NodeList|null} All slides */
    _slides: null,
    /** @type {NodeList|null} All thumbnails */
    _thumbs: null,
    /** @type {NodeList|null} All dots */
    _dots: null,
    /** @type {HTMLElement|null} Lightbox element */
    _lightbox: null,

    /**
     * Initialize all product galleries on the page
     */
    init: function () {
      document.querySelectorAll('[data-product-gallery]').forEach(gallery => {
        this._setupGallery(gallery);
      });

      // Listen for variant changes to switch images
      document.addEventListener(EVENTS.VARIANT_CHANGED, (e) => {
        if (e.detail && e.detail.variant && e.detail.variant.featured_media) {
          this._switchToMedia(e.detail.variant.featured_media.id);
        }
      });
    },

    /**
     * Setup a single product gallery
     * @private
     * @param {HTMLElement} gallery - The gallery container element
     */
    _setupGallery: function (gallery) {
      if (gallery.dataset.galleryInitialized) return;
      gallery.dataset.galleryInitialized = 'true';

      const slides = gallery.querySelectorAll('[data-gallery-slide]');
      const thumbs = gallery.querySelectorAll('[data-thumb-trigger]');
      const dots = gallery.querySelectorAll('[data-dot-index]');
      const mainArea = gallery.querySelector('[data-gallery-main]');

      if (slides.length === 0) return;

      this._gallery = gallery;
      this._slides = slides;
      this._thumbs = thumbs;
      this._dots = dots;

      // Find initial active index
      slides.forEach((slide, i) => {
        if (slide.classList.contains(CLASSES.ACTIVE)) {
          this._currentIndex = i;
        }
      });

      // Thumbnail click handlers
      thumbs.forEach(thumb => {
        thumb.addEventListener('click', () => {
          const index = parseInt(thumb.dataset.index, 10);
          this._goToSlide(index);
        });
      });

      // Dot click handlers
      dots.forEach(dot => {
        dot.addEventListener('click', () => {
          const index = parseInt(dot.dataset.dotIndex, 10);
          this._goToSlide(index);
        });
      });

      // Main nav arrow handlers
      const prevBtn = gallery.querySelector('[data-gallery-prev]');
      const nextBtn = gallery.querySelector('[data-gallery-next]');

      if (prevBtn) {
        prevBtn.addEventListener('click', () => {
          this._goToSlide(this._currentIndex - 1);
        });
      }

      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          this._goToSlide(this._currentIndex + 1);
        });
      }

      // Thumbnail scroll handlers
      const thumbPrev = gallery.querySelector('[data-thumb-prev]');
      const thumbNext = gallery.querySelector('[data-thumb-next]');
      const thumbTrack = gallery.querySelector('[data-thumb-list]');

      if (thumbPrev && thumbTrack) {
        thumbPrev.addEventListener('click', () => {
          this._scrollThumbs(thumbTrack, -1);
          this._updateThumbScrollState(gallery);
        });
      }

      if (thumbNext && thumbTrack) {
        thumbNext.addEventListener('click', () => {
          this._scrollThumbs(thumbTrack, 1);
          this._updateThumbScrollState(gallery);
        });
      }

      // Auto-update scroll button state as thumbs scroll
      if (thumbTrack) {
        thumbTrack.addEventListener('scroll', () => {
          this._updateThumbScrollState(gallery);
        }, { passive: true });
        // Initial check
        setTimeout(() => this._updateThumbScrollState(gallery), 100);
      }

      // Setup zoom functionality
      if (gallery.dataset.zoomEnabled === 'true') {
        this._setupZoom(gallery);
      }

      // Setup lightbox
      this._setupLightbox(gallery);

      // Touch/swipe support for mobile
      this._setupSwipe(mainArea);

      // Keyboard navigation
      gallery.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          const dir = document.documentElement.dir === 'rtl' ? 1 : -1;
          this._goToSlide(this._currentIndex + dir);
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          const dir = document.documentElement.dir === 'rtl' ? -1 : 1;
          this._goToSlide(this._currentIndex + dir);
        }
      });
    },

    /**
     * Go to a specific slide
     * @private
     * @param {number} index - The target slide index
     */
    _goToSlide: function (index) {
      if (!this._slides || this._slides.length === 0) return;

      // Wrap around
      if (index < 0) index = this._slides.length - 1;
      if (index >= this._slides.length) index = 0;

      // Update slides
      this._slides.forEach(slide => slide.classList.remove(CLASSES.ACTIVE));
      this._slides[index].classList.add(CLASSES.ACTIVE);

      // Update thumbnails
      if (this._thumbs) {
        this._thumbs.forEach(thumb => thumb.classList.remove(CLASSES.ACTIVE));
        if (this._thumbs[index]) {
          this._thumbs[index].classList.add(CLASSES.ACTIVE);
          // Scroll thumbnail into view
          this._thumbs[index].scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
        }
      }

      // Update dots
      if (this._dots) {
        this._dots.forEach(dot => dot.classList.remove(CLASSES.ACTIVE));
        if (this._dots[index]) {
          this._dots[index].classList.add(CLASSES.ACTIVE);
        }
      }

      this._currentIndex = index;

      // Update counter
      const counter = this._gallery?.querySelector('[data-gallery-current]');
      if (counter) {
        counter.textContent = index + 1;
      }

      // Update thumbnail scroll state
      if (this._gallery) {
        this._updateThumbScrollState(this._gallery);
      }
    },

    /**
     * Switch to a specific media by ID (used for variant changes)
     * @private
     * @param {number} mediaId - The media ID to switch to
     */
    _switchToMedia: function (mediaId) {
      if (!this._slides) return;

      this._slides.forEach((slide, index) => {
        if (parseInt(slide.dataset.mediaId, 10) === mediaId) {
          this._goToSlide(index);
        }
      });
    },

    /**
     * Scroll thumbnails in a direction (horizontal)
     * @private
     * @param {HTMLElement} thumbTrack - The thumbnail track container
     * @param {number} direction - -1 for left, 1 for right
     */
    _scrollThumbs: function (thumbTrack, direction) {
      const scrollAmount = 160;
      const isRTL = document.documentElement.dir === 'rtl';
      thumbTrack.scrollLeft += direction * scrollAmount * (isRTL ? -1 : 1);
    },

    /**
     * Update thumbnail scroll button disabled states
     * @private
     * @param {HTMLElement} gallery - The gallery container
     */
    _updateThumbScrollState: function (gallery) {
      const thumbTrack = gallery.querySelector('[data-thumb-list]');
      const prevBtn = gallery.querySelector('[data-thumb-prev]');
      const nextBtn = gallery.querySelector('[data-thumb-next]');

      if (!thumbTrack || !prevBtn || !nextBtn) return;

      const isRTL = document.documentElement.dir === 'rtl';
      const scrollLeft = Math.abs(thumbTrack.scrollLeft);
      const maxScroll = thumbTrack.scrollWidth - thumbTrack.clientWidth;

      if (isRTL) {
        prevBtn.disabled = scrollLeft >= maxScroll - 2;
        nextBtn.disabled = scrollLeft <= 2;
      } else {
        prevBtn.disabled = scrollLeft <= 2;
        nextBtn.disabled = scrollLeft >= maxScroll - 2;
      }
    },

    /**
     * Setup image zoom on hover
     * @private
     * @param {HTMLElement} gallery - The gallery container
     */
    _setupZoom: function (gallery) {
      gallery.querySelectorAll('[data-zoom-wrapper]').forEach(wrapper => {
        const lens = wrapper.querySelector('[data-zoom-lens]');
        const img = wrapper.querySelector('.product-gallery__image');
        const zoomSrc = wrapper.dataset.zoomSrc;

        if (!lens || !img || !zoomSrc) return;

        // Preload zoom image
        const zoomImg = new Image();
        zoomImg.src = zoomSrc;

        wrapper.addEventListener('mouseenter', () => {
          lens.style.backgroundImage = 'url(' + zoomSrc + ')';
        });

        wrapper.addEventListener('mousemove', (e) => {
          const rect = wrapper.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * 100;
          const y = ((e.clientY - rect.top) / rect.height) * 100;

          lens.style.backgroundPosition = x + '% ' + y + '%';
        });

        wrapper.addEventListener('mouseleave', () => {
          lens.style.backgroundImage = '';
          lens.style.backgroundPosition = '';
        });
      });
    },

    /**
     * Setup fullscreen lightbox
     * @private
     * @param {HTMLElement} gallery - The gallery container
     */
    _setupLightbox: function (gallery) {
      const fullscreenBtn = gallery.querySelector('[data-gallery-fullscreen]');
      // Look for the lightbox in the next sibling (it's rendered right after the gallery div)
      const lightbox = gallery.parentElement?.querySelector('[data-gallery-lightbox]');

      if (!lightbox) return;

      this._lightbox = lightbox;

      // Store the original parent so we can restore the lightbox on close
      const lightboxOriginalParent = lightbox.parentElement;
      const lightboxNextSibling = lightbox.nextSibling;

      const lightboxSlides = lightbox.querySelectorAll('[data-lightbox-slide]');
      const lightboxPrev = lightbox.querySelector('[data-lightbox-prev]');
      const lightboxNext = lightbox.querySelector('[data-lightbox-next]');
      const lightboxCounter = lightbox.querySelector('[data-lightbox-current]');
      const closeButtons = lightbox.querySelectorAll('[data-lightbox-close]');

      let currentLightboxIndex = 0;

      const openLightbox = () => {
        // Move lightbox to body to escape any stacking context (e.g. position: sticky parents)
        document.body.appendChild(lightbox);
        lightbox.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        currentLightboxIndex = this._currentIndex;
        goToLightboxSlide(currentLightboxIndex);
      };

      const closeLightbox = () => {
        lightbox.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        // Restore lightbox to its original position in the DOM
        if (lightboxOriginalParent) {
          if (lightboxNextSibling) {
            lightboxOriginalParent.insertBefore(lightbox, lightboxNextSibling);
          } else {
            lightboxOriginalParent.appendChild(lightbox);
          }
        }
      };

      const goToLightboxSlide = (index) => {
        if (lightboxSlides.length === 0) return;
        if (index < 0) index = lightboxSlides.length - 1;
        if (index >= lightboxSlides.length) index = 0;

        lightboxSlides.forEach(s => s.classList.remove(CLASSES.ACTIVE));
        lightboxSlides[index].classList.add(CLASSES.ACTIVE);
        currentLightboxIndex = index;

        if (lightboxCounter) {
          lightboxCounter.textContent = index + 1;
        }
      };

      // Open lightbox on fullscreen button or double-click on image
      if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', openLightbox);
      }

      // Double-click on main image to open lightbox
      gallery.querySelector('[data-gallery-track]')?.addEventListener('dblclick', (e) => {
        if (e.target.closest('.product-gallery__image-wrapper')) {
          openLightbox();
        }
      });

      // Close buttons
      closeButtons.forEach(btn => {
        btn.addEventListener('click', closeLightbox);
      });

      // Close lightbox when clicking on the overlay (outside the image)
      lightbox.addEventListener('click', (e) => {
        const target = e.target;
        // Close if clicking directly on the lightbox, overlay, content wrapper, or track (not on image/arrows/close)
        if (
          target === lightbox ||
          target.classList.contains('product-gallery__lightbox-overlay') ||
          target.classList.contains('product-gallery__lightbox-content') ||
          target.classList.contains('product-gallery__lightbox-track')
        ) {
          closeLightbox();
        }
      });

      // Lightbox navigation
      if (lightboxPrev) {
        lightboxPrev.addEventListener('click', () => {
          goToLightboxSlide(currentLightboxIndex - 1);
        });
      }

      if (lightboxNext) {
        lightboxNext.addEventListener('click', () => {
          goToLightboxSlide(currentLightboxIndex + 1);
        });
      }

      // Keyboard navigation for lightbox
      document.addEventListener('keydown', (e) => {
        if (lightbox.getAttribute('aria-hidden') !== 'false') return;

        if (e.key === 'Escape') {
          closeLightbox();
        } else if (e.key === 'ArrowLeft') {
          const dir = document.documentElement.dir === 'rtl' ? 1 : -1;
          goToLightboxSlide(currentLightboxIndex + dir);
        } else if (e.key === 'ArrowRight') {
          const dir = document.documentElement.dir === 'rtl' ? -1 : 1;
          goToLightboxSlide(currentLightboxIndex + dir);
        }
      });

      // Touch/swipe in lightbox
      let startX = 0;
      lightbox.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
      }, { passive: true });

      lightbox.addEventListener('touchend', (e) => {
        const diffX = e.changedTouches[0].clientX - startX;
        if (Math.abs(diffX) > 50) {
          const isRTL = document.documentElement.dir === 'rtl';
          if (diffX < 0) {
            goToLightboxSlide(currentLightboxIndex + (isRTL ? -1 : 1));
          } else {
            goToLightboxSlide(currentLightboxIndex + (isRTL ? 1 : -1));
          }
        }
      }, { passive: true });
    },

    /**
     * Setup touch swipe support for mobile
     * @private
     * @param {HTMLElement} mainArea - The main gallery area
     */
    _setupSwipe: function (mainArea) {
      if (!mainArea) return;

      let startX = 0;
      let startY = 0;
      let isDragging = false;

      mainArea.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        isDragging = true;
      }, { passive: true });

      mainArea.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        isDragging = false;

        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const diffX = endX - startX;
        const diffY = endY - startY;

        // Only trigger if horizontal swipe is dominant and significant
        if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) {
          const isRTL = document.documentElement.dir === 'rtl';
          if (diffX < 0) {
            // Swiped left
            this._goToSlide(this._currentIndex + (isRTL ? -1 : 1));
          } else {
            // Swiped right
            this._goToSlide(this._currentIndex + (isRTL ? 1 : -1));
          }
        }
      }, { passive: true });
    }
  };

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * Initialize all theme components
   */
  Sallety.init = function () {
    // Initialize components
    Sallety.accordion.init();
    Sallety.tabs.init();
    Sallety.backToTop.init();
    Sallety.quantitySelector.init();
    Sallety.productForm.init();
    Sallety.variantSelector.init();
    Sallety.productGallery.init();

    // Setup drawer event listeners using event delegation
    document.addEventListener('click', (e) => {
      // Drawer toggle
      const drawerToggle = e.target.closest(SELECTORS.DRAWER_TOGGLE);
      if (drawerToggle) {
        const drawerId = drawerToggle.dataset.drawerToggle;
        Sallety.drawer.toggle(drawerId);
        return;
      }

      // Drawer close
      const drawerClose = e.target.closest(SELECTORS.DRAWER_CLOSE);
      if (drawerClose) {
        const drawer = drawerClose.closest(SELECTORS.DRAWER);
        if (drawer) Sallety.drawer.close(drawer.id);
        return;
      }

      // Modal open
      const modalTrigger = e.target.closest(SELECTORS.MODAL_TRIGGER);
      if (modalTrigger) {
        Sallety.modal.open(modalTrigger.dataset.modalOpen);
        return;
      }

      // Modal close
      const modalClose = e.target.closest(SELECTORS.MODAL_CLOSE);
      if (modalClose) {
        const modal = modalClose.closest(SELECTORS.MODAL);
        if (modal) Sallety.modal.close(modal.id);
        return;
      }

      // Overlay click (close modal/drawer)
      const overlay = e.target.closest(`${SELECTORS.MODAL_OVERLAY}, ${SELECTORS.DRAWER_OVERLAY}, ${SELECTORS.CART_DRAWER_OVERLAY}, .drawer__overlay`);
      if (overlay) {
        const modal = overlay.closest(SELECTORS.MODAL);
        if (modal) {
          Sallety.modal.close(modal.id);
        }
        Sallety.drawer.closeAll();
      }
    });

    // Escape key handler
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        // Close all modals
        document.querySelectorAll(SELECTORS.MODAL_OPEN).forEach(modal => {
          Sallety.modal.close(modal.id);
        });
        // Close all drawers
        Sallety.drawer.closeAll();
      }
    });

    // Log initialization (development only)
    if (window.Shopify?.designMode) {
      console.log('[Sallety] Theme initialized');
    }
  };

  // ============================================================================
  // COLLECTION PAGE FUNCTIONALITY
  // ============================================================================

  /**
   * Collection page module - handles sorting, filtering, layout switching,
   * load more, and infinite scroll.
   */
  Sallety.collection = {
    /** @type {boolean} Whether an AJAX request is in progress */
    _isLoading: false,

    /** Initialize collection page features */
    init: function () {
      const section = document.querySelector('[data-section-type="collection"]');
      if (!section) return;

      this.section = section;
      this.sectionId = section.dataset.sectionId;
      this.productGrid = section.querySelector('[data-product-grid]');

      this._initSort();
      this._initFilter();
      this._initLayoutSwitch();
      this._initLoadMore();
      this._initInfiniteScroll();
      this._initFacets();
      this._initActiveFilters();
      this._initPopState();
    },

    // ========================================================================
    // AJAX RENDERING
    // ========================================================================

    /**
     * Fetch a URL and swap collection content without page reload.
     * Updates the product grid, toolbar, active filters, facets drawer,
     * and pagination. Pushes state to browser history.
     * @param {string} url - The URL to fetch
     * @param {boolean} [pushState=true] - Whether to push to browser history
     */
    _fetchAndRender: function (url, pushState) {
      if (pushState === undefined) pushState = true;
      if (this._isLoading) return;
      this._isLoading = true;

      var productsWrapper = this.section.querySelector('[data-collection-products]');
      if (productsWrapper) {
        productsWrapper.classList.add('collection__loading');
      }

      this._fetchPage(url).then(function (html) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, 'text/html');

        // Swap main collection content (toolbar + active filters + grid + pagination)
        var newContent = doc.querySelector('[data-collection-content]');
        var currentContent = document.querySelector('[data-collection-content]');
        if (newContent && currentContent) {
          currentContent.innerHTML = newContent.innerHTML;
        }

        // Swap filter drawer facets
        var newFacetsContent = doc.querySelector('[data-filter-drawer-content]');
        var currentFacetsContent = document.querySelector('[data-filter-drawer-content]');
        if (newFacetsContent && currentFacetsContent) {
          currentFacetsContent.innerHTML = newFacetsContent.innerHTML;
        }

        // Swap filter drawer footer (result count + clear link)
        var newDrawerFooter = doc.querySelector('[data-filter-drawer-footer]');
        var currentDrawerFooter = document.querySelector('[data-filter-drawer-footer]');
        if (newDrawerFooter && currentDrawerFooter) {
          currentDrawerFooter.innerHTML = newDrawerFooter.innerHTML;
        }

        // Update filter toggle badge count
        var newFilterToggle = doc.querySelector('[data-filter-toggle]');
        var currentFilterToggle = document.querySelector('[data-filter-toggle]');
        if (newFilterToggle && currentFilterToggle) {
          currentFilterToggle.innerHTML = newFilterToggle.innerHTML;
        }

        // Push state
        if (pushState) {
          window.history.pushState({ collectionUrl: url }, '', url);
        }

        // Re-cache references and re-bind events
        Sallety.collection.productGrid = Sallety.collection.section.querySelector('[data-product-grid]');
        Sallety.collection._initSort();
        Sallety.collection._initFacets();
        Sallety.collection._initActiveFilters();
        Sallety.collection._initLoadMore();
        Sallety.collection._initInfiniteScroll();
        Sallety.collection._initLayoutSwitch();

        // Re-init product forms inside the new grid
        Sallety.productForm.init();

        // Scroll to top of collection section
        Sallety.collection.section.scrollIntoView({ behavior: 'smooth', block: 'start' });

      }.bind(this)).catch(function (err) {
        console.error('[Sallety] AJAX filter/sort failed:', err);
      }).finally(function () {
        this._isLoading = false;
        var productsWrapper = this.section ? this.section.querySelector('[data-collection-products]') : null;
        if (productsWrapper) {
          productsWrapper.classList.remove('collection__loading');
        }
      }.bind(this));
    },

    /** Listen for browser back/forward to re-render via AJAX */
    _initPopState: function () {
      window.addEventListener('popstate', function () {
        Sallety.collection._fetchAndRender(window.location.href, false);
      });
    },

    // ========================================================================
    // SORT
    // ========================================================================

    /** Sort dropdown - AJAX based */
    _initSort: function () {
      var sortWrapper = this.section.querySelector('[data-sort-wrapper]');
      if (!sortWrapper) return;

      var toggle = sortWrapper.querySelector('[data-sort-toggle]');
      var dropdown = sortWrapper.querySelector('[data-sort-dropdown]');

      if (!toggle || !dropdown) return;

      // Avoid duplicate listeners by checking init flag
      if (toggle.dataset.sortInit) return;
      toggle.dataset.sortInit = 'true';

      toggle.addEventListener('click', function (e) {
        e.stopPropagation();
        var isOpen = !dropdown.classList.contains('hidden');
        dropdown.classList.toggle('hidden');
        toggle.setAttribute('aria-expanded', !isOpen);
      });

      dropdown.querySelectorAll('[data-sort-value]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var value = btn.dataset.sortValue;
          var url = new URL(window.location.href);
          url.searchParams.set('sort_by', value);
          dropdown.classList.add('hidden');
          toggle.setAttribute('aria-expanded', 'false');
          Sallety.collection._fetchAndRender(url.toString());
        });
      });

      document.addEventListener('click', function (e) {
        if (!sortWrapper.contains(e.target)) {
          dropdown.classList.add('hidden');
          toggle.setAttribute('aria-expanded', 'false');
        }
      });
    },

    // ========================================================================
    // FILTER DRAWER
    // ========================================================================

    /** Filter drawer open/close */
    _initFilter: function () {
      var filterToggle = this.section.querySelector('[data-filter-toggle]');
      var filterDrawer = document.getElementById('filter-drawer');
      var filterOverlay = document.querySelector('[data-filter-overlay]');

      if (!filterToggle || !filterDrawer) return;

      filterToggle.addEventListener('click', function () {
        Sallety.drawer.open('filter-drawer');
      });

      filterDrawer.querySelectorAll('[data-filter-close]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          Sallety.drawer.close('filter-drawer');
        });
      });

      if (filterOverlay) {
        filterOverlay.addEventListener('click', function () {
          Sallety.drawer.close('filter-drawer');
        });
      }
    },

    // ========================================================================
    // ACTIVE FILTERS (AJAX)
    // ========================================================================

    /** Intercept active filter remove links and clear-all to use AJAX */
    _initActiveFilters: function () {
      var self = this;
      this.section.querySelectorAll('.collection__active-filter, .collection__clear-filters').forEach(function (link) {
        if (link.dataset.ajaxInit) return;
        link.dataset.ajaxInit = 'true';
        link.addEventListener('click', function (e) {
          e.preventDefault();
          self._fetchAndRender(link.href);
        });
      });

      // Clear-all inside filter drawer footer
      var drawerClear = document.querySelector('[data-filter-clear]');
      if (drawerClear && !drawerClear.dataset.ajaxInit) {
        drawerClear.dataset.ajaxInit = 'true';
        drawerClear.addEventListener('click', function (e) {
          e.preventDefault();
          Sallety.drawer.close('filter-drawer');
          self._fetchAndRender(drawerClear.href);
        });
      }
    },

    // ========================================================================
    // LAYOUT SWITCH
    // ========================================================================

    /** Layout switcher (grid columns + list view) */
    _initLayoutSwitch: function () {
      var switchWrapper = this.section.querySelector('[data-layout-switch]');
      if (!switchWrapper || !this.productGrid) return;

      var grid = this.productGrid;
      var buttons = switchWrapper.querySelectorAll('[data-layout]');

      buttons.forEach(function (btn) {
        if (btn.dataset.layoutInit) return;
        btn.dataset.layoutInit = 'true';

        btn.addEventListener('click', function () {
          buttons.forEach(function (b) {
            b.classList.remove('is-active');
            b.classList.add('opacity-40');
          });
          btn.classList.add('is-active');
          btn.classList.remove('opacity-40');

          var layout = btn.dataset.layout;

          if (layout === 'list') {
            grid.classList.add('collection__grid--list');
          } else {
            grid.classList.remove('collection__grid--list');
            var cols = btn.dataset.columns;
            if (cols) {
              grid.style.setProperty('--grid-cols-desktop', cols);
            }
          }

          try {
            localStorage.setItem('sallety-collection-layout', layout);
          } catch (e) { /* ignore */ }
        });
      });

      try {
        var saved = localStorage.getItem('sallety-collection-layout');
        if (saved) {
          var savedBtn = switchWrapper.querySelector('[data-layout="' + saved + '"]');
          if (savedBtn) savedBtn.click();
        }
      } catch (e) { /* ignore */ }
    },

    // ========================================================================
    // LOAD MORE
    // ========================================================================

    /** Load More button */
    _initLoadMore: function () {
      var loadMoreBtn = this.section.querySelector('[data-load-more]');
      if (!loadMoreBtn || !this.productGrid) return;

      if (loadMoreBtn.dataset.loadInit) return;
      loadMoreBtn.dataset.loadInit = 'true';

      var grid = this.productGrid;
      var self = this;
      var textEl = loadMoreBtn.querySelector('.collection__load-more-text');
      var spinnerEl = loadMoreBtn.querySelector('.collection__load-more-spinner');

      loadMoreBtn.addEventListener('click', function () {
        var nextUrl = loadMoreBtn.dataset.nextUrl;
        if (!nextUrl) return;

        if (textEl) textEl.classList.add('hidden');
        if (spinnerEl) spinnerEl.classList.remove('hidden');
        loadMoreBtn.disabled = true;

        self._fetchPage(nextUrl).then(function (html) {
          var parser = new DOMParser();
          var doc = parser.parseFromString(html, 'text/html');
          var newItems = doc.querySelectorAll('[data-product-item]');
          var newPaginationWrapper = doc.querySelector('[data-pagination-wrapper]');

          newItems.forEach(function (item) {
            grid.appendChild(item);
          });

          var paginationWrapper = self.section.querySelector('[data-pagination-wrapper]');
          if (paginationWrapper && newPaginationWrapper) {
            paginationWrapper.innerHTML = newPaginationWrapper.innerHTML;
            self._initLoadMore();
          } else if (paginationWrapper && !newPaginationWrapper) {
            paginationWrapper.remove();
          }

          var progressEl = self.section.querySelector('.collection__progress');
          var newProgressEl = doc.querySelector('.collection__progress');
          if (progressEl && newProgressEl) {
            progressEl.innerHTML = newProgressEl.innerHTML;
          }

          Sallety.productForm.init();
        }).catch(function (err) {
          console.error('[Sallety] Load more failed:', err);
          if (textEl) textEl.classList.remove('hidden');
          if (spinnerEl) spinnerEl.classList.add('hidden');
          loadMoreBtn.disabled = false;
        });
      });
    },

    // ========================================================================
    // INFINITE SCROLL
    // ========================================================================

    /** Infinite scroll observer */
    _initInfiniteScroll: function () {
      var trigger = this.section.querySelector('[data-infinite-trigger]');
      if (!trigger || !this.productGrid) return;

      if (trigger.dataset.scrollInit) return;
      trigger.dataset.scrollInit = 'true';

      var grid = this.productGrid;
      var self = this;
      var isLoading = false;

      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting || isLoading) return;
          isLoading = true;

          var nextUrl = trigger.dataset.nextUrl;
          if (!nextUrl) {
            observer.disconnect();
            return;
          }

          self._fetchPage(nextUrl).then(function (html) {
            var parser = new DOMParser();
            var doc = parser.parseFromString(html, 'text/html');
            var newItems = doc.querySelectorAll('[data-product-item]');
            var newTrigger = doc.querySelector('[data-infinite-trigger]');

            newItems.forEach(function (item) {
              grid.appendChild(item);
            });

            var progressEl = self.section.querySelector('.collection__progress');
            var newProgressEl = doc.querySelector('.collection__progress');
            if (progressEl && newProgressEl) {
              progressEl.innerHTML = newProgressEl.innerHTML;
            }

            if (newTrigger) {
              trigger.dataset.nextUrl = newTrigger.dataset.nextUrl;
              isLoading = false;
            } else {
              trigger.remove();
              observer.disconnect();
            }

            Sallety.productForm.init();
          }).catch(function (err) {
            console.error('[Sallety] Infinite scroll failed:', err);
            isLoading = false;
          });
        });
      }, { rootMargin: '200px' });

      observer.observe(trigger);
    },

    // ========================================================================
    // FACETS (AJAX)
    // ========================================================================

    /** Facets accordion, search, and AJAX filter application */
    _initFacets: function () {
      var facetsForm = document.querySelector('[data-facets-form]');
      if (!facetsForm) return;

      var self = this;

      facetsForm.querySelectorAll('[data-accordion-item]').forEach(function (item) {
        var header = item.querySelector('[data-accordion-header]');
        var content = item.querySelector('[data-accordion-content]');
        var isDefaultOpen = item.hasAttribute('data-default-open');

        if (!header || !content) return;

        if (isDefaultOpen) {
          item.classList.add('is-open');
          content.classList.remove('hidden');
          header.setAttribute('aria-expanded', 'true');
        }

        if (header.dataset.facetAccInit) return;
        header.dataset.facetAccInit = 'true';

        header.addEventListener('click', function () {
          var isOpen = item.classList.contains('is-open');
          item.classList.toggle('is-open');
          content.classList.toggle('hidden');
          header.setAttribute('aria-expanded', !isOpen);
        });
      });

      facetsForm.querySelectorAll('[data-facet-search]').forEach(function (searchInput) {
        if (searchInput.dataset.facetSearchInit) return;
        searchInput.dataset.facetSearchInit = 'true';

        var list = searchInput.closest('.facets__content').querySelector('[data-facet-list]');
        if (!list) return;

        searchInput.addEventListener('input', Sallety.utils.debounce(function () {
          var query = searchInput.value.toLowerCase().trim();
          list.querySelectorAll('[data-facet-item]').forEach(function (item) {
            var label = item.dataset.label || '';
            item.style.display = label.includes(query) ? '' : 'none';
          });
        }, 200));
      });

      facetsForm.querySelectorAll('[data-facet-input]').forEach(function (input) {
        if (input.dataset.facetInputInit) return;
        input.dataset.facetInputInit = 'true';

        input.addEventListener('change', function () {
          self._applyFacets(facetsForm);
        });
      });
    },

    /** Build URL from facets form and render via AJAX */
    _applyFacets: function (form) {
      var formData = new FormData(form);
      var url = new URL(window.location.href);

      url.search = '';

      var sortBy = new URL(window.location.href).searchParams.get('sort_by');
      if (sortBy) url.searchParams.set('sort_by', sortBy);

      for (var pair of formData) {
        if (pair[1]) {
          url.searchParams.append(pair[0], pair[1]);
        }
      }

      this._fetchAndRender(url.toString());
    },

    // ========================================================================
    // FETCH HELPER
    // ========================================================================

    /** Fetch a page via AJAX */
    _fetchPage: function (url) {
      return fetch(url, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      }).then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.text();
      });
    }
  };

  // ============================================================================
  // SEARCH MODAL
  // ============================================================================

  /**
   * Search Modal Module
   * Handles the search modal with predictive search functionality
   */
  Sallety.searchModal = {
    modal: null,
    overlay: null,
    input: null,
    clearBtn: null,
    closeBtn: null,
    resultsContainer: null,
    loadingEl: null,
    emptyEl: null,
    searchTimeout: null,

    /**
     * Initialize the search modal
     */
    init: function () {
      this.modal = document.getElementById('search-modal');
      this.overlay = document.getElementById('search-modal-overlay');

      if (!this.modal) return;

      this.input = this.modal.querySelector('[data-predictive-search-input]');
      this.clearBtn = this.modal.querySelector('[data-search-clear]');
      this.closeBtn = this.modal.querySelector('[data-search-close]');
      this.resultsContainer = this.modal.querySelector('[data-predictive-search-results]');
      this.loadingEl = this.modal.querySelector('.search-modal__loading');
      this.emptyEl = this.modal.querySelector('.search-modal__empty');

      this._bindEvents();
    },

    /**
     * Bind event listeners
     */
    _bindEvents: function () {
      var self = this;

      // Open search modal triggers
      document.querySelectorAll('[data-search-open], [data-modal-open="search-modal"]').forEach(function (trigger) {
        trigger.addEventListener('click', function (e) {
          e.preventDefault();
          self.open();
        });
      });

      // Close button
      if (this.closeBtn) {
        this.closeBtn.addEventListener('click', function () {
          self.close();
        });
      }

      // Overlay click
      if (this.overlay) {
        this.overlay.addEventListener('click', function () {
          self.close();
        });
      }

      // Clear button
      if (this.clearBtn) {
        this.clearBtn.addEventListener('click', function () {
          self._clearInput();
        });
      }

      // Input events
      if (this.input) {
        this.input.addEventListener('input', Sallety.utils.debounce(function () {
          self._handleInput();
        }, 300));

        this.input.addEventListener('keydown', function (e) {
          if (e.key === 'Escape') {
            self.close();
          }
        });
      }

      // Keyboard shortcut (Ctrl/Cmd + K)
      document.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
          e.preventDefault();
          self.toggle();
        }
      });
    },

    /**
     * Open the search modal
     */
    open: function () {
      if (!this.modal) return;

      this.modal.classList.add('is-open');
      if (this.overlay) this.overlay.classList.add('is-open');
      document.body.style.overflow = 'hidden';

      // Focus input after animation
      var self = this;
      setTimeout(function () {
        if (self.input) self.input.focus();
      }, 100);
    },

    /**
     * Close the search modal
     */
    close: function () {
      if (!this.modal) return;

      this.modal.classList.remove('is-open');
      if (this.overlay) this.overlay.classList.remove('is-open');
      document.body.style.overflow = '';

      // Clear search on close
      this._clearInput();
    },

    /**
     * Toggle the search modal
     */
    toggle: function () {
      if (this.modal && this.modal.classList.contains('is-open')) {
        this.close();
      } else {
        this.open();
      }
    },

    /**
     * Handle input changes
     */
    _handleInput: function () {
      var query = this.input ? this.input.value.trim() : '';

      // Toggle clear button visibility
      if (this.clearBtn) {
        if (query.length > 0) {
          this.clearBtn.classList.add('is-visible');
        } else {
          this.clearBtn.classList.remove('is-visible');
        }
      }

      // Perform search
      if (query.length >= 2) {
        this._performSearch(query);
      } else {
        this._showEmpty();
      }
    },

    /**
     * Clear the search input
     */
    _clearInput: function () {
      if (this.input) {
        this.input.value = '';
        this.input.focus();
      }
      if (this.clearBtn) {
        this.clearBtn.classList.remove('is-visible');
      }
      this._showEmpty();
    },

    /**
     * Show loading state
     */
    _showLoading: function () {
      if (this.loadingEl) this.loadingEl.classList.add('is-visible');
      if (this.emptyEl) this.emptyEl.classList.add('is-hidden');
    },

    /**
     * Show empty state
     */
    _showEmpty: function () {
      if (this.loadingEl) this.loadingEl.classList.remove('is-visible');
      if (this.emptyEl) this.emptyEl.classList.remove('is-hidden');

      // Clear results
      var existingResults = this.resultsContainer ? this.resultsContainer.querySelector('.predictive-search__results') : null;
      if (existingResults) existingResults.remove();
    },

    /**
     * Perform predictive search
     */
    _performSearch: function (query) {
      var self = this;
      this._showLoading();

      var searchUrl = window.Shopify.routes.root + 'search/suggest.json?q=' + encodeURIComponent(query) + '&resources[type]=product,article,page&resources[limit]=10&resources[options][unavailable_products]=last';

      fetch(searchUrl)
        .then(function (response) {
          return response.json();
        })
        .then(function (data) {
          self._renderResults(data, query);
        })
        .catch(function (error) {
          console.error('[Sallety] Search error:', error);
          self._showEmpty();
        });
    },

    /**
     * Render search results
     */
    _renderResults: function (data, query) {
      var self = this;

      if (this.loadingEl) this.loadingEl.classList.remove('is-visible');
      if (this.emptyEl) this.emptyEl.classList.add('is-hidden');

      var resources = data.resources || {};
      var results = resources.results || {};
      var products = results.products || [];
      var articles = results.articles || [];
      var pages = results.pages || [];

      var hasResults = products.length > 0 || articles.length > 0 || pages.length > 0;

      // Remove existing results
      var existingResults = this.resultsContainer ? this.resultsContainer.querySelector('.predictive-search__results') : null;
      if (existingResults) existingResults.remove();

      if (!hasResults) {
        this._renderNoResults(query);
        return;
      }

      var html = '<div class="predictive-search__results" dir="rtl">';
      html += '<div class="predictive-search__results-groups">';

      // Products
      if (products.length > 0) {
        html += '<div class="predictive-search__result-group">';
        html += '<h4 class="predictive-search__result-group-title">' + (window.theme?.strings?.products || 'المنتجات') + '</h4>';
        products.forEach(function (product) {
          var imageUrl = product.image ? product.image.replace(/(\.[^.]+)$/, '_200x$1') : '';
          html += '<a href="' + product.url + '" class="predictive-search__result-item">';
          if (imageUrl) {
            html += '<img src="' + imageUrl + '" alt="' + self._escapeHtml(product.title) + '" class="predictive-search__result-item-image" loading="lazy">';
          } else {
            html += '<div class="predictive-search__result-item-image flex items-center justify-center text-secondary"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></div>';
          }
          html += '<div class="predictive-search__result-item-content">';
          html += '<p class="predictive-search__result-item-title">' + self._escapeHtml(product.title) + '</p>';
          html += '<p class="predictive-search__result-item-price">' + product.price + '</p>';
          if (product.vendor) {
            html += '<p class="predictive-search__result-item-vendor">' + self._escapeHtml(product.vendor) + '</p>';
          }
          html += '</div>';
          html += '</a>';
        });
        html += '</div>';
      }

      // Articles
      if (articles.length > 0) {
        html += '<div class="predictive-search__result-group">';
        html += '<h4 class="predictive-search__result-group-title">' + (window.theme?.strings?.articles || 'المقالات') + '</h4>';
        articles.forEach(function (article) {
          var imageUrl = article.image ? article.image.replace(/(\.[^.]+)$/, '_200x$1') : '';
          html += '<a href="' + article.url + '" class="predictive-search__result-item">';
          if (imageUrl) {
            html += '<img src="' + imageUrl + '" alt="' + self._escapeHtml(article.title) + '" class="predictive-search__result-item-image" loading="lazy">';
          }
          html += '<div class="predictive-search__result-item-content">';
          html += '<p class="predictive-search__result-item-title">' + self._escapeHtml(article.title) + '</p>';
          html += '</div>';
          html += '</a>';
        });
        html += '</div>';
      }

      // Pages
      if (pages.length > 0) {
        html += '<div class="predictive-search__result-group">';
        html += '<h4 class="predictive-search__result-group-title">' + (window.theme?.strings?.pages || 'الصفحات') + '</h4>';
        pages.forEach(function (page) {
          html += '<a href="' + page.url + '" class="predictive-search__result-item">';
          html += '<div class="predictive-search__result-item-content">';
          html += '<p class="predictive-search__result-item-title">' + self._escapeHtml(page.title) + '</p>';
          html += '</div>';
          html += '</a>';
        });
        html += '</div>';
      }

      html += '</div>';

      // View all link (RTL: arrow should point left)
      html += '<a href="' + window.Shopify.routes.root + 'search?q=' + encodeURIComponent(query) + '" class="predictive-search__view-all">';
      html += '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="rtl-flip"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>';
      html += '<span>' + (window.theme?.strings?.view_all || 'عرض جميع النتائج') + '</span>';
      html += '</a>';

      html += '</div>';

      if (this.resultsContainer) {
        this.resultsContainer.insertAdjacentHTML('beforeend', html);
      }
    },

    /**
     * Render no results state
     */
    _renderNoResults: function (query) {
      var html = '<div class="predictive-search__results" dir="rtl">';
      html += '<div class="predictive-search__no-results">';
      html += '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="predictive-search__no-results-icon"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="8" x2="14" y2="14"></line><line x1="14" y1="8" x2="8" y2="14"></line></svg>';
      html += '<p class="text-foreground font-medium mb-1">' + (window.theme?.strings?.no_results || 'لا توجد نتائج') + '</p>';
      html += '<p class="text-sm text-secondary">' + (window.theme?.strings?.no_results_for || 'لم نجد نتائج لـ') + ' "' + this._escapeHtml(query) + '"</p>';
      html += '</div>';
      html += '</div>';

      if (this.resultsContainer) {
        var existingResults = this.resultsContainer.querySelector('.predictive-search__results');
        if (existingResults) existingResults.remove();
        this.resultsContainer.insertAdjacentHTML('beforeend', html);
      }
    },

    /**
     * Escape HTML entities
     */
    _escapeHtml: function (text) {
      var div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  };

  // ============================================================================
  // CART DRAWER
  // ============================================================================

  /**
   * Cart Drawer Module
   * Handles cart drawer functionality including item removal, quantity updates,
   * and AJAX re-rendering
   */
  Sallety.cartDrawer = {
    drawer: null,
    content: null,
    isUpdating: false,

    /**
     * Initialize the cart drawer
     */
    init: function () {
      this.drawer = document.getElementById('cart-drawer');
      if (!this.drawer) return;

      this.content = this.drawer.querySelector('[data-cart-drawer-content]');
      this._bindEvents();
    },

    /**
     * Bind event listeners
     */
    _bindEvents: function () {
      var self = this;

      // Use event delegation for all cart drawer interactions
      document.addEventListener('click', function (e) {
        // Remove item
        var removeBtn = e.target.closest('[data-cart-remove]');
        if (removeBtn) {
          e.preventDefault();
          var line = parseInt(removeBtn.dataset.cartRemove, 10);
          if (line) {
            self.removeItem(line);
          }
          return;
        }

        // Quantity minus
        var minusBtn = e.target.closest('[data-quantity-minus][data-line]');
        if (minusBtn && self._isInCartDrawer(minusBtn)) {
          e.preventDefault();
          var line = parseInt(minusBtn.dataset.line, 10);
          var input = minusBtn.closest('[data-quantity-selector]').querySelector('[data-quantity-input]');
          var currentQty = parseInt(input.value, 10) || 1;
          if (currentQty > 1) {
            self.updateQuantity(line, currentQty - 1);
          }
          return;
        }

        // Quantity plus
        var plusBtn = e.target.closest('[data-quantity-plus][data-line]');
        if (plusBtn && self._isInCartDrawer(plusBtn)) {
          e.preventDefault();
          var line = parseInt(plusBtn.dataset.line, 10);
          var input = plusBtn.closest('[data-quantity-selector]').querySelector('[data-quantity-input]');
          var currentQty = parseInt(input.value, 10) || 1;
          var maxQty = parseInt(input.getAttribute('max'), 10) || 99999;
          var inventoryQty = parseInt(input.dataset.inventoryQuantity, 10) || 99999;
          var inventoryPolicy = input.dataset.inventoryPolicy;

          // Check if we can increase quantity
          var effectiveMax = (inventoryPolicy === 'deny') ? Math.min(maxQty, inventoryQty) : 99999;

          if (currentQty < effectiveMax) {
            self.updateQuantity(line, currentQty + 1);
          } else {
            // Show error that max quantity reached
            self._showError(window.cartStrings?.max_quantity || 'لقد وصلت للحد الأقصى من الكمية المتاحة');
          }
          return;
        }
      });

      // Quantity input change
      document.addEventListener('change', function (e) {
        var input = e.target.closest('[data-quantity-input][data-line]');
        if (input && self._isInCartDrawer(input)) {
          var line = parseInt(input.dataset.line, 10);
          var newQty = parseInt(input.value, 10) || 1;
          var maxQty = parseInt(input.getAttribute('max'), 10) || 99999;
          var inventoryQty = parseInt(input.dataset.inventoryQuantity, 10) || 99999;
          var inventoryPolicy = input.dataset.inventoryPolicy;

          // Validate quantity
          if (newQty < 1) newQty = 1;

          // Check max quantity based on inventory policy
          var effectiveMax = (inventoryPolicy === 'deny') ? Math.min(maxQty, inventoryQty) : 99999;

          if (newQty > effectiveMax) {
            newQty = effectiveMax;
            input.value = newQty;
            self._showError(window.cartStrings?.max_quantity || 'الكمية المطلوبة غير متوفرة. الحد الأقصى المتاح: ' + effectiveMax);
          }

          self.updateQuantity(line, newQty);
        }
      });

      // Cart note update
      document.addEventListener('change', function (e) {
        var noteInput = e.target.closest('[data-cart-note]');
        if (noteInput) {
          self.updateNote(noteInput.value);
        }
      });

      // Listen for cart updated events to refresh drawer
      document.addEventListener(EVENTS.CART_UPDATED, function () {
        if (self.drawer && self.drawer.classList.contains('is-open')) {
          self.refresh();
        }
      });
    },

    /**
     * Check if element is inside cart drawer
     * @param {HTMLElement} element - Element to check
     * @returns {boolean}
     */
    _isInCartDrawer: function (element) {
      return element.closest('#cart-drawer') !== null;
    },

    /**
     * Remove item from cart
     * @param {number} line - Line item index (1-based)
     */
    removeItem: function (line) {
      if (this.isUpdating) return;

      var self = this;
      var itemEl = this.drawer.querySelector('[data-cart-item][data-line="' + line + '"]');

      // Animate the item out smoothly
      if (itemEl) {
        itemEl.classList.add('is-removing');
        itemEl.style.pointerEvents = 'none';
        // After slide-out animation, collapse the height smoothly
        var itemHeight = itemEl.offsetHeight;
        itemEl.style.maxHeight = itemHeight + 'px';
        itemEl.style.overflow = 'hidden';

        // Wait for slide-out animation, then collapse
        setTimeout(function () {
          itemEl.style.maxHeight = '0px';
          itemEl.style.padding = '0';
          itemEl.style.margin = '0';
          itemEl.style.borderWidth = '0';
        }, 280);
      }

      this._updateCart({ line: line, quantity: 0 })
        .then(function (cart) {
          self._onCartUpdated(cart);
        })
        .catch(function (error) {
          console.error('[Sallety] Remove item error:', error);
          if (itemEl) {
            itemEl.classList.remove('is-removing');
            itemEl.style.opacity = '';
            itemEl.style.pointerEvents = '';
            itemEl.style.maxHeight = '';
            itemEl.style.overflow = '';
            itemEl.style.padding = '';
            itemEl.style.margin = '';
            itemEl.style.borderWidth = '';
          }
        });
    },

    /**
     * Update item quantity
     * @param {number} line - Line item index (1-based)
     * @param {number} quantity - New quantity
     */
    updateQuantity: function (line, quantity) {
      if (this.isUpdating) return;

      var self = this;
      var itemEl = this.drawer.querySelector('[data-cart-item][data-line="' + line + '"]');
      var input = itemEl ? itemEl.querySelector('[data-quantity-input]') : null;
      var previousQty = input ? parseInt(input.value, 10) : quantity;

      // Show loading state on item
      if (itemEl) {
        itemEl.classList.add('is-updating');
      }

      this._updateCart({ line: line, quantity: quantity })
        .then(function (cart) {
          // Check if the quantity was actually updated to what we requested
          // Shopify may return a lower quantity if stock is insufficient
          var updatedItem = cart.items.find(function (item, index) {
            return (index + 1) === line;
          });

          if (updatedItem && updatedItem.quantity < quantity) {
            // Shopify reduced the quantity due to stock limits
            self._showError(window.cartStrings?.stock_limited || 'الكمية المتوفرة محدودة. تم تعديل الكمية للحد الأقصى المتاح.');
          }

          self._onCartUpdated(cart);
        })
        .catch(function (error) {
          console.error('[Sallety] Update quantity error:', error);
          if (itemEl) {
            itemEl.classList.remove('is-updating');
          }
          // Revert input to previous value
          if (input) {
            input.value = previousQty;
          }
          // Show error message
          self._showError(error.message || 'حدث خطأ أثناء تحديث الكمية');
        });
    },

    /**
     * Update cart note
     * @param {string} note - Cart note text
     */
    updateNote: function (note) {
      fetch(window.routes?.cart_update_url + '.js' || '/cart/update.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ note: note })
      })
        .then(function (response) {
          if (!response.ok) throw new Error('Failed to update note');
          return response.json();
        })
        .catch(function (error) {
          console.error('[Sallety] Update note error:', error);
        });
    },

    /**
     * Update cart via AJAX
     * @param {Object} data - Update data { line, quantity }
     * @returns {Promise<Object>} Updated cart
     */
    _updateCart: function (data) {
      var self = this;
      this.isUpdating = true;

      return fetch(window.routes?.cart_change_url + '.js' || '/cart/change.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(data)
      })
        .then(function (response) {
          if (!response.ok) {
            return response.json().then(function (err) {
              throw new Error(err.description || err.message || 'Cart update failed');
            });
          }
          return response.json();
        })
        .finally(function () {
          self.isUpdating = false;
        });
    },

    /**
     * Handle cart updated
     * @param {Object} cart - Updated cart object
     */
    _onCartUpdated: function (cart) {
      // Update cart count in header
      Sallety.cart.updateCount(cart.item_count);

      // Update cart total in drawer footer
      this._updateCartTotal(cart);

      // Refresh drawer content via AJAX
      this.refresh();

      // Dispatch event
      Sallety.utils.dispatchEvent(EVENTS.CART_UPDATED, cart);
    },

    /**
     * Update cart total display
     * @param {Object} cart - Cart object
     */
    _updateCartTotal: function (cart) {
      var totalEl = this.drawer.querySelector('[data-cart-total]');
      if (totalEl) {
        totalEl.textContent = Sallety.utils.formatMoney(cart.total_price);
      }

      var countTextEl = this.drawer.querySelector('[data-cart-count-text]');
      if (countTextEl) {
        var countText = cart.item_count === 0
          ? (window.cartStrings?.empty || 'لا توجد منتجات')
          : (cart.item_count === 1
            ? (window.cartStrings?.one_item || 'منتج واحد')
            : (window.cartStrings?.items || '[count] منتجات').replace('[count]', cart.item_count));
        countTextEl.textContent = countText;
      }
    },

    /**
     * Refresh cart drawer content via AJAX
     */
    refresh: function () {
      var self = this;

      // Add loading state
      if (this.content) {
        this.content.classList.add('is-loading');
      }

      // Fetch fresh cart drawer HTML using the section
      var url = window.routes?.root_url || '/';
      url = url + '?section_id=cart-drawer-content';

      fetch(url, {
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      })
        .then(function (response) {
          if (!response.ok) throw new Error('Failed to fetch cart');
          return response.text();
        })
        .then(function (html) {
          self._renderCartContent(html);
        })
        .catch(function (error) {
          console.error('[Sallety] Refresh cart error:', error);
          // Fallback: reload the page section
          self._refreshFallback();
        })
        .finally(function () {
          if (self.content) {
            self.content.classList.remove('is-loading');
          }
        });
    },

    /**
     * Render cart content from HTML
     * @param {string} html - HTML string
     */
    _renderCartContent: function (html) {
      var parser = new DOMParser();
      var doc = parser.parseFromString(html, 'text/html');

      // Try to find the cart drawer content in the response
      var newContent = doc.querySelector('[data-cart-drawer-content]');
      var newFooter = doc.querySelector('[data-cart-drawer-footer]');

      if (newContent && this.content) {
        this.content.innerHTML = newContent.innerHTML;
      }

      // Update footer (totals, buttons)
      var currentFooter = this.drawer.querySelector('[data-cart-drawer-footer]') ||
        this.drawer.querySelector('.flex-shrink-0.border-t');

      if (newFooter) {
        if (currentFooter) {
          currentFooter.outerHTML = newFooter.outerHTML;
        } else {
          // Footer doesn't exist, append it
          this.drawer.insertAdjacentHTML('beforeend', newFooter.outerHTML);
        }
      } else if (currentFooter) {
        // Cart is empty, remove footer
        currentFooter.remove();
      }

      // Re-bind any necessary events
      this._updateCartCountText();
    },

    /**
     * Fallback refresh using cart.js
     */
    _refreshFallback: function () {
      var self = this;

      Sallety.cart.get()
        .then(function (cart) {
          self._updateCartTotal(cart);
          self._updateCartCountText();

          // If cart is empty, show empty state
          if (cart.item_count === 0) {
            self._renderEmptyState();
          }
        })
        .catch(function (error) {
          console.error('[Sallety] Fallback refresh error:', error);
        });
    },

    /**
     * Update cart count text in header
     */
    _updateCartCountText: function () {
      var self = this;

      Sallety.cart.get()
        .then(function (cart) {
          var countTextEl = self.drawer.querySelector('[data-cart-count-text]');
          if (countTextEl) {
            var countText = cart.item_count === 0
              ? (window.cartStrings?.empty || 'لا توجد منتجات')
              : (cart.item_count === 1
                ? (window.cartStrings?.one_item || 'منتج واحد')
                : (window.cartStrings?.items || '[count] منتجات').replace('[count]', cart.item_count));
            countTextEl.textContent = countText;
          }
        });
    },

    /**
     * Render empty cart state
     */
    _renderEmptyState: function () {
      if (!this.content) return;

      var emptyHtml = '<div class="flex flex-col items-center justify-center h-full px-5 py-12 text-center">' +
        '<div class="w-24 h-24 rounded-full bg-border/30 flex items-center justify-center mb-6">' +
        '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-secondary">' +
        '<circle cx="9" cy="21" r="1"></circle>' +
        '<circle cx="20" cy="21" r="1"></circle>' +
        '<path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>' +
        '</svg>' +
        '</div>' +
        '<h3 class="text-lg font-semibold text-foreground mb-2">' + (window.cartStrings?.empty || 'سلة التسوق فارغة') + '</h3>' +
        '<p class="text-sm text-secondary mb-6 max-w-[250px]">' + (window.cartStrings?.empty_description || 'لم تقم بإضافة أي منتجات إلى سلة التسوق بعد') + '</p>' +
        '<a href="' + (window.routes?.all_products_collection_url || '/collections/all') + '" class="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-white font-medium hover:bg-primary/90 transition-all duration-200 shadow-lg shadow-primary/25">' +
        '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>' +
        '<line x1="3" y1="6" x2="21" y2="6"></line>' +
        '<path d="M16 10a4 4 0 0 1-8 0"></path>' +
        '</svg>' +
        (window.cartStrings?.continue_shopping || 'متابعة التسوق') +
        '</a>' +
        '</div>';

      this.content.innerHTML = emptyHtml;

      // Hide footer when cart is empty
      var footer = this.drawer.querySelector('.flex-shrink-0.border-t');
      if (footer) {
        footer.style.display = 'none';
      }
    },

    /**
     * Show error message
     * @param {string} message - Error message
     */
    _showError: function (message) {
      console.error('[Sallety] Cart Error:', message);

      // Use toast notification if available
      if (window.Sallety && window.Sallety.toast) {
        window.Sallety.toast.show(message, 'error');
        return;
      }

      // Fallback: Show inline error in cart drawer
      var existingError = this.drawer.querySelector('.cart-drawer-error');
      if (existingError) {
        existingError.remove();
      }

      var errorHtml = '<div class="cart-drawer-error fixed top-4 left-4 right-4 z-[1001] bg-error text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">' +
        '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<circle cx="12" cy="12" r="10"></circle>' +
        '<line x1="12" y1="8" x2="12" y2="12"></line>' +
        '<line x1="12" y1="16" x2="12.01" y2="16"></line>' +
        '</svg>' +
        '<span class="text-sm font-medium flex-1">' + message + '</span>' +
        '<button type="button" class="hover:opacity-70 transition-opacity" onclick="this.parentElement.remove()">' +
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<line x1="18" y1="6" x2="6" y2="18"></line>' +
        '<line x1="6" y1="6" x2="18" y2="18"></line>' +
        '</svg>' +
        '</button>' +
        '</div>';

      this.drawer.insertAdjacentHTML('afterbegin', errorHtml);

      // Auto-remove after 5 seconds
      setTimeout(function () {
        var error = document.querySelector('.cart-drawer-error');
        if (error) {
          error.style.opacity = '0';
          setTimeout(function () { error.remove(); }, 300);
        }
      }, 5000);
    },

    /**
     * Open cart drawer
     */
    open: function () {
      Sallety.drawer.open('cart-drawer');
    },

    /**
     * Close cart drawer
     */
    close: function () {
      Sallety.drawer.close('cart-drawer');
    }
  };

  // ============================================================================
  // QUICK VIEW MODAL
  // ============================================================================

  /**
   * Quick View Modal Module
   * Handles the quick view modal with full product details
   */
  Sallety.quickView = {
    modal: null,
    overlay: null,
    content: null,
    loading: null,
    currentProduct: null,
    currentVariant: null,
    currentTrigger: null,

    /**
     * Initialize the quick view modal
     */
    init: function () {
      this.modal = document.getElementById('quick-view-modal');
      if (!this.modal) return;

      this.overlay = this.modal.querySelector('.quick-view-modal__overlay');
      this.content = this.modal.querySelector('[data-quick-view-content]');
      this.loading = this.modal.querySelector('[data-quick-view-loading]');

      this._bindEvents();
    },

    /**
     * Bind event listeners
     */
    _bindEvents: function () {
      var self = this;

      // Quick view trigger buttons
      document.addEventListener('click', function (e) {
        var trigger = e.target.closest('[data-quick-view]');
        if (trigger) {
          e.preventDefault();
          e.stopPropagation();
          var handle = trigger.dataset.quickView;
          if (handle) {
            self.open(handle, trigger);
          }
        }

        // Close button
        var closeBtn = e.target.closest('[data-quick-view-close]');
        if (closeBtn) {
          self.close();
        }
      });

      // Escape key to close
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && self.modal && self.modal.classList.contains('is-open')) {
          self.close();
        }
      });
    },

    /**
     * Open the quick view modal
     * @param {string} handle - Product handle
     * @param {HTMLElement} trigger - The button that triggered the modal
     */
    open: function (handle, trigger) {
      if (!this.modal || !handle) return;

      var self = this;

      this.currentTrigger = trigger || null;
      if (this.currentTrigger) {
        this.currentTrigger.classList.add('is-loading');
      }

      this.modal.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      this._showLoading();

      this._fetchProduct(handle)
        .then(function (product) {
          if (!product || !product.id) {
            console.error('[Sallety] Invalid product data:', product);
            throw new Error('Invalid product data received');
          }
          self.currentProduct = product;
          self.currentVariant = self._getFirstAvailableVariant(product);

          try {
            self._renderProduct(product, handle);
          } catch (renderError) {
            console.error('[Sallety] Quick view render error:', renderError);
            throw new Error('render_failed');
          }

          self._hideLoading();
          self._clearTriggerLoading();
        })
        .catch(function (error) {
          console.error('[Sallety] Quick view error:', error);
          self._clearTriggerLoading();
          self._hideLoading();

          if (self.content) {
            self.content.innerHTML = '<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 300px; padding: 40px; text-align: center;">' +
              '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: #ef4444; margin-bottom: 16px;"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>' +
              '<p style="font-size: 16px; font-weight: 500; color: #374151; margin-bottom: 8px;">عذراً، حدث خطأ</p>' +
              '<p style="font-size: 14px; color: #6b7280;">لم نتمكن من تحميل تفاصيل المنتج</p>' +
              '</div>';
            self.content.classList.add('is-visible');
          }
        });
    },

    /**
     * Clear loading state from trigger button
     */
    _clearTriggerLoading: function () {
      if (this.currentTrigger) {
        this.currentTrigger.classList.remove('is-loading');
        this.currentTrigger = null;
      }
    },

    /**
     * Close the quick view modal
     */
    close: function () {
      if (!this.modal) return;

      this.modal.classList.remove('is-open');
      document.body.style.overflow = '';
      this.currentProduct = null;
      this.currentVariant = null;
      this._clearTriggerLoading();

      // Reset content
      if (this.content) {
        this.content.innerHTML = '';
        this.content.classList.remove('is-visible');
      }
    },

    /**
     * Show loading state
     */
    _showLoading: function () {
      if (this.loading) {
        this.loading.classList.remove('hidden');
      }
      if (this.content) {
        this.content.classList.remove('is-visible');
      }
    },

    /**
     * Hide loading state
     */
    _hideLoading: function () {
      if (this.loading) {
        this.loading.classList.add('hidden');
      }
      if (this.content) {
        this.content.classList.add('is-visible');
      }
    },

    /**
     * Fetch product data from Shopify
     * @param {string} handle - Product handle
     * @returns {Promise<Object>} Product data
     */
    _fetchProduct: function (handle) {
      var root = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
      // Ensure root ends with /
      if (root.charAt(root.length - 1) !== '/') {
        root = root + '/';
      }
      var encodedHandle = encodeURIComponent(handle);
      var jsUrl = root + 'products/' + encodedHandle + '.js';

      console.log('[Sallety] Quick view fetching product:', jsUrl);

      return fetch(jsUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      })
        .then(function (response) {
          console.log('[Sallety] Quick view fetch response status:', response.status, 'url:', response.url);
          if (!response.ok) {
            throw new Error('Product not found (' + response.status + ')');
          }
          // Check if we got redirected (e.g., to password page)
          var contentType = response.headers.get('content-type');
          if (contentType && contentType.indexOf('application/json') === -1 && contentType.indexOf('text/javascript') === -1) {
            console.warn('[Sallety] Unexpected content type:', contentType);
          }
          return response.text();
        })
        .then(function (text) {
          try {
            var data = JSON.parse(text);
            return data;
          } catch (parseError) {
            console.error('[Sallety] Failed to parse product JSON. Response text (first 200 chars):', text.substring(0, 200));
            throw new Error('Invalid JSON response from product endpoint');
          }
        })
        .catch(function (jsError) {
          console.warn('[Sallety] .js endpoint failed:', jsError.message);
          // Try .json endpoint as fallback
          var jsonUrl = root + 'products/' + encodedHandle + '.json';
          return fetch(jsonUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'X-Requested-With': 'XMLHttpRequest'
            }
          })
            .then(function (response) {
              if (!response.ok) throw new Error('Product not found via .json (' + response.status + ')');
              return response.json();
            })
            .then(function (data) {
              return data.product || data;
            })
            .catch(function (jsonError) {
              console.error('[Sallety] Both .js and .json endpoints failed. .js error:', jsError.message, '.json error:', jsonError.message);
              // Final fallback: try Section Rendering API
              return fetch(root + 'products/' + encodedHandle, {
                headers: {
                  'X-Requested-With': 'XMLHttpRequest'
                }
              })
                .then(function (response) {
                  if (!response.ok) throw new Error('Product page not found (' + response.status + ')');
                  return response.text();
                })
                .then(function (html) {
                  // Extract product JSON from the page's script tag
                  var jsonMatch = html.match(/var\s+meta\s*=\s*(\{[\s\S]*?\});/) ||
                    html.match(/"product"\s*:\s*(\{[\s\S]*?\})\s*[,}]/);
                  if (jsonMatch) {
                    try {
                      var productData = JSON.parse(jsonMatch[1]);
                      if (productData.product) return productData.product;
                      return productData;
                    } catch (e) {
                      // Fall through
                    }
                  }
                  throw new Error('Could not extract product data from page');
                });
            });
        });
    },

    /**
     * Get first available variant
     * @param {Object} product - Product object
     * @returns {Object} First available variant or first variant
     */
    _getFirstAvailableVariant: function (product) {
      if (!product || !product.variants) return null;

      var available = product.variants.find(function (v) {
        return v.available;
      });

      return available || product.variants[0];
    },

    /**
     * Render product in the modal
     * @param {Object} product - Product object
     * @param {string} handle - Product handle for URL construction
     */
    _renderProduct: function (product, handle) {
      var self = this;
      var template = document.getElementById('quick-view-template');
      if (!template || !this.content) return;

      // Clone template
      var clone = template.content.cloneNode(true);
      var container = clone.querySelector('.quick-view-product');
      if (!container) return;


      // Build carousel slides
      var carouselTrack = container.querySelector('[data-qv-carousel-track]');
      var navArrows = container.querySelector('[data-qv-nav-arrows]');
      var dotsContainer = container.querySelector('[data-qv-dots]');
      var counterEl = container.querySelector('[data-qv-counter]');
      var counterCurrentEl = container.querySelector('[data-qv-counter-current]');
      var counterTotalEl = container.querySelector('[data-qv-counter-total]');

      if (carouselTrack && product.images && product.images.length > 0) {
        // Create slides
        product.images.forEach(function (image, index) {
          var slide = document.createElement('div');
          slide.className = 'quick-view-product__slide' + (index === 0 ? ' is-active' : '');
          slide.dataset.qvSlide = '';
          slide.dataset.index = index;

          var img = document.createElement('img');
          img.src = self._getSizedImageUrl(image, '800x');
          img.alt = (product.title || '') + ' - ' + (index + 1);
          img.width = 800;
          img.height = 800;
          img.loading = index === 0 ? 'eager' : 'lazy';
          slide.appendChild(img);
          carouselTrack.appendChild(slide);
        });

        // Show navigation elements if multiple images
        if (product.images.length > 1) {
          // Show nav arrows
          if (navArrows) {
            navArrows.classList.remove('hidden');
            var prevBtn = container.querySelector('[data-qv-prev]');
            var nextBtn = container.querySelector('[data-qv-next]');

            if (prevBtn) {
              prevBtn.addEventListener('click', function () {
                self._qvGoToSlide(container, self._qvCurrentIndex - 1, product.images.length);
              });
            }
            if (nextBtn) {
              nextBtn.addEventListener('click', function () {
                self._qvGoToSlide(container, self._qvCurrentIndex + 1, product.images.length);
              });
            }
          }

          // Build dots
          if (dotsContainer) {
            dotsContainer.classList.remove('hidden');
            product.images.forEach(function (image, index) {
              var dot = document.createElement('button');
              dot.type = 'button';
              dot.className = 'quick-view-product__dot' + (index === 0 ? ' is-active' : '');
              dot.dataset.qvDotIndex = index;
              dot.addEventListener('click', function () {
                self._qvGoToSlide(container, index, product.images.length);
              });
              dotsContainer.appendChild(dot);
            });
          }

          // Show counter
          if (counterEl && counterCurrentEl && counterTotalEl) {
            counterEl.classList.remove('hidden');
            counterCurrentEl.textContent = '1';
            counterTotalEl.textContent = product.images.length;
          }

          // Setup touch swipe on carousel
          var carouselEl = container.querySelector('[data-qv-carousel]');
          this._setupQvSwipe(carouselEl, container, product.images.length);
        }
      }

      // Set badge (sale)
      var badgeContainer = container.querySelector('[data-qv-badge]');
      var badgeText = container.querySelector('[data-qv-badge-text]');
      if (badgeContainer && badgeText && this.currentVariant) {
        if (this.currentVariant.compare_at_price && this.currentVariant.compare_at_price > this.currentVariant.price) {
          var discount = Math.round((1 - this.currentVariant.price / this.currentVariant.compare_at_price) * 100);
          badgeText.textContent = '-' + discount + '%';
          badgeContainer.classList.remove('hidden');
        }
      }

      // Build thumbnails
      if (product.images && product.images.length > 1) {
        var thumbsStrip = container.querySelector('[data-qv-thumbs-strip]');
        var thumbsTrack = container.querySelector('[data-qv-thumbs-track]');
        if (thumbsStrip && thumbsTrack) {
          thumbsStrip.classList.remove('hidden');

          product.images.forEach(function (image, index) {
            var thumbBtn = document.createElement('button');
            thumbBtn.type = 'button';
            thumbBtn.className = 'quick-view-thumb' + (index === 0 ? ' is-active' : '');
            thumbBtn.dataset.qvThumbIndex = index;

            var thumbImg = document.createElement('img');
            thumbImg.src = self._getSizedImageUrl(image, '100x');
            thumbImg.alt = (product.title || '') + ' - ' + (index + 1);
            thumbImg.width = 60;
            thumbImg.height = 60;
            thumbImg.loading = 'lazy';
            thumbBtn.appendChild(thumbImg);

            thumbBtn.addEventListener('click', function () {
              self._qvGoToSlide(container, index, product.images.length);
            });

            thumbsTrack.appendChild(thumbBtn);
          });

          // Thumbnail scroll buttons
          var thumbPrevBtn = container.querySelector('[data-qv-thumb-prev]');
          var thumbNextBtn = container.querySelector('[data-qv-thumb-next]');

          if (thumbPrevBtn) {
            thumbPrevBtn.addEventListener('click', function () {
              var scrollAmount = 140;
              var isRTL = document.documentElement.dir === 'rtl';
              thumbsTrack.scrollLeft += -1 * scrollAmount * (isRTL ? -1 : 1);
              setTimeout(function () { self._updateQvThumbScrollState(container); }, 100);
            });
          }

          if (thumbNextBtn) {
            thumbNextBtn.addEventListener('click', function () {
              var scrollAmount = 140;
              var isRTL = document.documentElement.dir === 'rtl';
              thumbsTrack.scrollLeft += 1 * scrollAmount * (isRTL ? -1 : 1);
              setTimeout(function () { self._updateQvThumbScrollState(container); }, 100);
            });
          }

          // Auto-update scroll button state
          thumbsTrack.addEventListener('scroll', function () {
            self._updateQvThumbScrollState(container);
          }, { passive: true });

          // Initial check
          setTimeout(function () { self._updateQvThumbScrollState(container); }, 100);
        }
      }

      // Initialize carousel index
      this._qvCurrentIndex = 0;

      // Set vendor
      var vendorEl = container.querySelector('[data-qv-vendor]');
      if (vendorEl && product.vendor) {
        vendorEl.textContent = product.vendor;
        vendorEl.classList.remove('hidden');
      }

      // Set title
      var titleEl = container.querySelector('[data-qv-title]');
      if (titleEl) {
        titleEl.textContent = product.title || '';
      }

      // Set price
      this._updatePrice(container, this.currentVariant);

      // Set availability
      this._updateAvailability(container, this.currentVariant);

      // Set description
      var descEl = container.querySelector('[data-qv-description]');
      if (descEl && product.description) {
        descEl.innerHTML = this._truncateHtml(product.description, 200);
        descEl.classList.remove('hidden');
      }

      // Set variants
      if (product.variants && product.variants.length > 0 &&
        (product.variants.length > 1 || (product.variants[0].title && !product.variants[0].title.includes('Default')))) {
        this._renderVariants(container, product);
      }

      // Set form data
      var variantInput = container.querySelector('[data-qv-variant-id]');
      if (variantInput && this.currentVariant) {
        variantInput.value = this.currentVariant.id;
      }

      // Set view details link - construct URL from handle if product.url is not available
      var viewDetailsLink = container.querySelector('[data-qv-view-details]');
      if (viewDetailsLink) {
        var root = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
        if (root.charAt(root.length - 1) !== '/') root = root + '/';
        viewDetailsLink.href = product.url || (root + 'products/' + (handle || product.handle || ''));
      }

      // Bind form events
      this._bindFormEvents(container, product);

      // Clear and append content
      this.content.innerHTML = '';
      this.content.appendChild(clone);
    },

    /**
     * Render variant options
     * @param {HTMLElement} container - Container element
     * @param {Object} product - Product object
     */
    _renderVariants: function (container, product) {
      var self = this;
      var variantsContainer = container.querySelector('[data-qv-variants]');
      if (!variantsContainer) return;

      var optionTemplate = document.getElementById('quick-view-variant-option-template');
      var colorSwatchTemplate = document.getElementById('quick-view-color-swatch-template');
      var buttonSwatchTemplate = document.getElementById('quick-view-button-swatch-template');

      if (!optionTemplate) return;

      // Color keywords for detecting color options
      var colorKeywords = ['color', 'colour', 'لون', 'اللون'];

      product.options.forEach(function (option, optionIndex) {
        // Handle both formats: options can be strings ("Color") or objects ({name: "Color", position: 1, values: [...]})
        var optionName = (typeof option === 'object' && option !== null) ? (option.name || option) : option;
        // Ensure optionName is a string
        optionName = String(optionName);

        var optionClone = optionTemplate.content.cloneNode(true);
        var optionEl = optionClone.querySelector('.quick-view-variant-option');
        var nameEl = optionClone.querySelector('[data-option-name]');
        var selectedValueEl = optionClone.querySelector('[data-selected-value]');
        var valuesContainer = optionClone.querySelector('[data-option-values]');

        if (!optionEl || !nameEl || !selectedValueEl || !valuesContainer) return;

        optionEl.dataset.optionIndex = optionIndex;
        nameEl.textContent = optionName;

        // Get unique values for this option
        // First try to get values from the option object itself (if available from .js API)
        var values = [];
        var seenValues = {};
        if (typeof option === 'object' && option !== null && Array.isArray(option.values)) {
          values = option.values;
        } else {
          // Fallback: extract unique values from variants
          product.variants.forEach(function (variant) {
            var value = variant.options[optionIndex];
            if (value && !seenValues[value]) {
              seenValues[value] = true;
              values.push(value);
            }
          });
        }

        // Determine if this is a color option
        var isColorOption = colorKeywords.some(function (keyword) {
          return optionName.toLowerCase().includes(keyword.toLowerCase());
        });

        // Get current selected value
        var currentValue = self.currentVariant ? self.currentVariant.options[optionIndex] : values[0];
        selectedValueEl.textContent = currentValue;

        // Render option values
        values.forEach(function (value) {
          var swatchTemplate = isColorOption ? colorSwatchTemplate : buttonSwatchTemplate;
          if (!swatchTemplate) return;

          var swatchClone = swatchTemplate.content.cloneNode(true);
          var label = swatchClone.querySelector('label');
          var input = swatchClone.querySelector('input');
          var swatch = swatchClone.querySelector('span');

          if (!label || !input || !swatch) return;

          label.dataset.optionValue = value;
          input.name = 'option' + (optionIndex + 1);
          input.value = value;

          if (value === currentValue) {
            input.checked = true;
          }

          // Check if this option value is available
          var isAvailable = product.variants.some(function (variant) {
            return variant.options[optionIndex] === value && variant.available;
          });

          if (!isAvailable) {
            input.disabled = true;
          }

          if (isColorOption) {
            // Set color swatch background
            var colorValue = self._getColorValue(value);
            swatch.style.backgroundColor = colorValue;
            swatch.title = value;
            swatch.classList.add('color-swatch');

            // Add white border for light colors
            if (self._isLightColor(colorValue)) {
              swatch.style.boxShadow = 'inset 0 0 0 1px rgba(0,0,0,0.1)';
            }
          } else {
            swatch.textContent = value;
            swatch.classList.add('button-swatch');
          }

          // Add change event
          input.addEventListener('change', function () {
            self._onVariantChange(container, product, optionIndex, value);
          });

          valuesContainer.appendChild(swatchClone);
        });

        variantsContainer.appendChild(optionClone);
      });

      variantsContainer.classList.remove('hidden');
    },

    /**
     * Handle variant change
     * @param {HTMLElement} container - Container element
     * @param {Object} product - Product object
     * @param {number} optionIndex - Changed option index
     * @param {string} value - New value
     */
    _onVariantChange: function (container, product, optionIndex, value) {
      var self = this;

      // Get all selected options
      var selectedOptions = [];
      container.querySelectorAll('[data-qv-variants] [data-option]').forEach(function (optionEl, index) {
        var checkedInput = optionEl.querySelector('input:checked');
        if (checkedInput) {
          selectedOptions[index] = checkedInput.value;
        }
      });

      // Find matching variant
      var matchingVariant = product.variants.find(function (variant) {
        return variant.options.every(function (opt, i) {
          return opt === selectedOptions[i];
        });
      });

      if (matchingVariant) {
        this.currentVariant = matchingVariant;

        // Update variant ID
        var variantInput = container.querySelector('[data-qv-variant-id]');
        if (variantInput) {
          variantInput.value = matchingVariant.id;
        }

        // Update price
        this._updatePrice(container, matchingVariant);

        // Update availability
        this._updateAvailability(container, matchingVariant);

        // Update selected value display
        container.querySelectorAll('[data-qv-variants] [data-option]').forEach(function (optionEl, index) {
          var selectedValueEl = optionEl.querySelector('[data-selected-value]');
          if (selectedValueEl) {
            selectedValueEl.textContent = selectedOptions[index];
          }
        });

        // Update image if variant has featured image
        if (matchingVariant.featured_image) {
          var imageIndex = product.images.findIndex(function (img) {
            return img === matchingVariant.featured_image.src;
          });
          this._qvGoToSlide(container, imageIndex >= 0 ? imageIndex : 0, product.images.length);
        }

        // Update badge
        var badgeContainer = container.querySelector('[data-qv-badge]');
        var badgeText = container.querySelector('[data-qv-badge-text]');
        if (badgeContainer && badgeText) {
          if (matchingVariant.compare_at_price && matchingVariant.compare_at_price > matchingVariant.price) {
            var discount = Math.round((1 - matchingVariant.price / matchingVariant.compare_at_price) * 100);
            badgeText.textContent = '-' + discount + '%';
            badgeContainer.classList.remove('hidden');
          } else {
            badgeContainer.classList.add('hidden');
          }
        }
      }
    },

    /**
     * Update price display
     * @param {HTMLElement} container - Container element
     * @param {Object} variant - Variant object
     */
    _updatePrice: function (container, variant) {
      if (!variant) return;

      var priceEl = container.querySelector('[data-qv-price]');
      var comparePriceEl = container.querySelector('[data-qv-compare-price]');
      var discountEl = container.querySelector('[data-qv-discount]');

      if (priceEl) {
        priceEl.textContent = Sallety.utils.formatMoney(variant.price);
      }

      if (comparePriceEl) {
        if (variant.compare_at_price && variant.compare_at_price > variant.price) {
          comparePriceEl.textContent = Sallety.utils.formatMoney(variant.compare_at_price);
          comparePriceEl.classList.remove('hidden');
        } else {
          comparePriceEl.classList.add('hidden');
        }
      }

      if (discountEl) {
        if (variant.compare_at_price && variant.compare_at_price > variant.price) {
          var discount = Math.round((1 - variant.price / variant.compare_at_price) * 100);
          discountEl.textContent = '-' + discount + '%';
          discountEl.classList.remove('hidden');
        } else {
          discountEl.classList.add('hidden');
        }
      }
    },

    /**
     * Update availability display
     * @param {HTMLElement} container - Container element
     * @param {Object} variant - Variant object
     */
    _updateAvailability: function (container, variant) {
      if (!variant) return;

      var availabilityEl = container.querySelector('[data-qv-availability]');
      var dotEl = container.querySelector('[data-qv-availability-dot]');
      var textEl = container.querySelector('[data-qv-availability-text]');
      var addToCartBtn = container.querySelector('[data-qv-add-to-cart]');
      var buyNowBtn = container.querySelector('[data-qv-buy-now]');
      var addToCartText = container.querySelector('[data-add-to-cart-text]');

      if (!availabilityEl) return;

      // Remove all status classes
      availabilityEl.classList.remove('in-stock', 'low-stock', 'out-of-stock');

      if (variant.available) {
        if (variant.inventory_quantity && variant.inventory_quantity <= 5) {
          availabilityEl.classList.add('low-stock');
          textEl.textContent = window.variantStrings?.lowStock || 'مخزون منخفض - ' + variant.inventory_quantity + ' متبقي';
        } else {
          availabilityEl.classList.add('in-stock');
          textEl.textContent = window.variantStrings?.inStock || 'متوفر';
        }

        if (addToCartBtn) {
          addToCartBtn.disabled = false;
          if (addToCartText) {
            addToCartText.textContent = window.variantStrings?.addToCart || 'أضف إلى السلة';
          }
        }
        if (buyNowBtn) {
          buyNowBtn.disabled = false;
        }
      } else {
        availabilityEl.classList.add('out-of-stock');
        textEl.textContent = window.variantStrings?.soldOut || 'نفذت الكمية';

        if (addToCartBtn) {
          addToCartBtn.disabled = true;
          if (addToCartText) {
            addToCartText.textContent = window.variantStrings?.soldOut || 'نفذت الكمية';
          }
        }
        if (buyNowBtn) {
          buyNowBtn.disabled = true;
        }
      }
    },

    /**
     * Current carousel index for quick view
     */
    _qvCurrentIndex: 0,

    /**
     * Go to a specific slide in the quick view carousel
     * @param {HTMLElement} container - Container element
     * @param {number} index - Target slide index
     * @param {number} totalSlides - Total number of slides
     */
    _qvGoToSlide: function (container, index, totalSlides) {
      if (!container || totalSlides === 0) return;

      // Wrap around
      if (index < 0) index = totalSlides - 1;
      if (index >= totalSlides) index = 0;

      this._qvCurrentIndex = index;

      // Update slides
      var slides = container.querySelectorAll('[data-qv-slide]');
      slides.forEach(function (slide) { slide.classList.remove('is-active'); });
      if (slides[index]) slides[index].classList.add('is-active');

      // Update dots
      var dots = container.querySelectorAll('[data-qv-dot-index]');
      dots.forEach(function (dot) { dot.classList.remove('is-active'); });
      if (dots[index]) dots[index].classList.add('is-active');

      // Update thumbnails
      var thumbs = container.querySelectorAll('[data-qv-thumb-index]');
      thumbs.forEach(function (thumb) { thumb.classList.remove('is-active'); });
      if (thumbs[index]) {
        thumbs[index].classList.add('is-active');
        thumbs[index].scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
      }

      // Update counter
      var counterCurrent = container.querySelector('[data-qv-counter-current]');
      if (counterCurrent) counterCurrent.textContent = index + 1;

      // Update thumbnail scroll state
      this._updateQvThumbScrollState(container);
    },

    /**
     * Setup touch/swipe support for quick view carousel
     * @param {HTMLElement} carouselEl - The carousel element
     * @param {HTMLElement} container - The container element
     * @param {number} totalSlides - Total number of slides
     */
    _setupQvSwipe: function (carouselEl, container, totalSlides) {
      if (!carouselEl) return;

      var self = this;
      var startX = 0;
      var startY = 0;

      carouselEl.addEventListener('touchstart', function (e) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      }, { passive: true });

      carouselEl.addEventListener('touchend', function (e) {
        var endX = e.changedTouches[0].clientX;
        var endY = e.changedTouches[0].clientY;
        var diffX = endX - startX;
        var diffY = endY - startY;

        // Only trigger if horizontal swipe is dominant and significant
        if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) {
          var isRTL = document.documentElement.dir === 'rtl';
          if (diffX < 0) {
            // Swiped left
            self._qvGoToSlide(container, self._qvCurrentIndex + (isRTL ? -1 : 1), totalSlides);
          } else {
            // Swiped right
            self._qvGoToSlide(container, self._qvCurrentIndex + (isRTL ? 1 : -1), totalSlides);
          }
        }
      }, { passive: true });
    },

    /**
     * Update thumbnail scroll button disabled states for quick view
     * @param {HTMLElement} container - The container element
     */
    _updateQvThumbScrollState: function (container) {
      var thumbsTrack = container.querySelector('[data-qv-thumbs-track]');
      var prevBtn = container.querySelector('[data-qv-thumb-prev]');
      var nextBtn = container.querySelector('[data-qv-thumb-next]');

      if (!thumbsTrack || !prevBtn || !nextBtn) return;

      var isRTL = document.documentElement.dir === 'rtl';
      var scrollLeft = Math.abs(thumbsTrack.scrollLeft);
      var maxScroll = thumbsTrack.scrollWidth - thumbsTrack.clientWidth;

      if (maxScroll <= 2) {
        // Not scrollable
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        return;
      }

      if (isRTL) {
        prevBtn.disabled = scrollLeft >= maxScroll - 2;
        nextBtn.disabled = scrollLeft <= 2;
      } else {
        prevBtn.disabled = scrollLeft <= 2;
        nextBtn.disabled = scrollLeft >= maxScroll - 2;
      }
    },

    /**
     * Bind form events
     * @param {HTMLElement} container - Container element
     * @param {Object} product - Product object
     */
    _bindFormEvents: function (container, product) {
      var self = this;
      var form = container.querySelector('[data-qv-form]');
      var addToCartBtn = container.querySelector('[data-qv-add-to-cart]');
      var buyNowBtn = container.querySelector('[data-qv-buy-now]');

      if (!form) return;

      // Add to cart
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        self._addToCart(form, addToCartBtn);
      });

      // Buy now
      if (buyNowBtn) {
        buyNowBtn.addEventListener('click', function (e) {
          e.preventDefault();
          self._buyNow(form, buyNowBtn);
        });
      }

      // Quantity selector
      var quantitySelector = container.querySelector('[data-quantity-selector]');
      if (quantitySelector) {
        var minusBtn = quantitySelector.querySelector('[data-quantity-minus]');
        var plusBtn = quantitySelector.querySelector('[data-quantity-plus]');
        var input = quantitySelector.querySelector('[data-quantity-input]');

        if (minusBtn && input) {
          minusBtn.addEventListener('click', function () {
            var value = parseInt(input.value) || 1;
            if (value > 1) {
              input.value = value - 1;
            }
          });
        }

        if (plusBtn && input) {
          plusBtn.addEventListener('click', function () {
            var value = parseInt(input.value) || 1;
            var max = parseInt(input.max) || 9999;
            if (value < max) {
              input.value = value + 1;
            }
          });
        }
      }
    },

    /**
     * Add to cart
     * @param {HTMLFormElement} form - Form element
     * @param {HTMLButtonElement} button - Submit button
     */
    _addToCart: function (form, button) {
      var self = this;
      if (!form || !this.currentVariant) return;

      var formData = new FormData(form);

      // Set loading state
      if (button) {
        button.classList.add('is-loading');
        button.disabled = true;
      }

      // Show loading on cart icon
      Sallety.cart.setIconLoading();

      fetch((window.routes && window.routes.cart_add_url ? window.routes.cart_add_url : '/cart/add') + '.js', {
        method: 'POST',
        body: formData
      })
        .then(function (response) {
          if (!response.ok) {
            return response.json().then(function (data) {
              throw new Error(data.description || 'Add to cart failed');
            });
          }
          return response.json();
        })
        .then(function () {
          return Sallety.cart.get();
        })
        .then(function (cart) {
          Sallety.cart.updateCount(cart.item_count);

          self.close();

          var cartDrawer = document.querySelector('#cart-drawer');
          if (cartDrawer) {
            Sallety.drawer.open('cart-drawer');
          }

          // Dispatch event
          Sallety.utils.dispatchEvent(EVENTS.CART_UPDATED, cart);
        })
        .catch(function (error) {
          console.error('[Sallety] Add to cart error:', error);
          alert(error.message || 'Unable to add to cart. Please try again.');
        })
        .finally(function () {
          if (button) {
            button.classList.remove('is-loading');
            button.disabled = false;
          }
          // Clear cart icon loading
          Sallety.cart.clearIconLoading();
        });
    },

    /**
     * Buy now - add to cart and redirect to checkout
     * @param {HTMLFormElement} form - Form element
     * @param {HTMLButtonElement} button - Buy now button
     */
    _buyNow: function (form, button) {
      var self = this;
      if (!form || !this.currentVariant) return;

      var formData = new FormData(form);

      // Set loading state
      if (button) {
        button.classList.add('is-loading');
        button.disabled = true;
      }

      fetch((window.routes && window.routes.cart_add_url ? window.routes.cart_add_url : '/cart/add') + '.js', {
        method: 'POST',
        body: formData
      })
        .then(function (response) {
          if (!response.ok) {
            return response.json().then(function (data) {
              throw new Error(data.description || 'Add to cart failed');
            });
          }
          return response.json();
        })
        .then(function () {
          window.location.href = '/checkout';
        })
        .catch(function (error) {
          console.error('[Sallety] Buy now error:', error);
          alert(error.message || 'Unable to proceed to checkout. Please try again.');

          if (button) {
            button.classList.remove('is-loading');
            button.disabled = false;
          }
        });
    },

    /**
     * Get sized image URL
     * @param {string} url - Original image URL
     * @param {string} size - Size string (e.g., '800x')
     * @returns {string} Sized image URL
     */
    _getSizedImageUrl: function (url, size) {
      if (!url) return '';

      // Handle Shopify CDN URLs
      if (url.includes('cdn.shopify.com')) {
        return url.replace(/(_\d+x\d*|\d+x\d*_)?(\.[^.]+)$/, '_' + size + '$2');
      }

      return url;
    },

    /**
     * Get color value from color name
     * @param {string} colorName - Color name
     * @returns {string} Color value (hex or name)
     */
    _getColorValue: function (colorName) {
      var colorMap = {
        'black': '#000000', 'أسود': '#000000',
        'white': '#ffffff', 'أبيض': '#ffffff',
        'red': '#dc2626', 'أحمر': '#dc2626',
        'blue': '#2563eb', 'أزرق': '#2563eb',
        'green': '#16a34a', 'أخضر': '#16a34a',
        'yellow': '#eab308', 'أصفر': '#eab308',
        'orange': '#ea580c', 'برتقالي': '#ea580c',
        'purple': '#9333ea', 'بنفسجي': '#9333ea',
        'pink': '#ec4899', 'وردي': '#ec4899',
        'brown': '#92400e', 'بني': '#92400e',
        'gray': '#6b7280', 'grey': '#6b7280', 'رمادي': '#6b7280',
        'navy': '#1e3a5f', 'كحلي': '#1e3a5f',
        'beige': '#d4b896', 'بيج': '#d4b896',
        'cream': '#fffdd0', 'كريمي': '#fffdd0',
        'olive': '#556b2f', 'زيتي': '#556b2f',
        'burgundy': '#800020', 'عنابي': '#800020'
      };

      var lowerName = colorName.toLowerCase().replace(/\s/g, '');
      return colorMap[lowerName] || colorName;
    },

    /**
     * Check if a color is light
     * @param {string} color - Color value
     * @returns {boolean} True if light
     */
    _isLightColor: function (color) {
      // Simple check for common light colors
      var lightColors = ['#ffffff', '#fffdd0', '#d4b896', '#f5f5f5', 'white', 'cream', 'beige'];
      return lightColors.includes(color.toLowerCase());
    },

    /**
     * Truncate HTML string
     * @param {string} html - HTML string
     * @param {number} maxLength - Maximum length
     * @returns {string} Truncated string
     */
    _truncateHtml: function (html, maxLength) {
      // Strip HTML tags for length calculation
      var div = document.createElement('div');
      div.innerHTML = html;
      var text = div.textContent || div.innerText || '';

      if (text.length <= maxLength) {
        return html;
      }

      return text.substring(0, maxLength) + '...';
    }
  };

  // ============================================================================
  // CART PAGE MODULE
  // ============================================================================

  /**
   * Cart Page Module
   * Handles cart page functionality including item removal, quantity updates,
   * and AJAX re-rendering for the main cart page
   */
  Sallety.cartPage = {
    section: null,
    itemsContainer: null,
    isUpdating: false,

    /**
     * Initialize the cart page
     */
    init: function () {
      this.section = document.querySelector('[data-section-type="cart"]');
      if (!this.section) return;

      this.itemsContainer = this.section.querySelector('[data-cart-items]');
      this._bindEvents();
    },

    /**
     * Bind event listeners
     */
    _bindEvents: function () {
      var self = this;

      // Use event delegation for all cart page interactions
      document.addEventListener('click', function (e) {
        // Remove item
        var removeBtn = e.target.closest('[data-cart-remove]');
        if (removeBtn && self._isInCartPage(removeBtn)) {
          e.preventDefault();
          var line = parseInt(removeBtn.dataset.cartRemove, 10);
          if (line) {
            self.removeItem(line);
          }
          return;
        }

        // Quantity minus
        var minusBtn = e.target.closest('[data-quantity-minus][data-line]');
        if (minusBtn && self._isInCartPage(minusBtn)) {
          e.preventDefault();
          var line = parseInt(minusBtn.dataset.line, 10);
          var input = minusBtn.closest('[data-quantity-selector]').querySelector('[data-quantity-input]');
          var currentQty = parseInt(input.value, 10) || 1;
          if (currentQty > 1) {
            self.updateQuantity(line, currentQty - 1);
          }
          return;
        }

        // Quantity plus
        var plusBtn = e.target.closest('[data-quantity-plus][data-line]');
        if (plusBtn && self._isInCartPage(plusBtn)) {
          e.preventDefault();
          var line = parseInt(plusBtn.dataset.line, 10);
          var input = plusBtn.closest('[data-quantity-selector]').querySelector('[data-quantity-input]');
          var currentQty = parseInt(input.value, 10) || 1;
          self.updateQuantity(line, currentQty + 1);
          return;
        }
      });

      // Quantity input change
      document.addEventListener('change', function (e) {
        var input = e.target.closest('[data-quantity-input][data-line]');
        if (input && self._isInCartPage(input)) {
          var line = parseInt(input.dataset.line, 10);
          var newQty = parseInt(input.value, 10) || 1;
          if (newQty < 1) newQty = 1;
          self.updateQuantity(line, newQty);
        }
      });

      // Cart note update (debounced)
      var noteInput = this.section.querySelector('[data-cart-note]');
      if (noteInput) {
        noteInput.addEventListener('change', function () {
          self.updateNote(noteInput.value);
        });
      }
    },

    /**
     * Check if element is inside cart page section
     * @param {HTMLElement} element - Element to check
     * @returns {boolean}
     */
    _isInCartPage: function (element) {
      return element.closest('[data-section-type="cart"]') !== null;
    },

    /**
     * Remove item from cart
     * @param {number} line - Line item index (1-based)
     */
    removeItem: function (line) {
      if (this.isUpdating) return;

      var self = this;
      var itemEl = this.section.querySelector('[data-cart-item][data-line="' + line + '"]');

      // Animate the item out immediately for a smooth experience
      if (itemEl) {
        itemEl.classList.add('is-removing');
        itemEl.style.pointerEvents = 'none';
        // After slide-out animation, collapse the height smoothly
        var itemHeight = itemEl.offsetHeight;
        itemEl.style.maxHeight = itemHeight + 'px';
        itemEl.style.overflow = 'hidden';

        // Wait for slide-out animation, then collapse
        setTimeout(function () {
          itemEl.style.maxHeight = '0px';
          itemEl.style.padding = '0';
          itemEl.style.margin = '0';
          itemEl.style.borderWidth = '0';
        }, 280); // slightly less than the slideOut animation duration (300ms)
      }

      this._updateCart({ line: line, quantity: 0 })
        .then(function (cart) {
          self._onCartUpdated(cart);
        })
        .catch(function (error) {
          console.error('[Sallety] Remove item error:', error);
          if (itemEl) {
            itemEl.classList.remove('is-removing');
            itemEl.style.opacity = '';
            itemEl.style.pointerEvents = '';
            itemEl.style.maxHeight = '';
            itemEl.style.overflow = '';
            itemEl.style.padding = '';
            itemEl.style.margin = '';
            itemEl.style.borderWidth = '';
          }
          self._showError(error.message || 'حدث خطأ أثناء حذف المنتج');
        });
    },

    /**
     * Update item quantity
     * @param {number} line - Line item index (1-based)
     * @param {number} quantity - New quantity
     */
    updateQuantity: function (line, quantity) {
      if (this.isUpdating) return;

      var self = this;
      var itemEl = this.section.querySelector('[data-cart-item][data-line="' + line + '"]');
      var input = itemEl ? itemEl.querySelector('[data-quantity-input]') : null;
      var previousQty = input ? parseInt(input.value, 10) : quantity;

      // Show loading state on item
      if (itemEl) {
        itemEl.classList.add('is-loading');
      }

      this._updateCart({ line: line, quantity: quantity })
        .then(function (cart) {
          self._onCartUpdated(cart);
        })
        .catch(function (error) {
          console.error('[Sallety] Update quantity error:', error);
          if (itemEl) {
            itemEl.classList.remove('is-loading');
          }
          // Revert input to previous value
          if (input) {
            input.value = previousQty;
          }
          self._showError(error.message || 'حدث خطأ أثناء تحديث الكمية');
        });
    },

    /**
     * Update cart note
     * @param {string} note - Cart note text
     */
    updateNote: function (note) {
      fetch(window.routes?.cart_update_url + '.js' || '/cart/update.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ note: note })
      })
        .then(function (response) {
          if (!response.ok) throw new Error('Failed to update note');
          return response.json();
        })
        .catch(function (error) {
          console.error('[Sallety] Update note error:', error);
        });
    },

    /**
     * Update cart via AJAX
     * @param {Object} data - Update data { line, quantity }
     * @returns {Promise<Object>} Updated cart
     */
    _updateCart: function (data) {
      var self = this;
      this.isUpdating = true;

      return fetch(window.routes?.cart_change_url + '.js' || '/cart/change.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(data)
      })
        .then(function (response) {
          if (!response.ok) {
            return response.json().then(function (err) {
              throw new Error(err.description || err.message || 'Cart update failed');
            });
          }
          return response.json();
        })
        .finally(function () {
          self.isUpdating = false;
        });
    },

    /**
     * Handle cart updated
     * @param {Object} cart - Updated cart object
     */
    _onCartUpdated: function (cart) {
      // Update cart count in header
      Sallety.cart.updateCount(cart.item_count);

      // Refresh cart page content via AJAX
      this.refresh();

      // Dispatch event
      Sallety.utils.dispatchEvent(EVENTS.CART_UPDATED, cart);
    },

    /**
     * Refresh cart page content via AJAX
     */
    refresh: function () {
      var self = this;
      var sectionId = this.section.dataset.sectionId;

      // Add loading state
      this.section.classList.add('is-loading');

      // Fetch fresh cart page HTML using the section
      var url = window.location.pathname + '?section_id=' + sectionId;

      fetch(url, {
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      })
        .then(function (response) {
          if (!response.ok) throw new Error('Failed to fetch cart');
          return response.text();
        })
        .then(function (html) {
          self._renderCartContent(html);
        })
        .catch(function (error) {
          console.error('[Sallety] Refresh cart error:', error);
          // Fallback: reload the page
          window.location.reload();
        })
        .finally(function () {
          self.section.classList.remove('is-loading');
        });
    },

    /**
     * Render cart content from HTML
     * @param {string} html - HTML string
     */
    _renderCartContent: function (html) {
      var parser = new DOMParser();
      var doc = parser.parseFromString(html, 'text/html');

      // Replace the entire section content
      var newSection = doc.querySelector('[data-section-type="cart"]');

      if (newSection && this.section) {
        this.section.innerHTML = newSection.innerHTML;

        // Re-cache references
        this.itemsContainer = this.section.querySelector('[data-cart-items]');

        // Re-bind cart note event
        var noteInput = this.section.querySelector('[data-cart-note]');
        if (noteInput) {
          var self = this;
          noteInput.addEventListener('change', function () {
            self.updateNote(noteInput.value);
          });
        }

        // Re-initialize discount code module after content refresh
        if (Sallety.discountCode) {
          Sallety.discountCode.init();
        }
      }
    },

    /**
     * Show error message
     * @param {string} message - Error message
     */
    _showError: function (message) {
      console.error('[Sallety] Cart Page Error:', message);

      // Use toast notification if available
      if (window.Sallety && window.Sallety.toast) {
        window.Sallety.toast.show(message, 'error');
        return;
      }

      // Fallback: Show inline error
      var existingError = this.section.querySelector('.cart-page-error');
      if (existingError) {
        existingError.remove();
      }

      var errorHtml = '<div class="cart-page-error fixed top-4 left-4 right-4 z-[100] bg-error text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in" dir="rtl">' +
        '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<circle cx="12" cy="12" r="10"></circle>' +
        '<line x1="12" y1="8" x2="12" y2="12"></line>' +
        '<line x1="12" y1="16" x2="12.01" y2="16"></line>' +
        '</svg>' +
        '<span class="text-sm font-medium flex-1">' + message + '</span>' +
        '<button type="button" class="hover:opacity-70 transition-opacity" onclick="this.parentElement.remove()">' +
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<line x1="18" y1="6" x2="6" y2="18"></line>' +
        '<line x1="6" y1="6" x2="18" y2="18"></line>' +
        '</svg>' +
        '</button>' +
        '</div>';

      document.body.insertAdjacentHTML('afterbegin', errorHtml);

      // Auto-remove after 5 seconds
      setTimeout(function () {
        var error = document.querySelector('.cart-page-error');
        if (error) {
          error.style.opacity = '0';
          setTimeout(function () { error.remove(); }, 300);
        }
      }, 5000);
    }
  };

  // ============================================================================
  // DISCOUNT CODE MODULE
  // ============================================================================

  /**
   * Discount Code Module
   * Handles discount code application on the cart page
   * Validates discount codes via Shopify's discount endpoint and handles all error cases.
   * The discount code is applied at checkout via URL parameter.
   */
  Sallety.discountCode = {
    STORAGE_KEY: 'sallety_discount_code',
    STORAGE_KEY_VALIDATED: 'sallety_discount_validated',
    wrapper: null,
    form: null,
    input: null,
    applyBtn: null,
    appliedDisplay: null,
    errorEl: null,
    successEl: null,
    spinner: null,
    btnText: null,
    currentCode: null,
    isValidated: false,
    infoEl: null,

    /**
     * Error messages for different discount validation failures
     */
    errorMessages: {
      empty_code: window.discountStrings?.empty_code || 'يرجى إدخال كود الخصم',
      invalid_code: window.discountStrings?.invalid_code || 'كود الخصم غير صالح أو منتهي الصلاحية',
      expired_code: window.discountStrings?.expired_code || 'كود الخصم منتهي الصلاحية',
      minimum_not_met: window.discountStrings?.minimum_not_met || 'لم يتم الوصول للحد الأدنى للطلب لاستخدام هذا الكود',
      usage_limit_reached: window.discountStrings?.usage_limit_reached || 'تم استنفاد الحد الأقصى لاستخدام هذا الكود',
      customer_not_eligible: window.discountStrings?.customer_not_eligible || 'هذا الكود غير متاح لحسابك',
      product_not_eligible: window.discountStrings?.product_not_eligible || 'هذا الكود لا ينطبق على المنتجات في سلتك',
      already_applied: window.discountStrings?.already_applied || 'هذا الكود مطبق بالفعل',
      network_error: window.discountStrings?.network_error || 'حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى',
      generic_error: window.discountStrings?.generic_error || 'حدث خطأ. يرجى المحاولة مرة أخرى'
    },

    /**
     * Success messages
     */
    successMessages: {
      applied: window.discountStrings?.applied || 'تم تطبيق كود الخصم بنجاح! سيظهر الخصم عند إتمام الشراء',
      removed: window.discountStrings?.removed || 'تم إزالة كود الخصم',
      saved: window.discountStrings?.saved || 'تم حفظ كود الخصم. سيتم تطبيقه عند إتمام الشراء'
    },

    /**
     * Initialize the discount code module
     */
    init: function () {
      this.wrapper = document.querySelector('[data-discount-wrapper]');
      if (!this.wrapper) return;

      this.form = this.wrapper.querySelector('[data-discount-form]');
      this.input = this.wrapper.querySelector('[data-discount-input]');
      this.applyBtn = this.wrapper.querySelector('[data-apply-discount]');
      this.appliedDisplay = this.wrapper.querySelector('[data-applied-discount]');
      this.errorEl = this.wrapper.querySelector('[data-discount-error]');
      this.successEl = this.wrapper.querySelector('[data-discount-success]');
      this.spinner = this.wrapper.querySelector('[data-discount-spinner]');
      this.btnText = this.wrapper.querySelector('[data-discount-btn-text]');
      this.infoEl = this.wrapper.querySelector('[data-discount-info]');

      this._loadFromStorage();
      this._bindEvents();
      this._updateCheckoutLinks();
    },

    /**
     * Bind event listeners
     */
    _bindEvents: function () {
      var self = this;

      // Apply discount button click
      if (this.applyBtn) {
        this.applyBtn.addEventListener('click', function (e) {
          e.preventDefault();
          self.applyDiscount();
        });
      }

      // Enter key on input
      if (this.input) {
        this.input.addEventListener('keypress', function (e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            self.applyDiscount();
          }
        });

        // Clear error on input change
        this.input.addEventListener('input', function () {
          self._hideError();
          self._hideSuccess();
          self.input.classList.remove('error');
        });
      }

      // Remove discount button
      var removeBtn = this.wrapper.querySelector('[data-remove-discount]');
      if (removeBtn) {
        removeBtn.addEventListener('click', function (e) {
          e.preventDefault();
          self.removeDiscount();
        });
      }
    },

    /**
     * Apply discount code with validation
     */
    applyDiscount: function () {
      var self = this;
      var code = this.input ? this.input.value.trim() : '';

      // Validate input
      if (!code) {
        this._showError(this.errorMessages.empty_code);
        this._shakeInput();
        return;
      }

      // Check if same code is already applied
      if (this.currentCode && this.currentCode.toUpperCase() === code.toUpperCase()) {
        this._showError(this.errorMessages.already_applied);
        return;
      }

      // Show loading state
      this._setLoading(true);
      this._hideError();
      this._hideSuccess();

      // Validate the discount code by making a request to Shopify
      this._validateDiscountCode(code)
        .then(function (result) {
          self._setLoading(false);

          if (result.valid) {
            // Store the discount code
            self.currentCode = code.toUpperCase();
            self.isValidated = true;
            self._saveToStorage();

            // Update UI
            self._showAppliedDiscount();
            self._showSuccess(self.successMessages.applied);
            self._updateCheckoutLinks();

            // Clear input
            if (self.input) {
              self.input.value = '';
              self.input.classList.remove('error');
            }

            // Hide success message after delay
            setTimeout(function () {
              self._hideSuccess();
            }, 5000);
          } else {
            // Show appropriate error message
            self._showError(result.message || self.errorMessages.invalid_code);
            self._shakeInput();
            self.input.classList.add('error');
          }
        })
        .catch(function (error) {
          self._setLoading(false);
          console.error('[Sallety] Discount validation error:', error);

          // On network error, save the code anyway (will be validated at checkout)
          self.currentCode = code.toUpperCase();
          self.isValidated = false;
          self._saveToStorage();

          // Update UI
          self._showAppliedDiscount();
          self._showSuccess(self.successMessages.saved);
          self._updateCheckoutLinks();

          // Clear input
          if (self.input) {
            self.input.value = '';
          }

          setTimeout(function () {
            self._hideSuccess();
          }, 5000);
        });
    },

    /**
     * Validate discount code via Shopify
     * @param {string} code - Discount code to validate
     * @returns {Promise<{valid: boolean, message?: string}>}
     */
    _validateDiscountCode: function (code) {
      var self = this;

      return new Promise(function (resolve, reject) {
        // Method 1: Try to apply discount via the discount URL
        // This creates a temporary checkout session to validate the code
        var validateUrl = '/discount/' + encodeURIComponent(code);

        fetch(validateUrl, {
          method: 'GET',
          credentials: 'same-origin',
          redirect: 'manual'
        })
          .then(function (response) {
            // If we get a redirect (302), the discount code is likely valid
            // Shopify redirects to the homepage or cart after applying discount
            if (response.type === 'opaqueredirect' || response.redirected || response.status === 302 || response.status === 200) {
              // The discount was applied to the session
              // Now verify by checking the cart
              return self._verifyDiscountApplied(code);
            } else if (response.status === 404) {
              resolve({ valid: false, message: self.errorMessages.invalid_code });
            } else {
              // Try alternative validation method
              return self._validateViaCheckout(code);
            }
          })
          .then(function (result) {
            if (result) {
              resolve(result);
            }
          })
          .catch(function (error) {
            // Network error - try alternative method or accept the code
            console.warn('[Sallety] Primary discount validation failed:', error);
            self._validateViaCheckout(code)
              .then(resolve)
              .catch(function () {
                // If all validation fails, accept the code (will be validated at checkout)
                resolve({ valid: true, message: self.successMessages.saved });
              });
          });
      });
    },

    /**
     * Verify if discount was applied by checking cart
     * @param {string} code - Discount code
     * @returns {Promise<{valid: boolean, message?: string}>}
     */
    _verifyDiscountApplied: function (code) {
      var self = this;

      return fetch('/cart.js', {
        method: 'GET',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json'
        }
      })
        .then(function (response) {
          return response.json();
        })
        .then(function (cart) {
          // Check if there are any discount applications
          if (cart.cart_level_discount_applications && cart.cart_level_discount_applications.length > 0) {
            // Check if our code is in the applied discounts
            var codeApplied = cart.cart_level_discount_applications.some(function (discount) {
              return discount.title && discount.title.toUpperCase() === code.toUpperCase();
            });

            if (codeApplied) {
              return { valid: true };
            }
          }

          // Check line item discounts
          if (cart.items && cart.items.length > 0) {
            var hasLineDiscount = cart.items.some(function (item) {
              return item.line_level_discount_allocations && item.line_level_discount_allocations.some(function (discount) {
                return discount.discount_application &&
                  discount.discount_application.title &&
                  discount.discount_application.title.toUpperCase() === code.toUpperCase();
              });
            });

            if (hasLineDiscount) {
              return { valid: true };
            }
          }

          // If no discount found but we got here, the code might still be valid
          // (some discounts only apply at checkout)
          return { valid: true, message: self.successMessages.saved };
        })
        .catch(function (error) {
          console.warn('[Sallety] Cart verification failed:', error);
          // Accept the code if verification fails
          return { valid: true, message: self.successMessages.saved };
        });
    },

    /**
     * Alternative validation via checkout API
     * @param {string} code - Discount code
     * @returns {Promise<{valid: boolean, message?: string}>}
     */
    _validateViaCheckout: function (code) {
      var self = this;

      return new Promise(function (resolve) {
        // Create a form to submit to checkout with the discount
        // and check the response
        var formData = new FormData();
        formData.append('discount', code);

        fetch('/checkout', {
          method: 'POST',
          body: formData,
          credentials: 'same-origin',
          redirect: 'manual'
        })
          .then(function (response) {
            // Parse the response to check for errors
            if (response.status === 302 || response.status === 303 || response.type === 'opaqueredirect') {
              // Redirect means the discount might be valid
              resolve({ valid: true, message: self.successMessages.saved });
            } else {
              return response.text();
            }
          })
          .then(function (html) {
            if (!html) return;

            // Check for common error patterns in the response
            var lowerHtml = html.toLowerCase();

            if (lowerHtml.includes('enter a valid discount code') ||
              lowerHtml.includes('invalid discount') ||
              lowerHtml.includes('code is invalid') ||
              lowerHtml.includes('كود غير صالح') ||
              lowerHtml.includes('كود الخصم غير صالح')) {
              resolve({ valid: false, message: self.errorMessages.invalid_code });
            } else if (lowerHtml.includes('expired') || lowerHtml.includes('منتهي')) {
              resolve({ valid: false, message: self.errorMessages.expired_code });
            } else if (lowerHtml.includes('minimum') || lowerHtml.includes('الحد الأدنى')) {
              resolve({ valid: false, message: self.errorMessages.minimum_not_met });
            } else if (lowerHtml.includes('usage limit') || lowerHtml.includes('limit reached') || lowerHtml.includes('الحد الأقصى')) {
              resolve({ valid: false, message: self.errorMessages.usage_limit_reached });
            } else if (lowerHtml.includes('not eligible') || lowerHtml.includes('غير مؤهل')) {
              resolve({ valid: false, message: self.errorMessages.customer_not_eligible });
            } else if (lowerHtml.includes('does not apply') || lowerHtml.includes('لا ينطبق')) {
              resolve({ valid: false, message: self.errorMessages.product_not_eligible });
            } else {
              // If no specific error found, assume valid
              resolve({ valid: true, message: self.successMessages.saved });
            }
          })
          .catch(function (error) {
            console.warn('[Sallety] Checkout validation failed:', error);
            // Accept the code if validation fails
            resolve({ valid: true, message: self.successMessages.saved });
          });
      });
    },

    /**
     * Remove discount code
     */
    removeDiscount: function () {
      var self = this;

      // Clear the discount from Shopify session
      this._clearDiscountFromSession()
        .finally(function () {
          self.currentCode = null;
          self.isValidated = false;
          self._removeFromStorage();
          self._hideAppliedDiscount();
          self._hideSuccess();
          self._hideError();
          self._updateCheckoutLinks();

          // Show removal message
          self._showSuccess(self.successMessages.removed);

          // Hide success after delay
          setTimeout(function () {
            self._hideSuccess();
          }, 3000);
        });
    },

    /**
     * Clear discount from Shopify session
     * @returns {Promise}
     */
    _clearDiscountFromSession: function () {
      // Make a request to clear the discount
      return fetch('/discount/', {
        method: 'GET',
        credentials: 'same-origin'
      }).catch(function (error) {
        console.warn('[Sallety] Failed to clear discount session:', error);
      });
    },

    /**
     * Load discount code from storage
     */
    _loadFromStorage: function () {
      try {
        var stored = localStorage.getItem(this.STORAGE_KEY);
        var validated = localStorage.getItem(this.STORAGE_KEY_VALIDATED);

        if (stored) {
          this.currentCode = stored;
          this.isValidated = validated === 'true';
          this._showAppliedDiscount();

          // Re-apply the discount to the session
          this._reapplyDiscount();
        }
      } catch (e) {
        console.error('[Sallety] Error loading discount code:', e);
      }
    },

    /**
     * Re-apply stored discount to session
     */
    _reapplyDiscount: function () {
      if (!this.currentCode) return;

      // Silently re-apply the discount
      fetch('/discount/' + encodeURIComponent(this.currentCode), {
        method: 'GET',
        credentials: 'same-origin',
        redirect: 'manual'
      }).catch(function (error) {
        console.warn('[Sallety] Failed to re-apply discount:', error);
      });
    },

    /**
     * Save discount code to storage
     */
    _saveToStorage: function () {
      try {
        if (this.currentCode) {
          localStorage.setItem(this.STORAGE_KEY, this.currentCode);
          localStorage.setItem(this.STORAGE_KEY_VALIDATED, this.isValidated ? 'true' : 'false');
        }
      } catch (e) {
        console.error('[Sallety] Error saving discount code:', e);
      }
    },

    /**
     * Remove discount code from storage
     */
    _removeFromStorage: function () {
      try {
        localStorage.removeItem(this.STORAGE_KEY);
        localStorage.removeItem(this.STORAGE_KEY_VALIDATED);
      } catch (e) {
        console.error('[Sallety] Error removing discount code:', e);
      }
    },

    /**
     * Show applied discount display
     */
    _showAppliedDiscount: function () {
      if (!this.appliedDisplay || !this.currentCode) return;

      var codeText = this.appliedDisplay.querySelector('[data-discount-code-text]');
      if (codeText) {
        codeText.textContent = this.currentCode;
      }

      this.appliedDisplay.classList.remove('hidden');

      // Hide the form
      if (this.form) {
        this.form.classList.add('hidden');
      }

      // Hide the info text
      if (this.infoEl) {
        this.infoEl.classList.add('hidden');
      }
    },

    /**
     * Hide applied discount display
     */
    _hideAppliedDiscount: function () {
      if (this.appliedDisplay) {
        this.appliedDisplay.classList.add('hidden');
      }

      // Show the form
      if (this.form) {
        this.form.classList.remove('hidden');
      }

      // Show the info text
      if (this.infoEl) {
        this.infoEl.classList.remove('hidden');
      }
    },

    /**
     * Update checkout links with discount code
     */
    _updateCheckoutLinks: function () {
      var checkoutButtons = document.querySelectorAll('[name="checkout"], a[href*="/checkout"]');
      var self = this;

      checkoutButtons.forEach(function (btn) {
        if (btn.tagName === 'A') {
          var href = btn.getAttribute('href');
          // Remove existing discount parameter
          href = href.replace(/[?&]discount=[^&]*/g, '');

          if (self.currentCode) {
            var separator = href.includes('?') ? '&' : '?';
            btn.setAttribute('href', href + separator + 'discount=' + encodeURIComponent(self.currentCode));
          } else {
            btn.setAttribute('href', href);
          }
        }
      });

      // Also update the cart form action if it exists
      var cartForm = document.querySelector('#cart-form, form[action*="/cart"]');
      if (cartForm && this.currentCode) {
        // Update form action to include discount
        var action = cartForm.getAttribute('action') || '/cart';
        action = action.replace(/[?&]discount=[^&]*/g, '');
        var separator = action.includes('?') ? '&' : '?';
        cartForm.setAttribute('action', action + separator + 'discount=' + encodeURIComponent(this.currentCode));

        // Add a hidden input for the discount code
        var existingInput = cartForm.querySelector('input[name="discount"]');
        if (!existingInput) {
          var hiddenInput = document.createElement('input');
          hiddenInput.type = 'hidden';
          hiddenInput.name = 'discount';
          hiddenInput.value = this.currentCode;
          cartForm.appendChild(hiddenInput);
        } else {
          existingInput.value = this.currentCode;
        }
      } else if (cartForm) {
        // Remove discount from form
        var action = cartForm.getAttribute('action') || '/cart';
        action = action.replace(/[?&]discount=[^&]*/g, '');
        cartForm.setAttribute('action', action);

        var existingInput = cartForm.querySelector('input[name="discount"]');
        if (existingInput) {
          existingInput.remove();
        }
      }
    },

    /**
     * Shake input animation for errors
     */
    _shakeInput: function () {
      if (this.input) {
        this.input.classList.add('animate-shake');
        var self = this;
        setTimeout(function () {
          self.input.classList.remove('animate-shake');
        }, 500);
      }
    },

    /**
     * Set loading state
     * @param {boolean} loading - Loading state
     */
    _setLoading: function (loading) {
      if (this.applyBtn) {
        this.applyBtn.disabled = loading;
      }

      if (this.spinner) {
        this.spinner.classList.toggle('hidden', !loading);
      }

      if (this.btnText) {
        this.btnText.classList.toggle('hidden', loading);
      }

      if (this.input) {
        this.input.disabled = loading;
      }
    },

    /**
     * Show error message
     * @param {string} message - Error message
     */
    _showError: function (message) {
      if (!this.errorEl) return;

      var textEl = this.errorEl.querySelector('[data-discount-error-text]');
      if (textEl) {
        textEl.textContent = message;
      }

      this.errorEl.classList.remove('hidden');

      // Hide success if showing
      this._hideSuccess();
    },

    /**
     * Hide error message
     */
    _hideError: function () {
      if (this.errorEl) {
        this.errorEl.classList.add('hidden');
      }
    },

    /**
     * Show success message
     * @param {string} message - Success message
     */
    _showSuccess: function (message) {
      if (!this.successEl) return;

      var textEl = this.successEl.querySelector('[data-discount-success-text]');
      if (textEl) {
        textEl.textContent = message;
      }

      this.successEl.classList.remove('hidden');

      // Hide error if showing
      this._hideError();
    },

    /**
     * Hide success message
     */
    _hideSuccess: function () {
      if (this.successEl) {
        this.successEl.classList.add('hidden');
      }
    },

    /**
     * Get current discount code
     * @returns {string|null} Current discount code
     */
    getCode: function () {
      return this.currentCode;
    },

    /**
     * Check if current code is validated
     * @returns {boolean}
     */
    isCodeValidated: function () {
      return this.isValidated;
    }
  };

  // ============================================================================
  // WISHLIST MODULE
  // ============================================================================

  /**
   * Wishlist Module
   * Handles wishlist functionality with localStorage persistence
   */
  Sallety.wishlist = {
    STORAGE_KEY: 'sallety_wishlist',
    items: [],

    /**
     * Initialize the wishlist module
     */
    init: function () {
      this._loadFromStorage();
      this._bindEvents();
      this._updateAllButtons();
      this._updateHeaderCount();
    },

    /**
     * Load wishlist items from localStorage
     */
    _loadFromStorage: function () {
      try {
        var stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
          this.items = JSON.parse(stored);
        }
      } catch (e) {
        console.error('[Sallety] Error loading wishlist:', e);
        this.items = [];
      }
    },

    /**
     * Save wishlist items to localStorage
     */
    _saveToStorage: function () {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.items));
      } catch (e) {
        console.error('[Sallety] Error saving wishlist:', e);
      }
    },

    /**
     * Bind event listeners
     */
    _bindEvents: function () {
      var self = this;

      // Wishlist add/remove buttons
      document.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-wishlist-add]');
        if (btn) {
          e.preventDefault();
          e.stopPropagation();

          var productId = btn.dataset.wishlistAdd;
          if (productId) {
            self.toggle(productId, btn);
          }
        }

        // Remove from wishlist page
        var removeBtn = e.target.closest('[data-wishlist-remove]');
        if (removeBtn) {
          e.preventDefault();
          var productId = removeBtn.dataset.wishlistRemove;
          if (productId) {
            self.remove(productId);
            // Remove the card from DOM
            var card = removeBtn.closest('[data-wishlist-item]');
            if (card) {
              card.style.opacity = '0';
              card.style.transform = 'scale(0.9)';
              setTimeout(function () {
                card.remove();
                self._checkEmptyState();
              }, 300);
            }
          }
        }
      });
    },

    /**
     * Toggle product in wishlist
     * @param {string} productId - Product ID
     * @param {HTMLElement} btn - Button element
     */
    toggle: function (productId, btn) {
      if (this.isInWishlist(productId)) {
        this.remove(productId);
        this._showToast('تمت إزالة المنتج من المفضلة', 'info');
      } else {
        // Get product data from button attributes
        var productData = {
          id: productId,
          handle: btn.dataset.productHandle || '',
          title: btn.dataset.productTitle || '',
          image: btn.dataset.productImage || '',
          price: btn.dataset.productPrice || '0',
          url: btn.dataset.productUrl || ''
        };
        this.add(productData);
        this._showToast('تمت إضافة المنتج إلى المفضلة', 'success');
      }
      this._updateButton(btn, productId);
      this._updateHeaderCount();
    },

    /**
     * Add product to wishlist
     * @param {Object} product - Product data
     */
    add: function (product) {
      if (!this.isInWishlist(product.id)) {
        this.items.push({
          id: product.id,
          handle: product.handle,
          title: product.title,
          image: product.image,
          price: product.price,
          url: product.url,
          addedAt: new Date().toISOString()
        });
        this._saveToStorage();
      }
    },

    /**
     * Remove product from wishlist
     * @param {string} productId - Product ID
     */
    remove: function (productId) {
      this.items = this.items.filter(function (item) {
        return item.id !== productId && item.id !== String(productId);
      });
      this._saveToStorage();
      this._updateAllButtons();
      this._updateHeaderCount();
    },

    /**
     * Check if product is in wishlist
     * @param {string} productId - Product ID
     * @returns {boolean}
     */
    isInWishlist: function (productId) {
      return this.items.some(function (item) {
        return item.id === productId || item.id === String(productId);
      });
    },

    /**
     * Get all wishlist items
     * @returns {Array}
     */
    getItems: function () {
      return this.items;
    },

    /**
     * Get wishlist item IDs
     * @returns {Array}
     */
    getItemIds: function () {
      return this.items.map(function (item) {
        return item.id;
      });
    },

    /**
     * Get wishlist count
     * @returns {number}
     */
    getCount: function () {
      return this.items.length;
    },

    /**
     * Clear all wishlist items
     */
    clear: function () {
      this.items = [];
      this._saveToStorage();
      this._updateAllButtons();
      this._updateHeaderCount();
    },

    /**
     * Update a single button state
     * @param {HTMLElement} btn - Button element
     * @param {string} productId - Product ID
     */
    _updateButton: function (btn, productId) {
      if (!btn) return;

      var isActive = this.isInWishlist(productId);
      btn.classList.toggle('is-active', isActive);

      // Update aria-label
      var label = isActive
        ? (window.wishlistStrings?.removeFromWishlist || 'إزالة من المفضلة')
        : (window.wishlistStrings?.addToWishlist || 'أضف للمفضلة');
      btn.setAttribute('aria-label', label);
      btn.setAttribute('title', label);
    },

    /**
     * Update all wishlist buttons on the page
     */
    _updateAllButtons: function () {
      var self = this;
      document.querySelectorAll('[data-wishlist-add]').forEach(function (btn) {
        var productId = btn.dataset.wishlistAdd;
        self._updateButton(btn, productId);
      });
    },

    /**
     * Update header wishlist count
     */
    _updateHeaderCount: function () {
      var count = this.getCount();
      var countElements = document.querySelectorAll('[data-wishlist-count]');

      countElements.forEach(function (el) {
        el.textContent = count;
        el.setAttribute('data-count', count);
        // Show/hide based on count
        if (count > 0) {
          el.classList.remove('hidden');
          el.style.display = '';
        } else {
          el.classList.add('hidden');
        }
      });

      // Dispatch event for other components listening
      window.dispatchEvent(new CustomEvent('wishlist:updated', {
        detail: { count: count, items: this.items }
      }));
    },

    /**
     * Check and show empty state on wishlist page
     */
    _checkEmptyState: function () {
      var container = document.querySelector('[data-wishlist-container]');
      var emptyState = document.querySelector('[data-wishlist-empty]');
      var grid = document.querySelector('[data-wishlist-grid]');

      if (container && this.items.length === 0) {
        if (grid) grid.classList.add('hidden');
        if (emptyState) emptyState.classList.remove('hidden');
      }
    },

    /**
     * Show toast notification
     * @param {string} message - Message to show
     * @param {string} type - Type of toast (success, info, error)
     */
    _showToast: function (message, type) {
      // Use existing toast system if available
      if (window.Sallety && window.Sallety.toast) {
        window.Sallety.toast.show(message, type);
        return;
      }

      // Fallback: Create simple toast
      var existingToast = document.querySelector('.wishlist-toast');
      if (existingToast) {
        existingToast.remove();
      }

      var bgColor = type === 'success' ? 'bg-green-600' : (type === 'error' ? 'bg-red-600' : 'bg-gray-800');
      var toastHtml = '<div class="wishlist-toast fixed bottom-4 start-4 z-[1001] ' + bgColor + ' text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in-up" style="animation: fadeInUp 0.3s ease-out;">' +
        '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        (type === 'success'
          ? '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="currentColor"/>'
          : '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>') +
        '</svg>' +
        '<span class="text-sm font-medium">' + message + '</span>' +
        '</div>';

      document.body.insertAdjacentHTML('beforeend', toastHtml);

      // Auto-remove after 3 seconds
      setTimeout(function () {
        var toast = document.querySelector('.wishlist-toast');
        if (toast) {
          toast.style.opacity = '0';
          toast.style.transform = 'translateY(10px)';
          setTimeout(function () { toast.remove(); }, 300);
        }
      }, 3000);
    },

    /**
     * Render wishlist page
     * Fetches products by IDs and renders them
     */
    renderWishlistPage: function () {
      var self = this;
      var container = document.querySelector('[data-wishlist-container]');
      var grid = document.querySelector('[data-wishlist-grid]');
      var emptyState = document.querySelector('[data-wishlist-empty]');
      var loading = document.querySelector('[data-wishlist-loading]');

      if (!container) return;

      // Show loading
      if (loading) loading.classList.remove('hidden');
      if (grid) grid.classList.add('hidden');
      if (emptyState) emptyState.classList.add('hidden');

      // Check if wishlist is empty
      if (this.items.length === 0) {
        if (loading) loading.classList.add('hidden');
        if (emptyState) emptyState.classList.remove('hidden');
        return;
      }

      // Fetch products by handles
      var handles = this.items.map(function (item) {
        return item.handle;
      }).filter(Boolean);

      if (handles.length === 0) {
        // Fallback: render from stored data
        this._renderFromStoredData(grid, loading, emptyState);
        return;
      }

      // Fetch products via AJAX
      var fetchPromises = handles.map(function (handle) {
        return fetch(window.Shopify.routes.root + 'products/' + handle + '.js')
          .then(function (response) {
            if (!response.ok) throw new Error('Product not found');
            return response.json();
          })
          .catch(function () {
            return null;
          });
      });

      Promise.all(fetchPromises)
        .then(function (products) {
          var validProducts = products.filter(Boolean);

          if (validProducts.length === 0) {
            // Fallback to stored data
            self._renderFromStoredData(grid, loading, emptyState);
            return;
          }

          // Render products
          self._renderProducts(grid, validProducts);

          if (loading) loading.classList.add('hidden');
          if (grid) grid.classList.remove('hidden');
        })
        .catch(function (error) {
          console.error('[Sallety] Error fetching wishlist products:', error);
          self._renderFromStoredData(grid, loading, emptyState);
        });
    },

    /**
     * Render products from stored data (fallback)
     */
    _renderFromStoredData: function (grid, loading, emptyState) {
      if (!grid) return;

      if (this.items.length === 0) {
        if (loading) loading.classList.add('hidden');
        if (emptyState) emptyState.classList.remove('hidden');
        return;
      }

      var html = '';
      var self = this;

      this.items.forEach(function (item) {
        html += self._createProductCardHtml(item);
      });

      grid.innerHTML = html;
      if (loading) loading.classList.add('hidden');
      if (grid) grid.classList.remove('hidden');
    },

    /**
     * Render products from API data
     */
    _renderProducts: function (grid, products) {
      if (!grid) return;

      var html = '';
      var self = this;

      products.forEach(function (product) {
        var storedItem = self.items.find(function (item) {
          return item.handle === product.handle || item.id === String(product.id);
        });

        html += self._createProductCardHtml({
          id: product.id,
          handle: product.handle,
          title: product.title,
          image: product.featured_image,
          price: product.price,
          compare_at_price: product.compare_at_price,
          url: '/products/' + product.handle,
          available: product.available,
          vendor: product.vendor
        });
      });

      grid.innerHTML = html;
    },

    /**
     * Create product card HTML with RTL support
     */
    _createProductCardHtml: function (product) {
      var imageUrl = product.image || '';
      var price = parseInt(product.price) || 0;
      var comparePrice = parseInt(product.compare_at_price) || 0;
      var isOnSale = comparePrice > price;
      var available = product.available !== false;

      // Get translations from page or use defaults
      var strings = window.wishlistPageStrings || {};
      var removeText = strings.removeFromWishlist || 'إزالة من المفضلة';
      var outOfStockText = strings.outOfStock || 'نفذت الكمية';
      var viewProductText = strings.viewProduct || 'عرض المنتج';
      var notAvailableText = strings.notAvailable || 'غير متوفر';

      return '<div class="wishlist-item group relative bg-[var(--color-background)] rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300" dir="rtl" data-wishlist-item data-product-id="' + product.id + '">' +
        '<div class="relative aspect-[3/4] overflow-hidden bg-[var(--color-surface)]">' +
        '<a href="' + (product.url || '/products/' + product.handle) + '" class="block w-full h-full">' +
        (imageUrl
          ? '<img src="' + imageUrl + '" alt="' + (product.title || '').replace(/"/g, '&quot;') + '" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy">'
          : '<div class="w-full h-full flex items-center justify-center text-[var(--color-secondary)]"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></div>') +
        '</a>' +
        (isOnSale ? '<span class="absolute top-2 start-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">-' + Math.round((1 - price / comparePrice) * 100) + '%</span>' : '') +
        (!available ? '<span class="absolute top-2 start-2 bg-gray-600 text-white text-xs font-bold px-2 py-1 rounded">' + outOfStockText + '</span>' : '') +
        '<button type="button" class="absolute top-2 end-2 w-9 h-9 flex items-center justify-center rounded-full bg-white/90 text-red-500 shadow-sm hover:bg-red-500 hover:text-white transition-all duration-200" data-wishlist-remove="' + product.id + '" aria-label="' + removeText + '" title="' + removeText + '">' +
        '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>' +
        '</svg>' +
        '</button>' +
        '</div>' +
        '<div class="p-4 text-right">' +
        (product.vendor ? '<p class="text-xs text-[var(--color-secondary)] uppercase tracking-wider mb-1">' + product.vendor + '</p>' : '') +
        '<h3 class="text-sm font-medium text-[var(--color-foreground)] line-clamp-2 mb-2">' +
        '<a href="' + (product.url || '/products/' + product.handle) + '" class="hover:text-[var(--color-primary)] transition-colors">' + (product.title || 'منتج') + '</a>' +
        '</h3>' +
        '<div class="flex items-center gap-2 justify-start">' +
        '<span class="text-base font-bold text-[var(--color-foreground)]">' + Sallety.utils.formatMoney(price) + '</span>' +
        (isOnSale ? '<span class="text-sm text-[var(--color-secondary)] line-through">' + Sallety.utils.formatMoney(comparePrice) + '</span>' : '') +
        '</div>' +
        (available
          ? '<a href="' + (product.url || '/products/' + product.handle) + '" class="mt-3 w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[var(--color-primary)] text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity">' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>' +
          '<span>' + viewProductText + '</span>' +
          '</a>'
          : '<button type="button" disabled class="mt-3 w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[var(--color-border)] text-[var(--color-secondary)] text-sm font-medium rounded-lg cursor-not-allowed">' +
          '<span>' + notAvailableText + '</span>' +
          '</button>') +
        '</div>' +
        '</div>';
    }
  };

  // ============================================================================
  // QUICK ADD MODAL (Variant selector for product cards)
  // ============================================================================

  Sallety.quickAdd = {
    modal: null,
    overlay: null,
    loading: null,
    contentEl: null,
    imageEl: null,
    titleEl: null,
    priceEl: null,
    comparePriceEl: null,
    optionsEl: null,
    submitBtn: null,
    qtyInput: null,
    unavailableEl: null,
    currentProduct: null,
    currentVariant: null,
    currentTrigger: null,

    _colorMap: {
      'black': '#000', 'أسود': '#000', 'white': '#fff', 'أبيض': '#fff',
      'red': '#dc2626', 'أحمر': '#dc2626', 'blue': '#2563eb', 'أزرق': '#2563eb',
      'green': '#16a34a', 'أخضر': '#16a34a', 'yellow': '#eab308', 'أصفر': '#eab308',
      'orange': '#ea580c', 'برتقالي': '#ea580c', 'purple': '#9333ea', 'بنفسجي': '#9333ea',
      'pink': '#ec4899', 'وردي': '#ec4899', 'brown': '#92400e', 'بني': '#92400e',
      'gray': '#6b7280', 'grey': '#6b7280', 'رمادي': '#6b7280',
      'navy': '#1e3a5f', 'كحلي': '#1e3a5f', 'beige': '#d4b896', 'بيج': '#d4b896',
      'cream': '#fffdd0', 'كريمي': '#fffdd0', 'olive': '#556b2f', 'زيتي': '#556b2f',
      'burgundy': '#800020', 'عنابي': '#800020', 'charcoal': '#36454f'
    },

    init: function () {
      this.modal = document.getElementById('quick-add-modal');
      if (!this.modal) return;

      this.overlay = this.modal.querySelector('[data-quick-add-close]');
      this.loading = this.modal.querySelector('[data-quick-add-loading]');
      this.contentEl = this.modal.querySelector('[data-quick-add-content]');
      this.imageEl = this.modal.querySelector('[data-quick-add-image]');
      this.titleEl = this.modal.querySelector('[data-quick-add-title]');
      this.priceEl = this.modal.querySelector('[data-quick-add-price]');
      this.comparePriceEl = this.modal.querySelector('[data-quick-add-compare-price]');
      this.optionsEl = this.modal.querySelector('[data-quick-add-options]');
      this.submitBtn = this.modal.querySelector('[data-quick-add-submit]');
      this.qtyInput = this.modal.querySelector('[data-quick-add-qty-input]');
      this.unavailableEl = this.modal.querySelector('[data-quick-add-unavailable]');

      this._bindEvents();
    },

    _bindEvents: function () {
      var self = this;

      document.addEventListener('click', function (e) {
        var trigger = e.target.closest('[data-quick-add]');
        if (trigger) {
          e.preventDefault();
          e.stopPropagation();
          var handle = trigger.dataset.quickAdd;
          if (handle) self.open(handle, trigger);
        }

        var closeBtn = e.target.closest('[data-quick-add-close]');
        if (closeBtn) self.close();
      });

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && self.modal && self.modal.classList.contains('is-open')) {
          self.close();
        }
      });

      if (this.submitBtn) {
        this.submitBtn.addEventListener('click', function () {
          self._addToCart();
        });
      }

      var minusBtn = this.modal.querySelector('[data-quick-add-qty-minus]');
      var plusBtn = this.modal.querySelector('[data-quick-add-qty-plus]');

      if (minusBtn) {
        minusBtn.addEventListener('click', function () {
          var val = parseInt(self.qtyInput.value) || 1;
          if (val > 1) self.qtyInput.value = val - 1;
        });
      }

      if (plusBtn) {
        plusBtn.addEventListener('click', function () {
          var val = parseInt(self.qtyInput.value) || 1;
          if (val < 99) self.qtyInput.value = val + 1;
        });
      }
    },

    open: function (handle, trigger) {
      if (!this.modal || !handle) return;

      var self = this;
      this.currentTrigger = trigger || null;

      if (this.currentTrigger) {
        this.currentTrigger.classList.add('is-loading');
        this.currentTrigger.disabled = true;
      }

      this.modal.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      this._showLoading();

      this._fetchProduct(handle)
        .then(function (product) {
          if (!product || !product.id) throw new Error('Invalid product data');
          self.currentProduct = product;
          self.currentVariant = self._getFirstAvailableVariant(product);
          self._renderProduct(product);
          self._hideLoading();
          self._clearTriggerLoading();
        })
        .catch(function (error) {
          console.error('[Sallety] Quick add error:', error);
          self._clearTriggerLoading();
          self.close();
        });
    },

    close: function () {
      if (!this.modal) return;
      this.modal.classList.remove('is-open');
      document.body.style.overflow = '';
      this.currentProduct = null;
      this.currentVariant = null;
      this._clearTriggerLoading();
      if (this.qtyInput) this.qtyInput.value = 1;
      if (this.optionsEl) this.optionsEl.innerHTML = '';
      if (this.contentEl) this.contentEl.classList.add('hidden');
    },

    _showLoading: function () {
      if (this.loading) this.loading.classList.remove('hidden');
      if (this.contentEl) this.contentEl.classList.add('hidden');
    },

    _hideLoading: function () {
      if (this.loading) this.loading.classList.add('hidden');
      if (this.contentEl) this.contentEl.classList.remove('hidden');
    },

    _clearTriggerLoading: function () {
      if (this.currentTrigger) {
        this.currentTrigger.classList.remove('is-loading');
        this.currentTrigger.disabled = false;
        this.currentTrigger = null;
      }
    },

    _fetchProduct: function (handle) {
      var root = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
      // Ensure root ends with /
      if (root.charAt(root.length - 1) !== '/') {
        root = root + '/';
      }
      var url = root + 'products/' + encodeURIComponent(handle) + '.js';
      return fetch(url)
        .then(function (res) {
          if (!res.ok) throw new Error('Product not found');
          return res.json();
        });
    },

    _getFirstAvailableVariant: function (product) {
      if (!product || !product.variants) return null;
      return product.variants.find(function (v) { return v.available; }) || product.variants[0];
    },

    _isColorOption: function (name) {
      var lower = (name || '').toLowerCase();
      return lower === 'color' || lower === 'colour' || lower === 'اللون' || lower === 'لون';
    },

    _getSwatchColor: function (value) {
      var key = (value || '').toLowerCase().replace(/\s+/g, '');
      return this._colorMap[key] || null;
    },

    _renderProduct: function (product) {
      var self = this;
      var variant = this.currentVariant;

      if (this.imageEl) {
        var imgSrc = product.featured_image
          ? product.featured_image.replace(/(\.[^.]+)$/, '_400x$1')
          : '';
        this.imageEl.src = imgSrc;
        this.imageEl.alt = product.title;
      }

      if (this.titleEl) this.titleEl.textContent = product.title;

      this._updatePrice(variant);
      this._renderOptions(product);
      this._updateSubmitState();
    },

    _renderOptions: function (product) {
      var self = this;
      if (!this.optionsEl) return;
      this.optionsEl.innerHTML = '';

      if (!product.options || product.options.length === 0) return;
      if (product.options.length === 1 && product.options[0].name === 'Title') return;

      product.options.forEach(function (optionObj, optionIndex) {
        var optionName = optionObj.name || optionObj;
        var values = optionObj.values || [];

        if (typeof optionObj === 'string') {
          optionName = optionObj;
          values = [];
          var seen = {};
          product.variants.forEach(function (v) {
            var val = v.options ? v.options[optionIndex] : null;
            if (val && !seen[val]) {
              seen[val] = true;
              values.push(val);
            }
          });
        }

        var isColor = self._isColorOption(optionName);
        var selectedValue = self.currentVariant ? self.currentVariant.options[optionIndex] : values[0];

        var group = document.createElement('div');
        group.className = 'quick-add-modal__option-group';
        group.dataset.optionIndex = optionIndex;

        var label = document.createElement('label');
        label.className = 'quick-add-modal__option-label';
        label.innerHTML = optionName + ' <span data-selected-label>' + selectedValue + '</span>';
        group.appendChild(label);

        var valuesWrap = document.createElement('div');
        valuesWrap.className = 'quick-add-modal__option-values';

        values.forEach(function (value) {
          var available = self._isValueAvailable(product, optionIndex, value);

          if (isColor) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'quick-add-modal__color-btn';
            if (value === selectedValue) btn.classList.add('is-active');
            if (!available) btn.classList.add('is-unavailable');
            btn.dataset.optionValue = value;
            btn.dataset.optionIndex = optionIndex;
            btn.title = value;

            var swatch = document.createElement('span');
            swatch.className = 'quick-add-modal__color-swatch';
            var color = self._getSwatchColor(value) || '#ccc';
            swatch.style.backgroundColor = color;
            if (color === '#fff' || color === '#ffffff' || color === '#fffdd0') {
              btn.style.borderColor = '#d1d5db';
            }
            btn.appendChild(swatch);
            valuesWrap.appendChild(btn);
          } else {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'quick-add-modal__option-btn';
            if (value === selectedValue) btn.classList.add('is-active');
            if (!available) btn.classList.add('is-unavailable');
            btn.dataset.optionValue = value;
            btn.dataset.optionIndex = optionIndex;
            btn.textContent = value;
            valuesWrap.appendChild(btn);
          }
        });

        group.appendChild(valuesWrap);
        self.optionsEl.appendChild(group);
      });

      this.optionsEl.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-option-value]');
        if (!btn || btn.classList.contains('is-unavailable')) return;

        var optIdx = parseInt(btn.dataset.optionIndex);
        var value = btn.dataset.optionValue;

        var group = btn.closest('.quick-add-modal__option-group');
        group.querySelectorAll('[data-option-value]').forEach(function (b) {
          b.classList.remove('is-active');
        });
        btn.classList.add('is-active');

        var selectedLabel = group.querySelector('[data-selected-label]');
        if (selectedLabel) selectedLabel.textContent = value;

        self._onOptionChange();
      });
    },

    _isValueAvailable: function (product, optionIndex, value) {
      return product.variants.some(function (v) {
        return v.available && v.options && v.options[optionIndex] === value;
      });
    },

    _getSelectedOptions: function () {
      var options = [];
      if (!this.optionsEl) return options;
      this.optionsEl.querySelectorAll('.quick-add-modal__option-group').forEach(function (group) {
        var active = group.querySelector('[data-option-value].is-active');
        if (active) options.push(active.dataset.optionValue);
      });
      return options;
    },

    _findVariant: function (product, selectedOptions) {
      if (!product || !product.variants) return null;
      return product.variants.find(function (v) {
        return v.options && v.options.every(function (opt, i) {
          return opt === selectedOptions[i];
        });
      }) || null;
    },

    _onOptionChange: function () {
      if (!this.currentProduct) return;
      var selectedOptions = this._getSelectedOptions();
      var variant = this._findVariant(this.currentProduct, selectedOptions);
      this.currentVariant = variant;

      this._updatePrice(variant);
      this._updateImage(variant);
      this._updateSubmitState();
    },

    _updatePrice: function (variant) {
      if (!variant) return;
      var onSale = variant.compare_at_price && variant.compare_at_price > variant.price;

      if (this.priceEl) {
        this.priceEl.textContent = Sallety.utils.formatMoney(variant.price);
        this.priceEl.classList.toggle('on-sale', onSale);
      }

      if (this.comparePriceEl) {
        if (onSale) {
          this.comparePriceEl.textContent = Sallety.utils.formatMoney(variant.compare_at_price);
          this.comparePriceEl.classList.remove('hidden');
        } else {
          this.comparePriceEl.classList.add('hidden');
        }
      }
    },

    _updateImage: function (variant) {
      if (!variant || !variant.featured_image || !this.imageEl) return;
      var src = variant.featured_image.src || variant.featured_image;
      if (typeof src === 'string') {
        this.imageEl.src = src.replace(/(\.[^.]+)$/, '_400x$1');
      }
    },

    _updateSubmitState: function () {
      var variant = this.currentVariant;
      var isAvailable = variant && variant.available;

      if (this.submitBtn) {
        this.submitBtn.disabled = !isAvailable;
      }
      if (this.unavailableEl) {
        this.unavailableEl.style.display = (!variant || !isAvailable) ? 'block' : 'none';
      }
    },

    _addToCart: async function () {
      var variant = this.currentVariant;
      if (!variant || !variant.available) return;

      var self = this;
      var qty = parseInt(this.qtyInput ? this.qtyInput.value : 1) || 1;

      this.submitBtn.disabled = true;
      this.submitBtn.classList.add('is-loading');

      // Show loading on cart icon
      Sallety.cart.setIconLoading();

      try {
        await Sallety.cart.add([{ id: variant.id, quantity: qty }]);
        var cart = await Sallety.cart.get();
        Sallety.cart.updateCount(cart.item_count);

        self.close();

        var cartDrawer = document.querySelector(SELECTORS.CART_DRAWER);
        if (cartDrawer) {
          Sallety.drawer.open('cart-drawer');
        }

        Sallety.utils.dispatchEvent(EVENTS.CART_UPDATED, cart);
      } catch (error) {
        console.error('[Sallety] Quick add to cart error:', error);
        alert(error.message || 'حدث خطأ أثناء الإضافة للسلة');
      } finally {
        if (self.submitBtn) {
          self.submitBtn.disabled = false;
          self.submitBtn.classList.remove('is-loading');
        }
        // Clear cart icon loading
        Sallety.cart.clearIconLoading();
      }
    }
  };

  // ============================================================================
  // DOM READY
  // ============================================================================

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      Sallety.init();
      Sallety.collection.init();
      Sallety.searchModal.init();
      Sallety.quickView.init();
      Sallety.quickAdd.init();
      Sallety.cartDrawer.init();
      Sallety.cartPage.init();
      Sallety.discountCode.init();
      Sallety.wishlist.init();
    });
  } else {
    Sallety.init();
    Sallety.collection.init();
    Sallety.searchModal.init();
    Sallety.quickView.init();
    Sallety.quickAdd.init();
    Sallety.cartDrawer.init();
    Sallety.cartPage.init();
    Sallety.discountCode.init();
    Sallety.wishlist.init();
  }

})();
