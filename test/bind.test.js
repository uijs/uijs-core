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
  yoo: bind(function() { return 15; }),
  noo: bind(function() { return 20; }),
});

assert(obj.foo, 'hello');

// this will not work because `xoo` is not bound.
obj.xoo = foobind;
assert(obj.xoo.$bind);


// set up a watch on `foo` and verify that it receives notifications on bind

var foo_changed = -1;
var number_foo_watch_called = 0;
obj.watch('foo', function(new_foo) {
  foo_changed = new_foo;
  number_foo_watch_called++;
});

assert(number_foo_watch_called === 1);

// assign the result of bind back to `foo`. should work
obj.foo = bind(obj, 'foo', function() { return 88 });

assert(number_foo_watch_called === 2);
assert(obj.foo === 88);

// foo remains a property adter assigning it with literals
obj.foo = 89;

assert(number_foo_watch_called === 3);
assert(obj.foo === 89);

obj.foo = 90;

assert(number_foo_watch_called === 4);
assert(obj.foo === 90);

// set up a watch on `noo` which is not already bounded to a function

var noo_changed = -1;
var number_noo_watch_called = 0;
obj.watch('noo', function(new_noo) {
  noo_changed = new_noo;
  number_noo_watch_called++;
});

assert(number_noo_watch_called === 1);
assert(noo_changed === 20);

// noo remains a property adter assigning it with literals
obj.noo = 28;

assert(number_noo_watch_called === 2);
assert(obj.noo === 28);

obj.noo = 29;

assert(number_noo_watch_called === 3);
assert(obj.noo === 29);

// noo watch continues to behave after binding it back to a function

obj.noo = bind(obj, 'noo', function() { return 27 });

assert(number_noo_watch_called === 4);
assert(obj.noo === 27);

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
assert(koo_changed === 'yeah!');
// check assignment of a function - a warning should apear in the console, but the operation should succeed
console.log('\nDont worry, the warning about setting a function to a property should appear. ' +
  'If it doesnt then something is wrong. \n\n');
obj.koo = 4;
assert(koo_changed === 4);
obj.koo = function() { return 'succeeded'; };
assert(typeof koo_changed === 'function');
assert(koo_changed() === 'succeeded');
var koofunction = obj.koo;
assert(koofunction() === 'succeeded');

// check binding with the bind(getter, emit) syntax
obj2 = {
  x: bind(function() { return 5; }),
  y: bind(function() { return 6; }, true)
}

assert(obj2.x.$bind);
assert(obj2.y.$bind);

var boundedObj = autobind(obj2);
assert(boundedObj.x === 5);
assert(boundedObj.y === 6);

// test binding of object which is not a function 
var z_changed = -1;
var z_changed_bound = null;

var error;
try{
  boundedObj.z = bind(boundedObj, 'z', 7);
}
catch(err){
  error = err;
}
//assert(boundedObj.z === 7);
assert(error);
assert(boundedObj.z === undefined);

boundedObj.z = bind(boundedObj, 'z', function() {return 7;} );
assert(boundedObj.z === 7);
console.log('\n\n\nDont worry, the warning about setting a function to a property should appear. ' +
  'If it doesnt then something is wrong. \n\n');
boundedObj.z = function() {return 'Yes, it was a property before';}
var zfunction = boundedObj.z;
assert(zfunction() === 'Yes, it was a property before');

// test not binding when adding a watch if already bounded
var x_bounded_again = false;
var cb_called = false;
boundedObj.watch('x', function(new_x) {
  cb_called = true;
});
assert(cb_called === true);

// test bound is false when adding a watch to an unbounded var
var a_bounded = false;
var cb_called = false;
boundedObj.watch('a', function(new_x, bound) {
  cb_called = true;
});
assert(cb_called === true);

// test second call to watch gives 'false' as bound to cb
cb_called = false;
boundedObj.watch('a', function(new_x, bound) {
  cb_called = true;
});
assert(cb_called === true);

// verify that `this` is bound properly in `watch`
boundedObj.foo = 5;
var expected = [5,55];
var number_foo_watch_called = 0;
boundedObj.watch('foo', function() {
  assert(this.foo, expected.shift());
  number_foo_watch_called++;
});
assert(number_foo_watch_called === 1);
boundedObj.foo = 55;
assert(number_foo_watch_called === 2);

// test the freezer behavior
var i = 0;
boundedObj.shoo = bind(boundedObj, 'shoo', function () { return ++i; });
assert(boundedObj.shoo === 1);
assert(boundedObj.shoo === 2);

// add the freezer object and see that the value if freezed
boundedObj.$freeze = {};
assert(boundedObj.shoo === 3);
assert(boundedObj.shoo === 3);
assert(boundedObj.shoo === 3);

// remove the freezer object and see that the value is unfreezed
delete boundedObj.$freeze
assert(boundedObj.shoo === 4);
assert(boundedObj.shoo === 5);

// ----

function bench(obj, prop) {
  console.time(prop);
  for (var i = 0; i < 10000000; ++i) {
    obj[prop];
  }
  console.timeEnd(prop);
}