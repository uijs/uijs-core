var uijs = require('uijs');
var c = uijs.util.constant;
var defaults = uijs.util.defaults;
var min = uijs.util.min;
var max = uijs.util.max;

function calculateDirection(velocity){
  return Math.abs(velocity) / velocity;
}

function calculateSpeed(v0, acceleration, friction, delta_ts){
  var delta_speed = acceleration * delta_ts;
  return v0 * friction + delta_speed;
}

function calculatePosition(x0, velocity, delta_ts){
  var delta_x = velocity * delta_ts;
  return x0 += delta_x;    
}

exports.surfaceWithForces = function(options){
  options = options || {};
  var friction = options.friction || c(0.993);
  var last_ts = Date.now();
  // The time delta for which to calculate the spring action (in seconds). If not set then will take from intervals between calls to the returned function, starting from now
  var delta_ts = options.delta_ts || function(){
    var now = Date.now();
    var calculatedDelta = (now - last_ts) / 1000;
    last_ts = now;
    return calculatedDelta;
  };
  var time_unit = options.time_unit ? options.time_unit() : 0.001; //(In seconds) The calculation will be done for each time unit 
  var acceleration = options.acceleration || c(0);

  var returnValue = {
    position: options.initialPosition ? options.initialPosition() : 0,      
    velocity: options.initialVelocity ? options.initialVelocity() : 0.0, // In pixels per second
    
    animate: function(){
      var self = this;
      var timespan = delta_ts();
      for (var i = 0; i < timespan; i += time_unit) {
        self.velocity = calculateSpeed(self.velocity, acceleration(), friction(), time_unit);
        self.position = calculatePosition(self.position, self.velocity, time_unit);
      }
      return self.position;
    },
  }

  return returnValue;
}

exports.springAnimation = function(base, elasticity, options){
  options = options || {};
  var elasticity = options.elasticity || c(65);
  var swf;
  var calculateAcceleration = function(){
    return -((swf.position - base) * elasticity);
  };

  options.friction = options.friction || c(0.995);
  if (options.acceleration) {alert("Cannot define acceleration for a spring, just elasticity and base");};
  options.acceleration = calculateAcceleration;
  var swf = surfaceWithForces(options);

  return swf;    
}

exports.basicSliderAnimation = function(options){
  options = options || {};
  options.friction = options.friction || c(0.995);
  return surfaceWithForces(options);
}

exports.carouselAnimation = function(carouselleftBase, carouselRightBase, initialPosition, initialVelocity, inSpringMode, initialSpringBase, options){
  options = options || {};
  var elasticity = options.elasticity || c(65);
  var springFriction = options.springFriction || c(0.993);
  var regularFriction = options.regularFriction || c(0.995);
  var springVelocityThreshold = options.springVelocityThreshold || c(300); //Under this velocity (in pixels per sec) the surface will become a spring whose base is the current position
  var time_unit = options.time_unit = options.time_unit || c(0.001); //(In seconds) The calculation will be done for each time unit 
  var last_ts = Date.now();
  // The time delta for which to calculate the spring action (in seconds). If not set then will take from intervals between calls to the returned function, starting from now
  var delta_ts = options.delta_ts || function(){
    var now = Date.now();
    var calculatedDelta = (now - last_ts) / 1000;
    last_ts = now;
    return calculatedDelta;
  };

  var swf;
  var direction = calculateDirection(initialVelocity());
  var nonSpringAcceleration = options.nonSpringAcceleration || function() {return -((swf.velocity / 0.5) + (100 * direction));};

  var determineSpring = function(){
    var leftBase = carouselleftBase();
    var rightBase = carouselRightBase();

    if (swf.position > leftBase) {
      swf.spring = true;
      swf.spring_base = leftBase;
    }
    else if (swf.position < rightBase) {
      swf.spring = true;
      swf.spring_base = rightBase;
    }
    else if (!swf.spring && Math.abs(swf.velocity) < springVelocityThreshold()) {
      swf.spring = true;
      swf.spring_base = swf.position;
    }
  };
      
  var now = Date.now();
  var options = {
    initialPosition: initialPosition,
    initialVelocity: initialVelocity,
    delta_ts: delta_ts,
    time_unit: time_unit,
    acceleration: function(){  
      determineSpring();
      if (swf.spring) {
        return -((swf.position - swf.spring_base) * elasticity());
      }
      else{
        return nonSpringAcceleration();
      }
    },
    friction: function(){  
      determineSpring();
      if (swf.spring) {
        return springFriction();
      }
      else{
        return regularFriction();
      }
    },
  };
  swf = exports.surfaceWithForces(options);
  swf.spring_base = initialSpringBase();
  swf.spring = inSpringMode();
  return swf;
}

