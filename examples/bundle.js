(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var sidebar = new (require('..')),
    emit = require('emit-bindings');
sidebar.init();

var view1html = 
'<ul>' +
    '<li>' + 
        'View 1' +
    '</li>' +
    '<li data-emit="sidebar.close">' + 
        'Hide the scrollbar' +
    '</li>' +
'</ul>';
var view2html = 
'<ul>' +
    '<li data-emit="open.view3">' + 
        'Child View >' +
    '</li>'
'</ul>';
var view3html = 
'<ul>' +
    '<li data-emit="sidebar.back">' +
        'Back' +
    '</li>' +
'</ul>';


var view1 = sidebar.addView( view1html, {
    title: 'Home',
    home: true
});
var view2 = sidebar.addView( view2html, {
    title: 'Secondary',
    home: true
});
var view3 = sidebar.addView( view3html, {
    title: 'Child Child',
    home: true,
    parent: view2,
    linkto: false
});

// opening up view when event is emitted
emit.on( 'open.view2', view2.open.bind( view2 ) );
emit.on( 'open.view3', view3.open.bind( view3 ) );
sidebar.open( );
},{"..":2,"emit-bindings":3}],2:[function(require,module,exports){
/*
 * Sidebar - Manages sidebar & sidebar views
 */
/* global Event, require, module */
'use strict';

var EventEmitter = require( 'eventemitter2' ).EventEmitter2,
    emit = require( 'emit-bindings' ),
    Ymir = require( 'ymir' ).Ymir,
    SidebarView = require( './view' );

module.exports = Sidebar;
module.exports.SidebarView = SidebarView;

function Sidebar() {

    EventEmitter.call( this );

    // do view check
    this.el = document.querySelector( '[data-sidebar]' );
    this.nav = document.createElement( 'nav' );
    this._teardownViews();
    this._homeView = null;
    this._currentView = null;
    this.addedClasses = {};

    // signify inialization
    if ( this.el ) {
        this.el.appendChild( this.nav );

        if ( !this.wrapper ) {
            this.wrapper = document.createElement( 'div' );
            this.el.appendChild( this.wrapper );
        }
        this.el.classList.add( 'sidebar-init' );
    }
    this.addListeners();
}

Sidebar.prototype = Object.create( EventEmitter.prototype );

Sidebar.prototype.addView = function( template, opts, callback ) {
    if ( !template ) return null;

    opts = opts || {};
    opts.nav = this.nav;

    var isReady = this.isSidebarView( template ),
        view = isReady ? template : null;

    if ( !view ) {
        view = new SidebarView( template, opts );
    }
    else {
        view.setOptions( opts );
    }

    if ( ( opts && opts.home ) || !this._homeView || view.options.home ) {
        this._homeView = view;
    }

    // this helps handling the view space
    view.on( 'open', this._onViewOpeningSecondary.bind( this, view ) );
    view.on( 'open:shown', this._onViewOpening.bind( this, view ) );
    view.on( 'rendered', this._onViewRendered.bind( this ) );

    if ( isReady ) {
        this._onViewReady( callback, null, view );
    }
    else {
        view.once( 'ready', this._onViewReady.bind( this, callback, null ) );
        view.once( 'error', this._onViewReady.bind( this, callback ) );
    }

    return view;
};

Sidebar.prototype.addListeners = function ( ) {
    emit.on('sidebar.back', this.back.bind( this ));
    emit.on('sidebar.close', this.close.bind( this ));
    emit.on('sidebar.open', this.open.bind( this ));
    emit.on('sidebar.toggle', this.toggle.bind( this ));
};

Sidebar.prototype.removeView = function( view ) {
    var id = typeof view === 'string' ? view :  view.id;
    this.viewManager.removeView( id );
    
    // if remove view is current go to home
    if ( this._currentView.id === view.id ) {
        this.home();
    }
};

Sidebar.prototype.setCurrentView = function( view ) {
    var id = view.id,
        opened = this.viewManager.open( id );
    if ( opened ) {
        this._currentView = view;
    }
};

Sidebar.prototype.getView = function( id ) {
    return this.viewManager.views[ id ];
};

Sidebar.prototype.getCurrentView = function() {
    return this._currentView;
};

Sidebar.prototype.home = function() {
    if ( !this.isSidebarView( this._homeView ) ) return;
    if ( this._currentView.id === this._homeView.id ) return;
    this.viewManager.open( this._homeView.id );
};

Sidebar.prototype.back = function() {
    // see if a proper parent view is set
    this.el.classList.add( 'back' );
    if ( this.isSidebarView( this._currentView ) && this._currentView._parentView ) {
        var _parent = this._currentView._parentView;
        if ( this.isSidebarView( _parent ) ) {
            return _parent.open();
        }
    }
    // if not go to home
    this.home();
};

Sidebar.prototype.open = function( data ) {
    this.state = 1;
    if ( this.el ) this.el.classList.add( 'show' );
    if ( data instanceof Event ) {
        data = null;
    }
    this.emit( 'open', data );
};

Sidebar.prototype.close = function( data ) {
    this.state = 0;
    if ( this.el ) this.el.classList.remove( 'show' );
    if ( data instanceof Event ) {
        data = null;
    }
    this.emit( 'close', data );
};

Sidebar.prototype.toggle = function() {
    if ( this.state ) {
        this.close();
        return;
    }
    this.open();
};

// width is only temp till next open.
Sidebar.prototype.expand = function( width ) {
    if ( !this.el ) return;
    this.el.style.width = typeof width === 'number' ? width + 'px' : width;
    this.emit( 'expanded', {
        width: width
    } );
};

Sidebar.prototype.addClass = function( c ) {
    if ( !this.el ) return;
    this.el.classList.add( c );
    this.addedClasses[ c ] = true;
    this.emit( 'classAdded', c );
};

Sidebar.prototype.removeClass = function( c ) {
    if ( !this.el ) return;
    this.el.classList.remove( c );
    delete this.addedClasses[ c ];
    this.emit( 'classRemoved', c );
};

Sidebar.prototype.isSidebarView = function( view ) {
    return ( typeof view === 'object' && view instanceof SidebarView && !view._removed );
};

Sidebar.prototype.isOpen = function() {
    return this.state ? true : false;
};

Sidebar.prototype._appendView = function( view ) {
    if ( this.wrapper ) this.wrapper.appendChild( view.el );
};

Sidebar.prototype._handleAnimations = function() {
    this._currentView.once( 'animation:complete', function() {
        if ( this._prevView ) {
            this._prevView.el.classList.remove( 'sidebar-view-out' );
            this._prevView = null;
        }
        setTimeout( function() {
            this.el.classList.remove( 'animating' );
            this.el.classList.remove( 'animating-secondary' );
            this.el.classList.remove( 'back' );
        }.bind( this ), 500);
    }.bind( this ) );
};

Sidebar.prototype._cacheView = function( view ) {
    // no doups
    if ( this.viewManager.views[ view.id ] ) {
        return;
    }
    
    this.viewManager.addView( view );

    // if there is no other views auto open.
    if ( !this._currentView ) {
        this._currentView = view;
        this.viewManager.open( view.id );
    }

    this.emit( 'view.added', view );
    return view;
};

Sidebar.prototype._teardownViews = function() {
    if ( !this.viewManager || !this.viewManager.viewList.length ) return;
    this.viewManager.viewList.forEach( function( view ) {
        this.viewManager.removeView( view.id );
        this.emit( 'view.removed', view );
    }.bind( this ) );
};

Sidebar.prototype._onViewOpening = function( view ) {
    for ( var c in this.addedClasses ) {
        this.removeClass( c );
    }
    this.el.classList.add( 'animating' );
    this.el.removeAttribute( 'style' );
    if ( !this._currentView || view.id !== this._currentView.id ) {

        // close old view
        this._prevView = this._currentView;
        if ( this._prevView ) {
            this._prevView.close();
            this._prevView.el.classList.add( 'sidebar-view-out' );
        }
        this._currentView = view;
    }
    this._handleAnimations(); // must come after we set a _currentView
    this.started = true;
    // indicate there is a view opening
    this.emit( 'view.opened', view );
    this.emit( 'view.opened.' + view.id, view );

};

Sidebar.prototype._onViewOpeningSecondary = function( view ) {
    this.el.classList.add( 'animating-secondary' );
    this.viewManager.open( view.id );
};

Sidebar.prototype._onViewRendered = function( view ) {
    // create general and namespaced event
    this.emit( 'view.rendered', view );
    this.emit( 'view.rendered.' + view.id, view );
};

Sidebar.prototype._onViewReady = function( callback, err, view ) {
    if ( err ) {
        view.off( 'open', this._onViewOpening.bind( this ) );
        view.remove();
        this.emit( 'error', err );
        return;
    }
    // unbind any stale handlers
    view.off( 'ready', this._onViewReady.bind( this, callback, null ) );
    view.off( 'error', this._onViewReady.bind( this, callback ) );
    if ( typeof callback === 'function' ) {
        callback( err, view );
    }
    // cache view after successful
    this._cacheView( view );
};

Sidebar.prototype.init = function() {
    // do view check
    this.el = document.querySelector( '[data-sidebar]' );
    this._teardownViews();
    this._homeView = null;
    this._currentView = null;
    this._views = [];
    this._viewsById = {};

    // signify inialization
    if ( this.el ) {
        if ( !this.wrapper ) {
            this.wrapper = document.createElement( 'div' );
            this.el.appendChild( this.wrapper );
        }
        this.el.classList.add( 'sidebar-init' );
        this.viewManager = new Ymir( {
          el: this.wrapper,
          listEl: this.nav,
          className: 'sidebar-wrapper'
        } );
        this.emit( 'ready', this );
    }
};

},{"./view":7,"emit-bindings":3,"eventemitter2":4,"ymir":6}],3:[function(require,module,exports){
'use strict';

var EventEmitter2 = require( 'eventemitter2' ).EventEmitter2;

/*
    dependencies
*/

/* binding */
var bindingMethod = window.addEventListener ? 'addEventListener' : 'attachEvent';
var eventPrefix = bindingMethod !== 'addEventListener' ? 'on' : '';

function bind( el, type, fn, capture ) {
    el[ bindingMethod ]( eventPrefix + type, fn, capture || false );
    return fn;
}

/* matching */
var vendorMatch = Element.prototype.matches || Element.prototype.webkitMatchesSelector || Element.prototype.mozMatchesSelector || Element.prototype.msMatchesSelector || Element.prototype.oMatchesSelector;

function matches( el, selector ) {
    if ( !el || el.nodeType !== 1 ) {
        return false;
    }
    if ( vendorMatch ) {
        return vendorMatch.call( el, selector );
    }
    var nodes = document.querySelectorAll( selector, el.parentNode );
    for ( var i = 0; i < nodes.length; ++i ) {
        if ( nodes[ i ] == el ) {
            return true;  
        } 
    }
    return false;
}

/* closest */

function closest( element, selector, checkSelf, root ) {
    element = checkSelf ? {parentNode: element} : element;

    root = root || document;

    /* Make sure `element !== document` and `element != null`
       otherwise we get an illegal invocation */
    while ( ( element = element.parentNode ) && element !== document ) {
        if ( matches( element, selector ) ) {
            return element;
        }

        /* After `matches` on the edge case that
           the selector matches the root
           (when the root is not the document) */
        if (element === root) {
            return;
        }
    }
}

/*
    end dependencies
*/

function Emit() {
    var self = this;
    EventEmitter2.call( self );

    self.validators = [];
    self.touchMoveDelta = 10;
    self.initialTouchPoint = null;

    bind( document, 'touchstart', self.handleEvent.bind( self ) );
    bind( document, 'touchmove', self.handleEvent.bind( self ) );
    bind( document, 'touchend', self.handleEvent.bind( self ) );
    bind( document, 'click', self.handleEvent.bind( self ) );
    bind( document, 'input', self.handleEvent.bind( self ) );
    bind( document, 'submit', self.handleEvent.bind( self ) );
}

Emit.prototype = Object.create( EventEmitter2.prototype );

function getTouchDelta( event, initial ) {
    var deltaX = ( event.touches[ 0 ].pageX - initial.x );
    var deltaY = ( event.touches[ 0 ].pageY - initial.y );
    return Math.sqrt( ( deltaX * deltaX ) + ( deltaY * deltaY ) );
}

Emit.prototype.handleEvent = function( event ) {
    var self = this;

    var touches = event.touches;
    var delta = -1;

    if ( typeof event.propagationStoppedAt !== 'number' || isNaN( event.propagationStoppedAt ) ) {
        event.propagationStoppedAt = 100; // highest possible value
    }

    switch ( event.type ) {
        case 'touchstart':
            self.initialTouchPoint = self.lastTouchPoint = {
                x: touches && touches.length ? touches[ 0 ].pageX : 0,
                y: touches && touches.length ? touches[ 0 ].pageY : 0
            };

            break;

        case 'touchmove':
            if ( touches && touches.length && self.initialTouchPoint ) {
                delta = getTouchDelta( event, self.initialTouchPoint );
                if ( delta > self.touchMoveDelta ) {
                    self.initialTouchPoint = null;
                }

                self.lastTouchPoint = {
                    x: touches[ 0 ].pageX,
                    y: touches[ 0 ].pageY
                };
            }

            break;

        case 'click':
        case 'touchend':
        case 'input':
        case 'submit':
            // eat any late-firing click events on touch devices
            if ( event.type === 'click' && self.lastTouchPoint ) {
                if ( event.touches && event.touches.length ) {
                    delta = getTouchDelta( event, self.lastTouchPoint );
                    if ( delta < self.touchMoveDelta ) {
                        event.preventDefault();
                        event.stopPropagation();
                        return;
                    }
                }
            }

            // handle canceling touches that have moved too much
            if ( event.type === 'touchend' && !self.initialTouchPoint ) {
                return;
            }

            var selector = '[data-emit]';
            var originalElement = event.target || event.srcElement;
            
            // if it's a link and it has no emit attribute, allow the event to pass
            if ( !originalElement.getAttribute( 'data-emit' ) && ( originalElement.tagName === 'A' || originalElement.tagName === 'BUTTON' || originalElement.tagName === 'INPUT' ) ) {
                return;
            }
            
            var forceAllowDefault = originalElement.tagName == 'INPUT' && ( originalElement.type == 'checkbox' || originalElement.type == 'radio' );
            var el = closest( originalElement, selector, true, document );

            if ( el ) {
                var depth = -1;
                while ( el && event.propagationStoppedAt > depth && ++depth < 100 ) {
                    var validated = true;
                    for ( var validatorIndex = 0; validatorIndex < self.validators.length; ++validatorIndex ) {
                        if ( !self.validators[ validatorIndex ].call( this, el, event ) ) {
                            validated = false;
                            break;
                        }
                    }

                    // eat the event if a validator failed
                    if ( !validated ) {
                        event.preventDefault();
                        event.stopPropagation();
                        event.propagationStoppedAt = depth;
                        el = null;
                        continue;
                    }

                    if ( typeof( self.validate ) == 'function' && !self.validate.call( self, el ) ) {
                        el = closest( el, selector, false, document );
                        continue;
                    }

                    if ( el.tagName == 'FORM' ) {
                        if ( event.type != 'submit' ) {
                            el = closest( el, selector, false, document );
                            continue;
                        }
                    }
                    else if ( el.tagName == 'INPUT' ) {
                        if ( !( el.type == 'submit' || el.type == 'checkbox' || el.type == 'radio' || el.type == 'file' ) && event.type != 'input' ) {
                            el = closest( el, selector, false, document );
                            continue;
                        }
                    }
                    else if ( el.tagName == 'SELECT' ) {
                        if ( event.type != 'input' ) {
                            el = closest( el, selector, false, document );
                            continue;
                        }
                    }

                    event.emitTarget = el;
                    event.depth = depth;
                    self._emit( el, event, forceAllowDefault );
                    el = closest( el, selector, false, document );
                }

                if ( depth >= 100 ) {
                    throw new Error( 'Exceeded depth limit for Emit calls.' );
                }
            }
            else {
                self.emit( 'unhandled', event );
            }

            self.initialTouchPoint = null;

            break;
    }
};

Emit.prototype._emit = function( element, event, forceDefault ) {
    var self = this;
    var optionString = element.getAttribute( 'data-emit-options' );
    var options = {};
    var ignoreString = element.getAttribute( 'data-emit-ignore' );
    var i;

    if ( ignoreString && ignoreString.length ) {
        var ignoredEvents = ignoreString.toLowerCase().split( ' ' );
        for ( i = 0; i < ignoredEvents.length; ++i ) {
            if ( event.type == ignoredEvents[ i ] ) {
                return;
            }
        }
    }

    if ( optionString && optionString.length ) {
        var opts = optionString.toLowerCase().split( ' ' );
        for ( i = 0; i < opts.length; ++i ) {
            options[ opts[ i ] ] = true;
        }
    }

    if ( !forceDefault && !options.allowdefault ) {
        event.preventDefault();
    }

    if ( !options.allowpropagate ) {
        event.stopPropagation();
        event.propagationStoppedAt = event.depth;
    }

    var emissionList = element.getAttribute( 'data-emit' );
    if ( !emissionList ) {
        // allow for empty behaviors that catch events
        return;
    }

    var emissions = emissionList.split( ',' );
    if ( options.debounce ) {
        self.timeouts = self.timeouts || {};
        if ( self.timeouts[ element ] ) {
            clearTimeout( self.timeouts[ element ] );
        }
        
        (function() {
            var _element = element;
            var _emissions = emissions;
            var _event = event;
            self.timeouts[ element ] = setTimeout( function() {
                _emissions.forEach( function( emission ) {
                    self.emit( emission, _event );
                } );
                clearTimeout( self.timeouts[ _element ] );
                self.timeouts[ _element ] = null;
            }, 250 );
        } )();

        return;
    }
    
    emissions.forEach( function( emission ) {
        self.emit( emission, event );
    } );
};

Emit.prototype.addValidator = function( validator ) {
    var self = this;

    var found = false;
    for ( var i = 0; i < self.validators.length; ++i ) {
        if ( self.validators[ i ] == validator ) {
            found = true;
            break;
        }
    }

    if ( found ) {
        return false;
    }

    self.validators.push( validator );
    return true;
};

Emit.prototype.removeValidator = function( validator ) {
    var self = this;

    var found = false;
    for ( var i = 0; i < self.validators.length; ++i ) {
        if ( self.validators[ i ] == validator ) {
            self.validators.splice( i, 1 );
            found = true;
            break;
        }
    }

    return found;
};

Emit.singleton = Emit.singleton || new Emit();
Emit.singleton.Emit = Emit;

module.exports = Emit.singleton;

},{"eventemitter2":4}],4:[function(require,module,exports){
/*!
 * EventEmitter2
 * https://github.com/hij1nx/EventEmitter2
 *
 * Copyright (c) 2013 hij1nx
 * Licensed under the MIT license.
 */
;!function(undefined) {

  var isArray = Array.isArray ? Array.isArray : function _isArray(obj) {
    return Object.prototype.toString.call(obj) === "[object Array]";
  };
  var defaultMaxListeners = 10;

  function init() {
    this._events = {};
    if (this._conf) {
      configure.call(this, this._conf);
    }
  }

  function configure(conf) {
    if (conf) {

      this._conf = conf;

      conf.delimiter && (this.delimiter = conf.delimiter);
      conf.maxListeners && (this._events.maxListeners = conf.maxListeners);
      conf.wildcard && (this.wildcard = conf.wildcard);
      conf.newListener && (this.newListener = conf.newListener);

      if (this.wildcard) {
        this.listenerTree = {};
      }
    }
  }

  function EventEmitter(conf) {
    this._events = {};
    this.newListener = false;
    configure.call(this, conf);
  }

  //
  // Attention, function return type now is array, always !
  // It has zero elements if no any matches found and one or more
  // elements (leafs) if there are matches
  //
  function searchListenerTree(handlers, type, tree, i) {
    if (!tree) {
      return [];
    }
    var listeners=[], leaf, len, branch, xTree, xxTree, isolatedBranch, endReached,
        typeLength = type.length, currentType = type[i], nextType = type[i+1];
    if (i === typeLength && tree._listeners) {
      //
      // If at the end of the event(s) list and the tree has listeners
      // invoke those listeners.
      //
      if (typeof tree._listeners === 'function') {
        handlers && handlers.push(tree._listeners);
        return [tree];
      } else {
        for (leaf = 0, len = tree._listeners.length; leaf < len; leaf++) {
          handlers && handlers.push(tree._listeners[leaf]);
        }
        return [tree];
      }
    }

    if ((currentType === '*' || currentType === '**') || tree[currentType]) {
      //
      // If the event emitted is '*' at this part
      // or there is a concrete match at this patch
      //
      if (currentType === '*') {
        for (branch in tree) {
          if (branch !== '_listeners' && tree.hasOwnProperty(branch)) {
            listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i+1));
          }
        }
        return listeners;
      } else if(currentType === '**') {
        endReached = (i+1 === typeLength || (i+2 === typeLength && nextType === '*'));
        if(endReached && tree._listeners) {
          // The next element has a _listeners, add it to the handlers.
          listeners = listeners.concat(searchListenerTree(handlers, type, tree, typeLength));
        }

        for (branch in tree) {
          if (branch !== '_listeners' && tree.hasOwnProperty(branch)) {
            if(branch === '*' || branch === '**') {
              if(tree[branch]._listeners && !endReached) {
                listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], typeLength));
              }
              listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i));
            } else if(branch === nextType) {
              listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i+2));
            } else {
              // No match on this one, shift into the tree but not in the type array.
              listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i));
            }
          }
        }
        return listeners;
      }

      listeners = listeners.concat(searchListenerTree(handlers, type, tree[currentType], i+1));
    }

    xTree = tree['*'];
    if (xTree) {
      //
      // If the listener tree will allow any match for this part,
      // then recursively explore all branches of the tree
      //
      searchListenerTree(handlers, type, xTree, i+1);
    }

    xxTree = tree['**'];
    if(xxTree) {
      if(i < typeLength) {
        if(xxTree._listeners) {
          // If we have a listener on a '**', it will catch all, so add its handler.
          searchListenerTree(handlers, type, xxTree, typeLength);
        }

        // Build arrays of matching next branches and others.
        for(branch in xxTree) {
          if(branch !== '_listeners' && xxTree.hasOwnProperty(branch)) {
            if(branch === nextType) {
              // We know the next element will match, so jump twice.
              searchListenerTree(handlers, type, xxTree[branch], i+2);
            } else if(branch === currentType) {
              // Current node matches, move into the tree.
              searchListenerTree(handlers, type, xxTree[branch], i+1);
            } else {
              isolatedBranch = {};
              isolatedBranch[branch] = xxTree[branch];
              searchListenerTree(handlers, type, { '**': isolatedBranch }, i+1);
            }
          }
        }
      } else if(xxTree._listeners) {
        // We have reached the end and still on a '**'
        searchListenerTree(handlers, type, xxTree, typeLength);
      } else if(xxTree['*'] && xxTree['*']._listeners) {
        searchListenerTree(handlers, type, xxTree['*'], typeLength);
      }
    }

    return listeners;
  }

  function growListenerTree(type, listener) {

    type = typeof type === 'string' ? type.split(this.delimiter) : type.slice();

    //
    // Looks for two consecutive '**', if so, don't add the event at all.
    //
    for(var i = 0, len = type.length; i+1 < len; i++) {
      if(type[i] === '**' && type[i+1] === '**') {
        return;
      }
    }

    var tree = this.listenerTree;
    var name = type.shift();

    while (name) {

      if (!tree[name]) {
        tree[name] = {};
      }

      tree = tree[name];

      if (type.length === 0) {

        if (!tree._listeners) {
          tree._listeners = listener;
        }
        else if(typeof tree._listeners === 'function') {
          tree._listeners = [tree._listeners, listener];
        }
        else if (isArray(tree._listeners)) {

          tree._listeners.push(listener);

          if (!tree._listeners.warned) {

            var m = defaultMaxListeners;

            if (typeof this._events.maxListeners !== 'undefined') {
              m = this._events.maxListeners;
            }

            if (m > 0 && tree._listeners.length > m) {

              tree._listeners.warned = true;
              console.error('(node) warning: possible EventEmitter memory ' +
                            'leak detected. %d listeners added. ' +
                            'Use emitter.setMaxListeners() to increase limit.',
                            tree._listeners.length);
              console.trace();
            }
          }
        }
        return true;
      }
      name = type.shift();
    }
    return true;
  }

  // By default EventEmitters will print a warning if more than
  // 10 listeners are added to it. This is a useful default which
  // helps finding memory leaks.
  //
  // Obviously not all Emitters should be limited to 10. This function allows
  // that to be increased. Set to zero for unlimited.

  EventEmitter.prototype.delimiter = '.';

  EventEmitter.prototype.setMaxListeners = function(n) {
    this._events || init.call(this);
    this._events.maxListeners = n;
    if (!this._conf) this._conf = {};
    this._conf.maxListeners = n;
  };

  EventEmitter.prototype.event = '';

  EventEmitter.prototype.once = function(event, fn) {
    this.many(event, 1, fn);
    return this;
  };

  EventEmitter.prototype.many = function(event, ttl, fn) {
    var self = this;

    if (typeof fn !== 'function') {
      throw new Error('many only accepts instances of Function');
    }

    function listener() {
      if (--ttl === 0) {
        self.off(event, listener);
      }
      fn.apply(this, arguments);
    }

    listener._origin = fn;

    this.on(event, listener);

    return self;
  };

  EventEmitter.prototype.emit = function() {

    this._events || init.call(this);

    var type = arguments[0];

    if (type === 'newListener' && !this.newListener) {
      if (!this._events.newListener) { return false; }
    }

    // Loop through the *_all* functions and invoke them.
    if (this._all) {
      var l = arguments.length;
      var args = new Array(l - 1);
      for (var i = 1; i < l; i++) args[i - 1] = arguments[i];
      for (i = 0, l = this._all.length; i < l; i++) {
        this.event = type;
        this._all[i].apply(this, args);
      }
    }

    // If there is no 'error' event listener then throw.
    if (type === 'error') {

      if (!this._all &&
        !this._events.error &&
        !(this.wildcard && this.listenerTree.error)) {

        if (arguments[1] instanceof Error) {
          throw arguments[1]; // Unhandled 'error' event
        } else {
          throw new Error("Uncaught, unspecified 'error' event.");
        }
        return false;
      }
    }

    var handler;

    if(this.wildcard) {
      handler = [];
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      searchListenerTree.call(this, handler, ns, this.listenerTree, 0);
    }
    else {
      handler = this._events[type];
    }

    if (typeof handler === 'function') {
      this.event = type;
      if (arguments.length === 1) {
        handler.call(this);
      }
      else if (arguments.length > 1)
        switch (arguments.length) {
          case 2:
            handler.call(this, arguments[1]);
            break;
          case 3:
            handler.call(this, arguments[1], arguments[2]);
            break;
          // slower
          default:
            var l = arguments.length;
            var args = new Array(l - 1);
            for (var i = 1; i < l; i++) args[i - 1] = arguments[i];
            handler.apply(this, args);
        }
      return true;
    }
    else if (handler) {
      var l = arguments.length;
      var args = new Array(l - 1);
      for (var i = 1; i < l; i++) args[i - 1] = arguments[i];

      var listeners = handler.slice();
      for (var i = 0, l = listeners.length; i < l; i++) {
        this.event = type;
        listeners[i].apply(this, args);
      }
      return (listeners.length > 0) || !!this._all;
    }
    else {
      return !!this._all;
    }

  };

  EventEmitter.prototype.on = function(type, listener) {

    if (typeof type === 'function') {
      this.onAny(type);
      return this;
    }

    if (typeof listener !== 'function') {
      throw new Error('on only accepts instances of Function');
    }
    this._events || init.call(this);

    // To avoid recursion in the case that type == "newListeners"! Before
    // adding it to the listeners, first emit "newListeners".
    this.emit('newListener', type, listener);

    if(this.wildcard) {
      growListenerTree.call(this, type, listener);
      return this;
    }

    if (!this._events[type]) {
      // Optimize the case of one listener. Don't need the extra array object.
      this._events[type] = listener;
    }
    else if(typeof this._events[type] === 'function') {
      // Adding the second element, need to change to array.
      this._events[type] = [this._events[type], listener];
    }
    else if (isArray(this._events[type])) {
      // If we've already got an array, just append.
      this._events[type].push(listener);

      // Check for listener leak
      if (!this._events[type].warned) {

        var m = defaultMaxListeners;

        if (typeof this._events.maxListeners !== 'undefined') {
          m = this._events.maxListeners;
        }

        if (m > 0 && this._events[type].length > m) {

          this._events[type].warned = true;
          console.error('(node) warning: possible EventEmitter memory ' +
                        'leak detected. %d listeners added. ' +
                        'Use emitter.setMaxListeners() to increase limit.',
                        this._events[type].length);
          console.trace();
        }
      }
    }
    return this;
  };

  EventEmitter.prototype.onAny = function(fn) {

    if (typeof fn !== 'function') {
      throw new Error('onAny only accepts instances of Function');
    }

    if(!this._all) {
      this._all = [];
    }

    // Add the function to the event listener collection.
    this._all.push(fn);
    return this;
  };

  EventEmitter.prototype.addListener = EventEmitter.prototype.on;

  EventEmitter.prototype.off = function(type, listener) {
    if (typeof listener !== 'function') {
      throw new Error('removeListener only takes instances of Function');
    }

    var handlers,leafs=[];

    if(this.wildcard) {
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      leafs = searchListenerTree.call(this, null, ns, this.listenerTree, 0);
    }
    else {
      // does not use listeners(), so no side effect of creating _events[type]
      if (!this._events[type]) return this;
      handlers = this._events[type];
      leafs.push({_listeners:handlers});
    }

    for (var iLeaf=0; iLeaf<leafs.length; iLeaf++) {
      var leaf = leafs[iLeaf];
      handlers = leaf._listeners;
      if (isArray(handlers)) {

        var position = -1;

        for (var i = 0, length = handlers.length; i < length; i++) {
          if (handlers[i] === listener ||
            (handlers[i].listener && handlers[i].listener === listener) ||
            (handlers[i]._origin && handlers[i]._origin === listener)) {
            position = i;
            break;
          }
        }

        if (position < 0) {
          continue;
        }

        if(this.wildcard) {
          leaf._listeners.splice(position, 1);
        }
        else {
          this._events[type].splice(position, 1);
        }

        if (handlers.length === 0) {
          if(this.wildcard) {
            delete leaf._listeners;
          }
          else {
            delete this._events[type];
          }
        }
        return this;
      }
      else if (handlers === listener ||
        (handlers.listener && handlers.listener === listener) ||
        (handlers._origin && handlers._origin === listener)) {
        if(this.wildcard) {
          delete leaf._listeners;
        }
        else {
          delete this._events[type];
        }
      }
    }

    return this;
  };

  EventEmitter.prototype.offAny = function(fn) {
    var i = 0, l = 0, fns;
    if (fn && this._all && this._all.length > 0) {
      fns = this._all;
      for(i = 0, l = fns.length; i < l; i++) {
        if(fn === fns[i]) {
          fns.splice(i, 1);
          return this;
        }
      }
    } else {
      this._all = [];
    }
    return this;
  };

  EventEmitter.prototype.removeListener = EventEmitter.prototype.off;

  EventEmitter.prototype.removeAllListeners = function(type) {
    if (arguments.length === 0) {
      !this._events || init.call(this);
      return this;
    }

    if(this.wildcard) {
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      var leafs = searchListenerTree.call(this, null, ns, this.listenerTree, 0);

      for (var iLeaf=0; iLeaf<leafs.length; iLeaf++) {
        var leaf = leafs[iLeaf];
        leaf._listeners = null;
      }
    }
    else {
      if (!this._events[type]) return this;
      this._events[type] = null;
    }
    return this;
  };

  EventEmitter.prototype.listeners = function(type) {
    if(this.wildcard) {
      var handlers = [];
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      searchListenerTree.call(this, handlers, ns, this.listenerTree, 0);
      return handlers;
    }

    this._events || init.call(this);

    if (!this._events[type]) this._events[type] = [];
    if (!isArray(this._events[type])) {
      this._events[type] = [this._events[type]];
    }
    return this._events[type];
  };

  EventEmitter.prototype.listenersAny = function() {

    if(this._all) {
      return this._all;
    }
    else {
      return [];
    }

  };

  if (typeof define === 'function' && define.amd) {
     // AMD. Register as an anonymous module.
    define(function() {
      return EventEmitter;
    });
  } else if (typeof exports === 'object') {
    // CommonJS
    exports.EventEmitter2 = EventEmitter;
  }
  else {
    // Browser global.
    window.EventEmitter2 = EventEmitter;
  }
}();

},{}],5:[function(require,module,exports){
var hasOwn = Object.prototype.hasOwnProperty;
var toString = Object.prototype.toString;
var undefined;

var isPlainObject = function isPlainObject(obj) {
	'use strict';
	if (!obj || toString.call(obj) !== '[object Object]') {
		return false;
	}

	var has_own_constructor = hasOwn.call(obj, 'constructor');
	var has_is_property_of_method = obj.constructor && obj.constructor.prototype && hasOwn.call(obj.constructor.prototype, 'isPrototypeOf');
	// Not own constructor property must be Object
	if (obj.constructor && !has_own_constructor && !has_is_property_of_method) {
		return false;
	}

	// Own properties are enumerated firstly, so to speed up,
	// if last one is own, then all properties are own.
	var key;
	for (key in obj) {}

	return key === undefined || hasOwn.call(obj, key);
};

module.exports = function extend() {
	'use strict';
	var options, name, src, copy, copyIsArray, clone,
		target = arguments[0],
		i = 1,
		length = arguments.length,
		deep = false;

	// Handle a deep copy situation
	if (typeof target === 'boolean') {
		deep = target;
		target = arguments[1] || {};
		// skip the boolean and the target
		i = 2;
	} else if ((typeof target !== 'object' && typeof target !== 'function') || target == null) {
		target = {};
	}

	for (; i < length; ++i) {
		options = arguments[i];
		// Only deal with non-null/undefined values
		if (options != null) {
			// Extend the base object
			for (name in options) {
				src = target[name];
				copy = options[name];

				// Prevent never-ending loop
				if (target === copy) {
					continue;
				}

				// Recurse if we're merging plain objects or arrays
				if (deep && copy && (isPlainObject(copy) || (copyIsArray = Array.isArray(copy)))) {
					if (copyIsArray) {
						copyIsArray = false;
						clone = src && Array.isArray(src) ? src : [];
					} else {
						clone = src && isPlainObject(src) ? src : {};
					}

					// Never move original objects, clone them
					target[name] = extend(deep, clone, copy);

				// Don't bring in undefined values
				} else if (copy !== undefined) {
					target[name] = copy;
				}
			}
		}
	}

	// Return the modified object
	return target;
};


},{}],6:[function(require,module,exports){

var EventEmitter = require( 'eventemitter2' ).EventEmitter2;

module.exports.Ymir = Ymir;

function Ymir( options ) { 
    options = options || {};

    EventEmitter.call( this );
    this.views = {};
    this.list = options.listEl || document.createElement( options.listTagName || 'nav' );
    this.el = options.el || document.createElement( options.tagName  || 'div' );
    this.el.className = options.className;
    this.options = options;
    this.options.showClass = options.showClass || 'show';
    this._isDynamic = options.dynamic === false ? false : true;
}

Ymir.prototype = Object.create( EventEmitter.prototype, {
    viewList: {
        get: function( ) {
            return Object.keys( this.views ).map( this._mapViews.bind( this ) );
        }
    }
} );

Ymir.prototype.addView = function( view ) {
    var isView = Ymir.isView( view );
    if ( !isView ){
        this.emit( 'error', new Error( 'Issue adding view: invalid view' ) );
        return false;
    }
    if ( this.views[ view.id ] ) {
        this.emit( 'error', new Error( 'Issue adding view with the id ' + view.id + ': duplicate id' ) );
        return false;
    } 
    if ( this._isDynamic ) {
        this.el.appendChild( view.el );
        if ( view.linkto !== false ) {
            this._appendToList( view );
        }
    }
    this.views[ view.id ] = view;
    if ( view.el.classList.contains( this.options.showClass ) ) {
        view.isShown = false;
        view.el.classList.remove( this.options.showClass );
    }
    return true;
};

Ymir.prototype.removeView = function( id ) {
    var view = this.views[ id ],
        link;

    if ( !view ) {
        return false;
    }
    if ( this._isDynamic ) {
        this.el.removeChild( view.el );
        if ( view.linkto !== false ) {
            link = this.list.querySelector( '[data-linkto=' + view.id + ']' );
            this.list.removeChild( link );        
        }
    }
    delete this.views[ id ];
    return true;
};

Ymir.prototype.open = function( id ) {
    var view;
    if ( id && this.views[ id ] ) {
        view = this.views[ id ];
        if ( view.isShown ) {
            return;
        }
        view.isShown = true;
        view.el.classList.add( this.options.showClass );
        this._closeViews( id );
    }
};

Ymir.prototype._closeViews = function( id ) {
      
    var showClass = this.options.showClass || 'show';
    function eachView( view ) {
        if ( view.isShown && view.id !== id ) {
            view.el.classList.remove( showClass );
            view.isShown = false;
        }
    }

    this.viewList.forEach( eachView );  
};

Ymir.prototype._mapViews = function( viewName ) {
    return this.views[ viewName ];
};

Ymir.prototype._appendToList = function( view ) {
    var el = document.createElement( this.options.listItemTagName || 'div' );
    el.innerHTML = view.id;
    el.setAttribute( 'data-linkto', view.id );
    el.addEventListener( 'click', this.open.bind( this, view.id ) ); 
    this.list.appendChild( el );
};

Ymir.isView = function( view ) {
    return view && 
        typeof view === 'object' && 
        typeof view.el === 'object' && 
        view.el.tagName &&
        view.id; // test all requirements of a view
};

},{"eventemitter2":4}],7:[function(require,module,exports){
/*
 * Sidebar View
 */

/* global require, module */
/* jshint -W097 */
'use strict';

var EventEmitter = require( 'eventemitter2' ).EventEmitter2,
    extend = require( 'extend' );

module.exports = SidebarView;

var defaults = {
    autofocus: true,
    back: true
};

function SidebarView( template, options ) {
    if ( !template ) {
        return this;
    }

    options = options || {};

    EventEmitter.call( this );
    this._behaviors = {};
    this._template = '' + template;
    this.id = options.title;
    this.el = document.createElement( 'div' );
    this.el.classList.add( 'sidebar-view' );
    this.el.setAttribute( 'data-view-id', this.id );
    this._attachListeners();
    this.setOptions( options );
    this.setContent( options.data, this.emit.bind( this, 'ready', this ) );
}

SidebarView.prototype = Object.create( EventEmitter.prototype, {
    isShown: {
        get: function( ) {
            return this._isShown; 
        },
        set: function( value ) { 
            if ( value ) {
                this.emit( 'open:shown' );
            }
            this._isShown = value;
        }
    }
} );

SidebarView.prototype.setCurrent =
    SidebarView.prototype.open = function( e ) {
        this.emit( 'open', this, e );
        this.once( 'animation:complete', this.onAnimationComplete.bind( this ));
};

SidebarView.prototype.onAnimationComplete = function() {
    if ( this.options.autofocus ) {
        var el = this.el.querySelector( 'textarea, input' );
        if( el ){
            el.focus();
            el.select();
        }
    }
};

SidebarView.prototype.onRendered = function( callback ) {
    if ( callback ) {
        callback();
    }
    this.emit( 'rendered', this );
    this.getTabableEls();
};

SidebarView.prototype.getTabableEls = function() {
    var last,
        first;
    this.tabales = this.el.querySelectorAll( 'input, textarea' );
    this.tabales = Array.prototype.slice.call( this.tabales, 0 );
    this.tabales.forEach( function( tabable, index ) {
        if ( index === 0 ) {
            first = tabable;
        }
        tabable.setAttribute( 'tab-index', index );
        last = tabable;
    } );
    if ( !last ) {
        return;
    }
    last.addEventListener( 'keydown', function( e ) {
        var keyCode = e.keyCode || e.which;
        if ( keyCode === 9 ) {
            e.preventDefault();
            first.focus();
        }
    } );
};

SidebarView.prototype.setContent = function( data, callback ) {
    if ( typeof data === 'function' ) {
        callback = data;
    }
    callback = callback || function() {};
    if ( typeof this.render === 'function' ) {
        this._data = data;
        this.render( this._template, data || {}, function( err, html ) {
            if ( err ) return this.emit( 'error', err, this );
            this.el.innerHTML = html;
            setTimeout( this.onRendered.bind( this, callback ), 0 );
        }.bind( this ) );
        return this;
    }
    this.el.innerHTML = this._template;
    setTimeout( this.onRendered.bind( this, callback ), 0 );
};

SidebarView.prototype.close = function( e ) {
    this.el.classList.remove( 'show' );
    this.el.isOpen = false;
    this.emit( 'close', this, e );
};

SidebarView.prototype.remove = function() {
    // this helps clean up state
    this.emit( 'close', this );
    this.emit( 'remove', this );
    this.removeAllListeners();
};

SidebarView.prototype.isVisible =
    SidebarView.prototype.isCurrent = function() {
        // this should be accurate in the current system
        // may need to get referance to _super
        return this.el.classList.contains( 'show' );
};

SidebarView.prototype.setOptions = function( options ) {
    var els;
    this.options = extend( true, {}, this.options || defaults, options );
    this.setParentView( this.options.parent );
    this.linkto = options.linkto;
};

SidebarView.prototype.setParentView = function( parent ) {
    this._parentView = parent;
};

// this is for the css3 animations
SidebarView.prototype._attachListeners = function() {
    var handle = this.emit.bind( this, 'animation:complete' );
    
    this.el.addEventListener( 'webkitAnimationEnd', handle, false );
    this.el.addEventListener( 'oAnimationEnd', handle, false );
    this.el.addEventListener( 'animationend', handle, false );
    this.el.addEventListener( 'msAnimationEnd', handle, false );
};

},{"eventemitter2":4,"extend":5}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJleGFtcGxlcy9pbmRleC5qcyIsImluZGV4LmpzIiwibm9kZV9tb2R1bGVzL2VtaXQtYmluZGluZ3MvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZXZlbnRlbWl0dGVyMi9saWIvZXZlbnRlbWl0dGVyMi5qcyIsIm5vZGVfbW9kdWxlcy9leHRlbmQvaW5kZXguanMiLCJub2RlX21vZHVsZXMveW1pci9pbmRleC5qcyIsInZpZXcuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbFRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pVQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3akJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIHNpZGViYXIgPSBuZXcgKHJlcXVpcmUoJy4uJykpLFxuICAgIGVtaXQgPSByZXF1aXJlKCdlbWl0LWJpbmRpbmdzJyk7XG5zaWRlYmFyLmluaXQoKTtcblxudmFyIHZpZXcxaHRtbCA9IFxuJzx1bD4nICtcbiAgICAnPGxpPicgKyBcbiAgICAgICAgJ1ZpZXcgMScgK1xuICAgICc8L2xpPicgK1xuICAgICc8bGkgZGF0YS1lbWl0PVwic2lkZWJhci5jbG9zZVwiPicgKyBcbiAgICAgICAgJ0hpZGUgdGhlIHNjcm9sbGJhcicgK1xuICAgICc8L2xpPicgK1xuJzwvdWw+JztcbnZhciB2aWV3Mmh0bWwgPSBcbic8dWw+JyArXG4gICAgJzxsaSBkYXRhLWVtaXQ9XCJvcGVuLnZpZXczXCI+JyArIFxuICAgICAgICAnQ2hpbGQgVmlldyA+JyArXG4gICAgJzwvbGk+J1xuJzwvdWw+JztcbnZhciB2aWV3M2h0bWwgPSBcbic8dWw+JyArXG4gICAgJzxsaSBkYXRhLWVtaXQ9XCJzaWRlYmFyLmJhY2tcIj4nICtcbiAgICAgICAgJ0JhY2snICtcbiAgICAnPC9saT4nICtcbic8L3VsPic7XG5cblxudmFyIHZpZXcxID0gc2lkZWJhci5hZGRWaWV3KCB2aWV3MWh0bWwsIHtcbiAgICB0aXRsZTogJ0hvbWUnLFxuICAgIGhvbWU6IHRydWVcbn0pO1xudmFyIHZpZXcyID0gc2lkZWJhci5hZGRWaWV3KCB2aWV3Mmh0bWwsIHtcbiAgICB0aXRsZTogJ1NlY29uZGFyeScsXG4gICAgaG9tZTogdHJ1ZVxufSk7XG52YXIgdmlldzMgPSBzaWRlYmFyLmFkZFZpZXcoIHZpZXczaHRtbCwge1xuICAgIHRpdGxlOiAnQ2hpbGQgQ2hpbGQnLFxuICAgIGhvbWU6IHRydWUsXG4gICAgcGFyZW50OiB2aWV3MixcbiAgICBsaW5rdG86IGZhbHNlXG59KTtcblxuLy8gb3BlbmluZyB1cCB2aWV3IHdoZW4gZXZlbnQgaXMgZW1pdHRlZFxuZW1pdC5vbiggJ29wZW4udmlldzInLCB2aWV3Mi5vcGVuLmJpbmQoIHZpZXcyICkgKTtcbmVtaXQub24oICdvcGVuLnZpZXczJywgdmlldzMub3Blbi5iaW5kKCB2aWV3MyApICk7XG5zaWRlYmFyLm9wZW4oICk7IiwiLypcbiAqIFNpZGViYXIgLSBNYW5hZ2VzIHNpZGViYXIgJiBzaWRlYmFyIHZpZXdzXG4gKi9cbi8qIGdsb2JhbCBFdmVudCwgcmVxdWlyZSwgbW9kdWxlICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCAnZXZlbnRlbWl0dGVyMicgKS5FdmVudEVtaXR0ZXIyLFxuICAgIGVtaXQgPSByZXF1aXJlKCAnZW1pdC1iaW5kaW5ncycgKSxcbiAgICBZbWlyID0gcmVxdWlyZSggJ3ltaXInICkuWW1pcixcbiAgICBTaWRlYmFyVmlldyA9IHJlcXVpcmUoICcuL3ZpZXcnICk7XG5cbm1vZHVsZS5leHBvcnRzID0gU2lkZWJhcjtcbm1vZHVsZS5leHBvcnRzLlNpZGViYXJWaWV3ID0gU2lkZWJhclZpZXc7XG5cbmZ1bmN0aW9uIFNpZGViYXIoKSB7XG5cbiAgICBFdmVudEVtaXR0ZXIuY2FsbCggdGhpcyApO1xuXG4gICAgLy8gZG8gdmlldyBjaGVja1xuICAgIHRoaXMuZWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCAnW2RhdGEtc2lkZWJhcl0nICk7XG4gICAgdGhpcy5uYXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCAnbmF2JyApO1xuICAgIHRoaXMuX3RlYXJkb3duVmlld3MoKTtcbiAgICB0aGlzLl9ob21lVmlldyA9IG51bGw7XG4gICAgdGhpcy5fY3VycmVudFZpZXcgPSBudWxsO1xuICAgIHRoaXMuYWRkZWRDbGFzc2VzID0ge307XG5cbiAgICAvLyBzaWduaWZ5IGluaWFsaXphdGlvblxuICAgIGlmICggdGhpcy5lbCApIHtcbiAgICAgICAgdGhpcy5lbC5hcHBlbmRDaGlsZCggdGhpcy5uYXYgKTtcblxuICAgICAgICBpZiAoICF0aGlzLndyYXBwZXIgKSB7XG4gICAgICAgICAgICB0aGlzLndyYXBwZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCAnZGl2JyApO1xuICAgICAgICAgICAgdGhpcy5lbC5hcHBlbmRDaGlsZCggdGhpcy53cmFwcGVyICk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5lbC5jbGFzc0xpc3QuYWRkKCAnc2lkZWJhci1pbml0JyApO1xuICAgIH1cbiAgICB0aGlzLmFkZExpc3RlbmVycygpO1xufVxuXG5TaWRlYmFyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoIEV2ZW50RW1pdHRlci5wcm90b3R5cGUgKTtcblxuU2lkZWJhci5wcm90b3R5cGUuYWRkVmlldyA9IGZ1bmN0aW9uKCB0ZW1wbGF0ZSwgb3B0cywgY2FsbGJhY2sgKSB7XG4gICAgaWYgKCAhdGVtcGxhdGUgKSByZXR1cm4gbnVsbDtcblxuICAgIG9wdHMgPSBvcHRzIHx8IHt9O1xuICAgIG9wdHMubmF2ID0gdGhpcy5uYXY7XG5cbiAgICB2YXIgaXNSZWFkeSA9IHRoaXMuaXNTaWRlYmFyVmlldyggdGVtcGxhdGUgKSxcbiAgICAgICAgdmlldyA9IGlzUmVhZHkgPyB0ZW1wbGF0ZSA6IG51bGw7XG5cbiAgICBpZiAoICF2aWV3ICkge1xuICAgICAgICB2aWV3ID0gbmV3IFNpZGViYXJWaWV3KCB0ZW1wbGF0ZSwgb3B0cyApO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdmlldy5zZXRPcHRpb25zKCBvcHRzICk7XG4gICAgfVxuXG4gICAgaWYgKCAoIG9wdHMgJiYgb3B0cy5ob21lICkgfHwgIXRoaXMuX2hvbWVWaWV3IHx8IHZpZXcub3B0aW9ucy5ob21lICkge1xuICAgICAgICB0aGlzLl9ob21lVmlldyA9IHZpZXc7XG4gICAgfVxuXG4gICAgLy8gdGhpcyBoZWxwcyBoYW5kbGluZyB0aGUgdmlldyBzcGFjZVxuICAgIHZpZXcub24oICdvcGVuJywgdGhpcy5fb25WaWV3T3BlbmluZ1NlY29uZGFyeS5iaW5kKCB0aGlzLCB2aWV3ICkgKTtcbiAgICB2aWV3Lm9uKCAnb3BlbjpzaG93bicsIHRoaXMuX29uVmlld09wZW5pbmcuYmluZCggdGhpcywgdmlldyApICk7XG4gICAgdmlldy5vbiggJ3JlbmRlcmVkJywgdGhpcy5fb25WaWV3UmVuZGVyZWQuYmluZCggdGhpcyApICk7XG5cbiAgICBpZiAoIGlzUmVhZHkgKSB7XG4gICAgICAgIHRoaXMuX29uVmlld1JlYWR5KCBjYWxsYmFjaywgbnVsbCwgdmlldyApO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdmlldy5vbmNlKCAncmVhZHknLCB0aGlzLl9vblZpZXdSZWFkeS5iaW5kKCB0aGlzLCBjYWxsYmFjaywgbnVsbCApICk7XG4gICAgICAgIHZpZXcub25jZSggJ2Vycm9yJywgdGhpcy5fb25WaWV3UmVhZHkuYmluZCggdGhpcywgY2FsbGJhY2sgKSApO1xuICAgIH1cblxuICAgIHJldHVybiB2aWV3O1xufTtcblxuU2lkZWJhci5wcm90b3R5cGUuYWRkTGlzdGVuZXJzID0gZnVuY3Rpb24gKCApIHtcbiAgICBlbWl0Lm9uKCdzaWRlYmFyLmJhY2snLCB0aGlzLmJhY2suYmluZCggdGhpcyApKTtcbiAgICBlbWl0Lm9uKCdzaWRlYmFyLmNsb3NlJywgdGhpcy5jbG9zZS5iaW5kKCB0aGlzICkpO1xuICAgIGVtaXQub24oJ3NpZGViYXIub3BlbicsIHRoaXMub3Blbi5iaW5kKCB0aGlzICkpO1xuICAgIGVtaXQub24oJ3NpZGViYXIudG9nZ2xlJywgdGhpcy50b2dnbGUuYmluZCggdGhpcyApKTtcbn07XG5cblNpZGViYXIucHJvdG90eXBlLnJlbW92ZVZpZXcgPSBmdW5jdGlvbiggdmlldyApIHtcbiAgICB2YXIgaWQgPSB0eXBlb2YgdmlldyA9PT0gJ3N0cmluZycgPyB2aWV3IDogIHZpZXcuaWQ7XG4gICAgdGhpcy52aWV3TWFuYWdlci5yZW1vdmVWaWV3KCBpZCApO1xuICAgIFxuICAgIC8vIGlmIHJlbW92ZSB2aWV3IGlzIGN1cnJlbnQgZ28gdG8gaG9tZVxuICAgIGlmICggdGhpcy5fY3VycmVudFZpZXcuaWQgPT09IHZpZXcuaWQgKSB7XG4gICAgICAgIHRoaXMuaG9tZSgpO1xuICAgIH1cbn07XG5cblNpZGViYXIucHJvdG90eXBlLnNldEN1cnJlbnRWaWV3ID0gZnVuY3Rpb24oIHZpZXcgKSB7XG4gICAgdmFyIGlkID0gdmlldy5pZCxcbiAgICAgICAgb3BlbmVkID0gdGhpcy52aWV3TWFuYWdlci5vcGVuKCBpZCApO1xuICAgIGlmICggb3BlbmVkICkge1xuICAgICAgICB0aGlzLl9jdXJyZW50VmlldyA9IHZpZXc7XG4gICAgfVxufTtcblxuU2lkZWJhci5wcm90b3R5cGUuZ2V0VmlldyA9IGZ1bmN0aW9uKCBpZCApIHtcbiAgICByZXR1cm4gdGhpcy52aWV3TWFuYWdlci52aWV3c1sgaWQgXTtcbn07XG5cblNpZGViYXIucHJvdG90eXBlLmdldEN1cnJlbnRWaWV3ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX2N1cnJlbnRWaWV3O1xufTtcblxuU2lkZWJhci5wcm90b3R5cGUuaG9tZSA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICggIXRoaXMuaXNTaWRlYmFyVmlldyggdGhpcy5faG9tZVZpZXcgKSApIHJldHVybjtcbiAgICBpZiAoIHRoaXMuX2N1cnJlbnRWaWV3LmlkID09PSB0aGlzLl9ob21lVmlldy5pZCApIHJldHVybjtcbiAgICB0aGlzLnZpZXdNYW5hZ2VyLm9wZW4oIHRoaXMuX2hvbWVWaWV3LmlkICk7XG59O1xuXG5TaWRlYmFyLnByb3RvdHlwZS5iYWNrID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gc2VlIGlmIGEgcHJvcGVyIHBhcmVudCB2aWV3IGlzIHNldFxuICAgIHRoaXMuZWwuY2xhc3NMaXN0LmFkZCggJ2JhY2snICk7XG4gICAgaWYgKCB0aGlzLmlzU2lkZWJhclZpZXcoIHRoaXMuX2N1cnJlbnRWaWV3ICkgJiYgdGhpcy5fY3VycmVudFZpZXcuX3BhcmVudFZpZXcgKSB7XG4gICAgICAgIHZhciBfcGFyZW50ID0gdGhpcy5fY3VycmVudFZpZXcuX3BhcmVudFZpZXc7XG4gICAgICAgIGlmICggdGhpcy5pc1NpZGViYXJWaWV3KCBfcGFyZW50ICkgKSB7XG4gICAgICAgICAgICByZXR1cm4gX3BhcmVudC5vcGVuKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gaWYgbm90IGdvIHRvIGhvbWVcbiAgICB0aGlzLmhvbWUoKTtcbn07XG5cblNpZGViYXIucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbiggZGF0YSApIHtcbiAgICB0aGlzLnN0YXRlID0gMTtcbiAgICBpZiAoIHRoaXMuZWwgKSB0aGlzLmVsLmNsYXNzTGlzdC5hZGQoICdzaG93JyApO1xuICAgIGlmICggZGF0YSBpbnN0YW5jZW9mIEV2ZW50ICkge1xuICAgICAgICBkYXRhID0gbnVsbDtcbiAgICB9XG4gICAgdGhpcy5lbWl0KCAnb3BlbicsIGRhdGEgKTtcbn07XG5cblNpZGViYXIucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24oIGRhdGEgKSB7XG4gICAgdGhpcy5zdGF0ZSA9IDA7XG4gICAgaWYgKCB0aGlzLmVsICkgdGhpcy5lbC5jbGFzc0xpc3QucmVtb3ZlKCAnc2hvdycgKTtcbiAgICBpZiAoIGRhdGEgaW5zdGFuY2VvZiBFdmVudCApIHtcbiAgICAgICAgZGF0YSA9IG51bGw7XG4gICAgfVxuICAgIHRoaXMuZW1pdCggJ2Nsb3NlJywgZGF0YSApO1xufTtcblxuU2lkZWJhci5wcm90b3R5cGUudG9nZ2xlID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKCB0aGlzLnN0YXRlICkge1xuICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5vcGVuKCk7XG59O1xuXG4vLyB3aWR0aCBpcyBvbmx5IHRlbXAgdGlsbCBuZXh0IG9wZW4uXG5TaWRlYmFyLnByb3RvdHlwZS5leHBhbmQgPSBmdW5jdGlvbiggd2lkdGggKSB7XG4gICAgaWYgKCAhdGhpcy5lbCApIHJldHVybjtcbiAgICB0aGlzLmVsLnN0eWxlLndpZHRoID0gdHlwZW9mIHdpZHRoID09PSAnbnVtYmVyJyA/IHdpZHRoICsgJ3B4JyA6IHdpZHRoO1xuICAgIHRoaXMuZW1pdCggJ2V4cGFuZGVkJywge1xuICAgICAgICB3aWR0aDogd2lkdGhcbiAgICB9ICk7XG59O1xuXG5TaWRlYmFyLnByb3RvdHlwZS5hZGRDbGFzcyA9IGZ1bmN0aW9uKCBjICkge1xuICAgIGlmICggIXRoaXMuZWwgKSByZXR1cm47XG4gICAgdGhpcy5lbC5jbGFzc0xpc3QuYWRkKCBjICk7XG4gICAgdGhpcy5hZGRlZENsYXNzZXNbIGMgXSA9IHRydWU7XG4gICAgdGhpcy5lbWl0KCAnY2xhc3NBZGRlZCcsIGMgKTtcbn07XG5cblNpZGViYXIucHJvdG90eXBlLnJlbW92ZUNsYXNzID0gZnVuY3Rpb24oIGMgKSB7XG4gICAgaWYgKCAhdGhpcy5lbCApIHJldHVybjtcbiAgICB0aGlzLmVsLmNsYXNzTGlzdC5yZW1vdmUoIGMgKTtcbiAgICBkZWxldGUgdGhpcy5hZGRlZENsYXNzZXNbIGMgXTtcbiAgICB0aGlzLmVtaXQoICdjbGFzc1JlbW92ZWQnLCBjICk7XG59O1xuXG5TaWRlYmFyLnByb3RvdHlwZS5pc1NpZGViYXJWaWV3ID0gZnVuY3Rpb24oIHZpZXcgKSB7XG4gICAgcmV0dXJuICggdHlwZW9mIHZpZXcgPT09ICdvYmplY3QnICYmIHZpZXcgaW5zdGFuY2VvZiBTaWRlYmFyVmlldyAmJiAhdmlldy5fcmVtb3ZlZCApO1xufTtcblxuU2lkZWJhci5wcm90b3R5cGUuaXNPcGVuID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuc3RhdGUgPyB0cnVlIDogZmFsc2U7XG59O1xuXG5TaWRlYmFyLnByb3RvdHlwZS5fYXBwZW5kVmlldyA9IGZ1bmN0aW9uKCB2aWV3ICkge1xuICAgIGlmICggdGhpcy53cmFwcGVyICkgdGhpcy53cmFwcGVyLmFwcGVuZENoaWxkKCB2aWV3LmVsICk7XG59O1xuXG5TaWRlYmFyLnByb3RvdHlwZS5faGFuZGxlQW5pbWF0aW9ucyA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2N1cnJlbnRWaWV3Lm9uY2UoICdhbmltYXRpb246Y29tcGxldGUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKCB0aGlzLl9wcmV2VmlldyApIHtcbiAgICAgICAgICAgIHRoaXMuX3ByZXZWaWV3LmVsLmNsYXNzTGlzdC5yZW1vdmUoICdzaWRlYmFyLXZpZXctb3V0JyApO1xuICAgICAgICAgICAgdGhpcy5fcHJldlZpZXcgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHNldFRpbWVvdXQoIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdGhpcy5lbC5jbGFzc0xpc3QucmVtb3ZlKCAnYW5pbWF0aW5nJyApO1xuICAgICAgICAgICAgdGhpcy5lbC5jbGFzc0xpc3QucmVtb3ZlKCAnYW5pbWF0aW5nLXNlY29uZGFyeScgKTtcbiAgICAgICAgICAgIHRoaXMuZWwuY2xhc3NMaXN0LnJlbW92ZSggJ2JhY2snICk7XG4gICAgICAgIH0uYmluZCggdGhpcyApLCA1MDApO1xuICAgIH0uYmluZCggdGhpcyApICk7XG59O1xuXG5TaWRlYmFyLnByb3RvdHlwZS5fY2FjaGVWaWV3ID0gZnVuY3Rpb24oIHZpZXcgKSB7XG4gICAgLy8gbm8gZG91cHNcbiAgICBpZiAoIHRoaXMudmlld01hbmFnZXIudmlld3NbIHZpZXcuaWQgXSApIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBcbiAgICB0aGlzLnZpZXdNYW5hZ2VyLmFkZFZpZXcoIHZpZXcgKTtcblxuICAgIC8vIGlmIHRoZXJlIGlzIG5vIG90aGVyIHZpZXdzIGF1dG8gb3Blbi5cbiAgICBpZiAoICF0aGlzLl9jdXJyZW50VmlldyApIHtcbiAgICAgICAgdGhpcy5fY3VycmVudFZpZXcgPSB2aWV3O1xuICAgICAgICB0aGlzLnZpZXdNYW5hZ2VyLm9wZW4oIHZpZXcuaWQgKTtcbiAgICB9XG5cbiAgICB0aGlzLmVtaXQoICd2aWV3LmFkZGVkJywgdmlldyApO1xuICAgIHJldHVybiB2aWV3O1xufTtcblxuU2lkZWJhci5wcm90b3R5cGUuX3RlYXJkb3duVmlld3MgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAoICF0aGlzLnZpZXdNYW5hZ2VyIHx8ICF0aGlzLnZpZXdNYW5hZ2VyLnZpZXdMaXN0Lmxlbmd0aCApIHJldHVybjtcbiAgICB0aGlzLnZpZXdNYW5hZ2VyLnZpZXdMaXN0LmZvckVhY2goIGZ1bmN0aW9uKCB2aWV3ICkge1xuICAgICAgICB0aGlzLnZpZXdNYW5hZ2VyLnJlbW92ZVZpZXcoIHZpZXcuaWQgKTtcbiAgICAgICAgdGhpcy5lbWl0KCAndmlldy5yZW1vdmVkJywgdmlldyApO1xuICAgIH0uYmluZCggdGhpcyApICk7XG59O1xuXG5TaWRlYmFyLnByb3RvdHlwZS5fb25WaWV3T3BlbmluZyA9IGZ1bmN0aW9uKCB2aWV3ICkge1xuICAgIGZvciAoIHZhciBjIGluIHRoaXMuYWRkZWRDbGFzc2VzICkge1xuICAgICAgICB0aGlzLnJlbW92ZUNsYXNzKCBjICk7XG4gICAgfVxuICAgIHRoaXMuZWwuY2xhc3NMaXN0LmFkZCggJ2FuaW1hdGluZycgKTtcbiAgICB0aGlzLmVsLnJlbW92ZUF0dHJpYnV0ZSggJ3N0eWxlJyApO1xuICAgIGlmICggIXRoaXMuX2N1cnJlbnRWaWV3IHx8IHZpZXcuaWQgIT09IHRoaXMuX2N1cnJlbnRWaWV3LmlkICkge1xuXG4gICAgICAgIC8vIGNsb3NlIG9sZCB2aWV3XG4gICAgICAgIHRoaXMuX3ByZXZWaWV3ID0gdGhpcy5fY3VycmVudFZpZXc7XG4gICAgICAgIGlmICggdGhpcy5fcHJldlZpZXcgKSB7XG4gICAgICAgICAgICB0aGlzLl9wcmV2Vmlldy5jbG9zZSgpO1xuICAgICAgICAgICAgdGhpcy5fcHJldlZpZXcuZWwuY2xhc3NMaXN0LmFkZCggJ3NpZGViYXItdmlldy1vdXQnICk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fY3VycmVudFZpZXcgPSB2aWV3O1xuICAgIH1cbiAgICB0aGlzLl9oYW5kbGVBbmltYXRpb25zKCk7IC8vIG11c3QgY29tZSBhZnRlciB3ZSBzZXQgYSBfY3VycmVudFZpZXdcbiAgICB0aGlzLnN0YXJ0ZWQgPSB0cnVlO1xuICAgIC8vIGluZGljYXRlIHRoZXJlIGlzIGEgdmlldyBvcGVuaW5nXG4gICAgdGhpcy5lbWl0KCAndmlldy5vcGVuZWQnLCB2aWV3ICk7XG4gICAgdGhpcy5lbWl0KCAndmlldy5vcGVuZWQuJyArIHZpZXcuaWQsIHZpZXcgKTtcblxufTtcblxuU2lkZWJhci5wcm90b3R5cGUuX29uVmlld09wZW5pbmdTZWNvbmRhcnkgPSBmdW5jdGlvbiggdmlldyApIHtcbiAgICB0aGlzLmVsLmNsYXNzTGlzdC5hZGQoICdhbmltYXRpbmctc2Vjb25kYXJ5JyApO1xuICAgIHRoaXMudmlld01hbmFnZXIub3Blbiggdmlldy5pZCApO1xufTtcblxuU2lkZWJhci5wcm90b3R5cGUuX29uVmlld1JlbmRlcmVkID0gZnVuY3Rpb24oIHZpZXcgKSB7XG4gICAgLy8gY3JlYXRlIGdlbmVyYWwgYW5kIG5hbWVzcGFjZWQgZXZlbnRcbiAgICB0aGlzLmVtaXQoICd2aWV3LnJlbmRlcmVkJywgdmlldyApO1xuICAgIHRoaXMuZW1pdCggJ3ZpZXcucmVuZGVyZWQuJyArIHZpZXcuaWQsIHZpZXcgKTtcbn07XG5cblNpZGViYXIucHJvdG90eXBlLl9vblZpZXdSZWFkeSA9IGZ1bmN0aW9uKCBjYWxsYmFjaywgZXJyLCB2aWV3ICkge1xuICAgIGlmICggZXJyICkge1xuICAgICAgICB2aWV3Lm9mZiggJ29wZW4nLCB0aGlzLl9vblZpZXdPcGVuaW5nLmJpbmQoIHRoaXMgKSApO1xuICAgICAgICB2aWV3LnJlbW92ZSgpO1xuICAgICAgICB0aGlzLmVtaXQoICdlcnJvcicsIGVyciApO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vIHVuYmluZCBhbnkgc3RhbGUgaGFuZGxlcnNcbiAgICB2aWV3Lm9mZiggJ3JlYWR5JywgdGhpcy5fb25WaWV3UmVhZHkuYmluZCggdGhpcywgY2FsbGJhY2ssIG51bGwgKSApO1xuICAgIHZpZXcub2ZmKCAnZXJyb3InLCB0aGlzLl9vblZpZXdSZWFkeS5iaW5kKCB0aGlzLCBjYWxsYmFjayApICk7XG4gICAgaWYgKCB0eXBlb2YgY2FsbGJhY2sgPT09ICdmdW5jdGlvbicgKSB7XG4gICAgICAgIGNhbGxiYWNrKCBlcnIsIHZpZXcgKTtcbiAgICB9XG4gICAgLy8gY2FjaGUgdmlldyBhZnRlciBzdWNjZXNzZnVsXG4gICAgdGhpcy5fY2FjaGVWaWV3KCB2aWV3ICk7XG59O1xuXG5TaWRlYmFyLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gZG8gdmlldyBjaGVja1xuICAgIHRoaXMuZWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCAnW2RhdGEtc2lkZWJhcl0nICk7XG4gICAgdGhpcy5fdGVhcmRvd25WaWV3cygpO1xuICAgIHRoaXMuX2hvbWVWaWV3ID0gbnVsbDtcbiAgICB0aGlzLl9jdXJyZW50VmlldyA9IG51bGw7XG4gICAgdGhpcy5fdmlld3MgPSBbXTtcbiAgICB0aGlzLl92aWV3c0J5SWQgPSB7fTtcblxuICAgIC8vIHNpZ25pZnkgaW5pYWxpemF0aW9uXG4gICAgaWYgKCB0aGlzLmVsICkge1xuICAgICAgICBpZiAoICF0aGlzLndyYXBwZXIgKSB7XG4gICAgICAgICAgICB0aGlzLndyYXBwZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCAnZGl2JyApO1xuICAgICAgICAgICAgdGhpcy5lbC5hcHBlbmRDaGlsZCggdGhpcy53cmFwcGVyICk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5lbC5jbGFzc0xpc3QuYWRkKCAnc2lkZWJhci1pbml0JyApO1xuICAgICAgICB0aGlzLnZpZXdNYW5hZ2VyID0gbmV3IFltaXIoIHtcbiAgICAgICAgICBlbDogdGhpcy53cmFwcGVyLFxuICAgICAgICAgIGxpc3RFbDogdGhpcy5uYXYsXG4gICAgICAgICAgY2xhc3NOYW1lOiAnc2lkZWJhci13cmFwcGVyJ1xuICAgICAgICB9ICk7XG4gICAgICAgIHRoaXMuZW1pdCggJ3JlYWR5JywgdGhpcyApO1xuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBFdmVudEVtaXR0ZXIyID0gcmVxdWlyZSggJ2V2ZW50ZW1pdHRlcjInICkuRXZlbnRFbWl0dGVyMjtcblxuLypcbiAgICBkZXBlbmRlbmNpZXNcbiovXG5cbi8qIGJpbmRpbmcgKi9cbnZhciBiaW5kaW5nTWV0aG9kID0gd2luZG93LmFkZEV2ZW50TGlzdGVuZXIgPyAnYWRkRXZlbnRMaXN0ZW5lcicgOiAnYXR0YWNoRXZlbnQnO1xudmFyIGV2ZW50UHJlZml4ID0gYmluZGluZ01ldGhvZCAhPT0gJ2FkZEV2ZW50TGlzdGVuZXInID8gJ29uJyA6ICcnO1xuXG5mdW5jdGlvbiBiaW5kKCBlbCwgdHlwZSwgZm4sIGNhcHR1cmUgKSB7XG4gICAgZWxbIGJpbmRpbmdNZXRob2QgXSggZXZlbnRQcmVmaXggKyB0eXBlLCBmbiwgY2FwdHVyZSB8fCBmYWxzZSApO1xuICAgIHJldHVybiBmbjtcbn1cblxuLyogbWF0Y2hpbmcgKi9cbnZhciB2ZW5kb3JNYXRjaCA9IEVsZW1lbnQucHJvdG90eXBlLm1hdGNoZXMgfHwgRWxlbWVudC5wcm90b3R5cGUud2Via2l0TWF0Y2hlc1NlbGVjdG9yIHx8IEVsZW1lbnQucHJvdG90eXBlLm1vek1hdGNoZXNTZWxlY3RvciB8fCBFbGVtZW50LnByb3RvdHlwZS5tc01hdGNoZXNTZWxlY3RvciB8fCBFbGVtZW50LnByb3RvdHlwZS5vTWF0Y2hlc1NlbGVjdG9yO1xuXG5mdW5jdGlvbiBtYXRjaGVzKCBlbCwgc2VsZWN0b3IgKSB7XG4gICAgaWYgKCAhZWwgfHwgZWwubm9kZVR5cGUgIT09IDEgKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYgKCB2ZW5kb3JNYXRjaCApIHtcbiAgICAgICAgcmV0dXJuIHZlbmRvck1hdGNoLmNhbGwoIGVsLCBzZWxlY3RvciApO1xuICAgIH1cbiAgICB2YXIgbm9kZXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCBzZWxlY3RvciwgZWwucGFyZW50Tm9kZSApO1xuICAgIGZvciAoIHZhciBpID0gMDsgaSA8IG5vZGVzLmxlbmd0aDsgKytpICkge1xuICAgICAgICBpZiAoIG5vZGVzWyBpIF0gPT0gZWwgKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTsgIFxuICAgICAgICB9IFxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59XG5cbi8qIGNsb3Nlc3QgKi9cblxuZnVuY3Rpb24gY2xvc2VzdCggZWxlbWVudCwgc2VsZWN0b3IsIGNoZWNrU2VsZiwgcm9vdCApIHtcbiAgICBlbGVtZW50ID0gY2hlY2tTZWxmID8ge3BhcmVudE5vZGU6IGVsZW1lbnR9IDogZWxlbWVudDtcblxuICAgIHJvb3QgPSByb290IHx8IGRvY3VtZW50O1xuXG4gICAgLyogTWFrZSBzdXJlIGBlbGVtZW50ICE9PSBkb2N1bWVudGAgYW5kIGBlbGVtZW50ICE9IG51bGxgXG4gICAgICAgb3RoZXJ3aXNlIHdlIGdldCBhbiBpbGxlZ2FsIGludm9jYXRpb24gKi9cbiAgICB3aGlsZSAoICggZWxlbWVudCA9IGVsZW1lbnQucGFyZW50Tm9kZSApICYmIGVsZW1lbnQgIT09IGRvY3VtZW50ICkge1xuICAgICAgICBpZiAoIG1hdGNoZXMoIGVsZW1lbnQsIHNlbGVjdG9yICkgKSB7XG4gICAgICAgICAgICByZXR1cm4gZWxlbWVudDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qIEFmdGVyIGBtYXRjaGVzYCBvbiB0aGUgZWRnZSBjYXNlIHRoYXRcbiAgICAgICAgICAgdGhlIHNlbGVjdG9yIG1hdGNoZXMgdGhlIHJvb3RcbiAgICAgICAgICAgKHdoZW4gdGhlIHJvb3QgaXMgbm90IHRoZSBkb2N1bWVudCkgKi9cbiAgICAgICAgaWYgKGVsZW1lbnQgPT09IHJvb3QpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLypcbiAgICBlbmQgZGVwZW5kZW5jaWVzXG4qL1xuXG5mdW5jdGlvbiBFbWl0KCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBFdmVudEVtaXR0ZXIyLmNhbGwoIHNlbGYgKTtcblxuICAgIHNlbGYudmFsaWRhdG9ycyA9IFtdO1xuICAgIHNlbGYudG91Y2hNb3ZlRGVsdGEgPSAxMDtcbiAgICBzZWxmLmluaXRpYWxUb3VjaFBvaW50ID0gbnVsbDtcblxuICAgIGJpbmQoIGRvY3VtZW50LCAndG91Y2hzdGFydCcsIHNlbGYuaGFuZGxlRXZlbnQuYmluZCggc2VsZiApICk7XG4gICAgYmluZCggZG9jdW1lbnQsICd0b3VjaG1vdmUnLCBzZWxmLmhhbmRsZUV2ZW50LmJpbmQoIHNlbGYgKSApO1xuICAgIGJpbmQoIGRvY3VtZW50LCAndG91Y2hlbmQnLCBzZWxmLmhhbmRsZUV2ZW50LmJpbmQoIHNlbGYgKSApO1xuICAgIGJpbmQoIGRvY3VtZW50LCAnY2xpY2snLCBzZWxmLmhhbmRsZUV2ZW50LmJpbmQoIHNlbGYgKSApO1xuICAgIGJpbmQoIGRvY3VtZW50LCAnaW5wdXQnLCBzZWxmLmhhbmRsZUV2ZW50LmJpbmQoIHNlbGYgKSApO1xuICAgIGJpbmQoIGRvY3VtZW50LCAnc3VibWl0Jywgc2VsZi5oYW5kbGVFdmVudC5iaW5kKCBzZWxmICkgKTtcbn1cblxuRW1pdC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKCBFdmVudEVtaXR0ZXIyLnByb3RvdHlwZSApO1xuXG5mdW5jdGlvbiBnZXRUb3VjaERlbHRhKCBldmVudCwgaW5pdGlhbCApIHtcbiAgICB2YXIgZGVsdGFYID0gKCBldmVudC50b3VjaGVzWyAwIF0ucGFnZVggLSBpbml0aWFsLnggKTtcbiAgICB2YXIgZGVsdGFZID0gKCBldmVudC50b3VjaGVzWyAwIF0ucGFnZVkgLSBpbml0aWFsLnkgKTtcbiAgICByZXR1cm4gTWF0aC5zcXJ0KCAoIGRlbHRhWCAqIGRlbHRhWCApICsgKCBkZWx0YVkgKiBkZWx0YVkgKSApO1xufVxuXG5FbWl0LnByb3RvdHlwZS5oYW5kbGVFdmVudCA9IGZ1bmN0aW9uKCBldmVudCApIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICB2YXIgdG91Y2hlcyA9IGV2ZW50LnRvdWNoZXM7XG4gICAgdmFyIGRlbHRhID0gLTE7XG5cbiAgICBpZiAoIHR5cGVvZiBldmVudC5wcm9wYWdhdGlvblN0b3BwZWRBdCAhPT0gJ251bWJlcicgfHwgaXNOYU4oIGV2ZW50LnByb3BhZ2F0aW9uU3RvcHBlZEF0ICkgKSB7XG4gICAgICAgIGV2ZW50LnByb3BhZ2F0aW9uU3RvcHBlZEF0ID0gMTAwOyAvLyBoaWdoZXN0IHBvc3NpYmxlIHZhbHVlXG4gICAgfVxuXG4gICAgc3dpdGNoICggZXZlbnQudHlwZSApIHtcbiAgICAgICAgY2FzZSAndG91Y2hzdGFydCc6XG4gICAgICAgICAgICBzZWxmLmluaXRpYWxUb3VjaFBvaW50ID0gc2VsZi5sYXN0VG91Y2hQb2ludCA9IHtcbiAgICAgICAgICAgICAgICB4OiB0b3VjaGVzICYmIHRvdWNoZXMubGVuZ3RoID8gdG91Y2hlc1sgMCBdLnBhZ2VYIDogMCxcbiAgICAgICAgICAgICAgICB5OiB0b3VjaGVzICYmIHRvdWNoZXMubGVuZ3RoID8gdG91Y2hlc1sgMCBdLnBhZ2VZIDogMFxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZSAndG91Y2htb3ZlJzpcbiAgICAgICAgICAgIGlmICggdG91Y2hlcyAmJiB0b3VjaGVzLmxlbmd0aCAmJiBzZWxmLmluaXRpYWxUb3VjaFBvaW50ICkge1xuICAgICAgICAgICAgICAgIGRlbHRhID0gZ2V0VG91Y2hEZWx0YSggZXZlbnQsIHNlbGYuaW5pdGlhbFRvdWNoUG9pbnQgKTtcbiAgICAgICAgICAgICAgICBpZiAoIGRlbHRhID4gc2VsZi50b3VjaE1vdmVEZWx0YSApIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5pbml0aWFsVG91Y2hQb2ludCA9IG51bGw7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgc2VsZi5sYXN0VG91Y2hQb2ludCA9IHtcbiAgICAgICAgICAgICAgICAgICAgeDogdG91Y2hlc1sgMCBdLnBhZ2VYLFxuICAgICAgICAgICAgICAgICAgICB5OiB0b3VjaGVzWyAwIF0ucGFnZVlcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBicmVhaztcblxuICAgICAgICBjYXNlICdjbGljayc6XG4gICAgICAgIGNhc2UgJ3RvdWNoZW5kJzpcbiAgICAgICAgY2FzZSAnaW5wdXQnOlxuICAgICAgICBjYXNlICdzdWJtaXQnOlxuICAgICAgICAgICAgLy8gZWF0IGFueSBsYXRlLWZpcmluZyBjbGljayBldmVudHMgb24gdG91Y2ggZGV2aWNlc1xuICAgICAgICAgICAgaWYgKCBldmVudC50eXBlID09PSAnY2xpY2snICYmIHNlbGYubGFzdFRvdWNoUG9pbnQgKSB7XG4gICAgICAgICAgICAgICAgaWYgKCBldmVudC50b3VjaGVzICYmIGV2ZW50LnRvdWNoZXMubGVuZ3RoICkge1xuICAgICAgICAgICAgICAgICAgICBkZWx0YSA9IGdldFRvdWNoRGVsdGEoIGV2ZW50LCBzZWxmLmxhc3RUb3VjaFBvaW50ICk7XG4gICAgICAgICAgICAgICAgICAgIGlmICggZGVsdGEgPCBzZWxmLnRvdWNoTW92ZURlbHRhICkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBoYW5kbGUgY2FuY2VsaW5nIHRvdWNoZXMgdGhhdCBoYXZlIG1vdmVkIHRvbyBtdWNoXG4gICAgICAgICAgICBpZiAoIGV2ZW50LnR5cGUgPT09ICd0b3VjaGVuZCcgJiYgIXNlbGYuaW5pdGlhbFRvdWNoUG9pbnQgKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgc2VsZWN0b3IgPSAnW2RhdGEtZW1pdF0nO1xuICAgICAgICAgICAgdmFyIG9yaWdpbmFsRWxlbWVudCA9IGV2ZW50LnRhcmdldCB8fCBldmVudC5zcmNFbGVtZW50O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBpZiBpdCdzIGEgbGluayBhbmQgaXQgaGFzIG5vIGVtaXQgYXR0cmlidXRlLCBhbGxvdyB0aGUgZXZlbnQgdG8gcGFzc1xuICAgICAgICAgICAgaWYgKCAhb3JpZ2luYWxFbGVtZW50LmdldEF0dHJpYnV0ZSggJ2RhdGEtZW1pdCcgKSAmJiAoIG9yaWdpbmFsRWxlbWVudC50YWdOYW1lID09PSAnQScgfHwgb3JpZ2luYWxFbGVtZW50LnRhZ05hbWUgPT09ICdCVVRUT04nIHx8IG9yaWdpbmFsRWxlbWVudC50YWdOYW1lID09PSAnSU5QVVQnICkgKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgZm9yY2VBbGxvd0RlZmF1bHQgPSBvcmlnaW5hbEVsZW1lbnQudGFnTmFtZSA9PSAnSU5QVVQnICYmICggb3JpZ2luYWxFbGVtZW50LnR5cGUgPT0gJ2NoZWNrYm94JyB8fCBvcmlnaW5hbEVsZW1lbnQudHlwZSA9PSAncmFkaW8nICk7XG4gICAgICAgICAgICB2YXIgZWwgPSBjbG9zZXN0KCBvcmlnaW5hbEVsZW1lbnQsIHNlbGVjdG9yLCB0cnVlLCBkb2N1bWVudCApO1xuXG4gICAgICAgICAgICBpZiAoIGVsICkge1xuICAgICAgICAgICAgICAgIHZhciBkZXB0aCA9IC0xO1xuICAgICAgICAgICAgICAgIHdoaWxlICggZWwgJiYgZXZlbnQucHJvcGFnYXRpb25TdG9wcGVkQXQgPiBkZXB0aCAmJiArK2RlcHRoIDwgMTAwICkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdmFsaWRhdGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgZm9yICggdmFyIHZhbGlkYXRvckluZGV4ID0gMDsgdmFsaWRhdG9ySW5kZXggPCBzZWxmLnZhbGlkYXRvcnMubGVuZ3RoOyArK3ZhbGlkYXRvckluZGV4ICkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCAhc2VsZi52YWxpZGF0b3JzWyB2YWxpZGF0b3JJbmRleCBdLmNhbGwoIHRoaXMsIGVsLCBldmVudCApICkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gZWF0IHRoZSBldmVudCBpZiBhIHZhbGlkYXRvciBmYWlsZWRcbiAgICAgICAgICAgICAgICAgICAgaWYgKCAhdmFsaWRhdGVkICkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnQucHJvcGFnYXRpb25TdG9wcGVkQXQgPSBkZXB0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKCB0eXBlb2YoIHNlbGYudmFsaWRhdGUgKSA9PSAnZnVuY3Rpb24nICYmICFzZWxmLnZhbGlkYXRlLmNhbGwoIHNlbGYsIGVsICkgKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbCA9IGNsb3Nlc3QoIGVsLCBzZWxlY3RvciwgZmFsc2UsIGRvY3VtZW50ICk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmICggZWwudGFnTmFtZSA9PSAnRk9STScgKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIGV2ZW50LnR5cGUgIT0gJ3N1Ym1pdCcgKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWwgPSBjbG9zZXN0KCBlbCwgc2VsZWN0b3IsIGZhbHNlLCBkb2N1bWVudCApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKCBlbC50YWdOYW1lID09ICdJTlBVVCcgKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoICEoIGVsLnR5cGUgPT0gJ3N1Ym1pdCcgfHwgZWwudHlwZSA9PSAnY2hlY2tib3gnIHx8IGVsLnR5cGUgPT0gJ3JhZGlvJyB8fCBlbC50eXBlID09ICdmaWxlJyApICYmIGV2ZW50LnR5cGUgIT0gJ2lucHV0JyApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbCA9IGNsb3Nlc3QoIGVsLCBzZWxlY3RvciwgZmFsc2UsIGRvY3VtZW50ICk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoIGVsLnRhZ05hbWUgPT0gJ1NFTEVDVCcgKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIGV2ZW50LnR5cGUgIT0gJ2lucHV0JyApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbCA9IGNsb3Nlc3QoIGVsLCBzZWxlY3RvciwgZmFsc2UsIGRvY3VtZW50ICk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBldmVudC5lbWl0VGFyZ2V0ID0gZWw7XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50LmRlcHRoID0gZGVwdGg7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuX2VtaXQoIGVsLCBldmVudCwgZm9yY2VBbGxvd0RlZmF1bHQgKTtcbiAgICAgICAgICAgICAgICAgICAgZWwgPSBjbG9zZXN0KCBlbCwgc2VsZWN0b3IsIGZhbHNlLCBkb2N1bWVudCApO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmICggZGVwdGggPj0gMTAwICkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoICdFeGNlZWRlZCBkZXB0aCBsaW1pdCBmb3IgRW1pdCBjYWxscy4nICk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgc2VsZi5lbWl0KCAndW5oYW5kbGVkJywgZXZlbnQgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc2VsZi5pbml0aWFsVG91Y2hQb2ludCA9IG51bGw7XG5cbiAgICAgICAgICAgIGJyZWFrO1xuICAgIH1cbn07XG5cbkVtaXQucHJvdG90eXBlLl9lbWl0ID0gZnVuY3Rpb24oIGVsZW1lbnQsIGV2ZW50LCBmb3JjZURlZmF1bHQgKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBvcHRpb25TdHJpbmcgPSBlbGVtZW50LmdldEF0dHJpYnV0ZSggJ2RhdGEtZW1pdC1vcHRpb25zJyApO1xuICAgIHZhciBvcHRpb25zID0ge307XG4gICAgdmFyIGlnbm9yZVN0cmluZyA9IGVsZW1lbnQuZ2V0QXR0cmlidXRlKCAnZGF0YS1lbWl0LWlnbm9yZScgKTtcbiAgICB2YXIgaTtcblxuICAgIGlmICggaWdub3JlU3RyaW5nICYmIGlnbm9yZVN0cmluZy5sZW5ndGggKSB7XG4gICAgICAgIHZhciBpZ25vcmVkRXZlbnRzID0gaWdub3JlU3RyaW5nLnRvTG93ZXJDYXNlKCkuc3BsaXQoICcgJyApO1xuICAgICAgICBmb3IgKCBpID0gMDsgaSA8IGlnbm9yZWRFdmVudHMubGVuZ3RoOyArK2kgKSB7XG4gICAgICAgICAgICBpZiAoIGV2ZW50LnR5cGUgPT0gaWdub3JlZEV2ZW50c1sgaSBdICkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmICggb3B0aW9uU3RyaW5nICYmIG9wdGlvblN0cmluZy5sZW5ndGggKSB7XG4gICAgICAgIHZhciBvcHRzID0gb3B0aW9uU3RyaW5nLnRvTG93ZXJDYXNlKCkuc3BsaXQoICcgJyApO1xuICAgICAgICBmb3IgKCBpID0gMDsgaSA8IG9wdHMubGVuZ3RoOyArK2kgKSB7XG4gICAgICAgICAgICBvcHRpb25zWyBvcHRzWyBpIF0gXSA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoICFmb3JjZURlZmF1bHQgJiYgIW9wdGlvbnMuYWxsb3dkZWZhdWx0ICkge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIH1cblxuICAgIGlmICggIW9wdGlvbnMuYWxsb3dwcm9wYWdhdGUgKSB7XG4gICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICBldmVudC5wcm9wYWdhdGlvblN0b3BwZWRBdCA9IGV2ZW50LmRlcHRoO1xuICAgIH1cblxuICAgIHZhciBlbWlzc2lvbkxpc3QgPSBlbGVtZW50LmdldEF0dHJpYnV0ZSggJ2RhdGEtZW1pdCcgKTtcbiAgICBpZiAoICFlbWlzc2lvbkxpc3QgKSB7XG4gICAgICAgIC8vIGFsbG93IGZvciBlbXB0eSBiZWhhdmlvcnMgdGhhdCBjYXRjaCBldmVudHNcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBlbWlzc2lvbnMgPSBlbWlzc2lvbkxpc3Quc3BsaXQoICcsJyApO1xuICAgIGlmICggb3B0aW9ucy5kZWJvdW5jZSApIHtcbiAgICAgICAgc2VsZi50aW1lb3V0cyA9IHNlbGYudGltZW91dHMgfHwge307XG4gICAgICAgIGlmICggc2VsZi50aW1lb3V0c1sgZWxlbWVudCBdICkge1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KCBzZWxmLnRpbWVvdXRzWyBlbGVtZW50IF0gKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIF9lbGVtZW50ID0gZWxlbWVudDtcbiAgICAgICAgICAgIHZhciBfZW1pc3Npb25zID0gZW1pc3Npb25zO1xuICAgICAgICAgICAgdmFyIF9ldmVudCA9IGV2ZW50O1xuICAgICAgICAgICAgc2VsZi50aW1lb3V0c1sgZWxlbWVudCBdID0gc2V0VGltZW91dCggZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgX2VtaXNzaW9ucy5mb3JFYWNoKCBmdW5jdGlvbiggZW1pc3Npb24gKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuZW1pdCggZW1pc3Npb24sIF9ldmVudCApO1xuICAgICAgICAgICAgICAgIH0gKTtcbiAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQoIHNlbGYudGltZW91dHNbIF9lbGVtZW50IF0gKTtcbiAgICAgICAgICAgICAgICBzZWxmLnRpbWVvdXRzWyBfZWxlbWVudCBdID0gbnVsbDtcbiAgICAgICAgICAgIH0sIDI1MCApO1xuICAgICAgICB9ICkoKTtcblxuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIFxuICAgIGVtaXNzaW9ucy5mb3JFYWNoKCBmdW5jdGlvbiggZW1pc3Npb24gKSB7XG4gICAgICAgIHNlbGYuZW1pdCggZW1pc3Npb24sIGV2ZW50ICk7XG4gICAgfSApO1xufTtcblxuRW1pdC5wcm90b3R5cGUuYWRkVmFsaWRhdG9yID0gZnVuY3Rpb24oIHZhbGlkYXRvciApIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICB2YXIgZm91bmQgPSBmYWxzZTtcbiAgICBmb3IgKCB2YXIgaSA9IDA7IGkgPCBzZWxmLnZhbGlkYXRvcnMubGVuZ3RoOyArK2kgKSB7XG4gICAgICAgIGlmICggc2VsZi52YWxpZGF0b3JzWyBpIF0gPT0gdmFsaWRhdG9yICkge1xuICAgICAgICAgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIGZvdW5kICkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgc2VsZi52YWxpZGF0b3JzLnB1c2goIHZhbGlkYXRvciApO1xuICAgIHJldHVybiB0cnVlO1xufTtcblxuRW1pdC5wcm90b3R5cGUucmVtb3ZlVmFsaWRhdG9yID0gZnVuY3Rpb24oIHZhbGlkYXRvciApIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICB2YXIgZm91bmQgPSBmYWxzZTtcbiAgICBmb3IgKCB2YXIgaSA9IDA7IGkgPCBzZWxmLnZhbGlkYXRvcnMubGVuZ3RoOyArK2kgKSB7XG4gICAgICAgIGlmICggc2VsZi52YWxpZGF0b3JzWyBpIF0gPT0gdmFsaWRhdG9yICkge1xuICAgICAgICAgICAgc2VsZi52YWxpZGF0b3JzLnNwbGljZSggaSwgMSApO1xuICAgICAgICAgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZm91bmQ7XG59O1xuXG5FbWl0LnNpbmdsZXRvbiA9IEVtaXQuc2luZ2xldG9uIHx8IG5ldyBFbWl0KCk7XG5FbWl0LnNpbmdsZXRvbi5FbWl0ID0gRW1pdDtcblxubW9kdWxlLmV4cG9ydHMgPSBFbWl0LnNpbmdsZXRvbjtcbiIsIi8qIVxuICogRXZlbnRFbWl0dGVyMlxuICogaHR0cHM6Ly9naXRodWIuY29tL2hpajFueC9FdmVudEVtaXR0ZXIyXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDEzIGhpajFueFxuICogTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBsaWNlbnNlLlxuICovXG47IWZ1bmN0aW9uKHVuZGVmaW5lZCkge1xuXG4gIHZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSA/IEFycmF5LmlzQXJyYXkgOiBmdW5jdGlvbiBfaXNBcnJheShvYmopIHtcbiAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iaikgPT09IFwiW29iamVjdCBBcnJheV1cIjtcbiAgfTtcbiAgdmFyIGRlZmF1bHRNYXhMaXN0ZW5lcnMgPSAxMDtcblxuICBmdW5jdGlvbiBpbml0KCkge1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIGlmICh0aGlzLl9jb25mKSB7XG4gICAgICBjb25maWd1cmUuY2FsbCh0aGlzLCB0aGlzLl9jb25mKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBjb25maWd1cmUoY29uZikge1xuICAgIGlmIChjb25mKSB7XG5cbiAgICAgIHRoaXMuX2NvbmYgPSBjb25mO1xuXG4gICAgICBjb25mLmRlbGltaXRlciAmJiAodGhpcy5kZWxpbWl0ZXIgPSBjb25mLmRlbGltaXRlcik7XG4gICAgICBjb25mLm1heExpc3RlbmVycyAmJiAodGhpcy5fZXZlbnRzLm1heExpc3RlbmVycyA9IGNvbmYubWF4TGlzdGVuZXJzKTtcbiAgICAgIGNvbmYud2lsZGNhcmQgJiYgKHRoaXMud2lsZGNhcmQgPSBjb25mLndpbGRjYXJkKTtcbiAgICAgIGNvbmYubmV3TGlzdGVuZXIgJiYgKHRoaXMubmV3TGlzdGVuZXIgPSBjb25mLm5ld0xpc3RlbmVyKTtcblxuICAgICAgaWYgKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgICAgdGhpcy5saXN0ZW5lclRyZWUgPSB7fTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBFdmVudEVtaXR0ZXIoY29uZikge1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIHRoaXMubmV3TGlzdGVuZXIgPSBmYWxzZTtcbiAgICBjb25maWd1cmUuY2FsbCh0aGlzLCBjb25mKTtcbiAgfVxuXG4gIC8vXG4gIC8vIEF0dGVudGlvbiwgZnVuY3Rpb24gcmV0dXJuIHR5cGUgbm93IGlzIGFycmF5LCBhbHdheXMgIVxuICAvLyBJdCBoYXMgemVybyBlbGVtZW50cyBpZiBubyBhbnkgbWF0Y2hlcyBmb3VuZCBhbmQgb25lIG9yIG1vcmVcbiAgLy8gZWxlbWVudHMgKGxlYWZzKSBpZiB0aGVyZSBhcmUgbWF0Y2hlc1xuICAvL1xuICBmdW5jdGlvbiBzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHRyZWUsIGkpIHtcbiAgICBpZiAoIXRyZWUpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgdmFyIGxpc3RlbmVycz1bXSwgbGVhZiwgbGVuLCBicmFuY2gsIHhUcmVlLCB4eFRyZWUsIGlzb2xhdGVkQnJhbmNoLCBlbmRSZWFjaGVkLFxuICAgICAgICB0eXBlTGVuZ3RoID0gdHlwZS5sZW5ndGgsIGN1cnJlbnRUeXBlID0gdHlwZVtpXSwgbmV4dFR5cGUgPSB0eXBlW2krMV07XG4gICAgaWYgKGkgPT09IHR5cGVMZW5ndGggJiYgdHJlZS5fbGlzdGVuZXJzKSB7XG4gICAgICAvL1xuICAgICAgLy8gSWYgYXQgdGhlIGVuZCBvZiB0aGUgZXZlbnQocykgbGlzdCBhbmQgdGhlIHRyZWUgaGFzIGxpc3RlbmVyc1xuICAgICAgLy8gaW52b2tlIHRob3NlIGxpc3RlbmVycy5cbiAgICAgIC8vXG4gICAgICBpZiAodHlwZW9mIHRyZWUuX2xpc3RlbmVycyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBoYW5kbGVycyAmJiBoYW5kbGVycy5wdXNoKHRyZWUuX2xpc3RlbmVycyk7XG4gICAgICAgIHJldHVybiBbdHJlZV07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKGxlYWYgPSAwLCBsZW4gPSB0cmVlLl9saXN0ZW5lcnMubGVuZ3RoOyBsZWFmIDwgbGVuOyBsZWFmKyspIHtcbiAgICAgICAgICBoYW5kbGVycyAmJiBoYW5kbGVycy5wdXNoKHRyZWUuX2xpc3RlbmVyc1tsZWFmXSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFt0cmVlXTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoKGN1cnJlbnRUeXBlID09PSAnKicgfHwgY3VycmVudFR5cGUgPT09ICcqKicpIHx8IHRyZWVbY3VycmVudFR5cGVdKSB7XG4gICAgICAvL1xuICAgICAgLy8gSWYgdGhlIGV2ZW50IGVtaXR0ZWQgaXMgJyonIGF0IHRoaXMgcGFydFxuICAgICAgLy8gb3IgdGhlcmUgaXMgYSBjb25jcmV0ZSBtYXRjaCBhdCB0aGlzIHBhdGNoXG4gICAgICAvL1xuICAgICAgaWYgKGN1cnJlbnRUeXBlID09PSAnKicpIHtcbiAgICAgICAgZm9yIChicmFuY2ggaW4gdHJlZSkge1xuICAgICAgICAgIGlmIChicmFuY2ggIT09ICdfbGlzdGVuZXJzJyAmJiB0cmVlLmhhc093blByb3BlcnR5KGJyYW5jaCkpIHtcbiAgICAgICAgICAgIGxpc3RlbmVycyA9IGxpc3RlbmVycy5jb25jYXQoc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB0cmVlW2JyYW5jaF0sIGkrMSkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbGlzdGVuZXJzO1xuICAgICAgfSBlbHNlIGlmKGN1cnJlbnRUeXBlID09PSAnKionKSB7XG4gICAgICAgIGVuZFJlYWNoZWQgPSAoaSsxID09PSB0eXBlTGVuZ3RoIHx8IChpKzIgPT09IHR5cGVMZW5ndGggJiYgbmV4dFR5cGUgPT09ICcqJykpO1xuICAgICAgICBpZihlbmRSZWFjaGVkICYmIHRyZWUuX2xpc3RlbmVycykge1xuICAgICAgICAgIC8vIFRoZSBuZXh0IGVsZW1lbnQgaGFzIGEgX2xpc3RlbmVycywgYWRkIGl0IHRvIHRoZSBoYW5kbGVycy5cbiAgICAgICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuY29uY2F0KHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZSwgdHlwZUxlbmd0aCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChicmFuY2ggaW4gdHJlZSkge1xuICAgICAgICAgIGlmIChicmFuY2ggIT09ICdfbGlzdGVuZXJzJyAmJiB0cmVlLmhhc093blByb3BlcnR5KGJyYW5jaCkpIHtcbiAgICAgICAgICAgIGlmKGJyYW5jaCA9PT0gJyonIHx8IGJyYW5jaCA9PT0gJyoqJykge1xuICAgICAgICAgICAgICBpZih0cmVlW2JyYW5jaF0uX2xpc3RlbmVycyAmJiAhZW5kUmVhY2hlZCkge1xuICAgICAgICAgICAgICAgIGxpc3RlbmVycyA9IGxpc3RlbmVycy5jb25jYXQoc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB0cmVlW2JyYW5jaF0sIHR5cGVMZW5ndGgpKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuY29uY2F0KHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZVticmFuY2hdLCBpKSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYoYnJhbmNoID09PSBuZXh0VHlwZSkge1xuICAgICAgICAgICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuY29uY2F0KHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZVticmFuY2hdLCBpKzIpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIC8vIE5vIG1hdGNoIG9uIHRoaXMgb25lLCBzaGlmdCBpbnRvIHRoZSB0cmVlIGJ1dCBub3QgaW4gdGhlIHR5cGUgYXJyYXkuXG4gICAgICAgICAgICAgIGxpc3RlbmVycyA9IGxpc3RlbmVycy5jb25jYXQoc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB0cmVlW2JyYW5jaF0sIGkpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGxpc3RlbmVycztcbiAgICAgIH1cblxuICAgICAgbGlzdGVuZXJzID0gbGlzdGVuZXJzLmNvbmNhdChzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHRyZWVbY3VycmVudFR5cGVdLCBpKzEpKTtcbiAgICB9XG5cbiAgICB4VHJlZSA9IHRyZWVbJyonXTtcbiAgICBpZiAoeFRyZWUpIHtcbiAgICAgIC8vXG4gICAgICAvLyBJZiB0aGUgbGlzdGVuZXIgdHJlZSB3aWxsIGFsbG93IGFueSBtYXRjaCBmb3IgdGhpcyBwYXJ0LFxuICAgICAgLy8gdGhlbiByZWN1cnNpdmVseSBleHBsb3JlIGFsbCBicmFuY2hlcyBvZiB0aGUgdHJlZVxuICAgICAgLy9cbiAgICAgIHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgeFRyZWUsIGkrMSk7XG4gICAgfVxuXG4gICAgeHhUcmVlID0gdHJlZVsnKionXTtcbiAgICBpZih4eFRyZWUpIHtcbiAgICAgIGlmKGkgPCB0eXBlTGVuZ3RoKSB7XG4gICAgICAgIGlmKHh4VHJlZS5fbGlzdGVuZXJzKSB7XG4gICAgICAgICAgLy8gSWYgd2UgaGF2ZSBhIGxpc3RlbmVyIG9uIGEgJyoqJywgaXQgd2lsbCBjYXRjaCBhbGwsIHNvIGFkZCBpdHMgaGFuZGxlci5cbiAgICAgICAgICBzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHh4VHJlZSwgdHlwZUxlbmd0aCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBCdWlsZCBhcnJheXMgb2YgbWF0Y2hpbmcgbmV4dCBicmFuY2hlcyBhbmQgb3RoZXJzLlxuICAgICAgICBmb3IoYnJhbmNoIGluIHh4VHJlZSkge1xuICAgICAgICAgIGlmKGJyYW5jaCAhPT0gJ19saXN0ZW5lcnMnICYmIHh4VHJlZS5oYXNPd25Qcm9wZXJ0eShicmFuY2gpKSB7XG4gICAgICAgICAgICBpZihicmFuY2ggPT09IG5leHRUeXBlKSB7XG4gICAgICAgICAgICAgIC8vIFdlIGtub3cgdGhlIG5leHQgZWxlbWVudCB3aWxsIG1hdGNoLCBzbyBqdW1wIHR3aWNlLlxuICAgICAgICAgICAgICBzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHh4VHJlZVticmFuY2hdLCBpKzIpO1xuICAgICAgICAgICAgfSBlbHNlIGlmKGJyYW5jaCA9PT0gY3VycmVudFR5cGUpIHtcbiAgICAgICAgICAgICAgLy8gQ3VycmVudCBub2RlIG1hdGNoZXMsIG1vdmUgaW50byB0aGUgdHJlZS5cbiAgICAgICAgICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB4eFRyZWVbYnJhbmNoXSwgaSsxKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGlzb2xhdGVkQnJhbmNoID0ge307XG4gICAgICAgICAgICAgIGlzb2xhdGVkQnJhbmNoW2JyYW5jaF0gPSB4eFRyZWVbYnJhbmNoXTtcbiAgICAgICAgICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB7ICcqKic6IGlzb2xhdGVkQnJhbmNoIH0sIGkrMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYoeHhUcmVlLl9saXN0ZW5lcnMpIHtcbiAgICAgICAgLy8gV2UgaGF2ZSByZWFjaGVkIHRoZSBlbmQgYW5kIHN0aWxsIG9uIGEgJyoqJ1xuICAgICAgICBzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHh4VHJlZSwgdHlwZUxlbmd0aCk7XG4gICAgICB9IGVsc2UgaWYoeHhUcmVlWycqJ10gJiYgeHhUcmVlWycqJ10uX2xpc3RlbmVycykge1xuICAgICAgICBzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHh4VHJlZVsnKiddLCB0eXBlTGVuZ3RoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbGlzdGVuZXJzO1xuICB9XG5cbiAgZnVuY3Rpb24gZ3Jvd0xpc3RlbmVyVHJlZSh0eXBlLCBsaXN0ZW5lcikge1xuXG4gICAgdHlwZSA9IHR5cGVvZiB0eXBlID09PSAnc3RyaW5nJyA/IHR5cGUuc3BsaXQodGhpcy5kZWxpbWl0ZXIpIDogdHlwZS5zbGljZSgpO1xuXG4gICAgLy9cbiAgICAvLyBMb29rcyBmb3IgdHdvIGNvbnNlY3V0aXZlICcqKicsIGlmIHNvLCBkb24ndCBhZGQgdGhlIGV2ZW50IGF0IGFsbC5cbiAgICAvL1xuICAgIGZvcih2YXIgaSA9IDAsIGxlbiA9IHR5cGUubGVuZ3RoOyBpKzEgPCBsZW47IGkrKykge1xuICAgICAgaWYodHlwZVtpXSA9PT0gJyoqJyAmJiB0eXBlW2krMV0gPT09ICcqKicpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cblxuICAgIHZhciB0cmVlID0gdGhpcy5saXN0ZW5lclRyZWU7XG4gICAgdmFyIG5hbWUgPSB0eXBlLnNoaWZ0KCk7XG5cbiAgICB3aGlsZSAobmFtZSkge1xuXG4gICAgICBpZiAoIXRyZWVbbmFtZV0pIHtcbiAgICAgICAgdHJlZVtuYW1lXSA9IHt9O1xuICAgICAgfVxuXG4gICAgICB0cmVlID0gdHJlZVtuYW1lXTtcblxuICAgICAgaWYgKHR5cGUubGVuZ3RoID09PSAwKSB7XG5cbiAgICAgICAgaWYgKCF0cmVlLl9saXN0ZW5lcnMpIHtcbiAgICAgICAgICB0cmVlLl9saXN0ZW5lcnMgPSBsaXN0ZW5lcjtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmKHR5cGVvZiB0cmVlLl9saXN0ZW5lcnMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICB0cmVlLl9saXN0ZW5lcnMgPSBbdHJlZS5fbGlzdGVuZXJzLCBsaXN0ZW5lcl07XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoaXNBcnJheSh0cmVlLl9saXN0ZW5lcnMpKSB7XG5cbiAgICAgICAgICB0cmVlLl9saXN0ZW5lcnMucHVzaChsaXN0ZW5lcik7XG5cbiAgICAgICAgICBpZiAoIXRyZWUuX2xpc3RlbmVycy53YXJuZWQpIHtcblxuICAgICAgICAgICAgdmFyIG0gPSBkZWZhdWx0TWF4TGlzdGVuZXJzO1xuXG4gICAgICAgICAgICBpZiAodHlwZW9mIHRoaXMuX2V2ZW50cy5tYXhMaXN0ZW5lcnMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgIG0gPSB0aGlzLl9ldmVudHMubWF4TGlzdGVuZXJzO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAobSA+IDAgJiYgdHJlZS5fbGlzdGVuZXJzLmxlbmd0aCA+IG0pIHtcblxuICAgICAgICAgICAgICB0cmVlLl9saXN0ZW5lcnMud2FybmVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICVkIGxpc3RlbmVycyBhZGRlZC4gJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ1VzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvIGluY3JlYXNlIGxpbWl0LicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJlZS5fbGlzdGVuZXJzLmxlbmd0aCk7XG4gICAgICAgICAgICAgIGNvbnNvbGUudHJhY2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICBuYW1lID0gdHlwZS5zaGlmdCgpO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW5cbiAgLy8gMTAgbGlzdGVuZXJzIGFyZSBhZGRlZCB0byBpdC4gVGhpcyBpcyBhIHVzZWZ1bCBkZWZhdWx0IHdoaWNoXG4gIC8vIGhlbHBzIGZpbmRpbmcgbWVtb3J5IGxlYWtzLlxuICAvL1xuICAvLyBPYnZpb3VzbHkgbm90IGFsbCBFbWl0dGVycyBzaG91bGQgYmUgbGltaXRlZCB0byAxMC4gVGhpcyBmdW5jdGlvbiBhbGxvd3NcbiAgLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5kZWxpbWl0ZXIgPSAnLic7XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5zZXRNYXhMaXN0ZW5lcnMgPSBmdW5jdGlvbihuKSB7XG4gICAgdGhpcy5fZXZlbnRzIHx8IGluaXQuY2FsbCh0aGlzKTtcbiAgICB0aGlzLl9ldmVudHMubWF4TGlzdGVuZXJzID0gbjtcbiAgICBpZiAoIXRoaXMuX2NvbmYpIHRoaXMuX2NvbmYgPSB7fTtcbiAgICB0aGlzLl9jb25mLm1heExpc3RlbmVycyA9IG47XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5ldmVudCA9ICcnO1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKGV2ZW50LCBmbikge1xuICAgIHRoaXMubWFueShldmVudCwgMSwgZm4pO1xuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUubWFueSA9IGZ1bmN0aW9uKGV2ZW50LCB0dGwsIGZuKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgaWYgKHR5cGVvZiBmbiAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdtYW55IG9ubHkgYWNjZXB0cyBpbnN0YW5jZXMgb2YgRnVuY3Rpb24nKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsaXN0ZW5lcigpIHtcbiAgICAgIGlmICgtLXR0bCA9PT0gMCkge1xuICAgICAgICBzZWxmLm9mZihldmVudCwgbGlzdGVuZXIpO1xuICAgICAgfVxuICAgICAgZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG5cbiAgICBsaXN0ZW5lci5fb3JpZ2luID0gZm47XG5cbiAgICB0aGlzLm9uKGV2ZW50LCBsaXN0ZW5lcik7XG5cbiAgICByZXR1cm4gc2VsZjtcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbigpIHtcblxuICAgIHRoaXMuX2V2ZW50cyB8fCBpbml0LmNhbGwodGhpcyk7XG5cbiAgICB2YXIgdHlwZSA9IGFyZ3VtZW50c1swXTtcblxuICAgIGlmICh0eXBlID09PSAnbmV3TGlzdGVuZXInICYmICF0aGlzLm5ld0xpc3RlbmVyKSB7XG4gICAgICBpZiAoIXRoaXMuX2V2ZW50cy5uZXdMaXN0ZW5lcikgeyByZXR1cm4gZmFsc2U7IH1cbiAgICB9XG5cbiAgICAvLyBMb29wIHRocm91Z2ggdGhlICpfYWxsKiBmdW5jdGlvbnMgYW5kIGludm9rZSB0aGVtLlxuICAgIGlmICh0aGlzLl9hbGwpIHtcbiAgICAgIHZhciBsID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGwgLSAxKTtcbiAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgbDsgaSsrKSBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgIGZvciAoaSA9IDAsIGwgPSB0aGlzLl9hbGwubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIHRoaXMuZXZlbnQgPSB0eXBlO1xuICAgICAgICB0aGlzLl9hbGxbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gSWYgdGhlcmUgaXMgbm8gJ2Vycm9yJyBldmVudCBsaXN0ZW5lciB0aGVuIHRocm93LlxuICAgIGlmICh0eXBlID09PSAnZXJyb3InKSB7XG5cbiAgICAgIGlmICghdGhpcy5fYWxsICYmXG4gICAgICAgICF0aGlzLl9ldmVudHMuZXJyb3IgJiZcbiAgICAgICAgISh0aGlzLndpbGRjYXJkICYmIHRoaXMubGlzdGVuZXJUcmVlLmVycm9yKSkge1xuXG4gICAgICAgIGlmIChhcmd1bWVudHNbMV0gaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICAgIHRocm93IGFyZ3VtZW50c1sxXTsgLy8gVW5oYW5kbGVkICdlcnJvcicgZXZlbnRcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJVbmNhdWdodCwgdW5zcGVjaWZpZWQgJ2Vycm9yJyBldmVudC5cIik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHZhciBoYW5kbGVyO1xuXG4gICAgaWYodGhpcy53aWxkY2FyZCkge1xuICAgICAgaGFuZGxlciA9IFtdO1xuICAgICAgdmFyIG5zID0gdHlwZW9mIHR5cGUgPT09ICdzdHJpbmcnID8gdHlwZS5zcGxpdCh0aGlzLmRlbGltaXRlcikgOiB0eXBlLnNsaWNlKCk7XG4gICAgICBzZWFyY2hMaXN0ZW5lclRyZWUuY2FsbCh0aGlzLCBoYW5kbGVyLCBucywgdGhpcy5saXN0ZW5lclRyZWUsIDApO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBoYW5kbGVyID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aGlzLmV2ZW50ID0gdHlwZTtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKVxuICAgICAgICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgMzpcbiAgICAgICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAvLyBzbG93ZXJcbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgdmFyIGwgPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkobCAtIDEpO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBsOyBpKyspIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgICAgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGVsc2UgaWYgKGhhbmRsZXIpIHtcbiAgICAgIHZhciBsID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGwgLSAxKTtcbiAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgbDsgaSsrKSBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcblxuICAgICAgdmFyIGxpc3RlbmVycyA9IGhhbmRsZXIuc2xpY2UoKTtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gbGlzdGVuZXJzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICB0aGlzLmV2ZW50ID0gdHlwZTtcbiAgICAgICAgbGlzdGVuZXJzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIChsaXN0ZW5lcnMubGVuZ3RoID4gMCkgfHwgISF0aGlzLl9hbGw7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgcmV0dXJuICEhdGhpcy5fYWxsO1xuICAgIH1cblxuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuXG4gICAgaWYgKHR5cGVvZiB0eXBlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aGlzLm9uQW55KHR5cGUpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBsaXN0ZW5lciAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdvbiBvbmx5IGFjY2VwdHMgaW5zdGFuY2VzIG9mIEZ1bmN0aW9uJyk7XG4gICAgfVxuICAgIHRoaXMuX2V2ZW50cyB8fCBpbml0LmNhbGwodGhpcyk7XG5cbiAgICAvLyBUbyBhdm9pZCByZWN1cnNpb24gaW4gdGhlIGNhc2UgdGhhdCB0eXBlID09IFwibmV3TGlzdGVuZXJzXCIhIEJlZm9yZVxuICAgIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFwibmV3TGlzdGVuZXJzXCIuXG4gICAgdGhpcy5lbWl0KCduZXdMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcblxuICAgIGlmKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgIGdyb3dMaXN0ZW5lclRyZWUuY2FsbCh0aGlzLCB0eXBlLCBsaXN0ZW5lcik7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSkge1xuICAgICAgLy8gT3B0aW1pemUgdGhlIGNhc2Ugb2Ygb25lIGxpc3RlbmVyLiBEb24ndCBuZWVkIHRoZSBleHRyYSBhcnJheSBvYmplY3QuXG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgICB9XG4gICAgZWxzZSBpZih0eXBlb2YgdGhpcy5fZXZlbnRzW3R5cGVdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAvLyBBZGRpbmcgdGhlIHNlY29uZCBlbGVtZW50LCBuZWVkIHRvIGNoYW5nZSB0byBhcnJheS5cbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV0sIGxpc3RlbmVyXTtcbiAgICB9XG4gICAgZWxzZSBpZiAoaXNBcnJheSh0aGlzLl9ldmVudHNbdHlwZV0pKSB7XG4gICAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhcHBlbmQuXG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0ucHVzaChsaXN0ZW5lcik7XG5cbiAgICAgIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gICAgICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQpIHtcblxuICAgICAgICB2YXIgbSA9IGRlZmF1bHRNYXhMaXN0ZW5lcnM7XG5cbiAgICAgICAgaWYgKHR5cGVvZiB0aGlzLl9ldmVudHMubWF4TGlzdGVuZXJzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgIG0gPSB0aGlzLl9ldmVudHMubWF4TGlzdGVuZXJzO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG0gPiAwICYmIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGggPiBtKSB7XG5cbiAgICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkID0gdHJ1ZTtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKCcobm9kZSkgd2FybmluZzogcG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICdsZWFrIGRldGVjdGVkLiAlZCBsaXN0ZW5lcnMgYWRkZWQuICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgJ1VzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvIGluY3JlYXNlIGxpbWl0LicsXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoKTtcbiAgICAgICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbkFueSA9IGZ1bmN0aW9uKGZuKSB7XG5cbiAgICBpZiAodHlwZW9mIGZuICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ29uQW55IG9ubHkgYWNjZXB0cyBpbnN0YW5jZXMgb2YgRnVuY3Rpb24nKTtcbiAgICB9XG5cbiAgICBpZighdGhpcy5fYWxsKSB7XG4gICAgICB0aGlzLl9hbGwgPSBbXTtcbiAgICB9XG5cbiAgICAvLyBBZGQgdGhlIGZ1bmN0aW9uIHRvIHRoZSBldmVudCBsaXN0ZW5lciBjb2xsZWN0aW9uLlxuICAgIHRoaXMuX2FsbC5wdXNoKGZuKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbjtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9mZiA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gICAgaWYgKHR5cGVvZiBsaXN0ZW5lciAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdyZW1vdmVMaXN0ZW5lciBvbmx5IHRha2VzIGluc3RhbmNlcyBvZiBGdW5jdGlvbicpO1xuICAgIH1cblxuICAgIHZhciBoYW5kbGVycyxsZWFmcz1bXTtcblxuICAgIGlmKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgIHZhciBucyA9IHR5cGVvZiB0eXBlID09PSAnc3RyaW5nJyA/IHR5cGUuc3BsaXQodGhpcy5kZWxpbWl0ZXIpIDogdHlwZS5zbGljZSgpO1xuICAgICAgbGVhZnMgPSBzZWFyY2hMaXN0ZW5lclRyZWUuY2FsbCh0aGlzLCBudWxsLCBucywgdGhpcy5saXN0ZW5lclRyZWUsIDApO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIC8vIGRvZXMgbm90IHVzZSBsaXN0ZW5lcnMoKSwgc28gbm8gc2lkZSBlZmZlY3Qgb2YgY3JlYXRpbmcgX2V2ZW50c1t0eXBlXVxuICAgICAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pIHJldHVybiB0aGlzO1xuICAgICAgaGFuZGxlcnMgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgICBsZWFmcy5wdXNoKHtfbGlzdGVuZXJzOmhhbmRsZXJzfSk7XG4gICAgfVxuXG4gICAgZm9yICh2YXIgaUxlYWY9MDsgaUxlYWY8bGVhZnMubGVuZ3RoOyBpTGVhZisrKSB7XG4gICAgICB2YXIgbGVhZiA9IGxlYWZzW2lMZWFmXTtcbiAgICAgIGhhbmRsZXJzID0gbGVhZi5fbGlzdGVuZXJzO1xuICAgICAgaWYgKGlzQXJyYXkoaGFuZGxlcnMpKSB7XG5cbiAgICAgICAgdmFyIHBvc2l0aW9uID0gLTE7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IGhhbmRsZXJzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgaWYgKGhhbmRsZXJzW2ldID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAgICAgKGhhbmRsZXJzW2ldLmxpc3RlbmVyICYmIGhhbmRsZXJzW2ldLmxpc3RlbmVyID09PSBsaXN0ZW5lcikgfHxcbiAgICAgICAgICAgIChoYW5kbGVyc1tpXS5fb3JpZ2luICYmIGhhbmRsZXJzW2ldLl9vcmlnaW4gPT09IGxpc3RlbmVyKSkge1xuICAgICAgICAgICAgcG9zaXRpb24gPSBpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHBvc2l0aW9uIDwgMCkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYodGhpcy53aWxkY2FyZCkge1xuICAgICAgICAgIGxlYWYuX2xpc3RlbmVycy5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGhhbmRsZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIGlmKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBsZWFmLl9saXN0ZW5lcnM7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9XG4gICAgICBlbHNlIGlmIChoYW5kbGVycyA9PT0gbGlzdGVuZXIgfHxcbiAgICAgICAgKGhhbmRsZXJzLmxpc3RlbmVyICYmIGhhbmRsZXJzLmxpc3RlbmVyID09PSBsaXN0ZW5lcikgfHxcbiAgICAgICAgKGhhbmRsZXJzLl9vcmlnaW4gJiYgaGFuZGxlcnMuX29yaWdpbiA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgIGlmKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgICAgICBkZWxldGUgbGVhZi5fbGlzdGVuZXJzO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9mZkFueSA9IGZ1bmN0aW9uKGZuKSB7XG4gICAgdmFyIGkgPSAwLCBsID0gMCwgZm5zO1xuICAgIGlmIChmbiAmJiB0aGlzLl9hbGwgJiYgdGhpcy5fYWxsLmxlbmd0aCA+IDApIHtcbiAgICAgIGZucyA9IHRoaXMuX2FsbDtcbiAgICAgIGZvcihpID0gMCwgbCA9IGZucy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgaWYoZm4gPT09IGZuc1tpXSkge1xuICAgICAgICAgIGZucy5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fYWxsID0gW107XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9mZjtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgIXRoaXMuX2V2ZW50cyB8fCBpbml0LmNhbGwodGhpcyk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBpZih0aGlzLndpbGRjYXJkKSB7XG4gICAgICB2YXIgbnMgPSB0eXBlb2YgdHlwZSA9PT0gJ3N0cmluZycgPyB0eXBlLnNwbGl0KHRoaXMuZGVsaW1pdGVyKSA6IHR5cGUuc2xpY2UoKTtcbiAgICAgIHZhciBsZWFmcyA9IHNlYXJjaExpc3RlbmVyVHJlZS5jYWxsKHRoaXMsIG51bGwsIG5zLCB0aGlzLmxpc3RlbmVyVHJlZSwgMCk7XG5cbiAgICAgIGZvciAodmFyIGlMZWFmPTA7IGlMZWFmPGxlYWZzLmxlbmd0aDsgaUxlYWYrKykge1xuICAgICAgICB2YXIgbGVhZiA9IGxlYWZzW2lMZWFmXTtcbiAgICAgICAgbGVhZi5fbGlzdGVuZXJzID0gbnVsbDtcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSkgcmV0dXJuIHRoaXM7XG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgICBpZih0aGlzLndpbGRjYXJkKSB7XG4gICAgICB2YXIgaGFuZGxlcnMgPSBbXTtcbiAgICAgIHZhciBucyA9IHR5cGVvZiB0eXBlID09PSAnc3RyaW5nJyA/IHR5cGUuc3BsaXQodGhpcy5kZWxpbWl0ZXIpIDogdHlwZS5zbGljZSgpO1xuICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlLmNhbGwodGhpcywgaGFuZGxlcnMsIG5zLCB0aGlzLmxpc3RlbmVyVHJlZSwgMCk7XG4gICAgICByZXR1cm4gaGFuZGxlcnM7XG4gICAgfVxuXG4gICAgdGhpcy5fZXZlbnRzIHx8IGluaXQuY2FsbCh0aGlzKTtcblxuICAgIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKSB0aGlzLl9ldmVudHNbdHlwZV0gPSBbXTtcbiAgICBpZiAoIWlzQXJyYXkodGhpcy5fZXZlbnRzW3R5cGVdKSkge1xuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXV07XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9ldmVudHNbdHlwZV07XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnNBbnkgPSBmdW5jdGlvbigpIHtcblxuICAgIGlmKHRoaXMuX2FsbCkge1xuICAgICAgcmV0dXJuIHRoaXMuX2FsbDtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gIH07XG5cbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG4gICAgZGVmaW5lKGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIEV2ZW50RW1pdHRlcjtcbiAgICB9KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcpIHtcbiAgICAvLyBDb21tb25KU1xuICAgIGV4cG9ydHMuRXZlbnRFbWl0dGVyMiA9IEV2ZW50RW1pdHRlcjtcbiAgfVxuICBlbHNlIHtcbiAgICAvLyBCcm93c2VyIGdsb2JhbC5cbiAgICB3aW5kb3cuRXZlbnRFbWl0dGVyMiA9IEV2ZW50RW1pdHRlcjtcbiAgfVxufSgpO1xuIiwidmFyIGhhc093biA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG52YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xudmFyIHVuZGVmaW5lZDtcblxudmFyIGlzUGxhaW5PYmplY3QgPSBmdW5jdGlvbiBpc1BsYWluT2JqZWN0KG9iaikge1xuXHQndXNlIHN0cmljdCc7XG5cdGlmICghb2JqIHx8IHRvU3RyaW5nLmNhbGwob2JqKSAhPT0gJ1tvYmplY3QgT2JqZWN0XScpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHR2YXIgaGFzX293bl9jb25zdHJ1Y3RvciA9IGhhc093bi5jYWxsKG9iaiwgJ2NvbnN0cnVjdG9yJyk7XG5cdHZhciBoYXNfaXNfcHJvcGVydHlfb2ZfbWV0aG9kID0gb2JqLmNvbnN0cnVjdG9yICYmIG9iai5jb25zdHJ1Y3Rvci5wcm90b3R5cGUgJiYgaGFzT3duLmNhbGwob2JqLmNvbnN0cnVjdG9yLnByb3RvdHlwZSwgJ2lzUHJvdG90eXBlT2YnKTtcblx0Ly8gTm90IG93biBjb25zdHJ1Y3RvciBwcm9wZXJ0eSBtdXN0IGJlIE9iamVjdFxuXHRpZiAob2JqLmNvbnN0cnVjdG9yICYmICFoYXNfb3duX2NvbnN0cnVjdG9yICYmICFoYXNfaXNfcHJvcGVydHlfb2ZfbWV0aG9kKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0Ly8gT3duIHByb3BlcnRpZXMgYXJlIGVudW1lcmF0ZWQgZmlyc3RseSwgc28gdG8gc3BlZWQgdXAsXG5cdC8vIGlmIGxhc3Qgb25lIGlzIG93biwgdGhlbiBhbGwgcHJvcGVydGllcyBhcmUgb3duLlxuXHR2YXIga2V5O1xuXHRmb3IgKGtleSBpbiBvYmopIHt9XG5cblx0cmV0dXJuIGtleSA9PT0gdW5kZWZpbmVkIHx8IGhhc093bi5jYWxsKG9iaiwga2V5KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZXh0ZW5kKCkge1xuXHQndXNlIHN0cmljdCc7XG5cdHZhciBvcHRpb25zLCBuYW1lLCBzcmMsIGNvcHksIGNvcHlJc0FycmF5LCBjbG9uZSxcblx0XHR0YXJnZXQgPSBhcmd1bWVudHNbMF0sXG5cdFx0aSA9IDEsXG5cdFx0bGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aCxcblx0XHRkZWVwID0gZmFsc2U7XG5cblx0Ly8gSGFuZGxlIGEgZGVlcCBjb3B5IHNpdHVhdGlvblxuXHRpZiAodHlwZW9mIHRhcmdldCA9PT0gJ2Jvb2xlYW4nKSB7XG5cdFx0ZGVlcCA9IHRhcmdldDtcblx0XHR0YXJnZXQgPSBhcmd1bWVudHNbMV0gfHwge307XG5cdFx0Ly8gc2tpcCB0aGUgYm9vbGVhbiBhbmQgdGhlIHRhcmdldFxuXHRcdGkgPSAyO1xuXHR9IGVsc2UgaWYgKCh0eXBlb2YgdGFyZ2V0ICE9PSAnb2JqZWN0JyAmJiB0eXBlb2YgdGFyZ2V0ICE9PSAnZnVuY3Rpb24nKSB8fCB0YXJnZXQgPT0gbnVsbCkge1xuXHRcdHRhcmdldCA9IHt9O1xuXHR9XG5cblx0Zm9yICg7IGkgPCBsZW5ndGg7ICsraSkge1xuXHRcdG9wdGlvbnMgPSBhcmd1bWVudHNbaV07XG5cdFx0Ly8gT25seSBkZWFsIHdpdGggbm9uLW51bGwvdW5kZWZpbmVkIHZhbHVlc1xuXHRcdGlmIChvcHRpb25zICE9IG51bGwpIHtcblx0XHRcdC8vIEV4dGVuZCB0aGUgYmFzZSBvYmplY3Rcblx0XHRcdGZvciAobmFtZSBpbiBvcHRpb25zKSB7XG5cdFx0XHRcdHNyYyA9IHRhcmdldFtuYW1lXTtcblx0XHRcdFx0Y29weSA9IG9wdGlvbnNbbmFtZV07XG5cblx0XHRcdFx0Ly8gUHJldmVudCBuZXZlci1lbmRpbmcgbG9vcFxuXHRcdFx0XHRpZiAodGFyZ2V0ID09PSBjb3B5KSB7XG5cdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBSZWN1cnNlIGlmIHdlJ3JlIG1lcmdpbmcgcGxhaW4gb2JqZWN0cyBvciBhcnJheXNcblx0XHRcdFx0aWYgKGRlZXAgJiYgY29weSAmJiAoaXNQbGFpbk9iamVjdChjb3B5KSB8fCAoY29weUlzQXJyYXkgPSBBcnJheS5pc0FycmF5KGNvcHkpKSkpIHtcblx0XHRcdFx0XHRpZiAoY29weUlzQXJyYXkpIHtcblx0XHRcdFx0XHRcdGNvcHlJc0FycmF5ID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRjbG9uZSA9IHNyYyAmJiBBcnJheS5pc0FycmF5KHNyYykgPyBzcmMgOiBbXTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0Y2xvbmUgPSBzcmMgJiYgaXNQbGFpbk9iamVjdChzcmMpID8gc3JjIDoge307XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0Ly8gTmV2ZXIgbW92ZSBvcmlnaW5hbCBvYmplY3RzLCBjbG9uZSB0aGVtXG5cdFx0XHRcdFx0dGFyZ2V0W25hbWVdID0gZXh0ZW5kKGRlZXAsIGNsb25lLCBjb3B5KTtcblxuXHRcdFx0XHQvLyBEb24ndCBicmluZyBpbiB1bmRlZmluZWQgdmFsdWVzXG5cdFx0XHRcdH0gZWxzZSBpZiAoY29weSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0dGFyZ2V0W25hbWVdID0gY29weTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdC8vIFJldHVybiB0aGUgbW9kaWZpZWQgb2JqZWN0XG5cdHJldHVybiB0YXJnZXQ7XG59O1xuXG4iLCJcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCAnZXZlbnRlbWl0dGVyMicgKS5FdmVudEVtaXR0ZXIyO1xuXG5tb2R1bGUuZXhwb3J0cy5ZbWlyID0gWW1pcjtcblxuZnVuY3Rpb24gWW1pciggb3B0aW9ucyApIHsgXG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICBFdmVudEVtaXR0ZXIuY2FsbCggdGhpcyApO1xuICAgIHRoaXMudmlld3MgPSB7fTtcbiAgICB0aGlzLmxpc3QgPSBvcHRpb25zLmxpc3RFbCB8fCBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCBvcHRpb25zLmxpc3RUYWdOYW1lIHx8ICduYXYnICk7XG4gICAgdGhpcy5lbCA9IG9wdGlvbnMuZWwgfHwgZG9jdW1lbnQuY3JlYXRlRWxlbWVudCggb3B0aW9ucy50YWdOYW1lICB8fCAnZGl2JyApO1xuICAgIHRoaXMuZWwuY2xhc3NOYW1lID0gb3B0aW9ucy5jbGFzc05hbWU7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICB0aGlzLm9wdGlvbnMuc2hvd0NsYXNzID0gb3B0aW9ucy5zaG93Q2xhc3MgfHwgJ3Nob3cnO1xuICAgIHRoaXMuX2lzRHluYW1pYyA9IG9wdGlvbnMuZHluYW1pYyA9PT0gZmFsc2UgPyBmYWxzZSA6IHRydWU7XG59XG5cblltaXIucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZSggRXZlbnRFbWl0dGVyLnByb3RvdHlwZSwge1xuICAgIHZpZXdMaXN0OiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oICkge1xuICAgICAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKCB0aGlzLnZpZXdzICkubWFwKCB0aGlzLl9tYXBWaWV3cy5iaW5kKCB0aGlzICkgKTtcbiAgICAgICAgfVxuICAgIH1cbn0gKTtcblxuWW1pci5wcm90b3R5cGUuYWRkVmlldyA9IGZ1bmN0aW9uKCB2aWV3ICkge1xuICAgIHZhciBpc1ZpZXcgPSBZbWlyLmlzVmlldyggdmlldyApO1xuICAgIGlmICggIWlzVmlldyApe1xuICAgICAgICB0aGlzLmVtaXQoICdlcnJvcicsIG5ldyBFcnJvciggJ0lzc3VlIGFkZGluZyB2aWV3OiBpbnZhbGlkIHZpZXcnICkgKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBpZiAoIHRoaXMudmlld3NbIHZpZXcuaWQgXSApIHtcbiAgICAgICAgdGhpcy5lbWl0KCAnZXJyb3InLCBuZXcgRXJyb3IoICdJc3N1ZSBhZGRpbmcgdmlldyB3aXRoIHRoZSBpZCAnICsgdmlldy5pZCArICc6IGR1cGxpY2F0ZSBpZCcgKSApO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSBcbiAgICBpZiAoIHRoaXMuX2lzRHluYW1pYyApIHtcbiAgICAgICAgdGhpcy5lbC5hcHBlbmRDaGlsZCggdmlldy5lbCApO1xuICAgICAgICBpZiAoIHZpZXcubGlua3RvICE9PSBmYWxzZSApIHtcbiAgICAgICAgICAgIHRoaXMuX2FwcGVuZFRvTGlzdCggdmlldyApO1xuICAgICAgICB9XG4gICAgfVxuICAgIHRoaXMudmlld3NbIHZpZXcuaWQgXSA9IHZpZXc7XG4gICAgaWYgKCB2aWV3LmVsLmNsYXNzTGlzdC5jb250YWlucyggdGhpcy5vcHRpb25zLnNob3dDbGFzcyApICkge1xuICAgICAgICB2aWV3LmlzU2hvd24gPSBmYWxzZTtcbiAgICAgICAgdmlldy5lbC5jbGFzc0xpc3QucmVtb3ZlKCB0aGlzLm9wdGlvbnMuc2hvd0NsYXNzICk7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufTtcblxuWW1pci5wcm90b3R5cGUucmVtb3ZlVmlldyA9IGZ1bmN0aW9uKCBpZCApIHtcbiAgICB2YXIgdmlldyA9IHRoaXMudmlld3NbIGlkIF0sXG4gICAgICAgIGxpbms7XG5cbiAgICBpZiAoICF2aWV3ICkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmICggdGhpcy5faXNEeW5hbWljICkge1xuICAgICAgICB0aGlzLmVsLnJlbW92ZUNoaWxkKCB2aWV3LmVsICk7XG4gICAgICAgIGlmICggdmlldy5saW5rdG8gIT09IGZhbHNlICkge1xuICAgICAgICAgICAgbGluayA9IHRoaXMubGlzdC5xdWVyeVNlbGVjdG9yKCAnW2RhdGEtbGlua3RvPScgKyB2aWV3LmlkICsgJ10nICk7XG4gICAgICAgICAgICB0aGlzLmxpc3QucmVtb3ZlQ2hpbGQoIGxpbmsgKTsgICAgICAgIFxuICAgICAgICB9XG4gICAgfVxuICAgIGRlbGV0ZSB0aGlzLnZpZXdzWyBpZCBdO1xuICAgIHJldHVybiB0cnVlO1xufTtcblxuWW1pci5wcm90b3R5cGUub3BlbiA9IGZ1bmN0aW9uKCBpZCApIHtcbiAgICB2YXIgdmlldztcbiAgICBpZiAoIGlkICYmIHRoaXMudmlld3NbIGlkIF0gKSB7XG4gICAgICAgIHZpZXcgPSB0aGlzLnZpZXdzWyBpZCBdO1xuICAgICAgICBpZiAoIHZpZXcuaXNTaG93biApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2aWV3LmlzU2hvd24gPSB0cnVlO1xuICAgICAgICB2aWV3LmVsLmNsYXNzTGlzdC5hZGQoIHRoaXMub3B0aW9ucy5zaG93Q2xhc3MgKTtcbiAgICAgICAgdGhpcy5fY2xvc2VWaWV3cyggaWQgKTtcbiAgICB9XG59O1xuXG5ZbWlyLnByb3RvdHlwZS5fY2xvc2VWaWV3cyA9IGZ1bmN0aW9uKCBpZCApIHtcbiAgICAgIFxuICAgIHZhciBzaG93Q2xhc3MgPSB0aGlzLm9wdGlvbnMuc2hvd0NsYXNzIHx8ICdzaG93JztcbiAgICBmdW5jdGlvbiBlYWNoVmlldyggdmlldyApIHtcbiAgICAgICAgaWYgKCB2aWV3LmlzU2hvd24gJiYgdmlldy5pZCAhPT0gaWQgKSB7XG4gICAgICAgICAgICB2aWV3LmVsLmNsYXNzTGlzdC5yZW1vdmUoIHNob3dDbGFzcyApO1xuICAgICAgICAgICAgdmlldy5pc1Nob3duID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLnZpZXdMaXN0LmZvckVhY2goIGVhY2hWaWV3ICk7ICBcbn07XG5cblltaXIucHJvdG90eXBlLl9tYXBWaWV3cyA9IGZ1bmN0aW9uKCB2aWV3TmFtZSApIHtcbiAgICByZXR1cm4gdGhpcy52aWV3c1sgdmlld05hbWUgXTtcbn07XG5cblltaXIucHJvdG90eXBlLl9hcHBlbmRUb0xpc3QgPSBmdW5jdGlvbiggdmlldyApIHtcbiAgICB2YXIgZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCB0aGlzLm9wdGlvbnMubGlzdEl0ZW1UYWdOYW1lIHx8ICdkaXYnICk7XG4gICAgZWwuaW5uZXJIVE1MID0gdmlldy5pZDtcbiAgICBlbC5zZXRBdHRyaWJ1dGUoICdkYXRhLWxpbmt0bycsIHZpZXcuaWQgKTtcbiAgICBlbC5hZGRFdmVudExpc3RlbmVyKCAnY2xpY2snLCB0aGlzLm9wZW4uYmluZCggdGhpcywgdmlldy5pZCApICk7IFxuICAgIHRoaXMubGlzdC5hcHBlbmRDaGlsZCggZWwgKTtcbn07XG5cblltaXIuaXNWaWV3ID0gZnVuY3Rpb24oIHZpZXcgKSB7XG4gICAgcmV0dXJuIHZpZXcgJiYgXG4gICAgICAgIHR5cGVvZiB2aWV3ID09PSAnb2JqZWN0JyAmJiBcbiAgICAgICAgdHlwZW9mIHZpZXcuZWwgPT09ICdvYmplY3QnICYmIFxuICAgICAgICB2aWV3LmVsLnRhZ05hbWUgJiZcbiAgICAgICAgdmlldy5pZDsgLy8gdGVzdCBhbGwgcmVxdWlyZW1lbnRzIG9mIGEgdmlld1xufTtcbiIsIi8qXG4gKiBTaWRlYmFyIFZpZXdcbiAqL1xuXG4vKiBnbG9iYWwgcmVxdWlyZSwgbW9kdWxlICovXG4vKiBqc2hpbnQgLVcwOTcgKi9cbid1c2Ugc3RyaWN0JztcblxudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoICdldmVudGVtaXR0ZXIyJyApLkV2ZW50RW1pdHRlcjIsXG4gICAgZXh0ZW5kID0gcmVxdWlyZSggJ2V4dGVuZCcgKTtcblxubW9kdWxlLmV4cG9ydHMgPSBTaWRlYmFyVmlldztcblxudmFyIGRlZmF1bHRzID0ge1xuICAgIGF1dG9mb2N1czogdHJ1ZSxcbiAgICBiYWNrOiB0cnVlXG59O1xuXG5mdW5jdGlvbiBTaWRlYmFyVmlldyggdGVtcGxhdGUsIG9wdGlvbnMgKSB7XG4gICAgaWYgKCAhdGVtcGxhdGUgKSB7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgRXZlbnRFbWl0dGVyLmNhbGwoIHRoaXMgKTtcbiAgICB0aGlzLl9iZWhhdmlvcnMgPSB7fTtcbiAgICB0aGlzLl90ZW1wbGF0ZSA9ICcnICsgdGVtcGxhdGU7XG4gICAgdGhpcy5pZCA9IG9wdGlvbnMudGl0bGU7XG4gICAgdGhpcy5lbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoICdkaXYnICk7XG4gICAgdGhpcy5lbC5jbGFzc0xpc3QuYWRkKCAnc2lkZWJhci12aWV3JyApO1xuICAgIHRoaXMuZWwuc2V0QXR0cmlidXRlKCAnZGF0YS12aWV3LWlkJywgdGhpcy5pZCApO1xuICAgIHRoaXMuX2F0dGFjaExpc3RlbmVycygpO1xuICAgIHRoaXMuc2V0T3B0aW9ucyggb3B0aW9ucyApO1xuICAgIHRoaXMuc2V0Q29udGVudCggb3B0aW9ucy5kYXRhLCB0aGlzLmVtaXQuYmluZCggdGhpcywgJ3JlYWR5JywgdGhpcyApICk7XG59XG5cblNpZGViYXJWaWV3LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoIEV2ZW50RW1pdHRlci5wcm90b3R5cGUsIHtcbiAgICBpc1Nob3duOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oICkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2lzU2hvd247IFxuICAgICAgICB9LFxuICAgICAgICBzZXQ6IGZ1bmN0aW9uKCB2YWx1ZSApIHsgXG4gICAgICAgICAgICBpZiAoIHZhbHVlICkge1xuICAgICAgICAgICAgICAgIHRoaXMuZW1pdCggJ29wZW46c2hvd24nICk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLl9pc1Nob3duID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICB9XG59ICk7XG5cblNpZGViYXJWaWV3LnByb3RvdHlwZS5zZXRDdXJyZW50ID1cbiAgICBTaWRlYmFyVmlldy5wcm90b3R5cGUub3BlbiA9IGZ1bmN0aW9uKCBlICkge1xuICAgICAgICB0aGlzLmVtaXQoICdvcGVuJywgdGhpcywgZSApO1xuICAgICAgICB0aGlzLm9uY2UoICdhbmltYXRpb246Y29tcGxldGUnLCB0aGlzLm9uQW5pbWF0aW9uQ29tcGxldGUuYmluZCggdGhpcyApKTtcbn07XG5cblNpZGViYXJWaWV3LnByb3RvdHlwZS5vbkFuaW1hdGlvbkNvbXBsZXRlID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKCB0aGlzLm9wdGlvbnMuYXV0b2ZvY3VzICkge1xuICAgICAgICB2YXIgZWwgPSB0aGlzLmVsLnF1ZXJ5U2VsZWN0b3IoICd0ZXh0YXJlYSwgaW5wdXQnICk7XG4gICAgICAgIGlmKCBlbCApe1xuICAgICAgICAgICAgZWwuZm9jdXMoKTtcbiAgICAgICAgICAgIGVsLnNlbGVjdCgpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuU2lkZWJhclZpZXcucHJvdG90eXBlLm9uUmVuZGVyZWQgPSBmdW5jdGlvbiggY2FsbGJhY2sgKSB7XG4gICAgaWYgKCBjYWxsYmFjayApIHtcbiAgICAgICAgY2FsbGJhY2soKTtcbiAgICB9XG4gICAgdGhpcy5lbWl0KCAncmVuZGVyZWQnLCB0aGlzICk7XG4gICAgdGhpcy5nZXRUYWJhYmxlRWxzKCk7XG59O1xuXG5TaWRlYmFyVmlldy5wcm90b3R5cGUuZ2V0VGFiYWJsZUVscyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBsYXN0LFxuICAgICAgICBmaXJzdDtcbiAgICB0aGlzLnRhYmFsZXMgPSB0aGlzLmVsLnF1ZXJ5U2VsZWN0b3JBbGwoICdpbnB1dCwgdGV4dGFyZWEnICk7XG4gICAgdGhpcy50YWJhbGVzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoIHRoaXMudGFiYWxlcywgMCApO1xuICAgIHRoaXMudGFiYWxlcy5mb3JFYWNoKCBmdW5jdGlvbiggdGFiYWJsZSwgaW5kZXggKSB7XG4gICAgICAgIGlmICggaW5kZXggPT09IDAgKSB7XG4gICAgICAgICAgICBmaXJzdCA9IHRhYmFibGU7XG4gICAgICAgIH1cbiAgICAgICAgdGFiYWJsZS5zZXRBdHRyaWJ1dGUoICd0YWItaW5kZXgnLCBpbmRleCApO1xuICAgICAgICBsYXN0ID0gdGFiYWJsZTtcbiAgICB9ICk7XG4gICAgaWYgKCAhbGFzdCApIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBsYXN0LmFkZEV2ZW50TGlzdGVuZXIoICdrZXlkb3duJywgZnVuY3Rpb24oIGUgKSB7XG4gICAgICAgIHZhciBrZXlDb2RlID0gZS5rZXlDb2RlIHx8IGUud2hpY2g7XG4gICAgICAgIGlmICgga2V5Q29kZSA9PT0gOSApIHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGZpcnN0LmZvY3VzKCk7XG4gICAgICAgIH1cbiAgICB9ICk7XG59O1xuXG5TaWRlYmFyVmlldy5wcm90b3R5cGUuc2V0Q29udGVudCA9IGZ1bmN0aW9uKCBkYXRhLCBjYWxsYmFjayApIHtcbiAgICBpZiAoIHR5cGVvZiBkYXRhID09PSAnZnVuY3Rpb24nICkge1xuICAgICAgICBjYWxsYmFjayA9IGRhdGE7XG4gICAgfVxuICAgIGNhbGxiYWNrID0gY2FsbGJhY2sgfHwgZnVuY3Rpb24oKSB7fTtcbiAgICBpZiAoIHR5cGVvZiB0aGlzLnJlbmRlciA9PT0gJ2Z1bmN0aW9uJyApIHtcbiAgICAgICAgdGhpcy5fZGF0YSA9IGRhdGE7XG4gICAgICAgIHRoaXMucmVuZGVyKCB0aGlzLl90ZW1wbGF0ZSwgZGF0YSB8fCB7fSwgZnVuY3Rpb24oIGVyciwgaHRtbCApIHtcbiAgICAgICAgICAgIGlmICggZXJyICkgcmV0dXJuIHRoaXMuZW1pdCggJ2Vycm9yJywgZXJyLCB0aGlzICk7XG4gICAgICAgICAgICB0aGlzLmVsLmlubmVySFRNTCA9IGh0bWw7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCB0aGlzLm9uUmVuZGVyZWQuYmluZCggdGhpcywgY2FsbGJhY2sgKSwgMCApO1xuICAgICAgICB9LmJpbmQoIHRoaXMgKSApO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgdGhpcy5lbC5pbm5lckhUTUwgPSB0aGlzLl90ZW1wbGF0ZTtcbiAgICBzZXRUaW1lb3V0KCB0aGlzLm9uUmVuZGVyZWQuYmluZCggdGhpcywgY2FsbGJhY2sgKSwgMCApO1xufTtcblxuU2lkZWJhclZpZXcucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24oIGUgKSB7XG4gICAgdGhpcy5lbC5jbGFzc0xpc3QucmVtb3ZlKCAnc2hvdycgKTtcbiAgICB0aGlzLmVsLmlzT3BlbiA9IGZhbHNlO1xuICAgIHRoaXMuZW1pdCggJ2Nsb3NlJywgdGhpcywgZSApO1xufTtcblxuU2lkZWJhclZpZXcucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIHRoaXMgaGVscHMgY2xlYW4gdXAgc3RhdGVcbiAgICB0aGlzLmVtaXQoICdjbG9zZScsIHRoaXMgKTtcbiAgICB0aGlzLmVtaXQoICdyZW1vdmUnLCB0aGlzICk7XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoKTtcbn07XG5cblNpZGViYXJWaWV3LnByb3RvdHlwZS5pc1Zpc2libGUgPVxuICAgIFNpZGViYXJWaWV3LnByb3RvdHlwZS5pc0N1cnJlbnQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gdGhpcyBzaG91bGQgYmUgYWNjdXJhdGUgaW4gdGhlIGN1cnJlbnQgc3lzdGVtXG4gICAgICAgIC8vIG1heSBuZWVkIHRvIGdldCByZWZlcmFuY2UgdG8gX3N1cGVyXG4gICAgICAgIHJldHVybiB0aGlzLmVsLmNsYXNzTGlzdC5jb250YWlucyggJ3Nob3cnICk7XG59O1xuXG5TaWRlYmFyVmlldy5wcm90b3R5cGUuc2V0T3B0aW9ucyA9IGZ1bmN0aW9uKCBvcHRpb25zICkge1xuICAgIHZhciBlbHM7XG4gICAgdGhpcy5vcHRpb25zID0gZXh0ZW5kKCB0cnVlLCB7fSwgdGhpcy5vcHRpb25zIHx8IGRlZmF1bHRzLCBvcHRpb25zICk7XG4gICAgdGhpcy5zZXRQYXJlbnRWaWV3KCB0aGlzLm9wdGlvbnMucGFyZW50ICk7XG4gICAgdGhpcy5saW5rdG8gPSBvcHRpb25zLmxpbmt0bztcbn07XG5cblNpZGViYXJWaWV3LnByb3RvdHlwZS5zZXRQYXJlbnRWaWV3ID0gZnVuY3Rpb24oIHBhcmVudCApIHtcbiAgICB0aGlzLl9wYXJlbnRWaWV3ID0gcGFyZW50O1xufTtcblxuLy8gdGhpcyBpcyBmb3IgdGhlIGNzczMgYW5pbWF0aW9uc1xuU2lkZWJhclZpZXcucHJvdG90eXBlLl9hdHRhY2hMaXN0ZW5lcnMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgaGFuZGxlID0gdGhpcy5lbWl0LmJpbmQoIHRoaXMsICdhbmltYXRpb246Y29tcGxldGUnICk7XG4gICAgXG4gICAgdGhpcy5lbC5hZGRFdmVudExpc3RlbmVyKCAnd2Via2l0QW5pbWF0aW9uRW5kJywgaGFuZGxlLCBmYWxzZSApO1xuICAgIHRoaXMuZWwuYWRkRXZlbnRMaXN0ZW5lciggJ29BbmltYXRpb25FbmQnLCBoYW5kbGUsIGZhbHNlICk7XG4gICAgdGhpcy5lbC5hZGRFdmVudExpc3RlbmVyKCAnYW5pbWF0aW9uZW5kJywgaGFuZGxlLCBmYWxzZSApO1xuICAgIHRoaXMuZWwuYWRkRXZlbnRMaXN0ZW5lciggJ21zQW5pbWF0aW9uRW5kJywgaGFuZGxlLCBmYWxzZSApO1xufTtcbiJdfQ==
