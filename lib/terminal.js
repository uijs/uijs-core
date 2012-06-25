var view = require('./view');
var constant = require('./util').constant;
var max = require('./util').max;

module.exports = function(options) {
  options = options || {};
  options.bufferSize = options.bufferSize || constant(100);
  options.id = options.id || constant('#terminal'); // for `view.log(...)`
  options.lineHeight = options.lineHeight || constant(12);

  var self = view(options);
  self.fillStyle = constant('black');

  var lines = [];
  self.writeLine = function(s) {
    var line = {
      data: s,
      time: Date.now()
    };
    lines.push(line);
    var bufferSize = self.bufferSize && self.bufferSize();
    if (bufferSize) {
      while (lines.length > bufferSize) {
        lines.shift();
      }
    }
    return line;
  };

  var _ondraw = self.ondraw;

  self.ondraw = function(ctx) {
    _ondraw.call(self, ctx);

    ctx.save();

    var lineHeight = self.lineHeight();
    ctx.font = lineHeight + 'px Courier';

    ctx.textAlign = 'left';

    // calculate how many lines can fit into the terminal
    var maxLines = self.height() / lineHeight;
    var first = max(0, Math.round(lines.length - maxLines) + 1);

    var y = 0;
    for (var i = first; i < lines.length; ++i) {
      var line = lines[i].data;
      var now = '[' + new Date(lines[i].time).toISOString().replace(/.*T/, '') + '] ';
      ctx.fillStyle = 'gray';
      ctx.fillText(now, 0, y);
      ctx.fillStyle = 'white';
      ctx.fillText(line, ctx.measureText(now).width, y);
      y += lineHeight;
    }

    ctx.restore();
  };

  return self;
}