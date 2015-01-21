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
    this._template = '' + template;
    this.id = options.id || options.title;
    this.el = document.createElement( 'div' );
    this.el.classList.add( 'sidebar-view' );
    this.el.setAttribute( 'data-view-id', this.id );
    this._attachListeners();
    this.setOptions( options );
    this.linkto = options.linkto;
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

SidebarView.prototype.setOptions = function( options ) {
    var els;
    this.options = extend( true, {}, this.options || defaults, options );
    this.setParentView( this.options.parent );
    this.linkto = options.linkto;
};

SidebarView.prototype.setParentView = function( parent ) {
    this._parentView = parent;
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

SidebarView.prototype.onAnimationComplete = function() {
    if ( this.options.autofocus ) {
        var el = this.el.querySelector( 'textarea, input' );
        if( el ){
            el.focus();
            el.select();
        }
    }
};

// this is for the css3 animations
SidebarView.prototype._attachListeners = function() {
    var handle = this.emit.bind( this, 'animation:complete' );
    
    this.el.addEventListener( 'webkitAnimationEnd', handle, false );
    this.el.addEventListener( 'oAnimationEnd', handle, false );
    this.el.addEventListener( 'animationend', handle, false );
    this.el.addEventListener( 'msAnimationEnd', handle, false );
};
