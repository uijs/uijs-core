var assert = require('assert');
var bind = require('..').bind;
var autobind = bind.autobind;

var foobind = bind(obj, 'foo', function() { return 'hello' });

var obj = autobind({
  x: 5,
  y: 10,
  foo: foobind,
  goo: function() { return 'goo'; },
});

obj.xoo = foobind;

var goobind = bind(obj, 'goo', function() { return 88 });

bind(obj, 'foo', function() { return 77; });
obj.foo = goobind;

assert(obj.foo === 88);

// bench(obj, 'x');

bind(obj, 'hello', function() { return 'world'; });

// bench(obj, 'x');
// bench(obj, 'hello');

assert(obj.x === 5);
assert(obj.y === 10);
assert(obj.hello === 'world');

obj.hello = 99;

// bench(obj, 'hello');
// bench(obj, 'x');

// ----

function bench(obj, prop) {
  console.time(prop);
  for (var i = 0; i < 10000000; ++i) {
    obj[prop];
  }
  console.timeEnd(prop);
}