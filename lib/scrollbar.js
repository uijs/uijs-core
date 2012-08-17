var box = require('./box');
var defaults = require('./util').defaults;
var min = require('./util').min;
var max = require('./util').max;

module.exports = function(options) {
  var obj = box(defaults(options, {
    position: 0.3,
    size: 0.5,
    interaction: false,
    width: 20,
    isControl: true
  }));

  obj.ondraw = function(ctx) {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineCap = 'round';
    ctx.lineWidth = this.width / 2;
    ctx.beginPath();

    var barstart = 8;
    var barheight = this.height - 16;

    var barposition = this.position * barheight;
    var barsize = this.size * barheight;

    ctx.moveTo(this.x + this.width / 2, max(barstart + barposition, barstart));
    ctx.lineTo(this.x + this.width / 2, min(barstart + barposition + barsize, barstart + barheight));
    ctx.stroke();
  }; 

  return obj;
};