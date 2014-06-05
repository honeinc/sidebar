
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