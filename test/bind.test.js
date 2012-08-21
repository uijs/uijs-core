var assert = require('assert');
var bind = require('..').bind;
var EventEmitter = require('..').events.EventEmitter;

var autobind = bind.autobind;

// we turn the `nexttick` function to synchronous so that it will easier to test
bind.nexttick(function(cb) {
    return cb();
});

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
var number_foo_watch_state_called = 0;
var btf;
var btf2
var prp;
var prp2
obj.watch('foo', function(new_foo, prop, bound_to_function) {
  foo_changed = new_foo;
  number_foo_watch_called++;
  btf = bound_to_function;
  prp = prop;
}, function(prop, bound_to_function){
  number_foo_watch_state_called++;
  btf2 = bound_to_function;
  prp2 = prop;
});

assert(btf === true);
assert(prp === 'foo');
assert(number_foo_watch_called === 1);
assert(btf2 === true);
assert(prp2 === 'foo');
assert(number_foo_watch_state_called === 1);

// assign the result of bind back to `foo`. should work
obj.foo = bind(obj, 'foo', function() { return 88 });

assert(number_foo_watch_called === 2);
assert(obj.foo === 88);
assert(btf === true);
assert(prp === 'foo');
assert(number_foo_watch_state_called === 1);

// foo remains a property adter assigning it with literals
obj.foo = 89;

assert(number_foo_watch_called === 3);
assert(obj.foo === 89);
assert(btf === false);
assert(prp === 'foo');
assert(btf2 === false);
assert(prp2 === 'foo');
assert(number_foo_watch_state_called === 2);

obj.foo = 90;

assert(number_foo_watch_called === 4);
assert(obj.foo === 90);
assert(btf === false);
assert(prp === 'foo');
assert(number_foo_watch_state_called === 2);

// set up a watch on `noo` which is already bound to a function

var noo_changed = -1;
var number_noo_watch_called = 0;
var number_noo_watch_state_called = 0;
obj.watch('noo', function(new_noo, prop, bound_to_function) {
  noo_changed = new_noo;
  number_noo_watch_called++;
  btf = bound_to_function;
  prp = prop;
}, function(prop, bound_to_function){
  number_noo_watch_state_called++;
  btf2 = bound_to_function;
  prp2 = prop;
});

assert(number_noo_watch_called === 1);
assert(noo_changed === 20);
assert(btf === true);
assert(prp === 'noo');
assert(number_noo_watch_state_called === 1);
assert(btf2 === true);
assert(prp2 === 'noo');

// noo remains a property adter assigning it with literals
obj.noo = 28;

assert(number_noo_watch_called === 2);
assert(obj.noo === 28);
assert(btf === false);
assert(prp === 'noo');
assert(number_noo_watch_state_called === 2);
assert(btf2 === false);
assert(prp2 === 'noo');

obj.noo = 29;

assert(number_noo_watch_called === 3);
assert(obj.noo === 29);
assert(btf === false);
assert(prp === 'noo');
assert(number_noo_watch_state_called === 2);

// noo watch continues to behave after binding it back to a function
obj.noo = bind(obj, 'noo', function() { return 27 });

assert(number_noo_watch_called === 4);
assert(obj.noo === 27);
assert(btf === true);
assert(prp === 'noo');
assert(number_noo_watch_state_called === 3);
assert(btf2 === true);
assert(prp2 === 'noo');

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
var number_koo_watch_called = 0;
var number_koo_watch_state_called = 0;
obj.watch('koo', function(newval, prop, bound_to_function) { 
  number_koo_watch_called++;
  koo_changed = newval; 
  btf = bound_to_function;
  prp = prop;
}, function(prop, bound_to_function){
  number_koo_watch_state_called++;
  btf2 = bound_to_function;
  prp2 = prop;
});

assert(number_koo_watch_called === 1);
assert(btf === false);
assert(prp === 'koo');
assert(koo_changed === 8989);
assert(number_koo_watch_state_called === 1);
assert(btf2 === false);
assert(prp2 === 'koo');

assert(obj.koo === 8989);
assert(number_koo_watch_called === 1);
assert(number_koo_watch_state_called === 1);

obj.koo = 777;
assert(number_koo_watch_called === 2);
assert(obj.koo === 777);
assert(btf === false);
assert(prp === 'koo');
assert(koo_changed === 777);
assert(number_koo_watch_state_called === 1);

obj.koo = 444;
assert(koo_changed === 444);
assert(btf === false);
assert(prp === 'koo');
assert(number_koo_watch_called === 3);
assert(number_koo_watch_state_called === 1);

// setting to the same value => cb isn't called
obj.koo = 444;
assert(number_koo_watch_called === 3);
assert(number_koo_watch_state_called === 1);

