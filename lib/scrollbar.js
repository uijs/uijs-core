var box = require('./box');
var defaults = require('./util').defaults;
var min = require('./util').min;
var bind = require('./bind');

module.exports = function(options) {
  var obj = box(defaults(options, {
    x: bind(function() {
      return this.parent.width - this.width;
    }),
    y: bind(function() {
      var parent = this.parent;
      var content = parent.content;
      var contentHeight = content.height;
      if(!contentHeight || contentHeight === 0){
        return 0;
      }
      return parent.height * (content.y / contentHeight);
    }),
    height: bind(function() {
      var parent = this.parent;
      var parentHeight = parent.height;
      return min(parentHeight, parentHeight * parentHeight / parent.content.height);
    }),
    width: 20,
    interaction: false,
    invalidatingVars: ['x', 'y', 'width', 'height'],
  }));

  function onDrawScrollbar(ctx){
    var width = this.width / 2;
    
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineCap = 'round';
    ctx.lineWidth = width;
    ctx.beginPath();

    ctx.moveTo(width, 8);
    ctx.lineTo(width, this.height - 8);
    ctx.stroke();
  } 

  obj.ondraw = onDrawScrollbar;

  return obj;
};