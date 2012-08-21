var assert = require('assert');
var bind = require('..').bind;

var EventEmitter = require('..').events.EventEmitter;

// play around with some usage options

// create a 'bind promise' and assign it in the object literal later.
var foobind_promise = bind(function() { return 'hello' });

var obj = bind({
  x: 5,
  y: 10,
  foo: foobind_promise,
  goo: function() { return 'goo'; },
  yoo: bind(function() { return 15; }),
  noo: bind(function() { return 20; }),
});

assert(obj.foo, 'hello');

// this will not work because `xoo` is not bound.
obj.xoo = foobind_promise;
assert(obj.xoo.$bind);

function watch_callback(name, result) {
  return function(curr, prev, prop, is_bound) {
    console.log(name, 'called with curr=' + curr, 'and prev=' + prev);
    result.called = result.called || [];
    result.called.push({
      self: this,
      curr: curr,
      prev: prev,
      prop: prop,
      is_bound: is_bound
    });
  }
}

var watch_x = {};
obj.watch('x', watch_callback('watch_x', watch_x));

bind.tick();

assert(watch_x.called.length === 1);
assert.equal(watch_x.called[0].curr, 5);

// set up a watch on `foo` and verify that it receives notifications on bind
var watch_foo_1 = {};
obj.watch('foo', watch_callback('watch_foo_1', watch_foo_1));

bind.tick();
assert(watch_foo_1.called);
assert.equal(watch_foo_1.called.length, 1);
assert.equal(watch_foo_1.called[0].self, obj);
assert.equal(watch_foo_1.called[0].curr, 'hello');
assert.equal(watch_foo_1.called[0].prev, undefined);
assert.equal(watch_foo_1.called[0].prop, 'foo');
assert.equal(watch_foo_1.called[0].is_bound, true);

// add another watch on the same property
var watch_foo_2 = {};
obj.watch('foo', watch_callback('watch_foo_2', watch_foo_2));
bind.tick();
assert.equal(watch_foo_1.called.length, 1); // only foo_2 should have been called, so foo_1 is expected to still be 1
assert.equal(watch_foo_2.called.length, 1);
assert.equal(watch_foo_2.called[0].curr, 'hello');
assert.equal(watch_foo_2.called[0].prev, undefined);
assert.equal(watch_foo_2.called[0].prop, 'foo');
assert.equal(watch_foo_2.called[0].is_bound, true);

// bind to a function that changes values.
var i = 788;
obj.bind('foo', function() { return i++; });
bind.tick();

// nobody retrieved `foo`s value, so no watchers are notified
assert.equal(watch_foo_1.called.length, 1);
assert.equal(watch_foo_2.called.length, 1);

// now consume `foo` 3 times and expect all watchers to be notified
obj.foo;
obj.foo;
obj.foo;
assert.equal(watch_foo_1.called.length, 1); // no change before tick
assert.equal(watch_foo_2.called.length, 1);
bind.tick();
assert.equal(watch_foo_1.called.length, 4);
assert.equal(watch_foo_2.called.length, 4);

// now add another watcher and since `foo` changes it's value, expect all watchers to be notified
var watch_foo_3 = {};
obj.watch('foo', watch_callback('watch_foo_3', watch_foo_3));
assert.equal(watch_foo_1.called.length, 4);
assert.equal(watch_foo_2.called.length, 4);
assert(!watch_foo_3.called); // no callback before tick
bind.tick();
assert.equal(watch_foo_1.called.length, 5);
assert.equal(watch_foo_2.called.length, 5);
assert.equal(watch_foo_3.called.length, 1);

// foo remains a property after assigning it with literals
obj.foo = 89;
bind.tick();
assert(obj.foo === 89);
assert.equal(watch_foo_1.called.length, 6);
assert.equal(watch_foo_2.called.length, 6);
assert.equal(watch_foo_3.called.length, 2);
obj.foo = 90;
assert.equal(watch_foo_1.called.length, 6);
assert.equal(watch_foo_1.called[0].self, obj);
assert.equal(watch_foo_2.called.length, 6);
assert.equal(watch_foo_3.called.length, 2);
bind.tick();
assert.equal(watch_foo_1.called.length, 7);
assert.equal(watch_foo_2.called.length, 7);
assert.equal(watch_foo_3.called.length, 3);

// bind foo back to a function and make sure it continues to behave
obj.bind('foo', function() { return 27; });
bind.tick();
assert.equal(watch_foo_1.called.length, 7);
assert.equal(watch_foo_2.called.length, 7);
assert.equal(watch_foo_3.called.length, 3);
assert.equal(obj.foo, 27); // read obj.foo and expect all watchers to be notified
bind.tick();
assert.equal(watch_foo_1.called.length, 8);
assert.equal(watch_foo_1.called[0].self, obj);
assert.equal(watch_foo_2.called.length, 8);
assert.equal(watch_foo_3.called.length, 4);

