
  //<body onorientationchange="myOrientationChangeFunction()">
  /*
  Text: <input type="text" /> <!-- display a standard keyboard -->
Telephone: <input type="tel" /> <!-- display a telephone keypad -->
URL: <input type="url" /> <!-- display a URL keyboard -->
Email: <input type="email" /> <!-- display an email keyboard -->
Zip Code: <input type="text" pattern="[0-9]*" /> <!-- display a numeric keyboard -->*/

var fps = 60;

var INTERACTION_EVENTS = [
  'touchstart',
  'touchend',
  'touchmove',
  'touchcancel',
  'mousedown',
  'mouseup',
  'click'
];

function canvasizer(options) {
  if (document.body.hasChildNodes()) {
    while (document.body.childNodes.length) {
      document.body.removeChild(document.body.firstChild);
    }
  }

  var canvas = document.createElement('canvas');
  document.body.appendChild(canvas);
  document.body.style.background = 'white';
  canvas.style.background = 'white';
  document.body.style.padding = '0px';
  document.body.style.margin = '0px';
  document.body.style['min-height'] = '416px'; // this is the iphone screen height without the bottom safari bar

  window.onresize = function() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };

  setTimeout(function() { 
    window.scrollTo(0, 0);
    window.onresize();
  }, 0);

  window.onresize();

  var ctx = canvas.getContext('2d');

  options = options || {};
  options.id = options.id || constant('canvas');
  options.x = options.x || constant(0);
  options.y = options.y || constant(0);
  options.width = options.width || function() { return canvas.width; };
  options.height = options.height || function() { return canvas.height; };
  options.layout = options.layout || layouts.none();

  var main = view(options);

  // get the coordinates for a mouse or touch event
  // http://www.nogginbox.co.uk/blog/canvas-and-multi-touch
  function getCoords(e) {
    if (e.offsetX) {
      // works in chrome / safari (except on ipad/iphone)
      return { x: e.offsetX, y: e.offsetY };
    }
    else if (e.layerX) {
      // works in Firefox
      return { x: e.layerX, y: e.layerY };
    }
    else {
      // works in safari on ipad/iphone
      return { x: e.pageX - canvas.offsetLeft, y: e.pageY - canvas.offsetTop };
    }
  }

  // add mouse/touch interaction events
  INTERACTION_EVENTS.forEach(function(name) {
    canvas['on' + name] = function(e) {
      var coords = getCoords(e);
      main.interact(name, coords);
    };
  });

  var lastRedraw;
  function redraw() {
    
    // calculate fps
    var now = Date.now();
    var dt = 1000 / (now - lastRedraw);
    if (lastRedraw) fps = dt;
    lastRedraw = now;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    main.draw(ctx);
    webkitRequestAnimationFrame(redraw);
  }

  redraw();

  return main;
}

