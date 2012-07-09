var assert = require('assert');
var uijs = require('..');
var box = uijs.box;

var mybox = box();

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
