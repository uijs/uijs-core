/*
var nodetime = require('nodetime');
nodetime.profile();
*/

var uijs = require('uijs');
var box = uijs.box;
var defaults = uijs.util.defaults;
var bind = uijs.bind;

function thebox(options) {
  var obj = box(defaults(options, {
    color: 'white',
  }));

  obj.ondraw = function(ctx) {
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'black';
    ctx.fillRect(0, 0, this.width, this.height);
  };

  var curr_x = 0;
  var curr_y = 0;

  while (true) {

    var child = obj.add(box({
      color: 'blue',
      x: curr_x,
      y: curr_y,
      width: 10,
      height: 10,
      rotation: bind(child, 'rotation', bounce(Math.round(Math.random() * 100))),
    }));

    curr_x += child.width;

    if (curr_x + child.width > obj.width) {
      curr_x = 0;
      curr_y += child.height;
    }

    child.ondraw = obj.ondraw;

    if (curr_y + child.height > obj.height) {
      break;
    }
  }

  return obj;
}

var app = box();

var size = 100;

app.add(thebox({
  id: '#thebox',
  y: bind(app, 'y', bounce()),
  x: 50,
  width: size,
  height: size,
}));

function bounce(speed) {
  speed = speed || 100;

  var start_time = Date.now();
  var start_y = 0;
  var v = speed;
  var curr = 0;
  var dir = 1;
  var a = 10000;

  return function() {
    if (curr + this.height >= this.parent.height) {
      dir = -1;
    }

    if (curr <= 0) {
      dir = 1;
    }

    var dt = (Date.now() - start_time) / 1000.0;
    curr += v * dt * dir;
    start_time = Date.now();

    return curr;
  }
}


app.ondraw = function(ctx) {
  // console.log(this.width, this.height);
  ctx.fillStyle = 'red';
  ctx.fillRect(0, 0, this.width, this.height);
};

/*
nodetime.agent.on('message', function(m) {
  if (m.cmd === 'profileCpu') {
    run_bench();
  }
});
*/

module.exports = app;

