var uijs = require('uijs');
var constant = uijs.util.constant;

var app = uijs.app({
  fillStyle: constant('black'),
  layout: uijs.layouts.stack()
});

var palette1 = [ '#69D2E7', '#A7DBD8', '#E0E4CC', '#F38630', '#FA6900' ];
var palette2 = [ '#2A044A', '#0B2E59', '#0D6759', '#7AB317', '#A0C55F' ];

var nextcolor_index = 0;

function nextcolor() {
  var len = 5;
  var i = nextcolor_index++;
  return function() {
    var pview = find_palette_view(this);
    var palette = (pview && pview.palette()) || palette1;
    return palette[i % palette.length];
  }

  function find_palette_view(view) {
    if (view.palette) return view;
    if (view.parent) return find_palette_view(view.parent);
    return null;
  }
}

function frame(options) {
  options = options || {};
  options.fillStyle = options.fillStyle || nextcolor();
  options.shadowColor = constant('rgba(0,0,0,0.5)');
  options.shadowBlur = constant(10);
  options.shadowOffsetX = constant(5);
  options.shadowOffsetY = constant(5);
  var self = uijs.rectangle(options);
  self.strokeStyle = constant('black');
  var _ondraw = self.ondraw;
  self.ondraw = function(ctx) {
    _ondraw.call(self, ctx);
    if (self.unoccupied) {
      var region = self.unoccupied();
      ctx.save();
      var grad = ctx.createLinearGradient(0, 0, 1000, 1000);
      grad.addColorStop(0.0, 'black');
      grad.addColorStop(1.0, 'white');
      ctx.fillStyle = grad;
      ctx.fillRect(region.x, region.y, region.width, region.height);
      ctx.restore();
    }
  };
  return self;
}


function test_layout_dock() {
  return frame({
    id: constant('test_layout_dock'),
    strokeStyle: constant('black'),
    fillStyle: constant('#eeeeee'),
    height: constant(200),
    width: constant(500),
    palette: constant(palette1),
    layout: uijs.layouts.dock({padding:constant(3),spacing:constant(3)}),
    children: [
      frame({ 
        text: constant('left1'),
        dockStyle: constant('left'),
        dockOptions: { stretch: constant(false) },
        height: constant(150),
      }),
      frame({ text: constant('bottom1'), dockStyle: constant('bottom') }),
      frame({ text: constant('right1'), dockStyle: constant('right') }),
      frame({ text: constant('top1'), dockStyle: constant('top') }),
      frame({
        text: constant('bottom2'), 
        dockStyle: constant('bottom'), 
        dockOptions: { stretch: constant(false) } 
      }),
      frame({ text: constant('fill'), dockStyle: constant('fill') }),
    ]
  });
}

function fillStyle() { return function() { return this.fillStyle(); } }

function test_layout_stack() {
  return frame({
    id: constant('test_layout_stack'),
    layout: uijs.layouts.stack({}),
    id: constant('main'),
    height: constant(360),
    fillStyle: constant('#eeeeee'),
    strokeStyle: constant('black'),
    palette: constant(palette2),
    children: [
      frame({ text: fillStyle() }),
      frame({ text: fillStyle() }),
      frame({ text: fillStyle() }),
      frame({ text: fillStyle() }),
      frame({ text: fillStyle() }),
      frame({ text: fillStyle() }),
    ]
  });
}

app.add(test_layout_dock());
app.add(test_layout_stack());


module.exports = app;