var view = require('./view');
var layouts = require('./layouts');
var image = require('./image');
var constant = require('./util').constant;
var derive = require('./util').derive;

module.exports = function(options) {
    options        = options        || {};
    options.height = options.height || constant(40);
    options.radius = options.radius || constant(4);
    options.layout = options.layout || layouts.dock();
    options.font   = options.font   || constant('x-large Helvetica');

    // some default styling
    options.fillStyle = options.fillStyle || constant('#aaaaaa');
    options.textFillStyle = options.textFillStyle || constant('white');

    options.highlighted = options.highlighted || {};
    options.highlighted.fillStyle = options.highlighted.fillStyle || constant('#666666');

    var self = view(options);

    self.on('touchstart', function() { self.override = derive(self.highlighted); });
    self.on('touchend',   function() { self.override = null; });
    self.on('mousedown',  function() { self.emit('touchstart'); });
    self.on('mouseup',    function() { self.emit('touchend'); });

    return self;
  }