// bind without assignment. should work
obj.bind('hello', function() { return 'world'; });
assert(obj.hello === 'world');

// reassign a value to a bound property - should convert to a value
obj.hello = 99;
assert(obj.hello === 99);

// watch a literal
var zoo_changed = {};
obj.watch('zoo', watch_callback('zoo_changed', zoo_changed));
bind.tick();
assert(zoo_changed.called);
assert.equal(zoo_changed.called.length, 1);
assert.equal(zoo_changed.called[0].curr, undefined);
assert.equal(zoo_changed.called[0].prev, undefined);
obj.zoo = 5;
bind.tick();
assert.equal(zoo_changed.called.length, 2);
assert.equal(zoo_changed.called[1].curr, 5);
assert.equal(zoo_changed.called[1].prev, undefined);

// setting to the same value => cb isn't called
obj.zoo = 5;
bind.tick();
assert.equal(zoo_changed.called.length, 2);
obj.bind('zoo', function() { return 5; });
bind.tick();
assert.equal(obj.zoo, 5);
assert.equal(zoo_changed.called.length, 2);
obj.bind('zoo', function() { return 5; });
bind.tick();
assert.equal(obj.zoo, 5);
assert.equal(zoo_changed.called.length, 2);

// assign a function to zoo. treated as a literal.
obj.zoo = function() { return 'this-is-a-function' };
assert.equal(obj.zoo(), 'this-is-a-function');
assert.equal(zoo_changed.called.length, 2);
bind.tick();
assert.equal(zoo_changed.called.length, 3);
assert.equal(zoo_changed.called[2].curr(), 'this-is-a-function');

// try to bind to an object which is not a function (not possible)
var error;
try { obj.bind('ooo', 5); }
catch(e) { error = true; }
assert(error);

// verify that `is_bound` is false when a watch is called on a literal change
var poo_watch = {};
obj.poo = 4;
obj.watch('poo', watch_callback('poo_watch', poo_watch));
bind.tick();
assert(poo_watch.called);
assert.equal(poo_watch.called.length, 1);
assert.equal(poo_watch.called[0].curr, 4);
assert.equal(poo_watch.called[0].prev, undefined);
assert.equal(poo_watch.called[0].is_bound, false);

// verify that `is_bound` is also false when adding a watch to a non-existing field
var pookoo_watch = {};
var pookoo_watch_cb = watch_callback('pookoo_watch', pookoo_watch);
obj.watch('pookoo', pookoo_watch_cb);
bind.tick();
assert(pookoo_watch.called);
assert.equal(pookoo_watch.called.length, 1);
assert.equal(pookoo_watch.called[0].curr, undefined);
assert.equal(pookoo_watch.called[0].prev, undefined);
assert.equal(pookoo_watch.called[0].is_bound, false);

// unwatch and make sure we don't get any calls
obj.pookoo = 88;
bind.tick();
assert.equal(pookoo_watch.called.length, 2);
obj.unwatch('pookoo', pookoo_watch_cb);
obj.pookoo = 89;
bind.tick();
assert.equal(pookoo_watch.called.length, 2);

// verify that watch callbacks are called in the right order
var p_values = [];

obj.p = 4;

obj.watch('p', function(p) {
  p_values.push(p);
});

bind.tick();
obj.p = 5;
assert.equal(p_values[0], 4);

bind.tick();
assert.equal(p_values[0], 4);
assert.equal(p_values[1], 5);

// -- delete this after the $motherfucker marker is no longer needed to detect misuse of `bind`.

// assign the result of bind back to `foo`. should work
obj.foo = bind(obj, 'foo', function() { return 88 });


//--------------------------------------------------------------------------------------
return;


// test the freezer behavior
var i = 0;
boundedObj.shoo = bind(boundedObj, 'shoo', function () { return ++i; });
bind.tick();
assert(boundedObj.shoo === 1);
bind.tick();
assert(boundedObj.shoo === 2);

// add the freezer object and see that the value if freezed
bind.tick();
assert(boundedObj.shoo === 3);
assert(boundedObj.shoo === 3);
assert(boundedObj.shoo === 3);

// remove the freezer object and see that the value is unfreezed
bind.tick();
assert(boundedObj.shoo === 4);
bind.tick();
assert(boundedObj.shoo === 5);

/*
 
     ********        *********
     ********        *********
     ********        *********
     ********        *********


             ********
             ********
             ********
             ********
             ********
             ********
     

    *******                  ******
    *******                  ******
    *******                  ******
    *******                  ******
    *******                  ******
    *******                  ******
    *******************************
    *******************************
    *******************************
    *******************************



*/



/**:-)****/


