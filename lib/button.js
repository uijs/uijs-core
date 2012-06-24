var view = require('./view');
var layouts = require('./layouts');
var image = require('./image');
var constant = require('./util').constant;
var then = require('./state');

module.exports = function(options) {
    options        = options        || {};
    options.height = options.height || constant(40);
    options.radius = options.radius || constant(4);
    options.layout = options.layout || layouts.dock();
    options.font   = options.font   || constant('x-large Helvetica');
    options.fillStyle = options.fillStyle || constant('red');

    var self = view(options);

    self.when_highlighted = then({
      fillStyle: constant('darkRed'),
      textFillStyle: constant('white')
    });

    self.on('touchstart', function() { self.state = constant('highlighted'); });
    self.on('touchend',   function() { self.state = constant('default');     });
    self.on('mousedown',  function() { self.state = constant('highlighted'); });
    self.on('mouseup',    function() { self.state = constant('default');     });

    return self;
  }