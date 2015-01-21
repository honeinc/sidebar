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
    bound = require( 'node-bound' ),
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
        view = isReady ? template : null,
        listeners = {};

    if ( !view ) {
        view = new SidebarView( template, opts );
    }
    else {
        view.setOptions( opts );
    }

    if ( ( opts && opts.home ) || !this._homeView || view.options.home ) {
        this._homeView = view;
    }

    function addListeners( _view ) {
        listeners.open = [ '_onViewOpeningSecondary', _view ];
        listeners[ 'open:shown' ] = [ '_onViewOpening', _view ];
        listeners.rendered = '_onViewRendered';
    }

    addListeners( view ); 

    if ( isReady ) {
        this._onViewReady( callback, null, view );
    }
    else {
        listeners.ready = [ '_onViewReady', callback, null ];
        listeners.error = [ '_onViewReady', callback ];
    }
    bound( view, listeners, this );

    return view;
};

Sidebar.prototype.addListeners = function ( ) {
    bound( emit, {
        'sidebar.back': 'back',
        'sidebar.close': 'close',
        'sidebar.open': 'open',
        'sidebar.toggle': 'toggle'
    }, this );
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
        bound.off( view, {
            'open': '_onViewOpening'
        }, this );
        view.remove();
        this.emit( 'error', err );
        return;
    }
    // unbind any stale handlers
    bound.off( view, {
        'ready': '_onViewReady',
        'error': '_onViewReady'  
    }, this );
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

},{"./view":10,"emit-bindings":3,"eventemitter2":4,"node-bound":6,"ymir":9}],3:[function(require,module,exports){
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
/* jshint browser: true */
/* jshint node: true */

'use strict';

module.exports = _bound.bind( null, 'on', false );

function noop () {}
// here to store refs to bound functions
var _fns = {},
    md5 = require( 'blueimp-md5' ).md5,
    utils = require( './src/utils' );

var bindEvent = 
module.exports.bindEvent = function ( fn, eventName, handler, context, removeCache ) {
    if ( typeof handler !== 'function' ) {
        return;
    }
    var _id = md5( handler.toString() + JSON.stringify( utils.decycleObject( context ) ) );
    /* 
      this is to cache the function so it can be unbound from the event
      because fn.bind( ) create a new function, which mean fn === fn.bind() is false
    */
    if ( !_fns[ eventName ] ) {
        _fns[eventName] = {};
    }
    if ( !_fns[ eventName ][ _id ] ) {
        _fns[ eventName ][ _id ] = handler.bind.apply( handler, context );
    }
    handler = _fns[ eventName ][ _id ];

    fn( eventName, handler );
    // clear cache on unbind
    if ( removeCache ) {
        delete _fns[ eventName ][ _id ];
    }
};

var getMethod =
module.exports.getMethod = function ( handleName, context ) {
    if ( typeof context !== 'object' ) {
        return;
    }
    return typeof handleName === 'function' ? handleName : ( context || window )[ handleName ];
};

var eachEvent = 
module.exports.eachEvent = function ( fn, eventObj, context, removeCache ) {
    var event,
        eventHandle,
        bindTo;
    for ( var _event in eventObj ) {
        event = eventObj[ _event ];
        if ( Array.isArray( event ) ) {
            if ( typeof event[ 0 ] === 'object' && !context ) {
                bindTo = event[ 0 ];
                if ( typeof event[ 1 ]  === 'string' ) {
                    eventHandle = getMethod( event[ 1 ], bindTo );
                } else {
                    eventHandle = event[ 1 ];
                }
                bindTo = [ bindTo ];
            } else {
                eventHandle = getMethod( event.shift(), context );
                event.unshift( context );
                bindTo = event;
            }
        } else if ( typeof event === 'string' ) {
            eventHandle = getMethod( event, context );
        } else {
            eventHandle = event;
        }

        bindEvent( fn, _event, eventHandle, bindTo || [ context ], removeCache );
    }
};

module.exports.bind = 
module.exports.on =
module.exports.addEventListener =
module.exports.addListener = _bound.bind( null, 'on', false );

module.exports.unbind =
module.exports.off =
module.exports.removeEventListener =
module.exports.removeListener = _bound.bind( null, 'off', true );

module.exports.setMethod = function ( method, removeCache ) {
    return _bound.bind( null, method, removeCache );
};

function _bound( method, removeCache, emitter, eventObj, context  ) {
    
    var eventMethod = emitter ? emitter[ method ] : null;
    if ( !eventMethod && emitter ) {
        switch( method ) {
            case 'on':
                eventMethod = emitter.addEventListener || emitter.addListener;
                break;
            case 'off':
                eventMethod = emitter.removeEventListener || emitter.removeListener;
                break;
        }
    }
    
    if ( !eventMethod ) {
        throw new Error( 'Could not bind to method "' + method + '".' );
    }

    eventMethod = eventMethod.bind( emitter );
    eachEvent( eventMethod, eventObj, context, removeCache );
}

},{"./src/utils":8,"blueimp-md5":7}],7:[function(require,module,exports){
/*
 * JavaScript MD5 1.0.1
 * https://github.com/blueimp/JavaScript-MD5
 *
 * Copyright 2011, Sebastian Tschan
 * https://blueimp.net
 *
 * Licensed under the MIT license:
 * http://www.opensource.org/licenses/MIT
 * 
 * Based on
 * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
 * Digest Algorithm, as defined in RFC 1321.
 * Version 2.2 Copyright (C) Paul Johnston 1999 - 2009
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for more info.
 */

/*jslint bitwise: true */
/*global unescape, define */

(function ($) {
    'use strict';

    /*
    * Add integers, wrapping at 2^32. This uses 16-bit operations internally
    * to work around bugs in some JS interpreters.
    */
    function safe_add(x, y) {
        var lsw = (x & 0xFFFF) + (y & 0xFFFF),
            msw = (x >> 16) + (y >> 16) + (lsw >> 16);
        return (msw << 16) | (lsw & 0xFFFF);
    }

    /*
    * Bitwise rotate a 32-bit number to the left.
    */
    function bit_rol(num, cnt) {
        return (num << cnt) | (num >>> (32 - cnt));
    }

    /*
    * These functions implement the four basic operations the algorithm uses.
    */
    function md5_cmn(q, a, b, x, s, t) {
        return safe_add(bit_rol(safe_add(safe_add(a, q), safe_add(x, t)), s), b);
    }
    function md5_ff(a, b, c, d, x, s, t) {
        return md5_cmn((b & c) | ((~b) & d), a, b, x, s, t);
    }
    function md5_gg(a, b, c, d, x, s, t) {
        return md5_cmn((b & d) | (c & (~d)), a, b, x, s, t);
    }
    function md5_hh(a, b, c, d, x, s, t) {
        return md5_cmn(b ^ c ^ d, a, b, x, s, t);
    }
    function md5_ii(a, b, c, d, x, s, t) {
        return md5_cmn(c ^ (b | (~d)), a, b, x, s, t);
    }

    /*
    * Calculate the MD5 of an array of little-endian words, and a bit length.
    */
    function binl_md5(x, len) {
        /* append padding */
        x[len >> 5] |= 0x80 << (len % 32);
        x[(((len + 64) >>> 9) << 4) + 14] = len;

        var i, olda, oldb, oldc, oldd,
            a =  1732584193,
            b = -271733879,
            c = -1732584194,
            d =  271733878;

        for (i = 0; i < x.length; i += 16) {
            olda = a;
            oldb = b;
            oldc = c;
            oldd = d;

            a = md5_ff(a, b, c, d, x[i],       7, -680876936);
            d = md5_ff(d, a, b, c, x[i +  1], 12, -389564586);
            c = md5_ff(c, d, a, b, x[i +  2], 17,  606105819);
            b = md5_ff(b, c, d, a, x[i +  3], 22, -1044525330);
            a = md5_ff(a, b, c, d, x[i +  4],  7, -176418897);
            d = md5_ff(d, a, b, c, x[i +  5], 12,  1200080426);
            c = md5_ff(c, d, a, b, x[i +  6], 17, -1473231341);
            b = md5_ff(b, c, d, a, x[i +  7], 22, -45705983);
            a = md5_ff(a, b, c, d, x[i +  8],  7,  1770035416);
            d = md5_ff(d, a, b, c, x[i +  9], 12, -1958414417);
            c = md5_ff(c, d, a, b, x[i + 10], 17, -42063);
            b = md5_ff(b, c, d, a, x[i + 11], 22, -1990404162);
            a = md5_ff(a, b, c, d, x[i + 12],  7,  1804603682);
            d = md5_ff(d, a, b, c, x[i + 13], 12, -40341101);
            c = md5_ff(c, d, a, b, x[i + 14], 17, -1502002290);
            b = md5_ff(b, c, d, a, x[i + 15], 22,  1236535329);

            a = md5_gg(a, b, c, d, x[i +  1],  5, -165796510);
            d = md5_gg(d, a, b, c, x[i +  6],  9, -1069501632);
            c = md5_gg(c, d, a, b, x[i + 11], 14,  643717713);
            b = md5_gg(b, c, d, a, x[i],      20, -373897302);
            a = md5_gg(a, b, c, d, x[i +  5],  5, -701558691);
            d = md5_gg(d, a, b, c, x[i + 10],  9,  38016083);
            c = md5_gg(c, d, a, b, x[i + 15], 14, -660478335);
            b = md5_gg(b, c, d, a, x[i +  4], 20, -405537848);
            a = md5_gg(a, b, c, d, x[i +  9],  5,  568446438);
            d = md5_gg(d, a, b, c, x[i + 14],  9, -1019803690);
            c = md5_gg(c, d, a, b, x[i +  3], 14, -187363961);
            b = md5_gg(b, c, d, a, x[i +  8], 20,  1163531501);
            a = md5_gg(a, b, c, d, x[i + 13],  5, -1444681467);
            d = md5_gg(d, a, b, c, x[i +  2],  9, -51403784);
            c = md5_gg(c, d, a, b, x[i +  7], 14,  1735328473);
            b = md5_gg(b, c, d, a, x[i + 12], 20, -1926607734);

            a = md5_hh(a, b, c, d, x[i +  5],  4, -378558);
            d = md5_hh(d, a, b, c, x[i +  8], 11, -2022574463);
            c = md5_hh(c, d, a, b, x[i + 11], 16,  1839030562);
            b = md5_hh(b, c, d, a, x[i + 14], 23, -35309556);
            a = md5_hh(a, b, c, d, x[i +  1],  4, -1530992060);
            d = md5_hh(d, a, b, c, x[i +  4], 11,  1272893353);
            c = md5_hh(c, d, a, b, x[i +  7], 16, -155497632);
            b = md5_hh(b, c, d, a, x[i + 10], 23, -1094730640);
            a = md5_hh(a, b, c, d, x[i + 13],  4,  681279174);
            d = md5_hh(d, a, b, c, x[i],      11, -358537222);
            c = md5_hh(c, d, a, b, x[i +  3], 16, -722521979);
            b = md5_hh(b, c, d, a, x[i +  6], 23,  76029189);
            a = md5_hh(a, b, c, d, x[i +  9],  4, -640364487);
            d = md5_hh(d, a, b, c, x[i + 12], 11, -421815835);
            c = md5_hh(c, d, a, b, x[i + 15], 16,  530742520);
            b = md5_hh(b, c, d, a, x[i +  2], 23, -995338651);

            a = md5_ii(a, b, c, d, x[i],       6, -198630844);
            d = md5_ii(d, a, b, c, x[i +  7], 10,  1126891415);
            c = md5_ii(c, d, a, b, x[i + 14], 15, -1416354905);
            b = md5_ii(b, c, d, a, x[i +  5], 21, -57434055);
            a = md5_ii(a, b, c, d, x[i + 12],  6,  1700485571);
            d = md5_ii(d, a, b, c, x[i +  3], 10, -1894986606);
            c = md5_ii(c, d, a, b, x[i + 10], 15, -1051523);
            b = md5_ii(b, c, d, a, x[i +  1], 21, -2054922799);
            a = md5_ii(a, b, c, d, x[i +  8],  6,  1873313359);
            d = md5_ii(d, a, b, c, x[i + 15], 10, -30611744);
            c = md5_ii(c, d, a, b, x[i +  6], 15, -1560198380);
            b = md5_ii(b, c, d, a, x[i + 13], 21,  1309151649);
            a = md5_ii(a, b, c, d, x[i +  4],  6, -145523070);
            d = md5_ii(d, a, b, c, x[i + 11], 10, -1120210379);
            c = md5_ii(c, d, a, b, x[i +  2], 15,  718787259);
            b = md5_ii(b, c, d, a, x[i +  9], 21, -343485551);

            a = safe_add(a, olda);
            b = safe_add(b, oldb);
            c = safe_add(c, oldc);
            d = safe_add(d, oldd);
        }
        return [a, b, c, d];
    }

    /*
    * Convert an array of little-endian words to a string
    */
    function binl2rstr(input) {
        var i,
            output = '';
        for (i = 0; i < input.length * 32; i += 8) {
            output += String.fromCharCode((input[i >> 5] >>> (i % 32)) & 0xFF);
        }
        return output;
    }

    /*
    * Convert a raw string to an array of little-endian words
    * Characters >255 have their high-byte silently ignored.
    */
    function rstr2binl(input) {
        var i,
            output = [];
        output[(input.length >> 2) - 1] = undefined;
        for (i = 0; i < output.length; i += 1) {
            output[i] = 0;
        }
        for (i = 0; i < input.length * 8; i += 8) {
            output[i >> 5] |= (input.charCodeAt(i / 8) & 0xFF) << (i % 32);
        }
        return output;
    }

    /*
    * Calculate the MD5 of a raw string
    */
    function rstr_md5(s) {
        return binl2rstr(binl_md5(rstr2binl(s), s.length * 8));
    }

    /*
    * Calculate the HMAC-MD5, of a key and some data (raw strings)
    */
    function rstr_hmac_md5(key, data) {
        var i,
            bkey = rstr2binl(key),
            ipad = [],
            opad = [],
            hash;
        ipad[15] = opad[15] = undefined;
        if (bkey.length > 16) {
            bkey = binl_md5(bkey, key.length * 8);
        }
        for (i = 0; i < 16; i += 1) {
            ipad[i] = bkey[i] ^ 0x36363636;
            opad[i] = bkey[i] ^ 0x5C5C5C5C;
        }
        hash = binl_md5(ipad.concat(rstr2binl(data)), 512 + data.length * 8);
        return binl2rstr(binl_md5(opad.concat(hash), 512 + 128));
    }

    /*
    * Convert a raw string to a hex string
    */
    function rstr2hex(input) {
        var hex_tab = '0123456789abcdef',
            output = '',
            x,
            i;
        for (i = 0; i < input.length; i += 1) {
            x = input.charCodeAt(i);
            output += hex_tab.charAt((x >>> 4) & 0x0F) +
                hex_tab.charAt(x & 0x0F);
        }
        return output;
    }

    /*
    * Encode a string as utf-8
    */
    function str2rstr_utf8(input) {
        return unescape(encodeURIComponent(input));
    }

    /*
    * Take string arguments and return either raw or hex encoded strings
    */
    function raw_md5(s) {
        return rstr_md5(str2rstr_utf8(s));
    }
    function hex_md5(s) {
        return rstr2hex(raw_md5(s));
    }
    function raw_hmac_md5(k, d) {
        return rstr_hmac_md5(str2rstr_utf8(k), str2rstr_utf8(d));
    }
    function hex_hmac_md5(k, d) {
        return rstr2hex(raw_hmac_md5(k, d));
    }

    function md5(string, key, raw) {
        if (!key) {
            if (!raw) {
                return hex_md5(string);
            }
            return raw_md5(string);
        }
        if (!raw) {
            return hex_hmac_md5(key, string);
        }
        return raw_hmac_md5(key, string);
    }

    if (typeof define === 'function' && define.amd) {
        define(function () {
            return md5;
        });
    } else {
        $.md5 = md5;
    }
}(this));

},{}],8:[function(require,module,exports){


module.exports.decycleObject = function (object) {
    'use strict';

// Make a deep copy of an object or array, assuring that there is at most
// one instance of each object or array in the resulting structure. The
// duplicate references (which might be forming cycles) are replaced with
// an object of the form
//      {$ref: PATH}
// where the PATH is a JSONPath string that locates the first occurance.
// So,
//      var a = [];
//      a[0] = a;
//      return JSON.stringify(JSON.decycle(a));
// produces the string '[{"$ref":"$"}]'.

// JSONPath is used to locate the unique object. $ indicates the top level of
// the object or array. [NUMBER] or [STRING] indicates a child member or
// property.

    var objects = [],   // Keep a reference to each unique object or array
        paths = [];     // Keep the path to each unique object or array

    return (function derez(value, path) {

// The derez recurses through the object, producing the deep copy.

        var i,          // The loop counter
            name,       // Property name
            nu;         // The new object or array

// typeof null === 'object', so go on if this value is really an object but not
// one of the weird builtin objects.

        if (typeof value === 'object' && value !== null &&
                !(value instanceof Boolean) &&
                !(value instanceof Date)    &&
                !(value instanceof Number)  &&
                !(value instanceof RegExp)  &&
                !(value instanceof String)) {

// If the value is an object or array, look to see if we have already
// encountered it. If so, return a $ref/path object. This is a hard way,
// linear search that will get slower as the number of unique objects grows.
            if ( value.tagName ) {
                return {$el: value.tagName + '#' + value.id + '.' + value.className};
            }

            for (i = 0; i < objects.length; i += 1) {
                if (objects[i] === value) {
                    return {$ref: paths[i]};
                }
            }

// Otherwise, accumulate the unique value and its path.

            objects.push(value);
            paths.push(path);

// If it is an array, replicate the array.

            if (Object.prototype.toString.apply(value) === '[object Array]') {
                nu = [];
                for (i = 0; i < value.length; i += 1) {
                    nu[i] = derez(value[i], path + '[' + i + ']');
                }
            } else {

// If it is an object, replicate the object.

                nu = {};
                for (name in value) {
                    if (Object.prototype.hasOwnProperty.call(value, name)) {
                        nu[name] = derez(value[name],
                            path + '[' + JSON.stringify(name) + ']');
                    }
                }
            }
            return nu;
        }
        return value;
    }(object, '$'));
};

},{}],9:[function(require,module,exports){

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

},{"eventemitter2":4}],10:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJleGFtcGxlcy9pbmRleC5qcyIsImluZGV4LmpzIiwibm9kZV9tb2R1bGVzL2VtaXQtYmluZGluZ3MvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZXZlbnRlbWl0dGVyMi9saWIvZXZlbnRlbWl0dGVyMi5qcyIsIm5vZGVfbW9kdWxlcy9leHRlbmQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbm9kZS1ib3VuZC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9ub2RlLWJvdW5kL25vZGVfbW9kdWxlcy9ibHVlaW1wLW1kNS9qcy9tZDUuanMiLCJub2RlX21vZHVsZXMvbm9kZS1ib3VuZC9zcmMvdXRpbHMuanMiLCJub2RlX21vZHVsZXMveW1pci9pbmRleC5qcyIsInZpZXcuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOVRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pVQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3akJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBzaWRlYmFyID0gbmV3IChyZXF1aXJlKCcuLicpKSxcbiAgICBlbWl0ID0gcmVxdWlyZSgnZW1pdC1iaW5kaW5ncycpO1xuc2lkZWJhci5pbml0KCk7XG5cbnZhciB2aWV3MWh0bWwgPSBcbic8dWw+JyArXG4gICAgJzxsaT4nICsgXG4gICAgICAgICdWaWV3IDEnICtcbiAgICAnPC9saT4nICtcbiAgICAnPGxpIGRhdGEtZW1pdD1cInNpZGViYXIuY2xvc2VcIj4nICsgXG4gICAgICAgICdIaWRlIHRoZSBzY3JvbGxiYXInICtcbiAgICAnPC9saT4nICtcbic8L3VsPic7XG52YXIgdmlldzJodG1sID0gXG4nPHVsPicgK1xuICAgICc8bGkgZGF0YS1lbWl0PVwib3Blbi52aWV3M1wiPicgKyBcbiAgICAgICAgJ0NoaWxkIFZpZXcgPicgK1xuICAgICc8L2xpPidcbic8L3VsPic7XG52YXIgdmlldzNodG1sID0gXG4nPHVsPicgK1xuICAgICc8bGkgZGF0YS1lbWl0PVwic2lkZWJhci5iYWNrXCI+JyArXG4gICAgICAgICdCYWNrJyArXG4gICAgJzwvbGk+JyArXG4nPC91bD4nO1xuXG5cbnZhciB2aWV3MSA9IHNpZGViYXIuYWRkVmlldyggdmlldzFodG1sLCB7XG4gICAgdGl0bGU6ICdIb21lJyxcbiAgICBob21lOiB0cnVlXG59KTtcbnZhciB2aWV3MiA9IHNpZGViYXIuYWRkVmlldyggdmlldzJodG1sLCB7XG4gICAgdGl0bGU6ICdTZWNvbmRhcnknLFxuICAgIGhvbWU6IHRydWVcbn0pO1xudmFyIHZpZXczID0gc2lkZWJhci5hZGRWaWV3KCB2aWV3M2h0bWwsIHtcbiAgICB0aXRsZTogJ0NoaWxkIENoaWxkJyxcbiAgICBob21lOiB0cnVlLFxuICAgIHBhcmVudDogdmlldzIsXG4gICAgbGlua3RvOiBmYWxzZVxufSk7XG5cbi8vIG9wZW5pbmcgdXAgdmlldyB3aGVuIGV2ZW50IGlzIGVtaXR0ZWRcbmVtaXQub24oICdvcGVuLnZpZXcyJywgdmlldzIub3Blbi5iaW5kKCB2aWV3MiApICk7XG5lbWl0Lm9uKCAnb3Blbi52aWV3MycsIHZpZXczLm9wZW4uYmluZCggdmlldzMgKSApO1xuc2lkZWJhci5vcGVuKCApOyIsIi8qXG4gKiBTaWRlYmFyIC0gTWFuYWdlcyBzaWRlYmFyICYgc2lkZWJhciB2aWV3c1xuICovXG4vKiBnbG9iYWwgRXZlbnQsIHJlcXVpcmUsIG1vZHVsZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSggJ2V2ZW50ZW1pdHRlcjInICkuRXZlbnRFbWl0dGVyMixcbiAgICBlbWl0ID0gcmVxdWlyZSggJ2VtaXQtYmluZGluZ3MnICksXG4gICAgWW1pciA9IHJlcXVpcmUoICd5bWlyJyApLlltaXIsXG4gICAgYm91bmQgPSByZXF1aXJlKCAnbm9kZS1ib3VuZCcgKSxcbiAgICBTaWRlYmFyVmlldyA9IHJlcXVpcmUoICcuL3ZpZXcnICk7XG5cbm1vZHVsZS5leHBvcnRzID0gU2lkZWJhcjtcbm1vZHVsZS5leHBvcnRzLlNpZGViYXJWaWV3ID0gU2lkZWJhclZpZXc7XG5cbmZ1bmN0aW9uIFNpZGViYXIoKSB7XG5cbiAgICBFdmVudEVtaXR0ZXIuY2FsbCggdGhpcyApO1xuXG4gICAgLy8gZG8gdmlldyBjaGVja1xuICAgIHRoaXMuZWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCAnW2RhdGEtc2lkZWJhcl0nICk7XG4gICAgdGhpcy5uYXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCAnbmF2JyApO1xuICAgIHRoaXMuX3RlYXJkb3duVmlld3MoKTtcbiAgICB0aGlzLl9ob21lVmlldyA9IG51bGw7XG4gICAgdGhpcy5fY3VycmVudFZpZXcgPSBudWxsO1xuICAgIHRoaXMuYWRkZWRDbGFzc2VzID0ge307XG5cbiAgICAvLyBzaWduaWZ5IGluaWFsaXphdGlvblxuICAgIGlmICggdGhpcy5lbCApIHtcbiAgICAgICAgdGhpcy5lbC5hcHBlbmRDaGlsZCggdGhpcy5uYXYgKTtcblxuICAgICAgICBpZiAoICF0aGlzLndyYXBwZXIgKSB7XG4gICAgICAgICAgICB0aGlzLndyYXBwZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCAnZGl2JyApO1xuICAgICAgICAgICAgdGhpcy5lbC5hcHBlbmRDaGlsZCggdGhpcy53cmFwcGVyICk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5lbC5jbGFzc0xpc3QuYWRkKCAnc2lkZWJhci1pbml0JyApO1xuICAgIH1cbiAgICB0aGlzLmFkZExpc3RlbmVycygpO1xufVxuXG5TaWRlYmFyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoIEV2ZW50RW1pdHRlci5wcm90b3R5cGUgKTtcblxuU2lkZWJhci5wcm90b3R5cGUuYWRkVmlldyA9IGZ1bmN0aW9uKCB0ZW1wbGF0ZSwgb3B0cywgY2FsbGJhY2sgKSB7XG4gICAgaWYgKCAhdGVtcGxhdGUgKSByZXR1cm4gbnVsbDtcblxuICAgIG9wdHMgPSBvcHRzIHx8IHt9O1xuICAgIG9wdHMubmF2ID0gdGhpcy5uYXY7XG5cbiAgICB2YXIgaXNSZWFkeSA9IHRoaXMuaXNTaWRlYmFyVmlldyggdGVtcGxhdGUgKSxcbiAgICAgICAgdmlldyA9IGlzUmVhZHkgPyB0ZW1wbGF0ZSA6IG51bGwsXG4gICAgICAgIGxpc3RlbmVycyA9IHt9O1xuXG4gICAgaWYgKCAhdmlldyApIHtcbiAgICAgICAgdmlldyA9IG5ldyBTaWRlYmFyVmlldyggdGVtcGxhdGUsIG9wdHMgKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHZpZXcuc2V0T3B0aW9ucyggb3B0cyApO1xuICAgIH1cblxuICAgIGlmICggKCBvcHRzICYmIG9wdHMuaG9tZSApIHx8ICF0aGlzLl9ob21lVmlldyB8fCB2aWV3Lm9wdGlvbnMuaG9tZSApIHtcbiAgICAgICAgdGhpcy5faG9tZVZpZXcgPSB2aWV3O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFkZExpc3RlbmVycyggX3ZpZXcgKSB7XG4gICAgICAgIGxpc3RlbmVycy5vcGVuID0gWyAnX29uVmlld09wZW5pbmdTZWNvbmRhcnknLCBfdmlldyBdO1xuICAgICAgICBsaXN0ZW5lcnNbICdvcGVuOnNob3duJyBdID0gWyAnX29uVmlld09wZW5pbmcnLCBfdmlldyBdO1xuICAgICAgICBsaXN0ZW5lcnMucmVuZGVyZWQgPSAnX29uVmlld1JlbmRlcmVkJztcbiAgICB9XG5cbiAgICBhZGRMaXN0ZW5lcnMoIHZpZXcgKTsgXG5cbiAgICBpZiAoIGlzUmVhZHkgKSB7XG4gICAgICAgIHRoaXMuX29uVmlld1JlYWR5KCBjYWxsYmFjaywgbnVsbCwgdmlldyApO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgbGlzdGVuZXJzLnJlYWR5ID0gWyAnX29uVmlld1JlYWR5JywgY2FsbGJhY2ssIG51bGwgXTtcbiAgICAgICAgbGlzdGVuZXJzLmVycm9yID0gWyAnX29uVmlld1JlYWR5JywgY2FsbGJhY2sgXTtcbiAgICB9XG4gICAgYm91bmQoIHZpZXcsIGxpc3RlbmVycywgdGhpcyApO1xuXG4gICAgcmV0dXJuIHZpZXc7XG59O1xuXG5TaWRlYmFyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcnMgPSBmdW5jdGlvbiAoICkge1xuICAgIGJvdW5kKCBlbWl0LCB7XG4gICAgICAgICdzaWRlYmFyLmJhY2snOiAnYmFjaycsXG4gICAgICAgICdzaWRlYmFyLmNsb3NlJzogJ2Nsb3NlJyxcbiAgICAgICAgJ3NpZGViYXIub3Blbic6ICdvcGVuJyxcbiAgICAgICAgJ3NpZGViYXIudG9nZ2xlJzogJ3RvZ2dsZSdcbiAgICB9LCB0aGlzICk7XG59O1xuXG5TaWRlYmFyLnByb3RvdHlwZS5yZW1vdmVWaWV3ID0gZnVuY3Rpb24oIHZpZXcgKSB7XG4gICAgdmFyIGlkID0gdHlwZW9mIHZpZXcgPT09ICdzdHJpbmcnID8gdmlldyA6ICB2aWV3LmlkO1xuICAgIHRoaXMudmlld01hbmFnZXIucmVtb3ZlVmlldyggaWQgKTtcbiAgICBcbiAgICAvLyBpZiByZW1vdmUgdmlldyBpcyBjdXJyZW50IGdvIHRvIGhvbWVcbiAgICBpZiAoIHRoaXMuX2N1cnJlbnRWaWV3LmlkID09PSB2aWV3LmlkICkge1xuICAgICAgICB0aGlzLmhvbWUoKTtcbiAgICB9XG59O1xuXG5TaWRlYmFyLnByb3RvdHlwZS5zZXRDdXJyZW50VmlldyA9IGZ1bmN0aW9uKCB2aWV3ICkge1xuICAgIHZhciBpZCA9IHZpZXcuaWQsXG4gICAgICAgIG9wZW5lZCA9IHRoaXMudmlld01hbmFnZXIub3BlbiggaWQgKTtcbiAgICBpZiAoIG9wZW5lZCApIHtcbiAgICAgICAgdGhpcy5fY3VycmVudFZpZXcgPSB2aWV3O1xuICAgIH1cbn07XG5cblNpZGViYXIucHJvdG90eXBlLmdldFZpZXcgPSBmdW5jdGlvbiggaWQgKSB7XG4gICAgcmV0dXJuIHRoaXMudmlld01hbmFnZXIudmlld3NbIGlkIF07XG59O1xuXG5TaWRlYmFyLnByb3RvdHlwZS5nZXRDdXJyZW50VmlldyA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9jdXJyZW50Vmlldztcbn07XG5cblNpZGViYXIucHJvdG90eXBlLmhvbWUgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAoICF0aGlzLmlzU2lkZWJhclZpZXcoIHRoaXMuX2hvbWVWaWV3ICkgKSByZXR1cm47XG4gICAgaWYgKCB0aGlzLl9jdXJyZW50Vmlldy5pZCA9PT0gdGhpcy5faG9tZVZpZXcuaWQgKSByZXR1cm47XG4gICAgdGhpcy52aWV3TWFuYWdlci5vcGVuKCB0aGlzLl9ob21lVmlldy5pZCApO1xufTtcblxuU2lkZWJhci5wcm90b3R5cGUuYmFjayA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIHNlZSBpZiBhIHByb3BlciBwYXJlbnQgdmlldyBpcyBzZXRcbiAgICB0aGlzLmVsLmNsYXNzTGlzdC5hZGQoICdiYWNrJyApO1xuICAgIGlmICggdGhpcy5pc1NpZGViYXJWaWV3KCB0aGlzLl9jdXJyZW50VmlldyApICYmIHRoaXMuX2N1cnJlbnRWaWV3Ll9wYXJlbnRWaWV3ICkge1xuICAgICAgICB2YXIgX3BhcmVudCA9IHRoaXMuX2N1cnJlbnRWaWV3Ll9wYXJlbnRWaWV3O1xuICAgICAgICBpZiAoIHRoaXMuaXNTaWRlYmFyVmlldyggX3BhcmVudCApICkge1xuICAgICAgICAgICAgcmV0dXJuIF9wYXJlbnQub3BlbigpO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8vIGlmIG5vdCBnbyB0byBob21lXG4gICAgdGhpcy5ob21lKCk7XG59O1xuXG5TaWRlYmFyLnByb3RvdHlwZS5vcGVuID0gZnVuY3Rpb24oIGRhdGEgKSB7XG4gICAgdGhpcy5zdGF0ZSA9IDE7XG4gICAgaWYgKCB0aGlzLmVsICkgdGhpcy5lbC5jbGFzc0xpc3QuYWRkKCAnc2hvdycgKTtcbiAgICBpZiAoIGRhdGEgaW5zdGFuY2VvZiBFdmVudCApIHtcbiAgICAgICAgZGF0YSA9IG51bGw7XG4gICAgfVxuICAgIHRoaXMuZW1pdCggJ29wZW4nLCBkYXRhICk7XG59O1xuXG5TaWRlYmFyLnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uKCBkYXRhICkge1xuICAgIHRoaXMuc3RhdGUgPSAwO1xuICAgIGlmICggdGhpcy5lbCApIHRoaXMuZWwuY2xhc3NMaXN0LnJlbW92ZSggJ3Nob3cnICk7XG4gICAgaWYgKCBkYXRhIGluc3RhbmNlb2YgRXZlbnQgKSB7XG4gICAgICAgIGRhdGEgPSBudWxsO1xuICAgIH1cbiAgICB0aGlzLmVtaXQoICdjbG9zZScsIGRhdGEgKTtcbn07XG5cblNpZGViYXIucHJvdG90eXBlLnRvZ2dsZSA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICggdGhpcy5zdGF0ZSApIHtcbiAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMub3BlbigpO1xufTtcblxuLy8gd2lkdGggaXMgb25seSB0ZW1wIHRpbGwgbmV4dCBvcGVuLlxuU2lkZWJhci5wcm90b3R5cGUuZXhwYW5kID0gZnVuY3Rpb24oIHdpZHRoICkge1xuICAgIGlmICggIXRoaXMuZWwgKSByZXR1cm47XG4gICAgdGhpcy5lbC5zdHlsZS53aWR0aCA9IHR5cGVvZiB3aWR0aCA9PT0gJ251bWJlcicgPyB3aWR0aCArICdweCcgOiB3aWR0aDtcbiAgICB0aGlzLmVtaXQoICdleHBhbmRlZCcsIHtcbiAgICAgICAgd2lkdGg6IHdpZHRoXG4gICAgfSApO1xufTtcblxuU2lkZWJhci5wcm90b3R5cGUuYWRkQ2xhc3MgPSBmdW5jdGlvbiggYyApIHtcbiAgICBpZiAoICF0aGlzLmVsICkgcmV0dXJuO1xuICAgIHRoaXMuZWwuY2xhc3NMaXN0LmFkZCggYyApO1xuICAgIHRoaXMuYWRkZWRDbGFzc2VzWyBjIF0gPSB0cnVlO1xuICAgIHRoaXMuZW1pdCggJ2NsYXNzQWRkZWQnLCBjICk7XG59O1xuXG5TaWRlYmFyLnByb3RvdHlwZS5yZW1vdmVDbGFzcyA9IGZ1bmN0aW9uKCBjICkge1xuICAgIGlmICggIXRoaXMuZWwgKSByZXR1cm47XG4gICAgdGhpcy5lbC5jbGFzc0xpc3QucmVtb3ZlKCBjICk7XG4gICAgZGVsZXRlIHRoaXMuYWRkZWRDbGFzc2VzWyBjIF07XG4gICAgdGhpcy5lbWl0KCAnY2xhc3NSZW1vdmVkJywgYyApO1xufTtcblxuU2lkZWJhci5wcm90b3R5cGUuaXNTaWRlYmFyVmlldyA9IGZ1bmN0aW9uKCB2aWV3ICkge1xuICAgIHJldHVybiAoIHR5cGVvZiB2aWV3ID09PSAnb2JqZWN0JyAmJiB2aWV3IGluc3RhbmNlb2YgU2lkZWJhclZpZXcgJiYgIXZpZXcuX3JlbW92ZWQgKTtcbn07XG5cblNpZGViYXIucHJvdG90eXBlLmlzT3BlbiA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnN0YXRlID8gdHJ1ZSA6IGZhbHNlO1xufTtcblxuU2lkZWJhci5wcm90b3R5cGUuX2FwcGVuZFZpZXcgPSBmdW5jdGlvbiggdmlldyApIHtcbiAgICBpZiAoIHRoaXMud3JhcHBlciApIHRoaXMud3JhcHBlci5hcHBlbmRDaGlsZCggdmlldy5lbCApO1xufTtcblxuU2lkZWJhci5wcm90b3R5cGUuX2hhbmRsZUFuaW1hdGlvbnMgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9jdXJyZW50Vmlldy5vbmNlKCAnYW5pbWF0aW9uOmNvbXBsZXRlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICggdGhpcy5fcHJldlZpZXcgKSB7XG4gICAgICAgICAgICB0aGlzLl9wcmV2Vmlldy5lbC5jbGFzc0xpc3QucmVtb3ZlKCAnc2lkZWJhci12aWV3LW91dCcgKTtcbiAgICAgICAgICAgIHRoaXMuX3ByZXZWaWV3ID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBzZXRUaW1lb3V0KCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHRoaXMuZWwuY2xhc3NMaXN0LnJlbW92ZSggJ2FuaW1hdGluZycgKTtcbiAgICAgICAgICAgIHRoaXMuZWwuY2xhc3NMaXN0LnJlbW92ZSggJ2FuaW1hdGluZy1zZWNvbmRhcnknICk7XG4gICAgICAgICAgICB0aGlzLmVsLmNsYXNzTGlzdC5yZW1vdmUoICdiYWNrJyApO1xuICAgICAgICB9LmJpbmQoIHRoaXMgKSwgNTAwKTtcbiAgICB9LmJpbmQoIHRoaXMgKSApO1xufTtcblxuU2lkZWJhci5wcm90b3R5cGUuX2NhY2hlVmlldyA9IGZ1bmN0aW9uKCB2aWV3ICkge1xuICAgIC8vIG5vIGRvdXBzXG4gICAgaWYgKCB0aGlzLnZpZXdNYW5hZ2VyLnZpZXdzWyB2aWV3LmlkIF0gKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgXG4gICAgdGhpcy52aWV3TWFuYWdlci5hZGRWaWV3KCB2aWV3ICk7XG5cbiAgICAvLyBpZiB0aGVyZSBpcyBubyBvdGhlciB2aWV3cyBhdXRvIG9wZW4uXG4gICAgaWYgKCAhdGhpcy5fY3VycmVudFZpZXcgKSB7XG4gICAgICAgIHRoaXMuX2N1cnJlbnRWaWV3ID0gdmlldztcbiAgICAgICAgdGhpcy52aWV3TWFuYWdlci5vcGVuKCB2aWV3LmlkICk7XG4gICAgfVxuXG4gICAgdGhpcy5lbWl0KCAndmlldy5hZGRlZCcsIHZpZXcgKTtcbiAgICByZXR1cm4gdmlldztcbn07XG5cblNpZGViYXIucHJvdG90eXBlLl90ZWFyZG93blZpZXdzID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKCAhdGhpcy52aWV3TWFuYWdlciB8fCAhdGhpcy52aWV3TWFuYWdlci52aWV3TGlzdC5sZW5ndGggKSByZXR1cm47XG4gICAgdGhpcy52aWV3TWFuYWdlci52aWV3TGlzdC5mb3JFYWNoKCBmdW5jdGlvbiggdmlldyApIHtcbiAgICAgICAgdGhpcy52aWV3TWFuYWdlci5yZW1vdmVWaWV3KCB2aWV3LmlkICk7XG4gICAgICAgIHRoaXMuZW1pdCggJ3ZpZXcucmVtb3ZlZCcsIHZpZXcgKTtcbiAgICB9LmJpbmQoIHRoaXMgKSApO1xufTtcblxuU2lkZWJhci5wcm90b3R5cGUuX29uVmlld09wZW5pbmcgPSBmdW5jdGlvbiggdmlldyApIHtcbiAgICBmb3IgKCB2YXIgYyBpbiB0aGlzLmFkZGVkQ2xhc3NlcyApIHtcbiAgICAgICAgdGhpcy5yZW1vdmVDbGFzcyggYyApO1xuICAgIH1cbiAgICB0aGlzLmVsLmNsYXNzTGlzdC5hZGQoICdhbmltYXRpbmcnICk7XG4gICAgdGhpcy5lbC5yZW1vdmVBdHRyaWJ1dGUoICdzdHlsZScgKTtcbiAgICBpZiAoICF0aGlzLl9jdXJyZW50VmlldyB8fCB2aWV3LmlkICE9PSB0aGlzLl9jdXJyZW50Vmlldy5pZCApIHtcblxuICAgICAgICAvLyBjbG9zZSBvbGQgdmlld1xuICAgICAgICB0aGlzLl9wcmV2VmlldyA9IHRoaXMuX2N1cnJlbnRWaWV3O1xuICAgICAgICBpZiAoIHRoaXMuX3ByZXZWaWV3ICkge1xuICAgICAgICAgICAgdGhpcy5fcHJldlZpZXcuY2xvc2UoKTtcbiAgICAgICAgICAgIHRoaXMuX3ByZXZWaWV3LmVsLmNsYXNzTGlzdC5hZGQoICdzaWRlYmFyLXZpZXctb3V0JyApO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2N1cnJlbnRWaWV3ID0gdmlldztcbiAgICB9XG4gICAgdGhpcy5faGFuZGxlQW5pbWF0aW9ucygpOyAvLyBtdXN0IGNvbWUgYWZ0ZXIgd2Ugc2V0IGEgX2N1cnJlbnRWaWV3XG4gICAgdGhpcy5zdGFydGVkID0gdHJ1ZTtcbiAgICAvLyBpbmRpY2F0ZSB0aGVyZSBpcyBhIHZpZXcgb3BlbmluZ1xuICAgIHRoaXMuZW1pdCggJ3ZpZXcub3BlbmVkJywgdmlldyApO1xuICAgIHRoaXMuZW1pdCggJ3ZpZXcub3BlbmVkLicgKyB2aWV3LmlkLCB2aWV3ICk7XG5cbn07XG5cblNpZGViYXIucHJvdG90eXBlLl9vblZpZXdPcGVuaW5nU2Vjb25kYXJ5ID0gZnVuY3Rpb24oIHZpZXcgKSB7XG4gICAgdGhpcy5lbC5jbGFzc0xpc3QuYWRkKCAnYW5pbWF0aW5nLXNlY29uZGFyeScgKTtcbiAgICB0aGlzLnZpZXdNYW5hZ2VyLm9wZW4oIHZpZXcuaWQgKTtcbn07XG5cblNpZGViYXIucHJvdG90eXBlLl9vblZpZXdSZW5kZXJlZCA9IGZ1bmN0aW9uKCB2aWV3ICkge1xuICAgIC8vIGNyZWF0ZSBnZW5lcmFsIGFuZCBuYW1lc3BhY2VkIGV2ZW50XG4gICAgdGhpcy5lbWl0KCAndmlldy5yZW5kZXJlZCcsIHZpZXcgKTtcbiAgICB0aGlzLmVtaXQoICd2aWV3LnJlbmRlcmVkLicgKyB2aWV3LmlkLCB2aWV3ICk7XG59O1xuXG5TaWRlYmFyLnByb3RvdHlwZS5fb25WaWV3UmVhZHkgPSBmdW5jdGlvbiggY2FsbGJhY2ssIGVyciwgdmlldyApIHtcbiAgICBpZiAoIGVyciApIHtcbiAgICAgICAgYm91bmQub2ZmKCB2aWV3LCB7XG4gICAgICAgICAgICAnb3Blbic6ICdfb25WaWV3T3BlbmluZydcbiAgICAgICAgfSwgdGhpcyApO1xuICAgICAgICB2aWV3LnJlbW92ZSgpO1xuICAgICAgICB0aGlzLmVtaXQoICdlcnJvcicsIGVyciApO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vIHVuYmluZCBhbnkgc3RhbGUgaGFuZGxlcnNcbiAgICBib3VuZC5vZmYoIHZpZXcsIHtcbiAgICAgICAgJ3JlYWR5JzogJ19vblZpZXdSZWFkeScsXG4gICAgICAgICdlcnJvcic6ICdfb25WaWV3UmVhZHknICBcbiAgICB9LCB0aGlzICk7XG4gICAgaWYgKCB0eXBlb2YgY2FsbGJhY2sgPT09ICdmdW5jdGlvbicgKSB7XG4gICAgICAgIGNhbGxiYWNrKCBlcnIsIHZpZXcgKTtcbiAgICB9XG4gICAgLy8gY2FjaGUgdmlldyBhZnRlciBzdWNjZXNzZnVsXG4gICAgdGhpcy5fY2FjaGVWaWV3KCB2aWV3ICk7XG59O1xuXG5TaWRlYmFyLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gZG8gdmlldyBjaGVja1xuICAgIHRoaXMuZWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCAnW2RhdGEtc2lkZWJhcl0nICk7XG4gICAgdGhpcy5fdGVhcmRvd25WaWV3cygpO1xuICAgIHRoaXMuX2hvbWVWaWV3ID0gbnVsbDtcbiAgICB0aGlzLl9jdXJyZW50VmlldyA9IG51bGw7XG4gICAgdGhpcy5fdmlld3MgPSBbXTtcbiAgICB0aGlzLl92aWV3c0J5SWQgPSB7fTtcblxuICAgIC8vIHNpZ25pZnkgaW5pYWxpemF0aW9uXG4gICAgaWYgKCB0aGlzLmVsICkge1xuICAgICAgICBpZiAoICF0aGlzLndyYXBwZXIgKSB7XG4gICAgICAgICAgICB0aGlzLndyYXBwZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCAnZGl2JyApO1xuICAgICAgICAgICAgdGhpcy5lbC5hcHBlbmRDaGlsZCggdGhpcy53cmFwcGVyICk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5lbC5jbGFzc0xpc3QuYWRkKCAnc2lkZWJhci1pbml0JyApO1xuICAgICAgICB0aGlzLnZpZXdNYW5hZ2VyID0gbmV3IFltaXIoIHtcbiAgICAgICAgICBlbDogdGhpcy53cmFwcGVyLFxuICAgICAgICAgIGxpc3RFbDogdGhpcy5uYXYsXG4gICAgICAgICAgY2xhc3NOYW1lOiAnc2lkZWJhci13cmFwcGVyJ1xuICAgICAgICB9ICk7XG4gICAgICAgIHRoaXMuZW1pdCggJ3JlYWR5JywgdGhpcyApO1xuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBFdmVudEVtaXR0ZXIyID0gcmVxdWlyZSggJ2V2ZW50ZW1pdHRlcjInICkuRXZlbnRFbWl0dGVyMjtcblxuLypcbiAgICBkZXBlbmRlbmNpZXNcbiovXG5cbi8qIGJpbmRpbmcgKi9cbnZhciBiaW5kaW5nTWV0aG9kID0gd2luZG93LmFkZEV2ZW50TGlzdGVuZXIgPyAnYWRkRXZlbnRMaXN0ZW5lcicgOiAnYXR0YWNoRXZlbnQnO1xudmFyIGV2ZW50UHJlZml4ID0gYmluZGluZ01ldGhvZCAhPT0gJ2FkZEV2ZW50TGlzdGVuZXInID8gJ29uJyA6ICcnO1xuXG5mdW5jdGlvbiBiaW5kKCBlbCwgdHlwZSwgZm4sIGNhcHR1cmUgKSB7XG4gICAgZWxbIGJpbmRpbmdNZXRob2QgXSggZXZlbnRQcmVmaXggKyB0eXBlLCBmbiwgY2FwdHVyZSB8fCBmYWxzZSApO1xuICAgIHJldHVybiBmbjtcbn1cblxuLyogbWF0Y2hpbmcgKi9cbnZhciB2ZW5kb3JNYXRjaCA9IEVsZW1lbnQucHJvdG90eXBlLm1hdGNoZXMgfHwgRWxlbWVudC5wcm90b3R5cGUud2Via2l0TWF0Y2hlc1NlbGVjdG9yIHx8IEVsZW1lbnQucHJvdG90eXBlLm1vek1hdGNoZXNTZWxlY3RvciB8fCBFbGVtZW50LnByb3RvdHlwZS5tc01hdGNoZXNTZWxlY3RvciB8fCBFbGVtZW50LnByb3RvdHlwZS5vTWF0Y2hlc1NlbGVjdG9yO1xuXG5mdW5jdGlvbiBtYXRjaGVzKCBlbCwgc2VsZWN0b3IgKSB7XG4gICAgaWYgKCAhZWwgfHwgZWwubm9kZVR5cGUgIT09IDEgKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYgKCB2ZW5kb3JNYXRjaCApIHtcbiAgICAgICAgcmV0dXJuIHZlbmRvck1hdGNoLmNhbGwoIGVsLCBzZWxlY3RvciApO1xuICAgIH1cbiAgICB2YXIgbm9kZXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCBzZWxlY3RvciwgZWwucGFyZW50Tm9kZSApO1xuICAgIGZvciAoIHZhciBpID0gMDsgaSA8IG5vZGVzLmxlbmd0aDsgKytpICkge1xuICAgICAgICBpZiAoIG5vZGVzWyBpIF0gPT0gZWwgKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTsgIFxuICAgICAgICB9IFxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59XG5cbi8qIGNsb3Nlc3QgKi9cblxuZnVuY3Rpb24gY2xvc2VzdCggZWxlbWVudCwgc2VsZWN0b3IsIGNoZWNrU2VsZiwgcm9vdCApIHtcbiAgICBlbGVtZW50ID0gY2hlY2tTZWxmID8ge3BhcmVudE5vZGU6IGVsZW1lbnR9IDogZWxlbWVudDtcblxuICAgIHJvb3QgPSByb290IHx8IGRvY3VtZW50O1xuXG4gICAgLyogTWFrZSBzdXJlIGBlbGVtZW50ICE9PSBkb2N1bWVudGAgYW5kIGBlbGVtZW50ICE9IG51bGxgXG4gICAgICAgb3RoZXJ3aXNlIHdlIGdldCBhbiBpbGxlZ2FsIGludm9jYXRpb24gKi9cbiAgICB3aGlsZSAoICggZWxlbWVudCA9IGVsZW1lbnQucGFyZW50Tm9kZSApICYmIGVsZW1lbnQgIT09IGRvY3VtZW50ICkge1xuICAgICAgICBpZiAoIG1hdGNoZXMoIGVsZW1lbnQsIHNlbGVjdG9yICkgKSB7XG4gICAgICAgICAgICByZXR1cm4gZWxlbWVudDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qIEFmdGVyIGBtYXRjaGVzYCBvbiB0aGUgZWRnZSBjYXNlIHRoYXRcbiAgICAgICAgICAgdGhlIHNlbGVjdG9yIG1hdGNoZXMgdGhlIHJvb3RcbiAgICAgICAgICAgKHdoZW4gdGhlIHJvb3QgaXMgbm90IHRoZSBkb2N1bWVudCkgKi9cbiAgICAgICAgaWYgKGVsZW1lbnQgPT09IHJvb3QpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLypcbiAgICBlbmQgZGVwZW5kZW5jaWVzXG4qL1xuXG5mdW5jdGlvbiBFbWl0KCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBFdmVudEVtaXR0ZXIyLmNhbGwoIHNlbGYgKTtcblxuICAgIHNlbGYudmFsaWRhdG9ycyA9IFtdO1xuICAgIHNlbGYudG91Y2hNb3ZlRGVsdGEgPSAxMDtcbiAgICBzZWxmLmluaXRpYWxUb3VjaFBvaW50ID0gbnVsbDtcblxuICAgIGJpbmQoIGRvY3VtZW50LCAndG91Y2hzdGFydCcsIHNlbGYuaGFuZGxlRXZlbnQuYmluZCggc2VsZiApICk7XG4gICAgYmluZCggZG9jdW1lbnQsICd0b3VjaG1vdmUnLCBzZWxmLmhhbmRsZUV2ZW50LmJpbmQoIHNlbGYgKSApO1xuICAgIGJpbmQoIGRvY3VtZW50LCAndG91Y2hlbmQnLCBzZWxmLmhhbmRsZUV2ZW50LmJpbmQoIHNlbGYgKSApO1xuICAgIGJpbmQoIGRvY3VtZW50LCAnY2xpY2snLCBzZWxmLmhhbmRsZUV2ZW50LmJpbmQoIHNlbGYgKSApO1xuICAgIGJpbmQoIGRvY3VtZW50LCAnaW5wdXQnLCBzZWxmLmhhbmRsZUV2ZW50LmJpbmQoIHNlbGYgKSApO1xuICAgIGJpbmQoIGRvY3VtZW50LCAnc3VibWl0Jywgc2VsZi5oYW5kbGVFdmVudC5iaW5kKCBzZWxmICkgKTtcbn1cblxuRW1pdC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKCBFdmVudEVtaXR0ZXIyLnByb3RvdHlwZSApO1xuXG5mdW5jdGlvbiBnZXRUb3VjaERlbHRhKCBldmVudCwgaW5pdGlhbCApIHtcbiAgICB2YXIgZGVsdGFYID0gKCBldmVudC50b3VjaGVzWyAwIF0ucGFnZVggLSBpbml0aWFsLnggKTtcbiAgICB2YXIgZGVsdGFZID0gKCBldmVudC50b3VjaGVzWyAwIF0ucGFnZVkgLSBpbml0aWFsLnkgKTtcbiAgICByZXR1cm4gTWF0aC5zcXJ0KCAoIGRlbHRhWCAqIGRlbHRhWCApICsgKCBkZWx0YVkgKiBkZWx0YVkgKSApO1xufVxuXG5FbWl0LnByb3RvdHlwZS5oYW5kbGVFdmVudCA9IGZ1bmN0aW9uKCBldmVudCApIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICB2YXIgdG91Y2hlcyA9IGV2ZW50LnRvdWNoZXM7XG4gICAgdmFyIGRlbHRhID0gLTE7XG5cbiAgICBpZiAoIHR5cGVvZiBldmVudC5wcm9wYWdhdGlvblN0b3BwZWRBdCAhPT0gJ251bWJlcicgfHwgaXNOYU4oIGV2ZW50LnByb3BhZ2F0aW9uU3RvcHBlZEF0ICkgKSB7XG4gICAgICAgIGV2ZW50LnByb3BhZ2F0aW9uU3RvcHBlZEF0ID0gMTAwOyAvLyBoaWdoZXN0IHBvc3NpYmxlIHZhbHVlXG4gICAgfVxuXG4gICAgc3dpdGNoICggZXZlbnQudHlwZSApIHtcbiAgICAgICAgY2FzZSAndG91Y2hzdGFydCc6XG4gICAgICAgICAgICBzZWxmLmluaXRpYWxUb3VjaFBvaW50ID0gc2VsZi5sYXN0VG91Y2hQb2ludCA9IHtcbiAgICAgICAgICAgICAgICB4OiB0b3VjaGVzICYmIHRvdWNoZXMubGVuZ3RoID8gdG91Y2hlc1sgMCBdLnBhZ2VYIDogMCxcbiAgICAgICAgICAgICAgICB5OiB0b3VjaGVzICYmIHRvdWNoZXMubGVuZ3RoID8gdG91Y2hlc1sgMCBdLnBhZ2VZIDogMFxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZSAndG91Y2htb3ZlJzpcbiAgICAgICAgICAgIGlmICggdG91Y2hlcyAmJiB0b3VjaGVzLmxlbmd0aCAmJiBzZWxmLmluaXRpYWxUb3VjaFBvaW50ICkge1xuICAgICAgICAgICAgICAgIGRlbHRhID0gZ2V0VG91Y2hEZWx0YSggZXZlbnQsIHNlbGYuaW5pdGlhbFRvdWNoUG9pbnQgKTtcbiAgICAgICAgICAgICAgICBpZiAoIGRlbHRhID4gc2VsZi50b3VjaE1vdmVEZWx0YSApIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5pbml0aWFsVG91Y2hQb2ludCA9IG51bGw7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgc2VsZi5sYXN0VG91Y2hQb2ludCA9IHtcbiAgICAgICAgICAgICAgICAgICAgeDogdG91Y2hlc1sgMCBdLnBhZ2VYLFxuICAgICAgICAgICAgICAgICAgICB5OiB0b3VjaGVzWyAwIF0ucGFnZVlcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBicmVhaztcblxuICAgICAgICBjYXNlICdjbGljayc6XG4gICAgICAgIGNhc2UgJ3RvdWNoZW5kJzpcbiAgICAgICAgY2FzZSAnaW5wdXQnOlxuICAgICAgICBjYXNlICdzdWJtaXQnOlxuICAgICAgICAgICAgLy8gZWF0IGFueSBsYXRlLWZpcmluZyBjbGljayBldmVudHMgb24gdG91Y2ggZGV2aWNlc1xuICAgICAgICAgICAgaWYgKCBldmVudC50eXBlID09PSAnY2xpY2snICYmIHNlbGYubGFzdFRvdWNoUG9pbnQgKSB7XG4gICAgICAgICAgICAgICAgaWYgKCBldmVudC50b3VjaGVzICYmIGV2ZW50LnRvdWNoZXMubGVuZ3RoICkge1xuICAgICAgICAgICAgICAgICAgICBkZWx0YSA9IGdldFRvdWNoRGVsdGEoIGV2ZW50LCBzZWxmLmxhc3RUb3VjaFBvaW50ICk7XG4gICAgICAgICAgICAgICAgICAgIGlmICggZGVsdGEgPCBzZWxmLnRvdWNoTW92ZURlbHRhICkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBoYW5kbGUgY2FuY2VsaW5nIHRvdWNoZXMgdGhhdCBoYXZlIG1vdmVkIHRvbyBtdWNoXG4gICAgICAgICAgICBpZiAoIGV2ZW50LnR5cGUgPT09ICd0b3VjaGVuZCcgJiYgIXNlbGYuaW5pdGlhbFRvdWNoUG9pbnQgKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgc2VsZWN0b3IgPSAnW2RhdGEtZW1pdF0nO1xuICAgICAgICAgICAgdmFyIG9yaWdpbmFsRWxlbWVudCA9IGV2ZW50LnRhcmdldCB8fCBldmVudC5zcmNFbGVtZW50O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBpZiBpdCdzIGEgbGluayBhbmQgaXQgaGFzIG5vIGVtaXQgYXR0cmlidXRlLCBhbGxvdyB0aGUgZXZlbnQgdG8gcGFzc1xuICAgICAgICAgICAgaWYgKCAhb3JpZ2luYWxFbGVtZW50LmdldEF0dHJpYnV0ZSggJ2RhdGEtZW1pdCcgKSAmJiAoIG9yaWdpbmFsRWxlbWVudC50YWdOYW1lID09PSAnQScgfHwgb3JpZ2luYWxFbGVtZW50LnRhZ05hbWUgPT09ICdCVVRUT04nIHx8IG9yaWdpbmFsRWxlbWVudC50YWdOYW1lID09PSAnSU5QVVQnICkgKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgZm9yY2VBbGxvd0RlZmF1bHQgPSBvcmlnaW5hbEVsZW1lbnQudGFnTmFtZSA9PSAnSU5QVVQnICYmICggb3JpZ2luYWxFbGVtZW50LnR5cGUgPT0gJ2NoZWNrYm94JyB8fCBvcmlnaW5hbEVsZW1lbnQudHlwZSA9PSAncmFkaW8nICk7XG4gICAgICAgICAgICB2YXIgZWwgPSBjbG9zZXN0KCBvcmlnaW5hbEVsZW1lbnQsIHNlbGVjdG9yLCB0cnVlLCBkb2N1bWVudCApO1xuXG4gICAgICAgICAgICBpZiAoIGVsICkge1xuICAgICAgICAgICAgICAgIHZhciBkZXB0aCA9IC0xO1xuICAgICAgICAgICAgICAgIHdoaWxlICggZWwgJiYgZXZlbnQucHJvcGFnYXRpb25TdG9wcGVkQXQgPiBkZXB0aCAmJiArK2RlcHRoIDwgMTAwICkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdmFsaWRhdGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgZm9yICggdmFyIHZhbGlkYXRvckluZGV4ID0gMDsgdmFsaWRhdG9ySW5kZXggPCBzZWxmLnZhbGlkYXRvcnMubGVuZ3RoOyArK3ZhbGlkYXRvckluZGV4ICkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCAhc2VsZi52YWxpZGF0b3JzWyB2YWxpZGF0b3JJbmRleCBdLmNhbGwoIHRoaXMsIGVsLCBldmVudCApICkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gZWF0IHRoZSBldmVudCBpZiBhIHZhbGlkYXRvciBmYWlsZWRcbiAgICAgICAgICAgICAgICAgICAgaWYgKCAhdmFsaWRhdGVkICkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnQucHJvcGFnYXRpb25TdG9wcGVkQXQgPSBkZXB0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKCB0eXBlb2YoIHNlbGYudmFsaWRhdGUgKSA9PSAnZnVuY3Rpb24nICYmICFzZWxmLnZhbGlkYXRlLmNhbGwoIHNlbGYsIGVsICkgKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbCA9IGNsb3Nlc3QoIGVsLCBzZWxlY3RvciwgZmFsc2UsIGRvY3VtZW50ICk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmICggZWwudGFnTmFtZSA9PSAnRk9STScgKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIGV2ZW50LnR5cGUgIT0gJ3N1Ym1pdCcgKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWwgPSBjbG9zZXN0KCBlbCwgc2VsZWN0b3IsIGZhbHNlLCBkb2N1bWVudCApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKCBlbC50YWdOYW1lID09ICdJTlBVVCcgKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoICEoIGVsLnR5cGUgPT0gJ3N1Ym1pdCcgfHwgZWwudHlwZSA9PSAnY2hlY2tib3gnIHx8IGVsLnR5cGUgPT0gJ3JhZGlvJyB8fCBlbC50eXBlID09ICdmaWxlJyApICYmIGV2ZW50LnR5cGUgIT0gJ2lucHV0JyApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbCA9IGNsb3Nlc3QoIGVsLCBzZWxlY3RvciwgZmFsc2UsIGRvY3VtZW50ICk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoIGVsLnRhZ05hbWUgPT0gJ1NFTEVDVCcgKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIGV2ZW50LnR5cGUgIT0gJ2lucHV0JyApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbCA9IGNsb3Nlc3QoIGVsLCBzZWxlY3RvciwgZmFsc2UsIGRvY3VtZW50ICk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBldmVudC5lbWl0VGFyZ2V0ID0gZWw7XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50LmRlcHRoID0gZGVwdGg7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuX2VtaXQoIGVsLCBldmVudCwgZm9yY2VBbGxvd0RlZmF1bHQgKTtcbiAgICAgICAgICAgICAgICAgICAgZWwgPSBjbG9zZXN0KCBlbCwgc2VsZWN0b3IsIGZhbHNlLCBkb2N1bWVudCApO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmICggZGVwdGggPj0gMTAwICkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoICdFeGNlZWRlZCBkZXB0aCBsaW1pdCBmb3IgRW1pdCBjYWxscy4nICk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgc2VsZi5lbWl0KCAndW5oYW5kbGVkJywgZXZlbnQgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc2VsZi5pbml0aWFsVG91Y2hQb2ludCA9IG51bGw7XG5cbiAgICAgICAgICAgIGJyZWFrO1xuICAgIH1cbn07XG5cbkVtaXQucHJvdG90eXBlLl9lbWl0ID0gZnVuY3Rpb24oIGVsZW1lbnQsIGV2ZW50LCBmb3JjZURlZmF1bHQgKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBvcHRpb25TdHJpbmcgPSBlbGVtZW50LmdldEF0dHJpYnV0ZSggJ2RhdGEtZW1pdC1vcHRpb25zJyApO1xuICAgIHZhciBvcHRpb25zID0ge307XG4gICAgdmFyIGlnbm9yZVN0cmluZyA9IGVsZW1lbnQuZ2V0QXR0cmlidXRlKCAnZGF0YS1lbWl0LWlnbm9yZScgKTtcbiAgICB2YXIgaTtcblxuICAgIGlmICggaWdub3JlU3RyaW5nICYmIGlnbm9yZVN0cmluZy5sZW5ndGggKSB7XG4gICAgICAgIHZhciBpZ25vcmVkRXZlbnRzID0gaWdub3JlU3RyaW5nLnRvTG93ZXJDYXNlKCkuc3BsaXQoICcgJyApO1xuICAgICAgICBmb3IgKCBpID0gMDsgaSA8IGlnbm9yZWRFdmVudHMubGVuZ3RoOyArK2kgKSB7XG4gICAgICAgICAgICBpZiAoIGV2ZW50LnR5cGUgPT0gaWdub3JlZEV2ZW50c1sgaSBdICkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmICggb3B0aW9uU3RyaW5nICYmIG9wdGlvblN0cmluZy5sZW5ndGggKSB7XG4gICAgICAgIHZhciBvcHRzID0gb3B0aW9uU3RyaW5nLnRvTG93ZXJDYXNlKCkuc3BsaXQoICcgJyApO1xuICAgICAgICBmb3IgKCBpID0gMDsgaSA8IG9wdHMubGVuZ3RoOyArK2kgKSB7XG4gICAgICAgICAgICBvcHRpb25zWyBvcHRzWyBpIF0gXSA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoICFmb3JjZURlZmF1bHQgJiYgIW9wdGlvbnMuYWxsb3dkZWZhdWx0ICkge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIH1cblxuICAgIGlmICggIW9wdGlvbnMuYWxsb3dwcm9wYWdhdGUgKSB7XG4gICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICBldmVudC5wcm9wYWdhdGlvblN0b3BwZWRBdCA9IGV2ZW50LmRlcHRoO1xuICAgIH1cblxuICAgIHZhciBlbWlzc2lvbkxpc3QgPSBlbGVtZW50LmdldEF0dHJpYnV0ZSggJ2RhdGEtZW1pdCcgKTtcbiAgICBpZiAoICFlbWlzc2lvbkxpc3QgKSB7XG4gICAgICAgIC8vIGFsbG93IGZvciBlbXB0eSBiZWhhdmlvcnMgdGhhdCBjYXRjaCBldmVudHNcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBlbWlzc2lvbnMgPSBlbWlzc2lvbkxpc3Quc3BsaXQoICcsJyApO1xuICAgIGlmICggb3B0aW9ucy5kZWJvdW5jZSApIHtcbiAgICAgICAgc2VsZi50aW1lb3V0cyA9IHNlbGYudGltZW91dHMgfHwge307XG4gICAgICAgIGlmICggc2VsZi50aW1lb3V0c1sgZWxlbWVudCBdICkge1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KCBzZWxmLnRpbWVvdXRzWyBlbGVtZW50IF0gKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIF9lbGVtZW50ID0gZWxlbWVudDtcbiAgICAgICAgICAgIHZhciBfZW1pc3Npb25zID0gZW1pc3Npb25zO1xuICAgICAgICAgICAgdmFyIF9ldmVudCA9IGV2ZW50O1xuICAgICAgICAgICAgc2VsZi50aW1lb3V0c1sgZWxlbWVudCBdID0gc2V0VGltZW91dCggZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgX2VtaXNzaW9ucy5mb3JFYWNoKCBmdW5jdGlvbiggZW1pc3Npb24gKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuZW1pdCggZW1pc3Npb24sIF9ldmVudCApO1xuICAgICAgICAgICAgICAgIH0gKTtcbiAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQoIHNlbGYudGltZW91dHNbIF9lbGVtZW50IF0gKTtcbiAgICAgICAgICAgICAgICBzZWxmLnRpbWVvdXRzWyBfZWxlbWVudCBdID0gbnVsbDtcbiAgICAgICAgICAgIH0sIDI1MCApO1xuICAgICAgICB9ICkoKTtcblxuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIFxuICAgIGVtaXNzaW9ucy5mb3JFYWNoKCBmdW5jdGlvbiggZW1pc3Npb24gKSB7XG4gICAgICAgIHNlbGYuZW1pdCggZW1pc3Npb24sIGV2ZW50ICk7XG4gICAgfSApO1xufTtcblxuRW1pdC5wcm90b3R5cGUuYWRkVmFsaWRhdG9yID0gZnVuY3Rpb24oIHZhbGlkYXRvciApIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICB2YXIgZm91bmQgPSBmYWxzZTtcbiAgICBmb3IgKCB2YXIgaSA9IDA7IGkgPCBzZWxmLnZhbGlkYXRvcnMubGVuZ3RoOyArK2kgKSB7XG4gICAgICAgIGlmICggc2VsZi52YWxpZGF0b3JzWyBpIF0gPT0gdmFsaWRhdG9yICkge1xuICAgICAgICAgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIGZvdW5kICkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgc2VsZi52YWxpZGF0b3JzLnB1c2goIHZhbGlkYXRvciApO1xuICAgIHJldHVybiB0cnVlO1xufTtcblxuRW1pdC5wcm90b3R5cGUucmVtb3ZlVmFsaWRhdG9yID0gZnVuY3Rpb24oIHZhbGlkYXRvciApIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICB2YXIgZm91bmQgPSBmYWxzZTtcbiAgICBmb3IgKCB2YXIgaSA9IDA7IGkgPCBzZWxmLnZhbGlkYXRvcnMubGVuZ3RoOyArK2kgKSB7XG4gICAgICAgIGlmICggc2VsZi52YWxpZGF0b3JzWyBpIF0gPT0gdmFsaWRhdG9yICkge1xuICAgICAgICAgICAgc2VsZi52YWxpZGF0b3JzLnNwbGljZSggaSwgMSApO1xuICAgICAgICAgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZm91bmQ7XG59O1xuXG5FbWl0LnNpbmdsZXRvbiA9IEVtaXQuc2luZ2xldG9uIHx8IG5ldyBFbWl0KCk7XG5FbWl0LnNpbmdsZXRvbi5FbWl0ID0gRW1pdDtcblxubW9kdWxlLmV4cG9ydHMgPSBFbWl0LnNpbmdsZXRvbjtcbiIsIi8qIVxuICogRXZlbnRFbWl0dGVyMlxuICogaHR0cHM6Ly9naXRodWIuY29tL2hpajFueC9FdmVudEVtaXR0ZXIyXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDEzIGhpajFueFxuICogTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBsaWNlbnNlLlxuICovXG47IWZ1bmN0aW9uKHVuZGVmaW5lZCkge1xuXG4gIHZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSA/IEFycmF5LmlzQXJyYXkgOiBmdW5jdGlvbiBfaXNBcnJheShvYmopIHtcbiAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iaikgPT09IFwiW29iamVjdCBBcnJheV1cIjtcbiAgfTtcbiAgdmFyIGRlZmF1bHRNYXhMaXN0ZW5lcnMgPSAxMDtcblxuICBmdW5jdGlvbiBpbml0KCkge1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIGlmICh0aGlzLl9jb25mKSB7XG4gICAgICBjb25maWd1cmUuY2FsbCh0aGlzLCB0aGlzLl9jb25mKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBjb25maWd1cmUoY29uZikge1xuICAgIGlmIChjb25mKSB7XG5cbiAgICAgIHRoaXMuX2NvbmYgPSBjb25mO1xuXG4gICAgICBjb25mLmRlbGltaXRlciAmJiAodGhpcy5kZWxpbWl0ZXIgPSBjb25mLmRlbGltaXRlcik7XG4gICAgICBjb25mLm1heExpc3RlbmVycyAmJiAodGhpcy5fZXZlbnRzLm1heExpc3RlbmVycyA9IGNvbmYubWF4TGlzdGVuZXJzKTtcbiAgICAgIGNvbmYud2lsZGNhcmQgJiYgKHRoaXMud2lsZGNhcmQgPSBjb25mLndpbGRjYXJkKTtcbiAgICAgIGNvbmYubmV3TGlzdGVuZXIgJiYgKHRoaXMubmV3TGlzdGVuZXIgPSBjb25mLm5ld0xpc3RlbmVyKTtcblxuICAgICAgaWYgKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgICAgdGhpcy5saXN0ZW5lclRyZWUgPSB7fTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBFdmVudEVtaXR0ZXIoY29uZikge1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIHRoaXMubmV3TGlzdGVuZXIgPSBmYWxzZTtcbiAgICBjb25maWd1cmUuY2FsbCh0aGlzLCBjb25mKTtcbiAgfVxuXG4gIC8vXG4gIC8vIEF0dGVudGlvbiwgZnVuY3Rpb24gcmV0dXJuIHR5cGUgbm93IGlzIGFycmF5LCBhbHdheXMgIVxuICAvLyBJdCBoYXMgemVybyBlbGVtZW50cyBpZiBubyBhbnkgbWF0Y2hlcyBmb3VuZCBhbmQgb25lIG9yIG1vcmVcbiAgLy8gZWxlbWVudHMgKGxlYWZzKSBpZiB0aGVyZSBhcmUgbWF0Y2hlc1xuICAvL1xuICBmdW5jdGlvbiBzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHRyZWUsIGkpIHtcbiAgICBpZiAoIXRyZWUpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgdmFyIGxpc3RlbmVycz1bXSwgbGVhZiwgbGVuLCBicmFuY2gsIHhUcmVlLCB4eFRyZWUsIGlzb2xhdGVkQnJhbmNoLCBlbmRSZWFjaGVkLFxuICAgICAgICB0eXBlTGVuZ3RoID0gdHlwZS5sZW5ndGgsIGN1cnJlbnRUeXBlID0gdHlwZVtpXSwgbmV4dFR5cGUgPSB0eXBlW2krMV07XG4gICAgaWYgKGkgPT09IHR5cGVMZW5ndGggJiYgdHJlZS5fbGlzdGVuZXJzKSB7XG4gICAgICAvL1xuICAgICAgLy8gSWYgYXQgdGhlIGVuZCBvZiB0aGUgZXZlbnQocykgbGlzdCBhbmQgdGhlIHRyZWUgaGFzIGxpc3RlbmVyc1xuICAgICAgLy8gaW52b2tlIHRob3NlIGxpc3RlbmVycy5cbiAgICAgIC8vXG4gICAgICBpZiAodHlwZW9mIHRyZWUuX2xpc3RlbmVycyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBoYW5kbGVycyAmJiBoYW5kbGVycy5wdXNoKHRyZWUuX2xpc3RlbmVycyk7XG4gICAgICAgIHJldHVybiBbdHJlZV07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKGxlYWYgPSAwLCBsZW4gPSB0cmVlLl9saXN0ZW5lcnMubGVuZ3RoOyBsZWFmIDwgbGVuOyBsZWFmKyspIHtcbiAgICAgICAgICBoYW5kbGVycyAmJiBoYW5kbGVycy5wdXNoKHRyZWUuX2xpc3RlbmVyc1tsZWFmXSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFt0cmVlXTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoKGN1cnJlbnRUeXBlID09PSAnKicgfHwgY3VycmVudFR5cGUgPT09ICcqKicpIHx8IHRyZWVbY3VycmVudFR5cGVdKSB7XG4gICAgICAvL1xuICAgICAgLy8gSWYgdGhlIGV2ZW50IGVtaXR0ZWQgaXMgJyonIGF0IHRoaXMgcGFydFxuICAgICAgLy8gb3IgdGhlcmUgaXMgYSBjb25jcmV0ZSBtYXRjaCBhdCB0aGlzIHBhdGNoXG4gICAgICAvL1xuICAgICAgaWYgKGN1cnJlbnRUeXBlID09PSAnKicpIHtcbiAgICAgICAgZm9yIChicmFuY2ggaW4gdHJlZSkge1xuICAgICAgICAgIGlmIChicmFuY2ggIT09ICdfbGlzdGVuZXJzJyAmJiB0cmVlLmhhc093blByb3BlcnR5KGJyYW5jaCkpIHtcbiAgICAgICAgICAgIGxpc3RlbmVycyA9IGxpc3RlbmVycy5jb25jYXQoc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB0cmVlW2JyYW5jaF0sIGkrMSkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbGlzdGVuZXJzO1xuICAgICAgfSBlbHNlIGlmKGN1cnJlbnRUeXBlID09PSAnKionKSB7XG4gICAgICAgIGVuZFJlYWNoZWQgPSAoaSsxID09PSB0eXBlTGVuZ3RoIHx8IChpKzIgPT09IHR5cGVMZW5ndGggJiYgbmV4dFR5cGUgPT09ICcqJykpO1xuICAgICAgICBpZihlbmRSZWFjaGVkICYmIHRyZWUuX2xpc3RlbmVycykge1xuICAgICAgICAgIC8vIFRoZSBuZXh0IGVsZW1lbnQgaGFzIGEgX2xpc3RlbmVycywgYWRkIGl0IHRvIHRoZSBoYW5kbGVycy5cbiAgICAgICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuY29uY2F0KHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZSwgdHlwZUxlbmd0aCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChicmFuY2ggaW4gdHJlZSkge1xuICAgICAgICAgIGlmIChicmFuY2ggIT09ICdfbGlzdGVuZXJzJyAmJiB0cmVlLmhhc093blByb3BlcnR5KGJyYW5jaCkpIHtcbiAgICAgICAgICAgIGlmKGJyYW5jaCA9PT0gJyonIHx8IGJyYW5jaCA9PT0gJyoqJykge1xuICAgICAgICAgICAgICBpZih0cmVlW2JyYW5jaF0uX2xpc3RlbmVycyAmJiAhZW5kUmVhY2hlZCkge1xuICAgICAgICAgICAgICAgIGxpc3RlbmVycyA9IGxpc3RlbmVycy5jb25jYXQoc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB0cmVlW2JyYW5jaF0sIHR5cGVMZW5ndGgpKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuY29uY2F0KHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZVticmFuY2hdLCBpKSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYoYnJhbmNoID09PSBuZXh0VHlwZSkge1xuICAgICAgICAgICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuY29uY2F0KHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZVticmFuY2hdLCBpKzIpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIC8vIE5vIG1hdGNoIG9uIHRoaXMgb25lLCBzaGlmdCBpbnRvIHRoZSB0cmVlIGJ1dCBub3QgaW4gdGhlIHR5cGUgYXJyYXkuXG4gICAgICAgICAgICAgIGxpc3RlbmVycyA9IGxpc3RlbmVycy5jb25jYXQoc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB0cmVlW2JyYW5jaF0sIGkpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGxpc3RlbmVycztcbiAgICAgIH1cblxuICAgICAgbGlzdGVuZXJzID0gbGlzdGVuZXJzLmNvbmNhdChzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHRyZWVbY3VycmVudFR5cGVdLCBpKzEpKTtcbiAgICB9XG5cbiAgICB4VHJlZSA9IHRyZWVbJyonXTtcbiAgICBpZiAoeFRyZWUpIHtcbiAgICAgIC8vXG4gICAgICAvLyBJZiB0aGUgbGlzdGVuZXIgdHJlZSB3aWxsIGFsbG93IGFueSBtYXRjaCBmb3IgdGhpcyBwYXJ0LFxuICAgICAgLy8gdGhlbiByZWN1cnNpdmVseSBleHBsb3JlIGFsbCBicmFuY2hlcyBvZiB0aGUgdHJlZVxuICAgICAgLy9cbiAgICAgIHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgeFRyZWUsIGkrMSk7XG4gICAgfVxuXG4gICAgeHhUcmVlID0gdHJlZVsnKionXTtcbiAgICBpZih4eFRyZWUpIHtcbiAgICAgIGlmKGkgPCB0eXBlTGVuZ3RoKSB7XG4gICAgICAgIGlmKHh4VHJlZS5fbGlzdGVuZXJzKSB7XG4gICAgICAgICAgLy8gSWYgd2UgaGF2ZSBhIGxpc3RlbmVyIG9uIGEgJyoqJywgaXQgd2lsbCBjYXRjaCBhbGwsIHNvIGFkZCBpdHMgaGFuZGxlci5cbiAgICAgICAgICBzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHh4VHJlZSwgdHlwZUxlbmd0aCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBCdWlsZCBhcnJheXMgb2YgbWF0Y2hpbmcgbmV4dCBicmFuY2hlcyBhbmQgb3RoZXJzLlxuICAgICAgICBmb3IoYnJhbmNoIGluIHh4VHJlZSkge1xuICAgICAgICAgIGlmKGJyYW5jaCAhPT0gJ19saXN0ZW5lcnMnICYmIHh4VHJlZS5oYXNPd25Qcm9wZXJ0eShicmFuY2gpKSB7XG4gICAgICAgICAgICBpZihicmFuY2ggPT09IG5leHRUeXBlKSB7XG4gICAgICAgICAgICAgIC8vIFdlIGtub3cgdGhlIG5leHQgZWxlbWVudCB3aWxsIG1hdGNoLCBzbyBqdW1wIHR3aWNlLlxuICAgICAgICAgICAgICBzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHh4VHJlZVticmFuY2hdLCBpKzIpO1xuICAgICAgICAgICAgfSBlbHNlIGlmKGJyYW5jaCA9PT0gY3VycmVudFR5cGUpIHtcbiAgICAgICAgICAgICAgLy8gQ3VycmVudCBub2RlIG1hdGNoZXMsIG1vdmUgaW50byB0aGUgdHJlZS5cbiAgICAgICAgICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB4eFRyZWVbYnJhbmNoXSwgaSsxKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGlzb2xhdGVkQnJhbmNoID0ge307XG4gICAgICAgICAgICAgIGlzb2xhdGVkQnJhbmNoW2JyYW5jaF0gPSB4eFRyZWVbYnJhbmNoXTtcbiAgICAgICAgICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB7ICcqKic6IGlzb2xhdGVkQnJhbmNoIH0sIGkrMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYoeHhUcmVlLl9saXN0ZW5lcnMpIHtcbiAgICAgICAgLy8gV2UgaGF2ZSByZWFjaGVkIHRoZSBlbmQgYW5kIHN0aWxsIG9uIGEgJyoqJ1xuICAgICAgICBzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHh4VHJlZSwgdHlwZUxlbmd0aCk7XG4gICAgICB9IGVsc2UgaWYoeHhUcmVlWycqJ10gJiYgeHhUcmVlWycqJ10uX2xpc3RlbmVycykge1xuICAgICAgICBzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHh4VHJlZVsnKiddLCB0eXBlTGVuZ3RoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbGlzdGVuZXJzO1xuICB9XG5cbiAgZnVuY3Rpb24gZ3Jvd0xpc3RlbmVyVHJlZSh0eXBlLCBsaXN0ZW5lcikge1xuXG4gICAgdHlwZSA9IHR5cGVvZiB0eXBlID09PSAnc3RyaW5nJyA/IHR5cGUuc3BsaXQodGhpcy5kZWxpbWl0ZXIpIDogdHlwZS5zbGljZSgpO1xuXG4gICAgLy9cbiAgICAvLyBMb29rcyBmb3IgdHdvIGNvbnNlY3V0aXZlICcqKicsIGlmIHNvLCBkb24ndCBhZGQgdGhlIGV2ZW50IGF0IGFsbC5cbiAgICAvL1xuICAgIGZvcih2YXIgaSA9IDAsIGxlbiA9IHR5cGUubGVuZ3RoOyBpKzEgPCBsZW47IGkrKykge1xuICAgICAgaWYodHlwZVtpXSA9PT0gJyoqJyAmJiB0eXBlW2krMV0gPT09ICcqKicpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cblxuICAgIHZhciB0cmVlID0gdGhpcy5saXN0ZW5lclRyZWU7XG4gICAgdmFyIG5hbWUgPSB0eXBlLnNoaWZ0KCk7XG5cbiAgICB3aGlsZSAobmFtZSkge1xuXG4gICAgICBpZiAoIXRyZWVbbmFtZV0pIHtcbiAgICAgICAgdHJlZVtuYW1lXSA9IHt9O1xuICAgICAgfVxuXG4gICAgICB0cmVlID0gdHJlZVtuYW1lXTtcblxuICAgICAgaWYgKHR5cGUubGVuZ3RoID09PSAwKSB7XG5cbiAgICAgICAgaWYgKCF0cmVlLl9saXN0ZW5lcnMpIHtcbiAgICAgICAgICB0cmVlLl9saXN0ZW5lcnMgPSBsaXN0ZW5lcjtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmKHR5cGVvZiB0cmVlLl9saXN0ZW5lcnMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICB0cmVlLl9saXN0ZW5lcnMgPSBbdHJlZS5fbGlzdGVuZXJzLCBsaXN0ZW5lcl07XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoaXNBcnJheSh0cmVlLl9saXN0ZW5lcnMpKSB7XG5cbiAgICAgICAgICB0cmVlLl9saXN0ZW5lcnMucHVzaChsaXN0ZW5lcik7XG5cbiAgICAgICAgICBpZiAoIXRyZWUuX2xpc3RlbmVycy53YXJuZWQpIHtcblxuICAgICAgICAgICAgdmFyIG0gPSBkZWZhdWx0TWF4TGlzdGVuZXJzO1xuXG4gICAgICAgICAgICBpZiAodHlwZW9mIHRoaXMuX2V2ZW50cy5tYXhMaXN0ZW5lcnMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgIG0gPSB0aGlzLl9ldmVudHMubWF4TGlzdGVuZXJzO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAobSA+IDAgJiYgdHJlZS5fbGlzdGVuZXJzLmxlbmd0aCA+IG0pIHtcblxuICAgICAgICAgICAgICB0cmVlLl9saXN0ZW5lcnMud2FybmVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICVkIGxpc3RlbmVycyBhZGRlZC4gJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ1VzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvIGluY3JlYXNlIGxpbWl0LicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJlZS5fbGlzdGVuZXJzLmxlbmd0aCk7XG4gICAgICAgICAgICAgIGNvbnNvbGUudHJhY2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICBuYW1lID0gdHlwZS5zaGlmdCgpO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW5cbiAgLy8gMTAgbGlzdGVuZXJzIGFyZSBhZGRlZCB0byBpdC4gVGhpcyBpcyBhIHVzZWZ1bCBkZWZhdWx0IHdoaWNoXG4gIC8vIGhlbHBzIGZpbmRpbmcgbWVtb3J5IGxlYWtzLlxuICAvL1xuICAvLyBPYnZpb3VzbHkgbm90IGFsbCBFbWl0dGVycyBzaG91bGQgYmUgbGltaXRlZCB0byAxMC4gVGhpcyBmdW5jdGlvbiBhbGxvd3NcbiAgLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5kZWxpbWl0ZXIgPSAnLic7XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5zZXRNYXhMaXN0ZW5lcnMgPSBmdW5jdGlvbihuKSB7XG4gICAgdGhpcy5fZXZlbnRzIHx8IGluaXQuY2FsbCh0aGlzKTtcbiAgICB0aGlzLl9ldmVudHMubWF4TGlzdGVuZXJzID0gbjtcbiAgICBpZiAoIXRoaXMuX2NvbmYpIHRoaXMuX2NvbmYgPSB7fTtcbiAgICB0aGlzLl9jb25mLm1heExpc3RlbmVycyA9IG47XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5ldmVudCA9ICcnO1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKGV2ZW50LCBmbikge1xuICAgIHRoaXMubWFueShldmVudCwgMSwgZm4pO1xuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUubWFueSA9IGZ1bmN0aW9uKGV2ZW50LCB0dGwsIGZuKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgaWYgKHR5cGVvZiBmbiAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdtYW55IG9ubHkgYWNjZXB0cyBpbnN0YW5jZXMgb2YgRnVuY3Rpb24nKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsaXN0ZW5lcigpIHtcbiAgICAgIGlmICgtLXR0bCA9PT0gMCkge1xuICAgICAgICBzZWxmLm9mZihldmVudCwgbGlzdGVuZXIpO1xuICAgICAgfVxuICAgICAgZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG5cbiAgICBsaXN0ZW5lci5fb3JpZ2luID0gZm47XG5cbiAgICB0aGlzLm9uKGV2ZW50LCBsaXN0ZW5lcik7XG5cbiAgICByZXR1cm4gc2VsZjtcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbigpIHtcblxuICAgIHRoaXMuX2V2ZW50cyB8fCBpbml0LmNhbGwodGhpcyk7XG5cbiAgICB2YXIgdHlwZSA9IGFyZ3VtZW50c1swXTtcblxuICAgIGlmICh0eXBlID09PSAnbmV3TGlzdGVuZXInICYmICF0aGlzLm5ld0xpc3RlbmVyKSB7XG4gICAgICBpZiAoIXRoaXMuX2V2ZW50cy5uZXdMaXN0ZW5lcikgeyByZXR1cm4gZmFsc2U7IH1cbiAgICB9XG5cbiAgICAvLyBMb29wIHRocm91Z2ggdGhlICpfYWxsKiBmdW5jdGlvbnMgYW5kIGludm9rZSB0aGVtLlxuICAgIGlmICh0aGlzLl9hbGwpIHtcbiAgICAgIHZhciBsID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGwgLSAxKTtcbiAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgbDsgaSsrKSBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgIGZvciAoaSA9IDAsIGwgPSB0aGlzLl9hbGwubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIHRoaXMuZXZlbnQgPSB0eXBlO1xuICAgICAgICB0aGlzLl9hbGxbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gSWYgdGhlcmUgaXMgbm8gJ2Vycm9yJyBldmVudCBsaXN0ZW5lciB0aGVuIHRocm93LlxuICAgIGlmICh0eXBlID09PSAnZXJyb3InKSB7XG5cbiAgICAgIGlmICghdGhpcy5fYWxsICYmXG4gICAgICAgICF0aGlzLl9ldmVudHMuZXJyb3IgJiZcbiAgICAgICAgISh0aGlzLndpbGRjYXJkICYmIHRoaXMubGlzdGVuZXJUcmVlLmVycm9yKSkge1xuXG4gICAgICAgIGlmIChhcmd1bWVudHNbMV0gaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICAgIHRocm93IGFyZ3VtZW50c1sxXTsgLy8gVW5oYW5kbGVkICdlcnJvcicgZXZlbnRcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJVbmNhdWdodCwgdW5zcGVjaWZpZWQgJ2Vycm9yJyBldmVudC5cIik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHZhciBoYW5kbGVyO1xuXG4gICAgaWYodGhpcy53aWxkY2FyZCkge1xuICAgICAgaGFuZGxlciA9IFtdO1xuICAgICAgdmFyIG5zID0gdHlwZW9mIHR5cGUgPT09ICdzdHJpbmcnID8gdHlwZS5zcGxpdCh0aGlzLmRlbGltaXRlcikgOiB0eXBlLnNsaWNlKCk7XG4gICAgICBzZWFyY2hMaXN0ZW5lclRyZWUuY2FsbCh0aGlzLCBoYW5kbGVyLCBucywgdGhpcy5saXN0ZW5lclRyZWUsIDApO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBoYW5kbGVyID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aGlzLmV2ZW50ID0gdHlwZTtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKVxuICAgICAgICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgMzpcbiAgICAgICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAvLyBzbG93ZXJcbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgdmFyIGwgPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkobCAtIDEpO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBsOyBpKyspIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgICAgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGVsc2UgaWYgKGhhbmRsZXIpIHtcbiAgICAgIHZhciBsID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGwgLSAxKTtcbiAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgbDsgaSsrKSBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcblxuICAgICAgdmFyIGxpc3RlbmVycyA9IGhhbmRsZXIuc2xpY2UoKTtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gbGlzdGVuZXJzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICB0aGlzLmV2ZW50ID0gdHlwZTtcbiAgICAgICAgbGlzdGVuZXJzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIChsaXN0ZW5lcnMubGVuZ3RoID4gMCkgfHwgISF0aGlzLl9hbGw7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgcmV0dXJuICEhdGhpcy5fYWxsO1xuICAgIH1cblxuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuXG4gICAgaWYgKHR5cGVvZiB0eXBlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aGlzLm9uQW55KHR5cGUpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBsaXN0ZW5lciAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdvbiBvbmx5IGFjY2VwdHMgaW5zdGFuY2VzIG9mIEZ1bmN0aW9uJyk7XG4gICAgfVxuICAgIHRoaXMuX2V2ZW50cyB8fCBpbml0LmNhbGwodGhpcyk7XG5cbiAgICAvLyBUbyBhdm9pZCByZWN1cnNpb24gaW4gdGhlIGNhc2UgdGhhdCB0eXBlID09IFwibmV3TGlzdGVuZXJzXCIhIEJlZm9yZVxuICAgIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFwibmV3TGlzdGVuZXJzXCIuXG4gICAgdGhpcy5lbWl0KCduZXdMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcblxuICAgIGlmKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgIGdyb3dMaXN0ZW5lclRyZWUuY2FsbCh0aGlzLCB0eXBlLCBsaXN0ZW5lcik7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSkge1xuICAgICAgLy8gT3B0aW1pemUgdGhlIGNhc2Ugb2Ygb25lIGxpc3RlbmVyLiBEb24ndCBuZWVkIHRoZSBleHRyYSBhcnJheSBvYmplY3QuXG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgICB9XG4gICAgZWxzZSBpZih0eXBlb2YgdGhpcy5fZXZlbnRzW3R5cGVdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAvLyBBZGRpbmcgdGhlIHNlY29uZCBlbGVtZW50LCBuZWVkIHRvIGNoYW5nZSB0byBhcnJheS5cbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV0sIGxpc3RlbmVyXTtcbiAgICB9XG4gICAgZWxzZSBpZiAoaXNBcnJheSh0aGlzLl9ldmVudHNbdHlwZV0pKSB7XG4gICAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhcHBlbmQuXG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0ucHVzaChsaXN0ZW5lcik7XG5cbiAgICAgIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gICAgICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQpIHtcblxuICAgICAgICB2YXIgbSA9IGRlZmF1bHRNYXhMaXN0ZW5lcnM7XG5cbiAgICAgICAgaWYgKHR5cGVvZiB0aGlzLl9ldmVudHMubWF4TGlzdGVuZXJzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgIG0gPSB0aGlzLl9ldmVudHMubWF4TGlzdGVuZXJzO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG0gPiAwICYmIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGggPiBtKSB7XG5cbiAgICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkID0gdHJ1ZTtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKCcobm9kZSkgd2FybmluZzogcG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICdsZWFrIGRldGVjdGVkLiAlZCBsaXN0ZW5lcnMgYWRkZWQuICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgJ1VzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvIGluY3JlYXNlIGxpbWl0LicsXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoKTtcbiAgICAgICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbkFueSA9IGZ1bmN0aW9uKGZuKSB7XG5cbiAgICBpZiAodHlwZW9mIGZuICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ29uQW55IG9ubHkgYWNjZXB0cyBpbnN0YW5jZXMgb2YgRnVuY3Rpb24nKTtcbiAgICB9XG5cbiAgICBpZighdGhpcy5fYWxsKSB7XG4gICAgICB0aGlzLl9hbGwgPSBbXTtcbiAgICB9XG5cbiAgICAvLyBBZGQgdGhlIGZ1bmN0aW9uIHRvIHRoZSBldmVudCBsaXN0ZW5lciBjb2xsZWN0aW9uLlxuICAgIHRoaXMuX2FsbC5wdXNoKGZuKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbjtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9mZiA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gICAgaWYgKHR5cGVvZiBsaXN0ZW5lciAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdyZW1vdmVMaXN0ZW5lciBvbmx5IHRha2VzIGluc3RhbmNlcyBvZiBGdW5jdGlvbicpO1xuICAgIH1cblxuICAgIHZhciBoYW5kbGVycyxsZWFmcz1bXTtcblxuICAgIGlmKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgIHZhciBucyA9IHR5cGVvZiB0eXBlID09PSAnc3RyaW5nJyA/IHR5cGUuc3BsaXQodGhpcy5kZWxpbWl0ZXIpIDogdHlwZS5zbGljZSgpO1xuICAgICAgbGVhZnMgPSBzZWFyY2hMaXN0ZW5lclRyZWUuY2FsbCh0aGlzLCBudWxsLCBucywgdGhpcy5saXN0ZW5lclRyZWUsIDApO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIC8vIGRvZXMgbm90IHVzZSBsaXN0ZW5lcnMoKSwgc28gbm8gc2lkZSBlZmZlY3Qgb2YgY3JlYXRpbmcgX2V2ZW50c1t0eXBlXVxuICAgICAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pIHJldHVybiB0aGlzO1xuICAgICAgaGFuZGxlcnMgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgICBsZWFmcy5wdXNoKHtfbGlzdGVuZXJzOmhhbmRsZXJzfSk7XG4gICAgfVxuXG4gICAgZm9yICh2YXIgaUxlYWY9MDsgaUxlYWY8bGVhZnMubGVuZ3RoOyBpTGVhZisrKSB7XG4gICAgICB2YXIgbGVhZiA9IGxlYWZzW2lMZWFmXTtcbiAgICAgIGhhbmRsZXJzID0gbGVhZi5fbGlzdGVuZXJzO1xuICAgICAgaWYgKGlzQXJyYXkoaGFuZGxlcnMpKSB7XG5cbiAgICAgICAgdmFyIHBvc2l0aW9uID0gLTE7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IGhhbmRsZXJzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgaWYgKGhhbmRsZXJzW2ldID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAgICAgKGhhbmRsZXJzW2ldLmxpc3RlbmVyICYmIGhhbmRsZXJzW2ldLmxpc3RlbmVyID09PSBsaXN0ZW5lcikgfHxcbiAgICAgICAgICAgIChoYW5kbGVyc1tpXS5fb3JpZ2luICYmIGhhbmRsZXJzW2ldLl9vcmlnaW4gPT09IGxpc3RlbmVyKSkge1xuICAgICAgICAgICAgcG9zaXRpb24gPSBpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHBvc2l0aW9uIDwgMCkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYodGhpcy53aWxkY2FyZCkge1xuICAgICAgICAgIGxlYWYuX2xpc3RlbmVycy5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGhhbmRsZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIGlmKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBsZWFmLl9saXN0ZW5lcnM7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9XG4gICAgICBlbHNlIGlmIChoYW5kbGVycyA9PT0gbGlzdGVuZXIgfHxcbiAgICAgICAgKGhhbmRsZXJzLmxpc3RlbmVyICYmIGhhbmRsZXJzLmxpc3RlbmVyID09PSBsaXN0ZW5lcikgfHxcbiAgICAgICAgKGhhbmRsZXJzLl9vcmlnaW4gJiYgaGFuZGxlcnMuX29yaWdpbiA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgIGlmKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgICAgICBkZWxldGUgbGVhZi5fbGlzdGVuZXJzO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9mZkFueSA9IGZ1bmN0aW9uKGZuKSB7XG4gICAgdmFyIGkgPSAwLCBsID0gMCwgZm5zO1xuICAgIGlmIChmbiAmJiB0aGlzLl9hbGwgJiYgdGhpcy5fYWxsLmxlbmd0aCA+IDApIHtcbiAgICAgIGZucyA9IHRoaXMuX2FsbDtcbiAgICAgIGZvcihpID0gMCwgbCA9IGZucy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgaWYoZm4gPT09IGZuc1tpXSkge1xuICAgICAgICAgIGZucy5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fYWxsID0gW107XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9mZjtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgIXRoaXMuX2V2ZW50cyB8fCBpbml0LmNhbGwodGhpcyk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBpZih0aGlzLndpbGRjYXJkKSB7XG4gICAgICB2YXIgbnMgPSB0eXBlb2YgdHlwZSA9PT0gJ3N0cmluZycgPyB0eXBlLnNwbGl0KHRoaXMuZGVsaW1pdGVyKSA6IHR5cGUuc2xpY2UoKTtcbiAgICAgIHZhciBsZWFmcyA9IHNlYXJjaExpc3RlbmVyVHJlZS5jYWxsKHRoaXMsIG51bGwsIG5zLCB0aGlzLmxpc3RlbmVyVHJlZSwgMCk7XG5cbiAgICAgIGZvciAodmFyIGlMZWFmPTA7IGlMZWFmPGxlYWZzLmxlbmd0aDsgaUxlYWYrKykge1xuICAgICAgICB2YXIgbGVhZiA9IGxlYWZzW2lMZWFmXTtcbiAgICAgICAgbGVhZi5fbGlzdGVuZXJzID0gbnVsbDtcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSkgcmV0dXJuIHRoaXM7XG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgICBpZih0aGlzLndpbGRjYXJkKSB7XG4gICAgICB2YXIgaGFuZGxlcnMgPSBbXTtcbiAgICAgIHZhciBucyA9IHR5cGVvZiB0eXBlID09PSAnc3RyaW5nJyA/IHR5cGUuc3BsaXQodGhpcy5kZWxpbWl0ZXIpIDogdHlwZS5zbGljZSgpO1xuICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlLmNhbGwodGhpcywgaGFuZGxlcnMsIG5zLCB0aGlzLmxpc3RlbmVyVHJlZSwgMCk7XG4gICAgICByZXR1cm4gaGFuZGxlcnM7XG4gICAgfVxuXG4gICAgdGhpcy5fZXZlbnRzIHx8IGluaXQuY2FsbCh0aGlzKTtcblxuICAgIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKSB0aGlzLl9ldmVudHNbdHlwZV0gPSBbXTtcbiAgICBpZiAoIWlzQXJyYXkodGhpcy5fZXZlbnRzW3R5cGVdKSkge1xuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXV07XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9ldmVudHNbdHlwZV07XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnNBbnkgPSBmdW5jdGlvbigpIHtcblxuICAgIGlmKHRoaXMuX2FsbCkge1xuICAgICAgcmV0dXJuIHRoaXMuX2FsbDtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gIH07XG5cbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG4gICAgZGVmaW5lKGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIEV2ZW50RW1pdHRlcjtcbiAgICB9KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcpIHtcbiAgICAvLyBDb21tb25KU1xuICAgIGV4cG9ydHMuRXZlbnRFbWl0dGVyMiA9IEV2ZW50RW1pdHRlcjtcbiAgfVxuICBlbHNlIHtcbiAgICAvLyBCcm93c2VyIGdsb2JhbC5cbiAgICB3aW5kb3cuRXZlbnRFbWl0dGVyMiA9IEV2ZW50RW1pdHRlcjtcbiAgfVxufSgpO1xuIiwidmFyIGhhc093biA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG52YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xudmFyIHVuZGVmaW5lZDtcblxudmFyIGlzUGxhaW5PYmplY3QgPSBmdW5jdGlvbiBpc1BsYWluT2JqZWN0KG9iaikge1xuXHQndXNlIHN0cmljdCc7XG5cdGlmICghb2JqIHx8IHRvU3RyaW5nLmNhbGwob2JqKSAhPT0gJ1tvYmplY3QgT2JqZWN0XScpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHR2YXIgaGFzX293bl9jb25zdHJ1Y3RvciA9IGhhc093bi5jYWxsKG9iaiwgJ2NvbnN0cnVjdG9yJyk7XG5cdHZhciBoYXNfaXNfcHJvcGVydHlfb2ZfbWV0aG9kID0gb2JqLmNvbnN0cnVjdG9yICYmIG9iai5jb25zdHJ1Y3Rvci5wcm90b3R5cGUgJiYgaGFzT3duLmNhbGwob2JqLmNvbnN0cnVjdG9yLnByb3RvdHlwZSwgJ2lzUHJvdG90eXBlT2YnKTtcblx0Ly8gTm90IG93biBjb25zdHJ1Y3RvciBwcm9wZXJ0eSBtdXN0IGJlIE9iamVjdFxuXHRpZiAob2JqLmNvbnN0cnVjdG9yICYmICFoYXNfb3duX2NvbnN0cnVjdG9yICYmICFoYXNfaXNfcHJvcGVydHlfb2ZfbWV0aG9kKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0Ly8gT3duIHByb3BlcnRpZXMgYXJlIGVudW1lcmF0ZWQgZmlyc3RseSwgc28gdG8gc3BlZWQgdXAsXG5cdC8vIGlmIGxhc3Qgb25lIGlzIG93biwgdGhlbiBhbGwgcHJvcGVydGllcyBhcmUgb3duLlxuXHR2YXIga2V5O1xuXHRmb3IgKGtleSBpbiBvYmopIHt9XG5cblx0cmV0dXJuIGtleSA9PT0gdW5kZWZpbmVkIHx8IGhhc093bi5jYWxsKG9iaiwga2V5KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZXh0ZW5kKCkge1xuXHQndXNlIHN0cmljdCc7XG5cdHZhciBvcHRpb25zLCBuYW1lLCBzcmMsIGNvcHksIGNvcHlJc0FycmF5LCBjbG9uZSxcblx0XHR0YXJnZXQgPSBhcmd1bWVudHNbMF0sXG5cdFx0aSA9IDEsXG5cdFx0bGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aCxcblx0XHRkZWVwID0gZmFsc2U7XG5cblx0Ly8gSGFuZGxlIGEgZGVlcCBjb3B5IHNpdHVhdGlvblxuXHRpZiAodHlwZW9mIHRhcmdldCA9PT0gJ2Jvb2xlYW4nKSB7XG5cdFx0ZGVlcCA9IHRhcmdldDtcblx0XHR0YXJnZXQgPSBhcmd1bWVudHNbMV0gfHwge307XG5cdFx0Ly8gc2tpcCB0aGUgYm9vbGVhbiBhbmQgdGhlIHRhcmdldFxuXHRcdGkgPSAyO1xuXHR9IGVsc2UgaWYgKCh0eXBlb2YgdGFyZ2V0ICE9PSAnb2JqZWN0JyAmJiB0eXBlb2YgdGFyZ2V0ICE9PSAnZnVuY3Rpb24nKSB8fCB0YXJnZXQgPT0gbnVsbCkge1xuXHRcdHRhcmdldCA9IHt9O1xuXHR9XG5cblx0Zm9yICg7IGkgPCBsZW5ndGg7ICsraSkge1xuXHRcdG9wdGlvbnMgPSBhcmd1bWVudHNbaV07XG5cdFx0Ly8gT25seSBkZWFsIHdpdGggbm9uLW51bGwvdW5kZWZpbmVkIHZhbHVlc1xuXHRcdGlmIChvcHRpb25zICE9IG51bGwpIHtcblx0XHRcdC8vIEV4dGVuZCB0aGUgYmFzZSBvYmplY3Rcblx0XHRcdGZvciAobmFtZSBpbiBvcHRpb25zKSB7XG5cdFx0XHRcdHNyYyA9IHRhcmdldFtuYW1lXTtcblx0XHRcdFx0Y29weSA9IG9wdGlvbnNbbmFtZV07XG5cblx0XHRcdFx0Ly8gUHJldmVudCBuZXZlci1lbmRpbmcgbG9vcFxuXHRcdFx0XHRpZiAodGFyZ2V0ID09PSBjb3B5KSB7XG5cdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBSZWN1cnNlIGlmIHdlJ3JlIG1lcmdpbmcgcGxhaW4gb2JqZWN0cyBvciBhcnJheXNcblx0XHRcdFx0aWYgKGRlZXAgJiYgY29weSAmJiAoaXNQbGFpbk9iamVjdChjb3B5KSB8fCAoY29weUlzQXJyYXkgPSBBcnJheS5pc0FycmF5KGNvcHkpKSkpIHtcblx0XHRcdFx0XHRpZiAoY29weUlzQXJyYXkpIHtcblx0XHRcdFx0XHRcdGNvcHlJc0FycmF5ID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRjbG9uZSA9IHNyYyAmJiBBcnJheS5pc0FycmF5KHNyYykgPyBzcmMgOiBbXTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0Y2xvbmUgPSBzcmMgJiYgaXNQbGFpbk9iamVjdChzcmMpID8gc3JjIDoge307XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0Ly8gTmV2ZXIgbW92ZSBvcmlnaW5hbCBvYmplY3RzLCBjbG9uZSB0aGVtXG5cdFx0XHRcdFx0dGFyZ2V0W25hbWVdID0gZXh0ZW5kKGRlZXAsIGNsb25lLCBjb3B5KTtcblxuXHRcdFx0XHQvLyBEb24ndCBicmluZyBpbiB1bmRlZmluZWQgdmFsdWVzXG5cdFx0XHRcdH0gZWxzZSBpZiAoY29weSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0dGFyZ2V0W25hbWVdID0gY29weTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdC8vIFJldHVybiB0aGUgbW9kaWZpZWQgb2JqZWN0XG5cdHJldHVybiB0YXJnZXQ7XG59O1xuXG4iLCIvKiBqc2hpbnQgYnJvd3NlcjogdHJ1ZSAqL1xuLyoganNoaW50IG5vZGU6IHRydWUgKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IF9ib3VuZC5iaW5kKCBudWxsLCAnb24nLCBmYWxzZSApO1xuXG5mdW5jdGlvbiBub29wICgpIHt9XG4vLyBoZXJlIHRvIHN0b3JlIHJlZnMgdG8gYm91bmQgZnVuY3Rpb25zXG52YXIgX2ZucyA9IHt9LFxuICAgIG1kNSA9IHJlcXVpcmUoICdibHVlaW1wLW1kNScgKS5tZDUsXG4gICAgdXRpbHMgPSByZXF1aXJlKCAnLi9zcmMvdXRpbHMnICk7XG5cbnZhciBiaW5kRXZlbnQgPSBcbm1vZHVsZS5leHBvcnRzLmJpbmRFdmVudCA9IGZ1bmN0aW9uICggZm4sIGV2ZW50TmFtZSwgaGFuZGxlciwgY29udGV4dCwgcmVtb3ZlQ2FjaGUgKSB7XG4gICAgaWYgKCB0eXBlb2YgaGFuZGxlciAhPT0gJ2Z1bmN0aW9uJyApIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgX2lkID0gbWQ1KCBoYW5kbGVyLnRvU3RyaW5nKCkgKyBKU09OLnN0cmluZ2lmeSggdXRpbHMuZGVjeWNsZU9iamVjdCggY29udGV4dCApICkgKTtcbiAgICAvKiBcbiAgICAgIHRoaXMgaXMgdG8gY2FjaGUgdGhlIGZ1bmN0aW9uIHNvIGl0IGNhbiBiZSB1bmJvdW5kIGZyb20gdGhlIGV2ZW50XG4gICAgICBiZWNhdXNlIGZuLmJpbmQoICkgY3JlYXRlIGEgbmV3IGZ1bmN0aW9uLCB3aGljaCBtZWFuIGZuID09PSBmbi5iaW5kKCkgaXMgZmFsc2VcbiAgICAqL1xuICAgIGlmICggIV9mbnNbIGV2ZW50TmFtZSBdICkge1xuICAgICAgICBfZm5zW2V2ZW50TmFtZV0gPSB7fTtcbiAgICB9XG4gICAgaWYgKCAhX2Zuc1sgZXZlbnROYW1lIF1bIF9pZCBdICkge1xuICAgICAgICBfZm5zWyBldmVudE5hbWUgXVsgX2lkIF0gPSBoYW5kbGVyLmJpbmQuYXBwbHkoIGhhbmRsZXIsIGNvbnRleHQgKTtcbiAgICB9XG4gICAgaGFuZGxlciA9IF9mbnNbIGV2ZW50TmFtZSBdWyBfaWQgXTtcblxuICAgIGZuKCBldmVudE5hbWUsIGhhbmRsZXIgKTtcbiAgICAvLyBjbGVhciBjYWNoZSBvbiB1bmJpbmRcbiAgICBpZiAoIHJlbW92ZUNhY2hlICkge1xuICAgICAgICBkZWxldGUgX2Zuc1sgZXZlbnROYW1lIF1bIF9pZCBdO1xuICAgIH1cbn07XG5cbnZhciBnZXRNZXRob2QgPVxubW9kdWxlLmV4cG9ydHMuZ2V0TWV0aG9kID0gZnVuY3Rpb24gKCBoYW5kbGVOYW1lLCBjb250ZXh0ICkge1xuICAgIGlmICggdHlwZW9mIGNvbnRleHQgIT09ICdvYmplY3QnICkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHJldHVybiB0eXBlb2YgaGFuZGxlTmFtZSA9PT0gJ2Z1bmN0aW9uJyA/IGhhbmRsZU5hbWUgOiAoIGNvbnRleHQgfHwgd2luZG93IClbIGhhbmRsZU5hbWUgXTtcbn07XG5cbnZhciBlYWNoRXZlbnQgPSBcbm1vZHVsZS5leHBvcnRzLmVhY2hFdmVudCA9IGZ1bmN0aW9uICggZm4sIGV2ZW50T2JqLCBjb250ZXh0LCByZW1vdmVDYWNoZSApIHtcbiAgICB2YXIgZXZlbnQsXG4gICAgICAgIGV2ZW50SGFuZGxlLFxuICAgICAgICBiaW5kVG87XG4gICAgZm9yICggdmFyIF9ldmVudCBpbiBldmVudE9iaiApIHtcbiAgICAgICAgZXZlbnQgPSBldmVudE9ialsgX2V2ZW50IF07XG4gICAgICAgIGlmICggQXJyYXkuaXNBcnJheSggZXZlbnQgKSApIHtcbiAgICAgICAgICAgIGlmICggdHlwZW9mIGV2ZW50WyAwIF0gPT09ICdvYmplY3QnICYmICFjb250ZXh0ICkge1xuICAgICAgICAgICAgICAgIGJpbmRUbyA9IGV2ZW50WyAwIF07XG4gICAgICAgICAgICAgICAgaWYgKCB0eXBlb2YgZXZlbnRbIDEgXSAgPT09ICdzdHJpbmcnICkge1xuICAgICAgICAgICAgICAgICAgICBldmVudEhhbmRsZSA9IGdldE1ldGhvZCggZXZlbnRbIDEgXSwgYmluZFRvICk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRIYW5kbGUgPSBldmVudFsgMSBdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBiaW5kVG8gPSBbIGJpbmRUbyBdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBldmVudEhhbmRsZSA9IGdldE1ldGhvZCggZXZlbnQuc2hpZnQoKSwgY29udGV4dCApO1xuICAgICAgICAgICAgICAgIGV2ZW50LnVuc2hpZnQoIGNvbnRleHQgKTtcbiAgICAgICAgICAgICAgICBiaW5kVG8gPSBldmVudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICggdHlwZW9mIGV2ZW50ID09PSAnc3RyaW5nJyApIHtcbiAgICAgICAgICAgIGV2ZW50SGFuZGxlID0gZ2V0TWV0aG9kKCBldmVudCwgY29udGV4dCApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZXZlbnRIYW5kbGUgPSBldmVudDtcbiAgICAgICAgfVxuXG4gICAgICAgIGJpbmRFdmVudCggZm4sIF9ldmVudCwgZXZlbnRIYW5kbGUsIGJpbmRUbyB8fCBbIGNvbnRleHQgXSwgcmVtb3ZlQ2FjaGUgKTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5iaW5kID0gXG5tb2R1bGUuZXhwb3J0cy5vbiA9XG5tb2R1bGUuZXhwb3J0cy5hZGRFdmVudExpc3RlbmVyID1cbm1vZHVsZS5leHBvcnRzLmFkZExpc3RlbmVyID0gX2JvdW5kLmJpbmQoIG51bGwsICdvbicsIGZhbHNlICk7XG5cbm1vZHVsZS5leHBvcnRzLnVuYmluZCA9XG5tb2R1bGUuZXhwb3J0cy5vZmYgPVxubW9kdWxlLmV4cG9ydHMucmVtb3ZlRXZlbnRMaXN0ZW5lciA9XG5tb2R1bGUuZXhwb3J0cy5yZW1vdmVMaXN0ZW5lciA9IF9ib3VuZC5iaW5kKCBudWxsLCAnb2ZmJywgdHJ1ZSApO1xuXG5tb2R1bGUuZXhwb3J0cy5zZXRNZXRob2QgPSBmdW5jdGlvbiAoIG1ldGhvZCwgcmVtb3ZlQ2FjaGUgKSB7XG4gICAgcmV0dXJuIF9ib3VuZC5iaW5kKCBudWxsLCBtZXRob2QsIHJlbW92ZUNhY2hlICk7XG59O1xuXG5mdW5jdGlvbiBfYm91bmQoIG1ldGhvZCwgcmVtb3ZlQ2FjaGUsIGVtaXR0ZXIsIGV2ZW50T2JqLCBjb250ZXh0ICApIHtcbiAgICBcbiAgICB2YXIgZXZlbnRNZXRob2QgPSBlbWl0dGVyID8gZW1pdHRlclsgbWV0aG9kIF0gOiBudWxsO1xuICAgIGlmICggIWV2ZW50TWV0aG9kICYmIGVtaXR0ZXIgKSB7XG4gICAgICAgIHN3aXRjaCggbWV0aG9kICkge1xuICAgICAgICAgICAgY2FzZSAnb24nOlxuICAgICAgICAgICAgICAgIGV2ZW50TWV0aG9kID0gZW1pdHRlci5hZGRFdmVudExpc3RlbmVyIHx8IGVtaXR0ZXIuYWRkTGlzdGVuZXI7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdvZmYnOlxuICAgICAgICAgICAgICAgIGV2ZW50TWV0aG9kID0gZW1pdHRlci5yZW1vdmVFdmVudExpc3RlbmVyIHx8IGVtaXR0ZXIucmVtb3ZlTGlzdGVuZXI7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgaWYgKCAhZXZlbnRNZXRob2QgKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvciggJ0NvdWxkIG5vdCBiaW5kIHRvIG1ldGhvZCBcIicgKyBtZXRob2QgKyAnXCIuJyApO1xuICAgIH1cblxuICAgIGV2ZW50TWV0aG9kID0gZXZlbnRNZXRob2QuYmluZCggZW1pdHRlciApO1xuICAgIGVhY2hFdmVudCggZXZlbnRNZXRob2QsIGV2ZW50T2JqLCBjb250ZXh0LCByZW1vdmVDYWNoZSApO1xufVxuIiwiLypcbiAqIEphdmFTY3JpcHQgTUQ1IDEuMC4xXG4gKiBodHRwczovL2dpdGh1Yi5jb20vYmx1ZWltcC9KYXZhU2NyaXB0LU1ENVxuICpcbiAqIENvcHlyaWdodCAyMDExLCBTZWJhc3RpYW4gVHNjaGFuXG4gKiBodHRwczovL2JsdWVpbXAubmV0XG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBsaWNlbnNlOlxuICogaHR0cDovL3d3dy5vcGVuc291cmNlLm9yZy9saWNlbnNlcy9NSVRcbiAqIFxuICogQmFzZWQgb25cbiAqIEEgSmF2YVNjcmlwdCBpbXBsZW1lbnRhdGlvbiBvZiB0aGUgUlNBIERhdGEgU2VjdXJpdHksIEluYy4gTUQ1IE1lc3NhZ2VcbiAqIERpZ2VzdCBBbGdvcml0aG0sIGFzIGRlZmluZWQgaW4gUkZDIDEzMjEuXG4gKiBWZXJzaW9uIDIuMiBDb3B5cmlnaHQgKEMpIFBhdWwgSm9obnN0b24gMTk5OSAtIDIwMDlcbiAqIE90aGVyIGNvbnRyaWJ1dG9yczogR3JlZyBIb2x0LCBBbmRyZXcgS2VwZXJ0LCBZZG5hciwgTG9zdGluZXRcbiAqIERpc3RyaWJ1dGVkIHVuZGVyIHRoZSBCU0QgTGljZW5zZVxuICogU2VlIGh0dHA6Ly9wYWpob21lLm9yZy51ay9jcnlwdC9tZDUgZm9yIG1vcmUgaW5mby5cbiAqL1xuXG4vKmpzbGludCBiaXR3aXNlOiB0cnVlICovXG4vKmdsb2JhbCB1bmVzY2FwZSwgZGVmaW5lICovXG5cbihmdW5jdGlvbiAoJCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIC8qXG4gICAgKiBBZGQgaW50ZWdlcnMsIHdyYXBwaW5nIGF0IDJeMzIuIFRoaXMgdXNlcyAxNi1iaXQgb3BlcmF0aW9ucyBpbnRlcm5hbGx5XG4gICAgKiB0byB3b3JrIGFyb3VuZCBidWdzIGluIHNvbWUgSlMgaW50ZXJwcmV0ZXJzLlxuICAgICovXG4gICAgZnVuY3Rpb24gc2FmZV9hZGQoeCwgeSkge1xuICAgICAgICB2YXIgbHN3ID0gKHggJiAweEZGRkYpICsgKHkgJiAweEZGRkYpLFxuICAgICAgICAgICAgbXN3ID0gKHggPj4gMTYpICsgKHkgPj4gMTYpICsgKGxzdyA+PiAxNik7XG4gICAgICAgIHJldHVybiAobXN3IDw8IDE2KSB8IChsc3cgJiAweEZGRkYpO1xuICAgIH1cblxuICAgIC8qXG4gICAgKiBCaXR3aXNlIHJvdGF0ZSBhIDMyLWJpdCBudW1iZXIgdG8gdGhlIGxlZnQuXG4gICAgKi9cbiAgICBmdW5jdGlvbiBiaXRfcm9sKG51bSwgY250KSB7XG4gICAgICAgIHJldHVybiAobnVtIDw8IGNudCkgfCAobnVtID4+PiAoMzIgLSBjbnQpKTtcbiAgICB9XG5cbiAgICAvKlxuICAgICogVGhlc2UgZnVuY3Rpb25zIGltcGxlbWVudCB0aGUgZm91ciBiYXNpYyBvcGVyYXRpb25zIHRoZSBhbGdvcml0aG0gdXNlcy5cbiAgICAqL1xuICAgIGZ1bmN0aW9uIG1kNV9jbW4ocSwgYSwgYiwgeCwgcywgdCkge1xuICAgICAgICByZXR1cm4gc2FmZV9hZGQoYml0X3JvbChzYWZlX2FkZChzYWZlX2FkZChhLCBxKSwgc2FmZV9hZGQoeCwgdCkpLCBzKSwgYik7XG4gICAgfVxuICAgIGZ1bmN0aW9uIG1kNV9mZihhLCBiLCBjLCBkLCB4LCBzLCB0KSB7XG4gICAgICAgIHJldHVybiBtZDVfY21uKChiICYgYykgfCAoKH5iKSAmIGQpLCBhLCBiLCB4LCBzLCB0KTtcbiAgICB9XG4gICAgZnVuY3Rpb24gbWQ1X2dnKGEsIGIsIGMsIGQsIHgsIHMsIHQpIHtcbiAgICAgICAgcmV0dXJuIG1kNV9jbW4oKGIgJiBkKSB8IChjICYgKH5kKSksIGEsIGIsIHgsIHMsIHQpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBtZDVfaGgoYSwgYiwgYywgZCwgeCwgcywgdCkge1xuICAgICAgICByZXR1cm4gbWQ1X2NtbihiIF4gYyBeIGQsIGEsIGIsIHgsIHMsIHQpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBtZDVfaWkoYSwgYiwgYywgZCwgeCwgcywgdCkge1xuICAgICAgICByZXR1cm4gbWQ1X2NtbihjIF4gKGIgfCAofmQpKSwgYSwgYiwgeCwgcywgdCk7XG4gICAgfVxuXG4gICAgLypcbiAgICAqIENhbGN1bGF0ZSB0aGUgTUQ1IG9mIGFuIGFycmF5IG9mIGxpdHRsZS1lbmRpYW4gd29yZHMsIGFuZCBhIGJpdCBsZW5ndGguXG4gICAgKi9cbiAgICBmdW5jdGlvbiBiaW5sX21kNSh4LCBsZW4pIHtcbiAgICAgICAgLyogYXBwZW5kIHBhZGRpbmcgKi9cbiAgICAgICAgeFtsZW4gPj4gNV0gfD0gMHg4MCA8PCAobGVuICUgMzIpO1xuICAgICAgICB4WygoKGxlbiArIDY0KSA+Pj4gOSkgPDwgNCkgKyAxNF0gPSBsZW47XG5cbiAgICAgICAgdmFyIGksIG9sZGEsIG9sZGIsIG9sZGMsIG9sZGQsXG4gICAgICAgICAgICBhID0gIDE3MzI1ODQxOTMsXG4gICAgICAgICAgICBiID0gLTI3MTczMzg3OSxcbiAgICAgICAgICAgIGMgPSAtMTczMjU4NDE5NCxcbiAgICAgICAgICAgIGQgPSAgMjcxNzMzODc4O1xuXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCB4Lmxlbmd0aDsgaSArPSAxNikge1xuICAgICAgICAgICAgb2xkYSA9IGE7XG4gICAgICAgICAgICBvbGRiID0gYjtcbiAgICAgICAgICAgIG9sZGMgPSBjO1xuICAgICAgICAgICAgb2xkZCA9IGQ7XG5cbiAgICAgICAgICAgIGEgPSBtZDVfZmYoYSwgYiwgYywgZCwgeFtpXSwgICAgICAgNywgLTY4MDg3NjkzNik7XG4gICAgICAgICAgICBkID0gbWQ1X2ZmKGQsIGEsIGIsIGMsIHhbaSArICAxXSwgMTIsIC0zODk1NjQ1ODYpO1xuICAgICAgICAgICAgYyA9IG1kNV9mZihjLCBkLCBhLCBiLCB4W2kgKyAgMl0sIDE3LCAgNjA2MTA1ODE5KTtcbiAgICAgICAgICAgIGIgPSBtZDVfZmYoYiwgYywgZCwgYSwgeFtpICsgIDNdLCAyMiwgLTEwNDQ1MjUzMzApO1xuICAgICAgICAgICAgYSA9IG1kNV9mZihhLCBiLCBjLCBkLCB4W2kgKyAgNF0sICA3LCAtMTc2NDE4ODk3KTtcbiAgICAgICAgICAgIGQgPSBtZDVfZmYoZCwgYSwgYiwgYywgeFtpICsgIDVdLCAxMiwgIDEyMDAwODA0MjYpO1xuICAgICAgICAgICAgYyA9IG1kNV9mZihjLCBkLCBhLCBiLCB4W2kgKyAgNl0sIDE3LCAtMTQ3MzIzMTM0MSk7XG4gICAgICAgICAgICBiID0gbWQ1X2ZmKGIsIGMsIGQsIGEsIHhbaSArICA3XSwgMjIsIC00NTcwNTk4Myk7XG4gICAgICAgICAgICBhID0gbWQ1X2ZmKGEsIGIsIGMsIGQsIHhbaSArICA4XSwgIDcsICAxNzcwMDM1NDE2KTtcbiAgICAgICAgICAgIGQgPSBtZDVfZmYoZCwgYSwgYiwgYywgeFtpICsgIDldLCAxMiwgLTE5NTg0MTQ0MTcpO1xuICAgICAgICAgICAgYyA9IG1kNV9mZihjLCBkLCBhLCBiLCB4W2kgKyAxMF0sIDE3LCAtNDIwNjMpO1xuICAgICAgICAgICAgYiA9IG1kNV9mZihiLCBjLCBkLCBhLCB4W2kgKyAxMV0sIDIyLCAtMTk5MDQwNDE2Mik7XG4gICAgICAgICAgICBhID0gbWQ1X2ZmKGEsIGIsIGMsIGQsIHhbaSArIDEyXSwgIDcsICAxODA0NjAzNjgyKTtcbiAgICAgICAgICAgIGQgPSBtZDVfZmYoZCwgYSwgYiwgYywgeFtpICsgMTNdLCAxMiwgLTQwMzQxMTAxKTtcbiAgICAgICAgICAgIGMgPSBtZDVfZmYoYywgZCwgYSwgYiwgeFtpICsgMTRdLCAxNywgLTE1MDIwMDIyOTApO1xuICAgICAgICAgICAgYiA9IG1kNV9mZihiLCBjLCBkLCBhLCB4W2kgKyAxNV0sIDIyLCAgMTIzNjUzNTMyOSk7XG5cbiAgICAgICAgICAgIGEgPSBtZDVfZ2coYSwgYiwgYywgZCwgeFtpICsgIDFdLCAgNSwgLTE2NTc5NjUxMCk7XG4gICAgICAgICAgICBkID0gbWQ1X2dnKGQsIGEsIGIsIGMsIHhbaSArICA2XSwgIDksIC0xMDY5NTAxNjMyKTtcbiAgICAgICAgICAgIGMgPSBtZDVfZ2coYywgZCwgYSwgYiwgeFtpICsgMTFdLCAxNCwgIDY0MzcxNzcxMyk7XG4gICAgICAgICAgICBiID0gbWQ1X2dnKGIsIGMsIGQsIGEsIHhbaV0sICAgICAgMjAsIC0zNzM4OTczMDIpO1xuICAgICAgICAgICAgYSA9IG1kNV9nZyhhLCBiLCBjLCBkLCB4W2kgKyAgNV0sICA1LCAtNzAxNTU4NjkxKTtcbiAgICAgICAgICAgIGQgPSBtZDVfZ2coZCwgYSwgYiwgYywgeFtpICsgMTBdLCAgOSwgIDM4MDE2MDgzKTtcbiAgICAgICAgICAgIGMgPSBtZDVfZ2coYywgZCwgYSwgYiwgeFtpICsgMTVdLCAxNCwgLTY2MDQ3ODMzNSk7XG4gICAgICAgICAgICBiID0gbWQ1X2dnKGIsIGMsIGQsIGEsIHhbaSArICA0XSwgMjAsIC00MDU1Mzc4NDgpO1xuICAgICAgICAgICAgYSA9IG1kNV9nZyhhLCBiLCBjLCBkLCB4W2kgKyAgOV0sICA1LCAgNTY4NDQ2NDM4KTtcbiAgICAgICAgICAgIGQgPSBtZDVfZ2coZCwgYSwgYiwgYywgeFtpICsgMTRdLCAgOSwgLTEwMTk4MDM2OTApO1xuICAgICAgICAgICAgYyA9IG1kNV9nZyhjLCBkLCBhLCBiLCB4W2kgKyAgM10sIDE0LCAtMTg3MzYzOTYxKTtcbiAgICAgICAgICAgIGIgPSBtZDVfZ2coYiwgYywgZCwgYSwgeFtpICsgIDhdLCAyMCwgIDExNjM1MzE1MDEpO1xuICAgICAgICAgICAgYSA9IG1kNV9nZyhhLCBiLCBjLCBkLCB4W2kgKyAxM10sICA1LCAtMTQ0NDY4MTQ2Nyk7XG4gICAgICAgICAgICBkID0gbWQ1X2dnKGQsIGEsIGIsIGMsIHhbaSArICAyXSwgIDksIC01MTQwMzc4NCk7XG4gICAgICAgICAgICBjID0gbWQ1X2dnKGMsIGQsIGEsIGIsIHhbaSArICA3XSwgMTQsICAxNzM1MzI4NDczKTtcbiAgICAgICAgICAgIGIgPSBtZDVfZ2coYiwgYywgZCwgYSwgeFtpICsgMTJdLCAyMCwgLTE5MjY2MDc3MzQpO1xuXG4gICAgICAgICAgICBhID0gbWQ1X2hoKGEsIGIsIGMsIGQsIHhbaSArICA1XSwgIDQsIC0zNzg1NTgpO1xuICAgICAgICAgICAgZCA9IG1kNV9oaChkLCBhLCBiLCBjLCB4W2kgKyAgOF0sIDExLCAtMjAyMjU3NDQ2Myk7XG4gICAgICAgICAgICBjID0gbWQ1X2hoKGMsIGQsIGEsIGIsIHhbaSArIDExXSwgMTYsICAxODM5MDMwNTYyKTtcbiAgICAgICAgICAgIGIgPSBtZDVfaGgoYiwgYywgZCwgYSwgeFtpICsgMTRdLCAyMywgLTM1MzA5NTU2KTtcbiAgICAgICAgICAgIGEgPSBtZDVfaGgoYSwgYiwgYywgZCwgeFtpICsgIDFdLCAgNCwgLTE1MzA5OTIwNjApO1xuICAgICAgICAgICAgZCA9IG1kNV9oaChkLCBhLCBiLCBjLCB4W2kgKyAgNF0sIDExLCAgMTI3Mjg5MzM1Myk7XG4gICAgICAgICAgICBjID0gbWQ1X2hoKGMsIGQsIGEsIGIsIHhbaSArICA3XSwgMTYsIC0xNTU0OTc2MzIpO1xuICAgICAgICAgICAgYiA9IG1kNV9oaChiLCBjLCBkLCBhLCB4W2kgKyAxMF0sIDIzLCAtMTA5NDczMDY0MCk7XG4gICAgICAgICAgICBhID0gbWQ1X2hoKGEsIGIsIGMsIGQsIHhbaSArIDEzXSwgIDQsICA2ODEyNzkxNzQpO1xuICAgICAgICAgICAgZCA9IG1kNV9oaChkLCBhLCBiLCBjLCB4W2ldLCAgICAgIDExLCAtMzU4NTM3MjIyKTtcbiAgICAgICAgICAgIGMgPSBtZDVfaGgoYywgZCwgYSwgYiwgeFtpICsgIDNdLCAxNiwgLTcyMjUyMTk3OSk7XG4gICAgICAgICAgICBiID0gbWQ1X2hoKGIsIGMsIGQsIGEsIHhbaSArICA2XSwgMjMsICA3NjAyOTE4OSk7XG4gICAgICAgICAgICBhID0gbWQ1X2hoKGEsIGIsIGMsIGQsIHhbaSArICA5XSwgIDQsIC02NDAzNjQ0ODcpO1xuICAgICAgICAgICAgZCA9IG1kNV9oaChkLCBhLCBiLCBjLCB4W2kgKyAxMl0sIDExLCAtNDIxODE1ODM1KTtcbiAgICAgICAgICAgIGMgPSBtZDVfaGgoYywgZCwgYSwgYiwgeFtpICsgMTVdLCAxNiwgIDUzMDc0MjUyMCk7XG4gICAgICAgICAgICBiID0gbWQ1X2hoKGIsIGMsIGQsIGEsIHhbaSArICAyXSwgMjMsIC05OTUzMzg2NTEpO1xuXG4gICAgICAgICAgICBhID0gbWQ1X2lpKGEsIGIsIGMsIGQsIHhbaV0sICAgICAgIDYsIC0xOTg2MzA4NDQpO1xuICAgICAgICAgICAgZCA9IG1kNV9paShkLCBhLCBiLCBjLCB4W2kgKyAgN10sIDEwLCAgMTEyNjg5MTQxNSk7XG4gICAgICAgICAgICBjID0gbWQ1X2lpKGMsIGQsIGEsIGIsIHhbaSArIDE0XSwgMTUsIC0xNDE2MzU0OTA1KTtcbiAgICAgICAgICAgIGIgPSBtZDVfaWkoYiwgYywgZCwgYSwgeFtpICsgIDVdLCAyMSwgLTU3NDM0MDU1KTtcbiAgICAgICAgICAgIGEgPSBtZDVfaWkoYSwgYiwgYywgZCwgeFtpICsgMTJdLCAgNiwgIDE3MDA0ODU1NzEpO1xuICAgICAgICAgICAgZCA9IG1kNV9paShkLCBhLCBiLCBjLCB4W2kgKyAgM10sIDEwLCAtMTg5NDk4NjYwNik7XG4gICAgICAgICAgICBjID0gbWQ1X2lpKGMsIGQsIGEsIGIsIHhbaSArIDEwXSwgMTUsIC0xMDUxNTIzKTtcbiAgICAgICAgICAgIGIgPSBtZDVfaWkoYiwgYywgZCwgYSwgeFtpICsgIDFdLCAyMSwgLTIwNTQ5MjI3OTkpO1xuICAgICAgICAgICAgYSA9IG1kNV9paShhLCBiLCBjLCBkLCB4W2kgKyAgOF0sICA2LCAgMTg3MzMxMzM1OSk7XG4gICAgICAgICAgICBkID0gbWQ1X2lpKGQsIGEsIGIsIGMsIHhbaSArIDE1XSwgMTAsIC0zMDYxMTc0NCk7XG4gICAgICAgICAgICBjID0gbWQ1X2lpKGMsIGQsIGEsIGIsIHhbaSArICA2XSwgMTUsIC0xNTYwMTk4MzgwKTtcbiAgICAgICAgICAgIGIgPSBtZDVfaWkoYiwgYywgZCwgYSwgeFtpICsgMTNdLCAyMSwgIDEzMDkxNTE2NDkpO1xuICAgICAgICAgICAgYSA9IG1kNV9paShhLCBiLCBjLCBkLCB4W2kgKyAgNF0sICA2LCAtMTQ1NTIzMDcwKTtcbiAgICAgICAgICAgIGQgPSBtZDVfaWkoZCwgYSwgYiwgYywgeFtpICsgMTFdLCAxMCwgLTExMjAyMTAzNzkpO1xuICAgICAgICAgICAgYyA9IG1kNV9paShjLCBkLCBhLCBiLCB4W2kgKyAgMl0sIDE1LCAgNzE4Nzg3MjU5KTtcbiAgICAgICAgICAgIGIgPSBtZDVfaWkoYiwgYywgZCwgYSwgeFtpICsgIDldLCAyMSwgLTM0MzQ4NTU1MSk7XG5cbiAgICAgICAgICAgIGEgPSBzYWZlX2FkZChhLCBvbGRhKTtcbiAgICAgICAgICAgIGIgPSBzYWZlX2FkZChiLCBvbGRiKTtcbiAgICAgICAgICAgIGMgPSBzYWZlX2FkZChjLCBvbGRjKTtcbiAgICAgICAgICAgIGQgPSBzYWZlX2FkZChkLCBvbGRkKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gW2EsIGIsIGMsIGRdO1xuICAgIH1cblxuICAgIC8qXG4gICAgKiBDb252ZXJ0IGFuIGFycmF5IG9mIGxpdHRsZS1lbmRpYW4gd29yZHMgdG8gYSBzdHJpbmdcbiAgICAqL1xuICAgIGZ1bmN0aW9uIGJpbmwycnN0cihpbnB1dCkge1xuICAgICAgICB2YXIgaSxcbiAgICAgICAgICAgIG91dHB1dCA9ICcnO1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgaW5wdXQubGVuZ3RoICogMzI7IGkgKz0gOCkge1xuICAgICAgICAgICAgb3V0cHV0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoKGlucHV0W2kgPj4gNV0gPj4+IChpICUgMzIpKSAmIDB4RkYpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvdXRwdXQ7XG4gICAgfVxuXG4gICAgLypcbiAgICAqIENvbnZlcnQgYSByYXcgc3RyaW5nIHRvIGFuIGFycmF5IG9mIGxpdHRsZS1lbmRpYW4gd29yZHNcbiAgICAqIENoYXJhY3RlcnMgPjI1NSBoYXZlIHRoZWlyIGhpZ2gtYnl0ZSBzaWxlbnRseSBpZ25vcmVkLlxuICAgICovXG4gICAgZnVuY3Rpb24gcnN0cjJiaW5sKGlucHV0KSB7XG4gICAgICAgIHZhciBpLFxuICAgICAgICAgICAgb3V0cHV0ID0gW107XG4gICAgICAgIG91dHB1dFsoaW5wdXQubGVuZ3RoID4+IDIpIC0gMV0gPSB1bmRlZmluZWQ7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBvdXRwdXQubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgICAgIG91dHB1dFtpXSA9IDA7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGlucHV0Lmxlbmd0aCAqIDg7IGkgKz0gOCkge1xuICAgICAgICAgICAgb3V0cHV0W2kgPj4gNV0gfD0gKGlucHV0LmNoYXJDb2RlQXQoaSAvIDgpICYgMHhGRikgPDwgKGkgJSAzMik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG91dHB1dDtcbiAgICB9XG5cbiAgICAvKlxuICAgICogQ2FsY3VsYXRlIHRoZSBNRDUgb2YgYSByYXcgc3RyaW5nXG4gICAgKi9cbiAgICBmdW5jdGlvbiByc3RyX21kNShzKSB7XG4gICAgICAgIHJldHVybiBiaW5sMnJzdHIoYmlubF9tZDUocnN0cjJiaW5sKHMpLCBzLmxlbmd0aCAqIDgpKTtcbiAgICB9XG5cbiAgICAvKlxuICAgICogQ2FsY3VsYXRlIHRoZSBITUFDLU1ENSwgb2YgYSBrZXkgYW5kIHNvbWUgZGF0YSAocmF3IHN0cmluZ3MpXG4gICAgKi9cbiAgICBmdW5jdGlvbiByc3RyX2htYWNfbWQ1KGtleSwgZGF0YSkge1xuICAgICAgICB2YXIgaSxcbiAgICAgICAgICAgIGJrZXkgPSByc3RyMmJpbmwoa2V5KSxcbiAgICAgICAgICAgIGlwYWQgPSBbXSxcbiAgICAgICAgICAgIG9wYWQgPSBbXSxcbiAgICAgICAgICAgIGhhc2g7XG4gICAgICAgIGlwYWRbMTVdID0gb3BhZFsxNV0gPSB1bmRlZmluZWQ7XG4gICAgICAgIGlmIChia2V5Lmxlbmd0aCA+IDE2KSB7XG4gICAgICAgICAgICBia2V5ID0gYmlubF9tZDUoYmtleSwga2V5Lmxlbmd0aCAqIDgpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCAxNjsgaSArPSAxKSB7XG4gICAgICAgICAgICBpcGFkW2ldID0gYmtleVtpXSBeIDB4MzYzNjM2MzY7XG4gICAgICAgICAgICBvcGFkW2ldID0gYmtleVtpXSBeIDB4NUM1QzVDNUM7XG4gICAgICAgIH1cbiAgICAgICAgaGFzaCA9IGJpbmxfbWQ1KGlwYWQuY29uY2F0KHJzdHIyYmlubChkYXRhKSksIDUxMiArIGRhdGEubGVuZ3RoICogOCk7XG4gICAgICAgIHJldHVybiBiaW5sMnJzdHIoYmlubF9tZDUob3BhZC5jb25jYXQoaGFzaCksIDUxMiArIDEyOCkpO1xuICAgIH1cblxuICAgIC8qXG4gICAgKiBDb252ZXJ0IGEgcmF3IHN0cmluZyB0byBhIGhleCBzdHJpbmdcbiAgICAqL1xuICAgIGZ1bmN0aW9uIHJzdHIyaGV4KGlucHV0KSB7XG4gICAgICAgIHZhciBoZXhfdGFiID0gJzAxMjM0NTY3ODlhYmNkZWYnLFxuICAgICAgICAgICAgb3V0cHV0ID0gJycsXG4gICAgICAgICAgICB4LFxuICAgICAgICAgICAgaTtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGlucHV0Lmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgICB4ID0gaW5wdXQuY2hhckNvZGVBdChpKTtcbiAgICAgICAgICAgIG91dHB1dCArPSBoZXhfdGFiLmNoYXJBdCgoeCA+Pj4gNCkgJiAweDBGKSArXG4gICAgICAgICAgICAgICAgaGV4X3RhYi5jaGFyQXQoeCAmIDB4MEYpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvdXRwdXQ7XG4gICAgfVxuXG4gICAgLypcbiAgICAqIEVuY29kZSBhIHN0cmluZyBhcyB1dGYtOFxuICAgICovXG4gICAgZnVuY3Rpb24gc3RyMnJzdHJfdXRmOChpbnB1dCkge1xuICAgICAgICByZXR1cm4gdW5lc2NhcGUoZW5jb2RlVVJJQ29tcG9uZW50KGlucHV0KSk7XG4gICAgfVxuXG4gICAgLypcbiAgICAqIFRha2Ugc3RyaW5nIGFyZ3VtZW50cyBhbmQgcmV0dXJuIGVpdGhlciByYXcgb3IgaGV4IGVuY29kZWQgc3RyaW5nc1xuICAgICovXG4gICAgZnVuY3Rpb24gcmF3X21kNShzKSB7XG4gICAgICAgIHJldHVybiByc3RyX21kNShzdHIycnN0cl91dGY4KHMpKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gaGV4X21kNShzKSB7XG4gICAgICAgIHJldHVybiByc3RyMmhleChyYXdfbWQ1KHMpKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gcmF3X2htYWNfbWQ1KGssIGQpIHtcbiAgICAgICAgcmV0dXJuIHJzdHJfaG1hY19tZDUoc3RyMnJzdHJfdXRmOChrKSwgc3RyMnJzdHJfdXRmOChkKSk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGhleF9obWFjX21kNShrLCBkKSB7XG4gICAgICAgIHJldHVybiByc3RyMmhleChyYXdfaG1hY19tZDUoaywgZCkpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1kNShzdHJpbmcsIGtleSwgcmF3KSB7XG4gICAgICAgIGlmICgha2V5KSB7XG4gICAgICAgICAgICBpZiAoIXJhdykge1xuICAgICAgICAgICAgICAgIHJldHVybiBoZXhfbWQ1KHN0cmluZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcmF3X21kNShzdHJpbmcpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghcmF3KSB7XG4gICAgICAgICAgICByZXR1cm4gaGV4X2htYWNfbWQ1KGtleSwgc3RyaW5nKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmF3X2htYWNfbWQ1KGtleSwgc3RyaW5nKTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgICAgIGRlZmluZShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gbWQ1O1xuICAgICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICAkLm1kNSA9IG1kNTtcbiAgICB9XG59KHRoaXMpKTtcbiIsIlxuXG5tb2R1bGUuZXhwb3J0cy5kZWN5Y2xlT2JqZWN0ID0gZnVuY3Rpb24gKG9iamVjdCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuLy8gTWFrZSBhIGRlZXAgY29weSBvZiBhbiBvYmplY3Qgb3IgYXJyYXksIGFzc3VyaW5nIHRoYXQgdGhlcmUgaXMgYXQgbW9zdFxuLy8gb25lIGluc3RhbmNlIG9mIGVhY2ggb2JqZWN0IG9yIGFycmF5IGluIHRoZSByZXN1bHRpbmcgc3RydWN0dXJlLiBUaGVcbi8vIGR1cGxpY2F0ZSByZWZlcmVuY2VzICh3aGljaCBtaWdodCBiZSBmb3JtaW5nIGN5Y2xlcykgYXJlIHJlcGxhY2VkIHdpdGhcbi8vIGFuIG9iamVjdCBvZiB0aGUgZm9ybVxuLy8gICAgICB7JHJlZjogUEFUSH1cbi8vIHdoZXJlIHRoZSBQQVRIIGlzIGEgSlNPTlBhdGggc3RyaW5nIHRoYXQgbG9jYXRlcyB0aGUgZmlyc3Qgb2NjdXJhbmNlLlxuLy8gU28sXG4vLyAgICAgIHZhciBhID0gW107XG4vLyAgICAgIGFbMF0gPSBhO1xuLy8gICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoSlNPTi5kZWN5Y2xlKGEpKTtcbi8vIHByb2R1Y2VzIHRoZSBzdHJpbmcgJ1t7XCIkcmVmXCI6XCIkXCJ9XScuXG5cbi8vIEpTT05QYXRoIGlzIHVzZWQgdG8gbG9jYXRlIHRoZSB1bmlxdWUgb2JqZWN0LiAkIGluZGljYXRlcyB0aGUgdG9wIGxldmVsIG9mXG4vLyB0aGUgb2JqZWN0IG9yIGFycmF5LiBbTlVNQkVSXSBvciBbU1RSSU5HXSBpbmRpY2F0ZXMgYSBjaGlsZCBtZW1iZXIgb3Jcbi8vIHByb3BlcnR5LlxuXG4gICAgdmFyIG9iamVjdHMgPSBbXSwgICAvLyBLZWVwIGEgcmVmZXJlbmNlIHRvIGVhY2ggdW5pcXVlIG9iamVjdCBvciBhcnJheVxuICAgICAgICBwYXRocyA9IFtdOyAgICAgLy8gS2VlcCB0aGUgcGF0aCB0byBlYWNoIHVuaXF1ZSBvYmplY3Qgb3IgYXJyYXlcblxuICAgIHJldHVybiAoZnVuY3Rpb24gZGVyZXoodmFsdWUsIHBhdGgpIHtcblxuLy8gVGhlIGRlcmV6IHJlY3Vyc2VzIHRocm91Z2ggdGhlIG9iamVjdCwgcHJvZHVjaW5nIHRoZSBkZWVwIGNvcHkuXG5cbiAgICAgICAgdmFyIGksICAgICAgICAgIC8vIFRoZSBsb29wIGNvdW50ZXJcbiAgICAgICAgICAgIG5hbWUsICAgICAgIC8vIFByb3BlcnR5IG5hbWVcbiAgICAgICAgICAgIG51OyAgICAgICAgIC8vIFRoZSBuZXcgb2JqZWN0IG9yIGFycmF5XG5cbi8vIHR5cGVvZiBudWxsID09PSAnb2JqZWN0Jywgc28gZ28gb24gaWYgdGhpcyB2YWx1ZSBpcyByZWFsbHkgYW4gb2JqZWN0IGJ1dCBub3Rcbi8vIG9uZSBvZiB0aGUgd2VpcmQgYnVpbHRpbiBvYmplY3RzLlxuXG4gICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmIHZhbHVlICE9PSBudWxsICYmXG4gICAgICAgICAgICAgICAgISh2YWx1ZSBpbnN0YW5jZW9mIEJvb2xlYW4pICYmXG4gICAgICAgICAgICAgICAgISh2YWx1ZSBpbnN0YW5jZW9mIERhdGUpICAgICYmXG4gICAgICAgICAgICAgICAgISh2YWx1ZSBpbnN0YW5jZW9mIE51bWJlcikgICYmXG4gICAgICAgICAgICAgICAgISh2YWx1ZSBpbnN0YW5jZW9mIFJlZ0V4cCkgICYmXG4gICAgICAgICAgICAgICAgISh2YWx1ZSBpbnN0YW5jZW9mIFN0cmluZykpIHtcblxuLy8gSWYgdGhlIHZhbHVlIGlzIGFuIG9iamVjdCBvciBhcnJheSwgbG9vayB0byBzZWUgaWYgd2UgaGF2ZSBhbHJlYWR5XG4vLyBlbmNvdW50ZXJlZCBpdC4gSWYgc28sIHJldHVybiBhICRyZWYvcGF0aCBvYmplY3QuIFRoaXMgaXMgYSBoYXJkIHdheSxcbi8vIGxpbmVhciBzZWFyY2ggdGhhdCB3aWxsIGdldCBzbG93ZXIgYXMgdGhlIG51bWJlciBvZiB1bmlxdWUgb2JqZWN0cyBncm93cy5cbiAgICAgICAgICAgIGlmICggdmFsdWUudGFnTmFtZSApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyRlbDogdmFsdWUudGFnTmFtZSArICcjJyArIHZhbHVlLmlkICsgJy4nICsgdmFsdWUuY2xhc3NOYW1lfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IG9iamVjdHMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgICAgICAgICBpZiAob2JqZWN0c1tpXSA9PT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHskcmVmOiBwYXRoc1tpXX07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4vLyBPdGhlcndpc2UsIGFjY3VtdWxhdGUgdGhlIHVuaXF1ZSB2YWx1ZSBhbmQgaXRzIHBhdGguXG5cbiAgICAgICAgICAgIG9iamVjdHMucHVzaCh2YWx1ZSk7XG4gICAgICAgICAgICBwYXRocy5wdXNoKHBhdGgpO1xuXG4vLyBJZiBpdCBpcyBhbiBhcnJheSwgcmVwbGljYXRlIHRoZSBhcnJheS5cblxuICAgICAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuYXBwbHkodmFsdWUpID09PSAnW29iamVjdCBBcnJheV0nKSB7XG4gICAgICAgICAgICAgICAgbnUgPSBbXTtcbiAgICAgICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgdmFsdWUubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgbnVbaV0gPSBkZXJleih2YWx1ZVtpXSwgcGF0aCArICdbJyArIGkgKyAnXScpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG5cbi8vIElmIGl0IGlzIGFuIG9iamVjdCwgcmVwbGljYXRlIHRoZSBvYmplY3QuXG5cbiAgICAgICAgICAgICAgICBudSA9IHt9O1xuICAgICAgICAgICAgICAgIGZvciAobmFtZSBpbiB2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHZhbHVlLCBuYW1lKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbnVbbmFtZV0gPSBkZXJleih2YWx1ZVtuYW1lXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXRoICsgJ1snICsgSlNPTi5zdHJpbmdpZnkobmFtZSkgKyAnXScpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG51O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9KG9iamVjdCwgJyQnKSk7XG59O1xuIiwiXG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSggJ2V2ZW50ZW1pdHRlcjInICkuRXZlbnRFbWl0dGVyMjtcblxubW9kdWxlLmV4cG9ydHMuWW1pciA9IFltaXI7XG5cbmZ1bmN0aW9uIFltaXIoIG9wdGlvbnMgKSB7IFxuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgRXZlbnRFbWl0dGVyLmNhbGwoIHRoaXMgKTtcbiAgICB0aGlzLnZpZXdzID0ge307XG4gICAgdGhpcy5saXN0ID0gb3B0aW9ucy5saXN0RWwgfHwgZG9jdW1lbnQuY3JlYXRlRWxlbWVudCggb3B0aW9ucy5saXN0VGFnTmFtZSB8fCAnbmF2JyApO1xuICAgIHRoaXMuZWwgPSBvcHRpb25zLmVsIHx8IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoIG9wdGlvbnMudGFnTmFtZSAgfHwgJ2RpdicgKTtcbiAgICB0aGlzLmVsLmNsYXNzTmFtZSA9IG9wdGlvbnMuY2xhc3NOYW1lO1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgdGhpcy5vcHRpb25zLnNob3dDbGFzcyA9IG9wdGlvbnMuc2hvd0NsYXNzIHx8ICdzaG93JztcbiAgICB0aGlzLl9pc0R5bmFtaWMgPSBvcHRpb25zLmR5bmFtaWMgPT09IGZhbHNlID8gZmFsc2UgOiB0cnVlO1xufVxuXG5ZbWlyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoIEV2ZW50RW1pdHRlci5wcm90b3R5cGUsIHtcbiAgICB2aWV3TGlzdDoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCApIHtcbiAgICAgICAgICAgIHJldHVybiBPYmplY3Qua2V5cyggdGhpcy52aWV3cyApLm1hcCggdGhpcy5fbWFwVmlld3MuYmluZCggdGhpcyApICk7XG4gICAgICAgIH1cbiAgICB9XG59ICk7XG5cblltaXIucHJvdG90eXBlLmFkZFZpZXcgPSBmdW5jdGlvbiggdmlldyApIHtcbiAgICB2YXIgaXNWaWV3ID0gWW1pci5pc1ZpZXcoIHZpZXcgKTtcbiAgICBpZiAoICFpc1ZpZXcgKXtcbiAgICAgICAgdGhpcy5lbWl0KCAnZXJyb3InLCBuZXcgRXJyb3IoICdJc3N1ZSBhZGRpbmcgdmlldzogaW52YWxpZCB2aWV3JyApICk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYgKCB0aGlzLnZpZXdzWyB2aWV3LmlkIF0gKSB7XG4gICAgICAgIHRoaXMuZW1pdCggJ2Vycm9yJywgbmV3IEVycm9yKCAnSXNzdWUgYWRkaW5nIHZpZXcgd2l0aCB0aGUgaWQgJyArIHZpZXcuaWQgKyAnOiBkdXBsaWNhdGUgaWQnICkgKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0gXG4gICAgaWYgKCB0aGlzLl9pc0R5bmFtaWMgKSB7XG4gICAgICAgIHRoaXMuZWwuYXBwZW5kQ2hpbGQoIHZpZXcuZWwgKTtcbiAgICAgICAgaWYgKCB2aWV3Lmxpbmt0byAhPT0gZmFsc2UgKSB7XG4gICAgICAgICAgICB0aGlzLl9hcHBlbmRUb0xpc3QoIHZpZXcgKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB0aGlzLnZpZXdzWyB2aWV3LmlkIF0gPSB2aWV3O1xuICAgIGlmICggdmlldy5lbC5jbGFzc0xpc3QuY29udGFpbnMoIHRoaXMub3B0aW9ucy5zaG93Q2xhc3MgKSApIHtcbiAgICAgICAgdmlldy5pc1Nob3duID0gZmFsc2U7XG4gICAgICAgIHZpZXcuZWwuY2xhc3NMaXN0LnJlbW92ZSggdGhpcy5vcHRpb25zLnNob3dDbGFzcyApO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cblltaXIucHJvdG90eXBlLnJlbW92ZVZpZXcgPSBmdW5jdGlvbiggaWQgKSB7XG4gICAgdmFyIHZpZXcgPSB0aGlzLnZpZXdzWyBpZCBdLFxuICAgICAgICBsaW5rO1xuXG4gICAgaWYgKCAhdmlldyApIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBpZiAoIHRoaXMuX2lzRHluYW1pYyApIHtcbiAgICAgICAgdGhpcy5lbC5yZW1vdmVDaGlsZCggdmlldy5lbCApO1xuICAgICAgICBpZiAoIHZpZXcubGlua3RvICE9PSBmYWxzZSApIHtcbiAgICAgICAgICAgIGxpbmsgPSB0aGlzLmxpc3QucXVlcnlTZWxlY3RvciggJ1tkYXRhLWxpbmt0bz0nICsgdmlldy5pZCArICddJyApO1xuICAgICAgICAgICAgdGhpcy5saXN0LnJlbW92ZUNoaWxkKCBsaW5rICk7ICAgICAgICBcbiAgICAgICAgfVxuICAgIH1cbiAgICBkZWxldGUgdGhpcy52aWV3c1sgaWQgXTtcbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cblltaXIucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbiggaWQgKSB7XG4gICAgdmFyIHZpZXc7XG4gICAgaWYgKCBpZCAmJiB0aGlzLnZpZXdzWyBpZCBdICkge1xuICAgICAgICB2aWV3ID0gdGhpcy52aWV3c1sgaWQgXTtcbiAgICAgICAgaWYgKCB2aWV3LmlzU2hvd24gKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdmlldy5pc1Nob3duID0gdHJ1ZTtcbiAgICAgICAgdmlldy5lbC5jbGFzc0xpc3QuYWRkKCB0aGlzLm9wdGlvbnMuc2hvd0NsYXNzICk7XG4gICAgICAgIHRoaXMuX2Nsb3NlVmlld3MoIGlkICk7XG4gICAgfVxufTtcblxuWW1pci5wcm90b3R5cGUuX2Nsb3NlVmlld3MgPSBmdW5jdGlvbiggaWQgKSB7XG4gICAgICBcbiAgICB2YXIgc2hvd0NsYXNzID0gdGhpcy5vcHRpb25zLnNob3dDbGFzcyB8fCAnc2hvdyc7XG4gICAgZnVuY3Rpb24gZWFjaFZpZXcoIHZpZXcgKSB7XG4gICAgICAgIGlmICggdmlldy5pc1Nob3duICYmIHZpZXcuaWQgIT09IGlkICkge1xuICAgICAgICAgICAgdmlldy5lbC5jbGFzc0xpc3QucmVtb3ZlKCBzaG93Q2xhc3MgKTtcbiAgICAgICAgICAgIHZpZXcuaXNTaG93biA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy52aWV3TGlzdC5mb3JFYWNoKCBlYWNoVmlldyApOyAgXG59O1xuXG5ZbWlyLnByb3RvdHlwZS5fbWFwVmlld3MgPSBmdW5jdGlvbiggdmlld05hbWUgKSB7XG4gICAgcmV0dXJuIHRoaXMudmlld3NbIHZpZXdOYW1lIF07XG59O1xuXG5ZbWlyLnByb3RvdHlwZS5fYXBwZW5kVG9MaXN0ID0gZnVuY3Rpb24oIHZpZXcgKSB7XG4gICAgdmFyIGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCggdGhpcy5vcHRpb25zLmxpc3RJdGVtVGFnTmFtZSB8fCAnZGl2JyApO1xuICAgIGVsLmlubmVySFRNTCA9IHZpZXcuaWQ7XG4gICAgZWwuc2V0QXR0cmlidXRlKCAnZGF0YS1saW5rdG8nLCB2aWV3LmlkICk7XG4gICAgZWwuYWRkRXZlbnRMaXN0ZW5lciggJ2NsaWNrJywgdGhpcy5vcGVuLmJpbmQoIHRoaXMsIHZpZXcuaWQgKSApOyBcbiAgICB0aGlzLmxpc3QuYXBwZW5kQ2hpbGQoIGVsICk7XG59O1xuXG5ZbWlyLmlzVmlldyA9IGZ1bmN0aW9uKCB2aWV3ICkge1xuICAgIHJldHVybiB2aWV3ICYmIFxuICAgICAgICB0eXBlb2YgdmlldyA9PT0gJ29iamVjdCcgJiYgXG4gICAgICAgIHR5cGVvZiB2aWV3LmVsID09PSAnb2JqZWN0JyAmJiBcbiAgICAgICAgdmlldy5lbC50YWdOYW1lICYmXG4gICAgICAgIHZpZXcuaWQ7IC8vIHRlc3QgYWxsIHJlcXVpcmVtZW50cyBvZiBhIHZpZXdcbn07XG4iLCIvKlxuICogU2lkZWJhciBWaWV3XG4gKi9cblxuLyogZ2xvYmFsIHJlcXVpcmUsIG1vZHVsZSAqL1xuLyoganNoaW50IC1XMDk3ICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCAnZXZlbnRlbWl0dGVyMicgKS5FdmVudEVtaXR0ZXIyLFxuICAgIGV4dGVuZCA9IHJlcXVpcmUoICdleHRlbmQnICk7XG5cbm1vZHVsZS5leHBvcnRzID0gU2lkZWJhclZpZXc7XG5cbnZhciBkZWZhdWx0cyA9IHtcbiAgICBhdXRvZm9jdXM6IHRydWUsXG4gICAgYmFjazogdHJ1ZVxufTtcblxuZnVuY3Rpb24gU2lkZWJhclZpZXcoIHRlbXBsYXRlLCBvcHRpb25zICkge1xuICAgIGlmICggIXRlbXBsYXRlICkge1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgIEV2ZW50RW1pdHRlci5jYWxsKCB0aGlzICk7XG4gICAgdGhpcy5fYmVoYXZpb3JzID0ge307XG4gICAgdGhpcy5fdGVtcGxhdGUgPSAnJyArIHRlbXBsYXRlO1xuICAgIHRoaXMuaWQgPSBvcHRpb25zLnRpdGxlO1xuICAgIHRoaXMuZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCAnZGl2JyApO1xuICAgIHRoaXMuZWwuY2xhc3NMaXN0LmFkZCggJ3NpZGViYXItdmlldycgKTtcbiAgICB0aGlzLmVsLnNldEF0dHJpYnV0ZSggJ2RhdGEtdmlldy1pZCcsIHRoaXMuaWQgKTtcbiAgICB0aGlzLl9hdHRhY2hMaXN0ZW5lcnMoKTtcbiAgICB0aGlzLnNldE9wdGlvbnMoIG9wdGlvbnMgKTtcbiAgICB0aGlzLnNldENvbnRlbnQoIG9wdGlvbnMuZGF0YSwgdGhpcy5lbWl0LmJpbmQoIHRoaXMsICdyZWFkeScsIHRoaXMgKSApO1xufVxuXG5TaWRlYmFyVmlldy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKCBFdmVudEVtaXR0ZXIucHJvdG90eXBlLCB7XG4gICAgaXNTaG93bjoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9pc1Nob3duOyBcbiAgICAgICAgfSxcbiAgICAgICAgc2V0OiBmdW5jdGlvbiggdmFsdWUgKSB7IFxuICAgICAgICAgICAgaWYgKCB2YWx1ZSApIHtcbiAgICAgICAgICAgICAgICB0aGlzLmVtaXQoICdvcGVuOnNob3duJyApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5faXNTaG93biA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgfVxufSApO1xuXG5TaWRlYmFyVmlldy5wcm90b3R5cGUuc2V0Q3VycmVudCA9XG4gICAgU2lkZWJhclZpZXcucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbiggZSApIHtcbiAgICAgICAgdGhpcy5lbWl0KCAnb3BlbicsIHRoaXMsIGUgKTtcbiAgICAgICAgdGhpcy5vbmNlKCAnYW5pbWF0aW9uOmNvbXBsZXRlJywgdGhpcy5vbkFuaW1hdGlvbkNvbXBsZXRlLmJpbmQoIHRoaXMgKSk7XG59O1xuXG5TaWRlYmFyVmlldy5wcm90b3R5cGUub25BbmltYXRpb25Db21wbGV0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICggdGhpcy5vcHRpb25zLmF1dG9mb2N1cyApIHtcbiAgICAgICAgdmFyIGVsID0gdGhpcy5lbC5xdWVyeVNlbGVjdG9yKCAndGV4dGFyZWEsIGlucHV0JyApO1xuICAgICAgICBpZiggZWwgKXtcbiAgICAgICAgICAgIGVsLmZvY3VzKCk7XG4gICAgICAgICAgICBlbC5zZWxlY3QoKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cblNpZGViYXJWaWV3LnByb3RvdHlwZS5vblJlbmRlcmVkID0gZnVuY3Rpb24oIGNhbGxiYWNrICkge1xuICAgIGlmICggY2FsbGJhY2sgKSB7XG4gICAgICAgIGNhbGxiYWNrKCk7XG4gICAgfVxuICAgIHRoaXMuZW1pdCggJ3JlbmRlcmVkJywgdGhpcyApO1xuICAgIHRoaXMuZ2V0VGFiYWJsZUVscygpO1xufTtcblxuU2lkZWJhclZpZXcucHJvdG90eXBlLmdldFRhYmFibGVFbHMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgbGFzdCxcbiAgICAgICAgZmlyc3Q7XG4gICAgdGhpcy50YWJhbGVzID0gdGhpcy5lbC5xdWVyeVNlbGVjdG9yQWxsKCAnaW5wdXQsIHRleHRhcmVhJyApO1xuICAgIHRoaXMudGFiYWxlcyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKCB0aGlzLnRhYmFsZXMsIDAgKTtcbiAgICB0aGlzLnRhYmFsZXMuZm9yRWFjaCggZnVuY3Rpb24oIHRhYmFibGUsIGluZGV4ICkge1xuICAgICAgICBpZiAoIGluZGV4ID09PSAwICkge1xuICAgICAgICAgICAgZmlyc3QgPSB0YWJhYmxlO1xuICAgICAgICB9XG4gICAgICAgIHRhYmFibGUuc2V0QXR0cmlidXRlKCAndGFiLWluZGV4JywgaW5kZXggKTtcbiAgICAgICAgbGFzdCA9IHRhYmFibGU7XG4gICAgfSApO1xuICAgIGlmICggIWxhc3QgKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgbGFzdC5hZGRFdmVudExpc3RlbmVyKCAna2V5ZG93bicsIGZ1bmN0aW9uKCBlICkge1xuICAgICAgICB2YXIga2V5Q29kZSA9IGUua2V5Q29kZSB8fCBlLndoaWNoO1xuICAgICAgICBpZiAoIGtleUNvZGUgPT09IDkgKSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBmaXJzdC5mb2N1cygpO1xuICAgICAgICB9XG4gICAgfSApO1xufTtcblxuU2lkZWJhclZpZXcucHJvdG90eXBlLnNldENvbnRlbnQgPSBmdW5jdGlvbiggZGF0YSwgY2FsbGJhY2sgKSB7XG4gICAgaWYgKCB0eXBlb2YgZGF0YSA9PT0gJ2Z1bmN0aW9uJyApIHtcbiAgICAgICAgY2FsbGJhY2sgPSBkYXRhO1xuICAgIH1cbiAgICBjYWxsYmFjayA9IGNhbGxiYWNrIHx8IGZ1bmN0aW9uKCkge307XG4gICAgaWYgKCB0eXBlb2YgdGhpcy5yZW5kZXIgPT09ICdmdW5jdGlvbicgKSB7XG4gICAgICAgIHRoaXMuX2RhdGEgPSBkYXRhO1xuICAgICAgICB0aGlzLnJlbmRlciggdGhpcy5fdGVtcGxhdGUsIGRhdGEgfHwge30sIGZ1bmN0aW9uKCBlcnIsIGh0bWwgKSB7XG4gICAgICAgICAgICBpZiAoIGVyciApIHJldHVybiB0aGlzLmVtaXQoICdlcnJvcicsIGVyciwgdGhpcyApO1xuICAgICAgICAgICAgdGhpcy5lbC5pbm5lckhUTUwgPSBodG1sO1xuICAgICAgICAgICAgc2V0VGltZW91dCggdGhpcy5vblJlbmRlcmVkLmJpbmQoIHRoaXMsIGNhbGxiYWNrICksIDAgKTtcbiAgICAgICAgfS5iaW5kKCB0aGlzICkgKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHRoaXMuZWwuaW5uZXJIVE1MID0gdGhpcy5fdGVtcGxhdGU7XG4gICAgc2V0VGltZW91dCggdGhpcy5vblJlbmRlcmVkLmJpbmQoIHRoaXMsIGNhbGxiYWNrICksIDAgKTtcbn07XG5cblNpZGViYXJWaWV3LnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uKCBlICkge1xuICAgIHRoaXMuZWwuY2xhc3NMaXN0LnJlbW92ZSggJ3Nob3cnICk7XG4gICAgdGhpcy5lbC5pc09wZW4gPSBmYWxzZTtcbiAgICB0aGlzLmVtaXQoICdjbG9zZScsIHRoaXMsIGUgKTtcbn07XG5cblNpZGViYXJWaWV3LnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbigpIHtcbiAgICAvLyB0aGlzIGhlbHBzIGNsZWFuIHVwIHN0YXRlXG4gICAgdGhpcy5lbWl0KCAnY2xvc2UnLCB0aGlzICk7XG4gICAgdGhpcy5lbWl0KCAncmVtb3ZlJywgdGhpcyApO1xuICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCk7XG59O1xuXG5TaWRlYmFyVmlldy5wcm90b3R5cGUuaXNWaXNpYmxlID1cbiAgICBTaWRlYmFyVmlldy5wcm90b3R5cGUuaXNDdXJyZW50ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIHRoaXMgc2hvdWxkIGJlIGFjY3VyYXRlIGluIHRoZSBjdXJyZW50IHN5c3RlbVxuICAgICAgICAvLyBtYXkgbmVlZCB0byBnZXQgcmVmZXJhbmNlIHRvIF9zdXBlclxuICAgICAgICByZXR1cm4gdGhpcy5lbC5jbGFzc0xpc3QuY29udGFpbnMoICdzaG93JyApO1xufTtcblxuU2lkZWJhclZpZXcucHJvdG90eXBlLnNldE9wdGlvbnMgPSBmdW5jdGlvbiggb3B0aW9ucyApIHtcbiAgICB2YXIgZWxzO1xuICAgIHRoaXMub3B0aW9ucyA9IGV4dGVuZCggdHJ1ZSwge30sIHRoaXMub3B0aW9ucyB8fCBkZWZhdWx0cywgb3B0aW9ucyApO1xuICAgIHRoaXMuc2V0UGFyZW50VmlldyggdGhpcy5vcHRpb25zLnBhcmVudCApO1xuICAgIHRoaXMubGlua3RvID0gb3B0aW9ucy5saW5rdG87XG59O1xuXG5TaWRlYmFyVmlldy5wcm90b3R5cGUuc2V0UGFyZW50VmlldyA9IGZ1bmN0aW9uKCBwYXJlbnQgKSB7XG4gICAgdGhpcy5fcGFyZW50VmlldyA9IHBhcmVudDtcbn07XG5cbi8vIHRoaXMgaXMgZm9yIHRoZSBjc3MzIGFuaW1hdGlvbnNcblNpZGViYXJWaWV3LnByb3RvdHlwZS5fYXR0YWNoTGlzdGVuZXJzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGhhbmRsZSA9IHRoaXMuZW1pdC5iaW5kKCB0aGlzLCAnYW5pbWF0aW9uOmNvbXBsZXRlJyApO1xuICAgIFxuICAgIHRoaXMuZWwuYWRkRXZlbnRMaXN0ZW5lciggJ3dlYmtpdEFuaW1hdGlvbkVuZCcsIGhhbmRsZSwgZmFsc2UgKTtcbiAgICB0aGlzLmVsLmFkZEV2ZW50TGlzdGVuZXIoICdvQW5pbWF0aW9uRW5kJywgaGFuZGxlLCBmYWxzZSApO1xuICAgIHRoaXMuZWwuYWRkRXZlbnRMaXN0ZW5lciggJ2FuaW1hdGlvbmVuZCcsIGhhbmRsZSwgZmFsc2UgKTtcbiAgICB0aGlzLmVsLmFkZEV2ZW50TGlzdGVuZXIoICdtc0FuaW1hdGlvbkVuZCcsIGhhbmRsZSwgZmFsc2UgKTtcbn07XG4iXX0=
