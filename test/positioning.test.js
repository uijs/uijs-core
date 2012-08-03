var assert = require('assert');
var uijs = require('..');
var positioning = uijs.positioning;
var box = uijs.box;
var bind = uijs.bind;

// attributes

var b1 = box({
  x: 50,
  y: 230,
  width: 123,
  height: 555,
});

assert.equal(positioning.left(b1), 50);
assert.equal(positioning.top(b1), 230);
assert.equal(positioning.width(b1), 123);
assert.equal(positioning.height(b1), 555);
assert.equal(positioning.right(b1), 50 + 123);
assert.equal(positioning.bottom(b1), 230 + 555);


// positioning.parent.xxx([delta])

var c1 = b1.add(box({
  x: bind(c1, 'x', positioning.parent.right(5)),
  y: bind(c1, 'y', positioning.parent.bottom()),
  width: bind(c1, 'width', positioning.parent.width(-10)),
  height: bind(c1, 'height', positioning.parent.height(+10)),
}));

assert.equal(c1.x, 50 + 123 + 5);
assert.equal(c1.y, 230 + 555);
assert.equal(c1.width, 123 - 10);
assert.equal(c1.height, 555 + 10);


// positioning.prev.xxx([delta])

var c2 = b1.add(box({
  x: bind(c2, 'x', positioning.prev.left()),
  y: bind(c2, 'y', positioning.prev.bottom(+5)),
}));

assert.equal(c2.x, c1.x);
assert.equal(c2.y, c1.y + c1.height + 5);

var gc1 = c2.add(box({
  x: bind(gc1, 'x', positioning.prev.bottom()),
  y: bind(gc1, 'y', positioning.prev.left(2)),
}));

assert.equal(gc1.x, 0);
assert.equal(gc1.y, 2);

// centerx and centery

var c3 = b1.add(box({
  x: bind(c3, 'x', positioning.parent.centerx()),
  y: bind(c3, 'y', positioning.parent.centery(-5)),
  width: 100,
  height: 50,
}));

assert.equal(c3.width, 100);
assert.equal(c3.height, 50);
assert.equal(c3.x, b1.width / 2 - c3.width / 2);
assert.equal(c3.y, b1.height / 2 - c3.height / 2 - 5);
