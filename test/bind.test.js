var assert = require('assert');
var bind = require('..').bind;
var debug = false;

var EventEmitter = require('..').events.EventEmitter;

//TODO: Add a test for having a watch callback touching the getter whose change triggered the cb and see that we dont have an endless loop
// of getter -> cb -> getter -> cb ... Check both for sync and async watchers 

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
var foo_value = 788;
obj.bind('foo', function() { return foo_value; });
bind.tick();

// nobody retrieved `foo`s value, so no watchers are notified
assert.equal(watch_foo_1.called.length, 1);
assert.equal(watch_foo_2.called.length, 1);

// now consume `foo` 3 times and expect all watchers to be notified
foo_value++; obj.foo;
foo_value++; obj.foo;
assert.equal(watch_foo_1.called.length, 1); // no change before tick
assert.equal(watch_foo_2.called.length, 1);
bind.tick();
assert.equal(watch_foo_1.called.length, 2);
assert.equal(watch_foo_2.called.length, 2);

// since we did not consume obj.foo, no notifications are expected in this tick
bind.tick();
assert.equal(watch_foo_1.called.length, 2);
assert.equal(watch_foo_2.called.length, 2);

// now add another watcher and since `foo` changes it's value on every `get`
// we expect all watchers to be notified on the subsequent tick
var watch_foo_3 = {};
obj.watch('foo', watch_callback('watch_foo_3', watch_foo_3));
assert.equal(watch_foo_1.called.length, 2);
assert.equal(watch_foo_2.called.length, 2);
assert(!watch_foo_3.called); // no callback before tick
bind.tick();
assert.equal(watch_foo_1.called.length, 2); // notification triggered only on next-tick
assert.equal(watch_foo_2.called.length, 2); // notification triggered only on next-tick
assert.equal(watch_foo_3.called.length, 1);
bind.tick();
assert.equal(watch_foo_1.called.length, 3);
assert.equal(watch_foo_2.called.length, 3);
assert.equal(watch_foo_3.called.length, 1);

// foo remains a property after assigning it with literals
bind.tick();
obj.foo = 89;
bind.tick();
assert(obj.foo === 89);
assert.equal(watch_foo_1.called.length, 4);
assert.equal(watch_foo_2.called.length, 4);
assert.equal(watch_foo_3.called.length, 2);
obj.foo = 90;
assert.equal(watch_foo_1.called.length, 4);
assert.equal(watch_foo_1.called[0].self, obj);
assert.equal(watch_foo_2.called.length, 4);
assert.equal(watch_foo_3.called.length, 2);
bind.tick();
assert.equal(watch_foo_1.called.length, 5);
assert.equal(watch_foo_2.called.length, 5);
assert.equal(watch_foo_3.called.length, 3);

// bind foo back to a function and make sure it continues to behave
obj.bind('foo', function() { return 27; });
bind.tick();
assert.equal(watch_foo_1.called.length, 5);
assert.equal(watch_foo_2.called.length, 5);
assert.equal(watch_foo_3.called.length, 3);
assert.equal(obj.foo, 27); // read obj.foo and expect all watchers to be notified
bind.tick();
assert.equal(watch_foo_1.called.length, 6);
assert.equal(watch_foo_1.called[0].self, obj);
assert.equal(watch_foo_2.called.length, 6);
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
assert.equal(zoo_changed.called[1].curr_on_obj, 5);
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
assert.equal(poo_watch.called[0].curr_on_obj, 4);
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

// changing value of a watched literal doesn't cause the watch cb to be called untill tick,
// and when it does - then we get undefined --> new val
// freezing
var shoo_watch = {};
obj.shoo = 5;
obj.watch('shoo', watch_callback('shoo_watch', shoo_watch));
assert.equal(obj.shoo, 5);
assert(!shoo_watch.called);
obj.shoo = 6;
assert.equal(obj.shoo, 6);
assert(!shoo_watch.called);
bind.tick();
assert(shoo_watch.called);
assert.equal(shoo_watch.called.length, 1);
assert.equal(shoo_watch.called[0].curr, 6);
assert.equal(shoo_watch.called[0].prev, undefined);

var shoo2_watch = {};
obj.shoo2 = 5;
obj.watch('shoo2', watch_callback('shoo2_watch', shoo2_watch));
assert.equal(obj.shoo2, 5);
assert(!shoo2_watch.called);
bind.tick();
assert(shoo2_watch.called);
assert.equal(shoo2_watch.called.length, 1);
assert.equal(shoo2_watch.called[0].curr, 5);
assert.equal(shoo2_watch.called[0].prev, undefined);

// freezing

