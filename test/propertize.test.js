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

// verify that `obj.properties` contains the properties.
assert(obj.properties.length === 2);
assert(obj.properties[0] === 'prop1');
assert(obj.properties[1] === 'prop2');

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

// interception
obj.prop1 = 10;

var change_emitted = false;
obj.properties.onchange('prop1', function(new_value, old_value) {
  assert(new_value === 'hello');
  assert(old_value === 10);
  change_emitted = true;
});

obj.prop1 = 'hello';
assert(change_emitted);

// interception with functions
var val = 5;
change_emitted = false;
obj.prop2 = function() { return val; };
assert(obj.prop2 === 5);
obj.properties.onchange('prop2', function(nv, ov) {
  assert(nv === 6);
  change_emitted = true;
});
val = 6;
assert(obj.prop2 === 6);
assert(change_emitted);