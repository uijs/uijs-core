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
    console.log('content changed', value);

    if (!value) { return; }; // This can happen if setting the watch when the content is undefined (upon setting a watch this callback is called with the current value)
    
    // hang animation on the content
    value.yAnimation = kinetics.carouselBehavior(
      function() { return 0; },
      function() { return obj.height - obj.content.height; },
      function() { return 100; },
      events,
      function() { },
      { 
        regularFriction: function() { return 0.997; }, 
        springVelocityThreshold: function() { return -100;} 
      });
    
    value.bind('y', function(){
      var result = Math.round(value.yAnimation());
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