// since values are frozen between ticks, we expect a bound field not to change unless a tick happened
var fr = 0;
var froo_watch = {};
obj.bind('froo', function() { return fr++; });
obj.watch('froo', watch_callback('froo_watch', froo_watch));
assert.equal(obj.froo, 0);
assert.equal(obj.froo, 0);
assert.equal(obj.froo, 0);
assert.equal(obj.froo, 0);
assert.equal(obj.froo, 0);
bind.tick();
assert.equal(obj.froo, 1);
assert.equal(obj.froo, 1);
assert.equal(obj.froo, 1);
assert.equal(obj.froo, 1);
assert.equal(obj.froo, 1);
assert.equal(froo_watch.called.length, 1);
assert.equal(froo_watch.called[0].curr, 0);
assert.equal(froo_watch.called[0].prev, undefined);
bind.tick();
assert.equal(froo_watch.called.length, 2);
assert.equal(froo_watch.called[1].curr, 1);
assert.equal(froo_watch.called[1].prev, 0);

// literals can change without a tick (still, watcher will not be notified)
obj.fraa = 6;
assert.equal(obj.fraa, 6);
assert.equal(froo_watch.called.length, 2);
obj.fraa = 7;
assert.equal(obj.fraa, 7);
assert.equal(froo_watch.called.length, 2);
bind.tick();
assert.equal(obj.fraa, 7);
assert.equal(froo_watch.called.length, 2);
obj.fraa = 8;
assert.equal(obj.fraa, 8);
assert.equal(froo_watch.called.length, 2);

// test not watched, but bound scenario
var fnoo = 0;
obj.bind('fnoo', function() { return fnoo; });
assert.equal(obj.fnoo, 0);
fnoo = 1;
assert.equal(obj.fnoo, 0);
bind.tick();
assert.equal(obj.fnoo, 1);
assert.equal(obj.fnoo, 1);
fnoo = 2;
bind.tick();
assert.equal(obj.fnoo, 2);
assert.equal(obj.fnoo, 2);

// synchronous watch: a special case of watch that calls the callback
// on the same tick instead of the next tick. this can be used for state mutations.
var joo_watch = {};
obj.joo = 5;
obj.watch('joo', watch_callback('joo_watch', joo_watch), true);
assert(joo_watch.called);
assert(joo_watch.called.length === 1);
assert.equal(joo_watch.called[0].curr, 5);
assert.equal(joo_watch.called[0].prev, undefined);
assert.equal(joo_watch.called[0].prop, 'joo');
assert.equal(joo_watch.called[0].is_bound, false);
obj.joo = 10;
assert(joo_watch.called.length === 2); // callback called with no tick
assert.equal(joo_watch.called[1].curr, 10);

// synchronous watch when bound to function
var yoo_watch = {};
obj.bind('yoo', function() { return obj.joo; });
obj.watch('yoo', watch_callback('yoo_watch', yoo_watch), true);
assert(yoo_watch.called);
assert.equal(yoo_watch.called.length, 1);
assert.equal(yoo_watch.called[0].curr, obj.joo);
assert.equal(yoo_watch.called[0].prev, undefined);
assert.equal(yoo_watch.called[0].is_bound, true);
obj.joo = 999;
assert.equal(obj.yoo, 10); // before tick value is frozen
assert.equal(yoo_watch.called.length, 1);
bind.tick(); // let new value propagate
assert.equal(obj.yoo, 999); // consume `yoo`, sync watch should be called without a tick
assert.equal(yoo_watch.called.length, 2);
assert.equal(yoo_watch.called[1].curr, obj.joo);
assert.equal(yoo_watch.called[1].prev, 10);

// if a watch callback triggers a notification, it should be called only on the next tick
var voo_1_watch = {};
var voo_2_watch = {};
obj.voo_1 = 10;
obj.voo_2 = 55;
obj.watch('voo_1', watch_callback('voo_1_watch', voo_1_watch));
obj.watch('voo', function() {
  this.voo_1++; // since we have a watch on voo_1, this triggers a notification
});
bind.tick();
assert.equal(voo_1_watch.called.length, 1); // first for the initial watch...
bind.tick();
assert.equal(voo_1_watch.called.length, 2); // ..second for the `++`.

// allow calling bind() with $bind
var bindings = bind(function() { return 'your the man'; });
obj.bind('zoko', bindings);
assert.equal(obj.zoko, 'your the man');

return;

// -- delete this after the $motherfucker marker is no longer needed to detect misuse of `bind`.

// assign the result of bind back to `foo`. should work
obj.foo = bind(obj, 'foo', function() { return 88 });




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



// -- helpers

function watch_callback(name, result) {
  result.toString = function() {
    if (!this.called) return '<not called>';
    else {
      var s = '';
      this.called.forEach(function(invoke) {
        s += invoke.prop + ': ' + invoke.prev + ' ==> ' + invoke.curr + '\n';
      });
      return s;
    }
  };
  return function(curr, prev, prop, is_bound) {
    if (debug) console.log(name, 'called with curr=' + curr, 'and prev=' + prev);
    result.called = result.called || [];
    result.called.push({
      self: this,
      curr: curr,
      curr_on_obj: this[prop],
      prev: prev,
      prop: prop,
      is_bound: is_bound
    });
  }
}