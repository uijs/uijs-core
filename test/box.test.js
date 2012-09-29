// some basic tests for Box
var assert = require('assert');
var bind = require('../lib/bind');
var uijs = require('..');

var Box = uijs.Box; // ctor
var box = uijs.box; // factory function

var b1 = new Box();
var b2 = new Box({ foo: 111 });
var b3 = box({ width: 55 });

assert.equal(b3.width, 55);

// verify `set` and bind
assert.equal(b2.foo, 111);

b2.set({
  goo: 444,
  foo: 'hello',
  yoo: function() { return 'yoo...'; },
  zoo: bind(function() { return 'zoo!' }),
});

b3.set({
  goo: bind(function() { return 555 }),
});

assert.equal(b2.goo, 444);
assert.equal(b2.foo, 'hello');
assert.equal(b2.yoo(), 'yoo...');
assert.equal(b2.zoo, 'zoo!');
assert.equal(b3.goo, 555);

// events

var b1_called;
var b2_called;

b1.on('hello', function(a) { b1_called = true; });
b2.on('hello', function(a) { b2_called = true; })
b1.emit('hello', 123);

assert(b1_called);
assert(!b2_called);


// derivation

function Control(options) {
  Box.call(this);

  this.foo = 1234;

  return this.set(options);
}

var control = Control.prototype = new Box();

control.doo = function() {
  return this.foo * 2;
};

var mycontrol = new Control({ foo: 5555 });
mycontrol.goo = 12;
assert.equal(mycontrol.foo, 5555);

bind.tick();

var yourcontrol = new Control({
  foo: bind(function() { return mycontrol.goo + '.' + this.goo }),
  goo: bind(function() { return 66 }),
});

bind.tick();
assert.equal(yourcontrol.foo, '12.66');
assert.equal(mycontrol.foo, 5555);

// extension

Box.prototype.extension = function() { return 222333 };
Box.prototype.foo = 6565;

var b4 = new Box();

assert.equal(b1.extension(), 222333);
assert.equal(b2.extension(), 222333);
assert.equal(b4.extension(), 222333);
assert.equal(b1.foo, 6565);
assert.equal(b2.foo, 'hello'); // because b2 have `foo` on the object itself
assert.equal(b4.foo, 6565);