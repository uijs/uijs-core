var assert = require('assert');
var easing = require('..').easing;

// verify that the linear tween is basically `function(x) { return x; }`
var x = 0.0;
while (x < 1.0) {
  var y = easing.linearTween(x);
  assert.equal(x, y);
  x += 0.1;
}