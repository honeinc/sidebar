
/*
    - Setup ----------------------------------------------------------
    so the sidebar expects there to be a sidebar element on the DOM
*/

var el = document.createElement( 'div' );

el.setAttribute( 'data-sidebar', 'foo' );
document.body.appendChild( el );

// end setup

var Sidebar = require( '..' ),
    expect = require( 'expect.js' ),
    sidebar;

describe('Sidebar', function() {
    
    it( 'should export a function', function(){
        expect( typeof Sidebar ).to.be( 'function' );
    } );
    
    it( 'should return an instance of the sidebar controller when `new` is called on function', function() {
        sidebar = new Sidebar();
        expect( typeof sidebar ).to.be( 'object' );
    } );
    
    describe( 'sidebar', function() {

        describe( '::init', function() {

            it( 'should be a function', function() {
                expect( typeof sidebar.init ).to.be( 'function' );
            } );
            it( 'should clear out any data in cache', function() {
                sidebar._currentView = 'hello';
                sidebar._homeView = 'world';
                sidebar.init();
                expect( sidebar._currentView ).to.be( null );
                expect( sidebar._homeView ).to.be( null );
            });

            it( 'should grab a element with data-sidebar a cache it in `this.el` and add a class `sidebar-init` to the el', function() {
                sidebar.init();
                expect( typeof sidebar.el ).to.be( 'object' );
                expect( sidebar.el.tagName.toLowerCase() ).to.be( 'div' );
                expect( sidebar.el.classList.contains('sidebar-init') ).to.be( true );
            });

            it( 'should emit a `ready` event', function( done ) {
                sidebar.on('ready', function() {
                    done();
                } );
                sidebar.init();
            } )

        } );

        describe( '::open', function() {
            it( 'should add the class show to the `el` and set `this.state` to 1', function() {
                expect( sidebar.el.classList.contains('show') ).to.be( false );
                expect( sidebar.state ).to.be( undefined );
                sidebar.open();
                expect( sidebar.el.classList.contains('show') ).to.be( true );
                expect( sidebar.state ).to.be( 1 );
            } ); 
            it( 'should emit and `open` event and pass data given to open method', function( done ) {
                sidebar.once('open', function( data ) {
                    expect( data.hello ).to.be( 'world' );
                    done();
                } );
                sidebar.open({ hello: 'world' });
            } );
        } );

        describe( '::close', function() {
            it( 'should remove the class show to the `el` and set `this.state` to 0', function() {
                expect( sidebar.el.classList.contains('show') ).to.be( true );
                expect( sidebar.state ).to.be( 1 );
                sidebar.close();
                expect( sidebar.el.classList.contains('show') ).to.be( false );
                expect( sidebar.state ).to.be( 0 );
            } ); 
            it( 'should emit and `close` event', function( done ) {
                sidebar.once('close', function() {
                    done();
                } );
                sidebar.close();
            } );
        } );

        describe( '::toggle', function() {
            it( 'should add the class show to the `el` and set `this.state` to 1 if state is set to 0', function() {
                expect( sidebar.el.classList.contains('show') ).to.be( false );
                expect( sidebar.state ).to.be( 0 );
                sidebar.toggle();
                expect( sidebar.el.classList.contains('show') ).to.be( true );
                expect( sidebar.state ).to.be( 1 );
            } ); 
            it( 'should remove the class show to the `el` and set `this.state` to 0 if state is set to 1', function() {
                expect( sidebar.el.classList.contains('show') ).to.be( true );
                expect( sidebar.state ).to.be( 1 );
                sidebar.toggle();
                expect( sidebar.el.classList.contains('show') ).to.be( false );
                expect( sidebar.state ).to.be( 0 );
            } ); 
        } );

        describe( '::addClass', function() {
            it( 'should add a class to the `el`', function() {
                sidebar.addClass('stuff')
                expect( sidebar.el.classList.contains('stuff') ).to.be( true );
            } ); 
        } );

        describe( '::removeClass', function() { 
            it( 'should remove a class from the `el`', function() {
                sidebar.removeClass('stuff')
                expect( sidebar.el.classList.contains('stuff') ).to.be( false );
            } ); 
        } );

        describe( '::isOpen', function() { 
            it( 'should give an accurate boolean of the visible state of the sidebar', function() {
                sidebar.open();
                expect( sidebar.isOpen() ).to.be( true );
                sidebar.close();
                expect( sidebar.isOpen() ).to.be( false );
                sidebar.toggle();
                expect( sidebar.isOpen() ).to.be( true );
            } ); 
        } );

    });
});
