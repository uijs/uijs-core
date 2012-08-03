var uijs = require('uijs');
var loadimage = uijs.util.loadimage;
var carousel = require('./physics/carousel');
var images = require('./physics/data');
var box = uijs.box;
var bind = uijs.bind;

var app = box({
});


var firstTime = true;

app.ondraw = function(ctx){
  var self = this;
  if (firstTime){
  	ctx.fillStyle = 'blue';
  	ctx.fillRect(0, 0, self.width, self.height);
  	firstTime = false;
  }
};

app.clip = true;

var car = carousel({
  images: images.map(function(url) {
      return loadimage(url);
  }),
});

app.add(car);

module.exports = app;
