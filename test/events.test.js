var assert = require('assert');
var uijs = require('..');
var EventEmitter = uijs.events.EventEmitter;

var mybox = new EventEmitter();

var queue = [];

function handler1(a, b) { queue.push({ handler: 1, args: [a, b], }); }
function handler2(a, b) { queue.push({ handler: 2, args: [ a, b ] }); }

// on/emit

mybox.on('E1', handler1);
mybox.on('E1', handler2);
mybox.on('E2', handler2);

mybox.emit('E1', 10, 20);
mybox.emit('E2', 20, 30);

assert.deepEqual(queue, [ 
  { handler: 1, args: [ 10, 20 ] },
  { handler: 2, args: [ 10, 20 ] },
  { handler: 2, args: [ 20, 30 ] } 
]);

queue = [];

// box.removeListener(event, fn)

mybox.removeListener('E1', handler1);
mybox.off('E2', handler1); // do nothing
mybox.off('E2', handler2);

mybox.emit('E1', 99, 88);
mybox.emit('E2', 77, 66);

assert.deepEqual(queue, [ 
  { handler: 2, args: [ 99, 88 ] },
]);

queue = [];

mybox.on('E2', handler1);
mybox.emit('E2', 77, 66);

assert.deepEqual(queue, [ 
  { handler: 1, args: [ 77, 66 ] } 
]);

queue = [];

// box.removeAllListeners(event)
mybox.removeAllListeners('E2');
mybox.emit('E2', 77, 66);
assert.deepEqual(queue, []);

// forward

var ee2 = new EventEmitter();

// forward all events from `mybox` to `ee2`.
mybox.forward(ee2);

var x_emitted = 0;

ee2.on('x', function(val) {
  assert.equal(val, 1234);
  x_emitted++;
});

mybox.emit('x', 1234);
mybox.emit('y');

assert.equal(x_emitted, 1);

mybox.unforward(ee2);
mybox.emit('x', 1234);

assert.equal(x_emitted, 1); // expect x_emitted to stay 1 because of the unforward