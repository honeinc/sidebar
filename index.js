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