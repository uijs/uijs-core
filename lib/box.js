var constant = require('./util').constant;
var defaults = require('./util').defaults;
var valueof = require('./util').valueof;

// # box(options)
// `options.x` - x-position of the box (default `constant(0)`)
// `options.y` - y-position of the box (default `constant(0)`)
// `options.width` - width of the box (default `constant(100)`)
// ...
var box = module.exports = function(options) {
  var obj = defaults(options, {
    x: constant(0),
    y: constant(0),
    width: constant(100),
    height: constant(100),
    rotation: constant(0.0),
    visible: constant(true),
    clip: constant(false),
    alpha: null,
    id: function() { return this._id; },
    terminal: function() { return this.query('#terminal'); },
  });

  obj._id       = '<unattached>';
  obj._is_box  = true;
  obj._children = {};
  obj._nextid   = 0;

  /// ## Logging

  /// ### box.log(...)
  /// Sends a log line into an attached terminal. A terminal is a box with the ID `#terminal`.
  /// if there is no such child box attached, this function will not do anything.
  obj.log = function() {
    var self = this;
    var term = self.terminal();
    if (!term) return;

    var args = [];
    var id = (self.id && self.id()) || self._id;
    args.push('[' + id + ']');
    for (var i = 0; i < arguments.length; ++i) {
      args.push(arguments[i]);
    }

    term.writeLine(args.join(' '));
  };

  /// ## EventEmitter
  /// Each box implements the basic EventEmitter functions: `on()` and `emit()`.

  var _subscriptions = {};

  obj.emit = function(event) {
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

  // emits the event (with arguments) after 100ms
  // should be used to allow ui to update when emitting
  // events from event handlers.
  obj.queue = function(event) {
    var self = this;
    var args = arguments;
    console.log('emitting later', event);
    setTimeout(function() {
      self.emit.apply(self, args);
    }, 50);
  };

  obj.on = function(event, handler) {
    var self = this;
    if (!_subscriptions) return;
    var handlers = _subscriptions[event];
    if (!handlers) handlers = _subscriptions[event] = [];
    handlers.push(handler);
  };  

  /// ## Box Hierarchy
  /// Boxes have children and parents.

  // returns the root of the box hierarchy
  obj.root = function() {
    var self = this;
    if (!self.parent) return self;
    return self.parent.root();
  };

  // adds a child to the end of the children's stack.
  obj.add = function(child) {
    var self = this;
    if (Array.isArray(child)) {
      return child.forEach(function(c) {
        self.add(c);
      });
    }

    if (!box.isbox(child)) {
      throw new Error('can only add boxes as children to a box');
    }

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
    var child_ret = child.emit('before-add-child', self);
    if (typeof child_ret === 'undefined') allow = true;
    else allow = !!child_ret;

    if (allow) {
      var ret = self.emit('before-add-child', child);
      if (typeof ret === 'undefined') allow = true;
      else allow = !!ret;
    }

    if (allow) {
      self._children[child._id] = child;
      self.emit('after-add-child', child);
      child.emit('after-child-added', self);
    }
  };

  // removes a child
  obj.remove = function(child) {
    var self = this;
    delete self._children[child._id];
    child.parent = null;
    return child;
  };

  // removes all children
  obj.empty = function() {
    var self = this;
    for (var k in self._children) {
      self.remove(self._children[k]);
    }
  };

  // retrieve a child by it's `id()` property. children without
  // this property cannot be retrieved using this function.
  obj.get = function(id) {
    var self = this;
    for (var k in self._children) {
      var child = self._children[k];
      if (child.id && child.id() === id) {
        return child;
      }
    }

    return null;
  };

  // ### box.query(id)
  // Retrieves a child from the entire box tree by id.
  obj.query = function(id) {
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

  /// ### box.all()
  /// Returns all the children of this box.
  obj.all = function() {
    var self = this;
    return Object.keys(self._children)
      .map(function(k) { return self._children[k]; });
  };

  /// ### box.rest(child)
  /// Returns all the children that are not `child`.
  obj.rest = function(child) {
    var self = this;
    return Object.keys(self._children)
      .filter(function(k) { return k != child._id; })
      .map(function(k) { return self._children[k]; });
  };

  /// ## Drawing

  /// ### box.ondraw(ctx)
  /// `ondraw` is called __every frame__ with a `CanvasRenderingContext2D` as a single
  /// parameter. The box should draw itself as efficiently as possible.
  obj.ondraw = null;

  /// ### box.draw(ctx)
  /// This function is called every frame. It draws the current box (by means of calling `ondraw`)
  /// and then draws the box's children iteratively. This function also implements a few of the basic
  /// drawing capabilities and optimizations: buffering, clipping, scaling, rotation.
  obj.draw = function(ctx) {
    var self = this;

    ctx.save();

    if (self.rotation && self.rotation()) {
      var centerX = self.x() + self.width() / 2;
      var centerY = self.y() + self.height() / 2;
      ctx.translate(centerX, centerY);
      ctx.rotate(self.rotation());
      ctx.translate(-centerX, -centerY);
    }

    // TODO: add alpha check as well (do not box if transparent)
    if (self.visible()) {

      // stuff that applies to all children
      ctx.translate(self.x(), self.y());
      if (self.alpha) ctx.globalAlpha = self.alpha();

      if (self.clip()) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(self.width(), 0);
        ctx.lineTo(self.width(), self.height());
        ctx.lineTo(0, self.height());
        ctx.closePath();
        ctx.clip();
      }

      ctx.save();

      // stuff that applies only to this child

      if (self.ondraw) {
        if (self.width() > 0 && self.height() > 0) {
          self.ondraw(ctx);
        }
      }

      ctx.restore();

      Object.keys(self._children).forEach(function(key) {
        //TODO: do not draw child if out of viewport
        var child = self._children[key];
        child.draw.call(child, ctx);
      });

      ctx.restore();
    }
  };

  // returns the first child
  obj.first = function() {
    var self = this;
    var keys = self._children && Object.keys(self._children);
    if (!keys || keys.length === 0) return null;
    return self._children[keys[0]];
  };

  // if `children` is defined in construction, add them and
  // replace with a property so we can treat children as an array
  if (obj.children) {
    obj.add(obj.children);
    delete obj.children;
  }

  // -- interactivity

  // returns {x,y} in child coordinates
  obj.hittest = function(child, pt) {
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

  obj._propagate = function(event, pt, e) {
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
  // and propogates to child boxes. if child box did not handle
  // the event, the event is emitted to the parent (dfs).
  obj.interact = function(event, pt, e) {
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

      pt.x = pt.x || 0;
      pt.y = pt.y || 0;

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

  // returns the screen coordinates of this obj
  obj.screen = function() {
    var self = this;
    var pscreen = self.parent ? self.parent.screen() : { x: 0, y: 0 };
    return {
      x: pscreen.x + self.x(),
      y: pscreen.y + self.y()
    };
  };

  return obj;
};

box.isbox = function(obj) {
  return obj._is_box || obj._is_view;
};