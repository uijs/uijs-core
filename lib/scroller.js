var box = require('./box');
var kinetics = require('./kinetics');
var defaults = require('./util').defaults;
var scrollbar = require('./scrollbar');
var bind = require('./bind');

module.exports = function(options) {
  var obj = box(defaults(options, {
    content: box(),
    invalidators: [ 'content' ],
  }));

  var bar = scrollbar({
    parent: obj,
    alpha: bind(function() {
      if (!obj.content) return 0.0;

      var v = Math.abs(obj.content.velocity);
      if (v > 10) return 1.0;
      if (v < 2) return 0.0;
      return v / 10;
    }),
  });

  var events = [];

  obj.watch('content', function(value) { 
    if (!value) return; // This can happen if setting the watch when the content is undefined (upon setting a watch this callback is called with the current value)
    
    // hang animation on the content
    value.yAnimation = kinetics.carouselBehavior(
      function() { return 0; }, // spring_left_base
      function() { return obj.height - obj.content.height; }, // spring_right_base
      function() { return 100; }, // spring_max_stretch
      events, // eventHistory
      function() { }, // onclick
      { 
        regularFriction: function() { return 0.987; },
        springVelocityThreshold: function() { return -100;} 
      });
    
    value.bind('y', function(){
      // TODO: Save the sacale somewhere and use a cached value of it
      var scale = window.devicePixelRatio;
      var result = Math.round(value.yAnimation() * scale) / scale;
      return result;
    });

    // update children
    value.parent = obj;

    obj.children = [ value, bar ];
  });

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