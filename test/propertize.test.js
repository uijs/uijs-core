var assert = require('assert');
var propertize = require('..').util.propertize;

var obj = {
  prop1: 5,
  prop2: function() { return 10 },
  ondraw: function(x) {
    return x + 10;
  },
  _nonprop: 55,
};

// propertize - filter out anything that starts with `on` or `_`.
propertize(obj, function(attr) {
  return !(attr.indexOf('on') === 0 || attr.indexOf('_') === 0);
});

/// verify getters
assert(obj.prop1 === 5);  // plain old value
assert(obj.prop2 === 10); // result of a function call
assert(obj._nonprop === 55);
assert(obj.ondraw(4) === 14);

// assign functions/values and check tht behavior remains consistent
obj.prop1 = function() { return obj.prop2 * 2; };
obj.prop2 = 2;
assert(obj.prop1 === 4);

obj._nonprop = function() { return 56 };
assert(obj._nonprop() === 56);