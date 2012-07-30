var box = require('./box');
var defaults = require('./util').defaults;
var min = require('./util').min;
var max = require('./util').max;

module.exports = function(options) {
  var obj = box(defaults(options, {
    position: 0.3,
    size: 0.5,
    interaction: false,
    lineWidth: 10,
    width: function() { return this.lineWidth; },
  }));

  obj.ondraw = function(ctx) {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineCap = 'round';
    ctx.lineWidth = this.lineWidth;
    ctx.beginPath();

    var barstart = 8;
    var barheight = this.height - 16;

    var barposition = this.position * barheight;
    var barsize = this.size * barheight;

    ctx.moveTo(this.width - 10, max(barstart + barposition, barstart));
    ctx.lineTo(this.width - 10, min(barstart + barposition + barsize, barstart + barheight));
    ctx.stroke();
  }; 

  return obj;
};