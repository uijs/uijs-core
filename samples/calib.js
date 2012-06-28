var uijs = require('uijs');
var constant = uijs.util.constant;

var app = uijs.app();

app.add(uijs.view({
  x: constant(1),
  y: constant(1),
  width: function() { return app.width() - 2; },
  height: function() { return app.height() - 2; },
  fillStyle: constant('green'),
  strokeStyle: constant('black'),
  text: function() {
    return 'size: ' + app.width() + 'x' + app.height();
  }
}));

module.exports = app;