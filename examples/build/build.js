
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

var emitter = require('emitter'),
    SidebarView = require('./view');

module.exports = Sidebar;

function Sidebar ( ) {
    emitter( this );
    this._views = [ ];
    this._viewsById = { };
}

function mixin ( obj, obj2 ) {
    for ( var key in obj2 ) {
        obj[ key ] = obj2[ key ];
    }
    return obj;
}

Sidebar.prototype.SidebarView = SidebarView;

Sidebar.prototype.addView = function ( template, opts, callback ) {

    var view,
        options = {
            menuBehaviors : [{
                behavior : 'sidebar.back',
                label : '&lsaquo; Back',
                position : 'left'
            }],
            back: true
        };
    if ( !template ) return;
    if ( this.isSidebarView( template ) ) {
        // if view is passed
        return this._cacheView( template );
    }

    options = mixin( options, opts || {});


    if ( !options.menuBehaviors ) {
        options.menuBehaviors = menuBehaviors;
    }

    view = new this.SidebarView( template, options );

    if ( options.default || !this._defaultView ) {
        this._defaultView = view;
    }
    // if there is no other views auto open.
    if ( ! this._currentView ) {
        this._currentView = view;
        view.open( );
    }

    view.once( 'ready', this._onViewReady.bind( this, callback, null ) );
    view.once( 'error', this._onViewReady.bind( this, callback ) );
    // this helps handling the view space
    view.on('open', this._onViewOpening.bind( this, view ) );
    return view;
};

Sidebar.prototype.removeView = function ( view ) {
    // dont bother if not a proper view
    if ( !this.isSidebarView( view ) ) return;
    var id = view._id;

    function outView ( ) {
        if ( id === _view.id ) return false;
        return true;
    }

    // if remove view is current go to default
    if ( this._currentView._id === view.id ) {
        this.default( );
    }

    if ( this._viewsById[ id ] ) delete this._viewsById[ id ];
    this._views = this._views.filter( outView );
    view.remove( );
};

Sidebar.prototype.setCurrentView = function ( view ) {
    var id = view._id,
        _view = this._viewsById[ id ];
    if ( _view ) {
        _view.open( );
    }
};


Sidebar.prototype.default = function ( ) {
    if ( !this.isSidebarView( this._defaultView ) ) return;
    if ( this._currentView._id === this._defaultView._id ) return;
    this._defaultView.open( );
};

Sidebar.prototype.back = function ( ) {
    // see if a proper parent view is set
    this.el.classList.add('back');
    if ( this.isSidebarView( this._currentView ) && this._currentView._parentView ) {
        var _parent = this._currentView._parentView;
        if ( this.isSidebarView( _parent ) ) {
            return _parent.open( );
        }
    }
    // if not go to default
    this.default( );
};

Sidebar.prototype.open = function ( data ) {
    if ( this.el ) this.el.classList.add( 'show' );
    if ( data instanceof Event ) {
        data = null;
    }
    this.emit( 'open', data );
};

Sidebar.prototype.close = function ( data ) {
    if ( this.el ) this.el.classList.remove( 'show' );
    if ( data instanceof Event ) {
        data = null;
    }
    this.emit( 'close', data );
};

Sidebar.prototype.toggle = function ( ) {
    if ( this.el ) this.el.classList.toggle( 'show' );
    if ( this.el.classList.contains( 'show' ) ){
        return this.emit( 'open' );
    }
    this.emit( 'close' );
};

// width is only temp till next open.
Sidebar.prototype.expand = function ( width ) {
    if ( !this.el ) return;
    this.el.style.width = typeof width === 'number' ? width + 'px' : width;
};

Sidebar.prototype.isSidebarView = function ( view ) {
    return ( typeof view === 'object' && view instanceof SidebarView && !view._removed);
};

Sidebar.prototype._appendView = function ( view ) {
    if ( this.wrapper ) this.wrapper.appendChild( view.el );
};

Sidebar.prototype._handleAnimations = function ( ) {
    var el = this.el;
    this._currentView.once('animation:complete', function ( ) { 
        el.classList.remove('animating');
        el.classList.remove('back');
        if ( this._prevView ){
            this._prevView.el.classList.remove('sidebar-view-out');
            this._prevView =  null;
        }
    }.bind( this ));
};

Sidebar.prototype._cacheView = function ( view ) {
    // no doups
    if ( this._viewsById[ view._id ] ) return;
    this._viewsById[ view._id ] = view;
    this._views.push( view );
    this.emit( 'view.added', view );
};

Sidebar.prototype._teardownViews = function ( ) {
    if ( !this._views.length ) return;
    this._views.forEach(function( view ){
        view.remove();
        this.emit( 'view.removed', view );
    }.bind( this ));
};

Sidebar.prototype.init = function ( e ) {
    // do view check
    this.el = document.querySelector('[data-sidebar]');
    this._teardownViews( );
    this._defaultView = null;
    this._currentView = null;
    this._views = [ ];
    this._viewsById = { };

    // signify inialization
    if ( this.el ) {
        if ( !this.wrapper ) {
            this.wrapper = document.createElement('div');
            this.wrapper.classList.add('sidebar-wrapper');
            this.el.appendChild( this.wrapper );
        }
        this.el.classList.add('sidebar-init');
        this.emit( 'ready', this );
    }
};

