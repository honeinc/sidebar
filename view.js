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
    autofocus: true,
    back: true
};

function SidebarView( template, options ) {
    if ( !template ) {
        return this;
    }

    options = options || {};

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
    var els;
    this.options = extend( true, {}, this.options || defaults, options );
    if ( Array.isArray( this.options.menuBehaviors ) ) {
        if ( !this.globalNav ) {
            this.nav.innerHTML = "";
            this.nav.appendChild( this.title );            
        }
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