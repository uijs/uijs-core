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
          //return 0.997; 
          return (velocity < 30 && velocity > -30) ? 0.998 : 
                 (velocity < 150 && velocity > -150) ? 0.9965 : 0.997; 
        },
        springFriction: function(velocity) { 
          return 0.993; 
        }, 
        springVelocityThreshold: function() { return -100;} 
      });
    var prev_y = -300;
    var speed = 60;
    var last_time = Date.now();
    var direction = 1;
    var skip = true;
    var numSkips = 0;
    value.bind('y', function(){
      //return 0;
      
      // TODO: Save the scale somewhere and use a cached value of it
      var scale = window.devicePixelRatio;
      var result = this.yAnimation();
      result = Math.round(result * scale) / scale;      
      //console.log(result);
      return result;
      var now = Date.now();
  //    while(Date.now() - now < 31){
      //}
      
      if(skip){
        numSkips++;
        if(numSkips === 1){
          skip = false;
          numSkips = 0; 
          direction *= -1;
        }
        //prev_y += (1 * direction);
        //return prev_y;
      }

      skip = true;
      prev_y += direction * 70;
      return prev_y;
      

      return prev_y -=0.5;
      //return result;
      

      var now = Date.now();
      //while(Date.now() - now < 25){

      //}
      //now = Date.now();
      var dt = now - last_time;
      last_time = now;
      dt = dt / 1000;
      var dp = dt * speed;
      
      if (prev_y >= 0) {
        direction = -1;
      };
      if(prev_y < -9000){
        direction = 1;
      }
      prev_y += Math.round(dp * direction);

      return prev_y;
      //return prev_y;
      //prev_y += (4 * direction);
      //return prev_y;
    });
  
    bar.parent = obj;
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