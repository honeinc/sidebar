'use strict';

var sidebar = new (require('..'))(),
    emit = require('emit-bindings');
sidebar.init();

var view1html = 
'<ul>' +
    '<li>' + 
        'View 1' +
    '</li>' +
    '<li data-emit="sidebar.close">' + 
        'Hide the scrollbar' +
    '</li>' +
'</ul>';
var view2html = 
'<ul>' +
    '<li data-emit="open.view3">' + 
        'Child View >' +
    '</li>' +
'</ul>';
var view3html = 
'<ul>' +
    '<li data-emit="sidebar.back">' +
        'Back' +
    '</li>' +
'</ul>';


var view1 = sidebar.addView( view1html, {
    title: 'Home',
    home: true
});
var view2 = sidebar.addView( view2html, {
    title: 'Secondary',
    home: true
});
var view3 = sidebar.addView( view3html, {
    title: 'Child Child',
    home: true,
    parent: view2,
    linkto: false
});

// opening up view when event is emitted
emit.on( 'open.view1', view1.open.bind( view2 ) );
emit.on( 'open.view2', view2.open.bind( view2 ) );
emit.on( 'open.view3', view3.open.bind( view3 ) );
sidebar.open( );