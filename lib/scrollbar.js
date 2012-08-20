var box = require('./box');
var defaults = require('./util').defaults;
var min = require('./util').min;
var bind = require('./bind');

module.exports = function(options) {
  var obj = box(defaults(options, {
    x: bind(function() {
      var returnValue = this.parent.width - this.width;
      xCache = returnValue;
      return returnValue;
    }),
    y: bind(function() {
      var parent = this.parent;
      var content = parent.content;
      var contentHeight = content.height;
      if(!contentHeight || contentHeight === 0){
        return 0;
      }
      var returnValue =  -parent.height * (content.y / contentHeight);
      yCache = returnValue;
      return returnValue;
    }),
    height: bind(function() {
      var parent = this.parent;
      var parentHeight = parent.height;
      var returnValue = min(parentHeight, parentHeight * parentHeight / parent.content.height);
      hCache = returnValue;
      return returnValue;
    }),
    width: 20,
    interaction: false,
    useBuffer: true,
    invalidatingVars: ['width', 'height'],
  }));

  //TODO: Currently these are updated in the bound functions, but if they are overriden it will not work
  //      Need to add watch and update there.
  xCache = 0;
  yCache = 0;
  hCache = 0;

  function onDrawScrollbar(ctx){
    var width = this.width / 2;
    
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineCap = 'round';
    ctx.lineWidth = width;
    ctx.beginPath();

    ctx.moveTo(width, 8);
    ctx.lineTo(width, hCache - 8);
    ctx.stroke();
  } 

  obj.ondraw = onDrawScrollbar;

  return obj;
};