exports.carouselBehavior = function(spring_left_base, spring_right_base, spring_max_stretch, eventHistory, onClick, options){
  options = options || {};

  var last_touch_position;
  var last_position = 0;
  var last_timestamp;
  var last_speed; // In pixels per second
  var touching = false;
  var moving = false;
  var spring = false;
  var spring_base = 0;  

  return function(){
    while (eventHistory.length > 0){
      var oldestEvent = eventHistory.shift();
      var previous_touch_position = last_touch_position;
      last_touch_position = oldestEvent.position;
      var previous_touch_timestamp = last_timestamp;
      last_timestamp = oldestEvent.timestamp;
        
      if (oldestEvent.name === "touchstart") {
        touching = true;
        moving = false;
        spring = false;
      };
      if (oldestEvent.name === "touchmove") {
        touching = true;
        moving = true;
        var delta_position = last_touch_position - previous_touch_position;
        var delta_ts = (last_timestamp - previous_touch_timestamp) / 1000; //In seconds
        if ((last_position > spring_left_base() && delta_position > 0) || (last_position < (spring_right_base) && delta_position < 0)) {
          spring = true;
          if (last_position > spring_left_base()) {
            spring_base = spring_left_base();  
          }
          else{
            spring_base = spring_right_base;
          }
          delta_position = (spring_max_stretch() - ((last_position - spring_base) * calculateDirection(delta_position)) ) / spring_max_stretch() * delta_position; 
        }
        else{
          spring = false;
        }
        last_speed = delta_position / delta_ts;
        if(last_speed > 3500){
          last_speed = 3500;
        }
        last_position += delta_position;
      };
      if (oldestEvent.name === "touchend") {
        touching = false;
        if (!moving) { //We've detected a click without a move!!
           onClick(previous_touch_position, this);
         };
       };
    }
      
    var swf;
    if ((!isNaN(last_speed) && !touching) && moving){
      var now = Date.now();
      options.delta_ts = c((now - last_timestamp) / 1000);
      swf = exports.carouselAnimation(spring_left_base, spring_right_base, c(last_position), c(last_speed), c(spring), c(spring_base), options);
      last_position = swf.animate();
      spring = swf.spring;
      spring_base = swf.spring_base;
      last_timestamp = now;
      last_speed = swf.velocity;
    }
    return last_position;
  }
}


