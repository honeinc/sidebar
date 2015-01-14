var sidebar = new (require('..')),
    emit = require('emit-bindings');
sidebar.init();

var view1html = 
'<ul>' +
    '<li data-emit="open.view2">' + 
        'Go to another view' +
    '</li>' +
    '<li data-emit="sidebar.close">' + 
        'Hide the scrollbar' +
    '</li>' +
'</ul>';
var view2html = 
'<ul>' +
    '<li data-emit="open.view3">' + 
        'We must go deeper.' +
    '</li>'
'</ul>';
var view3html = 
'<ul>' +
    '<li>' + 
        'Yeah Another View' +
    '</li>'
'</ul>';


var view1 = sidebar.addView( view1html, {
    title: 'Hello',
    menuBehaviors: [{
        label: 'Hide',
        behavior: 'sidebar.close',
        position: 'left'
    }],
    home: true
});
var view2 = sidebar.addView( view2html, {
    title: 'Child',
    home: true,
    parent: view1
});
var view3 = sidebar.addView( view3html, {
    title: 'Child Child',
    home: true,
    parent: view2
});
// opening up view when event is emitted
emit.on( 'open.view2', view2.open.bind( view2 ) );
emit.on( 'open.view3', view3.open.bind( view3 ) );
sidebar.open( );