// binding to function
bind(obj, 'koo', function() { return 'yeah!' });
assert(number_koo_watch_called === 4);
assert(koo_changed === 'yeah!');
assert(btf === true);
assert(prp === 'koo');
assert(number_koo_watch_state_called === 2);
assert(btf2 === true);
assert(prp2 === 'koo');

// binding to function which returns the same value - no cb called
bind(obj, 'koo', function() { return 'yeah!' });
console.log(number_koo_watch_called);
assert(number_koo_watch_called === 4);
assert(koo_changed === 'yeah!');
assert(number_koo_watch_state_called === 2);
assert(obj.koo === 'yeah!');
assert(number_koo_watch_called === 4);
assert(number_koo_watch_state_called === 2);

// binding to different function - only 1st cb called
bind(obj, 'koo', function() { return 'yeah2!' });
assert(number_koo_watch_called === 5);
assert(koo_changed === 'yeah2!');
assert(btf === true);
assert(prp === 'koo');
assert(number_koo_watch_state_called === 2);
assert(obj.koo === 'yeah2!');
assert(number_koo_watch_called === 5);
assert(number_koo_watch_state_called === 2);

// check assignment of a function - a warning should apear in the console, but the operation should succeed
console.log('\nDont worry, the warning about setting a function to a property should appear. ' +
  'If it doesnt then something is wrong. \n\n');
obj.koo = 4;
assert(number_koo_watch_called === 6);
assert(koo_changed === 4);
assert(btf === false);
assert(prp === 'koo');
assert(number_koo_watch_state_called === 3);
assert(btf2 === false);
assert(prp2 === 'koo');

assert(obj.koo === 4);
assert(number_koo_watch_called === 6);
assert(number_koo_watch_state_called === 3);

obj.koo = function() { return 'succeeded'; };
assert(typeof koo_changed === 'function');
assert(btf === false);
assert(prp === 'koo');
assert(number_koo_watch_called === 7);
assert(number_koo_watch_state_called === 3);
assert(koo_changed() === 'succeeded');
var koofunction = obj.koo;
assert(number_koo_watch_called === 7);
assert(number_koo_watch_state_called === 3);
assert(koofunction() === 'succeeded');
assert(number_koo_watch_called === 7);
assert(number_koo_watch_state_called === 3);

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

// test bound is false when adding a watch to a non existing var
var a_bounded = false;
var number_a_watch_called = 0;
var number_a_watch_state_called = 0;
var cb_called = false;
var cb2_called = false;
boundedObj.watch('a', function(new_x, prop, bound_to_function) {
  number_a_watch_called++;
  btf = bound_to_function;
  prp = prop;
}, function(prop, bound_to_function) {
  number_a_watch_state_called++;
  btf2 = bound_to_function;
  prp2 = prop;
});
assert(number_a_watch_called === 1);
assert(btf === false);
assert(prp === 'a');
assert(number_a_watch_state_called === 1);
assert(btf === false);
assert(prp === 'a');

// test second call to watch
var number_a_watch_called_2 = 0;
var number_a_watch_state_called_2 = 0;
var btf;
var btf2;
var btf_2;
var btf2_2;
boundedObj.watch('a', function(new_x, prop, bound_to_function) {
  number_a_watch_called_2++;
  btf_2 = bound_to_function;
  prp_2 = prop;
}, function(prop, bound_to_function) {
  number_a_watch_state_called_2++;
  btf2_2 = bound_to_function;
  prp2_2 = prop;
});
assert(number_a_watch_called === 1);
assert(number_a_watch_called_2 === 1);
assert(btf_2 === false);
assert(prp_2 === 'a');
assert(number_a_watch_state_called === 1);
assert(btf2_2 === false);
assert(prp2_2 === 'a');
assert(number_a_watch_state_called_2 === 1);

//TODO: Add unwatch test here

// verify that `this` is bound properly in `watch`
boundedObj.foo = 5;
var expected = [5,55];
var number_foo_watch_called = 0;
var number_foo_watch_state_called = 0;
boundedObj.watch('foo', function(newval, prop, bound_to_function) {
  assert(this.foo, expected.shift());
  number_foo_watch_called++;
  btf = bound_to_function;
  prp = prop;
}, function(prop, bound_to_function) {
  number_foo_watch_state_called++;
  btf2 = bound_to_function;
  prp2 = prop;
});
assert(btf === false);
assert(prp === 'foo');
assert(number_foo_watch_called === 1);
assert(btf2 === false);
assert(prp2 === 'foo');
assert(number_foo_watch_state_called === 1);
boundedObj.foo = 55;
assert(btf === false);
assert(prp === 'foo');
assert(number_foo_watch_called === 2);
assert(number_foo_watch_state_called === 1);

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
