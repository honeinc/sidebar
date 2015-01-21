## Sidebar

This is a sidebar that controls differnt sidebar views. So you can have a sidebar that looks like a mobile app. 
[![Build Status](https://travis-ci.org/honeinc/sidebar.svg?branch=master)](https://travis-ci.org/honeinc/sidebar)

![Sidebar Gif](http://i.imgur.com/jr80xv1.gif?1?1506)

> Important Changes: So we are moving to [browserify](http://browserify.org), and removing component support. Also along with this change we will no longer be importing any CSS, If you would still like to the use the default css please import it into you project manually. The example CSS can be found at [/examples/style.css](https://github.com/honeinc/sidebar/blob/master/examples/style.css).

### Install

    $ npm install hone-sidebar

### Usage

You can see the [SPEC](https://github.com/honeinc/sidebar/blob/master/SPEC.md) for full api information.

First you will need an element for the sidebar to attach to. Do this by adding an attribute to a element.

```html
<div data-sidebar></div>
```

Then after add this javascript.

```javascript
var Sidebar = require( 'hone-sidebar' ),
    sidebar = new Sidebar(); // make a new instance

sidebar.init(); // init looks for element. [data-sidebar]
sidebar.open(); // open sidebar up default is closed
```

You will see a blank bar open up into view. To make views for the sidebar all you need to do is call addView.

```javascript
var html = '<p>This is html</p>',
    view1 = sidebar.addView( html, {   //options
        id: 'foo',        // title in the navigation bar
    });
// first view auto opens
sidebar.open();
```
Add another view
```javascript
var html2 = '<p>This more html</p>',
    view2 = sidebar.addView( html, { 
        id: 'bar', 
    });


view2.open();
```
### Talking to and from sidebar

We use a library called [`emit-bindings`](https://github.com/honeinc/emit-bindings) to talk to the buttons in the nav you will see attribute like `data-emit="sidebar.back"`. This will make the sidebar go back if there is a parent view of the current view.

Lets say you want a nav button to go to another view. Just create a view like this.

```javascript
var view1 = sidebar.addView( html, { 
    id: 'baz' 
});
// now use emit to bind to the `open.view2` event.
emit.on('open.view2', function(){
    // were in the event handler
    view2.open();
});
```

You can use those types of event inside and outside of the sidebar.

### Development

So once adding your new code you can test it out on the examples. To do this run

    $ npm run examples

Then open `/examples/index.html` to see the functioning sidebar. Once you have a working feature please test it.

#### Testing

To run the test you will need to install all dependecies, you will need [`nodejs`](http://nodejs.org) as well as [`npm`](http://npmjs.org). Then in the root of the directory run.

    $ npm install

This should automatically test everything in PhantomJS.

If you are adding something please add a test to make sure the functionality is working properly.

##### Have a issue? report it in the issues tab.
