var view = require('./view');
var layouts = require('./layouts');
var image = require('./image');
var constant = require('./util').constant;
var derive = require('./util').derive;
var valueof = require('./util').valueof;
var defaults = require('./util').defaults;

module.exports = function(options) {
  options = defaults(options, {
    radius: constant(10),
    layouts: layouts.dock(),
    font: constant('xx-large Helvetica'),
    text: constant('button'),
    width: constant(400),
    height: constant(80),
    fillStyle: constant('#aaaaaa'),
    strokeStyle: constant('black'),
    lineWidth: constant(3),
    textFillStyle: constant('black'),
    shadowColor: constant('rgba(0,0,0,0.5)'),
    shadowBlur: constant(15),
    shadowOffsetX: constant(5),
    shadowOffsetY: constant(5),
    shadowColor: constant('rgba(0,0,0,0.5)'),
    shadowBlur: constant(5),
  });

  // highlighted state
  options.highlighted = defaults(options.highlighted, {
    fillStyle: constant('#666666'),
    shadowOffsetX: constant(0),
    shadowOffsetY: constant(0),
    x: function() { return this.base.x() + 5; },
    y: function() { return this.base.y() + 5; },
  });

  var self = view(options);

  self.on('touchstart', function(c) { self.override = derive(self.highlighted); });
  self.on('touchend',   function(c) { self.override = null; });
  self.on('mousedown',  function(c) { self.emit('touchstart', c); });
  self.on('mouseup',    function(c) { self.emit('touchend', c); });

  self.on('touchend', function(c) {
    if (c.x < 0 || c.x > self.width()) return;
    if (c.y < 0 || c.y > self.height()) return;
    return self.queue('click', c);
  });

  return self;
};