Sidebar.prototype._onViewOpening = function ( view ) {
    this.el.classList.add('animating');
    this.el.removeAttribute('style');
    if ( view._id !== this._currentView._id ) {
        // close old view
        this._prevView = this._currentView;
        this._prevView.close( );
        this._prevView.el.classList.add('sidebar-view-out');
        this._currentView = view;
    }
    this._handleAnimations( );
};

Sidebar.prototype._onViewReady = function ( callback, err, view ) {
    // unbind any stale handlers
    view.off( 'ready', this._onViewReady.bind( this, callback, null ) );
    view.off( 'error', this._onViewReady.bind( this, callback ) );
    if ( typeof callback === 'function' ) {
        callback( err, res );
    }
    if ( err ) {
        view.off('open', this._onViewOpening.bind( this ));
        view.remove();
        return this.emit( 'error', err );
    }
    // cache view after successful
    this._appendView( view );
    this._cacheView( view );
};
});
require.register("jacoblwe20-component-sidebar/view.js", function(exports, require, module){

/* 
 * Sidebar View
 */

var emitter = require('emitter');

module.exports = SidebarView;

function SidebarView ( template, options ) {
    emitter( this );
    this._behaviors = {};
    this._template = '' + template;
    this._id = options.id || template.substr( 0, 5 ) + ':' + (+new Date());
    this.el = document.createElement('div');
    this.nav = document.createElement('nav');
    this.content = document.createElement('div');
    this.title = document.createElement('span');
    
    this.el.classList.add('sidebar-view');
    this.nav.classList.add('sidebar-view-nav');
    this.content.classList.add('sidebar-view-content');

    this.nav.appendChild( this.title );
    this.el.appendChild( this.nav );
    this.el.appendChild( this.content );
    this.setOptions( options );
    // this can intergrate any templating engine into
    // the sidebar
    this._attachListeners( );
    this.setContent( options.data, this.emit.bind( this, 'ready', this ) );
}

SidebarView.prototype.setCurrent =
SidebarView.prototype.open = function( e ) {
    this.el.classList.add('show');
    this.emit('open', this, e );
};

SidebarView.prototype.setContent = function ( data, callback ) {
    if ( typeof data === 'function' ){
        callback = data;
    }
    callback = callback || function ( ) { }; 
    if ( typeof this.render === 'function' ) { 
        this.render( this._template, data || {}, function ( err, html ) {
            if ( err ) return this.emit( 'error', err, this );
            this.content.innerHTML = html;
            setTimeout( callback, 0 );
        }.bind( this )); 
        return this;
    }
    this.content.innerHTML = this._template;
    setTimeout( callback, 0 );
};

SidebarView.prototype.close = function( e ) {
    this.el.classList.remove('show');
    this.emit('close', this, e );
};

SidebarView.prototype.remove = function ( ) {
    this.el.remove();
    this.off( );
};

SidebarView.prototype.isVisible =
SidebarView.prototype.isCurrent = function ( ) {
    // this should be accurate in the current system
    // may need to get referance to _super
    return this.el.classList.contains('show');
};

SidebarView.prototype.setTitle = function ( str ) {
    this.title.innerText = str;
};

SidebarView.prototype.setOptions = function ( options ) {
    this.options = options;
    if ( Array.isArray( options.menuBehaviors ) ){
        options.menuBehaviors.forEach( this.addMenuBehavior.bind( this ) );
    }
    if ( options.parent ) this._parentView = options.parent;

    if ( options.title ) {
       this.setTitle( options.title );
    }
};

SidebarView.prototype.addMenuBehavior = function ( options ) {
    var button = document.createElement('button');
    button.setAttribute('data-emit', options.behavior );
    button.innerHTML = options.label || '';
    if ( options.position ) {
        button.style[options.position] = '0';
    }    
    if ( options.className ) {
        button.className = options.className;
    }
    this._behaviors[ options.behavior ] = button;
    this.nav.appendChild( button );
};

// this is for the css3 animations
SidebarView.prototype._attachListeners = function ( ) {
    var handle = this.emit.bind( this, 'animation:complete' )
    this.el.addEventListener('webkitAnimationEnd', handle, false);
    this.el.addEventListener('oAnimationEnd', handle, false);
    this.el.addEventListener('animationend', handle, false);
    this.el.addEventListener('msAnimationEnd', handle, false);
};
});
require.alias("jacoblwe20-component-sidebar/index.js", "exampleapp/deps/sidebar/index.js");
require.alias("jacoblwe20-component-sidebar/view.js", "exampleapp/deps/sidebar/view.js");
require.alias("jacoblwe20-component-sidebar/index.js", "sidebar/index.js");
require.alias("component-emitter/index.js", "jacoblwe20-component-sidebar/deps/emitter/index.js");
