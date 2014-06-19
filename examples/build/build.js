
/**
 * Require the given path.
 *
 * @param {String} path
 * @return {Object} exports
 * @api public
 */

function require(path, parent, orig) {
  var resolved = require.resolve(path);

  // lookup failed
  if (null == resolved) {
    orig = orig || path;
    parent = parent || 'root';
    var err = new Error('Failed to require "' + orig + '" from "' + parent + '"');
    err.path = orig;
    err.parent = parent;
    err.require = true;
    throw err;
  }

  var module = require.modules[resolved];

  // perform real require()
  // by invoking the module's
  // registered function
  if (!module._resolving && !module.exports) {
    var mod = {};
    mod.exports = {};
    mod.client = mod.component = true;
    module._resolving = true;
    module.call(this, mod.exports, require.relative(resolved), mod);
    delete module._resolving;
    module.exports = mod.exports;
  }

  return module.exports;
}

/**
 * Registered modules.
 */

require.modules = {};

/**
 * Registered aliases.
 */

require.aliases = {};

/**
 * Resolve `path`.
 *
 * Lookup:
 *
 *   - PATH/index.js
 *   - PATH.js
 *   - PATH
 *
 * @param {String} path
 * @return {String} path or null
 * @api private
 */

require.resolve = function(path) {
  if (path.charAt(0) === '/') path = path.slice(1);

  var paths = [
    path,
    path + '.js',
    path + '.json',
    path + '/index.js',
    path + '/index.json'
  ];

  for (var i = 0; i < paths.length; i++) {
    var path = paths[i];
    if (require.modules.hasOwnProperty(path)) return path;
    if (require.aliases.hasOwnProperty(path)) return require.aliases[path];
  }
};

/**
 * Normalize `path` relative to the current path.
 *
 * @param {String} curr
 * @param {String} path
 * @return {String}
 * @api private
 */

require.normalize = function(curr, path) {
  var segs = [];

  if ('.' != path.charAt(0)) return path;

  curr = curr.split('/');
  path = path.split('/');

  for (var i = 0; i < path.length; ++i) {
    if ('..' == path[i]) {
      curr.pop();
    } else if ('.' != path[i] && '' != path[i]) {
      segs.push(path[i]);
    }
  }

  return curr.concat(segs).join('/');
};

/**
 * Register module at `path` with callback `definition`.
 *
 * @param {String} path
 * @param {Function} definition
 * @api private
 */

require.register = function(path, definition) {
  require.modules[path] = definition;
};

/**
 * Alias a module definition.
 *
 * @param {String} from
 * @param {String} to
 * @api private
 */

require.alias = function(from, to) {
  if (!require.modules.hasOwnProperty(from)) {
    throw new Error('Failed to alias "' + from + '", it does not exist');
  }
  require.aliases[to] = from;
};

/**
 * Return a require function relative to the `parent` path.
 *
 * @param {String} parent
 * @return {Function}
 * @api private
 */

