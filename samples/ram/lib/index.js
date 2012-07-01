var uijs = require('uijs');
var c = uijs.util.constant;
var loadimage = uijs.util.loadimage;
var carousel = require('./carousel');
var images = require('./data');

var app = uijs.app({
  layout: uijs.layouts.none(),
  width: function() { return this.parent.width() },
  height: function() { return this.parent.height() },
});

var car = carousel({
  width: app.width,
  height: app.height,
  x: c(0),
  y: c(0),
  images: c(images.map(function(url) {
    return loadimage(url)
  }))
});

app.add(car);

// var sim = uijs.view({
//   width: app.width,
//   height: app.height,
// });

// var t = Date.now();
// var v = 100;
// var x0 = 500;

// var sp = spring(0, 0.8, 0.1);

// sim.ondraw = function(ctx) {
//   var self = this;
//   ctx.fillRect(0,0,self.width(),self.height());

//   var x = sp();
//   ctx.fillStyle = 'white';
//   ctx.fillRect(x,50,10,10);
// };

// app.add(sim);


module.exports = app;
