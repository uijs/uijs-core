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
  });

  var events = [];

  obj.watch('content', function(value) { 
    if (!value) return; // This can happen if setting the watch when the content is undefined (upon setting a watch this callback is called with the current value)
    
    // hang animation on the content
    value.yAnimation = kinetics.carouselBehavior(
      function() { return 0; },
      function() { return obj.height - obj.content.height; },
      function() { return 100; },
      events,
      function() { },
      { 
        regularFriction: function(velocity) { 
          return 0.997; 
          //return (velocity < 30 && velocity > -30) ? 0.998 : 
          //       (velocity < 150 && velocity > -150) ? 0.9965 : 0.997; 
        },
        springFriction: function(velocity) { 
          return 0.993; 
        }, 
        springVelocityThreshold: function() { return -100;} 
      });

    value.bind('y', function(){      
      // TODO: Save the scale somewhere and use a cached value of it
      var scale = window.devicePixelRatio;
      var result = this.yAnimation();
      result = Math.round(result * scale) / scale;      
      return result;
    });
  
    // update children
    bar.parent = obj;
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