require.relative = function(parent) {
  var p = require.normalize(parent, '..');

  /**
   * lastIndexOf helper.
   */

  function lastIndexOf(arr, obj) {
    var i = arr.length;
    while (i--) {
      if (arr[i] === obj) return i;
    }
    return -1;
  }

  /**
   * The relative require() itself.
   */

  function localRequire(path) {
    var resolved = localRequire.resolve(path);
    return require(resolved, parent, path);
  }

  /**
   * Resolve relative to the parent.
   */

  localRequire.resolve = function(path) {
    var c = path.charAt(0);
    if ('/' == c) return path.slice(1);
    if ('.' == c) return require.normalize(p, path);

    // resolve deps by returning
    // the dep in the nearest "deps"
    // directory
    var segs = parent.split('/');
    var i = lastIndexOf(segs, 'deps') + 1;
    if (!i) i = 0;
    path = segs.slice(0, i + 1).join('/') + '/deps/' + path;
    return path;
  };

  /**
   * Check if module is defined at `path`.
   */

  localRequire.exists = function(path) {
    return require.modules.hasOwnProperty(localRequire.resolve(path));
  };

  return localRequire;
};
require.register("component-emitter/index.js", function(exports, require, module){

/**
 * Expose `Emitter`.
 */

module.exports = Emitter;

/**
 * Initialize a new `Emitter`.
 *
 * @api public
 */

function Emitter(obj) {
  if (obj) return mixin(obj);
};

/**
 * Mixin the emitter properties.
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */

function mixin(obj) {
  for (var key in Emitter.prototype) {
    obj[key] = Emitter.prototype[key];
  }
  return obj;
}

/**
 * Listen on the given `event` with `fn`.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.on =
Emitter.prototype.addEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};
  (this._callbacks[event] = this._callbacks[event] || [])
    .push(fn);
  return this;
};

/**
 * Adds an `event` listener that will be invoked a single
 * time then automatically removed.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.once = function(event, fn){
  var self = this;
  this._callbacks = this._callbacks || {};

  function on() {
    self.off(event, on);
    fn.apply(this, arguments);
  }

  on.fn = fn;
  this.on(event, on);
  return this;
};

/**
 * Remove the given callback for `event` or all
 * registered callbacks.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.off =
Emitter.prototype.removeListener =
Emitter.prototype.removeAllListeners =
Emitter.prototype.removeEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};

  // all
  if (0 == arguments.length) {
    this._callbacks = {};
    return this;
  }

  // specific event
  var callbacks = this._callbacks[event];
  if (!callbacks) return this;

  // remove all handlers
  if (1 == arguments.length) {
    delete this._callbacks[event];
    return this;
  }

  // remove specific handler
  var cb;
  for (var i = 0; i < callbacks.length; i++) {
    cb = callbacks[i];
    if (cb === fn || cb.fn === fn) {
      callbacks.splice(i, 1);
      break;
    }
  }
  return this;
};

/**
 * Emit `event` with the given args.
 *
 * @param {String} event
 * @param {Mixed} ...
 * @return {Emitter}
 */

Emitter.prototype.emit = function(event){
  this._callbacks = this._callbacks || {};
  var args = [].slice.call(arguments, 1)
    , callbacks = this._callbacks[event];

  if (callbacks) {
    callbacks = callbacks.slice(0);
    for (var i = 0, len = callbacks.length; i < len; ++i) {
      callbacks[i].apply(this, args);
    }
  }

  return this;
};

/**
 * Return array of callbacks for `event`.
 *
 * @param {String} event
 * @return {Array}
 * @api public
 */

Emitter.prototype.listeners = function(event){
  this._callbacks = this._callbacks || {};
  return this._callbacks[event] || [];
};

/**
 * Check if this emitter has `event` handlers.
 *
 * @param {String} event
 * @return {Boolean}
 * @api public
 */

Emitter.prototype.hasListeners = function(event){
  return !! this.listeners(event).length;
};

});
require.register("jacoblwe20-component-sidebar/index.js", function(exports, require, module){
/*
 * Sidebar - Manages sidebar & sidebar views
 */
/* global Event, require, module */
'use strict';

var emitter = require( 'emitter' ),
    emit = require( 'emit' ),
    SidebarView = require( './view' );

module.exports = Sidebar;
module.exports.SidebarView = SidebarView;

function Sidebar() {
    emitter( this );
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
        this.el.classList.remove( 'animating' );
        this.el.classList.remove( 'back' );
        if ( this._prevView ) {
            this._prevView.el.classList.remove( 'sidebar-view-out' );
            this._prevView = null;
        }
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
    this._handleAnimations();
    if ( view._id !== this._currentView._id ) {

        // close old view
        this._prevView = this._currentView;
        this._prevView.close();
        this._prevView.el.classList.add( 'sidebar-view-out' );
        this._currentView = view;
    }
    this.nav.innerHTML = '';
    this.nav.appendChild( view.title );
    view.options.menuBehaviors
        .forEach( view.addMenuBehavior.bind( this ) );

    this.started = true;
    // indicate there is a view opening
    this.emit( 'view.opened', view );
    this.emit( 'view.opened.' + view._id, view );

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
});
require.register("jacoblwe20-component-sidebar/view.js", function(exports, require, module){
/*
 * Sidebar View
 */

/* global require, module */

'use strict';

var emitter = require( 'emitter' ),
    extend = require( 'extend' );

module.exports = SidebarView;

var defaults = {
    menuBehaviors: [ {
        behavior: 'sidebar.back',
        label: '&lsaquo; Back',
        position: 'left'
    } ],
    back: true
};

function SidebarView( template, options ) {
    if ( !template ) {
        return this;
    }

    emitter( this );
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

SidebarView.prototype.setCurrent =
    SidebarView.prototype.open = function( e ) {
        this.el.classList.add( 'show' );
        this.emit( 'open', this, e );
};

SidebarView.prototype.onRendered = function( callback ) {
    if ( callback ) {
        callback();
    }
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
    this.off();
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
    this.options = extend( true, {}, this.options || defaults, options );
    if ( Array.isArray( this.options.menuBehaviors ) ) {
        this.options.menuBehaviors.forEach( this.addMenuBehavior.bind( this ) );
    }
    if ( this.options.parent ) this._parentView = this.options.parent;

    if ( this.options.title ) {
        this.setTitle( this.options.title );
    }
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
});
require.register("component-query/index.js", function(exports, require, module){
function one(selector, el) {
  return el.querySelector(selector);
}

exports = module.exports = function(selector, el){
  el = el || document;
  return one(selector, el);
};

exports.all = function(selector, el){
  el = el || document;
  return el.querySelectorAll(selector);
};

exports.engine = function(obj){
  if (!obj.one) throw new Error('.one callback required');
  if (!obj.all) throw new Error('.all callback required');
  one = obj.one;
  exports.all = obj.all;
  return exports;
};

});
require.register("component-matches-selector/index.js", function(exports, require, module){
/**
 * Module dependencies.
 */

var query = require('query');

/**
 * Element prototype.
 */

var proto = Element.prototype;

/**
 * Vendor function.
 */

var vendor = proto.matches
  || proto.webkitMatchesSelector
  || proto.mozMatchesSelector
  || proto.msMatchesSelector
  || proto.oMatchesSelector;

/**
 * Expose `match()`.
 */

module.exports = match;

/**
 * Match `el` to `selector`.
 *
 * @param {Element} el
 * @param {String} selector
 * @return {Boolean}
 * @api public
 */

function match(el, selector) {
  if (vendor) return vendor.call(el, selector);
  var nodes = query.all(selector, el.parentNode);
  for (var i = 0; i < nodes.length; ++i) {
    if (nodes[i] == el) return true;
  }
  return false;
}

});
require.register("discore-closest/index.js", function(exports, require, module){
var matches = require('matches-selector')

module.exports = function (element, selector, checkYoSelf, root) {
  element = checkYoSelf ? {parentNode: element} : element

  root = root || document

  // Make sure `element !== document` and `element != null`
  // otherwise we get an illegal invocation
  while ((element = element.parentNode) && element !== document) {
    if (matches(element, selector))
      return element
    // After `matches` on the edge case that
    // the selector matches the root
    // (when the root is not the document)
    if (element === root)
      return  
  }
}
});
require.register("component-event/index.js", function(exports, require, module){
var bind = window.addEventListener ? 'addEventListener' : 'attachEvent',
    unbind = window.removeEventListener ? 'removeEventListener' : 'detachEvent',
    prefix = bind !== 'addEventListener' ? 'on' : '';

/**
 * Bind `el` event `type` to `fn`.
 *
 * @param {Element} el
 * @param {String} type
 * @param {Function} fn
 * @param {Boolean} capture
 * @return {Function}
 * @api public
 */

exports.bind = function(el, type, fn, capture){
  el[bind](prefix + type, fn, capture || false);
  return fn;
};

/**
 * Unbind `el` event `type`'s callback `fn`.
 *
 * @param {Element} el
 * @param {String} type
 * @param {Function} fn
 * @param {Boolean} capture
 * @return {Function}
 * @api public
 */

exports.unbind = function(el, type, fn, capture){
  el[unbind](prefix + type, fn, capture || false);
  return fn;
};
});
require.register("honeinc-emit/index.js", function(exports, require, module){
var Emitter = require( 'emitter' );
var bind = require( 'event' ).bind;
var closest = require( 'closest' );

module.exports = Emit.singleton || ( Emit.singleton = new Emit() );

function Emit( options ) {
    var self = this;
    Emitter( self );
    
    self.validators = [];
    self.touchMoveDelta = 10;
    self.initialTouchPoint = null;

    bind( document, 'touchstart', self );
    bind( document, 'touchmove', self );
    bind( document, 'touchend', self );
    bind( document, 'click', self );
    bind( document, 'input', self );
    bind( document, 'submit', self );
}

var t = function() { return true; };
var f = function() { return false; };

function GetTouchDelta( event, initial ) {
    var deltaX = ( event.touches[ 0 ].pageX - initial.x );
    var deltaY = ( event.touches[ 0 ].pageY - initial.y );
    return Math.sqrt( ( deltaX * deltaX ) + ( deltaY * deltaY ) );
}

Emit.prototype.handleEvent = function( event ) {
    var self = this;

    if ( typeof( event.isPropagationStopped ) == 'undefined' )
    {
        event.isPropagationStopped = f;
    }
    
    switch( event.type )
    {
        case 'touchstart':
            var touches = event.touches;
            
            self.initialTouchPoint = self.lastTouchPoint = {
                x: touches && touches.length ? touches[ 0 ].pageX : 0,
                y: touches && touches.length ? touches[ 0 ].pageY : 0
            };

            break;
        
        case 'touchmove':
            var touches = event.touches;
    
            if ( touches && touches.length && self.initialTouchPoint )
            {
                var delta = GetTouchDelta( event, self.initialTouchPoint );
                if ( delta > self.touchMoveDelta )
                {
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
            if ( event.type == 'click' && self.lastTouchPoint )
            {
                if ( event.touches && event.touches.length )
                {
                    var delta = GetTouchDelta( event, self.lastTouchPoint );
                    if ( delta < self.touchMoveDelta )
                    {
                        event.preventDefault();
                        event.stopPropagation();
                        return;
                    }
                }
            }

            var selector = '[data-emit]';
            var originalElement = event.target || event.srcElement;
            var forceAllowDefault = originalElement.tagName == 'INPUT' && ( originalElement.type == 'checkbox' || originalElement.type == 'radio' );
            var el = closest( originalElement, selector, true, document );
            
            if ( el )
            {
                var depth = -1;
                while( el && !event.isPropagationStopped() && ++depth < 100 )
                {
                    var validated = true;
                    for ( var validatorIndex = 0; validatorIndex < self.validators.length; ++validatorIndex )
                    {
                        if ( !self.validators[ validatorIndex ].call( this, el, event ) )
                        {
                            validated = false;
                            break;
                        }
                    }
                    
                    // eat the event if a validator failed
                    if ( !validated )
                    {
                        event.preventDefault();
                        event.stopPropagation();
                        event.stopImmediatePropagation();
                        if ( typeof( event.isPropagationStopped ) != 'function' || !event.isPropagationStopped() )
                        {
                            event.isPropagationStopped = t;
                        }

                        el = null;
                        continue;
                    }
                    
                    if ( typeof( self.validate ) == 'function' && !self.validate.call( self, el ) )
                    {
                        el = closest( el, selector, false, document );
                        continue;
                    }
                    
                    if ( el.tagName == 'FORM' )
                    {
                        if ( event.type != 'submit' )
                        {
                            el = closest( el, selector, false, document );
                            continue;
                        }
                    }
                    else if ( el.tagName == 'INPUT' )
                    {
                        if ( !( el.type == 'submit' || el.type == 'checkbox' || el.type == 'radio' || el.type == 'file' ) && event.type != 'input' )
                        {
                            el = closest( el, selector, false, document );
                            continue;
                        }
                    }
                    else if ( el.tagName == 'SELECT' )
                    {
                        if ( event.type != 'input' )
                        {
                            el = closest( el, selector, false, document );
                            continue;
                        }
                    }

                    event.emitTarget = el;
                    self.Emit( el, event, forceAllowDefault );
                    el = closest( el, selector, false, document );
                }
                
                if ( depth >= 100 )
                {
                    console.error( 'Exceeded depth limit for Emit calls.' );
                }
            }
            else
            {
                self.emit( 'unhandled', event );
            }

            self.initialTouchPoint = null;
            
            break;
    }
}

Emit.prototype.Emit = function( element, event, forceDefault ) {
    var self = this;
    var optionString = element.getAttribute( 'data-emit-options' );
    var options = {};
    var ignoreString = element.getAttribute( 'data-emit-ignore' );
    
    if ( ignoreString && ignoreString.length )
    {
        var ignoredEvents = ignoreString.toLowerCase().split( ' ' );
        for ( var i = 0; i < ignoredEvents.length; ++i )
        {
            if ( event.type == ignoredEvents[ i ] )
            {
                return;
            }
        }
    }

    if ( optionString && optionString.length )
    {
        var opts = optionString.toLowerCase().split( ' ' );
        for ( var i = 0; i < opts.length; ++i )
        {
            options[ opts[ i ] ] = true;
        }
    }
    
    if ( !forceDefault && !options.allowdefault )
    {
        event.preventDefault();
    }
    
    if ( !options.allowpropagate )
    {
        event.stopPropagation();
        event.stopImmediatePropagation();
        if ( typeof( event.isPropagationStopped ) != 'function' || !event.isPropagationStopped() )
        {
            event.isPropagationStopped = t;
        }
    }

    var emissionList = element.getAttribute( 'data-emit' );
    if ( !emissionList )
    {
        // allow for empty behaviors that catch events
        return;
    }

    var emissions = emissionList.split( ',' );
    emissions.forEach( function( emission ) {
        self.emit( emission, event );
    } );
}

Emit.prototype.AddValidator = function( validator ) {
    var self = this;
    
    var found = false;
    for ( var i = 0; i < self.validators.length; ++i )
    {
        if ( self.validators[ i ] == validator )
        {
            found = true;
            break;
        }
    }
    
    if ( found )
    {
        return false;
    }
    
    self.validators.push( validator );
    return true;
}

Emit.prototype.RemoveValidator = function( validator ) {
    var self = this;
    
    var found = false;
    for ( var i = 0; i < self.validators.length; ++i )
    {
        if ( self.validators[ i ] == validator )
        {
            self.validators.splice( i, 1 );
            found = true;
            break;
        }
    }
    
    return found;
}
});
require.register("andyburke-node-extend/index.js", function(exports, require, module){
var hasOwn = Object.prototype.hasOwnProperty;
var toString = Object.prototype.toString;
var undefined;

var isPlainObject = function isPlainObject(obj) {
	"use strict";
	if (!obj || toString.call(obj) !== '[object Object]' || obj.nodeType || obj.setInterval) {
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
	"use strict";
	var options, name, src, copy, copyIsArray, clone,
		target = arguments[0],
		i = 1,
		length = arguments.length,
		deep = false;

	// Handle a deep copy situation
	if (typeof target === "boolean") {
		deep = target;
		target = arguments[1] || {};
		// skip the boolean and the target
		i = 2;
	} else if (typeof target !== "object" && typeof target !== "function" || target == undefined) {
			target = {};
	}

	for (; i < length; ++i) {
		// Only deal with non-null/undefined values
		if ((options = arguments[i]) != null) {
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


});








require.alias("jacoblwe20-component-sidebar/index.js", "exampleapp/deps/sidebar/index.js");
require.alias("jacoblwe20-component-sidebar/view.js", "exampleapp/deps/sidebar/view.js");
require.alias("jacoblwe20-component-sidebar/index.js", "sidebar/index.js");
require.alias("component-emitter/index.js", "jacoblwe20-component-sidebar/deps/emitter/index.js");

require.alias("honeinc-emit/index.js", "jacoblwe20-component-sidebar/deps/emit/index.js");
require.alias("discore-closest/index.js", "honeinc-emit/deps/closest/index.js");
require.alias("discore-closest/index.js", "honeinc-emit/deps/closest/index.js");
require.alias("component-matches-selector/index.js", "discore-closest/deps/matches-selector/index.js");
require.alias("component-query/index.js", "component-matches-selector/deps/query/index.js");

require.alias("discore-closest/index.js", "discore-closest/index.js");
require.alias("component-emitter/index.js", "honeinc-emit/deps/emitter/index.js");

require.alias("component-event/index.js", "honeinc-emit/deps/event/index.js");

require.alias("andyburke-node-extend/index.js", "jacoblwe20-component-sidebar/deps/extend/index.js");

require.alias("honeinc-emit/index.js", "exampleapp/deps/emit/index.js");
require.alias("honeinc-emit/index.js", "emit/index.js");
require.alias("discore-closest/index.js", "honeinc-emit/deps/closest/index.js");
require.alias("discore-closest/index.js", "honeinc-emit/deps/closest/index.js");
require.alias("component-matches-selector/index.js", "discore-closest/deps/matches-selector/index.js");
require.alias("component-query/index.js", "component-matches-selector/deps/query/index.js");

require.alias("discore-closest/index.js", "discore-closest/index.js");
require.alias("component-emitter/index.js", "honeinc-emit/deps/emitter/index.js");

require.alias("component-event/index.js", "honeinc-emit/deps/event/index.js");

require.alias("andyburke-node-extend/index.js", "exampleapp/deps/extend/index.js");
require.alias("andyburke-node-extend/index.js", "extend/index.js");
