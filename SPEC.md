```javascript
var sidebar = require('./sidebar');

/*
 * sidebar singleton
 */

sidebar.addView( 
    // required template name to render in menu
    'template/name', 
    // optional options
    {
        home: false, // home view is the root view
        id: 'view-identifier', // way for system to identify view
        parent: parentView // {sidebarView} when using sidebar.back it will go to this view
    }, 

    // optional callback
    function( err, view ){
        /*
         * callback optional
         * err {Error} if template not found or some other processing request
         * view {SidebarView} this will have a set of api endpoints itself.
         */
    });

/* another way pass a view directly*/
sidebar.addView( view );

/* Alternate way of getting view */
sidebar.once('view.add', function( view ){
    /* does not return error, will not be specific to view though */

    // sets current view ( visible )
    sidebar.setCurrentView( view );
    // set the default view
    sidebar.setHome( view );
    // will remove view from dom
    sidebar.removeView( view );
    // set current view to default view
    sidebar.home( );
    // also set current sidebar view to default
    sidebar.emit('home');
    // goes to parent view if none then default
    sidebar.back( );
});

sidebar.once('error', function( err ){
    /* way to consume errors, will not be specific to view though */
});

sidebar.close(); // close sidebar
sidebar.open(); // open sidebar

/*
 * Baked in events - emitted from sidebar object
 */

var emitted = [
    'view.change', // returns new view
    'view.add', // returns new view
    'view.remove', // returns old view
    'close', // when sidebar is collasped,
    'open' // when sidebar is opened
];

/*
 * Baked in events - can be emitted to the sidebar
 */

var consumed = [ 
    'set.view', // pass a view to set a view
    'default', // goes to default view
    'back' // goes to parent or default view
];

/*
 * sidebar.SidebarView ~ view
 */

// sets view to current sidebar view
view.setCurrent();
// override options
view.setOptions({});
// view.close
view.setParent( parentView );// set the parent view
// remove view
view.remove( );
```
