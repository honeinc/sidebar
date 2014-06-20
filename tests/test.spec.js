var Sidebar = require( 'sidebar' ),
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
                sidebar._views.push({ remove: function(){}});
                sidebar._viewsById.test = 1;
                sidebar.init();
                expect( sidebar._views.length ).to.be( 0 );
                expect( sidebar._viewsById.test ).to.be( undefined );
            });

        } );

    });
});