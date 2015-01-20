(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var sidebar = new (require('..')),
    emit = require('emit-bindings');
sidebar.init();

var view1html = 
'<ul>' +
    '<li data-emit="open.view2">' + 
        'Go to another view' +
    '</li>' +
    '<li data-emit="sidebar.close">' + 
        'Hide the scrollbar' +
    '</li>' +
'</ul>';
var view2html = 
'<ul>' +
    '<li data-emit="open.view3">' + 
        'We must go deeper.' +
    '</li>'
'</ul>';
var view3html = 
'<ul>' +
    '<li>' + 
        'Yeah Another View' +
    '</li>'
'</ul>';


var view1 = sidebar.addView( view1html, {
    title: 'Hello',
    menuBehaviors: [{
        label: 'Hide',
        behavior: 'sidebar.close',
        position: 'left'
    }],
    home: true
});
var view2 = sidebar.addView( view2html, {
    title: 'Child',
    home: true,
    parent: view1
});
var view3 = sidebar.addView( view3html, {
    title: 'Child Child',
    home: true,
    parent: view2
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
    view.on( 'open', this._onViewOpening.bind( this, view ) );
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
    this.viewManager.open( view.id );
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

SidebarView.prototype = Object.create( EventEmitter.prototype );

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJleGFtcGxlcy9pbmRleC5qcyIsImluZGV4LmpzIiwibm9kZV9tb2R1bGVzL2VtaXQtYmluZGluZ3MvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZXZlbnRlbWl0dGVyMi9saWIvZXZlbnRlbWl0dGVyMi5qcyIsIm5vZGVfbW9kdWxlcy9leHRlbmQvaW5kZXguanMiLCJub2RlX21vZHVsZXMveW1pci9pbmRleC5qcyIsInZpZXcuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1U0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDalVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIHNpZGViYXIgPSBuZXcgKHJlcXVpcmUoJy4uJykpLFxuICAgIGVtaXQgPSByZXF1aXJlKCdlbWl0LWJpbmRpbmdzJyk7XG5zaWRlYmFyLmluaXQoKTtcblxudmFyIHZpZXcxaHRtbCA9IFxuJzx1bD4nICtcbiAgICAnPGxpIGRhdGEtZW1pdD1cIm9wZW4udmlldzJcIj4nICsgXG4gICAgICAgICdHbyB0byBhbm90aGVyIHZpZXcnICtcbiAgICAnPC9saT4nICtcbiAgICAnPGxpIGRhdGEtZW1pdD1cInNpZGViYXIuY2xvc2VcIj4nICsgXG4gICAgICAgICdIaWRlIHRoZSBzY3JvbGxiYXInICtcbiAgICAnPC9saT4nICtcbic8L3VsPic7XG52YXIgdmlldzJodG1sID0gXG4nPHVsPicgK1xuICAgICc8bGkgZGF0YS1lbWl0PVwib3Blbi52aWV3M1wiPicgKyBcbiAgICAgICAgJ1dlIG11c3QgZ28gZGVlcGVyLicgK1xuICAgICc8L2xpPidcbic8L3VsPic7XG52YXIgdmlldzNodG1sID0gXG4nPHVsPicgK1xuICAgICc8bGk+JyArIFxuICAgICAgICAnWWVhaCBBbm90aGVyIFZpZXcnICtcbiAgICAnPC9saT4nXG4nPC91bD4nO1xuXG5cbnZhciB2aWV3MSA9IHNpZGViYXIuYWRkVmlldyggdmlldzFodG1sLCB7XG4gICAgdGl0bGU6ICdIZWxsbycsXG4gICAgbWVudUJlaGF2aW9yczogW3tcbiAgICAgICAgbGFiZWw6ICdIaWRlJyxcbiAgICAgICAgYmVoYXZpb3I6ICdzaWRlYmFyLmNsb3NlJyxcbiAgICAgICAgcG9zaXRpb246ICdsZWZ0J1xuICAgIH1dLFxuICAgIGhvbWU6IHRydWVcbn0pO1xudmFyIHZpZXcyID0gc2lkZWJhci5hZGRWaWV3KCB2aWV3Mmh0bWwsIHtcbiAgICB0aXRsZTogJ0NoaWxkJyxcbiAgICBob21lOiB0cnVlLFxuICAgIHBhcmVudDogdmlldzFcbn0pO1xudmFyIHZpZXczID0gc2lkZWJhci5hZGRWaWV3KCB2aWV3M2h0bWwsIHtcbiAgICB0aXRsZTogJ0NoaWxkIENoaWxkJyxcbiAgICBob21lOiB0cnVlLFxuICAgIHBhcmVudDogdmlldzJcbn0pO1xuLy8gb3BlbmluZyB1cCB2aWV3IHdoZW4gZXZlbnQgaXMgZW1pdHRlZFxuZW1pdC5vbiggJ29wZW4udmlldzInLCB2aWV3Mi5vcGVuLmJpbmQoIHZpZXcyICkgKTtcbmVtaXQub24oICdvcGVuLnZpZXczJywgdmlldzMub3Blbi5iaW5kKCB2aWV3MyApICk7XG5zaWRlYmFyLm9wZW4oICk7IiwiLypcbiAqIFNpZGViYXIgLSBNYW5hZ2VzIHNpZGViYXIgJiBzaWRlYmFyIHZpZXdzXG4gKi9cbi8qIGdsb2JhbCBFdmVudCwgcmVxdWlyZSwgbW9kdWxlICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCAnZXZlbnRlbWl0dGVyMicgKS5FdmVudEVtaXR0ZXIyLFxuICAgIGVtaXQgPSByZXF1aXJlKCAnZW1pdC1iaW5kaW5ncycgKSxcbiAgICBZbWlyID0gcmVxdWlyZSggJ3ltaXInICkuWW1pcixcbiAgICBTaWRlYmFyVmlldyA9IHJlcXVpcmUoICcuL3ZpZXcnICk7XG5cbm1vZHVsZS5leHBvcnRzID0gU2lkZWJhcjtcbm1vZHVsZS5leHBvcnRzLlNpZGViYXJWaWV3ID0gU2lkZWJhclZpZXc7XG5cbmZ1bmN0aW9uIFNpZGViYXIoKSB7XG5cbiAgICBFdmVudEVtaXR0ZXIuY2FsbCggdGhpcyApO1xuXG4gICAgLy8gZG8gdmlldyBjaGVja1xuICAgIHRoaXMuZWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCAnW2RhdGEtc2lkZWJhcl0nICk7XG4gICAgdGhpcy5uYXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCAnbmF2JyApO1xuICAgIHRoaXMuX3RlYXJkb3duVmlld3MoKTtcbiAgICB0aGlzLl9ob21lVmlldyA9IG51bGw7XG4gICAgdGhpcy5fY3VycmVudFZpZXcgPSBudWxsO1xuICAgIHRoaXMuYWRkZWRDbGFzc2VzID0ge307XG5cbiAgICAvLyBzaWduaWZ5IGluaWFsaXphdGlvblxuICAgIGlmICggdGhpcy5lbCApIHtcbiAgICAgICAgdGhpcy5lbC5hcHBlbmRDaGlsZCggdGhpcy5uYXYgKTtcblxuICAgICAgICBpZiAoICF0aGlzLndyYXBwZXIgKSB7XG4gICAgICAgICAgICB0aGlzLndyYXBwZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCAnZGl2JyApO1xuICAgICAgICAgICAgdGhpcy5lbC5hcHBlbmRDaGlsZCggdGhpcy53cmFwcGVyICk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5lbC5jbGFzc0xpc3QuYWRkKCAnc2lkZWJhci1pbml0JyApO1xuICAgIH1cbiAgICB0aGlzLmFkZExpc3RlbmVycygpO1xufVxuXG5TaWRlYmFyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoIEV2ZW50RW1pdHRlci5wcm90b3R5cGUgKTtcblxuU2lkZWJhci5wcm90b3R5cGUuYWRkVmlldyA9IGZ1bmN0aW9uKCB0ZW1wbGF0ZSwgb3B0cywgY2FsbGJhY2sgKSB7XG4gICAgaWYgKCAhdGVtcGxhdGUgKSByZXR1cm4gbnVsbDtcblxuICAgIG9wdHMgPSBvcHRzIHx8IHt9O1xuICAgIG9wdHMubmF2ID0gdGhpcy5uYXY7XG5cbiAgICB2YXIgaXNSZWFkeSA9IHRoaXMuaXNTaWRlYmFyVmlldyggdGVtcGxhdGUgKSxcbiAgICAgICAgdmlldyA9IGlzUmVhZHkgPyB0ZW1wbGF0ZSA6IG51bGw7XG5cbiAgICBpZiAoICF2aWV3ICkge1xuICAgICAgICB2aWV3ID0gbmV3IFNpZGViYXJWaWV3KCB0ZW1wbGF0ZSwgb3B0cyApO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdmlldy5zZXRPcHRpb25zKCBvcHRzICk7XG4gICAgfVxuXG4gICAgaWYgKCAoIG9wdHMgJiYgb3B0cy5ob21lICkgfHwgIXRoaXMuX2hvbWVWaWV3IHx8IHZpZXcub3B0aW9ucy5ob21lICkge1xuICAgICAgICB0aGlzLl9ob21lVmlldyA9IHZpZXc7XG4gICAgfVxuXG4gICAgLy8gdGhpcyBoZWxwcyBoYW5kbGluZyB0aGUgdmlldyBzcGFjZVxuICAgIHZpZXcub24oICdvcGVuJywgdGhpcy5fb25WaWV3T3BlbmluZy5iaW5kKCB0aGlzLCB2aWV3ICkgKTtcbiAgICB2aWV3Lm9uKCAncmVuZGVyZWQnLCB0aGlzLl9vblZpZXdSZW5kZXJlZC5iaW5kKCB0aGlzICkgKTtcblxuICAgIGlmICggaXNSZWFkeSApIHtcbiAgICAgICAgdGhpcy5fb25WaWV3UmVhZHkoIGNhbGxiYWNrLCBudWxsLCB2aWV3ICk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB2aWV3Lm9uY2UoICdyZWFkeScsIHRoaXMuX29uVmlld1JlYWR5LmJpbmQoIHRoaXMsIGNhbGxiYWNrLCBudWxsICkgKTtcbiAgICAgICAgdmlldy5vbmNlKCAnZXJyb3InLCB0aGlzLl9vblZpZXdSZWFkeS5iaW5kKCB0aGlzLCBjYWxsYmFjayApICk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHZpZXc7XG59O1xuXG5TaWRlYmFyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcnMgPSBmdW5jdGlvbiAoICkge1xuICAgIGVtaXQub24oJ3NpZGViYXIuYmFjaycsIHRoaXMuYmFjay5iaW5kKCB0aGlzICkpO1xuICAgIGVtaXQub24oJ3NpZGViYXIuY2xvc2UnLCB0aGlzLmNsb3NlLmJpbmQoIHRoaXMgKSk7XG4gICAgZW1pdC5vbignc2lkZWJhci5vcGVuJywgdGhpcy5vcGVuLmJpbmQoIHRoaXMgKSk7XG4gICAgZW1pdC5vbignc2lkZWJhci50b2dnbGUnLCB0aGlzLnRvZ2dsZS5iaW5kKCB0aGlzICkpO1xufTtcblxuU2lkZWJhci5wcm90b3R5cGUucmVtb3ZlVmlldyA9IGZ1bmN0aW9uKCB2aWV3ICkge1xuICAgIHZhciBpZCA9IHR5cGVvZiB2aWV3ID09PSAnc3RyaW5nJyA/IHZpZXcgOiAgdmlldy5pZDtcbiAgICB0aGlzLnZpZXdNYW5hZ2VyLnJlbW92ZVZpZXcoIGlkICk7XG4gICAgXG4gICAgLy8gaWYgcmVtb3ZlIHZpZXcgaXMgY3VycmVudCBnbyB0byBob21lXG4gICAgaWYgKCB0aGlzLl9jdXJyZW50Vmlldy5pZCA9PT0gdmlldy5pZCApIHtcbiAgICAgICAgdGhpcy5ob21lKCk7XG4gICAgfVxufTtcblxuU2lkZWJhci5wcm90b3R5cGUuc2V0Q3VycmVudFZpZXcgPSBmdW5jdGlvbiggdmlldyApIHtcbiAgICB2YXIgaWQgPSB2aWV3LmlkLFxuICAgICAgICBvcGVuZWQgPSB0aGlzLnZpZXdNYW5hZ2VyLm9wZW4oIGlkICk7XG4gICAgaWYgKCBvcGVuZWQgKSB7XG4gICAgICAgIHRoaXMuX2N1cnJlbnRWaWV3ID0gdmlldztcbiAgICB9XG59O1xuXG5TaWRlYmFyLnByb3RvdHlwZS5nZXRWaWV3ID0gZnVuY3Rpb24oIGlkICkge1xuICAgIHJldHVybiB0aGlzLnZpZXdNYW5hZ2VyLnZpZXdzWyBpZCBdO1xufTtcblxuU2lkZWJhci5wcm90b3R5cGUuZ2V0Q3VycmVudFZpZXcgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fY3VycmVudFZpZXc7XG59O1xuXG5TaWRlYmFyLnByb3RvdHlwZS5ob21lID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKCAhdGhpcy5pc1NpZGViYXJWaWV3KCB0aGlzLl9ob21lVmlldyApICkgcmV0dXJuO1xuICAgIGlmICggdGhpcy5fY3VycmVudFZpZXcuaWQgPT09IHRoaXMuX2hvbWVWaWV3LmlkICkgcmV0dXJuO1xuICAgIHRoaXMudmlld01hbmFnZXIub3BlbiggdGhpcy5faG9tZVZpZXcuaWQgKTtcbn07XG5cblNpZGViYXIucHJvdG90eXBlLmJhY2sgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBzZWUgaWYgYSBwcm9wZXIgcGFyZW50IHZpZXcgaXMgc2V0XG4gICAgdGhpcy5lbC5jbGFzc0xpc3QuYWRkKCAnYmFjaycgKTtcbiAgICBpZiAoIHRoaXMuaXNTaWRlYmFyVmlldyggdGhpcy5fY3VycmVudFZpZXcgKSAmJiB0aGlzLl9jdXJyZW50Vmlldy5fcGFyZW50VmlldyApIHtcbiAgICAgICAgdmFyIF9wYXJlbnQgPSB0aGlzLl9jdXJyZW50Vmlldy5fcGFyZW50VmlldztcbiAgICAgICAgaWYgKCB0aGlzLmlzU2lkZWJhclZpZXcoIF9wYXJlbnQgKSApIHtcbiAgICAgICAgICAgIHJldHVybiBfcGFyZW50Lm9wZW4oKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBpZiBub3QgZ28gdG8gaG9tZVxuICAgIHRoaXMuaG9tZSgpO1xufTtcblxuU2lkZWJhci5wcm90b3R5cGUub3BlbiA9IGZ1bmN0aW9uKCBkYXRhICkge1xuICAgIHRoaXMuc3RhdGUgPSAxO1xuICAgIGlmICggdGhpcy5lbCApIHRoaXMuZWwuY2xhc3NMaXN0LmFkZCggJ3Nob3cnICk7XG4gICAgaWYgKCBkYXRhIGluc3RhbmNlb2YgRXZlbnQgKSB7XG4gICAgICAgIGRhdGEgPSBudWxsO1xuICAgIH1cbiAgICB0aGlzLmVtaXQoICdvcGVuJywgZGF0YSApO1xufTtcblxuU2lkZWJhci5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbiggZGF0YSApIHtcbiAgICB0aGlzLnN0YXRlID0gMDtcbiAgICBpZiAoIHRoaXMuZWwgKSB0aGlzLmVsLmNsYXNzTGlzdC5yZW1vdmUoICdzaG93JyApO1xuICAgIGlmICggZGF0YSBpbnN0YW5jZW9mIEV2ZW50ICkge1xuICAgICAgICBkYXRhID0gbnVsbDtcbiAgICB9XG4gICAgdGhpcy5lbWl0KCAnY2xvc2UnLCBkYXRhICk7XG59O1xuXG5TaWRlYmFyLnByb3RvdHlwZS50b2dnbGUgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAoIHRoaXMuc3RhdGUgKSB7XG4gICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLm9wZW4oKTtcbn07XG5cbi8vIHdpZHRoIGlzIG9ubHkgdGVtcCB0aWxsIG5leHQgb3Blbi5cblNpZGViYXIucHJvdG90eXBlLmV4cGFuZCA9IGZ1bmN0aW9uKCB3aWR0aCApIHtcbiAgICBpZiAoICF0aGlzLmVsICkgcmV0dXJuO1xuICAgIHRoaXMuZWwuc3R5bGUud2lkdGggPSB0eXBlb2Ygd2lkdGggPT09ICdudW1iZXInID8gd2lkdGggKyAncHgnIDogd2lkdGg7XG4gICAgdGhpcy5lbWl0KCAnZXhwYW5kZWQnLCB7XG4gICAgICAgIHdpZHRoOiB3aWR0aFxuICAgIH0gKTtcbn07XG5cblNpZGViYXIucHJvdG90eXBlLmFkZENsYXNzID0gZnVuY3Rpb24oIGMgKSB7XG4gICAgaWYgKCAhdGhpcy5lbCApIHJldHVybjtcbiAgICB0aGlzLmVsLmNsYXNzTGlzdC5hZGQoIGMgKTtcbiAgICB0aGlzLmFkZGVkQ2xhc3Nlc1sgYyBdID0gdHJ1ZTtcbiAgICB0aGlzLmVtaXQoICdjbGFzc0FkZGVkJywgYyApO1xufTtcblxuU2lkZWJhci5wcm90b3R5cGUucmVtb3ZlQ2xhc3MgPSBmdW5jdGlvbiggYyApIHtcbiAgICBpZiAoICF0aGlzLmVsICkgcmV0dXJuO1xuICAgIHRoaXMuZWwuY2xhc3NMaXN0LnJlbW92ZSggYyApO1xuICAgIGRlbGV0ZSB0aGlzLmFkZGVkQ2xhc3Nlc1sgYyBdO1xuICAgIHRoaXMuZW1pdCggJ2NsYXNzUmVtb3ZlZCcsIGMgKTtcbn07XG5cblNpZGViYXIucHJvdG90eXBlLmlzU2lkZWJhclZpZXcgPSBmdW5jdGlvbiggdmlldyApIHtcbiAgICByZXR1cm4gKCB0eXBlb2YgdmlldyA9PT0gJ29iamVjdCcgJiYgdmlldyBpbnN0YW5jZW9mIFNpZGViYXJWaWV3ICYmICF2aWV3Ll9yZW1vdmVkICk7XG59O1xuXG5TaWRlYmFyLnByb3RvdHlwZS5pc09wZW4gPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5zdGF0ZSA/IHRydWUgOiBmYWxzZTtcbn07XG5cblNpZGViYXIucHJvdG90eXBlLl9hcHBlbmRWaWV3ID0gZnVuY3Rpb24oIHZpZXcgKSB7XG4gICAgaWYgKCB0aGlzLndyYXBwZXIgKSB0aGlzLndyYXBwZXIuYXBwZW5kQ2hpbGQoIHZpZXcuZWwgKTtcbn07XG5cblNpZGViYXIucHJvdG90eXBlLl9oYW5kbGVBbmltYXRpb25zID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fY3VycmVudFZpZXcub25jZSggJ2FuaW1hdGlvbjpjb21wbGV0ZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoIHRoaXMuX3ByZXZWaWV3ICkge1xuICAgICAgICAgICAgdGhpcy5fcHJldlZpZXcuZWwuY2xhc3NMaXN0LnJlbW92ZSggJ3NpZGViYXItdmlldy1vdXQnICk7XG4gICAgICAgICAgICB0aGlzLl9wcmV2VmlldyA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgc2V0VGltZW91dCggZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB0aGlzLmVsLmNsYXNzTGlzdC5yZW1vdmUoICdhbmltYXRpbmcnICk7XG4gICAgICAgICAgICB0aGlzLmVsLmNsYXNzTGlzdC5yZW1vdmUoICdiYWNrJyApO1xuICAgICAgICB9LmJpbmQoIHRoaXMgKSwgNTAwKTtcbiAgICB9LmJpbmQoIHRoaXMgKSApO1xufTtcblxuU2lkZWJhci5wcm90b3R5cGUuX2NhY2hlVmlldyA9IGZ1bmN0aW9uKCB2aWV3ICkge1xuICAgIC8vIG5vIGRvdXBzXG4gICAgaWYgKCB0aGlzLnZpZXdNYW5hZ2VyLnZpZXdzWyB2aWV3LmlkIF0gKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgXG4gICAgdGhpcy52aWV3TWFuYWdlci5hZGRWaWV3KCB2aWV3ICk7XG5cbiAgICAvLyBpZiB0aGVyZSBpcyBubyBvdGhlciB2aWV3cyBhdXRvIG9wZW4uXG4gICAgaWYgKCAhdGhpcy5fY3VycmVudFZpZXcgKSB7XG4gICAgICAgIHRoaXMuX2N1cnJlbnRWaWV3ID0gdmlldztcbiAgICAgICAgdGhpcy52aWV3TWFuYWdlci5vcGVuKCB2aWV3LmlkICk7XG4gICAgfVxuXG4gICAgdGhpcy5lbWl0KCAndmlldy5hZGRlZCcsIHZpZXcgKTtcbiAgICByZXR1cm4gdmlldztcbn07XG5cblNpZGViYXIucHJvdG90eXBlLl90ZWFyZG93blZpZXdzID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKCAhdGhpcy52aWV3TWFuYWdlciB8fCAhdGhpcy52aWV3TWFuYWdlci52aWV3TGlzdC5sZW5ndGggKSByZXR1cm47XG4gICAgdGhpcy52aWV3TWFuYWdlci52aWV3TGlzdC5mb3JFYWNoKCBmdW5jdGlvbiggdmlldyApIHtcbiAgICAgICAgdGhpcy52aWV3TWFuYWdlci5yZW1vdmVWaWV3KCB2aWV3LmlkICk7XG4gICAgICAgIHRoaXMuZW1pdCggJ3ZpZXcucmVtb3ZlZCcsIHZpZXcgKTtcbiAgICB9LmJpbmQoIHRoaXMgKSApO1xufTtcblxuU2lkZWJhci5wcm90b3R5cGUuX29uVmlld09wZW5pbmcgPSBmdW5jdGlvbiggdmlldyApIHtcbiAgICBmb3IgKCB2YXIgYyBpbiB0aGlzLmFkZGVkQ2xhc3NlcyApIHtcbiAgICAgICAgdGhpcy5yZW1vdmVDbGFzcyggYyApO1xuICAgIH1cbiAgICB0aGlzLnZpZXdNYW5hZ2VyLm9wZW4oIHZpZXcuaWQgKTtcbiAgICB0aGlzLmVsLmNsYXNzTGlzdC5hZGQoICdhbmltYXRpbmcnICk7XG4gICAgdGhpcy5lbC5yZW1vdmVBdHRyaWJ1dGUoICdzdHlsZScgKTtcbiAgICBpZiAoICF0aGlzLl9jdXJyZW50VmlldyB8fCB2aWV3LmlkICE9PSB0aGlzLl9jdXJyZW50Vmlldy5pZCApIHtcblxuICAgICAgICAvLyBjbG9zZSBvbGQgdmlld1xuICAgICAgICB0aGlzLl9wcmV2VmlldyA9IHRoaXMuX2N1cnJlbnRWaWV3O1xuICAgICAgICBpZiAoIHRoaXMuX3ByZXZWaWV3ICkge1xuICAgICAgICAgICAgdGhpcy5fcHJldlZpZXcuY2xvc2UoKTtcbiAgICAgICAgICAgIHRoaXMuX3ByZXZWaWV3LmVsLmNsYXNzTGlzdC5hZGQoICdzaWRlYmFyLXZpZXctb3V0JyApO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2N1cnJlbnRWaWV3ID0gdmlldztcbiAgICB9XG4gICAgdGhpcy5faGFuZGxlQW5pbWF0aW9ucygpOyAvLyBtdXN0IGNvbWUgYWZ0ZXIgd2Ugc2V0IGEgX2N1cnJlbnRWaWV3XG4gICAgdGhpcy5zdGFydGVkID0gdHJ1ZTtcbiAgICAvLyBpbmRpY2F0ZSB0aGVyZSBpcyBhIHZpZXcgb3BlbmluZ1xuICAgIHRoaXMuZW1pdCggJ3ZpZXcub3BlbmVkJywgdmlldyApO1xuICAgIHRoaXMuZW1pdCggJ3ZpZXcub3BlbmVkLicgKyB2aWV3LmlkLCB2aWV3ICk7XG5cbn07XG5cblNpZGViYXIucHJvdG90eXBlLl9vblZpZXdSZW5kZXJlZCA9IGZ1bmN0aW9uKCB2aWV3ICkge1xuICAgIC8vIGNyZWF0ZSBnZW5lcmFsIGFuZCBuYW1lc3BhY2VkIGV2ZW50XG4gICAgdGhpcy5lbWl0KCAndmlldy5yZW5kZXJlZCcsIHZpZXcgKTtcbiAgICB0aGlzLmVtaXQoICd2aWV3LnJlbmRlcmVkLicgKyB2aWV3LmlkLCB2aWV3ICk7XG59O1xuXG5TaWRlYmFyLnByb3RvdHlwZS5fb25WaWV3UmVhZHkgPSBmdW5jdGlvbiggY2FsbGJhY2ssIGVyciwgdmlldyApIHtcbiAgICBpZiAoIGVyciApIHtcbiAgICAgICAgdmlldy5vZmYoICdvcGVuJywgdGhpcy5fb25WaWV3T3BlbmluZy5iaW5kKCB0aGlzICkgKTtcbiAgICAgICAgdmlldy5yZW1vdmUoKTtcbiAgICAgICAgdGhpcy5lbWl0KCAnZXJyb3InLCBlcnIgKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvLyB1bmJpbmQgYW55IHN0YWxlIGhhbmRsZXJzXG4gICAgdmlldy5vZmYoICdyZWFkeScsIHRoaXMuX29uVmlld1JlYWR5LmJpbmQoIHRoaXMsIGNhbGxiYWNrLCBudWxsICkgKTtcbiAgICB2aWV3Lm9mZiggJ2Vycm9yJywgdGhpcy5fb25WaWV3UmVhZHkuYmluZCggdGhpcywgY2FsbGJhY2sgKSApO1xuICAgIGlmICggdHlwZW9mIGNhbGxiYWNrID09PSAnZnVuY3Rpb24nICkge1xuICAgICAgICBjYWxsYmFjayggZXJyLCB2aWV3ICk7XG4gICAgfVxuICAgIC8vIGNhY2hlIHZpZXcgYWZ0ZXIgc3VjY2Vzc2Z1bFxuICAgIHRoaXMuX2NhY2hlVmlldyggdmlldyApO1xufTtcblxuU2lkZWJhci5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIGRvIHZpZXcgY2hlY2tcbiAgICB0aGlzLmVsID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvciggJ1tkYXRhLXNpZGViYXJdJyApO1xuICAgIHRoaXMuX3RlYXJkb3duVmlld3MoKTtcbiAgICB0aGlzLl9ob21lVmlldyA9IG51bGw7XG4gICAgdGhpcy5fY3VycmVudFZpZXcgPSBudWxsO1xuICAgIHRoaXMuX3ZpZXdzID0gW107XG4gICAgdGhpcy5fdmlld3NCeUlkID0ge307XG5cbiAgICAvLyBzaWduaWZ5IGluaWFsaXphdGlvblxuICAgIGlmICggdGhpcy5lbCApIHtcbiAgICAgICAgaWYgKCAhdGhpcy53cmFwcGVyICkge1xuICAgICAgICAgICAgdGhpcy53cmFwcGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCggJ2RpdicgKTtcbiAgICAgICAgICAgIHRoaXMuZWwuYXBwZW5kQ2hpbGQoIHRoaXMud3JhcHBlciApO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZWwuY2xhc3NMaXN0LmFkZCggJ3NpZGViYXItaW5pdCcgKTtcbiAgICAgICAgdGhpcy52aWV3TWFuYWdlciA9IG5ldyBZbWlyKCB7XG4gICAgICAgICAgZWw6IHRoaXMud3JhcHBlcixcbiAgICAgICAgICBsaXN0RWw6IHRoaXMubmF2LFxuICAgICAgICAgIGNsYXNzTmFtZTogJ3NpZGViYXItd3JhcHBlcidcbiAgICAgICAgfSApO1xuICAgICAgICB0aGlzLmVtaXQoICdyZWFkeScsIHRoaXMgKTtcbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgRXZlbnRFbWl0dGVyMiA9IHJlcXVpcmUoICdldmVudGVtaXR0ZXIyJyApLkV2ZW50RW1pdHRlcjI7XG5cbi8qXG4gICAgZGVwZW5kZW5jaWVzXG4qL1xuXG4vKiBiaW5kaW5nICovXG52YXIgYmluZGluZ01ldGhvZCA9IHdpbmRvdy5hZGRFdmVudExpc3RlbmVyID8gJ2FkZEV2ZW50TGlzdGVuZXInIDogJ2F0dGFjaEV2ZW50JztcbnZhciBldmVudFByZWZpeCA9IGJpbmRpbmdNZXRob2QgIT09ICdhZGRFdmVudExpc3RlbmVyJyA/ICdvbicgOiAnJztcblxuZnVuY3Rpb24gYmluZCggZWwsIHR5cGUsIGZuLCBjYXB0dXJlICkge1xuICAgIGVsWyBiaW5kaW5nTWV0aG9kIF0oIGV2ZW50UHJlZml4ICsgdHlwZSwgZm4sIGNhcHR1cmUgfHwgZmFsc2UgKTtcbiAgICByZXR1cm4gZm47XG59XG5cbi8qIG1hdGNoaW5nICovXG52YXIgdmVuZG9yTWF0Y2ggPSBFbGVtZW50LnByb3RvdHlwZS5tYXRjaGVzIHx8IEVsZW1lbnQucHJvdG90eXBlLndlYmtpdE1hdGNoZXNTZWxlY3RvciB8fCBFbGVtZW50LnByb3RvdHlwZS5tb3pNYXRjaGVzU2VsZWN0b3IgfHwgRWxlbWVudC5wcm90b3R5cGUubXNNYXRjaGVzU2VsZWN0b3IgfHwgRWxlbWVudC5wcm90b3R5cGUub01hdGNoZXNTZWxlY3RvcjtcblxuZnVuY3Rpb24gbWF0Y2hlcyggZWwsIHNlbGVjdG9yICkge1xuICAgIGlmICggIWVsIHx8IGVsLm5vZGVUeXBlICE9PSAxICkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmICggdmVuZG9yTWF0Y2ggKSB7XG4gICAgICAgIHJldHVybiB2ZW5kb3JNYXRjaC5jYWxsKCBlbCwgc2VsZWN0b3IgKTtcbiAgICB9XG4gICAgdmFyIG5vZGVzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCggc2VsZWN0b3IsIGVsLnBhcmVudE5vZGUgKTtcbiAgICBmb3IgKCB2YXIgaSA9IDA7IGkgPCBub2Rlcy5sZW5ndGg7ICsraSApIHtcbiAgICAgICAgaWYgKCBub2Rlc1sgaSBdID09IGVsICkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7ICBcbiAgICAgICAgfSBcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKiBjbG9zZXN0ICovXG5cbmZ1bmN0aW9uIGNsb3Nlc3QoIGVsZW1lbnQsIHNlbGVjdG9yLCBjaGVja1NlbGYsIHJvb3QgKSB7XG4gICAgZWxlbWVudCA9IGNoZWNrU2VsZiA/IHtwYXJlbnROb2RlOiBlbGVtZW50fSA6IGVsZW1lbnQ7XG5cbiAgICByb290ID0gcm9vdCB8fCBkb2N1bWVudDtcblxuICAgIC8qIE1ha2Ugc3VyZSBgZWxlbWVudCAhPT0gZG9jdW1lbnRgIGFuZCBgZWxlbWVudCAhPSBudWxsYFxuICAgICAgIG90aGVyd2lzZSB3ZSBnZXQgYW4gaWxsZWdhbCBpbnZvY2F0aW9uICovXG4gICAgd2hpbGUgKCAoIGVsZW1lbnQgPSBlbGVtZW50LnBhcmVudE5vZGUgKSAmJiBlbGVtZW50ICE9PSBkb2N1bWVudCApIHtcbiAgICAgICAgaWYgKCBtYXRjaGVzKCBlbGVtZW50LCBzZWxlY3RvciApICkge1xuICAgICAgICAgICAgcmV0dXJuIGVsZW1lbnQ7XG4gICAgICAgIH1cblxuICAgICAgICAvKiBBZnRlciBgbWF0Y2hlc2Agb24gdGhlIGVkZ2UgY2FzZSB0aGF0XG4gICAgICAgICAgIHRoZSBzZWxlY3RvciBtYXRjaGVzIHRoZSByb290XG4gICAgICAgICAgICh3aGVuIHRoZSByb290IGlzIG5vdCB0aGUgZG9jdW1lbnQpICovXG4gICAgICAgIGlmIChlbGVtZW50ID09PSByb290KSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8qXG4gICAgZW5kIGRlcGVuZGVuY2llc1xuKi9cblxuZnVuY3Rpb24gRW1pdCgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgRXZlbnRFbWl0dGVyMi5jYWxsKCBzZWxmICk7XG5cbiAgICBzZWxmLnZhbGlkYXRvcnMgPSBbXTtcbiAgICBzZWxmLnRvdWNoTW92ZURlbHRhID0gMTA7XG4gICAgc2VsZi5pbml0aWFsVG91Y2hQb2ludCA9IG51bGw7XG5cbiAgICBiaW5kKCBkb2N1bWVudCwgJ3RvdWNoc3RhcnQnLCBzZWxmLmhhbmRsZUV2ZW50LmJpbmQoIHNlbGYgKSApO1xuICAgIGJpbmQoIGRvY3VtZW50LCAndG91Y2htb3ZlJywgc2VsZi5oYW5kbGVFdmVudC5iaW5kKCBzZWxmICkgKTtcbiAgICBiaW5kKCBkb2N1bWVudCwgJ3RvdWNoZW5kJywgc2VsZi5oYW5kbGVFdmVudC5iaW5kKCBzZWxmICkgKTtcbiAgICBiaW5kKCBkb2N1bWVudCwgJ2NsaWNrJywgc2VsZi5oYW5kbGVFdmVudC5iaW5kKCBzZWxmICkgKTtcbiAgICBiaW5kKCBkb2N1bWVudCwgJ2lucHV0Jywgc2VsZi5oYW5kbGVFdmVudC5iaW5kKCBzZWxmICkgKTtcbiAgICBiaW5kKCBkb2N1bWVudCwgJ3N1Ym1pdCcsIHNlbGYuaGFuZGxlRXZlbnQuYmluZCggc2VsZiApICk7XG59XG5cbkVtaXQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZSggRXZlbnRFbWl0dGVyMi5wcm90b3R5cGUgKTtcblxuZnVuY3Rpb24gZ2V0VG91Y2hEZWx0YSggZXZlbnQsIGluaXRpYWwgKSB7XG4gICAgdmFyIGRlbHRhWCA9ICggZXZlbnQudG91Y2hlc1sgMCBdLnBhZ2VYIC0gaW5pdGlhbC54ICk7XG4gICAgdmFyIGRlbHRhWSA9ICggZXZlbnQudG91Y2hlc1sgMCBdLnBhZ2VZIC0gaW5pdGlhbC55ICk7XG4gICAgcmV0dXJuIE1hdGguc3FydCggKCBkZWx0YVggKiBkZWx0YVggKSArICggZGVsdGFZICogZGVsdGFZICkgKTtcbn1cblxuRW1pdC5wcm90b3R5cGUuaGFuZGxlRXZlbnQgPSBmdW5jdGlvbiggZXZlbnQgKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgdmFyIHRvdWNoZXMgPSBldmVudC50b3VjaGVzO1xuICAgIHZhciBkZWx0YSA9IC0xO1xuXG4gICAgaWYgKCB0eXBlb2YgZXZlbnQucHJvcGFnYXRpb25TdG9wcGVkQXQgIT09ICdudW1iZXInIHx8IGlzTmFOKCBldmVudC5wcm9wYWdhdGlvblN0b3BwZWRBdCApICkge1xuICAgICAgICBldmVudC5wcm9wYWdhdGlvblN0b3BwZWRBdCA9IDEwMDsgLy8gaGlnaGVzdCBwb3NzaWJsZSB2YWx1ZVxuICAgIH1cblxuICAgIHN3aXRjaCAoIGV2ZW50LnR5cGUgKSB7XG4gICAgICAgIGNhc2UgJ3RvdWNoc3RhcnQnOlxuICAgICAgICAgICAgc2VsZi5pbml0aWFsVG91Y2hQb2ludCA9IHNlbGYubGFzdFRvdWNoUG9pbnQgPSB7XG4gICAgICAgICAgICAgICAgeDogdG91Y2hlcyAmJiB0b3VjaGVzLmxlbmd0aCA/IHRvdWNoZXNbIDAgXS5wYWdlWCA6IDAsXG4gICAgICAgICAgICAgICAgeTogdG91Y2hlcyAmJiB0b3VjaGVzLmxlbmd0aCA/IHRvdWNoZXNbIDAgXS5wYWdlWSA6IDBcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgJ3RvdWNobW92ZSc6XG4gICAgICAgICAgICBpZiAoIHRvdWNoZXMgJiYgdG91Y2hlcy5sZW5ndGggJiYgc2VsZi5pbml0aWFsVG91Y2hQb2ludCApIHtcbiAgICAgICAgICAgICAgICBkZWx0YSA9IGdldFRvdWNoRGVsdGEoIGV2ZW50LCBzZWxmLmluaXRpYWxUb3VjaFBvaW50ICk7XG4gICAgICAgICAgICAgICAgaWYgKCBkZWx0YSA+IHNlbGYudG91Y2hNb3ZlRGVsdGEgKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuaW5pdGlhbFRvdWNoUG9pbnQgPSBudWxsO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHNlbGYubGFzdFRvdWNoUG9pbnQgPSB7XG4gICAgICAgICAgICAgICAgICAgIHg6IHRvdWNoZXNbIDAgXS5wYWdlWCxcbiAgICAgICAgICAgICAgICAgICAgeTogdG91Y2hlc1sgMCBdLnBhZ2VZXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZSAnY2xpY2snOlxuICAgICAgICBjYXNlICd0b3VjaGVuZCc6XG4gICAgICAgIGNhc2UgJ2lucHV0JzpcbiAgICAgICAgY2FzZSAnc3VibWl0JzpcbiAgICAgICAgICAgIC8vIGVhdCBhbnkgbGF0ZS1maXJpbmcgY2xpY2sgZXZlbnRzIG9uIHRvdWNoIGRldmljZXNcbiAgICAgICAgICAgIGlmICggZXZlbnQudHlwZSA9PT0gJ2NsaWNrJyAmJiBzZWxmLmxhc3RUb3VjaFBvaW50ICkge1xuICAgICAgICAgICAgICAgIGlmICggZXZlbnQudG91Y2hlcyAmJiBldmVudC50b3VjaGVzLmxlbmd0aCApIHtcbiAgICAgICAgICAgICAgICAgICAgZGVsdGEgPSBnZXRUb3VjaERlbHRhKCBldmVudCwgc2VsZi5sYXN0VG91Y2hQb2ludCApO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIGRlbHRhIDwgc2VsZi50b3VjaE1vdmVEZWx0YSApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gaGFuZGxlIGNhbmNlbGluZyB0b3VjaGVzIHRoYXQgaGF2ZSBtb3ZlZCB0b28gbXVjaFxuICAgICAgICAgICAgaWYgKCBldmVudC50eXBlID09PSAndG91Y2hlbmQnICYmICFzZWxmLmluaXRpYWxUb3VjaFBvaW50ICkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIHNlbGVjdG9yID0gJ1tkYXRhLWVtaXRdJztcbiAgICAgICAgICAgIHZhciBvcmlnaW5hbEVsZW1lbnQgPSBldmVudC50YXJnZXQgfHwgZXZlbnQuc3JjRWxlbWVudDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gaWYgaXQncyBhIGxpbmsgYW5kIGl0IGhhcyBubyBlbWl0IGF0dHJpYnV0ZSwgYWxsb3cgdGhlIGV2ZW50IHRvIHBhc3NcbiAgICAgICAgICAgIGlmICggIW9yaWdpbmFsRWxlbWVudC5nZXRBdHRyaWJ1dGUoICdkYXRhLWVtaXQnICkgJiYgKCBvcmlnaW5hbEVsZW1lbnQudGFnTmFtZSA9PT0gJ0EnIHx8IG9yaWdpbmFsRWxlbWVudC50YWdOYW1lID09PSAnQlVUVE9OJyB8fCBvcmlnaW5hbEVsZW1lbnQudGFnTmFtZSA9PT0gJ0lOUFVUJyApICkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdmFyIGZvcmNlQWxsb3dEZWZhdWx0ID0gb3JpZ2luYWxFbGVtZW50LnRhZ05hbWUgPT0gJ0lOUFVUJyAmJiAoIG9yaWdpbmFsRWxlbWVudC50eXBlID09ICdjaGVja2JveCcgfHwgb3JpZ2luYWxFbGVtZW50LnR5cGUgPT0gJ3JhZGlvJyApO1xuICAgICAgICAgICAgdmFyIGVsID0gY2xvc2VzdCggb3JpZ2luYWxFbGVtZW50LCBzZWxlY3RvciwgdHJ1ZSwgZG9jdW1lbnQgKTtcblxuICAgICAgICAgICAgaWYgKCBlbCApIHtcbiAgICAgICAgICAgICAgICB2YXIgZGVwdGggPSAtMTtcbiAgICAgICAgICAgICAgICB3aGlsZSAoIGVsICYmIGV2ZW50LnByb3BhZ2F0aW9uU3RvcHBlZEF0ID4gZGVwdGggJiYgKytkZXB0aCA8IDEwMCApIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHZhbGlkYXRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoIHZhciB2YWxpZGF0b3JJbmRleCA9IDA7IHZhbGlkYXRvckluZGV4IDwgc2VsZi52YWxpZGF0b3JzLmxlbmd0aDsgKyt2YWxpZGF0b3JJbmRleCApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICggIXNlbGYudmFsaWRhdG9yc1sgdmFsaWRhdG9ySW5kZXggXS5jYWxsKCB0aGlzLCBlbCwgZXZlbnQgKSApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWxpZGF0ZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIGVhdCB0aGUgZXZlbnQgaWYgYSB2YWxpZGF0b3IgZmFpbGVkXG4gICAgICAgICAgICAgICAgICAgIGlmICggIXZhbGlkYXRlZCApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50LnByb3BhZ2F0aW9uU3RvcHBlZEF0ID0gZGVwdGg7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmICggdHlwZW9mKCBzZWxmLnZhbGlkYXRlICkgPT0gJ2Z1bmN0aW9uJyAmJiAhc2VsZi52YWxpZGF0ZS5jYWxsKCBzZWxmLCBlbCApICkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZWwgPSBjbG9zZXN0KCBlbCwgc2VsZWN0b3IsIGZhbHNlLCBkb2N1bWVudCApO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoIGVsLnRhZ05hbWUgPT0gJ0ZPUk0nICkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCBldmVudC50eXBlICE9ICdzdWJtaXQnICkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsID0gY2xvc2VzdCggZWwsIHNlbGVjdG9yLCBmYWxzZSwgZG9jdW1lbnQgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmICggZWwudGFnTmFtZSA9PSAnSU5QVVQnICkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCAhKCBlbC50eXBlID09ICdzdWJtaXQnIHx8IGVsLnR5cGUgPT0gJ2NoZWNrYm94JyB8fCBlbC50eXBlID09ICdyYWRpbycgfHwgZWwudHlwZSA9PSAnZmlsZScgKSAmJiBldmVudC50eXBlICE9ICdpbnB1dCcgKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWwgPSBjbG9zZXN0KCBlbCwgc2VsZWN0b3IsIGZhbHNlLCBkb2N1bWVudCApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKCBlbC50YWdOYW1lID09ICdTRUxFQ1QnICkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCBldmVudC50eXBlICE9ICdpbnB1dCcgKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWwgPSBjbG9zZXN0KCBlbCwgc2VsZWN0b3IsIGZhbHNlLCBkb2N1bWVudCApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgZXZlbnQuZW1pdFRhcmdldCA9IGVsO1xuICAgICAgICAgICAgICAgICAgICBldmVudC5kZXB0aCA9IGRlcHRoO1xuICAgICAgICAgICAgICAgICAgICBzZWxmLl9lbWl0KCBlbCwgZXZlbnQsIGZvcmNlQWxsb3dEZWZhdWx0ICk7XG4gICAgICAgICAgICAgICAgICAgIGVsID0gY2xvc2VzdCggZWwsIHNlbGVjdG9yLCBmYWxzZSwgZG9jdW1lbnQgKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoIGRlcHRoID49IDEwMCApIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCAnRXhjZWVkZWQgZGVwdGggbGltaXQgZm9yIEVtaXQgY2FsbHMuJyApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHNlbGYuZW1pdCggJ3VuaGFuZGxlZCcsIGV2ZW50ICk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNlbGYuaW5pdGlhbFRvdWNoUG9pbnQgPSBudWxsO1xuXG4gICAgICAgICAgICBicmVhaztcbiAgICB9XG59O1xuXG5FbWl0LnByb3RvdHlwZS5fZW1pdCA9IGZ1bmN0aW9uKCBlbGVtZW50LCBldmVudCwgZm9yY2VEZWZhdWx0ICkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgb3B0aW9uU3RyaW5nID0gZWxlbWVudC5nZXRBdHRyaWJ1dGUoICdkYXRhLWVtaXQtb3B0aW9ucycgKTtcbiAgICB2YXIgb3B0aW9ucyA9IHt9O1xuICAgIHZhciBpZ25vcmVTdHJpbmcgPSBlbGVtZW50LmdldEF0dHJpYnV0ZSggJ2RhdGEtZW1pdC1pZ25vcmUnICk7XG4gICAgdmFyIGk7XG5cbiAgICBpZiAoIGlnbm9yZVN0cmluZyAmJiBpZ25vcmVTdHJpbmcubGVuZ3RoICkge1xuICAgICAgICB2YXIgaWdub3JlZEV2ZW50cyA9IGlnbm9yZVN0cmluZy50b0xvd2VyQ2FzZSgpLnNwbGl0KCAnICcgKTtcbiAgICAgICAgZm9yICggaSA9IDA7IGkgPCBpZ25vcmVkRXZlbnRzLmxlbmd0aDsgKytpICkge1xuICAgICAgICAgICAgaWYgKCBldmVudC50eXBlID09IGlnbm9yZWRFdmVudHNbIGkgXSApIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIG9wdGlvblN0cmluZyAmJiBvcHRpb25TdHJpbmcubGVuZ3RoICkge1xuICAgICAgICB2YXIgb3B0cyA9IG9wdGlvblN0cmluZy50b0xvd2VyQ2FzZSgpLnNwbGl0KCAnICcgKTtcbiAgICAgICAgZm9yICggaSA9IDA7IGkgPCBvcHRzLmxlbmd0aDsgKytpICkge1xuICAgICAgICAgICAgb3B0aW9uc1sgb3B0c1sgaSBdIF0gPSB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCAhZm9yY2VEZWZhdWx0ICYmICFvcHRpb25zLmFsbG93ZGVmYXVsdCApIHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICB9XG5cbiAgICBpZiAoICFvcHRpb25zLmFsbG93cHJvcGFnYXRlICkge1xuICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgZXZlbnQucHJvcGFnYXRpb25TdG9wcGVkQXQgPSBldmVudC5kZXB0aDtcbiAgICB9XG5cbiAgICB2YXIgZW1pc3Npb25MaXN0ID0gZWxlbWVudC5nZXRBdHRyaWJ1dGUoICdkYXRhLWVtaXQnICk7XG4gICAgaWYgKCAhZW1pc3Npb25MaXN0ICkge1xuICAgICAgICAvLyBhbGxvdyBmb3IgZW1wdHkgYmVoYXZpb3JzIHRoYXQgY2F0Y2ggZXZlbnRzXG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgZW1pc3Npb25zID0gZW1pc3Npb25MaXN0LnNwbGl0KCAnLCcgKTtcbiAgICBpZiAoIG9wdGlvbnMuZGVib3VuY2UgKSB7XG4gICAgICAgIHNlbGYudGltZW91dHMgPSBzZWxmLnRpbWVvdXRzIHx8IHt9O1xuICAgICAgICBpZiAoIHNlbGYudGltZW91dHNbIGVsZW1lbnQgXSApIHtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dCggc2VsZi50aW1lb3V0c1sgZWxlbWVudCBdICk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBfZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgICAgICAgICB2YXIgX2VtaXNzaW9ucyA9IGVtaXNzaW9ucztcbiAgICAgICAgICAgIHZhciBfZXZlbnQgPSBldmVudDtcbiAgICAgICAgICAgIHNlbGYudGltZW91dHNbIGVsZW1lbnQgXSA9IHNldFRpbWVvdXQoIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIF9lbWlzc2lvbnMuZm9yRWFjaCggZnVuY3Rpb24oIGVtaXNzaW9uICkge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLmVtaXQoIGVtaXNzaW9uLCBfZXZlbnQgKTtcbiAgICAgICAgICAgICAgICB9ICk7XG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KCBzZWxmLnRpbWVvdXRzWyBfZWxlbWVudCBdICk7XG4gICAgICAgICAgICAgICAgc2VsZi50aW1lb3V0c1sgX2VsZW1lbnQgXSA9IG51bGw7XG4gICAgICAgICAgICB9LCAyNTAgKTtcbiAgICAgICAgfSApKCk7XG5cbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBcbiAgICBlbWlzc2lvbnMuZm9yRWFjaCggZnVuY3Rpb24oIGVtaXNzaW9uICkge1xuICAgICAgICBzZWxmLmVtaXQoIGVtaXNzaW9uLCBldmVudCApO1xuICAgIH0gKTtcbn07XG5cbkVtaXQucHJvdG90eXBlLmFkZFZhbGlkYXRvciA9IGZ1bmN0aW9uKCB2YWxpZGF0b3IgKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgdmFyIGZvdW5kID0gZmFsc2U7XG4gICAgZm9yICggdmFyIGkgPSAwOyBpIDwgc2VsZi52YWxpZGF0b3JzLmxlbmd0aDsgKytpICkge1xuICAgICAgICBpZiAoIHNlbGYudmFsaWRhdG9yc1sgaSBdID09IHZhbGlkYXRvciApIHtcbiAgICAgICAgICAgIGZvdW5kID0gdHJ1ZTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCBmb3VuZCApIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHNlbGYudmFsaWRhdG9ycy5wdXNoKCB2YWxpZGF0b3IgKTtcbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbkVtaXQucHJvdG90eXBlLnJlbW92ZVZhbGlkYXRvciA9IGZ1bmN0aW9uKCB2YWxpZGF0b3IgKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgdmFyIGZvdW5kID0gZmFsc2U7XG4gICAgZm9yICggdmFyIGkgPSAwOyBpIDwgc2VsZi52YWxpZGF0b3JzLmxlbmd0aDsgKytpICkge1xuICAgICAgICBpZiAoIHNlbGYudmFsaWRhdG9yc1sgaSBdID09IHZhbGlkYXRvciApIHtcbiAgICAgICAgICAgIHNlbGYudmFsaWRhdG9ycy5zcGxpY2UoIGksIDEgKTtcbiAgICAgICAgICAgIGZvdW5kID0gdHJ1ZTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGZvdW5kO1xufTtcblxuRW1pdC5zaW5nbGV0b24gPSBFbWl0LnNpbmdsZXRvbiB8fCBuZXcgRW1pdCgpO1xuRW1pdC5zaW5nbGV0b24uRW1pdCA9IEVtaXQ7XG5cbm1vZHVsZS5leHBvcnRzID0gRW1pdC5zaW5nbGV0b247XG4iLCIvKiFcbiAqIEV2ZW50RW1pdHRlcjJcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9oaWoxbngvRXZlbnRFbWl0dGVyMlxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxMyBoaWoxbnhcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgbGljZW5zZS5cbiAqL1xuOyFmdW5jdGlvbih1bmRlZmluZWQpIHtcblxuICB2YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgPyBBcnJheS5pc0FycmF5IDogZnVuY3Rpb24gX2lzQXJyYXkob2JqKSB7XG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopID09PSBcIltvYmplY3QgQXJyYXldXCI7XG4gIH07XG4gIHZhciBkZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbiAgZnVuY3Rpb24gaW5pdCgpIHtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICBpZiAodGhpcy5fY29uZikge1xuICAgICAgY29uZmlndXJlLmNhbGwodGhpcywgdGhpcy5fY29uZik7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gY29uZmlndXJlKGNvbmYpIHtcbiAgICBpZiAoY29uZikge1xuXG4gICAgICB0aGlzLl9jb25mID0gY29uZjtcblxuICAgICAgY29uZi5kZWxpbWl0ZXIgJiYgKHRoaXMuZGVsaW1pdGVyID0gY29uZi5kZWxpbWl0ZXIpO1xuICAgICAgY29uZi5tYXhMaXN0ZW5lcnMgJiYgKHRoaXMuX2V2ZW50cy5tYXhMaXN0ZW5lcnMgPSBjb25mLm1heExpc3RlbmVycyk7XG4gICAgICBjb25mLndpbGRjYXJkICYmICh0aGlzLndpbGRjYXJkID0gY29uZi53aWxkY2FyZCk7XG4gICAgICBjb25mLm5ld0xpc3RlbmVyICYmICh0aGlzLm5ld0xpc3RlbmVyID0gY29uZi5uZXdMaXN0ZW5lcik7XG5cbiAgICAgIGlmICh0aGlzLndpbGRjYXJkKSB7XG4gICAgICAgIHRoaXMubGlzdGVuZXJUcmVlID0ge307XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gRXZlbnRFbWl0dGVyKGNvbmYpIHtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICB0aGlzLm5ld0xpc3RlbmVyID0gZmFsc2U7XG4gICAgY29uZmlndXJlLmNhbGwodGhpcywgY29uZik7XG4gIH1cblxuICAvL1xuICAvLyBBdHRlbnRpb24sIGZ1bmN0aW9uIHJldHVybiB0eXBlIG5vdyBpcyBhcnJheSwgYWx3YXlzICFcbiAgLy8gSXQgaGFzIHplcm8gZWxlbWVudHMgaWYgbm8gYW55IG1hdGNoZXMgZm91bmQgYW5kIG9uZSBvciBtb3JlXG4gIC8vIGVsZW1lbnRzIChsZWFmcykgaWYgdGhlcmUgYXJlIG1hdGNoZXNcbiAgLy9cbiAgZnVuY3Rpb24gc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB0cmVlLCBpKSB7XG4gICAgaWYgKCF0cmVlKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIHZhciBsaXN0ZW5lcnM9W10sIGxlYWYsIGxlbiwgYnJhbmNoLCB4VHJlZSwgeHhUcmVlLCBpc29sYXRlZEJyYW5jaCwgZW5kUmVhY2hlZCxcbiAgICAgICAgdHlwZUxlbmd0aCA9IHR5cGUubGVuZ3RoLCBjdXJyZW50VHlwZSA9IHR5cGVbaV0sIG5leHRUeXBlID0gdHlwZVtpKzFdO1xuICAgIGlmIChpID09PSB0eXBlTGVuZ3RoICYmIHRyZWUuX2xpc3RlbmVycykge1xuICAgICAgLy9cbiAgICAgIC8vIElmIGF0IHRoZSBlbmQgb2YgdGhlIGV2ZW50KHMpIGxpc3QgYW5kIHRoZSB0cmVlIGhhcyBsaXN0ZW5lcnNcbiAgICAgIC8vIGludm9rZSB0aG9zZSBsaXN0ZW5lcnMuXG4gICAgICAvL1xuICAgICAgaWYgKHR5cGVvZiB0cmVlLl9saXN0ZW5lcnMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgaGFuZGxlcnMgJiYgaGFuZGxlcnMucHVzaCh0cmVlLl9saXN0ZW5lcnMpO1xuICAgICAgICByZXR1cm4gW3RyZWVdO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm9yIChsZWFmID0gMCwgbGVuID0gdHJlZS5fbGlzdGVuZXJzLmxlbmd0aDsgbGVhZiA8IGxlbjsgbGVhZisrKSB7XG4gICAgICAgICAgaGFuZGxlcnMgJiYgaGFuZGxlcnMucHVzaCh0cmVlLl9saXN0ZW5lcnNbbGVhZl0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBbdHJlZV07XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKChjdXJyZW50VHlwZSA9PT0gJyonIHx8IGN1cnJlbnRUeXBlID09PSAnKionKSB8fCB0cmVlW2N1cnJlbnRUeXBlXSkge1xuICAgICAgLy9cbiAgICAgIC8vIElmIHRoZSBldmVudCBlbWl0dGVkIGlzICcqJyBhdCB0aGlzIHBhcnRcbiAgICAgIC8vIG9yIHRoZXJlIGlzIGEgY29uY3JldGUgbWF0Y2ggYXQgdGhpcyBwYXRjaFxuICAgICAgLy9cbiAgICAgIGlmIChjdXJyZW50VHlwZSA9PT0gJyonKSB7XG4gICAgICAgIGZvciAoYnJhbmNoIGluIHRyZWUpIHtcbiAgICAgICAgICBpZiAoYnJhbmNoICE9PSAnX2xpc3RlbmVycycgJiYgdHJlZS5oYXNPd25Qcm9wZXJ0eShicmFuY2gpKSB7XG4gICAgICAgICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuY29uY2F0KHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZVticmFuY2hdLCBpKzEpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGxpc3RlbmVycztcbiAgICAgIH0gZWxzZSBpZihjdXJyZW50VHlwZSA9PT0gJyoqJykge1xuICAgICAgICBlbmRSZWFjaGVkID0gKGkrMSA9PT0gdHlwZUxlbmd0aCB8fCAoaSsyID09PSB0eXBlTGVuZ3RoICYmIG5leHRUeXBlID09PSAnKicpKTtcbiAgICAgICAgaWYoZW5kUmVhY2hlZCAmJiB0cmVlLl9saXN0ZW5lcnMpIHtcbiAgICAgICAgICAvLyBUaGUgbmV4dCBlbGVtZW50IGhhcyBhIF9saXN0ZW5lcnMsIGFkZCBpdCB0byB0aGUgaGFuZGxlcnMuXG4gICAgICAgICAgbGlzdGVuZXJzID0gbGlzdGVuZXJzLmNvbmNhdChzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHRyZWUsIHR5cGVMZW5ndGgpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoYnJhbmNoIGluIHRyZWUpIHtcbiAgICAgICAgICBpZiAoYnJhbmNoICE9PSAnX2xpc3RlbmVycycgJiYgdHJlZS5oYXNPd25Qcm9wZXJ0eShicmFuY2gpKSB7XG4gICAgICAgICAgICBpZihicmFuY2ggPT09ICcqJyB8fCBicmFuY2ggPT09ICcqKicpIHtcbiAgICAgICAgICAgICAgaWYodHJlZVticmFuY2hdLl9saXN0ZW5lcnMgJiYgIWVuZFJlYWNoZWQpIHtcbiAgICAgICAgICAgICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuY29uY2F0KHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZVticmFuY2hdLCB0eXBlTGVuZ3RoKSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgbGlzdGVuZXJzID0gbGlzdGVuZXJzLmNvbmNhdChzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHRyZWVbYnJhbmNoXSwgaSkpO1xuICAgICAgICAgICAgfSBlbHNlIGlmKGJyYW5jaCA9PT0gbmV4dFR5cGUpIHtcbiAgICAgICAgICAgICAgbGlzdGVuZXJzID0gbGlzdGVuZXJzLmNvbmNhdChzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHRyZWVbYnJhbmNoXSwgaSsyKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAvLyBObyBtYXRjaCBvbiB0aGlzIG9uZSwgc2hpZnQgaW50byB0aGUgdHJlZSBidXQgbm90IGluIHRoZSB0eXBlIGFycmF5LlxuICAgICAgICAgICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuY29uY2F0KHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZVticmFuY2hdLCBpKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBsaXN0ZW5lcnM7XG4gICAgICB9XG5cbiAgICAgIGxpc3RlbmVycyA9IGxpc3RlbmVycy5jb25jYXQoc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB0cmVlW2N1cnJlbnRUeXBlXSwgaSsxKSk7XG4gICAgfVxuXG4gICAgeFRyZWUgPSB0cmVlWycqJ107XG4gICAgaWYgKHhUcmVlKSB7XG4gICAgICAvL1xuICAgICAgLy8gSWYgdGhlIGxpc3RlbmVyIHRyZWUgd2lsbCBhbGxvdyBhbnkgbWF0Y2ggZm9yIHRoaXMgcGFydCxcbiAgICAgIC8vIHRoZW4gcmVjdXJzaXZlbHkgZXhwbG9yZSBhbGwgYnJhbmNoZXMgb2YgdGhlIHRyZWVcbiAgICAgIC8vXG4gICAgICBzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHhUcmVlLCBpKzEpO1xuICAgIH1cblxuICAgIHh4VHJlZSA9IHRyZWVbJyoqJ107XG4gICAgaWYoeHhUcmVlKSB7XG4gICAgICBpZihpIDwgdHlwZUxlbmd0aCkge1xuICAgICAgICBpZih4eFRyZWUuX2xpc3RlbmVycykge1xuICAgICAgICAgIC8vIElmIHdlIGhhdmUgYSBsaXN0ZW5lciBvbiBhICcqKicsIGl0IHdpbGwgY2F0Y2ggYWxsLCBzbyBhZGQgaXRzIGhhbmRsZXIuXG4gICAgICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB4eFRyZWUsIHR5cGVMZW5ndGgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQnVpbGQgYXJyYXlzIG9mIG1hdGNoaW5nIG5leHQgYnJhbmNoZXMgYW5kIG90aGVycy5cbiAgICAgICAgZm9yKGJyYW5jaCBpbiB4eFRyZWUpIHtcbiAgICAgICAgICBpZihicmFuY2ggIT09ICdfbGlzdGVuZXJzJyAmJiB4eFRyZWUuaGFzT3duUHJvcGVydHkoYnJhbmNoKSkge1xuICAgICAgICAgICAgaWYoYnJhbmNoID09PSBuZXh0VHlwZSkge1xuICAgICAgICAgICAgICAvLyBXZSBrbm93IHRoZSBuZXh0IGVsZW1lbnQgd2lsbCBtYXRjaCwgc28ganVtcCB0d2ljZS5cbiAgICAgICAgICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB4eFRyZWVbYnJhbmNoXSwgaSsyKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZihicmFuY2ggPT09IGN1cnJlbnRUeXBlKSB7XG4gICAgICAgICAgICAgIC8vIEN1cnJlbnQgbm9kZSBtYXRjaGVzLCBtb3ZlIGludG8gdGhlIHRyZWUuXG4gICAgICAgICAgICAgIHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgeHhUcmVlW2JyYW5jaF0sIGkrMSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBpc29sYXRlZEJyYW5jaCA9IHt9O1xuICAgICAgICAgICAgICBpc29sYXRlZEJyYW5jaFticmFuY2hdID0geHhUcmVlW2JyYW5jaF07XG4gICAgICAgICAgICAgIHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgeyAnKionOiBpc29sYXRlZEJyYW5jaCB9LCBpKzEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmKHh4VHJlZS5fbGlzdGVuZXJzKSB7XG4gICAgICAgIC8vIFdlIGhhdmUgcmVhY2hlZCB0aGUgZW5kIGFuZCBzdGlsbCBvbiBhICcqKidcbiAgICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB4eFRyZWUsIHR5cGVMZW5ndGgpO1xuICAgICAgfSBlbHNlIGlmKHh4VHJlZVsnKiddICYmIHh4VHJlZVsnKiddLl9saXN0ZW5lcnMpIHtcbiAgICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB4eFRyZWVbJyonXSwgdHlwZUxlbmd0aCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGxpc3RlbmVycztcbiAgfVxuXG4gIGZ1bmN0aW9uIGdyb3dMaXN0ZW5lclRyZWUodHlwZSwgbGlzdGVuZXIpIHtcblxuICAgIHR5cGUgPSB0eXBlb2YgdHlwZSA9PT0gJ3N0cmluZycgPyB0eXBlLnNwbGl0KHRoaXMuZGVsaW1pdGVyKSA6IHR5cGUuc2xpY2UoKTtcblxuICAgIC8vXG4gICAgLy8gTG9va3MgZm9yIHR3byBjb25zZWN1dGl2ZSAnKionLCBpZiBzbywgZG9uJ3QgYWRkIHRoZSBldmVudCBhdCBhbGwuXG4gICAgLy9cbiAgICBmb3IodmFyIGkgPSAwLCBsZW4gPSB0eXBlLmxlbmd0aDsgaSsxIDwgbGVuOyBpKyspIHtcbiAgICAgIGlmKHR5cGVbaV0gPT09ICcqKicgJiYgdHlwZVtpKzFdID09PSAnKionKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgdHJlZSA9IHRoaXMubGlzdGVuZXJUcmVlO1xuICAgIHZhciBuYW1lID0gdHlwZS5zaGlmdCgpO1xuXG4gICAgd2hpbGUgKG5hbWUpIHtcblxuICAgICAgaWYgKCF0cmVlW25hbWVdKSB7XG4gICAgICAgIHRyZWVbbmFtZV0gPSB7fTtcbiAgICAgIH1cblxuICAgICAgdHJlZSA9IHRyZWVbbmFtZV07XG5cbiAgICAgIGlmICh0eXBlLmxlbmd0aCA9PT0gMCkge1xuXG4gICAgICAgIGlmICghdHJlZS5fbGlzdGVuZXJzKSB7XG4gICAgICAgICAgdHJlZS5fbGlzdGVuZXJzID0gbGlzdGVuZXI7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZih0eXBlb2YgdHJlZS5fbGlzdGVuZXJzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgdHJlZS5fbGlzdGVuZXJzID0gW3RyZWUuX2xpc3RlbmVycywgbGlzdGVuZXJdO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGlzQXJyYXkodHJlZS5fbGlzdGVuZXJzKSkge1xuXG4gICAgICAgICAgdHJlZS5fbGlzdGVuZXJzLnB1c2gobGlzdGVuZXIpO1xuXG4gICAgICAgICAgaWYgKCF0cmVlLl9saXN0ZW5lcnMud2FybmVkKSB7XG5cbiAgICAgICAgICAgIHZhciBtID0gZGVmYXVsdE1heExpc3RlbmVycztcblxuICAgICAgICAgICAgaWYgKHR5cGVvZiB0aGlzLl9ldmVudHMubWF4TGlzdGVuZXJzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICBtID0gdGhpcy5fZXZlbnRzLm1heExpc3RlbmVycztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKG0gPiAwICYmIHRyZWUuX2xpc3RlbmVycy5sZW5ndGggPiBtKSB7XG5cbiAgICAgICAgICAgICAgdHJlZS5fbGlzdGVuZXJzLndhcm5lZCA9IHRydWU7XG4gICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJyhub2RlKSB3YXJuaW5nOiBwb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5ICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdsZWFrIGRldGVjdGVkLiAlZCBsaXN0ZW5lcnMgYWRkZWQuICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyZWUuX2xpc3RlbmVycy5sZW5ndGgpO1xuICAgICAgICAgICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgbmFtZSA9IHR5cGUuc2hpZnQoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvLyBCeSBkZWZhdWx0IEV2ZW50RW1pdHRlcnMgd2lsbCBwcmludCBhIHdhcm5pbmcgaWYgbW9yZSB0aGFuXG4gIC8vIDEwIGxpc3RlbmVycyBhcmUgYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaFxuICAvLyBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbiAgLy9cbiAgLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4gIC8vIHRoYXQgdG8gYmUgaW5jcmVhc2VkLiBTZXQgdG8gemVybyBmb3IgdW5saW1pdGVkLlxuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuZGVsaW1pdGVyID0gJy4nO1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24obikge1xuICAgIHRoaXMuX2V2ZW50cyB8fCBpbml0LmNhbGwodGhpcyk7XG4gICAgdGhpcy5fZXZlbnRzLm1heExpc3RlbmVycyA9IG47XG4gICAgaWYgKCF0aGlzLl9jb25mKSB0aGlzLl9jb25mID0ge307XG4gICAgdGhpcy5fY29uZi5tYXhMaXN0ZW5lcnMgPSBuO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuZXZlbnQgPSAnJztcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbihldmVudCwgZm4pIHtcbiAgICB0aGlzLm1hbnkoZXZlbnQsIDEsIGZuKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm1hbnkgPSBmdW5jdGlvbihldmVudCwgdHRsLCBmbikge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIGlmICh0eXBlb2YgZm4gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignbWFueSBvbmx5IGFjY2VwdHMgaW5zdGFuY2VzIG9mIEZ1bmN0aW9uJyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGlzdGVuZXIoKSB7XG4gICAgICBpZiAoLS10dGwgPT09IDApIHtcbiAgICAgICAgc2VsZi5vZmYoZXZlbnQsIGxpc3RlbmVyKTtcbiAgICAgIH1cbiAgICAgIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuXG4gICAgbGlzdGVuZXIuX29yaWdpbiA9IGZuO1xuXG4gICAgdGhpcy5vbihldmVudCwgbGlzdGVuZXIpO1xuXG4gICAgcmV0dXJuIHNlbGY7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24oKSB7XG5cbiAgICB0aGlzLl9ldmVudHMgfHwgaW5pdC5jYWxsKHRoaXMpO1xuXG4gICAgdmFyIHR5cGUgPSBhcmd1bWVudHNbMF07XG5cbiAgICBpZiAodHlwZSA9PT0gJ25ld0xpc3RlbmVyJyAmJiAhdGhpcy5uZXdMaXN0ZW5lcikge1xuICAgICAgaWYgKCF0aGlzLl9ldmVudHMubmV3TGlzdGVuZXIpIHsgcmV0dXJuIGZhbHNlOyB9XG4gICAgfVxuXG4gICAgLy8gTG9vcCB0aHJvdWdoIHRoZSAqX2FsbCogZnVuY3Rpb25zIGFuZCBpbnZva2UgdGhlbS5cbiAgICBpZiAodGhpcy5fYWxsKSB7XG4gICAgICB2YXIgbCA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICB2YXIgYXJncyA9IG5ldyBBcnJheShsIC0gMSk7XG4gICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGw7IGkrKykgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICBmb3IgKGkgPSAwLCBsID0gdGhpcy5fYWxsLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICB0aGlzLmV2ZW50ID0gdHlwZTtcbiAgICAgICAgdGhpcy5fYWxsW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIElmIHRoZXJlIGlzIG5vICdlcnJvcicgZXZlbnQgbGlzdGVuZXIgdGhlbiB0aHJvdy5cbiAgICBpZiAodHlwZSA9PT0gJ2Vycm9yJykge1xuXG4gICAgICBpZiAoIXRoaXMuX2FsbCAmJlxuICAgICAgICAhdGhpcy5fZXZlbnRzLmVycm9yICYmXG4gICAgICAgICEodGhpcy53aWxkY2FyZCAmJiB0aGlzLmxpc3RlbmVyVHJlZS5lcnJvcikpIHtcblxuICAgICAgICBpZiAoYXJndW1lbnRzWzFdIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgICB0aHJvdyBhcmd1bWVudHNbMV07IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVW5jYXVnaHQsIHVuc3BlY2lmaWVkICdlcnJvcicgZXZlbnQuXCIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgaGFuZGxlcjtcblxuICAgIGlmKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgIGhhbmRsZXIgPSBbXTtcbiAgICAgIHZhciBucyA9IHR5cGVvZiB0eXBlID09PSAnc3RyaW5nJyA/IHR5cGUuc3BsaXQodGhpcy5kZWxpbWl0ZXIpIDogdHlwZS5zbGljZSgpO1xuICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlLmNhbGwodGhpcywgaGFuZGxlciwgbnMsIHRoaXMubGlzdGVuZXJUcmVlLCAwKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBoYW5kbGVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgaGFuZGxlciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpcy5ldmVudCA9IHR5cGU7XG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcyk7XG4gICAgICB9XG4gICAgICBlbHNlIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSlcbiAgICAgICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAgICAgY2FzZSAyOlxuICAgICAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgLy8gc2xvd2VyXG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHZhciBsID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgICAgICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGwgLSAxKTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgbDsgaSsrKSBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBlbHNlIGlmIChoYW5kbGVyKSB7XG4gICAgICB2YXIgbCA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICB2YXIgYXJncyA9IG5ldyBBcnJheShsIC0gMSk7XG4gICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGw7IGkrKykgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG5cbiAgICAgIHZhciBsaXN0ZW5lcnMgPSBoYW5kbGVyLnNsaWNlKCk7XG4gICAgICBmb3IgKHZhciBpID0gMCwgbCA9IGxpc3RlbmVycy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgdGhpcy5ldmVudCA9IHR5cGU7XG4gICAgICAgIGxpc3RlbmVyc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiAobGlzdGVuZXJzLmxlbmd0aCA+IDApIHx8ICEhdGhpcy5fYWxsO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHJldHVybiAhIXRoaXMuX2FsbDtcbiAgICB9XG5cbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcblxuICAgIGlmICh0eXBlb2YgdHlwZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpcy5vbkFueSh0eXBlKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgbGlzdGVuZXIgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignb24gb25seSBhY2NlcHRzIGluc3RhbmNlcyBvZiBGdW5jdGlvbicpO1xuICAgIH1cbiAgICB0aGlzLl9ldmVudHMgfHwgaW5pdC5jYWxsKHRoaXMpO1xuXG4gICAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PSBcIm5ld0xpc3RlbmVyc1wiISBCZWZvcmVcbiAgICAvLyBhZGRpbmcgaXQgdG8gdGhlIGxpc3RlbmVycywgZmlyc3QgZW1pdCBcIm5ld0xpc3RlbmVyc1wiLlxuICAgIHRoaXMuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgICBpZih0aGlzLndpbGRjYXJkKSB7XG4gICAgICBncm93TGlzdGVuZXJUcmVlLmNhbGwodGhpcywgdHlwZSwgbGlzdGVuZXIpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pIHtcbiAgICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gbGlzdGVuZXI7XG4gICAgfVxuICAgIGVsc2UgaWYodHlwZW9mIHRoaXMuX2V2ZW50c1t0eXBlXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgLy8gQWRkaW5nIHRoZSBzZWNvbmQgZWxlbWVudCwgbmVlZCB0byBjaGFuZ2UgdG8gYXJyYXkuXG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdLCBsaXN0ZW5lcl07XG4gICAgfVxuICAgIGVsc2UgaWYgKGlzQXJyYXkodGhpcy5fZXZlbnRzW3R5cGVdKSkge1xuICAgICAgLy8gSWYgd2UndmUgYWxyZWFkeSBnb3QgYW4gYXJyYXksIGp1c3QgYXBwZW5kLlxuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLnB1c2gobGlzdGVuZXIpO1xuXG4gICAgICAvLyBDaGVjayBmb3IgbGlzdGVuZXIgbGVha1xuICAgICAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkKSB7XG5cbiAgICAgICAgdmFyIG0gPSBkZWZhdWx0TWF4TGlzdGVuZXJzO1xuXG4gICAgICAgIGlmICh0eXBlb2YgdGhpcy5fZXZlbnRzLm1heExpc3RlbmVycyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICBtID0gdGhpcy5fZXZlbnRzLm1heExpc3RlbmVycztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChtID4gMCAmJiB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoID4gbSkge1xuXG4gICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCA9IHRydWU7XG4gICAgICAgICAgY29uc29sZS5lcnJvcignKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAnbGVhayBkZXRlY3RlZC4gJWQgbGlzdGVuZXJzIGFkZGVkLiAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCk7XG4gICAgICAgICAgY29uc29sZS50cmFjZSgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUub25BbnkgPSBmdW5jdGlvbihmbikge1xuXG4gICAgaWYgKHR5cGVvZiBmbiAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdvbkFueSBvbmx5IGFjY2VwdHMgaW5zdGFuY2VzIG9mIEZ1bmN0aW9uJyk7XG4gICAgfVxuXG4gICAgaWYoIXRoaXMuX2FsbCkge1xuICAgICAgdGhpcy5fYWxsID0gW107XG4gICAgfVxuXG4gICAgLy8gQWRkIHRoZSBmdW5jdGlvbiB0byB0aGUgZXZlbnQgbGlzdGVuZXIgY29sbGVjdGlvbi5cbiAgICB0aGlzLl9hbGwucHVzaChmbik7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUub247XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vZmYgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICAgIGlmICh0eXBlb2YgbGlzdGVuZXIgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcigncmVtb3ZlTGlzdGVuZXIgb25seSB0YWtlcyBpbnN0YW5jZXMgb2YgRnVuY3Rpb24nKTtcbiAgICB9XG5cbiAgICB2YXIgaGFuZGxlcnMsbGVhZnM9W107XG5cbiAgICBpZih0aGlzLndpbGRjYXJkKSB7XG4gICAgICB2YXIgbnMgPSB0eXBlb2YgdHlwZSA9PT0gJ3N0cmluZycgPyB0eXBlLnNwbGl0KHRoaXMuZGVsaW1pdGVyKSA6IHR5cGUuc2xpY2UoKTtcbiAgICAgIGxlYWZzID0gc2VhcmNoTGlzdGVuZXJUcmVlLmNhbGwodGhpcywgbnVsbCwgbnMsIHRoaXMubGlzdGVuZXJUcmVlLCAwKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAvLyBkb2VzIG5vdCB1c2UgbGlzdGVuZXJzKCksIHNvIG5vIHNpZGUgZWZmZWN0IG9mIGNyZWF0aW5nIF9ldmVudHNbdHlwZV1cbiAgICAgIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKSByZXR1cm4gdGhpcztcbiAgICAgIGhhbmRsZXJzID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgICAgbGVhZnMucHVzaCh7X2xpc3RlbmVyczpoYW5kbGVyc30pO1xuICAgIH1cblxuICAgIGZvciAodmFyIGlMZWFmPTA7IGlMZWFmPGxlYWZzLmxlbmd0aDsgaUxlYWYrKykge1xuICAgICAgdmFyIGxlYWYgPSBsZWFmc1tpTGVhZl07XG4gICAgICBoYW5kbGVycyA9IGxlYWYuX2xpc3RlbmVycztcbiAgICAgIGlmIChpc0FycmF5KGhhbmRsZXJzKSkge1xuXG4gICAgICAgIHZhciBwb3NpdGlvbiA9IC0xO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBoYW5kbGVycy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICAgIGlmIChoYW5kbGVyc1tpXSA9PT0gbGlzdGVuZXIgfHxcbiAgICAgICAgICAgIChoYW5kbGVyc1tpXS5saXN0ZW5lciAmJiBoYW5kbGVyc1tpXS5saXN0ZW5lciA9PT0gbGlzdGVuZXIpIHx8XG4gICAgICAgICAgICAoaGFuZGxlcnNbaV0uX29yaWdpbiAmJiBoYW5kbGVyc1tpXS5fb3JpZ2luID09PSBsaXN0ZW5lcikpIHtcbiAgICAgICAgICAgIHBvc2l0aW9uID0gaTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChwb3NpdGlvbiA8IDApIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgICAgICBsZWFmLl9saXN0ZW5lcnMuc3BsaWNlKHBvc2l0aW9uLCAxKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0uc3BsaWNlKHBvc2l0aW9uLCAxKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChoYW5kbGVycy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICBpZih0aGlzLndpbGRjYXJkKSB7XG4gICAgICAgICAgICBkZWxldGUgbGVhZi5fbGlzdGVuZXJzO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfVxuICAgICAgZWxzZSBpZiAoaGFuZGxlcnMgPT09IGxpc3RlbmVyIHx8XG4gICAgICAgIChoYW5kbGVycy5saXN0ZW5lciAmJiBoYW5kbGVycy5saXN0ZW5lciA9PT0gbGlzdGVuZXIpIHx8XG4gICAgICAgIChoYW5kbGVycy5fb3JpZ2luICYmIGhhbmRsZXJzLl9vcmlnaW4gPT09IGxpc3RlbmVyKSkge1xuICAgICAgICBpZih0aGlzLndpbGRjYXJkKSB7XG4gICAgICAgICAgZGVsZXRlIGxlYWYuX2xpc3RlbmVycztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vZmZBbnkgPSBmdW5jdGlvbihmbikge1xuICAgIHZhciBpID0gMCwgbCA9IDAsIGZucztcbiAgICBpZiAoZm4gJiYgdGhpcy5fYWxsICYmIHRoaXMuX2FsbC5sZW5ndGggPiAwKSB7XG4gICAgICBmbnMgPSB0aGlzLl9hbGw7XG4gICAgICBmb3IoaSA9IDAsIGwgPSBmbnMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIGlmKGZuID09PSBmbnNbaV0pIHtcbiAgICAgICAgICBmbnMuc3BsaWNlKGksIDEpO1xuICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2FsbCA9IFtdO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vZmY7XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgICF0aGlzLl9ldmVudHMgfHwgaW5pdC5jYWxsKHRoaXMpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgaWYodGhpcy53aWxkY2FyZCkge1xuICAgICAgdmFyIG5zID0gdHlwZW9mIHR5cGUgPT09ICdzdHJpbmcnID8gdHlwZS5zcGxpdCh0aGlzLmRlbGltaXRlcikgOiB0eXBlLnNsaWNlKCk7XG4gICAgICB2YXIgbGVhZnMgPSBzZWFyY2hMaXN0ZW5lclRyZWUuY2FsbCh0aGlzLCBudWxsLCBucywgdGhpcy5saXN0ZW5lclRyZWUsIDApO1xuXG4gICAgICBmb3IgKHZhciBpTGVhZj0wOyBpTGVhZjxsZWFmcy5sZW5ndGg7IGlMZWFmKyspIHtcbiAgICAgICAgdmFyIGxlYWYgPSBsZWFmc1tpTGVhZl07XG4gICAgICAgIGxlYWYuX2xpc3RlbmVycyA9IG51bGw7XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pIHJldHVybiB0aGlzO1xuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gICAgaWYodGhpcy53aWxkY2FyZCkge1xuICAgICAgdmFyIGhhbmRsZXJzID0gW107XG4gICAgICB2YXIgbnMgPSB0eXBlb2YgdHlwZSA9PT0gJ3N0cmluZycgPyB0eXBlLnNwbGl0KHRoaXMuZGVsaW1pdGVyKSA6IHR5cGUuc2xpY2UoKTtcbiAgICAgIHNlYXJjaExpc3RlbmVyVHJlZS5jYWxsKHRoaXMsIGhhbmRsZXJzLCBucywgdGhpcy5saXN0ZW5lclRyZWUsIDApO1xuICAgICAgcmV0dXJuIGhhbmRsZXJzO1xuICAgIH1cblxuICAgIHRoaXMuX2V2ZW50cyB8fCBpbml0LmNhbGwodGhpcyk7XG5cbiAgICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSkgdGhpcy5fZXZlbnRzW3R5cGVdID0gW107XG4gICAgaWYgKCFpc0FycmF5KHRoaXMuX2V2ZW50c1t0eXBlXSkpIHtcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzQW55ID0gZnVuY3Rpb24oKSB7XG5cbiAgICBpZih0aGlzLl9hbGwpIHtcbiAgICAgIHJldHVybiB0aGlzLl9hbGw7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICB9O1xuXG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxuICAgIGRlZmluZShmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBFdmVudEVtaXR0ZXI7XG4gICAgfSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnKSB7XG4gICAgLy8gQ29tbW9uSlNcbiAgICBleHBvcnRzLkV2ZW50RW1pdHRlcjIgPSBFdmVudEVtaXR0ZXI7XG4gIH1cbiAgZWxzZSB7XG4gICAgLy8gQnJvd3NlciBnbG9iYWwuXG4gICAgd2luZG93LkV2ZW50RW1pdHRlcjIgPSBFdmVudEVtaXR0ZXI7XG4gIH1cbn0oKTtcbiIsInZhciBoYXNPd24gPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xudmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcbnZhciB1bmRlZmluZWQ7XG5cbnZhciBpc1BsYWluT2JqZWN0ID0gZnVuY3Rpb24gaXNQbGFpbk9iamVjdChvYmopIHtcblx0J3VzZSBzdHJpY3QnO1xuXHRpZiAoIW9iaiB8fCB0b1N0cmluZy5jYWxsKG9iaikgIT09ICdbb2JqZWN0IE9iamVjdF0nKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0dmFyIGhhc19vd25fY29uc3RydWN0b3IgPSBoYXNPd24uY2FsbChvYmosICdjb25zdHJ1Y3RvcicpO1xuXHR2YXIgaGFzX2lzX3Byb3BlcnR5X29mX21ldGhvZCA9IG9iai5jb25zdHJ1Y3RvciAmJiBvYmouY29uc3RydWN0b3IucHJvdG90eXBlICYmIGhhc093bi5jYWxsKG9iai5jb25zdHJ1Y3Rvci5wcm90b3R5cGUsICdpc1Byb3RvdHlwZU9mJyk7XG5cdC8vIE5vdCBvd24gY29uc3RydWN0b3IgcHJvcGVydHkgbXVzdCBiZSBPYmplY3Rcblx0aWYgKG9iai5jb25zdHJ1Y3RvciAmJiAhaGFzX293bl9jb25zdHJ1Y3RvciAmJiAhaGFzX2lzX3Byb3BlcnR5X29mX21ldGhvZCkge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdC8vIE93biBwcm9wZXJ0aWVzIGFyZSBlbnVtZXJhdGVkIGZpcnN0bHksIHNvIHRvIHNwZWVkIHVwLFxuXHQvLyBpZiBsYXN0IG9uZSBpcyBvd24sIHRoZW4gYWxsIHByb3BlcnRpZXMgYXJlIG93bi5cblx0dmFyIGtleTtcblx0Zm9yIChrZXkgaW4gb2JqKSB7fVxuXG5cdHJldHVybiBrZXkgPT09IHVuZGVmaW5lZCB8fCBoYXNPd24uY2FsbChvYmosIGtleSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGV4dGVuZCgpIHtcblx0J3VzZSBzdHJpY3QnO1xuXHR2YXIgb3B0aW9ucywgbmFtZSwgc3JjLCBjb3B5LCBjb3B5SXNBcnJheSwgY2xvbmUsXG5cdFx0dGFyZ2V0ID0gYXJndW1lbnRzWzBdLFxuXHRcdGkgPSAxLFxuXHRcdGxlbmd0aCA9IGFyZ3VtZW50cy5sZW5ndGgsXG5cdFx0ZGVlcCA9IGZhbHNlO1xuXG5cdC8vIEhhbmRsZSBhIGRlZXAgY29weSBzaXR1YXRpb25cblx0aWYgKHR5cGVvZiB0YXJnZXQgPT09ICdib29sZWFuJykge1xuXHRcdGRlZXAgPSB0YXJnZXQ7XG5cdFx0dGFyZ2V0ID0gYXJndW1lbnRzWzFdIHx8IHt9O1xuXHRcdC8vIHNraXAgdGhlIGJvb2xlYW4gYW5kIHRoZSB0YXJnZXRcblx0XHRpID0gMjtcblx0fSBlbHNlIGlmICgodHlwZW9mIHRhcmdldCAhPT0gJ29iamVjdCcgJiYgdHlwZW9mIHRhcmdldCAhPT0gJ2Z1bmN0aW9uJykgfHwgdGFyZ2V0ID09IG51bGwpIHtcblx0XHR0YXJnZXQgPSB7fTtcblx0fVxuXG5cdGZvciAoOyBpIDwgbGVuZ3RoOyArK2kpIHtcblx0XHRvcHRpb25zID0gYXJndW1lbnRzW2ldO1xuXHRcdC8vIE9ubHkgZGVhbCB3aXRoIG5vbi1udWxsL3VuZGVmaW5lZCB2YWx1ZXNcblx0XHRpZiAob3B0aW9ucyAhPSBudWxsKSB7XG5cdFx0XHQvLyBFeHRlbmQgdGhlIGJhc2Ugb2JqZWN0XG5cdFx0XHRmb3IgKG5hbWUgaW4gb3B0aW9ucykge1xuXHRcdFx0XHRzcmMgPSB0YXJnZXRbbmFtZV07XG5cdFx0XHRcdGNvcHkgPSBvcHRpb25zW25hbWVdO1xuXG5cdFx0XHRcdC8vIFByZXZlbnQgbmV2ZXItZW5kaW5nIGxvb3Bcblx0XHRcdFx0aWYgKHRhcmdldCA9PT0gY29weSkge1xuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gUmVjdXJzZSBpZiB3ZSdyZSBtZXJnaW5nIHBsYWluIG9iamVjdHMgb3IgYXJyYXlzXG5cdFx0XHRcdGlmIChkZWVwICYmIGNvcHkgJiYgKGlzUGxhaW5PYmplY3QoY29weSkgfHwgKGNvcHlJc0FycmF5ID0gQXJyYXkuaXNBcnJheShjb3B5KSkpKSB7XG5cdFx0XHRcdFx0aWYgKGNvcHlJc0FycmF5KSB7XG5cdFx0XHRcdFx0XHRjb3B5SXNBcnJheSA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0Y2xvbmUgPSBzcmMgJiYgQXJyYXkuaXNBcnJheShzcmMpID8gc3JjIDogW107XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGNsb25lID0gc3JjICYmIGlzUGxhaW5PYmplY3Qoc3JjKSA/IHNyYyA6IHt9O1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdC8vIE5ldmVyIG1vdmUgb3JpZ2luYWwgb2JqZWN0cywgY2xvbmUgdGhlbVxuXHRcdFx0XHRcdHRhcmdldFtuYW1lXSA9IGV4dGVuZChkZWVwLCBjbG9uZSwgY29weSk7XG5cblx0XHRcdFx0Ly8gRG9uJ3QgYnJpbmcgaW4gdW5kZWZpbmVkIHZhbHVlc1xuXHRcdFx0XHR9IGVsc2UgaWYgKGNvcHkgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdHRhcmdldFtuYW1lXSA9IGNvcHk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHQvLyBSZXR1cm4gdGhlIG1vZGlmaWVkIG9iamVjdFxuXHRyZXR1cm4gdGFyZ2V0O1xufTtcblxuIiwiXG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSggJ2V2ZW50ZW1pdHRlcjInICkuRXZlbnRFbWl0dGVyMjtcblxubW9kdWxlLmV4cG9ydHMuWW1pciA9IFltaXI7XG5cbmZ1bmN0aW9uIFltaXIoIG9wdGlvbnMgKSB7IFxuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgRXZlbnRFbWl0dGVyLmNhbGwoIHRoaXMgKTtcbiAgICB0aGlzLnZpZXdzID0ge307XG4gICAgdGhpcy5saXN0ID0gb3B0aW9ucy5saXN0RWwgfHwgZG9jdW1lbnQuY3JlYXRlRWxlbWVudCggb3B0aW9ucy5saXN0VGFnTmFtZSB8fCAnbmF2JyApO1xuICAgIHRoaXMuZWwgPSBvcHRpb25zLmVsIHx8IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoIG9wdGlvbnMudGFnTmFtZSAgfHwgJ2RpdicgKTtcbiAgICB0aGlzLmVsLmNsYXNzTmFtZSA9IG9wdGlvbnMuY2xhc3NOYW1lO1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgdGhpcy5vcHRpb25zLnNob3dDbGFzcyA9IG9wdGlvbnMuc2hvd0NsYXNzIHx8ICdzaG93JztcbiAgICB0aGlzLl9pc0R5bmFtaWMgPSBvcHRpb25zLmR5bmFtaWMgPT09IGZhbHNlID8gZmFsc2UgOiB0cnVlO1xufVxuXG5ZbWlyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoIEV2ZW50RW1pdHRlci5wcm90b3R5cGUsIHtcbiAgICB2aWV3TGlzdDoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCApIHtcbiAgICAgICAgICAgIHJldHVybiBPYmplY3Qua2V5cyggdGhpcy52aWV3cyApLm1hcCggdGhpcy5fbWFwVmlld3MuYmluZCggdGhpcyApICk7XG4gICAgICAgIH1cbiAgICB9XG59ICk7XG5cblltaXIucHJvdG90eXBlLmFkZFZpZXcgPSBmdW5jdGlvbiggdmlldyApIHtcbiAgICB2YXIgaXNWaWV3ID0gWW1pci5pc1ZpZXcoIHZpZXcgKTtcbiAgICBpZiAoICFpc1ZpZXcgKXtcbiAgICAgICAgdGhpcy5lbWl0KCAnZXJyb3InLCBuZXcgRXJyb3IoICdJc3N1ZSBhZGRpbmcgdmlldzogaW52YWxpZCB2aWV3JyApICk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYgKCB0aGlzLnZpZXdzWyB2aWV3LmlkIF0gKSB7XG4gICAgICAgIHRoaXMuZW1pdCggJ2Vycm9yJywgbmV3IEVycm9yKCAnSXNzdWUgYWRkaW5nIHZpZXcgd2l0aCB0aGUgaWQgJyArIHZpZXcuaWQgKyAnOiBkdXBsaWNhdGUgaWQnICkgKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0gXG4gICAgaWYgKCB0aGlzLl9pc0R5bmFtaWMgKSB7XG4gICAgICAgIHRoaXMuZWwuYXBwZW5kQ2hpbGQoIHZpZXcuZWwgKTtcbiAgICAgICAgaWYgKCB2aWV3Lmxpbmt0byAhPT0gZmFsc2UgKSB7XG4gICAgICAgICAgICB0aGlzLl9hcHBlbmRUb0xpc3QoIHZpZXcgKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB0aGlzLnZpZXdzWyB2aWV3LmlkIF0gPSB2aWV3O1xuICAgIGlmICggdmlldy5lbC5jbGFzc0xpc3QuY29udGFpbnMoIHRoaXMub3B0aW9ucy5zaG93Q2xhc3MgKSApIHtcbiAgICAgICAgdmlldy5pc1Nob3duID0gZmFsc2U7XG4gICAgICAgIHZpZXcuZWwuY2xhc3NMaXN0LnJlbW92ZSggdGhpcy5vcHRpb25zLnNob3dDbGFzcyApO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cblltaXIucHJvdG90eXBlLnJlbW92ZVZpZXcgPSBmdW5jdGlvbiggaWQgKSB7XG4gICAgdmFyIHZpZXcgPSB0aGlzLnZpZXdzWyBpZCBdLFxuICAgICAgICBsaW5rO1xuXG4gICAgaWYgKCAhdmlldyApIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBpZiAoIHRoaXMuX2lzRHluYW1pYyApIHtcbiAgICAgICAgdGhpcy5lbC5yZW1vdmVDaGlsZCggdmlldy5lbCApO1xuICAgICAgICBpZiAoIHZpZXcubGlua3RvICE9PSBmYWxzZSApIHtcbiAgICAgICAgICAgIGxpbmsgPSB0aGlzLmxpc3QucXVlcnlTZWxlY3RvciggJ1tkYXRhLWxpbmt0bz0nICsgdmlldy5pZCArICddJyApO1xuICAgICAgICAgICAgdGhpcy5saXN0LnJlbW92ZUNoaWxkKCBsaW5rICk7ICAgICAgICBcbiAgICAgICAgfVxuICAgIH1cbiAgICBkZWxldGUgdGhpcy52aWV3c1sgaWQgXTtcbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cblltaXIucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbiggaWQgKSB7XG4gICAgdmFyIHZpZXc7XG4gICAgaWYgKCBpZCAmJiB0aGlzLnZpZXdzWyBpZCBdICkge1xuICAgICAgICB2aWV3ID0gdGhpcy52aWV3c1sgaWQgXTtcbiAgICAgICAgaWYgKCB2aWV3LmlzU2hvd24gKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdmlldy5pc1Nob3duID0gdHJ1ZTtcbiAgICAgICAgdmlldy5lbC5jbGFzc0xpc3QuYWRkKCB0aGlzLm9wdGlvbnMuc2hvd0NsYXNzICk7XG4gICAgICAgIHRoaXMuX2Nsb3NlVmlld3MoIGlkICk7XG4gICAgfVxufTtcblxuWW1pci5wcm90b3R5cGUuX2Nsb3NlVmlld3MgPSBmdW5jdGlvbiggaWQgKSB7XG4gICAgICBcbiAgICB2YXIgc2hvd0NsYXNzID0gdGhpcy5vcHRpb25zLnNob3dDbGFzcyB8fCAnc2hvdyc7XG4gICAgZnVuY3Rpb24gZWFjaFZpZXcoIHZpZXcgKSB7XG4gICAgICAgIGlmICggdmlldy5pc1Nob3duICYmIHZpZXcuaWQgIT09IGlkICkge1xuICAgICAgICAgICAgdmlldy5lbC5jbGFzc0xpc3QucmVtb3ZlKCBzaG93Q2xhc3MgKTtcbiAgICAgICAgICAgIHZpZXcuaXNTaG93biA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy52aWV3TGlzdC5mb3JFYWNoKCBlYWNoVmlldyApOyAgXG59O1xuXG5ZbWlyLnByb3RvdHlwZS5fbWFwVmlld3MgPSBmdW5jdGlvbiggdmlld05hbWUgKSB7XG4gICAgcmV0dXJuIHRoaXMudmlld3NbIHZpZXdOYW1lIF07XG59O1xuXG5ZbWlyLnByb3RvdHlwZS5fYXBwZW5kVG9MaXN0ID0gZnVuY3Rpb24oIHZpZXcgKSB7XG4gICAgdmFyIGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCggdGhpcy5vcHRpb25zLmxpc3RJdGVtVGFnTmFtZSB8fCAnZGl2JyApO1xuICAgIGVsLmlubmVySFRNTCA9IHZpZXcuaWQ7XG4gICAgZWwuc2V0QXR0cmlidXRlKCAnZGF0YS1saW5rdG8nLCB2aWV3LmlkICk7XG4gICAgZWwuYWRkRXZlbnRMaXN0ZW5lciggJ2NsaWNrJywgdGhpcy5vcGVuLmJpbmQoIHRoaXMsIHZpZXcuaWQgKSApOyBcbiAgICB0aGlzLmxpc3QuYXBwZW5kQ2hpbGQoIGVsICk7XG59O1xuXG5ZbWlyLmlzVmlldyA9IGZ1bmN0aW9uKCB2aWV3ICkge1xuICAgIHJldHVybiB2aWV3ICYmIFxuICAgICAgICB0eXBlb2YgdmlldyA9PT0gJ29iamVjdCcgJiYgXG4gICAgICAgIHR5cGVvZiB2aWV3LmVsID09PSAnb2JqZWN0JyAmJiBcbiAgICAgICAgdmlldy5lbC50YWdOYW1lICYmXG4gICAgICAgIHZpZXcuaWQ7IC8vIHRlc3QgYWxsIHJlcXVpcmVtZW50cyBvZiBhIHZpZXdcbn07XG4iLCIvKlxuICogU2lkZWJhciBWaWV3XG4gKi9cblxuLyogZ2xvYmFsIHJlcXVpcmUsIG1vZHVsZSAqL1xuLyoganNoaW50IC1XMDk3ICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCAnZXZlbnRlbWl0dGVyMicgKS5FdmVudEVtaXR0ZXIyLFxuICAgIGV4dGVuZCA9IHJlcXVpcmUoICdleHRlbmQnICk7XG5cbm1vZHVsZS5leHBvcnRzID0gU2lkZWJhclZpZXc7XG5cbnZhciBkZWZhdWx0cyA9IHtcbiAgICBhdXRvZm9jdXM6IHRydWUsXG4gICAgYmFjazogdHJ1ZVxufTtcblxuZnVuY3Rpb24gU2lkZWJhclZpZXcoIHRlbXBsYXRlLCBvcHRpb25zICkge1xuICAgIGlmICggIXRlbXBsYXRlICkge1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgIEV2ZW50RW1pdHRlci5jYWxsKCB0aGlzICk7XG4gICAgdGhpcy5fYmVoYXZpb3JzID0ge307XG4gICAgdGhpcy5fdGVtcGxhdGUgPSAnJyArIHRlbXBsYXRlO1xuICAgIHRoaXMuaWQgPSBvcHRpb25zLnRpdGxlO1xuICAgIHRoaXMuZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCAnZGl2JyApO1xuICAgIHRoaXMuZWwuY2xhc3NMaXN0LmFkZCggJ3NpZGViYXItdmlldycgKTtcbiAgICB0aGlzLmVsLnNldEF0dHJpYnV0ZSggJ2RhdGEtdmlldy1pZCcsIHRoaXMuaWQgKTtcbiAgICB0aGlzLl9hdHRhY2hMaXN0ZW5lcnMoKTtcbiAgICB0aGlzLnNldE9wdGlvbnMoIG9wdGlvbnMgKTtcbiAgICB0aGlzLnNldENvbnRlbnQoIG9wdGlvbnMuZGF0YSwgdGhpcy5lbWl0LmJpbmQoIHRoaXMsICdyZWFkeScsIHRoaXMgKSApO1xufVxuXG5TaWRlYmFyVmlldy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKCBFdmVudEVtaXR0ZXIucHJvdG90eXBlICk7XG5cblNpZGViYXJWaWV3LnByb3RvdHlwZS5zZXRDdXJyZW50ID1cbiAgICBTaWRlYmFyVmlldy5wcm90b3R5cGUub3BlbiA9IGZ1bmN0aW9uKCBlICkge1xuICAgICAgICB0aGlzLmVtaXQoICdvcGVuJywgdGhpcywgZSApO1xuICAgICAgICB0aGlzLm9uY2UoICdhbmltYXRpb246Y29tcGxldGUnLCB0aGlzLm9uQW5pbWF0aW9uQ29tcGxldGUuYmluZCggdGhpcyApKTtcbn07XG5cblNpZGViYXJWaWV3LnByb3RvdHlwZS5vbkFuaW1hdGlvbkNvbXBsZXRlID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKCB0aGlzLm9wdGlvbnMuYXV0b2ZvY3VzICkge1xuICAgICAgICB2YXIgZWwgPSB0aGlzLmVsLnF1ZXJ5U2VsZWN0b3IoICd0ZXh0YXJlYSwgaW5wdXQnICk7XG4gICAgICAgIGlmKCBlbCApe1xuICAgICAgICAgICAgZWwuZm9jdXMoKTtcbiAgICAgICAgICAgIGVsLnNlbGVjdCgpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuU2lkZWJhclZpZXcucHJvdG90eXBlLm9uUmVuZGVyZWQgPSBmdW5jdGlvbiggY2FsbGJhY2sgKSB7XG4gICAgaWYgKCBjYWxsYmFjayApIHtcbiAgICAgICAgY2FsbGJhY2soKTtcbiAgICB9XG4gICAgdGhpcy5lbWl0KCAncmVuZGVyZWQnLCB0aGlzICk7XG4gICAgdGhpcy5nZXRUYWJhYmxlRWxzKCk7XG59O1xuXG5TaWRlYmFyVmlldy5wcm90b3R5cGUuZ2V0VGFiYWJsZUVscyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBsYXN0LFxuICAgICAgICBmaXJzdDtcbiAgICB0aGlzLnRhYmFsZXMgPSB0aGlzLmVsLnF1ZXJ5U2VsZWN0b3JBbGwoICdpbnB1dCwgdGV4dGFyZWEnICk7XG4gICAgdGhpcy50YWJhbGVzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoIHRoaXMudGFiYWxlcywgMCApO1xuICAgIHRoaXMudGFiYWxlcy5mb3JFYWNoKCBmdW5jdGlvbiggdGFiYWJsZSwgaW5kZXggKSB7XG4gICAgICAgIGlmICggaW5kZXggPT09IDAgKSB7XG4gICAgICAgICAgICBmaXJzdCA9IHRhYmFibGU7XG4gICAgICAgIH1cbiAgICAgICAgdGFiYWJsZS5zZXRBdHRyaWJ1dGUoICd0YWItaW5kZXgnLCBpbmRleCApO1xuICAgICAgICBsYXN0ID0gdGFiYWJsZTtcbiAgICB9ICk7XG4gICAgaWYgKCAhbGFzdCApIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBsYXN0LmFkZEV2ZW50TGlzdGVuZXIoICdrZXlkb3duJywgZnVuY3Rpb24oIGUgKSB7XG4gICAgICAgIHZhciBrZXlDb2RlID0gZS5rZXlDb2RlIHx8IGUud2hpY2g7XG4gICAgICAgIGlmICgga2V5Q29kZSA9PT0gOSApIHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGZpcnN0LmZvY3VzKCk7XG4gICAgICAgIH1cbiAgICB9ICk7XG59O1xuXG5TaWRlYmFyVmlldy5wcm90b3R5cGUuc2V0Q29udGVudCA9IGZ1bmN0aW9uKCBkYXRhLCBjYWxsYmFjayApIHtcbiAgICBpZiAoIHR5cGVvZiBkYXRhID09PSAnZnVuY3Rpb24nICkge1xuICAgICAgICBjYWxsYmFjayA9IGRhdGE7XG4gICAgfVxuICAgIGNhbGxiYWNrID0gY2FsbGJhY2sgfHwgZnVuY3Rpb24oKSB7fTtcbiAgICBpZiAoIHR5cGVvZiB0aGlzLnJlbmRlciA9PT0gJ2Z1bmN0aW9uJyApIHtcbiAgICAgICAgdGhpcy5fZGF0YSA9IGRhdGE7XG4gICAgICAgIHRoaXMucmVuZGVyKCB0aGlzLl90ZW1wbGF0ZSwgZGF0YSB8fCB7fSwgZnVuY3Rpb24oIGVyciwgaHRtbCApIHtcbiAgICAgICAgICAgIGlmICggZXJyICkgcmV0dXJuIHRoaXMuZW1pdCggJ2Vycm9yJywgZXJyLCB0aGlzICk7XG4gICAgICAgICAgICB0aGlzLmVsLmlubmVySFRNTCA9IGh0bWw7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCB0aGlzLm9uUmVuZGVyZWQuYmluZCggdGhpcywgY2FsbGJhY2sgKSwgMCApO1xuICAgICAgICB9LmJpbmQoIHRoaXMgKSApO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgdGhpcy5lbC5pbm5lckhUTUwgPSB0aGlzLl90ZW1wbGF0ZTtcbiAgICBzZXRUaW1lb3V0KCB0aGlzLm9uUmVuZGVyZWQuYmluZCggdGhpcywgY2FsbGJhY2sgKSwgMCApO1xufTtcblxuU2lkZWJhclZpZXcucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24oIGUgKSB7XG4gICAgdGhpcy5lbC5jbGFzc0xpc3QucmVtb3ZlKCAnc2hvdycgKTtcbiAgICB0aGlzLmVsLmlzT3BlbiA9IGZhbHNlO1xuICAgIHRoaXMuZW1pdCggJ2Nsb3NlJywgdGhpcywgZSApO1xufTtcblxuU2lkZWJhclZpZXcucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIHRoaXMgaGVscHMgY2xlYW4gdXAgc3RhdGVcbiAgICB0aGlzLmVtaXQoICdjbG9zZScsIHRoaXMgKTtcbiAgICB0aGlzLmVtaXQoICdyZW1vdmUnLCB0aGlzICk7XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoKTtcbn07XG5cblNpZGViYXJWaWV3LnByb3RvdHlwZS5pc1Zpc2libGUgPVxuICAgIFNpZGViYXJWaWV3LnByb3RvdHlwZS5pc0N1cnJlbnQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gdGhpcyBzaG91bGQgYmUgYWNjdXJhdGUgaW4gdGhlIGN1cnJlbnQgc3lzdGVtXG4gICAgICAgIC8vIG1heSBuZWVkIHRvIGdldCByZWZlcmFuY2UgdG8gX3N1cGVyXG4gICAgICAgIHJldHVybiB0aGlzLmVsLmNsYXNzTGlzdC5jb250YWlucyggJ3Nob3cnICk7XG59O1xuXG5TaWRlYmFyVmlldy5wcm90b3R5cGUuc2V0T3B0aW9ucyA9IGZ1bmN0aW9uKCBvcHRpb25zICkge1xuICAgIHZhciBlbHM7XG4gICAgdGhpcy5vcHRpb25zID0gZXh0ZW5kKCB0cnVlLCB7fSwgdGhpcy5vcHRpb25zIHx8IGRlZmF1bHRzLCBvcHRpb25zICk7XG4gICAgdGhpcy5zZXRQYXJlbnRWaWV3KCB0aGlzLm9wdGlvbnMucGFyZW50ICk7XG59O1xuXG5TaWRlYmFyVmlldy5wcm90b3R5cGUuc2V0UGFyZW50VmlldyA9IGZ1bmN0aW9uKCBwYXJlbnQgKSB7XG4gICAgdGhpcy5fcGFyZW50VmlldyA9IHBhcmVudDtcbn07XG5cbi8vIHRoaXMgaXMgZm9yIHRoZSBjc3MzIGFuaW1hdGlvbnNcblNpZGViYXJWaWV3LnByb3RvdHlwZS5fYXR0YWNoTGlzdGVuZXJzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGhhbmRsZSA9IHRoaXMuZW1pdC5iaW5kKCB0aGlzLCAnYW5pbWF0aW9uOmNvbXBsZXRlJyApO1xuICAgIFxuICAgIHRoaXMuZWwuYWRkRXZlbnRMaXN0ZW5lciggJ3dlYmtpdEFuaW1hdGlvbkVuZCcsIGhhbmRsZSwgZmFsc2UgKTtcbiAgICB0aGlzLmVsLmFkZEV2ZW50TGlzdGVuZXIoICdvQW5pbWF0aW9uRW5kJywgaGFuZGxlLCBmYWxzZSApO1xuICAgIHRoaXMuZWwuYWRkRXZlbnRMaXN0ZW5lciggJ2FuaW1hdGlvbmVuZCcsIGhhbmRsZSwgZmFsc2UgKTtcbiAgICB0aGlzLmVsLmFkZEV2ZW50TGlzdGVuZXIoICdtc0FuaW1hdGlvbkVuZCcsIGhhbmRsZSwgZmFsc2UgKTtcbn07XG4iXX0=
