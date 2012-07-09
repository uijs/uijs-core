var assert = require('assert');
var uijs = require('..');
var box = uijs.box;
var c = uijs.util.constant;

var queue = [];

// a box that keeps track of all the events it received
function polish_box(options) {
  var obj = box(options);

  obj.on('E1', function(pt) {
    queue.push({
      id: obj.id(),
      pt: pt,
    });
  });

  return obj;
}

var app = polish_box({
  id: c('#root'),
  x: c(5),
  y: c(5),
  width: c(100),
  height: c(100),
  interaction: c(true),   // capture interaction events altogther
  autopropagate: c(true), // propagate interaction events to child boxes
});

var child1 = app.add(polish_box({
  id: c('#child1'),
  x: c(10),
  y: c(10),
  width: c(50),
  height: c(50),
  interaction: c(true)
}));

var child3 = app.add(polish_box({
  id: c('#child3'),
  x: c(30),
  y: c(30),
  width: c(80),
  height: c(80),
  interaction: c(false), // events will not be captured (passthrough to child2)
}));

var child2 = app.add(polish_box({
  id: c('#child2'),
  x: c(10),
  y: c(70),
  width: c(50),
  height: c(50),
  interaction: c(true),    // events will be captured
  autopropagate: c(false), // events will not be propagated to children
}));

var grandchild = child2.add(polish_box({
  id: c('#grandchild'),
  x: c(10),
  y: c(10),
  width: c(10),
  height: c(50),
  interaction: c(true),
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
child2.autopropagate = c(true);
app.interact('E1', { x: 22, y: 82 });
assert.equal(queue.length, 3);
assert.deepEqual(queue[0], { id: '#root', pt: { x: 22, y: 82 } });
assert.deepEqual(queue[1], { id: '#child2', pt: { x: 12, y: 12 } });
assert.deepEqual(queue[2], { id: '#grandchild', pt: { x: 2, y: 2 } });
queue = [];

