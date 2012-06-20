var layouts = require('./layouts');
var constant = require('./util').constant;

module.exports = function(options) {
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
  view.radius    = view.radius || constant(0);

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

  if (!('textFillStyle' in view) && !('textStrokeStyle' in view)) {
    view.textFillStyle = constant('black');
  }

  if (view.imagesrc) {
    var img = new Image();
    img.src = view.imagesrc();
    img.onload = function() { view.image = this; }
  }

  // -- log

  view.log = function() {
    var root = view.root();
    var term = root.get('#terminal');
    if (!term) return;

    var args = [];
    var id = (view.id && view.id()) || view._id;
    args.push('[' + id + ']');
    for (var i = 0; i < arguments.length; ++i) {
      args.push(arguments[i]);
    }

    term.writeLine(args.join(' '));
  };

  // -- event emitter

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

  // -- children/parents

  // returns the root of the view hierarchy
  view.root = function() {
    if (!view.parent) return view;
    return view.parent.root();
  };

  // adds a child to the end of the children's stack.
  view.add = function(child) {

    if (Array.isArray(child)) {
      return child.forEach(function(c) {
        view.add(c);
      });
    }

    if (!child._view) throw new Error('can only add views as children to a view');

    var previd = view._nextid;

    child._id = view._nextid++;
    child.parent = view;

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
    }
  };

  // removes a child
  view.remove = function(child) {
    delete view._children[child._id];
    child.parent = null;
    return child;
  };

  // removes all children
  view.empty = function() {
    for (var k in view._children) {
      view.remove(view._children[k]);
    }
  };

  // retrieve a child by it's `id()` property. children without
  // this property cannot be retrieved using this function.
  view.get = function(id) {
    for (var k in view._children) {
      var child = view._children[k];
      if (child.id && child.id() === id) {
        return child;
      }
    }

    return null;
  };

  // retrieve a child from the entire view tree by id.
  view.query = function(id) {
    var child = view.get(id);
    if (!child) {
      for (var k in view._children) {
        var found = view._children[k].query(id);
        if (found) {
          child = found;
          break;
        }
      }
    }
    return child;
  };

  // -- drawing

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
        if (view.width() > 0 && view.height() > 0) {
          view.ondraw(ctx);
        }
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

  // returns the first child
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

  // -- interactivity

  // returns {x,y} in child coordinates
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
  };

  var current_handler = null;

  function propagate(event, pt, e) {
    var handler = null;

    for (var id in view._children) {
      var child = view._children[id];
      var child_pt = view.hittest(child, pt);
      if (child_pt) {
        var child_handler = child.interact(event, child_pt, e);
        if (child_handler) handler = child_handler;
      }
    }

    if (!handler) {
      if (view.emit(event, pt, e)) {
        handler = view;
      }
    }

    if (handler) view.log(event, 'handled by', handler.id());

    return handler;
  }

  // called with a mouse/touch event and relative coords
  // and propogates to child views. if child view did not handle
  // the event, the event is emitted to the parent (dfs).
  view.interact = function(event, pt, e) {
    // view.log('current:', current_handler ? current_handler.id() : '<none>');

    if (event === 'touchstart' || event === 'mousedown') {
      current_handler = null;
      var handler = propagate(event, pt, e);
      if (handler) current_handler = handler;
      return current_handler;
    }

    // check if we already have an ongoing touch
    if (current_handler) {
      // convert pt to current handler coordinates.
      var current_handler_screen = current_handler.screen();
      var this_screen = view.screen();
      var delta = {
        x: current_handler_screen.x - this_screen.x,
        y: current_handler_screen.y - this_screen.y,
      };

      pt = {
        x: pt.x - delta.x,
        y: pt.y - delta.y,
      };

      var handled = current_handler.emit(event, pt, e);
      if (event === 'touchend' || event === 'mouseup') current_handler = null;
      return handled ? view : null;
    }

    return null;
  };

  // returns the screen coordinates of this view
  view.screen = function() {
    var pscreen = view.parent ? view.parent.screen() : { x: 0, y: 0 };
    return {
      x: pscreen.x + view.x(),
      y: pscreen.y + view.y()
    };
  };

  return view;
};