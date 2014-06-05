
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