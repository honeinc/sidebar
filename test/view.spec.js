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
        describe( '::isVisible', function() {
            it( 'should return a valid representation of if the view is open or not', function() {
                var sidebarView = new SidebarView('<p>yeah</p>');
                expect( sidebarView.isVisible() ).to.be( false );
                sidebarView.open();
                expect( sidebarView.isVisible() ).to.be( true );
                sidebarView.close();
                expect( sidebarView.isVisible() ).to.be( false );
            } );
        } );
        describe( '::setTitle', function() {
            it( 'should change the content of the `this.title` element', function() {
                var sidebarView = new SidebarView('<p>yeah</p>');
                var title = 'Hello World';
                sidebarView.setTitle( title );
                expect( sidebarView.title.innerHTML ).to.be( title );
            } );
            it ( 'should perserve html content', function() {
                var sidebarView = new SidebarView('<p>yeah</p>');                
                var htmlTitle = '<p>Ahhhh</p>';
                sidebarView.setTitle( htmlTitle );
                expect( sidebarView.title.innerHTML ).to.be( htmlTitle );                
            } );
        } );
        describe( '::addMenuBehavior', function() {
            it( 'it should create a `button` element and append it into `this.nav`', function() {
                var sidebarView = new SidebarView('Woot');
                sidebarView.addMenuBehavior({});
                expect( sidebarView.nav.hasChildNodes() ).to.be( true );
                // this already has the default button
                expect( sidebarView.nav.getElementsByTagName('button').length ).to.be( 2 );
            } );
            it( 'it should add the attribute data-emit to the new `button` element and set the value to the ' +
                'behavior key from the options object passed into the method', function() {
                var sidebarView = new SidebarView('Woot');
                sidebarView.addMenuBehavior({
                    behavior: 'omg'
                });
                // compensating for default button
                var button = sidebarView.nav.getElementsByTagName('button')[ 1 ]; 
                expect( button.getAttribute('data-emit') ).to.be( 'omg' );
            } );
            it( 'it should add the content of the new `button` element to the ' +
                'label key from the options object passed into the method', function() {
                var sidebarView = new SidebarView('Woot');
                sidebarView.addMenuBehavior({
                    label: 'omg'
                });
                // compensating for default button
                var button = sidebarView.nav.getElementsByTagName('button')[ 1 ]; 
                expect( button.innerHTML ).to.be( 'omg' );
            } );
            it( 'it should add the classes of the new `button` element to the ' +
                'className key from the options object passed into the method', function() {
                var sidebarView = new SidebarView('Woot');
                sidebarView.addMenuBehavior({
                    className: 'omg what is this'
                });
                // compensating for default button
                var button = sidebarView.nav.getElementsByTagName('button')[ 1 ];
                var classList = button.classList; 
                expect( button.className ).to.be( 'omg what is this' );
                expect( classList.contains('omg') ).to.be( true );
                expect( classList.contains('what') ).to.be( true );
                expect( classList.contains('is') ).to.be( true );
                expect( classList.contains('this') ).to.be( true );
                expect( classList.contains('hmmm') ).to.be( false );
            } );
            it( 'it should set the position of the new `button` element to the ' +
                'position keys value from the options object passed into the method ' +
                'as a css style with the value of 0', function() {
                var sidebarView = new SidebarView('Woot');
                sidebarView.addMenuBehavior({
                    position: 'right'
                });
                // compensating for default button
                var button = sidebarView.nav.getElementsByTagName('button')[ 1 ];
                expect( button.style.right ).to.be( '0px' );
                expect( button.style.left ).to.be( '' );
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
            it ( 'should set the content of `this.title` if a key of title is passed with the options object', function() {
                var sidebarView = new SidebarView('<p>yeah</p>');
                var options = { 
                    title: 'Helloo' 
                };
                sidebarView.setOptions( options );
                expect( sidebarView.title.innerHTML ).to.be( 'Helloo' );                                
            } );
            it ( 'should add buttons to this `this.nav` when an Array with button object are passed to the method in the menuBehaviors key', function() {
                var sidebarView = new SidebarView('<p>yeah</p>');
                var options = { 
                    menuBehaviors: [{}, {}] 
                };
                sidebarView.setOptions( options );
                // compensate for default button
                expect( sidebarView.nav.getElementsByTagName('button').length ).to.be( 2 );
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
                    expect( view._id ).to.be( 'eh' ); 
                    done( );
                } );
            } ); 
        } );
    });
} );