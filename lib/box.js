var defaults = require('./util').defaults;
var valueof = require('./util').valueof;
var propertize = require('./util').propertize;

var idgenerator = 0;

var box = module.exports = function(options) {
  var obj = defaults(options, {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0.0,
    visible: true,
    clip: false,
    alpha: null,
    debug: false,
    interaction: true, // send interaction events on this box. must be set to true for events to be emitted
    autopropagate: true, // propagate interaction events to child boxes. if false, the parent needs to call `e.propagate()` on the event
    id: function() { return this._id; },
  });

  // turn all attributes except `onxxx` and anything that begins with a '_' to properties.
  propertize(obj, function(attr) {
    return !(attr.indexOf('on') === 0 || attr.indexOf('_') === 0);
  });

  obj._id = 'BOX.' + idgenerator++;
  obj._is_box  = true;
  obj._children = {};

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
    setTimeout(function() {
      self.emit.apply(self, args);
    }, 5);
  };

  obj.on = function(event, handler) {
    var self = this;
    if (!_subscriptions) return;
    var handlers = _subscriptions[event];
    if (!handlers) handlers = _subscriptions[event] = [];
    handlers.push(handler);

    return self;
  };

  obj.removeAllListeners = function(event) {
    var self = this;
    if (!_subscriptions) return;
    delete _subscriptions[event];
    return self;
  };

  obj.removeListener = obj.off = function(event, handler) {
    var self = this;
    if (!_subscriptions) return;
    var handlers = _subscriptions[event];

    var found = -1;
    for (var i = 0; i < handlers.length; ++i) {
      if (handlers[i] === handler) {
        found = i;
      }
    }

    if (found !== -1) {
      handlers.splice(found, 1);
    }

    return self;
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
  obj.add = obj.push = function(child) {
    var self = this;
    if (Array.isArray(child)) {
      return child.forEach(function(c) {
        self.add(c);
      });
    }

    if (!box.isbox(child)) {
      throw new Error('can only add boxes as children to a box');
    }

    child.parent = self;

    self._children[child._id] = child;

    self.queue('child', child);

    return child;
  };

  obj.tofront = function() {
    var self = this;
    if (!self.parent) throw new Error('`tofront` requires that the box will have a parent');
    var parent = self.parent;
    parent.remove(self);
    parent.push(self);
    return self;
  };

  obj.siblings = function() {
    var self = this;
    if (!self.parent) return [ self ]; // detached, no siblings but self
    return self.parent.all();
  };

  obj.prev = function() {
    var self = this;
    if (!self.parent) throw new Error('box must be associated with a parent')
    var children = self.parent._children;
    var previd = null;

    for (var sibling_id in children) {
      if (sibling_id === self._id.toString()) {
        
        if (!previd) return null; // first child.
        return children[previd];
      }

      previd = sibling_id;
    }

    return null;
  };

  // removes a child (or self from parent)
  obj.remove = function(child) {
    var self = this;

    if (!child) {
      if (!self.parent) throw new Error('`remove()` will only work if you have a parent');
      self.parent.remove(self);
      return child;
    }

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
    return self;
  };

  // retrieve a child by it's `id()` property (or _id). children without
  // this property cannot be retrieved using this function.
  obj.get = function(id) {
    var self = this;
    for (var k in self._children) {
      var child = self._children[k];
      if (child.id === id) {
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

  /// ### box.rest([child])
  /// Returns all the children that are not `child` (or do the same on the parent if `child` is null)
  obj.rest = function(child) {
    var self = this;
    if (!child) {
      if (!obj.parent) throw new Error('cannot call `rest()` without a parent');
      return obj.parent.rest(self);
    }
    return Object.keys(self._children)
      .filter(function(k) { return k != child._id; })
      .map(function(k) { return self._children[k]; });
  };


  // returns the first child
  obj.first = function() {
    var self = this;
    var keys = self._children && Object.keys(self._children);
    if (!keys || keys.length === 0) return null;
    return self._children[keys[0]];
  };

  // returns a tree representation this box and all it's children
  obj.tree = function(indent) {
    var box = this;
    indent = indent || 0;

    var s = '';
    for (var i = 0; i < indent; ++i) {
      s += ' ';
    }

    s += box.id + '\n';
    
    box.all().forEach(function(child) {
      s += child.tree(indent + 2);
    });

    return s;
  }

  // if `children` is defined in construction, add them and
  // replace with a property so we can treat children as an array
  if (obj.children) {
    obj.add(obj.children);
    delete obj.children;
  }

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

    if (!self.visible || self.alpha === 0.0) return;

    ctx.save();

    if (self.rotation) {
      var centerX = self.x + self.width / 2;
      var centerY = self.y + self.height / 2;
      ctx.translate(centerX, centerY);
      ctx.rotate(self.rotation);
      ctx.translate(-centerX, -centerY);
    }

    // stuff that applies to all children
    ctx.translate(self.x, self.y);
    if (self.alpha) ctx.globalAlpha = self.alpha;

    if (self.clip) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(self.width, 0);
      ctx.lineTo(self.width, self.height);
      ctx.lineTo(0, self.height);
      ctx.closePath();
      ctx.clip();
    }

    ctx.save();

    // stuff that applies only to this child

    // emit a `frame` event
    self.emit('frame');

    // call `ondraw` for rendering.
    if (self.ondraw) {
      if (self.width > 0 && self.height > 0) {
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
  };

  // -- interactivity

  // given a `pt` in box coordinates, returns a child
  // that resides in those coordinates. returns { child, child_pt }
  // `filter` is a function that, if returns `false` will ignore a child.
  obj.hittest = function(pt, filter) {
    var self = this;

    if (!pt || !('x' in pt) || !('y' in pt)) return;

    // we go in reverse order because the box stack is based on this.
    var ids = Object.keys(self._children).reverse();

    for (var i = 0; i < ids.length; ++i) {
      var child = self._children[ids[i]];

      // ignore child if filter is activated
      if (filter && !filter(child)) continue;

      if (pt.x >= child.x &&
          pt.y >= child.y &&
          pt.x <= child.x + child.width &&
          pt.y <= child.y + child.height) {
        
        // convert to child coords
        var child_x = pt.x - child.x;
        var child_y = pt.y - child.y;

        return {
          child: child,
          child_pt: { x: child_x, y: child_y }
        };
      }
    }

    return null;
  };
  
  obj.interact = function(event, pt) {
    var self = this;

    // emit events for all children that required to capture them.
    self._emit_captures(event, pt);

    // if this box does not interaction events, ignore.
    if (!self.interaction) return;

    // queue the event locally to this box
    if (self.debug) console.log('[' + self.id + ']', event, pt);
    self.emit(event, pt);

    // nothing to do if `propagate` is false.
    if (!self.autopropagate) return;

    return self.propagate(event, pt);
  };

  // propagates an event to any child box that is hit by `pt`.
  // `pt` is in box coordinates and the event is propagated in child coordinates.
  obj.propagate = function(event, pt) {
    var self = this;

    // check if the event should be propagated to one of the children
    var hit = self.hittest(pt, function(child) { return child.interaction; });
    if (hit) {
      return hit.child.interact(event, hit.child_pt);
    }

    return false;
  };

  // returns the screen coordinates of this obj
  obj.screen = function() {
    var self = this;

    if (self.canvas) {
      return {
        x: self.canvas.offsetParent.offsetLeft + self.canvas.offsetLeft,
        y: self.canvas.offsetParent.offsetTop + self.canvas.offsetTop,
      };
    }

    var pscreen = self.parent ? self.parent.screen() : { x: 0, y: 0 };
    return {
      x: pscreen.x + self.x,
      y: pscreen.y + self.y,
    };
  };

  // translates `pt` in the current box's coordinates to `box` coordinates.
  obj.translate = function(pt, box) {
    var boxscreen = box.screen();
    var myscreen = this.screen();
    return {
      x: pt.x + myscreen.x - boxscreen.x,
      y: pt.y + myscreen.y - boxscreen.y,
    };
  };

  // -- capture events

  // emits events to all boxes that called `startCapture`.
  obj._emit_captures = function(event, pt) {
    var self = this;
    if (!self._captures) return; // no captures on this level (only on root)
    for (var id in self._captures) {
      var child = self._captures[id];
      var child_pt = self.translate(pt, child);
      child.emit(event, child_pt);
    }
  };

  // registers this box to receive all interaction events until `stopCapture` is called.
  obj.startCapture = function() {
    var root = this.root();
    var captures = root._captures;
    if (!captures) captures = root._captures = {};
    captures[this._id] = this;
  };

  // stops sending all events to this box.
  obj.stopCapture = function() {
    var root = this.root();
    var captures = root._captures;
    if (!captures) return;
    delete captures[this._id];
  };

  return obj;
};

box.isbox = function(obj) {
  return obj._is_box || obj._is_view;
};