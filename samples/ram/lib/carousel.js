var uijs = require('uijs');
var c = uijs.util.constant;
var defaults = uijs.util.defaults;
var min = uijs.util.min;
var max = uijs.util.max;

var accelaration = 3500;
var bounce_time = 5.0;

module.exports = function(options) {
  var obj = uijs.view(defaults(options, {
    images: c([]),
    fillStyle: c('black')
  }));

  var base = {
    ondraw: obj.ondraw
  };

  var sp = spring(0, 500);

  var touchstart = null;
  var x0 = 0;
  var last_x;
  var last_ts;
  var last_v;
  var v0 = 0;
  var end_time = 0;
  var a = 0;
  var direction = 0;

  var buff = document.createElement("canvas");
  buff.x = 0;
  buff.y = 0;
  buff.width = 1000;
  buff.height = 480;

  var last_draw_ts = Date.now();
  var last_draw_x = 0;

  obj.ondraw = function(context) {
    var self = this;

    var x = sp(x0);

    var ctx = buff.getContext('2d');


    var h = self.height();
    var w = self.width();

    var top = h / 2 - 25;
    var bottom = h / 2 + 25;

    ctx.fillRect(0, 0, self.width(), self.height());

    self.images().forEach(function(img) {
      var i = img();
      if (i.width === 0 || i.height === 0) return;
      var y = h / 2 - i.height / 2;
      ctx.drawImage(i, x, y);
      x += i.width;
    });

    context.drawImage(ctx.canvas, 0, 0);
  };

  obj.on('touchstart', function(coords) {
    history = [];
    touchstart = coords;
    touchstart.x -= x0;

    last_x = touchstart.x;
    last_ts = Date.now();
  });

  obj.on('touchmove', function(coords) {
    x0 = coords.x - touchstart.x;
    last_v = current_velocity(coords);
    last_x = coords.x;
    last_ts = Date.now();
  });

  function current_velocity(coords) {
    var delta_x = last_x - coords.x;
    var delta_ts = last_ts - Date.now();
    return delta_x / delta_ts * 1000;
  }

  obj.on('touchend', function(coords) {
    touchstart = null;
    v0 = last_v;
    direction = Math.abs(v0) / -v0;

    v0 = -1 * direction * min(3200, Math.abs(v0));

    a = direction * accelaration;
    end_time = Date.now();
    last_x = 0;
    last_v = 0;
    last_ts = 0;
  });

  function spring(base, stretch, options) {
    options = options || {};
    
    var friction = 'friction' in options ? options.friction : 0.7;
    var elasticity = 'elasticity' in options ? options.elasticity : 0.1;

    var curr = base + stretch;
    var spring_v = 0;
    var spring_a = 0;

    var spring_mode = false;

    return function() {

      // if (typeof new_curr !== 'undefined') curr = new_curr;

      if (spring_mode) {
        spring_a = elasticity * (base - curr);
        spring_v = spring_v * friction + spring_a;

        curr += spring_v;
        
        if (Math.abs(curr - base) < 0.1) {
          console.log('spring done');
          spring_mode = false;
          v0 = 0;
          a = 0;
          last_draw_x = curr;
        }

        return curr;
      }
      else {
        var dt = (Date.now() - last_draw_ts) / 1000.0;

        curr = last_draw_x + v0 * dt + 0.5 * a * dt * dt;
        v0 = (curr - last_draw_x) / dt;

        if (-1 * direction * v0 < 0) {
          v0 = 0;
          a = 0;
        }

        last_draw_ts = Date.now();
        last_draw_x = curr;

        if (curr > stretch) {
          spring_mode = true;
        }

        return curr;
      }
    };
  }


  obj.on('mousedown', function(e) { obj.emit('touchstart', e); });
  obj.on('mousemove', function(e) { obj.emit('touchmove', e); });
  obj.on('mouseup', function(e) { obj.emit('touchend', e); });

  return obj;
}
