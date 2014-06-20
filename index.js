/* global require, module */
'use strict';

var Sidebar = require( './src/views/sidebar' ),
    SidebarView = require( './src/views/sidebarView' ),
    Controller = require( './src/controller' );

module.exports = Controller.bind( null, Sidebar, SidebarView );
module.exports.Sidebar = Sidebar;
module.exports.SidebarView = SidebarView;