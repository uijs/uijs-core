var box = require('./box');
var kinetics = require('./kinetics');
var defaults = require('./util').defaults;
var min = require('./util').min;
var max = require('./util').max;
var scrollbar = require('./scrollbar');
var bind = require('./bind');

module.exports = function(options) {
  var obj = box(defaults(options, {
    clip: true,
    content: box(),
    is_simple_container_with_self_drawing: true
  }));

  var bar = scrollbar({ 
    height: bind(bar, 'height', function() { return obj.height; }),
    size: bind(bar, 'size', function() {
      return obj.height / obj.content.height;
    }),
    position: bind(bar, 'position', function() {
      return -obj.content.y / obj.content.height;
    }),
    x: bind(bar, 'x', function() {
      return obj.width - this.width;
    })
  });

  obj.children = bind(obj, 'children', function() { 
    obj.content.parent = obj;
    bar.parent = obj;
    obj.content.is_simple_container = true;
    return [ obj.content, bar ]; 
  });

  var events = [];

  obj.watch('content', function(value) { 
    if (!value) { return; }; // This can happen if setting the watch when the content is undefined (upon setting a watch this callback is called with the current value)
    value.yAnimation = kinetics.carouselBehavior(
      function() { return 0; },
      function() { return obj.height - obj.content.height; },
      function() { return 100; },
      events,
      function() { },
      { regularFriction: function() { return 0.997; }, springVelocityThreshold: function() { return -100;} });
    value.y = bind(value, 'y', function(){
      var result = Math.round(value.yAnimation());
      return result;
    });
  });

  obj.ondraw = function(ctx) {
    ctx.fillStyle = 'white';

    ctx.fillRect(0, 0, this.width, this.height);
  };

  obj.on('touchstart', function(coords) {
    this.startCapture();
    events.push({name: 'touchstart', position: coords.y, timestamp: Date.now()});
  });

  obj.on('touchmove', function(coords) {
    if (!this.capturing()) return;
    events.push({name: 'touchmove', position: coords.y, timestamp: Date.now()});
  });

  obj.on('touchend', function(coords) {
    this.stopCapture();
    events.push({name: 'touchend', position: coords.y, timestamp: Date.now()});
  });

  return obj;
};