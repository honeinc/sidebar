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
        // menu bar items
        menuBehaviors : [
            // this will be added by default unless option.back is specified as false
            {
                // emits to app.ui
                behavior : 'sidebar.back' //build in event consumed by sidebar
                label : 'back', // label for button
                position : 'left', // positioning floats
                classNames : 'button primary-button', // classes to put on button
                // fired when this view is opened
                onOpen : 'view.thisOne.open' // can be an event name emitted to app.ui or a function
                // fired when this view is closed
                onClose :  function ( ) { console.log('closed') }
            }
        ],
        // if back behavior should be included default is true
        back: false,
        // overwrites default default is false if its the first view then it will be true
        default : false,
        // adds parent view, back button will go to this view default is null
        parent: parentView // {sidebarView}
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
    sidebar.setDefault( view );
    // will remove view from dom
    sidebar.removeView( view );
    // set current view to default view
    sidebar.default( );
    // also set current sidebar view to default
    sidebar.emit('default');
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
 * Consumed from app.UI
 */
var consumedUI = [
    'sidebar.back', // alias of sidebar.emit('back')
    'sidebar.default', // alias of sidebar.emit('default')
    'sidebar.set.view' // alias of sidebar.emit('set.view')
];

/*
 * sidebar.SidebarView ~ view
 */

// sets view to current sidebar view
view.setCurrent();
// will return true if current
view.isCurrent(); // Boolean
// alias of isCurrent
view.isVisible(); // Boolean
// get Zepto element
view.$el  // {Zepto}
// override options
view.setOptions({});
// view.close
view.setParent( parentView );// set the parent view
// over ride behavior
view.setBehavior('sidebar.new.behavior'); // what ever
// remove view
view.remove( );
```
