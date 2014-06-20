/*
 * Sidebar - Manages sidebar & sidebar views
 */
/* global Event, require, module */

'use strict';

var emitter = require( 'emitter' ),
    emit = require( 'emit' );

module.exports = Controller;

function Controller( Sidebar, SidebarView, el ) {
    emitter( this );
    // clean slate
    this.Sidebar = Sidebar;
    this.SidebarView = SidebarView;
    this.sidebar = this.isSidebar( el ) ? el :new this.Sidebar( el ); 
    this.clear();
    this.addListeners();
}

// -----------------------------------
// SidebarView managment
// -----------------------------------

Controller.prototype.addView = function( template, opts, callback ) {
    if ( !template ) return null;
    var view = this.setupView( template, opts );

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
        view.open();
    }

    return view;
};

Controller.prototype.setupView = function( template, options ) {
    opts = opts || {};

    opts.nav = this.sidebar.nav;
    var isReady = this.isSidebarView( template ),
        view = isReady ? template : null;

    if ( !view ) {
        view = new this.SidebarView( template, opts );
    }
    else {
        view.setOptions( opts );
    }

    if ( ( opts && opts.home ) || !this._homeView || view.options.home ) {
        this._homeView = view;
    }

    return view;
};

Controller.prototype.removeView = function( view ) {
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

Controller.prototype._appendView = function( view ) {
    if ( this.sidebar && this.sidebar.wrapper ) {
        this.wrapper.appendChild( view.el );
    }
};

Controller.prototype.getView = function( id ) {
    return this._viewsById[ id ];
};

Controller.prototype.getCurrentView = function() {
    return this._currentView;
};

// -----------------------------------
// Listeners
// -----------------------------------

Controller.prototype.addListeners = function() {
    emit.on( 'sidebar.back', this.back.bind( this ) );
    emit.on( 'sidebar.close', this.close.bind( this ) );
    emit.on( 'sidebar.open', this.open.bind( this ) );
    emit.on( 'sidebar.toggle', this.toggle.bind( this ) );
};

Controller.prototype._handleAnimations = function() {
    this._currentView.once( 'animation:complete', function() {
        this.sidebar.el.classList.remove( 'animating' );
        this.sidebar.classList.remove( 'back' );
        if ( this._prevView ) {
            this._prevView.el.classList.remove( 'sidebar-view-out' );
            this._prevView = null;
        }
    }.bind( this ) );
};

Controller.prototype._onViewOpening = function( view ) {
    for ( var c in this.addedClasses ) {
        this.sidebar.removeClass( c );
    }
    this.sidebar.el.classList.add( 'animating' );
    this.sidebar.el.removeAttribute( 'style' );
    this._handleAnimations();
    // making situational referances to view
    if ( view._id !== this._currentView._id ) {

        // close old view
        this._prevView = this._currentView;
        this._prevView.close();
        this._prevView.el.classList.add( 'sidebar-view-out' );
        this._currentView = view;
    }
    this.sidebar.nav.innerHTML = '';
    this.sidebar.nav.appendChild( view.title );
    view.options.menuBehaviors
        .forEach( view.addMenuBehavior.bind( this.sidebar ) );

    this.started = true;
    // indicate there is a view opening
    this.emit( 'view.opened', view );
    this.emit( 'view.opened.' + view._id, view );

};

Controller.prototype._onViewReady = function( callback, err, view ) {
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

// -----------------------------------
// Utilities
// -----------------------------------

Controller.prototype.isSidebarView = function( view ) {
    return ( typeof view === 'object' && typeof view.setContent === 'function' );
};

Controller.prototype.isSidebar = function( sidebar ) {
    return ( typeof sidebar === 'object' && typeof sidebar.isOpen === 'function' );
};

// -----------------------------------
// Caching
// -----------------------------------

Controller.prototype._cacheView = function( view ) {
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

Controller.prototype._teardownViews = function() {
    if ( !this._views.length ) return;
    this._views.forEach( function( view ) {
        view.remove();
        this.emit( 'view.removed', view );
    }.bind( this ) );
};

Controller.prototype.clear = function() {
    this._teardownViews();
    this._views = [];
    this._viewsById = {};
};

// -----------------------------------
// Navigation
// -----------------------------------

Controller.prototype.setCurrentView = function( view ) {
    var id = view._id,
        _view = this._viewsById[ id ];
    if ( _view ) {
        _view.open();
    }
};

Controller.prototype.home = function() {
    if ( !this.isSidebarView( this._homeView ) ) return;
    if ( this._currentView._id === this._homeView._id ) return;
    this._homeView.open();
};

Controller.prototype.back = function() {
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