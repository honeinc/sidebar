var SidebarView = require( 'sidebar' ).SidebarView;

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

        it( 'should create a `this.content` div element when passed a template a first param', function() {
            var sidebarView = new SidebarView('<p>yeah</p>');
            expect( typeof sidebarView.content ).to.be( 'object' );
            expect( sidebarView.content.tagName.toLowerCase() ).to.be( 'div' );
        } );

        it( 'should create a `this.title` span element when passed a template a first param', function() {
            var sidebarView = new SidebarView('<p>yeah</p>');
            expect( typeof sidebarView.title ).to.be( 'object' );
            expect( sidebarView.title.tagName.toLowerCase() ).to.be( 'span' );
        } );

        it( 'should create a `this.nav` nav element when passed a template a first param' +
            ' and dont pass a nav key into the options object as the second param', function() {
            var sidebarView = new SidebarView('<p>yeah</p>');
            expect( typeof sidebarView.nav ).to.be( 'object' );
            expect( sidebarView.nav.tagName.toLowerCase() ).to.be( 'nav' );
            var sidebarView2 = new SidebarView('<p>yeah</p>', { nav : document.createElement('p')});
            expect( typeof sidebarView2.nav ).to.be( 'object' );
            expect( sidebarView2.nav.tagName.toLowerCase() ).to.be( 'p' );
        } );

        it( 'should add the class `sidebar-view` to the `this.el` element`', function(){
            var sidebarView = new SidebarView('<p>yeah</p>');
            expect( sidebarView.el.classList.contains('sidebar-view') ).to.be( true );
        } );

        it( 'should add the attribue `data-view-id` to the `this.el` element`', function(){
            var sidebarView = new SidebarView('<p>yeah</p>');
            expect( typeof sidebarView.el.getAttribute('data-view-id') ).to.be( 'string' );
        } );

        it( 'should add the class `sidebar-view-content` to the `this.content` element`', function(){
            var sidebarView = new SidebarView('<p>yeah</p>');
            expect( sidebarView.content.classList.contains('sidebar-view-content') ).to.be( true );
        } );

        it( 'should add the class `sidebar-view-nav` to the `this.nav` element`', function(){
            var sidebarView = new SidebarView('<p>yeah</p>');
            expect( sidebarView.nav.classList.contains('sidebar-view-nav') ).to.be( true );
        } );

        it( 'should append `this.content` into `this.el`', function() {
            var sidebarView = new SidebarView('<p>yeah</p>');
            expect( sidebarView.content.parentNode.classList.contains('sidebar-view') ).to.be( true );
        } );

        it( 'should set the view `_id` when passing an `id` into the second param options object', function() {
            var sidebarView = new SidebarView('<p>yeah</p>', { id: 'hello' });
            expect( sidebarView._id ).to.be( 'hello' );
            expect( sidebarView.el.getAttribute('data-view-id') ).to.be( 'hello' );
        } );
        describe( '::show', function() {
            it( 'should add a `show` class to `this.el`', function(){
                var sidebarView = new SidebarView('<p>yeah</p>');
                sidebarView.open();
                expect( sidebarView.el.classList.contains('show') ).to.be( true );
            } );
            it( 'should emit an event an event `open` to `this` and it should pass `this` as the first param' + 
                ' and any data given to the open method as the second param', function( done ) {
                var sidebarView = new SidebarView('<p>yeah</p>');
                sidebarView.on( 'open', function( view, data ) {
                    expect( view._id ).to.be( sidebarView._id );
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
                    expect( view._id ).to.be( sidebarView._id );
                    expect( data ).to.be( 'hello' );
                    done();
                } );
                sidebarView.close( 'hello' );
            } );
        } );
    });
} );