module.exports = function(options) {
  var eventHistoryX = [];
  var eventHistoryY = [];

  var blackStrip = uijs.view({
    fillStyle: c('black'),
    width: function (){
      var self = this;
      return self.parent.width();
    },
    height: c(100),
    x: c(0),
    y: function(){
      var self = this;
      return (self.parent.height() / 2) - (self.height() / 2);
    },
    layout: uijs.layouts.none(),
  });

  var imageStrip = uijs.view({
    images: options.images,
    fillStyle: c('black'),
    width: function (){
      var self = this;
      return self.parent.width();
    },
    height: c(100),
    last_x: 0,
    last_x_left_offset: 0,
    getPictureIndexFromParentCoords: function(x){
      var self = this;
      var x_on_image_strip = -self.last_x + x;
      var base_index = 0;
      var x = -self.last_x_left_offset;
      for (var i = 0; i < self.images().length; i++){
        var image = self.images()[i]();
        x += image.widthh;
        if (x > x_on_image_strip) {
          base_index = i;
          break;
        };
      }
      return base_index;
    },
    enlarged_image_index: 0,
    enlargement_size: 0,
    onClick: function(position, self){
      self.images()[self.enlarged_image_index]().unselect();
      self.enlarged_image_index = self.getPictureIndexFromParentCoords(position);
      self.images()[self.enlarged_image_index]().select();
      self.enlargement_size = 1;
    },
    calculateNewX: function(){
      var self = this;
      self.calculateNewX = exports.carouselBehavior(c(self.imageStripBuff.x), c(self.width() - self.imageStripBuff.width), c(300), eventHistoryX, self.onClick);
      return self.calculateNewX();
    },    
    x: function(){
      var self = this;
      self.last_x = self.calculateNewX();
      return self.last_x;
    },
    calculateNewY: function(){
      var self = this;
      self.calculateNewY = exports.carouselBehavior(c(self.imageStripBuff.y), c(self.height() - self.imageStripBuff.height), c(300), eventHistoryY, self.onClick);
      return self.calculateNewY();
    },    
    y: function(){
      var self = this;
      self.last_y = self.calculateNewY();
      return self.last_y;
    },
    //y: c(0),
  });

  var base = {
    ondraw: blackStrip.ondraw
  };

  imageStrip.setupImages = function(){
    var self = this;
    self.images().forEach(function(img) {
      self = this;
      var i = img();
      i.growing = false;
      i.shrinking = false;
      i.selectedd = false;
      i.maxGrowth = 100;
      i.maxShrink = 50;
      i.growthRate = 0.75; //In pixels per frame
      i.shrinkRate = 0.75; //In pixels per frame
      i.yy = 25;
      i.widthh = 50;
      i.heightt = 50;
      i.shrink = function(){
        self = this;
        self.growing = false;
        self.shrinking = true;
      };
      i.grow = function(){
        self = this;
        self.growing = true;
        self.shrinking = false;
      };
      i.select = function(){
        self = this;
        self.selectedd = true;
        if (self.widthh >= self.maxGrowth) {
          self.shrink();
        }
        else if (self.widthh <= self.maxShrink){
          self.grow();
        }
      };
      i.unselect = function(){
        self = this;
        self.selectedd = false;
        if (self.widthh >= self.maxGrowth) {
          self.shrink();
        }
      };
      i.animate_width = function(){
        self = this;
        if (!self.selectedd && self.widthh >= self.maxGrowth) {
          self.shrink();
        };
        if (self.growing && self.widthh < self.maxGrowth) {
          self.widthh += (self.growthRate * 2);
        }
        else if (self.shrinking && self.widthh > self.maxShrink) {
          self.widthh -= (self.shrinkRate * 2);
        }
        return self.widthh; 
      };
      i.animate_height = function(){
        self = this;
        if (!self.selectedd && self.heightt >= self.maxGrowth) {
          self.shrink();
        };
        if (self.growing && self.heightt < self.maxGrowth) {
          self.heightt += (self.growthRate * 2);
        }
        else if (self.shrinking && self.heightt > self.maxShrink) {
          self.heightt -= (self.shrinkRate * 2);
        }
        return self.heightt; 
      };
      i.animate_x = function(){
        self = this;
        if (!self.selectedd && self.widthh >= self.maxGrowth) {
          self.shrink();
        };
        if (self.growing && self.widthh < self.maxGrowth) {
          self.x -= self.growthRate;
        }
        else if (self.shrinking && self.widthh > self.maxShrink) {
          self.y += self.shrinkRate;
        }
        return self.x;
      };
      i.animate_y = function(){
        self = this;
        if (!self.selectedd && self.heightt >= self.maxGrowth) {
          self.shrink();
        };
        if (self.growing && self.heightt < self.maxGrowth) {
          self.yy -= self.growthRate;
        }
        else if (self.shrinking && self.heightt > self.maxShrink) {
          self.yy += self.shrinkRate;
        }
        return self.yy;
      };
      i.animate = function() {
        self = this;
        self.animate_width();
        self.animate_height();
        self.animate_x();
        self.animate_y();
      };
    });
  };

  imageStrip.setupImages();

  imageStrip.createBuffer = function(){
    var self = this;

    if (!self.imageStripBuff) {
      self.imageStripBuff = document.createElement("canvas");
      self.imageStripBuff.x = 0;
      self.imageStripBuff.y = 0;
      self.imageStripBuff.width = self.images().length * 50;
      self.imageStripBuff.height = 100;
    };
    
    var ctx = self.imageStripBuff.getContext('2d');
    ctx.fillRect(0,0, ctx.canvas.width, ctx.canvas.height);

    var index = 0;
    var x_left_offset = 0;

    //Calculate the left x offset for each image and also animate all the images
    // TODO: there has got to be a better way to do this
    self.images().forEach(function(img) {
      var i = img();
      i.animate();
      x_left_offset += (i.widthh - 50) / 2;
    });
    
    self.last_x_left_offset = x_left_offset; 
    var x = -x_left_offset;
    
    self.images().forEach(function(img) {
      var i = img();
      ctx.drawImage(i, x, i.yy, i.widthh, i.heightt);
      index++;
      x += i.widthh;
    });
  };


  imageStrip.createBuffer();

  blackStrip.ondraw = function(context) {
    var self = this;
    
    context.fillRect(0, 0, self.width(), self.height());
  };

  var ts = 0;
  var frames = 0;
  
  imageStrip.ondraw = function(context) {
    var self = this;
    var newTime = Date.now();
    frames++;
    if (ts == 0) {
      ts = Date.now();
    }
    else{
      if ((newTime - ts) > 1000) {
        console.log("fps: " + frames);
        self.root().log("fps: " + frames);
        frames = 0;
        ts = newTime;
      };
    };
    
    self.createBuffer();
    context.drawImage(self.imageStripBuff, 0, 0);

  };

  blackStrip.on('touchstart', function(coords) {
    eventHistoryX.push({name: 'touchstart', position: coords.x, timestamp: Date.now()});
    eventHistoryY.push({name: 'touchstart', position: coords.y, timestamp: Date.now()});
  });

  blackStrip.on('touchmove', function(coords) {
    eventHistoryX.push({name: 'touchmove', position: coords.x, timestamp: Date.now()});
    eventHistoryY.push({name: 'touchmove', position: coords.y, timestamp: Date.now()});
  });

  blackStrip.on('touchend', function(coords) {
    eventHistoryX.push({name: 'touchend', position: coords.x ? coords.x : 0, timestamp: Date.now()});
    eventHistoryY.push({name: 'touchend', position: coords.y ? coords.y : 0, timestamp: Date.now()});
  });

  blackStrip.on('mousedown', function(e) { blackStrip.emit('touchstart', e); });
  blackStrip.on('mousemove', function(e) { blackStrip.emit('touchmove', e); });
  blackStrip.on('mouseup', function(e) { blackStrip.emit('touchend', e); });

  blackStrip.add(imageStrip);

  return blackStrip;
}
