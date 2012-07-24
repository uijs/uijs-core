var uijs = require('uijs');
var loadimage = uijs.util.loadimage;
var carousel = require('./carousel');
var images = require('./data');
var box = uijs.box;

var app = carousel({
  images: images.map(function(url) {
    return loadimage(url);
  }),
});

module.exports = app;
