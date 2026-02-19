/**
 * Testimonials Carousel - Custom Element
 * @fileoverview RTL-aware carousel with autoplay, touch support, and keyboard navigation
 * @author Sallety Theme Team
 * @version 2.0.0
 * @license MIT
 * 
 * @description
 * A fully accessible testimonials carousel component that follows Dawn theme patterns.
 * Features include:
 * - RTL (Right-to-Left) language support
 * - Autoplay with pause on hover/focus
 * - Touch and mouse drag support
 * - Keyboard navigation (Arrow keys)
 * - Screen reader announcements
 * - Responsive breakpoints
 * - Reduced motion preference support
 * 
 * @example
 * <testimonials-carousel
 *   data-autoplay="true"
 *   data-autoplay-speed="5000"
 *   data-show-arrows="true"
 *   data-show-pagination="true"
 *   data-blocks-count="5">
 *   <!-- carousel content -->
 * </testimonials-carousel>
 */

if (!customElements.get('testimonials-carousel')) {
  /**
   * @class TestimonialsCarousel
   * @extends HTMLElement
   * @description Custom element for testimonials carousel functionality
   */
  customElements.define('testimonials-carousel', class TestimonialsCarousel extends HTMLElement {
    // ========================================================================
    // STATIC PROPERTIES
    // ========================================================================

    /**
     * Configuration constants
     * @static
     * @readonly
     */
    static get CONFIG() {
      return {
        /** Default autoplay speed in milliseconds */
        DEFAULT_AUTOPLAY_SPEED: 5000,
        /** Default debounce delay for resize handler */
        RESIZE_DEBOUNCE_DELAY: 250,
        /** Minimum swipe distance to trigger navigation */
        SWIPE_THRESHOLD: 50,
        /** Animation duration in milliseconds */
        ANIMATION_DURATION: 500,
        /** Breakpoints for responsive slides per view */
        BREAKPOINTS: {
          DESKTOP: 1024,
          TABLET: 768
        }
      };
    }

    /**
     * CSS classes used by the carousel
     * @static
     * @readonly
     */
    static get CLASSES() {
      return {
        TRACK: 'carousel-track',
        SLIDE: 'carousel-slide',
        PREV_BTN: 'carousel-btn-prev',
        NEXT_BTN: 'carousel-btn-next',
        PAGINATION: 'carousel-pagination',
        DOT: 'carousel-dot',
        ACTIVE: 'active',
        LIVE_REGION: 'carousel-live-region',
        VISUALLY_HIDDEN: 'visually-hidden'
      };
    }

    // ========================================================================
    // CONSTRUCTOR
    // ========================================================================

    /**
     * Create a new TestimonialsCarousel instance
     * @constructor
     */
    constructor() {
      super();
      
      // DOM Elements
      /** @type {HTMLElement|null} The carousel track container */
      this.track = null;
      /** @type {HTMLElement[]} Array of slide elements */
      this.slides = [];
      /** @type {HTMLButtonElement|null} Previous navigation button */
      this.prevBtn = null;
      /** @type {HTMLButtonElement|null} Next navigation button */
      this.nextBtn = null;
      /** @type {HTMLElement|null} Pagination container */
      this.pagination = null;
      
      // State
      /** @type {number} Current slide index */
      this.currentIndex = 0;
      /** @type {boolean} Whether document is RTL */
      this.isRTL = false;
      /** @type {number|null} Autoplay interval ID */
      this.autoplayInterval = null;
      /** @type {number} Touch/mouse start X position */
      this.touchStartX = 0;
      /** @type {number} Touch/mouse end X position */
      this.touchEndX = 0;
      /** @type {boolean} Whether user is currently dragging */
      this.isDragging = false;
      /** @type {number} Number of slides visible at once */
      this.slidesPerView = 1;
      
      // Settings (initialized from data attributes)
      /** @type {boolean} Whether autoplay is enabled */
      this.autoplay = false;
      /** @type {number} Autoplay speed in milliseconds */
      this.autoplaySpeed = TestimonialsCarousel.CONFIG.DEFAULT_AUTOPLAY_SPEED;
      /** @type {boolean} Whether to show navigation arrows */
      this.showArrows = true;
      /** @type {boolean} Whether to show pagination dots */
      this.showPagination = true;
      /** @type {number} Total number of content blocks */
      this.blocksCount = 0;
      
      // Bound methods for event listener cleanup
      this._boundHandleResize = null;
      this._boundHandleKeydown = null;
      this._boundHandleTouchStart = null;
      this._boundHandleTouchMove = null;
      this._boundHandleTouchEnd = null;
    }

    // ========================================================================
    // LIFECYCLE CALLBACKS
    // ========================================================================

    /**
     * Called when element is added to DOM
     * @returns {void}
     */
    connectedCallback() {
      // Initialize DOM references
      this._initializeDOMReferences();
      
      // Exit early if no slides
      if (this.slides.length === 0) {
        console.warn('[TestimonialsCarousel] No slides found');
        return;
      }
      
      // Initialize settings from data attributes
      this._initializeSettings();
      
      // Setup the carousel
      this.setupCarousel();
      this.bindEvents();
      
      // Start autoplay if enabled and needed
      if (this.autoplay && this.blocksCount > this.slidesPerView) {
        this.startAutoplay();
      }
      
      // Setup accessibility attributes
      this._setupAccessibility();
    }

    /**
     * Called when element is removed from DOM
     * @returns {void}
     */
    disconnectedCallback() {
      this.stopAutoplay();
      this._removeEventListeners();
    }

    // ========================================================================
    // INITIALIZATION METHODS
    // ========================================================================

    /**
     * Initialize DOM element references
     * @private
     * @returns {void}
     */
    _initializeDOMReferences() {
      const { CLASSES } = TestimonialsCarousel;
      
      this.track = this.querySelector(`.${CLASSES.TRACK}`);
      this.slides = Array.from(this.querySelectorAll(`.${CLASSES.SLIDE}`));
      this.prevBtn = this.querySelector(`.${CLASSES.PREV_BTN}`);
      this.nextBtn = this.querySelector(`.${CLASSES.NEXT_BTN}`);
      this.pagination = this.querySelector(`.${CLASSES.PAGINATION}`);
    }

    /**
     * Initialize settings from data attributes
     * @private
     * @returns {void}
     */
    _initializeSettings() {
      const { CONFIG } = TestimonialsCarousel;
      
      // RTL detection (uses computed style to handle inherited direction)
      this.isRTL = getComputedStyle(this).direction === 'rtl';
      
      // Data attribute settings
      this.autoplay = this.dataset.autoplay === 'true';
      this.autoplaySpeed = parseInt(this.dataset.autoplaySpeed, 10) || CONFIG.DEFAULT_AUTOPLAY_SPEED;
      this.showArrows = this.dataset.showArrows !== 'false';
      this.showPagination = this.dataset.showPagination !== 'false';
      this.blocksCount = parseInt(this.dataset.blocksCount, 10) || this.slides.length;
      this.slidesPerView = this._getSlidesPerView();
    }

    /**
     * Setup accessibility attributes
     * @private
     * @returns {void}
     */
    _setupAccessibility() {
      this.setAttribute('role', 'region');
      this.setAttribute('aria-roledescription', 'carousel');
      this.setAttribute('aria-label', this.dataset.ariaLabel || 'Customer testimonials carousel');
      
      // Mark slides with appropriate roles
      this.slides.forEach((slide, index) => {
        slide.setAttribute('role', 'group');
        slide.setAttribute('aria-roledescription', 'slide');
        slide.setAttribute('aria-label', `${index + 1} of ${this.slides.length}`);
      });
    }

    // ========================================================================
    // RESPONSIVE HELPERS
    // ========================================================================

    /**
     * Get number of slides to show based on viewport width
     * @private
     * @returns {number} Number of slides per view
     */
    _getSlidesPerView() {
      const { BREAKPOINTS } = TestimonialsCarousel.CONFIG;
      const width = window.innerWidth;
      
      if (width >= BREAKPOINTS.DESKTOP) return 3;
      if (width >= BREAKPOINTS.TABLET) return 2;
      return 1;
    }

    /**
     * Calculate total number of pages
     * @readonly
     * @returns {number} Total number of pages
     */
    get totalPages() {
      return Math.max(1, this.slides.length - this.slidesPerView + 1);
    }

    // ========================================================================
    // SETUP METHODS
    // ========================================================================

    /**
     * Setup carousel layout and initial state
     * @returns {void}
     */
    setupCarousel() {
      this.slidesPerView = this._getSlidesPerView();
      
      // Check if navigation is needed
      const needsNavigation = this.blocksCount > this.slidesPerView;
      
      // Set slide widths
      const slideWidth = 100 / this.slidesPerView;
      this.slides.forEach(slide => {
        slide.style.flex = `0 0 ${slideWidth}%`;
        slide.style.maxWidth = `${slideWidth}%`;
      });
      
      // Setup pagination
      if (this.showPagination && this.pagination && needsNavigation) {
        this.pagination.style.display = '';
        this._setupPagination();
      } else if (this.pagination) {
        this.pagination.style.display = 'none';
      }
      
      // Setup arrows visibility
      this._updateArrowVisibility(needsNavigation);
      
      // Set initial position
      this.goToSlide(0, false);
    }

    /**
     * Setup pagination dots
     * @private
     * @returns {void}
     */
    _setupPagination() {
      if (!this.pagination) return;
      
      const { CLASSES } = TestimonialsCarousel;
      this.pagination.innerHTML = '';
      
      for (let i = 0; i < this.totalPages; i++) {
        const dot = document.createElement('button');
        dot.className = `${CLASSES.DOT}${i === 0 ? ` ${CLASSES.ACTIVE}` : ''}`;
        dot.type = 'button';
        dot.setAttribute('aria-label', `Go to slide ${i + 1} of ${this.totalPages}`);
        dot.setAttribute('aria-current', i === 0 ? 'true' : 'false');
        
        // Use closure to capture index
        dot.addEventListener('click', () => this.goToSlide(i));
        
        this.pagination.appendChild(dot);
      }
    }

    /**
     * Update arrow button visibility
     * @private
     * @param {boolean} needsNavigation - Whether navigation is needed
     * @returns {void}
     */
    _updateArrowVisibility(needsNavigation) {
      const showArrows = this.showArrows && needsNavigation;
      
      if (this.prevBtn) {
        this.prevBtn.style.display = showArrows ? '' : 'none';
        this.prevBtn.setAttribute('aria-hidden', showArrows ? 'false' : 'true');
      }
      if (this.nextBtn) {
        this.nextBtn.style.display = showArrows ? '' : 'none';
        this.nextBtn.setAttribute('aria-hidden', showArrows ? 'false' : 'true');
      }
    }

    // ========================================================================
    // EVENT BINDING
    // ========================================================================

    /**
     * Bind all event listeners
     * @returns {void}
     */
    bindEvents() {
      // Create bound methods for cleanup
      this._boundHandleResize = this._debounce(
        this._handleResize.bind(this), 
        TestimonialsCarousel.CONFIG.RESIZE_DEBOUNCE_DELAY
      );
      this._boundHandleKeydown = this._handleKeydown.bind(this);
      this._boundHandleTouchStart = this._handleTouchStart.bind(this);
      this._boundHandleTouchMove = this._handleTouchMove.bind(this);
      this._boundHandleTouchEnd = this._handleTouchEnd.bind(this);
      
      // Arrow buttons
      if (this.prevBtn) {
        this.prevBtn.addEventListener('click', () => this.prev());
      }
      if (this.nextBtn) {
        this.nextBtn.addEventListener('click', () => this.next());
      }
      
      // Keyboard navigation
      this.addEventListener('keydown', this._boundHandleKeydown);
      
      // Touch/swipe support
      if (this.track) {
        this.track.addEventListener('touchstart', this._boundHandleTouchStart, { passive: true });
        this.track.addEventListener('touchmove', this._boundHandleTouchMove, { passive: true });
        this.track.addEventListener('touchend', this._boundHandleTouchEnd);
        
        // Mouse drag support
        this.track.addEventListener('mousedown', this._boundHandleTouchStart);
        this.track.addEventListener('mousemove', this._boundHandleTouchMove);
        this.track.addEventListener('mouseup', this._boundHandleTouchEnd);
        this.track.addEventListener('mouseleave', this._boundHandleTouchEnd);
      }
      
      // Pause autoplay on hover/focus
      this.addEventListener('mouseenter', () => this.stopAutoplay());
      this.addEventListener('mouseleave', () => {
        if (this.autoplay && this.blocksCount > this.slidesPerView) {
          this.startAutoplay();
        }
      });
      this.addEventListener('focusin', () => this.stopAutoplay());
      this.addEventListener('focusout', () => {
        if (this.autoplay && this.blocksCount > this.slidesPerView) {
          this.startAutoplay();
        }
      });
      
      // Resize handler
      window.addEventListener('resize', this._boundHandleResize);
    }

    /**
     * Remove all event listeners
     * @private
     * @returns {void}
     */
    _removeEventListeners() {
      window.removeEventListener('resize', this._boundHandleResize);
      this.removeEventListener('keydown', this._boundHandleKeydown);
      
      if (this.track) {
        this.track.removeEventListener('touchstart', this._boundHandleTouchStart);
        this.track.removeEventListener('touchmove', this._boundHandleTouchMove);
        this.track.removeEventListener('touchend', this._boundHandleTouchEnd);
        this.track.removeEventListener('mousedown', this._boundHandleTouchStart);
        this.track.removeEventListener('mousemove', this._boundHandleTouchMove);
        this.track.removeEventListener('mouseup', this._boundHandleTouchEnd);
        this.track.removeEventListener('mouseleave', this._boundHandleTouchEnd);
      }
    }

    // ========================================================================
    // EVENT HANDLERS
    // ========================================================================

    /**
     * Handle keyboard navigation
     * @private
     * @param {KeyboardEvent} event - The keyboard event
     * @returns {void}
     */
    _handleKeydown(event) {
      // RTL-aware keyboard navigation
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          this.isRTL ? this.next() : this.prev();
          break;
        case 'ArrowRight':
          event.preventDefault();
          this.isRTL ? this.prev() : this.next();
          break;
        case 'Home':
          event.preventDefault();
          this.goToSlide(0);
          break;
        case 'End':
          event.preventDefault();
          this.goToSlide(this.totalPages - 1);
          break;
      }
    }

    /**
     * Handle touch/mouse start
     * @private
     * @param {TouchEvent|MouseEvent} event - The touch/mouse event
     * @returns {void}
     */
    _handleTouchStart(event) {
      // Don't initiate drag if user prefers reduced motion
      if (this._prefersReducedMotion()) return;
      
      this.isDragging = true;
      this.touchStartX = event.type === 'touchstart' 
        ? event.touches[0].clientX 
        : event.clientX;
      
      if (this.track) {
        this.track.style.transition = 'none';
      }
    }

    /**
     * Handle touch/mouse move
     * @private
     * @param {TouchEvent|MouseEvent} event - The touch/mouse event
     * @returns {void}
     */
    _handleTouchMove(event) {
      if (!this.isDragging) return;
      
      this.touchEndX = event.type === 'touchmove' 
        ? event.touches[0].clientX 
        : event.clientX;
    }

    /**
     * Handle touch/mouse end
     * @private
     * @returns {void}
     */
    _handleTouchEnd() {
      if (!this.isDragging) return;
      
      this.isDragging = false;
      
      if (this.track) {
        this.track.style.transition = '';
      }
      
      const diff = this.touchStartX - this.touchEndX;
      const { SWIPE_THRESHOLD } = TestimonialsCarousel.CONFIG;
      
      if (Math.abs(diff) > SWIPE_THRESHOLD) {
        // RTL-aware swipe direction
        if (this.isRTL) {
          diff > 0 ? this.prev() : this.next();
        } else {
          diff > 0 ? this.next() : this.prev();
        }
      }
      
      // Reset touch positions
      this.touchStartX = 0;
      this.touchEndX = 0;
    }

    /**
     * Handle window resize
     * @private
     * @returns {void}
     */
    _handleResize() {
      const newSlidesPerView = this._getSlidesPerView();
      
      if (newSlidesPerView !== this.slidesPerView) {
        this.slidesPerView = newSlidesPerView;
        this.setupCarousel();
        
        // Ensure current index is valid
        if (this.currentIndex >= this.totalPages) {
          this.currentIndex = this.totalPages - 1;
        }
        this.goToSlide(this.currentIndex, false);
        
        // Restart autoplay if needed
        this.stopAutoplay();
        if (this.autoplay && this.blocksCount > this.slidesPerView) {
          this.startAutoplay();
        }
      }
    }

    // ========================================================================
    // NAVIGATION METHODS
    // ========================================================================

    /**
     * Navigate to a specific slide
     * @param {number} index - The slide index to navigate to
     * @param {boolean} [animate=true] - Whether to animate the transition
     * @returns {void}
     */
    goToSlide(index, animate = true) {
      // Clamp index to valid range
      index = Math.max(0, Math.min(index, this.totalPages - 1));
      this.currentIndex = index;
      
      // Calculate transform
      const slideWidth = 100 / this.slidesPerView;
      let translateValue = index * slideWidth;
      
      // RTL handling: In RTL mode with dir="rtl", flexbox lays out items right-to-left
      // We need positive translateX to scroll left (show next slides which are to the left)
      if (!this.isRTL) {
        translateValue = -translateValue;
      }
      
      // Apply transform with reduced motion support
      if (this.track) {
        const shouldAnimate = animate && !this._prefersReducedMotion();
        const { ANIMATION_DURATION } = TestimonialsCarousel.CONFIG;
        
        this.track.style.transition = shouldAnimate 
          ? `transform ${ANIMATION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)` 
          : 'none';
        this.track.style.transform = `translateX(${translateValue}%)`;
      }
      
      // Update UI
      this._updatePagination();
      this._updateArrows();
      
      // Announce slide change for screen readers
      if (animate) {
        this._announceSlideChange();
      }
    }

    /**
     * Navigate to previous slide
     * @returns {void}
     */
    prev() {
      const newIndex = this.currentIndex - 1;
      
      if (newIndex >= 0) {
        this.goToSlide(newIndex);
      } else if (this.autoplay) {
        // Loop to end if autoplay is enabled
        this.goToSlide(this.totalPages - 1);
      }
    }

    /**
     * Navigate to next slide
     * @returns {void}
     */
    next() {
      const newIndex = this.currentIndex + 1;
      
      if (newIndex < this.totalPages) {
        this.goToSlide(newIndex);
      } else if (this.autoplay) {
        // Loop to start if autoplay is enabled
        this.goToSlide(0);
      }
    }

    // ========================================================================
    // UI UPDATE METHODS
    // ========================================================================

    /**
     * Update pagination dots state
     * @private
     * @returns {void}
     */
    _updatePagination() {
      if (!this.pagination) return;
      
      const { CLASSES } = TestimonialsCarousel;
      const dots = this.pagination.querySelectorAll(`.${CLASSES.DOT}`);
      
      dots.forEach((dot, i) => {
        const isActive = i === this.currentIndex;
        dot.classList.toggle(CLASSES.ACTIVE, isActive);
        dot.setAttribute('aria-current', isActive ? 'true' : 'false');
      });
    }

    /**
     * Update arrow button states
     * @private
     * @returns {void}
     */
    _updateArrows() {
      const isAtStart = this.currentIndex === 0;
      const isAtEnd = this.currentIndex >= this.totalPages - 1;
      
      if (this.prevBtn) {
        // Only disable if not in autoplay mode (which loops)
        const disabled = !this.autoplay && isAtStart;
        this.prevBtn.disabled = disabled;
        this.prevBtn.setAttribute('aria-disabled', disabled ? 'true' : 'false');
      }
      
      if (this.nextBtn) {
        const disabled = !this.autoplay && isAtEnd;
        this.nextBtn.disabled = disabled;
        this.nextBtn.setAttribute('aria-disabled', disabled ? 'true' : 'false');
      }
    }

    /**
     * Announce slide change to screen readers
     * @private
     * @returns {void}
     */
    _announceSlideChange() {
      const { CLASSES } = TestimonialsCarousel;
      let liveRegion = this.querySelector(`.${CLASSES.LIVE_REGION}`);
      
      if (!liveRegion) {
        liveRegion = document.createElement('div');
        liveRegion.className = `${CLASSES.LIVE_REGION} ${CLASSES.VISUALLY_HIDDEN}`;
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        this.appendChild(liveRegion);
      }
      
      liveRegion.textContent = `Showing slide ${this.currentIndex + 1} of ${this.totalPages}`;
    }

    // ========================================================================
    // AUTOPLAY METHODS
    // ========================================================================

    /**
     * Start autoplay
     * @returns {void}
     */
    startAutoplay() {
      // Don't start if already running, prefers reduced motion, or not enough slides
      if (this.autoplayInterval) return;
      if (this._prefersReducedMotion()) return;
      if (this.slides.length <= this.slidesPerView) return;
      
      this.autoplayInterval = setInterval(() => {
        this.next();
      }, this.autoplaySpeed);
    }

    /**
     * Stop autoplay
     * @returns {void}
     */
    stopAutoplay() {
      if (this.autoplayInterval) {
        clearInterval(this.autoplayInterval);
        this.autoplayInterval = null;
      }
    }

    // ========================================================================
    // UTILITY METHODS
    // ========================================================================

    /**
     * Check if user prefers reduced motion
     * @private
     * @returns {boolean} True if user prefers reduced motion
     */
    _prefersReducedMotion() {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    /**
     * Debounce utility function
     * @private
     * @param {Function} func - The function to debounce
     * @param {number} wait - The debounce delay in milliseconds
     * @returns {Function} The debounced function
     */
    _debounce(func, wait) {
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
  });
}
