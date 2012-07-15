var uijs = require('..');
var box = uijs.box;
var defaults = uijs.util.defaults;
var positioning = uijs.positioning;

var Canvas = require('canvas');

function rect(options) {

  options = defaults(options, {
    color: 'white',
    label: function() { return this.dock; },
  });

  var obj = box(options);

  obj.ondraw = function(ctx) {
    ctx.fillStyle = this.color;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.fillStyle = 'black';
    ctx.font = '20px Helvetica';
    var text = this.label;
    if (text) ctx.fillText(text, 5, 20);

    ctx.strokeStyle = 'black';
    ctx.strokeRect(0, 0, this.width, this.height);
  };

  return obj;
}

var app = rect({
  x: 0,
  y: 0,
  width: positioning.parent.width(),
  height: positioning.parent.height(),
  children: [
    rect({ dock: 'top', color: 'blue', height: 50 }),
    rect({ dock: 'fill', color: 'yellow' }),
    rect({ dock: 'bottom', color: 'green', height: 50 }),
    rect({ 
      label: 'alpha child',
      alpha: 0.6,
      color: 'pink', 
      x: 10, y: 10, height: 200, width: 200,
      children: [
        rect({
          width: 180,
          height: 50,
          x: 5,
          y: 30,
          color: 'cyan',
          label: 'child of alpha without clipping',
        }),
        rect({
          width: 180,
          height: 50,
          x: 5,
          y: positioning.prev.bottom(10),
          clip: true,
          color: 'black',
          label: 'this is a clipped child',
        }),
      ]
    }),
    rect({
      id: '#center',
      label: 'rotated',
      rotation: Math.PI / 1.5,
      clip: true,
      x: positioning.parent.centerx(50),
      y: positioning.parent.centery(),
      width: 200,
      height: 50,
      color: 'red',
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
    var dock = child.dock;

    // skip children without a `dock` attribute.
    if (!dock) return;

    // fill width for all dock styles
    child.x = 0;
    child.width = positioning.parent.width();

    if (dock === 'top') {
      child.y = 0;
    }
    else if (dock === 'bottom') {
      child.y = function() { 
        return parent.height - child.height;
      };
    }
    else if (dock === 'fill') {
      child.height = function() {
        return children
          .filter(function(c) { return c.dock !== 'fill'; })
          .reduce(function(h, other) { return h - other.height; }, parent.height);
      };

      child.y = function() {
        return children
          .filter(function(c) { return c.dock === 'top'; })
          .reduce(function(h, other) { return h + other.height; }, 0);
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