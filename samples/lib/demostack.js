var uijs = require('uijs');
var positioning = uijs.positioning;
var c = uijs.util.constant;
var defaults = uijs.util.defaults;
var box = uijs.box;

//005B9A
//0191C8
//74C2E1

//8C8984
function separator(options) {
  var obj = box(options);
  obj._is_adornment = true;
  obj.height = c(5);
  obj.width = positioning.parent({ width: 0 });
  obj.ondraw = function(ctx) {
    ctx.fillStyle = '#0191C8';
    ctx.shadowBlur = 5;
    ctx.shadowColor = 'black';
    ctx.fillRect(0, 0, this.width(), this.height());
  }
  return obj;
}

function label(options) {
  options = defaults(options, {
    title: c('demo'),
    lineHeight: c(1),
    height: c(30),
    backgroundColor: c('#0191C8'),
    width: positioning.parent({ width: 0 }),
  });
  var obj = box(options);
  obj._is_adornment = true;
  obj.ondraw = function(ctx) {

    var lineHeight = this.lineHeight();

    ctx.fillStyle = this.backgroundColor();
    ctx.shadowBlur = 5;
    ctx.shadowColor = 'black';
    ctx.fillRect(0, 0, this.width(), this.height());

    ctx.shadowBlur = 0;

    ctx.font = '16px Helvetica';
    ctx.fillStyle = 'black';
    ctx.fillText(this.title(), 10, 20 + lineHeight);
  };
  return obj;
}

module.exports = function(options) {
  options = defaults(options, {
    backgroundColor: c('#005B9A'),
  });
  
  var obj = box(options);
  obj.x = c(0);
  obj.y = c(0);
  obj.width = positioning.parent({ width: 0 });
  obj.height = positioning.parent({ height: 0 });

  var base = {
    add: obj.add
  };

  obj.add = function(child) {
    var children = this.all();
    var last = children[children.length - 1];
    if (last) last.remove();

    base.add.call(this, label({
      y: positioning.relative({ bottom: 0 }),
      title: child.title || c('child has no `title` attribute'),
    }));

    child.width = this.width;
    child.y = positioning.relative({ bottom:0 });
    var ret = base.add.call(this, child);

    base.add.call(this, separator({
      y: positioning.relative({ bottom: 0 }),
    }));

    return ret;
  };

  obj.ondraw = function(ctx) {
    ctx.fillStyle = this.backgroundColor();
    ctx.fillRect(0, 0, this.width(), this.height());
  };
  return obj;
};