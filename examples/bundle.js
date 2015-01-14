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
    SidebarView = require( './view' );

module.exports = Sidebar;
module.exports.SidebarView = SidebarView;

function Sidebar() {

    EventEmitter.call( this );
    this._views = [];
    this._viewsById = {};
    this.addedClasses = {};

    // do view check
    this.el = document.querySelector( '[data-sidebar]' );
    this._teardownViews();
    this._homeView = null;
    this._currentView = null;
    this._views = [];
    this._viewsById = {};

    this.nav = document.createElement( 'nav' );

    // signify inialization
    if ( this.el ) {
        this.el.appendChild( this.nav );

        if ( !this.wrapper ) {
            this.wrapper = document.createElement( 'div' );
            this.wrapper.classList.add( 'sidebar-wrapper' );
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
    // globalish nav
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

    // if there is no other views auto open.
    if ( !this._currentView ) {
        this._currentView = view;
        view.open();
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
    // dont bother if not a proper view
    if ( !this.isSidebarView( view ) ) return;
    var id = view._id;

    function outView( _view ) {
        if ( id === _view.id ) return false;
        return true;
    }

    // if remove view is current go to home
    if ( this._currentView._id === view.id ) {
        this.home();
    }

    if ( this._viewsById[ id ] ) delete this._viewsById[ id ];
    this._views = this._views.filter( outView );
    view.remove();
};

Sidebar.prototype.setCurrentView = function( view ) {
    var id = view._id,
        _view = this._viewsById[ id ];
    if ( _view ) {
        _view.open();
    }
};

Sidebar.prototype.getView = function( id ) {
    return this._viewsById[ id ];
};

Sidebar.prototype.getCurrentView = function() {
    return this._currentView;
};

Sidebar.prototype.home = function() {
    if ( !this.isSidebarView( this._homeView ) ) return;
    if ( this._currentView._id === this._homeView._id ) return;
    this._homeView.open();
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
    if ( this._viewsById[ view._id ] ) {
        this._viewsById[ view._id ].remove();
    }

    this._appendView( view );
    this._viewsById[ view._id ] = view;
    this._views.push( view );
    this.emit( 'view.added', view );
    return view;
};

Sidebar.prototype._teardownViews = function() {
    if ( !this._views.length ) return;
    this._views.forEach( function( view ) {
        view.remove();
        this.emit( 'view.removed', view );
    }.bind( this ) );
};

Sidebar.prototype._onViewOpening = function( view ) {
    for ( var c in this.addedClasses ) {
        this.removeClass( c );
    }
    this.el.classList.add( 'animating' );
    this.el.removeAttribute( 'style' );
    if ( !this._currentView || view._id !== this._currentView._id ) {

        // close old view
        this._prevView = this._currentView;
        if ( this._prevView ) {
            this._prevView.close();
            this._prevView.el.classList.add( 'sidebar-view-out' );
        }
        this._currentView = view;
    }
    this._handleAnimations(); // must come after we set a _currentView
    this.nav.innerHTML = '';
    this.nav.appendChild( view.title );
    view.options.menuBehaviors
        .forEach( view.addMenuBehavior.bind( this ) );

    this.started = true;
    // indicate there is a view opening
    this.emit( 'view.opened', view );
    this.emit( 'view.opened.' + view._id, view );

};

Sidebar.prototype._onViewRendered = function( view ) {
    // create general and namespaced event
    this.emit( 'view.rendered', view );
    this.emit( 'view.rendered.' + view._id, view );
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
            this.wrapper.classList.add( 'sidebar-wrapper' );
            this.el.appendChild( this.wrapper );
        }
        this.el.classList.add( 'sidebar-init' );
        this.emit( 'ready', this );
    }
};
},{"./view":6,"emit-bindings":3,"eventemitter2":4}],3:[function(require,module,exports){
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
    menuBehaviors: [ {
        behavior: 'sidebar.back',
        label: '&lsaquo; Back',
        position: 'left'
    } ],
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
    this._id = options.id || template.substr( 0, 5 ) + ':' + ( +new Date() );
    this.el = document.createElement( 'div' );
    this.content = document.createElement( 'div' );
    this.title = document.createElement( 'span' );

    if ( !options.nav ) {
        this.nav = document.createElement( 'nav' );
        this.el.appendChild( this.nav );
        this.nav.appendChild( this.title );
    }
    else {
        this.nav = options.nav;
        this.globalNav = true;
    }

    this.el.appendChild( this.content );

    this.nav.classList.add( 'sidebar-view-nav' );
    this.el.classList.add( 'sidebar-view' );
    this.el.setAttribute( 'data-view-id', this._id );
    this.content.classList.add( 'sidebar-view-content' );
    this._attachListeners();
    this.setOptions( options );
    this.setContent( options.data, this.emit.bind( this, 'ready', this ) );
}

SidebarView.prototype = Object.create( EventEmitter.prototype );

SidebarView.prototype.setCurrent =
    SidebarView.prototype.open = function( e ) {
        this.el.classList.add( 'show' );
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
            this.content.innerHTML = html;
            setTimeout( this.onRendered.bind( this, callback ), 0 );
        }.bind( this ) );
        return this;
    }
    this.content.innerHTML = this._template;
    setTimeout( this.onRendered.bind( this, callback ), 0 );
};

SidebarView.prototype.close = function( e ) {
    this.el.classList.remove( 'show' );
    this.emit( 'close', this, e );
};

SidebarView.prototype.remove = function() {
    // this helps clean up state
    this.emit( 'close', this );
    this.emit( 'remove', this );
    this.el.remove();
    this.removeAllListeners();
};

SidebarView.prototype.isVisible =
    SidebarView.prototype.isCurrent = function() {
        // this should be accurate in the current system
        // may need to get referance to _super
        return this.el.classList.contains( 'show' );
};

SidebarView.prototype.setTitle = function( str ) {
    this.title.innerHTML = str;
};

SidebarView.prototype.setOptions = function( options ) {
    var els;
    this.options = extend( true, {}, this.options || defaults, options );
    if ( Array.isArray( this.options.menuBehaviors ) ) {
        if ( !this.globalNav ) {
            this.nav.innerHTML = "";
            this.nav.appendChild( this.title );            
        }
        this.options.menuBehaviors.forEach( this.addMenuBehavior.bind( this ) );
    }
    this.setParentView( this.options.parent );

    if ( this.options.title ) {
        this.setTitle( this.options.title );
    }
};

SidebarView.prototype.setParentView = function( parent ) {
    this._parentView = parent;
};

SidebarView.prototype.addMenuBehavior = function( options ) {
    if ( this.globalNav ) return;
    var button = document.createElement( 'button' );
    button.setAttribute( 'data-emit', options.behavior );
    button.innerHTML = options.label || '';
    if ( options.position ) {
        button.style[ options.position ] = '0';
    }
    if ( options.className ) {
        button.className = options.className;
    }
    //this._behaviors[ options.behavior ] = button;
    this.nav.appendChild( button );
};

// this is for the css3 animations
SidebarView.prototype._attachListeners = function() {
    var handle = this.emit.bind( this, 'animation:complete' );
    
    this.el.addEventListener( 'webkitAnimationEnd', handle, false );
    this.el.addEventListener( 'oAnimationEnd', handle, false );
    this.el.addEventListener( 'animationend', handle, false );
    this.el.addEventListener( 'msAnimationEnd', handle, false );
};
},{"eventemitter2":4,"extend":5}]},{},[1]);
