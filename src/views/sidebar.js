/*
 * Sidebar - Manages sidebar & sidebar views
 */
/* global Event, require, module */
'use strict';

var emitter = require( 'emitter' );

module.exports = Sidebar;

function Sidebar( el ) {
    el = this.isNodeElement( el ) ? el : document.querySelector( '[data-sidebar]' );
    emitter( this );
    this.addedClasses = {};

    // do view check
    this.el = el;
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

Sidebar.prototype.isNodeElement = function ( el ) {
    return ( typeof el === 'object' && el.type );
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

Sidebar.prototype.isOpen = function() {
    return this.state ? true : false;
};