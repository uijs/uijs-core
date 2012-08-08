var defaults = require('./util').defaults;
var valueof = require('./util').valueof;
var propertize = require('./util').propertize;
var animate = require('./animation');
var autobind = require('./bind').autobind;

var EventEmitter = require('./events').EventEmitter;

var idgenerator = 0;

var box = module.exports = function(options) {
  var attributes = defaults(options, {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    children: [],
    rotation: 0.0,
    visible: true,
    clip: false,
    alpha: null,
    debug: false,
    interaction: true, // send interaction events on this box. must be set to true for events to be emitted
    autopropagate: true, // propagate interaction events to child boxes. if false, the parent needs to call `e.propagate()` on the event
    _id: 'BOX.' + idgenerator++,
  });

  attributes.id = attributes.id || attributes._id;
  
  // TODO: extend()
  var obj = new EventEmitter();

  for (var k in attributes) {
    obj[k] = attributes[k];
  }

  // Create properties from binded vars
  autobind(obj);

  obj.watch('children', function(c, bound) { 
    if (!bound) {
      var _push = c.push;

      c.forEach(function(i) {
        i.parent = obj;
      });

      c.push = function(child) {
        child.parent = obj;
        return _push.apply(c, arguments);
      };
    } else {
      console.warn('warning: box.children is bound to a function - child.parent will not be automatically set');
    }
  });

  obj._is_box  = true;

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
    self.children.push(child);

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
    var children = self.parent.children;
    var my_index = children.indexOf(self);
    if (my_index === 0) return null;
    else return children[my_index - 1];
  };

  // removes a child (or self from parent)
  obj.remove = function(child) {
    var self = this;

    if (!child) {
      if (!self.parent) throw new Error('`remove()` will only work if you have a parent');
      self.parent.remove(self);
      return child;
    }

    var children = self.children;

    var child_index = children.indexOf(child);
    if (child_index === -1) return;
    children.splice(child_index, 1);
    child.parent = null;
    return child;
  };

  // removes all children
  obj.empty = function() {
    var self = this;
    self.children = [];
    return self;
  };

  // retrieve a child by it's `id()` property (or _id). children without
  // this property cannot be retrieved using this function.
  obj.get = function(id) {
    var self = this;
    var result = self.children.filter(function(child) {
      return child.id === id;
    });

    return result.length === 0 ? null : result[0];
  };

  // ### box.query(id)
  // Retrieves a child from the entire box tree by id.
  obj.query = function(id) {
    var self = this;
    var child = self.get(id);
    if (child) return child;

    var children = self.children;
    for (var i = 0; i < children.length; ++i) {
      var child = children[i];
      var result = child.query(id);
      if (result) {
        return result;
      }
    }
  };

  /// ### box.all()
  /// Returns all the children of this box.
  obj.all = function() {
    var self = this;
    return self.children;
  };

  /// ### box.rest([child])
  /// Returns all the children that are not `child` (or do the same on the parent if `child` is null)
  obj.rest = function(child) {
    var self = this;
    if (!child) {
      if (!obj.parent) throw new Error('cannot call `rest()` without a parent');
      return obj.parent.rest(self);
    }

    return self.children.filter(function(c) {
      return c.id !== child.id;
    });
  };

  // returns the first child
  obj.first = function() {
    var self = this;
    return self.children[0];
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
    
    box.children.forEach(function(child) {
      s += child.tree(indent + 2);
    });

    return s;
  }

  /// ## Drawing
  
  /// ### box.draw(ctx)
  /// This function is called every frame. It draws the current box (by means of calling `ondraw`)
  /// and then draws the box's children iteratively. This function also implements a few of the basic
  /// drawing capabilities and optimizations: buffering, scaling, rotation.
  // TODO: passing many vars for calculations if to draw boxes or not, see if this optimization is indeed needed, and if so find better way to do it
  obj.draw = function(ctx) {
    var self = this;
    if (!self.visible || self.alpha === 0.0) return;
    
    // Return if this box is not in the visible area of the screen
    // TODO: If we know the axis on which the box moves, we can change the order of these tests and improve performance

    var selfY = self.y;
    var selfHeight = self.height;
    var selfX = self.x;
    var selfWidth = self.width;

    ctx.save();

    if (self.rotation) {
      var centerX = selfX + selfWidth / 2;
      var centerY = selfY + selfHeight / 2;
      ctx.translate(centerX, centerY);
      ctx.rotate(self.rotation);
      ctx.translate(-centerX, -centerY);
    }

    // stuff that applies to all children
    ctx.translate(selfX, selfY);
    if (self.alpha) ctx.globalAlpha = self.alpha;

    if (self.clip) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(selfWidth, 0);
      ctx.lineTo(selfWidth, selfHeight);
      ctx.lineTo(0, selfHeight);
      ctx.closePath();
      ctx.clip();
    }

    var children = self.children;

    // stuff that applies only to this child
    ctx.save();

    // emit a `frame` event
    self.emit('frame');

    // call `ondraw` for rendering.
    if (self.ondraw) {
      if (selfWidth > 0 && selfHeight > 0) {
        self.ondraw(ctx);
      }
    }

    ctx.restore();

    children.forEach(function(child) {
      //TODO: do not draw child if out of viewport
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
    var children = self.children.map(function(x){return x;}).reverse();

    for (var i = 0; i < children.length; ++i) {
      var child = children[i];

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

    // queue the event locally to this box (if not capturing)
    if (self.debug) console.log('[' + self.id + ']', event, pt);
    if (!self.capturing()) {
      self.emit(event, pt);
    }

    // nothing to do if `propagate` is false.
    if (self.autopropagate) {
      self.propagate(event, pt);
    }

    // delete all captures that were stopped during this cycle.
    // if we delete them immediately, we get duplicate events if `stopCapture`
    // is called by the event handler (and then self.capturing() is true).
    self._delete_captures();

    return true;
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

  // delete all captures that were stopped during this event cycle
  obj._delete_captures = function() {
    var self = this;
    if (!self._captures_to_delete) return;
    if (self._captures) {
      self._captures_to_delete.forEach(function(id) {
        delete self._captures[id];
      });
    }

    self._captures_to_delete = [];
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
    if (!root._captures_to_delete) {
      root._captures_to_delete = [];
    }
    root._captures_to_delete.push(this._id);
  };

  // returns true if events are currently captured by this box.
  obj.capturing = function() {
    var root = this.root();
    var captures = root._captures;
    if (!captures) return false;
    return this._id in captures;
  };

  // some sugar events/gestures

  obj.on('touchstart', function() {
    this.startCapture();
  });

  obj.on('touchend', function(pt) {
    this.stopCapture();

    if (!pt ||
        pt.x < 0 || pt.x > this.width ||
        pt.y < 0 || pt.y > this.height) {
      return;
    }

    this.emit('click', pt);
  });

  // -- animation

  obj.animate = function(properties, options) {
    var self = this;
    Object.keys(properties).forEach(function(k) {
      var curr = self[k];
      var target = properties[k];
      if (self.debug) console.log('[' + self.id + ']', 'animating', k, 'from', curr, 'to', target);
      self[k] = animate(curr, target, options);
    });
  };  

  return obj;
};

box.isbox = function(obj) {
  return obj._is_box || obj._is_view;
};