function view(options) {

  var view       = options       || {};
  view.x         = view.x        || function() { return 0; };
  view.y         = view.y        || function() { return 0; };
  view.width     = view.width    || function() { return 100; };
  view.height    = view.height   || function() { return 50; };
  view.rotation  = view.rotation || function() { return 0; };
  view.visible   = view.visible  || function() { return true; }
  view.clip      = view.clip     || function() { return true; }
  view.layout    = view.layout   || layouts.stack();
  view.alpha     = view.alpha    || null;

  // rect
  view.radius    = view.radius || constant(-1);

  // image
  view.imagesrc  = view.imagesrc || null;
  view.image     = view.image    || null;
  
  // text
  view.text              = view.text || null;
  view.textBaseline      = view.textBaseline || constant('top');
  view.textAlign         = view.textAlign || constant('center');
  view.textVerticalAlign = view.textVerticalAlign || constant('middle');

  view._id       = '<unattached>';
  view._view     = true;
  view._children = {};
  view._nextid   = 0;

  if (!('fillStyle' in view) && !('strokeStyle' in view)) {
    view.strokeStyle = constant('black');
  }

  if (!('textFillStyle' in view) && !('textStrokeStyle' in view)) {
    view.textFillStyle = constant('black');
  }

  if (view.imagesrc) {
    var img = new Image();
    img.src = view.imagesrc();
    img.onload = function() { view.image = this; }
  }

  view.log = function() {
    var args = [];
    var id = (view.id && view.id()) || view._id;
    args.push('[' + id + ']');
    for (var i = 0; i < arguments.length; ++i) {
      args.push(arguments[i]);
    }
    console.log.apply(console, args);
  }

  // event emitter

  var _subscriptions = {};

  view.emit = function(event) {

    var handlers = _subscriptions[event];

    var handled;
    if (handlers) {
      var args = [];
      for (var i = 1; i < arguments.length; ++i) {
        args.push(arguments[i]);
      }

      handlers.forEach(function(fn) {
        var ret = fn.apply(view, args);
        if (typeof ret === 'undefined' || ret === true) handled = true;
        if (ret === false) handled = false;
      });
    }

    return handled;
  };

  view.on = function(event, handler) {
    if (!_subscriptions) return;
    var handlers = _subscriptions[event];
    if (!handlers) handlers = _subscriptions[event] = [];
    handlers.push(handler);
  };  

  // call layout initialization function on the child
  if (view.layout) {
    view.layout();
  }

  view.add = function(child) {

    if (Array.isArray(child)) {
      return child.forEach(function(c) {
        view.add(c);
      });
    }

    if (!child._view) throw new Error('can only add views as children to a view');

    var previd = view._nextid;

    child._id = view._nextid++;

    child.bringToTop = function() {
      view.remove(child);
      view.add(child);
    };

    child.remove = function() {
      view.remove(child);
    };

    child.prev = function() {
      var prev = null;
      
      for (var id in view._children) {
        if (id == child._id) {
          return view._children[prev];
        }
        prev = id;
      }

      return null;
    };

    var allow = true;
    var ret = view.emit('before-add-child', child);
    if (typeof ret === 'undefined') allow = true;
    else allow = !!ret;

    if (allow) {
      view._children[child._id] = child;
      view.emit('after-add-child', child);
      view.log(child.width);
    }
  };

  view.remove = function(child) {
    delete view._children[child._id];
    return child;
  };

  view.empty = function() {
    for (var k in view._children) {
      view.remove(view._children[k]);
    }
  };

  // default draw for view is basically to draw a rectangle
  view.ondraw = function(ctx) {
    var radius = view.radius();
    ctx.beginPath();
    ctx.moveTo(0 + radius, 0);
    ctx.lineTo(0 + view.width() - radius, 0);
    ctx.quadraticCurveTo(0 + view.width(), 0, 0 + view.width(), 0 + radius);
    ctx.lineTo(0 + view.width(), 0 + view.height() - radius);
    ctx.quadraticCurveTo(0 + view.width(), 0 + view.height(), 0 + view.width() - radius, 0 + view.height());
    ctx.lineTo(0 + radius, 0 + view.height());
    ctx.quadraticCurveTo(0, 0 + view.height(), 0, 0 + view.height() - radius);
    ctx.lineTo(0, 0 + radius);
    ctx.quadraticCurveTo(0, 0, 0 + radius, 0);
    ctx.closePath();
    
    view.drawFill(ctx);
    view.drawImage(ctx);
    view.drawBorder(ctx);
    view.drawText(ctx);
  };

  view.drawFill = function(ctx) {
    if (!view.fillStyle) return;
    ctx.fill();
  };

  view.drawBorder = function(ctx) {
    if (!view.strokeStyle) return;

    // we don't want shadow the border
    ctx.save();
    ctx.shadowOffsetY = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowBlur = 0;
    ctx.stroke();
    ctx.restore();
  };

  view.drawImage = function(ctx) {
    if (view.image) {
      ctx.drawImage(view.image, 0, 0, view.width(), view.height());
    }
  }

  view.drawText = function(ctx) {
    if (!view.text || !view.text() || view.text().length === 0) return;
    if (!view.textFillStyle && !view.textStrokeStyle) return;

    var text = view.text();
    var width = view.width();
    var height = view.height();
    var top = 0;
    var left = 0;

    // http://stackoverflow.com/questions/1134586/how-can-you-find-the-height-of-text-on-an-html-canvas
    var textHeight = ctx.measureText('ee').width;

    switch (ctx.textAlign) {
      case 'start':
      case 'left': left = 0; break;
      case 'end':
      case 'right': left = width; break;
      case 'center': left = width / 2; break;
    }

    switch (view.textVerticalAlign()) {
      case 'top': top = 0; break;
      case 'middle': top = height / 2 - textHeight / 2; break;
      case 'bottom': top = height - textHeight; break;
    }

    // ctx.strokeRect(0, 0, width, height);
    // ctx.strokeRect(0, top, width, textHeight);

    ctx.save();

    if (view.textFillStyle) {
      ctx.fillStyle = view.textFillStyle();
      ctx.fillText(text, left, top, width);
    }

    if (view.textStrokeStyle) {
      ctx.strokeStyle = view.textStrokeStyle();
      ctx.strokeText(text, left, top, width);
    }

    ctx.restore();
  };

  view.draw = function(ctx) {
    ctx.save();

    if (view.rotation && view.rotation()) {
      var centerX = view.x() + view.width() / 2;
      var centerY = view.y() + view.height() / 2;
      ctx.translate(centerX, centerY);
      ctx.rotate(view.rotation());
      ctx.translate(-centerX, -centerY);
    }

    if (view.visible()) {
      ctx.translate(view.x(), view.y());

      ctx.save();

      if (view.alpha) ctx.globalAlpha = view.alpha();
      if (view.fillStyle) ctx.fillStyle = view.fillStyle();
      if (view.shadowBlur) ctx.shadowBlur = view.shadowBlur();
      if (view.shadowColor) ctx.shadowColor = view.shadowColor();
      if (view.shadowOffsetX) ctx.shadowOffsetX = view.shadowOffsetX();
      if (view.shadowOffsetY) ctx.shadowOffsetY = view.shadowOffsetY();
      if (view.lineCap) ctx.lineCap = view.lineCap();
      if (view.lineJoin) ctx.lineJoin = view.lineJoin();
      if (view.lineWidth) ctx.lineWidth = view.lineWidth();
      if (view.strokeStyle) ctx.strokeStyle = view.strokeStyle();
      if (view.font) ctx.font = view.font();
      if (view.textAlign) ctx.textAlign = view.textAlign();
      if (view.textBaseline) ctx.textBaseline = view.textBaseline();

      if (view.ondraw) {
        view.ondraw(ctx);
      }

      ctx.restore();

      if (view.clip()) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(view.width(), 0);
        ctx.lineTo(view.width(), view.height());
        ctx.lineTo(0, view.height());
        ctx.closePath();
        ctx.clip();
      }

      Object.keys(view._children).forEach(function(key) {
        var child = view._children[key];
        child.draw.call(child, ctx);
      });

      ctx.restore();
    }
  };

  view.first = function() {
    var keys = view._children && Object.keys(view._children);
    if (!keys || keys.length === 0) return null;
    return view._children[keys[0]];
  };

  // if `children` is defined in construction, add them and
  // replace with a property so we can treat children as an array
  if (view.children) {
    view.add(view.children);
    delete view.children;
  }

  view.hittest = function(child, pt) {
    if (pt.x >= child.x() &&
        pt.y >= child.y() &&
        pt.x <= child.x() + child.width() &&
        pt.y <= child.y() + child.height()) {
      
      // convert to child coords
      var child_x = pt.x - child.x();
      var child_y = pt.y - child.y();

      return { x: child_x, y: child_y };
    }

    return null;
  }

  // called with a mouse/touch event and relative coords
  // and propogates to child views. if child view did not handle
  // the event, the event is emitted to the parent (dfs).
  view.interact = function(event, pt) {
    var handled = false;

    for (var id in view._children) {
      var child = view._children[id];
      var child_pt = view.hittest(child, pt);
      if (child_pt) {
        if (child.interact(event, child_pt)) {
          handled = true;
        }
      }
    }

    if (!handled) {
      handled = view.emit(event, pt);
    }

    return handled;
  };

  // view.on('mousedown', function(coords) {
  //   console.log('mousedown', coords);
  //   view._prevFill = view.fillStyle;
  //   view.fillStyle = constant('black');
  //   view.radius = constant(10);
  //   return false;
  // });

  // view.on('mouseup', function(coords) {
  //   view.fillStyle = view._prevFill;
  //   return false;
  // });

  return view;
}

