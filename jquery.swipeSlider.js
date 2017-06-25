;(function ( $, window, undefined ) {
	var defaults = {
		animationDuration: 300,
		autoReverse: false,
		autoTransitionDuration: false,
		bounce: true,
		drag: true,
		infinite: false,
		onSlideStartCallback: undefined,
		onSlideCompleteCallback: undefined,
		onMoveCallback: undefined,
		onStartCallback: undefined,
		startIndex: 0
	};
	
	var pluginName = 'swipeSlider';

	function Plugin(element, options) {
		this.options = $.extend({}, defaults, options);

		this._name = pluginName;

		this.element = $(element);

		this.init();
	}

	Plugin.prototype = {
		init: function (element) {
			var sliderClass = 'ss-slider';
			var slidesContainerClass = 'ss-slides';
			var slideClass = 'ss-slide';

			var slidesContainerCss = {};
			var slideCss = {};

			this.element.slidesContainer = this.element.children();
			if (this.element.slidesContainer.length !== 1)
				throw new Error('SwipeSlider: slidesContainer.length !== 1 \n');

			this.element.slidesContainer.slides = this.element.slidesContainer.children();
			if (this.element.slidesContainer.slides.length < 1)
				throw new Error('SwipeSlider: slides.length < 1 \n');

			var slidesCount = this.element.slidesContainer.slides.length;
			var slidesContainerWidth = (slidesCount + 1) * 100;
			var slideWidth = 100 / (slidesCount + 1);

			slidesContainerCss.width = slidesContainerWidth + '%';
			slideCss.width = slideWidth + '%';

			this.padding = this.element.width() / 2;
			this.longTouch = undefined;
			this.index = this.options.startIndex;
			this.isMouseDown = false;
			this.maxIndex = slidesCount - 1;
			this.movex = undefined;
			this.touchstartx = undefined;
			this.autoTransitionTimeout = null;

			this.element.addClass(sliderClass);
			this.element.slidesContainer.addClass(slidesContainerClass);
			this.element.slidesContainer.slides.addClass(slideClass);

			this.element.slidesContainer.css(slidesContainerCss);
			this.element.slidesContainer.slides.css(slideCss);

			if (this.options.drag) {
				this.element
					.on('mousedown touchstart', this._onDown.bind(this))
					.on('mousemove touchmove', this._onMove.bind(this))
					.on('mouseup touchend', this._onUp.bind(this));
			}

			if (this.options.infinite) {
				if (this.index == 0) {
					this._addPrevPlaceholderSlide();
				}

				if (this.index == this.maxIndex) {
					this._addNextPlaceholderSlide();
				}
			} else {
				var translateX = this.getOffset() * -1;

				this.element.slidesContainer.css({
					'padding': '0 ' + this.padding + 'px',
					'transform': 'translate3d(' + translateX + 'px,0,0)'
				});
			}

			if (this.options.autoTransitionDuration)
				this._setAutoTransitionTimeout();
				
		},
		getOffset: function() {
			return this.index * this.element.width() + this.padding;
		},
		slideNext: function() {
			if (this.options.infinite && this.index == this.maxIndex)
				this.index++;

			if (this.index + 1 <= this.maxIndex)
				this.index++;

			console.log(this.index);

			this._slide();
		},
		slidePrevious: function() {
			if (this.options.infinite && this.index == 0)
				this.index--;

			if (this.index - 1 >= 0)
				this.index--;
			
			this._slide();
		},
		_autoTransition: function(plugin) {
			if (plugin.options.autoReverse)
				plugin.slidePrevious();
			else
				plugin.slideNext();
			
			plugin._setAutoTransitionTimeout();
		},
		_addPrevPlaceholderSlide: function() {
			var prevSlide = this.element.slidesContainer.slides[this.maxIndex];
			this.element.slidesContainer.prepend(prevSlide.outerHTML).find('.ss-slide:first-of-type').addClass('ss-prev-slide');

			this.padding = this.element.width();

			this._positionSlider();
		},
		_addNextPlaceholderSlide: function() {
			var nextSlide = this.element.slidesContainer.slides[0];
			this.element.slidesContainer.append(nextSlide.outerHTML).find('.ss-slide:last-of-type').addClass('ss-next-slide');

			this._positionSlider();
		},
		_onDown: function(event) {
			this.isMouseDown = true;

			this.longTouch = false;
			this.movex = undefined;
			setTimeout(function () {
				this.longTouch = true;
			}, 250);

			var pageX = typeof event.originalEvent.touches != 'undefined'
				? event.originalEvent.touches[0].pageX
				: event.originalEvent.pageX;
			this.startx = pageX;

			this.element.slidesContainer.css({ transition: 'none' });
			if ($.isFunction(this.options.onDownCallback))
				this.options.onDownCallback.call(this);

		},
		_onMove: function(event) {
			if (!this.isMouseDown)
				return;

			var pageX = typeof event.originalEvent.touches != 'undefined'
				? event.originalEvent.touches[0].pageX
				: event.originalEvent.pageX;

			var delta = this.startx - pageX;

			this.movex = this.getOffset() + delta;

			var translateX = this.movex * -1;

			var maxTranslateX = 0;
			var minTranslateX = (this.element.slidesContainer.width() - (this.padding * 2)) * -1;

			if (!this.options.infinite) {
				if (translateX < minTranslateX)
					translateX = minTranslateX;

				if (translateX > maxTranslateX)
					translateX = maxTranslateX;
			}

			this.element.slidesContainer.css('transform', 'translate3d(' + translateX + 'px,0,0)');

			if ($.isFunction(this.options.onMoveCallback))
				this.options.onMoveCallback.call(this);

		},
		_onUp: function(event) {
			if (!this.isMouseDown)
				return; 

			this.isMouseDown = false;

			// Calculate the distance swiped.
			var oldOffset = this.getOffset();
			var absMove = Math.abs(oldOffset - this.movex);

			if (this.options.infinite) {
				if (this.movex > oldOffset && this.index < this.maxIndex + 1) {
					this.index++;
				} else if (this.movex < oldOffset && this.index > -1) {
					this.index--;
				}
			} else {
				if (absMove > this.slideWidth / this.maxIndex || this.longTouch === false) {
					if (this.movex > oldOffset && this.index < this.maxIndex) {
						this.index++;
					} else if (this.movex < oldOffset && this.index > 0) {
						this.index--;
					}
				}
			}

			this._slide();

			if ($.isFunction(this.options.onUpEndCallback))
				this.options.onUpCallback.call(this);
		},
		_positionSlider: function() {
			var translateX = this.getOffset() * -1;
			this.element.slidesContainer.css({ transform: 'translate3d(' + translateX + 'px,0,0)' });
		},
		_removePrevPlaceholderSlide: function() {
			$(this.element).find('.ss-slide.ss-prev-slide').remove();
			this.padding = 0;

			this._positionSlider();
		},
		_removeNextPlaceholderSlide: function() {
			$(this.element).find('.ss-slide.ss-next-slide').remove();

			this._positionSlider();
		},
		_setAutoTransitionTimeout: function() {
			var plugin = this;

			clearTimeout(this.autoTransitionTimeout);
			setTimeout(function() {
				plugin._autoTransition(plugin);
			}, this.options.autoTransitionDuration);
		},
		_slide: function () {
			console.log('slidestart index:' + this.index);

			// Align the slider to the new index.
			var translateX = this.getOffset() * -1;
			console.log('new translateX: ' + translateX);
			var animationDurationInSecs = '0.' + (this.options.animationDuration / 100) + 's';
			this.element.slidesContainer.css({ transform: 'translate3d(' + translateX + 'px,0,0)', transition: 'transform ' + animationDurationInSecs + ' ease-out' });
			var plugin = this;
			this.element.slidesContainer.off('webkitTransitionEnd otransitionend msTransitionEnd transitionend').on('webkitTransitionEnd otransitionend msTransitionEnd transitionend', function() { plugin._transitionEnd(plugin); });

			if ($.isFunction(this.options.onSlideStartCallback))
				this.options.onSlideStartCallback.call(this);

		},
		_slideComplete: function() {
			if (this.options.infinite) {
				this.element.slidesContainer.css({ transition: 'none' });

				if (this.index === -1) {
					this.index = this.maxIndex;

					this._removePrevPlaceholderSlide();
				}

				if (this.index === this.maxIndex + 1) {
					this.index = 0;

					this._removeNextPlaceholderSlide();
				}

				if (this.index == 0) {
					this._addPrevPlaceholderSlide();
				}

				if (this.index === this.maxIndex) {
					this._addNextPlaceholderSlide();
				}

				if (this.index === 1) {
					this._removePrevPlaceholderSlide();
				}

				if (this.index === this.maxIndex - 1) {
					this._removeNextPlaceholderSlide();
				}
			}

			if ($.isFunction(this.options.onSlideCompleteCallback))
				this.options.onSlideCompleteCallback.call(this);
		},
		_transitionEnd: function(plugin) {
			plugin._slideComplete();
		}
	}

	$.fn[pluginName] = function(options) {
		return this.each(function() {
			if (!$.data(this, 'plugin_' + pluginName)) {
				$.data(this, 'plugin_' + pluginName, new Plugin(this, options));
			} else if ($.isFunction(Plugin.prototype[options])) {
				$.data(this, 'plugin_' + pluginName)[options]();
			}
		});
	}
}(jQuery, window));