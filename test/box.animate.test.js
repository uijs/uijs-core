var assert = require('assert');
var uijs = require('..');
var box = uijs.box;
var bind = uijs.bind;
var animate = uijs.animation;

// box.animate
var mybox = box({ p: 0 });
mybox.animate({ p: 100 }, { duration: 500 });
var start = Date.now();
while (mybox.p < 100 && Date.now() - start < 550) { };
assert(mybox.p === 100);
