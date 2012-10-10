var box = module.exports = {};

// -- interactivity

// filter used to determine if a box should receive interaction events.
function interaction_filter(child) {
  if (!child) return false;
  if (!child.interaction) return false;
  if (!child.visible) return false;
  if (child.alpha == 0.0) return false;
  return true;
}

// given a `pt` in box coordinates, returns a child
// that resides in those coordinates. returns { child, child_pt }
// `filter` is a function that, if returns `false` will ignore a child.
box._hittest = function(pt, filter) {
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

// recursivly checks on which children events at `pt` should be emitted to.
// returns a hash of obj._id and { child, child_pt } pairs.
box.hittest = function(pt) {
  var self = this;

  var hits = {};

  // merges `other` into `hits`
  function merge(other) {
    if (!other) return;
    Object.keys(other).forEach(function(key) {
      hits[key] = other[key];
    });
  }

  // add captured targets
  var captured = self._hit_captures(pt);
  merge(captured);

  // add myself if interaction is enabled
  if (self.interaction) {

    hits[self._id] = {
      child: self,
      child_pt: pt,
    };

    // hit test to check which child we should propgate the hit to
    if (self.autopropagate) {
      var hit = self._hittest(pt, interaction_filter)
      if (hit) {
        var child_hits = hit.child.hittest(hit.child_pt);
        merge(child_hits);
      }
    }
  }

  return hits;
};

box.interact = function(event, pt) {
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
box.propagate = function(event, pt) {
  var self = this;

  // check if the event should be propagated to one of the children
  var hit = self._hittest(pt, interaction_filter);
  if (hit) {
    return hit.child.interact(event, hit.child_pt);
  }

  return false;
};

// translates `pt` in the current box's coordinates to `box` coordinates.
box.translate = function(pt, box) {
  var boxscreen = box.screen;
  var myscreen = this.screen;
  return {
    x: pt.x + myscreen.x - boxscreen.x,
    y: pt.y + myscreen.y - boxscreen.y
  };
};

// -- capture events

box._hit_captures = function(pt) {
  var self = this;
  if (!self._captures) return []; // no captures on this level (only on root)
  var result = {};
  for (var id in self._captures) {
    var child = self._captures[id];
    result[child._id] = {
      child: child,
      child_pt: self.translate(pt, child)
    };
  }

  return result;
};

// emits events to all boxes that called `startCapture`.
box._emit_captures = function(event, pt) {
  var self = this;
  var hits = self._hit_captures(pt);
  Object.keys(hits).forEach(function(k) {
    var hit = hits[k];
    hit.child.emit(event, hit.child_pt);
  });
};

// delete all captures that were stopped during this event cycle
box._delete_captures = function() {
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
box.startCapture = function() {
  var root = this.root();
  var captures = root._captures;
  if (!captures) captures = root._captures = {};
  captures[this._id] = this;
};

// stops sending all events to this box.
box.stopCapture = function() {
  var root = this.root();
  var captures = root._captures;
  if (!captures) return;
  if (!root._captures_to_delete) {
    root._captures_to_delete = [];
  }
  root._captures_to_delete.push(this._id);
};

// returns true if events are currently captured by this box.
box.capturing = function() {
  var root = this.root();
  var captures = root._captures;
  if (!captures) return false;
  return this._id in captures;
};