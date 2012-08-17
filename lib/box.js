var defaults = require('./util').defaults;
var valueof = require('./util').valueof;
var propertize = require('./util').propertize;
var animate = require('./animation');
var autobind = require('./bind').autobind;
var bind = require('./bind');

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
    recalculate: true,
    redraw: true,
    invalidatingVars: []  
  });

  attributes.id = attributes.id || attributes._id;
  
  // TODO: extend()
  var obj = new EventEmitter();

  for (var k in attributes) {
    obj[k] = attributes[k];
  }

  // Create properties from binded vars
  autobind(obj);

  obj.watch('children', function(c) {
    var _push = c.push;

    c.forEach(function(i) {
      i.parent = obj;
    });

    c.push = function(child) {
      child.parent = obj;
      return _push.apply(c, arguments);
    };
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

    var newChildren = [];
    var numOfChildren = self.children.length;
    for (var i = 0; i < numOfChildren; i++) {
      newChildren.push(self.children.shift());
    };

    newChildren.push(child);

    //TODO: this is to make the setter of the property change to
    //      make sure handlers of changed children execute. Need to resolve this hack, also change push, remove, etc..
    self.children = newChildren;
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

  function freezer(fn) { 
    function freezerInnerFunction(ctx){ 
      this.$freeze = {}; 
      var ret = fn.call(this, ctx); 
      this.$freeze = false;
      //delete this.$freeze; 
      return ret; 
    }

    return freezerInnerFunction; 
  } 

  var boundToFunction = {};

  function on_property_value_changed(){
    this.recalculate = true;
  }

  function on_bind_type_changed(prop, bound_to_function){
    if (bound_to_function){
      boundToFunction[prop] = true;
    }
    else{
      delete boundToFunction[prop];
    }
  }

  function add_watch_to_var(varName){
    boundToFunction[varName] = true;
    this.watch(varName, on_property_value_changed, on_bind_type_changed);
  }

  /// ## Drawing
  
  /// ### box.draw(ctx)
  /// This function is called every frame. It draws the current box (by means of calling `ondraw`)
  /// and then draws the box's children iteratively. This function also implements a few of the basic
  /// drawing capabilities and optimizations: buffering, scaling, rotation.
  // TODO: passing many vars for calculations if to draw boxes or not, see if this optimization is indeed needed, and if so find better way to do it
  function draw(ctx) {
    var self = this;

    var selfX = self.x;
    var selfY = self.y;
    var selfWidth = widthCache;
    var selfHeight = heightCache;

    ctx.save();

    if (self.rotation) {
      var centerX = selfX + selfWidth / 2;
      var centerY = selfY + selfHeight / 2;
      ctx.translate(centerX, centerY);
      ctx.rotate(rotationCache);
      ctx.translate(-centerX, -centerY);
    }

    // stuff that applies to all children
    ctx.translate(selfX, selfY);
    if (alphaCache) ctx.globalAlpha = alphaCache;

    if (clipCache) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(selfWidth, 0);
      ctx.lineTo(selfWidth, selfHeight);
      ctx.lineTo(0, selfHeight);
      ctx.closePath();
      ctx.clip();
    }

    // call `ondraw` for rendering.
    if (onDrawFunctionCache) {
      ctx.save();

      onDrawFunctionCache.call(self, ctx);

      self.recalculate = false;
      ctx.restore();
    }

    var children = childrenCache;
    var childrenlength = children.length;
    for (var i = 0; i < childrenlength; i++) {
      //TODO: do not draw child if out of viewport
      children[i].draw(ctx);
    };

    if(debugCache){
      function drawborder() {
        ctx.strokeStyle = 'blue';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(selfWidth, 0);
        ctx.lineTo(selfWidth, selfHeight);
        ctx.lineTo(0, selfHeight);
        ctx.closePath();
        ctx.stroke();
      }

      drawborder();
    }

    ctx.restore();
  };

  function draw_simple_container_with_self_drawing(ctx) {
    var self = this;

    ctx.save();

    // stuff that applies to all children
    ctx.translate(self.x, self.y);

    onDrawFunctionCache.call(self, ctx);

    self.recalculate = false;

    var children = childrenCache;
    var childrenlength = children.length;
    for (var i = 0; i < childrenlength; i++) {
      //TODO: do not draw child if out of viewport
      children[i].draw(ctx);
    };

    ctx.restore();
  };

  var bufferCanvas = document.createElement("canvas");
  bufferCanvas.x = 0;
  bufferCanvas.y = 0;
  var bc = bufferCanvas.getContext('2d');

  function draw_simple_container(ctx) {
    var self = this;

    ctx.save();

    // stuff that applies to all children
    ctx.translate(self.x, self.y);

    var children = childrenCache;
    var childrenlength = children.length;
    for (var i = 0; i < childrenlength; i++) {
      //TODO: do not draw child if out of viewport
      children[i].draw(ctx);
    };

    ctx.restore();
  };

  function pre_draw(ctx){
    // touch all properties bound to functions to triger invalidation if necessary
    var keys = Object.keys(boundToFunction);
    var keys_length = keys.length;
    for (var i = 0; i < keys_length; i++) {
      this[keys[i]]; 
    };

    //var keys = Object.keys(boundToFunction).concat();
    //var key = keys.shift()
    //while (key){
    //  this[key];
    //  key = keys.shift();
    //}

    this.innerdraw(ctx);
  }

  function simple_draw(ctx) {
    onDrawFunctionCache.call(this, ctx);
    this.recalculate = false;
  };

  function empty_draw(ctx) {};

  function first_draw(ctx) {
    var self = this;

    // these vars were defined by the creator of the box as needed for calculating
    // whether it is invalidated (and needs recalculating) or not
    for (var i = 0; i < self.invalidatingVars.length; i++) {
      add_watch_to_var.call(self, self.invalidatingVars[i]);
    };

    // watching the below vars to determine if need to change the draw function
    boundToFunction['clip'] = true;
    self.watch('clip', on_clip_value_changed, on_bind_type_changed);

    boundToFunction['rotation'] = true;
    self.watch('rotation', on_rotation_value_changed, on_bind_type_changed);

    boundToFunction['debug'] = true;
    self.watch('debug', on_debug_value_changed, on_bind_type_changed);

    boundToFunction['children'] = true;
    self.watch('children', on_children_value_changed, on_bind_type_changed);

    boundToFunction['ondraw'] = true;
    self.watch('ondraw', on_ondraw_value_changed, on_bind_type_changed);

    boundToFunction['alpha'] = true;
    self.watch('alpha', on_alpha_value_changed, on_bind_type_changed);

    boundToFunction['width'] = true;
    self.watch('width', on_width_value_changed, on_bind_type_changed);

    boundToFunction['height'] = true;
    self.watch('height', on_height_value_changed, on_bind_type_changed);

    boundToFunction['visible'] = true;
    self.watch('visible', on_visible_value_changed, on_bind_type_changed);

    self.draw = freezer(pre_draw);
  };

  var visibleCache = false;
  var alphaCache = 0.0;
  var widthCache = 0;
  var heightCache = 0;
  var childrenCache = [];
  var debugCache = false;
  var onDrawFunctionCache = null;
  var clipCache = false;
  var rotationCache = null;
  function determine_draw_function_and_execute(ctx){
    var self = this;

    if(!visibleCache || alphaCache === 0.0 || widthCache <= 0 || heightCache <= 0){
      self.innerdraw = empty_draw; 
    }
    else if((!alphaCache || alphaCache === 1.0) && (!rotationCache || rotationCache === 0) && !clipCache && !debugCache){
      if(!childrenCache || childrenCache.length === 0){
        if(onDrawFunctionCache){
          bufferCanvas.width = widthCache;
          bufferCanvas.height = heightCache;
          self.innerdraw = simple_draw; 
        }
        else{
          self.innerdraw = empty_draw; 
        }
      }
      else{ // has children
        if(onDrawFunctionCache){
          self.innerdraw = draw_simple_container_with_self_drawing;
        }
        else{
          self.innerdraw = draw_simple_container; 
        } 
      }
    }
    // TODO: Make this more fine grained by adding more draw function types
    else{ // if((alphaCache >= 0.0 && alphaCache <= 1.0) || rotationCache > 0 || clipCache || debugCache){
      self.innerdraw = draw; 
    }

    self.innerdraw(ctx);
  }

  function on_width_value_changed(new_value, prop, bound_to_function){
    var self = this;

    old_value = widthCache;
    widthCache = new_value;

    if(!new_value || new_value <= 0){
      // if this callback will be called towards the end (and it will because of the order of putting vars in the hash)
      // then no matter which callbacks came before it there will not be any re-calculation
      self.innerdraw = empty_draw;
      return;
    }
    else if(old_value > 0){
      bufferCanvas.width = widthCache;

      //do nothing because the new value is also > 0, so the change doesn't affect visibility of the box
      return;
    }
    else{ 
      // new_value > 0 and old_value <= 0, so we are transffering from empty draw to something else.
      // setting calculate_draw_function to true because determaining the function depends on the other params as well
      self.innerdraw = determine_draw_function_and_execute;
    }
  }

  function on_height_value_changed(new_value, prop, bound_to_function){
    var self = this;

    old_value = heightCache;
    heightCache = new_value;

    if(!new_value || new_value <= 0){
      // if this callback will be called towards the end (and it will because of the order of putting vars in the hash)
      // then no matter which callbacks came before it there will not be any re-calculation
      self.innerdraw = empty_draw;
      return;
    }
    else if(old_value > 0){
      bufferCanvas.height = heightCache;

      //do nothing because the new value is also > 0, so the change doesn't affect visibility of the box
      return;
    }
    else{ 
      // new_value > 0 and old_value <= 0, so we are transffering from empty draw to something else.
      // setting calculate_draw_function to true because determaining the function depends on the other params as well
      self.innerdraw = determine_draw_function_and_execute;
    }
  }

  function on_visible_value_changed(new_value, prop, bound_to_function){
    var self = this;

    visibleCache = new_value;

    if(new_value === false){
      // if this callback will be called towards the end (and it will because of the order of putting vars in the hash)
      // then no matter which callbacks came before it there will not be any re-calculation
      self.innerdraw = empty_draw;
      return;
    }
    else{ 
      // the box was invisible and now is visible.
      // setting calculate_draw_function to true because determaining the function depends on the other params as well
      self.innerdraw = determine_draw_function_and_execute;
    }
  }

  function on_clip_value_changed(new_value, prop, bound_to_function){
    var self = this;

    clipCache = new_value;

    // clip settings have changed.
    // setting calculate_draw_function to true because determaining the function depends on the other params as well
    self.innerdraw = determine_draw_function_and_execute;
  }

  function on_ondraw_value_changed(new_value, prop, bound_to_function){
    var self = this;

    onDrawFunctionCache = new_value;

    // ondraw method was removed or added.
    // setting calculate_draw_function to true because determaining the function depends on the other params as well
    self.innerdraw = determine_draw_function_and_execute;
  }

  function on_rotation_value_changed(new_value, prop, bound_to_function){
    var self = this;

    old_value = rotationCache;
    rotationCache = new_value;

    if(old_value > 0 && new_value > 0){
      //do nothing because both values are > 0, so the change doesn't affect identity of draw function
      return;
    }
    else{ 
      // switching between rotation on and off or vice versa.
      // setting calculate_draw_function to true because determaining the function depends on the other params as well
      self.innerdraw = determine_draw_function_and_execute;
    }
  }

  function on_children_value_changed(new_value, prop, bound_to_function){
    var self = this;

    old_value = childrenCache;
    childrenCache = new_value;

    if(old_value && old_value.length > 0 && childrenCache && childrenCache.length > 0){
      // nothing to do because the old and new number of children are > 0
      return;
    }
    else{ 
      // children are empty and were not before or vise versa.
      // setting calculate_draw_function to true because determaining the function depends on the other params as well
      self.innerdraw = determine_draw_function_and_execute;
    }
  }

  function on_alpha_value_changed(new_value, prop, bound_to_function){
    var self = this;

    old_value = alphaCache;
    alphaCache = new_value;

    if(new_value === 0.0){
      // if this callback will be called towards the end (and it will because of the order of putting vars in the hash)
      // then no matter which callbacks came before it there will not be any re-calculation
      self.innerdraw = empty_draw;
      return;
    }
    else if(old_value > 0.0 && new_value > 0.0){
      //do nothing because both values are > 0.0, so the change doesn't affect identity of draw function
      return;
    }
    else{ 
      // the box was invisible and now is visible.
      // setting calculate_draw_function to true because determaining the function depends on the other params as well
      self.innerdraw = determine_draw_function_and_execute;
    }
  }

  function on_debug_value_changed(new_value, prop, bound_to_function){
    var self = this;

    debugCache = new_value;

    // debug settings have changed.
    // setting calculate_draw_function to true because determaining the function depends on the other params as well
    self.innerdraw = determine_draw_function_and_execute;
  }

  obj.draw = first_draw;

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
        y: self.canvas.offsetParent.offsetTop + self.canvas.offsetTop
      };
    }

    var pscreen = self.parent ? self.parent.screen() : { x: 0, y: 0 };
    return {
      x: pscreen.x + self.x,
      y: pscreen.y + self.y
    };
  };

  // translates `pt` in the current box's coordinates to `box` coordinates.
  obj.translate = function(pt, box) {
    var boxscreen = box.screen();
    var myscreen = this.screen();
    return {
      x: pt.x + myscreen.x - boxscreen.x,
      y: pt.y + myscreen.y - boxscreen.y
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

  // -- animation

  obj.animate = function(properties, options) {
    var self = this;
    Object.keys(properties).forEach(function(k) {
      var curr = self[k];
      var target = properties[k];
      if (self.debug) console.log('[' + self.id + ']', 'animating', k, 'from', curr, 'to', target);
      self[k] = bind(self, k, animate(curr, target, options));
    });
  };  

  return obj;
};

box.isbox = function(obj) {
  return obj._is_box || obj._is_view;
};