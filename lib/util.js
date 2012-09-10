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

var image_cache = {};

exports.loadimage = function(src, onload, options) {
  if (typeof src === 'function') src = src();

  if (typeof onload !== 'function') {
    options = onload;
    onload = undefined;
  }

  options = options || {};

  // if `true` will try to load filename@2x.ext first and will fall back to the non 2x version if failed
  var retina = 'retina' in options ? options.retina : true;

  // if `true` will store any images loaded in a cache (by src url) and will serve them from cache next time
  var cache = 'cache' in options ? options.cache : true;

  var original_url = src;

  if (cache) {
    var cached = image_cache[original_url];
    if (cached) return cached;
  }

  var img = new Image();

  if (retina && typeof window != 'undefined') {
    if (window.devicePixelRatio == 2) {
      src = src.replace('.png', '@2x.png');
      src = src.replace('.jpg', '@2x.jpg');
      src = src.replace('.jpeg', '@2x.jpeg');
      img.onerror = function() {
        img.src = original_url;
      };
    }
  }

  console.log('loading ' + src);
  img.src = src;
  img.onload = onload || function() { 
    img.loadtime = new Date();
  };

  if (cache) {
    image_cache[original_url] = img;
  }

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
