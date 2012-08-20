function c(x) { return function() { return x; }; }

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

function surfaceWithForces(options){
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
    }
  }

  return returnValue;
}

function springAnimation(base, elasticity, options){
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

function basicSliderAnimation(options){
  options = options || {};
  options.friction = options.friction || c(0.995);
  return surfaceWithForces(options);
}

function carouselAnimation(carouselleftBase, carouselRightBase, initialPosition, initialVelocity, inSpringMode, initialSpringBase, options){

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
  var nonSpringAcceleration = options.nonSpringAcceleration || function() {return 0/*-((swf.velocity / 0.5) + (100 * direction))*/;};

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
    }
  };
  swf = surfaceWithForces(options);
  swf.spring_base = initialSpringBase();
  swf.spring = inSpringMode();
  return swf;
}

function carouselBehavior(spring_left_base, spring_right_base, spring_max_stretch, eventHistory, onClick, options){
  options = options || {};

  var last_touch_position = 0;
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
      }

      if (oldestEvent.name === "touchmove") {
        touching = true;
        moving = true;
        var delta_position = last_touch_position - previous_touch_position;
        var delta_ts = (last_timestamp - previous_touch_timestamp) / 1000; //In seconds
        if ((last_position > spring_left_base() && delta_position > 0) || (last_position < spring_right_base() && delta_position < 0)) {
          spring = true;
          if (last_position > spring_left_base()) {
            spring_base = spring_left_base();  
          }
          else{
            spring_base = spring_right_base();
          }
          delta_position = (spring_max_stretch() - ((last_position - spring_base) * calculateDirection(delta_position)) ) / spring_max_stretch() * delta_position; 
        }
        else{
          spring = false;
        }
        last_speed = delta_position / delta_ts;
        var max_speed = 6000;
        if(last_speed > max_speed){
          last_speed = max_speed;
        }
        else if(last_speed < -max_speed){
          last_speed = -max_speed;
        }

        last_position += delta_position;
      }

      if (oldestEvent.name === "touchend") {
        touching = false;
        if (!moving) { //We've detected a click without a move!!
          console.log('click', previous_touch_position);
          onClick(previous_touch_position, this);
        }
      }
    }
      
    var swf;
    if ((!isNaN(last_speed) && !touching) && moving){
      var now = Date.now();
      options.delta_ts = c((now - last_timestamp) / 1000);
      swf = carouselAnimation(spring_left_base, spring_right_base, c(last_position), c(last_speed), c(spring), c(spring_base), options);
      last_position = swf.animate();
      spring = swf.spring;
      spring_base = swf.spring_base;
      last_timestamp = now;
      last_speed = swf.velocity;
    }

    return last_position;
  }
}

exports.carouselBehavior = carouselBehavior;