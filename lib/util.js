var EventEmitter = require('./events').EventEmitter;

exports.min = function(a, b) { return a < b ? a : b; };
exports.max = function(a, b) { return a > b ? a : b; };

// returns a function that creates a new object linked to `this` (`Object.create(this)`).
// any property specified in `options` (if specified) is assigned to the child object.
exports.derive = function(options) {
  return function() {
    var obj = Object.create(this);
    obj.base = this;
    if (options) {
      for (var k in options) {
        obj[k] = options[k];
      }
    }
    return obj;
  };  
};

// returns the value of `obj.property` if it is defined (could be `null` too)
// if not, returns `def` (or false). useful for example in tri-state attributes where `null` 
// is used to disregard it in the drawing process (e.g. `fillStyle`).
exports.valueof = function(obj, property, def) {
  if (!obj) throw new Error('`obj` is required');
  if (def === undefined) def = false;
  if (!(property in obj)) return def;
  else return obj[property];
};

exports.defaults = function(target, source) {
  var valueof = exports.valueof;

  target = target || {};

  for (var k in source) {
    target[k] = valueof(target, k, source[k]);
  }

  return target;
};

exports.loadimage = function(src, onload) {
  if (typeof src === 'function') src = src();
  
  var img = new Image();
  img.src = src;
  img.onload = onload || function() { };

  return img;
};

exports.linearGradient = function(ctx, gradientColors, x1, y1, x2, y2){
  if (!gradientColors) return;
  /*
  The createLinearGradient() function takes 4 parameters: x1, y1, x2, y2.
  These 4 parameters determine the direction and extension of the gradient pattern.
  The gradient extends from the first point x1, y1 to the second point x2, y2.
  */
  var gradient = ctx.createLinearGradient(x1, y1, x2, y2);
  
  for (var i = 0; i < gradientColors.length - 1; i++) {
    gradient.addColorStop(i/(gradientColors.length-1),gradientColors[i])
  }
  gradient.addColorStop(1, gradientColors[gradientColors.length - 1]);
  
  return gradient;
};
