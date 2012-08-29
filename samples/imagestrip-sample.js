var uijs = require('uijs');
var loadimage = uijs.util.loadimage;
var carousel = require('./physics/carousel');
var images = require('./physics/data');
var box = uijs.box;

var app = box({
});


var firstTime = true;

app.onCalculate = function (){

}

app.onSetContext = function(ctx){
  ctx.fillStyle = 'blue';
}

app.ondraw = function(ctx){
  var self = this;
  ctx.fillRect(0, 0, self.width, self.height);
};

var car = carousel({
  images: images.map(function(url) {
      return loadimage(url);
  }),
});

app.add(car);

module.exports = app;