function rectangle(options) {
  return view(options);
}

function label(options) {
  return view(options);
}

function image(options) {
  var self = view(options);
  self.width = function() {
    if (self.image) {
      return self.image.width;
    }
    else return 10;
  };
  self.height = function() {
    if (self.image) {
      return self.image.height;
    }
    else return 10;
  };
  return self;
}

function constant(x) { return function() { return x; }; }
function centerx(target, delta) { return function() { return target.width() / 2 - this.width() / 2 + (delta || 0); }; }
function centery(target, delta) { return function() { return target.height() / 2 - this.height() / 2 + (delta || 0); }; }
function top(target, delta) { return function() { return (delta || 0); }; }
function left(target, delta) { return function() { return (delta || 0); }; }
function right(target, delta) { return function() { return target.width() + (delta || 0); }; }
function bottom(target, delta) { return function() { return target.height() + (delta || 0); }; }

function min(a, b) { return a < b ? a : b; }
function max(a, b) { return a > b ? a : b; }
function frames(duration) { return duration / 1000 * fps; } // returns the number of frames for a duration in milliseconds

// -- layouts

var layouts = {};

layouts.stack = function(options) {
  options = options || {};
  options.padding = options.padding || constant(5);
  options.spacing = options.spacing || constant(5);

  return function() {
    var parent = this;
    parent.log('stack layout function called');

    parent.on('after-add-child', function(child) {
      parent.log('[stack] after-add-child');

      child.x = options.padding;

      child.width = function() {
        return parent.width() - options.padding() * 2;
      };

      var prev = child.prev();
      if (!prev) child.y = options.padding;
      else child.y = function() { return prev.y() + prev.height() + options.spacing() };
    });
  };
};

layouts.none = function() {
  return function() { };
};

// -- animation

var curves = {};

curves.linear = function() {
  return function(x) {
    return x;
  };
};

curves.easeInEaseOut = function() {
  return function(x) {
    return (1 - Math.sin(Math.PI / 2 + x * Math.PI)) / 2;
  };
};

function animate(from, to, options) {
  options = options || {};
  options.duration = options.duration || constant(250);
  options.callback = options.callback || function() { };
  options.curve = options.curve || curves.easeInEaseOut();
  options.name = options.name || from.toString() + '_to_' + to.toString();

  var startTime = Date.now();
  var endTime = Date.now() + options.duration();
  var callbackCalled = false;
  // console.time(options.name);

  return function () {
    var elapsedTime = Date.now() - startTime;
    var ratio = elapsedTime / options.duration();
    if (ratio < 1.0) {
      curr = from + (to - from) * options.curve(ratio);
    }
    else {
      // console.timeEnd(options.name);
      curr = to;
      if (options.callback && !callbackCalled) {
        options.callback.call(this);
        callbackCalled = true;
      }
    }
    return curr;
  };
}