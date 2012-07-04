var uijs = require('..');
var box = uijs.box;
var defaults = uijs.util.defaults;
var constant = uijs.util.constant;
var positioning = uijs.positioning;

var Canvas = require('canvas');

function rect(options) {
  options = defaults(options, {
    color: constant('white'),
    label: function() { return this.dock && this.dock(); },
  });

  var obj = box(options);

  obj.ondraw = function(ctx) {
    ctx.fillStyle = this.color();
    ctx.fillRect(0, 0, this.width(), this.height());
    ctx.fillStyle = 'black';
    ctx.font = '20px Helvetica';
    var text = this.label();
    if (text) ctx.fillText(text, 5, 20);

    ctx.strokeStyle = 'black';
    ctx.strokeRect(0, 0, this.width(), this.height());
  };

  return obj;
}

var app = rect({
  x: constant(0),
  y: constant(0),
  width: positioning.parent({ width: 0 }),
  height: positioning.parent({ height: 0 }),
  children: [
    rect({ dock: constant('top'), color: constant('blue'), height: constant(50) }),
    rect({ dock: constant('fill'), color: constant('yellow') }),
    rect({ dock: constant('bottom'), color: constant('green'), height: constant(50) }),
    rect({ 
      label: constant('alpha child'),
      alpha: constant(0.6),
      color: constant('pink'), 
      x: constant(10), y: constant(10), height: constant(200), width: constant(200),
      children: [
        rect({
          width: constant(180),
          height: constant(50),
          x: constant(5),
          y: constant(30),
          color: constant('cyan'),
          label: constant('child of alpha without clipping'),
        }),
        rect({
          width: constant(180),
          height: constant(50),
          x: constant(5),
          y: positioning.relative({ bottom: +10 }),
          clip: constant(true),
          color: constant('black'),
          label: constant('this is a clipped child'),
        }),
      ]
    }),
    rect({
      id: constant('#center'),
      label: function() { return 'rotated'; },
      rotation: constant(Math.PI / 1.5),
      clip: constant(true),
      x: positioning.centerx(50),
      y: positioning.centery(),
      width: constant(200),
      height: constant(50),
      color: constant('red'),
    }),
  ],
});

dock(app);

/// ### dock(box)
function dock(box) {
  var parent = box;

  var children = parent.all().filter(function(c) {
    return c.dock;
  });

  children.forEach(function(child) {
    var dock = child.dock && child.dock();

    // skip children without a `dock` attribute.
    if (!dock) return;

    // fill width for all dock styles
    child.x = constant(0);
    child.width = parent.width;

    if (dock === 'top') {
      child.y = constant(0);        
    }
    else if (dock === 'bottom') {
      child.y = function() { 
        return parent.height() - child.height(); 
      };
    }
    else if (dock === 'fill') {
      child.height = function() {
        return children
          .filter(function(c) { return c.dock() !== 'fill'; })
          .reduce(function(h, other) { return h - other.height(); }, parent.height());
      };

      child.y = function() {
        return children
          .filter(function(c) { return c.dock() === 'top'; })
          .reduce(function(h, other) { return h + other.height(); }, 0);
      };
    }
    else {
      console.warn('invalid dock:', dock);
    }
  });  
}

module.exports = function() {
  // attach uijs to the node-canvas canvas (cool!), 
  // `paused` is true so that the refresh loop will not begin, so we also need to call `redraw()`.
  var root = uijs.canvasize({ element: new Canvas(320, 480), children: [ app ] });
  root.redraw();
  return root.canvas;
};