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
        _view._listenersAdded = true;
    }

    if ( !view._listenersAdded ) {
        addListeners( view ); 
    }

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
