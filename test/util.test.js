var uijs = require('..');
var util = uijs.util;
var defaults = util.defaults;
var assert = require('assert');

// verify that 0 is not treated as `false`
var options = {};
var obj = defaults(options, { x: 0 });
assert(obj.x === 0);
