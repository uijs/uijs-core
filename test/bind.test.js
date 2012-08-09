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


// set up a watch on `foo` which receibes notifications on bind

var foo_changed = -1;
var foo_changed_bound = null;
var number_foo_watch_called = 0;
obj.watch('foo', function(new_foo, bound) {
  foo_changed = new_foo;
  foo_changed_bound = bound;
  number_foo_watch_called++;
}, true);

assert(number_foo_watch_called === 1);
assert(foo_changed == 'hello');
assert(foo_changed_bound === false);

// assign the result of bind back to `foo`. should work
obj.foo = bind(obj, 'foo', function() { return 88 });

assert(number_foo_watch_called === 2);
assert(typeof foo_changed === 'function');
assert(foo_changed_bound === true);

assert(obj.foo === 88);

// foo remains a property adter assigning it with literals
obj.foo = 89;

assert(number_foo_watch_called === 3);
assert(typeof foo_changed === 'number');
assert(foo_changed_bound === false);

assert(obj.foo === 89);

obj.foo = 90;

assert(number_foo_watch_called === 4);
assert(typeof foo_changed === 'number');
assert(foo_changed_bound === false);

assert(obj.foo === 90);

// set up a watch on `noo` which doesn't receive notifications on bind explicitely

var noo_changed = -1;
var noo_changed_bound = null;
var number_noo_watch_called = 0;
obj.watch('noo', function(new_noo, bound) {
  noo_changed = new_noo;
  noo_changed_bound = bound;
  number_noo_watch_called++;
}, false);

assert(number_noo_watch_called === 1);
assert(noo_changed === 20);
assert(noo_changed_bound === false);

obj.noo = bind(obj, 'noo', function() { return 27 });

assert(number_noo_watch_called === 1);
assert(obj.noo === 27);

// noo remains a property adter assigning it with literals
obj.noo = 28;

assert(number_noo_watch_called === 2);
assert(typeof noo_changed === 'number');
assert(noo_changed_bound === false);

assert(obj.noo === 28);

obj.noo = 29;

assert(number_noo_watch_called === 3);
assert(typeof noo_changed === 'number');
assert(noo_changed_bound === false);

assert(obj.noo === 29);

// set up a watch on `yoo` which doesn't receive notifications on bind eemplicitely

var yoo_changed = -1;
var yoo_changed_bound = null;
var number_yoo_watch_called = 0;
obj.watch('yoo', function(new_yoo, bound) {
  yoo_changed = new_yoo;
  yoo_changed_bound = bound;
  number_yoo_watch_called++;
});

assert(number_yoo_watch_called === 1);
assert(yoo_changed === 15);
assert(yoo_changed_bound === false);

obj.yoo = bind(obj, 'yoo', function() { return 17 });

assert(number_yoo_watch_called === 1);
assert(obj.yoo === 17);

// noo remains a property adter assigning it with literals
obj.yoo = 18;

assert(number_yoo_watch_called === 2);
assert(typeof yoo_changed === 'number');
assert(yoo_changed_bound === false);

assert(obj.yoo === 18);

obj.yoo = 19;

assert(number_yoo_watch_called === 3);
assert(typeof yoo_changed === 'number');
assert(yoo_changed_bound === false);

assert(obj.yoo === 19);

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
obj.watch('koo', function(newval) { koo_changed = newval; }, true);
obj.koo = 777;
assert(obj.koo === 777);
assert(koo_changed === 777);
obj.koo = 444;
assert(koo_changed === 444);
bind(obj, 'koo', function() { return 'yeah!' });
assert(typeof koo_changed === 'function');
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

assert(obj2.x.$bind.fn);
assert(!obj2.x.$bind.emit);
assert(obj2.y.$bind.fn);
assert(obj2.y.$bind.emit);

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
boundedObj.watch('x', function(new_x, bound) {
  x_bounded_again = bound;
  cb_called = true;
});
assert(x_bounded_again === false);
assert(cb_called === true);

// test bound is false when adding a watch to an unbounded var
var a_bounded = false;
var cb_called = false;
boundedObj.watch('a', function(new_x, bound) {
  a_bounded = bound;
  cb_called = true;
});
assert(a_bounded === false);
assert(cb_called === true);

// test second call to watch gives 'false' as bound to cb
cb_called = false;
boundedObj.watch('a', function(new_x, bound) {
  a_bounded = bound;
  cb_called = true;
});
assert(a_bounded === false);
assert(cb_called === true);

// ----

function bench(obj, prop) {
  console.time(prop);
  for (var i = 0; i < 10000000; ++i) {
    obj[prop];
  }
  console.timeEnd(prop);
}