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

// turns all attributes of `obj` into functional properties.
// `filter` (`function(attr)`) can be used to filter out any attributes.
exports.propertize = function(obj, filter) {
  filter = filter || function(attr) { return true; }; 

  function prop(obj, name) {
    var prev = obj[name];

    var curr = null;
    Object.defineProperty(obj, name, {
      get: function() {
        if (typeof curr === 'function') return curr.call(this);
        else return curr;
      },
      set: function(value) {
        curr = value;
      }
    });

    obj[name] = prev;

    obj.properties = obj.properties || [];
    obj.properties.push(name); // manage a list of property names
  }

  for (var attr in obj) {
    if (!obj.hasOwnProperty(attr)) continue; // skip properties from linked objects
    if (!filter(attr)) continue;
    prop(obj, attr);
  }

  return obj;
};
