var assert = require('assert');
var loadimage = require('..').util.loadimage;

// mock the DOM image
Image = function() {};

window = {};

var i;
var load_called;

// test local retina url
window.devicePixelRatio = 2;
i = loadimage('assets/img/e.png');
assert.equal(i.src, 'assets/img/e@2x.png');

// test non-retina http:// url
window.devicePixelRatio = 1;
i = loadimage('http://x.com/t/z/d.png');
assert.equal(i.src, 'http://x.com/t/z/d.png');

// test retina http:// url
window.devicePixelRatio = 2;
i = loadimage('http://x.com/t/z/foo.png');
assert.equal(i.src, 'http://x.com/t/z/foo@2x.png');

// verify that `onload` callback is called
load_called = false;
window.devicePixelRatio = 2;
i = loadimage('path/to/image.png', function() {
  assert.equal(this.src, 'path/to/image@2x.png');
  load_called = true;
});
i.onload();
assert(load_called);

// test that a load failure will fall back to non-retina image
load_called = false;
window.devicePixelRatio = 2;
i = loadimage('path/to/image2.png', function() {
  assert.equal(this.src, 'path/to/image2.png');
  load_called = true;
});
i.onerror(); // this will fall back to non-retina
i.onload();
assert(load_called);

// verify that options.retina=false works
window.devicePixelRatio = 2;
i = loadimage('hello.png', { retina: true });
assert.equal(i.src, 'hello@2x.png');
i = loadimage('hello2.png', { retina: false });
assert.equal(i.src, 'hello2.png');

// verify that image objects are cached
var v1 = loadimage('obj1.png');
var v2 = loadimage('obj1.png');
v1.foo = 777;
assert.equal(v1, v2);
assert.equal(v2.foo, 777);

// verify that we can disable cache by `options.cache = false`
var v3 = loadimage('obj1.png', { cache: false });
assert.notEqual(v1, v3);
assert.equal(v3.foo, undefined);