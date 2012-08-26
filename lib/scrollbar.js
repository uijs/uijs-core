var box = require('./box');
var defaults = require('./util').defaults;
var min = require('./util').min;
var bind = require('./bind');

module.exports = function(options) {
  var obj = box(defaults(options, {
    x: bind(function() {
      var returnValue = this.parent.width - this.width;
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
      return returnValue;
    }),
    height: bind(function() {
      var parent = this.parent;
      var parentHeight = parent.height;
      var returnValue = min(parentHeight, parentHeight * parentHeight / parent.content.height);
      return returnValue;
    }),
    width: 20,
    interaction: false,
    useBuffer: true,
    invalidators: ['width', 'height'],
  }));

  var widthCache = 0;
  var heightCache = 0;

  function onCalculateScrollbar(){
    widthCache = this.width / 2;
    heightCache = this.height - 8;
  }

  function onSetContextScrollbar(ctx){
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineCap = 'round';
    ctx.lineWidth = widthCache;
    ctx.beginPath();

    ctx.moveTo(widthCache, 8);
    ctx.lineTo(widthCache, heightCache);
  }

  function onDrawScrollbar(ctx){
    ctx.stroke();
  } 

  obj.onCalculate = onCalculateScrollbar;
  obj.onSetContext = onSetContextScrollbar;
  obj.ondraw = onDrawScrollbar;

  return obj;
};