var layouts = require('./layouts');
var constant = require('./util').constant;

module.exports = function(options) {
  var view       = options       || {};
  view.x         = view.x        || function() { return 0; };
  view.y         = view.y        || function() { return 0; };
  view.width     = view.width    || function() { return 100; };
  view.height    = view.height   || function() { return 50; };
  view.rotation  = view.rotation || function() { return 0; };
  view.visible   = view.visible  || function() { return true; };
  view.clip      = view.clip     || function() { return true; };
  view.layout    = view.layout   || layouts.stack();
  view.alpha     = view.alpha    || null;
  view.state     = view.state    || function() { return 'default'; };

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
  view._is_view  = true;
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
    var self = this;
    var root = self.root();
    var term = root.get('#terminal');
    if (!term) return;

    var args = [];
    var id = (self.id && self.id()) || self._id;
    args.push('[' + id + ']');
    for (var i = 0; i < arguments.length; ++i) {
      args.push(arguments[i]);
    }

    term.writeLine(args.join(' '));
  };

  // -- event emitter

  var _subscriptions = {};

  view.emit = function(event) {
    var self = this;

    var handlers = _subscriptions[event];

    var handled;
    if (handlers) {
      var args = [];
      for (var i = 1; i < arguments.length; ++i) {
        args.push(arguments[i]);
      }

      handlers.forEach(function(fn) {
        var ret = fn.apply(self, args);
        if (typeof ret === 'undefined' || ret === true) handled = true;
        if (ret === false) handled = false;
      });
    }

    return handled;
  };

  view.on = function(event, handler) {
    var self = this;
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
    var self = this;
    if (!self.parent) return self;
    return self.parent.root();
  };

  // adds a child to the end of the children's stack.
  view.add = function(child) {
    var self = this;
    if (Array.isArray(child)) {
      return child.forEach(function(c) {
        self.add(c);
      });
    }

    if (!child._is_view) throw new Error('can only add views as children to a view');

    var previd = self._nextid;

    child._id = self._nextid++;
    child.parent = self;

    child.bringToTop = function() {
      self.remove(child);
      self.add(child);
    };

    child.remove = function() {
      self.remove(child);
    };

    child.prev = function() {
      var prev = null;
      
      for (var id in self._children) {
        if (id == child._id) {
          return self._children[prev];
        }
        prev = id;
      }

      return null;
    };

    var allow = true;
    var ret = self.emit('before-add-child', child);
    if (typeof ret === 'undefined') allow = true;
    else allow = !!ret;

    if (allow) {
      self._children[child._id] = child;
      self.emit('after-add-child', child);
    }
  };

  // removes a child
  view.remove = function(child) {
    var self = this;
    delete self._children[child._id];
    child.parent = null;
    return child;
  };

  // removes all children
  view.empty = function() {
    var self = this;
    for (var k in self._children) {
      self.remove(self._children[k]);
    }
  };

  // retrieve a child by it's `id()` property. children without
  // this property cannot be retrieved using this function.
  view.get = function(id) {
    var self = this;
    for (var k in self._children) {
      var child = self._children[k];
      if (child.id && child.id() === id) {
        return child;
      }
    }

    return null;
  };

  // retrieve a child from the entire view tree by id.
  view.query = function(id) {
    var self = this;
    var child = self.get(id);
    if (!child) {
      for (var k in self._children) {
        var found = self._children[k].query(id);
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
    var self = this;

    var radius = self.radius();

    ctx.beginPath();
    ctx.moveTo(0 + radius, 0);
    ctx.lineTo(0 + self.width() - radius, 0);
    ctx.quadraticCurveTo(0 + self.width(), 0, 0 + self.width(), 0 + radius);
    ctx.lineTo(0 + self.width(), 0 + self.height() - radius);
    ctx.quadraticCurveTo(0 + self.width(), 0 + self.height(), 0 + self.width() - radius, 0 + self.height());
    ctx.lineTo(0 + radius, 0 + self.height());
    ctx.quadraticCurveTo(0, 0 + self.height(), 0, 0 + self.height() - radius);
    ctx.lineTo(0, 0 + radius);
    ctx.quadraticCurveTo(0, 0, 0 + radius, 0);
    ctx.closePath();
    
    self.drawFill(ctx);
    self.drawImage(ctx);
    self.drawBorder(ctx);
    self.drawText(ctx);
  };

  view.drawFill = function(ctx) {
    var self = this;
    if (!self.fillStyle) return;
    ctx.fill();
  };

  view.drawBorder = function(ctx) {
    var self = this;
    if (!self.strokeStyle) return;

    // we don't want shadow the border
    ctx.save();
    ctx.shadowOffsetY = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowBlur = 0;
    ctx.stroke();
    ctx.restore();
  };

  view.drawImage = function(ctx) {
    var self = this;
    if (self.image) {
      ctx.drawImage(self.image, 0, 0, self.width(), self.height());
    }
  }

  view.drawText = function(ctx) {
    var self = this;
    if (!self.text || !self.text() || self.text().length === 0) return;
    if (!self.textFillStyle && !self.textStrokeStyle) return;

    var text = self.text();
    var width = self.width();
    var height = self.height();
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

    switch (self.textVerticalAlign()) {
      case 'top': top = 0; break;
      case 'middle': top = height / 2 - textHeight / 2; break;
      case 'bottom': top = height - textHeight; break;
    }

    ctx.save();

    if (self.textFillStyle) {
      ctx.fillStyle = self.textFillStyle();
      ctx.fillText(text, left, top, width);
    }

    if (self.textStrokeStyle) {
      ctx.strokeStyle = self.textStrokeStyle();
      ctx.strokeText(text, left, top, width);
    }

    ctx.restore();
  };

  view._self_in_state = function() {
    var self = this;
    if (self.state) {
      var state = self.state();
      if (state !== 'default') {
        var state_attr = 'when_' + state;
        console.log(state_attr);
        if (self[state_attr]) {
          self = self[state_attr]();
        }
      }
    }
    return self;
  };

  view.draw = function(ctx) {
    var self = this;

    ctx.save();

    if (self.rotation && self.rotation()) {
      var centerX = self.x() + self.width() / 2;
      var centerY = self.y() + self.height() / 2;
      ctx.translate(centerX, centerY);
      ctx.rotate(self.rotation());
      ctx.translate(-centerX, -centerY);
    }

    if (self.visible()) {
      ctx.translate(self.x(), self.y());

      ctx.save();

      var _self = self._self_in_state();
      if (_self.alpha) ctx.globalAlpha = _self.alpha();
      if (_self.fillStyle) ctx.fillStyle = _self.fillStyle();
      if (_self.shadowBlur) ctx.shadowBlur = _self.shadowBlur();
      if (_self.shadowColor) ctx.shadowColor = _self.shadowColor();
      if (_self.shadowOffsetX) ctx.shadowOffsetX = _self.shadowOffsetX();
      if (_self.shadowOffsetY) ctx.shadowOffsetY = _self.shadowOffsetY();
      if (_self.lineCap) ctx.lineCap = _self.lineCap();
      if (_self.lineJoin) ctx.lineJoin = _self.lineJoin();
      if (_self.lineWidth) ctx.lineWidth = _self.lineWidth();
      if (_self.strokeStyle) ctx.strokeStyle = _self.strokeStyle();
      if (_self.font) ctx.font = _self.font();
      if (_self.textAlign) ctx.textAlign = _self.textAlign();
      if (_self.textBaseline) ctx.textBaseline = _self.textBaseline();

      if (_self.ondraw) {
        if (_self.width() > 0 && _self.height() > 0) {
          _self.ondraw(ctx);
        }
      }

      ctx.restore();

      if (self.clip()) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(self.width(), 0);
        ctx.lineTo(self.width(), self.height());
        ctx.lineTo(0, self.height());
        ctx.closePath();
        ctx.clip();
      }

      Object.keys(self._children).forEach(function(key) {
        var child = self._children[key];
        child.draw.call(child, ctx);
      });

      ctx.restore();
    }
  };

  // returns the first child
  view.first = function() {
    var self = this;
    var keys = self._children && Object.keys(self._children);
    if (!keys || keys.length === 0) return null;
    return self._children[keys[0]];
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
    var self = this;
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

  view._propagate = function(event, pt, e) {
    var self = this;
    var handler = null;

    for (var id in self._children) {
      var child = self._children[id];
      var child_pt = self.hittest(child, pt);
      if (child_pt) {
        var child_handler = child.interact(event, child_pt, e);
        if (child_handler) handler = child_handler;
      }
    }

    if (!handler) {
      if (self.emit(event, pt, e)) {
        handler = self;
      }
    }

    if (handler) self.log(event, 'handled by', handler.id());

    return handler;
  }

  // called with a mouse/touch event and relative coords
  // and propogates to child views. if child view did not handle
  // the event, the event is emitted to the parent (dfs).
  view.interact = function(event, pt, e) {
    var self = this;

    if (event === 'touchstart' || event === 'mousedown') {
      current_handler = null;
      var handler = self._propagate(event, pt, e);
      if (handler) current_handler = handler;
      return current_handler;
    }

    // check if we already have an ongoing touch
    if (current_handler) {
      // convert pt to current handler coordinates.
      var current_handler_screen = current_handler.screen();
      var this_screen = self.screen();
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
      return handled ? self : null;
    }

    return null;
  };

  // returns the screen coordinates of this view
  view.screen = function() {
    var self = this;
    var pscreen = self.parent ? self.parent.screen() : { x: 0, y: 0 };
    return {
      x: pscreen.x + self.x(),
      y: pscreen.y + self.y()
    };
  };

  return view;
};