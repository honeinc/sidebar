## Sidebar

This is a sidebar that controls differnt sidebar views. So you can have a sidebar that looks like a mobile app. 

![Sidebar Gif](http://i.imgur.com/jr80xv1.gif?1?1506)

### Install

    $ component install honeinc/sidebar

### Usage

First you will need an element for the sidebar to attach to. Do this by adding an attribute to a element.

```html
<div data-sidebar></div>
```

Then after add this javascript.

```javascript
var Sidebar = require( 'sidebar' ),
    sidebar = new Sidebar(); // make a new instance

sidebar.init(); // init looks for element. [data-sidebar]
sidebar.open(); // open sidebar up default is closed
```

You will see a blank bar open up into view. To make views for the sidebar all you need to do is call addView.

```javascript
var html = '<p>This is html</p>',
    view1 = sidebar.addView( html, {   //options
        title: 'My First View',        // title in the navigation bar
        menuBehaviors: [{              // buttons on navigation
            label: 'close'             // label of button
            behavior: 'sidebar.close', // data-emit to trigger event
            position: 'right'          // position of button eg. left / right
        }],
        home: true                     // set this as default view
    });
// first view auto opens
sidebar.open();
```
Add another view
```javascript
var html2 = '<p>This more html</p>',
    view2 = sidebar.addView( html, { 
        title: 'My Second View', 
        menuBehaviors: [{ 
            label: 'back' 
            behavior: 'sidebar.back', 
            position: 'right'
        }],
        parent: view1 // the parent view
    });


view2.open();
```
### Talking to and from sidebar

We use a library called [`emit`](https://github.com/honeinc/emit) to talk to the buttons in the nav you will see attribute like `data-emit="sidebar.back"`. This will make the sidebar go back if there is a parent view of the current view.

Lets say you want a nav button to go to another view. Just create a view like this.

```javascript
var view1 = sidebar.addView( html, { 
    title: 'My First View', 
    menuBehaviors: [{ 
        label: 'back' 
        behavior: 'sidebar.back', 
        position: 'right'
    },{ 
        label: 'next' 
        behavior: 'open.view2', 
        position: 'left'
    }]
});
// now use emit to bind to the `open.view2` event.
emit.on('open.view2', function(){
    // were in the event handler
    view2.open();
});
```

You can use those types of event inside and outside of the sidebar.

### Api

__coming soon__

### Development

The development process is a little rought right now, but essentially you will need [`component`](https://github.com/component/component) & [`less`](https://github.com/less/less.js).

##### Download Files

    $ git clone https://github.com/honeinc/sidebar.git
    $ cd sidebar

Next if your making a css change and have `less`.

    $ lessc style.less > style.css

Then you need to test you can do this by using the example directory but you will need to symlink the directory into you components to see the changes. Some of this info may differ due to `component` version and `os`.

    $ cd example
    $ component install
    $ rm -r components/honeinc-sidebar 
    $ ln -s ~/path-to/sidebar ~/path-to/sidebar/example/components/honeinc-sidebar
    $ component build
    $ open index.html

Now to see changes all you need to do is rebuild

    $ component build

and refresh!

### Issues please open a issue >>>>
