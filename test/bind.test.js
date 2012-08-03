var assert = require('assert');
var bind = require('..').bind;
var EventEmitter = require('..').events.EventEmitter;

var autobind = bind.autobind;

// play around with some usage options

// create a 'bind promise' and assign it in the object literal later.
var foobind = bind(obj, 'foo', function() { return 'hello' });

var obj = autobind({
  x: 5,
  y: 10,
  foo: foobind,
  goo: function() { return 'goo'; },
});

assert(obj.foo, 'hello');

// this will not work because `xoo` is not bound.
obj.xoo = foobind;
assert(obj.xoo.$bindPromise);


// set up a watch on `foo`

var foo_changed = -1;
var foo_changed_bound = null;
obj.watch('foo', function(new_foo, bound) {
  foo_changed = new_foo;
  foo_changed_bound = bound;
});

// assign the result of bind back to `foo`. should work
obj.foo = bind(obj, 'foo', function() { return 88 });
assert(obj.foo === 88);
assert(foo_changed_bound && typeof foo_changed === 'function');

// bench(obj, 'x');

// bind without assignment. should work
bind(obj, 'hello', function() { return 'world'; });

// bench(obj, 'x');
// bench(obj, 'hello');

assert(obj.x === 5);
assert(obj.y === 10);
assert(obj.hello === 'world');

// reassign a value to a bound property - should convert to a value
obj.hello = 99;
assert(obj.hello === 99);

// bench(obj, 'hello');
// bench(obj, 'x');

// watch a regular value (behind the scenes it turns to a bound value)
var koo_changed = -1;
obj.koo = 8989;
obj.watch('koo', function(newval) { koo_changed = newval; });
obj.koo = 777;
assert(obj.koo === 777);
assert(koo_changed === 777);
obj.koo = 444;
assert(koo_changed === 444);
bind(obj, 'koo', function() { return 'yeah!' });
assert(typeof koo_changed === 'function');

// ----

function bench(obj, prop) {
  console.time(prop);
  for (var i = 0; i < 10000000; ++i) {
    obj[prop];
  }
  console.timeEnd(prop);
}