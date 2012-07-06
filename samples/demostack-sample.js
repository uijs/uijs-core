var demostack = require('./lib/demostack');
var uijs = require('uijs');
var box = uijs.box;
var c = uijs.util.constant;

var app = demostack();

var b1 = app.add(box({
  title: c('This is the title of the demo box'),
  height: c(130),
}));

var b2 = app.add(box({
  title: c('Demo box number two comes here'),
  height: c(80),
}));

b2.ondraw = b1.ondraw = function(ctx) {
  ctx.fillStyle = 'black';
  ctx.fillText('Demo1', 10, 20);
};

module.exports = app;