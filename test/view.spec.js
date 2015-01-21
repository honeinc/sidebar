var SidebarView = require( '..' ).SidebarView,
    expect = require( 'expect.js' );

describe( 'SidebarView', function() {
    it( 'should be a function', function() {
        expect( typeof SidebarView ).to.be( 'function' );
    } );
    it( 'should return a SidebarView object when using the `new` keyword', function() {
        var sidebarView = new SidebarView();
        expect( typeof sidebarView ).to.be( 'object' );
        expect( typeof sidebarView.open ).to.be( 'function' );
    } );
    describe( 'sidebarView', function() {
        it( 'should create a `this.el` div element when passed a template a first param', function() {
            var sidebarView = new SidebarView();
            var sidebarView2 = new SidebarView('<p>yeah</p>');
            expect( typeof sidebarView.el ).to.be( 'undefined' );
            expect( typeof sidebarView2.el ).to.be( 'object' );
            expect( sidebarView2.el.tagName.toLowerCase() ).to.be( 'div' );
        } );

        it( 'should add the class `sidebar-view` to the `this.el` element`', function(){
            var sidebarView = new SidebarView('<p>yeah</p>');
            expect( sidebarView.el.classList.contains('sidebar-view') ).to.be( true );
        } );

        it( 'should add the attribue `data-view-id` to the `this.el` element`', function(){
            var sidebarView = new SidebarView('<p>yeah</p>');
            expect( typeof sidebarView.el.getAttribute('data-view-id') ).to.be( 'string' );
        } );

        it( 'should set the view `_id` when passing an `id` into the second param options object', function() {
            var sidebarView = new SidebarView('<p>yeah</p>', { id: 'hello' });
            expect( sidebarView.id ).to.be( 'hello' );
            expect( sidebarView.el.getAttribute('data-view-id') ).to.be( 'hello' );
        } );
        describe( '::show', function() {
            it( 'should emit an event an event `open` to `this` and it should pass `this` as the first param' + 
                ' and any data given to the open method as the second param', function( done ) {
                var sidebarView = new SidebarView('<p>yeah</p>');
                sidebarView.on( 'open', function( view, data ) {
                    expect( view.id ).to.be( sidebarView.id );
                    expect( data ).to.be( 'hello' );
                    done();
                } );
                sidebarView.open( 'hello' );
            } );
        } );
        describe( '::close', function() {
            it( 'should remove a `show` class from `this.el`', function(){
                var sidebarView = new SidebarView('<p>yeah</p>');
                sidebarView.el.classList.add('show');
                sidebarView.close();
                expect( sidebarView.el.classList.contains('show') ).to.be( false );
            } );
            it( 'should emit an event an event `close` to `this` and it should pass `this` as the first param' + 
                ' and any data given to the open method as the second param', function( done ) {
                var sidebarView = new SidebarView('<p>yeah</p>');
                sidebarView.on( 'close', function( view, data ) {
                    expect( view._id ).to.be( sidebarView.id );
                    expect( data ).to.be( 'hello' );
                    done();
                } );
                sidebarView.close( 'hello' );
            } );
        } );
        describe( '::setOptions', function() {
            it ( 'should set values to the `this.options` object', function() {
                var sidebarView = new SidebarView('<p>yeah</p>');
                var options = { 
                    hello: 'World' 
                };
                sidebarView.setOptions( options );
                expect( sidebarView.options.hello ).to.be( 'World' );
            } );
            it ( 'should set `this._parentView` to the parent key that is passed in the options object', function() {
                var sidebarView = new SidebarView('<p>yeah</p>');
                var options = { 
                    parent: 'parentView?' 
                };
                sidebarView.setOptions( options );
                expect( sidebarView._parentView ).to.be( 'parentView?' );                
            } );
        } );
        describe( '::setParentView', function() {
            it ( 'should set `this._parentView` to the passed object', function() {
                var sidebarView = new SidebarView('<p>yeah</p>');
                sidebarView.setParentView( 'parentView?' );
                expect( sidebarView._parentView ).to.be( 'parentView?' );                
            } );
        } );
        describe( '::onRendered', function() {
            it ( 'should emit a `rendered` event', function( done ) {
                var _sidebarView = new SidebarView( '<p>yeah</p>', {
                    id: 'eh'
                } );
                // on `rendered` is called automatically when creating a view
                _sidebarView.on( 'rendered', function( view ) {
                    expect( view.id ).to.be( 'eh' ); 
                    done( );
                } );
            } ); 
        } );
    });
} );
