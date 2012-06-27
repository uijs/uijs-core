exports.constant = function(x) { return function() { return x; }; };
exports.centerx = function(target, delta) { return function() { return target.width() / 2 - this.width() / 2 + (delta || 0); }; };
exports.centery = function(target, delta) { return function() { return target.height() / 2 - this.height() / 2 + (delta || 0); }; };
exports.top = function(target, delta) { return function() { return (delta || 0); }; };
exports.left = function(target, delta) { return function() { return (delta || 0); }; };
exports.right = function(target, delta) { return function() { return target.width() + (delta || 0); }; };
exports.bottom = function(target, delta) { return function() { return target.height() + (delta || 0); }; };
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
  if (!def) def = false;
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

exports.loadimage = function(src) {
  if (typeof src === 'function') src = src();
  
  var img = new Image();
  img.src = src;
  img.onload = function() { };

  return function() {
    return img;
  }
};
