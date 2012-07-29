var box = require('./box');
var kinetics = require('./kinetics');
var defaults = require('./util').defaults;
var min = require('./util').min;
var max = require('./util').max;
var scrollbar = require('./scrollbar');

module.exports = function(options) {
  var obj = box(defaults(options, {
    content: box(),
    clip: true,
  }));

  var bar = scrollbar({ 
    width: function() { return obj.width; },
    height: function() { return obj.height; },
    size: function() {
      return obj.height / obj.content.height;
    },
    position: function() {
      return -obj.content.y / obj.content.height;
    },
  });

  obj.children = function() { 
    return [ obj.content, bar ]; 
  };

  var events = [];

  obj.properties.onchange('content', function(value) {
    value.y = kinetics.carouselBehavior(
      function() { return 0; },
      function() { return obj.height - obj.content.height; },
      function() { return 300; },
      events,
      function() { },
      { regularFriction: function() { return 0.997; } });
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