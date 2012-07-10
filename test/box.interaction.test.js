var assert = require('assert');
var uijs = require('..');
var box = uijs.box;

var queue = [];

// a box that keeps track of all the events it received
function polish_box(options) {
  var obj = box(options);

  obj.on('E1', function(pt) {
    queue.push({
      id: obj.id,
      pt: pt,
    });
  });

  return obj;
}

var app = polish_box({
  id: '#root',
  x: 5,
  y: 5,
  width: 100,
  height: 100,
  interaction: true,   // capture interaction events altogther
  autopropagate: true, // propagate interaction events to child boxes
});

var child1 = app.add(polish_box({
  id: '#child1',
  x: 10,
  y: 10,
  width: 50,
  height: 50,
  interaction: true
}));

var child3 = app.add(polish_box({
  id: '#child3',
  x: 30,
  y: 30,
  width: 80,
  height: 80,
  interaction: false, // events will not be captured (passthrough to child2)
}));

var child2 = app.add(polish_box({
  id: '#child2',
  x: 10,
  y: 70,
  width: 50,
  height: 50,
  interaction: true,    // events will be captured
  autopropagate: false, // events will not be propagated to children
}));

var grandchild = child2.add(polish_box({
  id: '#grandchild',
  x: 10,
  y: 10,
  width: 10,
  height: 50,
  interaction: true,
}));

// box.screen()
assert.deepEqual(app.screen(), { x: 5, y: 5 });
assert.deepEqual(child1.screen(), { x: 15, y: 15 });
assert.deepEqual(child2.screen(), { x: 15, y: 75 });
assert.deepEqual(grandchild.screen(), { x: 25, y: 85 });

// box.hittest(pt) -> { child, child_pt }

// point is on the root surface, so no child is hit
assert.deepEqual(app.hittest({ x: 6, y: 6 }), null);

// point is within child2
assert.deepEqual(app.hittest({ x: 15, y: 15 }), { child: child1, child_pt: { x: 5, y: 5 } });

// point is within child3
assert.deepEqual(app.hittest({ x: 15, y: 75 }), { child: child2, child_pt: { x: 5, y: 5 } });

// point is within child3/grandchild, but we hit child2 because he is the child
assert.deepEqual(app.hittest({ x: 22, y: 82 }), { child: child2, child_pt: { x: 12, y: 12 } });

// we hit child3 because it covers child2
assert.deepEqual(app.hittest({ x: 35, y: 35 }), { child: child3, child_pt: { x: 5, y: 5 } });

// box.interact(event, pt)
app.interact('E1', { x: 6, y: 6 });
assert.equal(queue.length, 1);
assert.deepEqual(queue[0], { id: '#root', pt: { x: 6, y: 6 } });
queue = [];

app.interact('E1', { x: 15, y: 15 });
assert.equal(queue.length, 2);
assert.deepEqual(queue[0], { id: '#root', pt: { x: 15, y: 15 } });
assert.deepEqual(queue[1], { id: '#child1', pt: { x: 5, y: 5 } });
queue = [];

app.interact('E1', { x: 15, y: 75 });
assert.equal(queue.length, 2);
assert.deepEqual(queue[0], { id: '#root', pt: { x: 15, y: 75 } });
assert.deepEqual(queue[1], { id: '#child2', pt: { x: 5, y: 5 } });
queue = [];

app.interact('E1', { x: 35, y: 35 });
assert.equal(queue.length, 2);
assert.deepEqual(queue[0], { id: '#root', pt: { x: 35, y: 35 } });
assert.deepEqual(queue[1], { id: '#child1', pt: { x: 25, y: 25 } }); // because child3 has { interaction: false }
queue = [];

app.interact('E1', { x: 22, y: 82 });
assert.equal(queue.length, 2);
assert.deepEqual(queue[0], { id: '#root', pt: { x: 22, y: 82 } });
assert.deepEqual(queue[1], { id: '#child2', pt: { x: 12, y: 12 } });
queue = [];

// now set propagate to true and see the grandchild enjoy the event as well
child2.autopropagate = true;
app.interact('E1', { x: 22, y: 82 });
assert.equal(queue.length, 3);
assert.deepEqual(queue[0], { id: '#root', pt: { x: 22, y: 82 } });
assert.deepEqual(queue[1], { id: '#child2', pt: { x: 12, y: 12 } });
assert.deepEqual(queue[2], { id: '#grandchild', pt: { x: 2, y: 2 } });
queue = [];

