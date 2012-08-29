var uijs = require('uijs');
var box = uijs.box;
var defaults = uijs.util.defaults;

function rect(options) {
  var obj = box(defaults(options, {
    background: 'green',
  }));

  var posx = 0;
  var posy = 0;
  var state = 'top';
  var size = 5;

  obj.onCalculate = function (){

  }

  obj.onSetContext = function(ctx){

  }

  obj.ondraw = function(ctx) {
    for (var i = 0; i < 100000; ++i) {
      Math.pow(i, 5);
    }

    ctx.fillStyle = this.background;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.fillStyle = 'yellow';
    ctx.fillRect(posx, posy, size, size);
    
    switch (state) {
      case 'top': 
        posx++;
        if (posx >= 10) state = 'right';
        break;

      case 'right':
        posy++;
        if (posy >= 10) state = 'bottom';
        break;

      case 'bottom':
        posx--;
        if (posx <= 0) state = 'left';
        break;

      case 'left':
        posy--;
        if (posy <= 0) state = 'top';
        break;
    }


  };

  return obj;
}

var app = rect();

var child1 = app.add(rect({
  id: '#child1',
  x: 10,
  y: 10,
  width: 100,
  height: 100,
  background: 'red',
}));

var child2 = child1.add(rect({
  x: 10,
  y: 10,
  width: 50,
  height: 50,
  background: 'blue',
}));

child1.animate({ x: 410 }, { duration: 10000 });

// var child3 = app.add(box({
//   x: 100,
//   y: 100,
//   width: 300,
//   height: 300,
// }));

// child3.ondraw = function(ctx) {
//   ctx.drawImage(app._bufferCanvas, 0, 0);
// };

module.exports = app;