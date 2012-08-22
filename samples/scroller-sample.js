var uijs = require('uijs');
var positioning = uijs.positioning;
var scroller = uijs.scroller;
var box = uijs.box;
var bind = uijs.bind;

function stripes() {
  var obj = box({
    width: bind(positioning.parent.width()),
    height: 10000,
    interaction: false,
  });

  obj.ondraw = function(ctx) {
    ctx.fillStyle = 'gray';
    ctx.fillRect(0, 0, this.width, this.height);
    var curr_y = 0;
    var h = 100;

    ctx.strokeStyle = 'black';
    ctx.fillStyle = 'blue';
    ctx.font = '20px Helvetica';
    var i = 0;
    while (curr_y < this.height) {
      ctx.strokeRect(0, curr_y, this.width, h);
      ctx.fillText(i.toString(), 20, curr_y + 50);
      curr_y += h;
      i++;
    }
  };

  return obj;
}


var s = scroller({
  
});

s.content = stripes();

module.exports = s;