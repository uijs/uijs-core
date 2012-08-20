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
    invalidatingVars: [],
    $freeze: { frameCount: 0, },
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

  obj._is_box = true;

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

    if (!child._is_box) {
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
  var bufferCanvas = null;//document.createElement("canvas");
  //bufferCanvas.x = 0;
  //bufferCanvas.y = 0;
  var bc = null;//bufferCanvas.getContext('2d');

  //var bufferCanvas = document.createElement("canvas");
  //bufferCanvas.x = 0;
  //bufferCanvas.y = 0;
  //var bc = bufferCanvas.getContext('2d');

  //var calculationsCanvas = document.createElement("canvas");
  //calculationsCanvas.x = 0;
  //calculationsCanvas.y = 0;
  //var ccc = calculationsCanvas.getContext('2d');
  //bc.scale(window.devicePixelRatio, window.devicePixelRatio);
  //bc.scale(4, 4);
  

  /// ### box.draw(ctx)
  /// This function is called every frame. It draws the current box (by means of calling `ondraw`)
  /// and then draws the box's children iteratively. This function also implements a few of the basic
  /// drawing capabilities and optimizations: buffering, scaling, rotation.
  // TODO: passing many vars for calculations if to draw boxes or not, see if this optimization is indeed needed, and if so find better way to do it
  function draw(ctx) {
    var self = this;

    var selfX = xCache;
    var selfY = yCache;
    var selfWidth = widthCache;
    var selfHeight = heightCache;

    ctx.save();

    // TODO: Rotation and clip will probably not work well right now - investigate 
    if (self.rotation) {
      var centerX = selfX + selfWidth / 2;
      var centerY = selfY + selfHeight / 2;
      ctx.translate(centerX, centerY);
      ctx.rotate(rotationCache);
      ctx.translate(-centerX, -centerY);
    }

    // stuff that applies to all children
    //ctx.translate(selfX, selfY);
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
    

    var children = childrenCache;
    var childrenlength = 0;
    if(children){
      childrenlength = children.length;
    }

    if (onDrawFunctionCache && childrenlength > 0) {
      draw_simple_container_with_self_drawing.call(self, ctx);
    }
    else if(childrenlength > 0){
      draw_simple_container.call(self, ctx);
    }
    else if(onDrawFunctionCache){
      simple_draw.call(self, ctx);
    }
    else{
      alert('Jony WTF?!?!?!?!?! no children and no ondraw');
    }

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


  function draw_BU(ctx) {
    var self = this;

    var selfX = xCache;
    var selfY = yCache;
    var selfWidth = widthCache;
    var selfHeight = heightCache;

    ctx.save();

    // TODO: Rotation and clip will probably not work well right now - investigate 
    if (self.rotation) {
      var centerX = selfX + selfWidth / 2;
      var centerY = selfY + selfHeight / 2;
      ctx.translate(centerX, centerY);
      ctx.rotate(rotationCache);
      ctx.translate(-centerX, -centerY);
    }

    // stuff that applies to all children
    //ctx.translate(selfX, selfY);
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
    

    var children = childrenCache;
    var childrenlength = 0;
    if(children){
      childrenlength = children.length;
    }

    var returnValue = null;
    if (onDrawFunctionCache && childrenlength > 0) {
      returnValue = draw_simple_container_with_self_drawing.call(self, ctx);
    }
    else if(childrenlength > 0){
      returnValue = draw_simple_container.call(self, ctx);
    }
    else if(onDrawFunctionCache){
      returnValue = simple_draw.call(self, ctx);
    }
    else{
      alert('WTF?!?!?!?!?! no children and no ondraw');
    }

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

    return returnValue;
  };

  function draw_simple_container_with_self_drawing_BU(ctx) {
    
    // support boxes defined by user where invalidatingVars are not defined and therefore
    // we assume that recalculate is always true
    this.recalculate = (this.invalidatingVars && this.invalidatingVars.length > 0) ? this.recalculate : true;

    var images = [];
    var children = childrenCache;
    var childrenlength = children.length;
    var useCache = true;
    for (var i = 0; i < childrenlength; i++) {
      var image = children[i].draw();
      images[i] = image;
      if(!image.cached){
        useCache = false;
      }
    };

    if(useCache && (this.recalculate || positioningChanged)){
      this.useCache = false;
    }

    if(!useCache){
      var scale = useGivenBuffer ? 2 : 1; //TODO: verify that scale === 2 only if useGivenBuffer is true
      ctx.save();
      ctx.scale(scale,scale);
      //ctx.clearRect(0, 0, widthCache, heightCache);
      onDrawFunctionCache.call(this, ctx);
      ctx.restore();
      var imageslength = images.length;
      for (var i = 0; i < imageslength; i++) {
        var image = images[i];
        if(!image.empty){
          ctx.drawImage(image.image, image.x * scale, image.y * scale);     
        }
      };      
    }

    return {
      image: ctx.canvas,
      cached: ((useCache && !positioningChanged) ? true : false),
      x: xCache,
      y: yCache,
    };
  };

  function draw_simple_container(ctx) {
    var children = childrenCache;
    var childrenlength = children.length;
    ctx.save();
    ctx.translate(xCache, yCache);
    for (var i = 0; i < childrenlength; i++) {
      children[i].draw(ctx);
    };
    ctx.restore();
  };

  var lastYoWithNoCache = 0;
  function draw_simple_container_BU(ctx) {
    var images = [];
    var children = childrenCache;
    var childrenlength = children.length;
    var useCache = true;
    for (var i = 0; i < childrenlength; i++) {
      var image = children[i].draw();
      images[i] = image;
      if(!image.cached){
        useCache = false;
      }
    };
    var scale = 2;

    //TODO: move this support to the correct function
    var xo = 0;
    var yo = 0;
    clipToFitParent = false;
    if(clipToFitParent){
      xo = Math.min(0, xCache);
      yo = Math.min(0, yCache);
    }

    if(useCache && positioningChanged && (clipToFitParent || useGivenBuffer)){
      useCache = false;
    }

    if(!useCache){
      lastYoWithNoCache = yo;
      var imageslength = images.length;
      if(/*imageslength <= 1 && */useGivenBuffer && useGivenBufferMidLevel){
        //do nothing
        // TODO: verify that the condition for the number of images is correct..
      }
      else{
        //var scale = useGivenBuffer ? 2 : 1;
        //ctx.clearRect(0, 0, widthCache * scale, heightCache * scale);
        if(useGivenBuffer){
          ctx.save();
          ctx.translate(xCache * scale, yCache * scale);
        }
        for (var i = 0; i < imageslength; i++) {
          var image = images[i];
          if(!image.empty){
            //ctx.drawImage(image.image, (image.x + xo) * scale, (image.y + yo) * scale);     
            ctx.drawImage(image.image, (image.x + xo), (image.y + yo));     
          }
        }
        if(useGivenBuffer){
          ctx.restore();
        }
      }      
    }

    return {
      image: ctx.canvas,
      cached: ((useCache && !positioningChanged) ? true : false),
      x: clipToFitParent ? Math.max(0, xCache) : xCache,
      y: clipToFitParent ? Math.max(0, yCache) : yCache,
    };
  };

  // TODO: Change name to draw
  function pre_draw(ctx){
    // touch all properties bound to functions to triger invalidation if necessary
    var keys = Object.keys(boundToFunction);
    var keys_length = keys.length;
    for (var i = 0; i < keys_length; i++) {
      this[keys[i]]; 
    };

    this.innerdraw(ctx);

    this.recalculate = false;
  }

  function post_draw(){

  }

  //function simple_draw(ctx) {
  //  onDrawFunctionCache.call(this, ctx);
  //}

  function pre_draw_BU(){
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

    var returnValue = this.innerdraw(bc);

    this.recalculate = false;
    positioningChanged = false;

    return returnValue;
  }

  function simple_draw(ctx) {
    ctx.save();
    if(this.useBuffer){
      if(this.recalculate){
        bc.clearRect(0,0,widthCache,heightCache);
        onDrawFunctionCache.call(this, bc);
      }
      var scale = 2;//window.devicePixelRatio;
      ctx.scale(1/scale,1/scale);
      ctx.drawImage(bc.canvas, xCache * scale, yCache * scale);
    }
    else{
      ctx.translate(xCache, yCache);
      onDrawFunctionCache.call(this, ctx);
    }
    ctx.restore();
  }

  function simple_draw_BU(ctx) {
    if (this.recalculate && !useGivenBuffer){
      ccc.clearRect(0, 0, widthCache * 2, heightCache * 2);
      onDrawFunctionCache.call(this, ccc);

      bc.drawImage(ccc.canvas, 0, 0);
    }

    if (useGivenBuffer){
      ctx.save();
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      ctx.translate(xCache, yCache);
      ctx.clearRect(0, 0, widthCache, heightCache);
      onDrawFunctionCache.call(this, ctx);
      ctx.restore();
    }
    

    return {
      image: bc.canvas,
      cached: ((positioningChanged || this.recalculate) ? false : true),
      x: xCache,
      y: yCache,
    };
  }

  function empty_draw(ctx) {};

  //TODO: Probably need to reutrn something here, or check above that there is an image and only if there is then
  //      add it to the array
  function empty_draw_BU(ctx) {
    return {
      cached: true,
      empty: true,
    };
  };

  function first_draw(ctx) {
    var self = this;

    // these vars were defined by the creator of the box as needed for calculating
    // whether it is invalidated (and needs recalculating) or not
    for (var i = 0; i < self.invalidatingVars.length; i++) {
      add_watch_to_var.call(self, self.invalidatingVars[i]);
    };

    // watching the below vars to determine if need to change the draw function
    // the order here is important because the last vars determine whether the 
    // box is visible or not and set the drawing function to be empty directly
    // without further calcs. If they are not last in the chain then some other
    // callback will set the flag that we need more calcs to determine the draw
    // function to 'true' and it will cost us some performance
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

    boundToFunction['x'] = true;
    self.watch('x', on_x_value_changed, on_bind_type_changed);

    boundToFunction['y'] = true;
    self.watch('y', on_y_value_changed, on_bind_type_changed);

    boundToFunction['alpha'] = true;
    self.watch('alpha', on_alpha_value_changed, on_bind_type_changed);

    boundToFunction['width'] = true;
    self.watch('width', on_width_value_changed, on_bind_type_changed);

    boundToFunction['height'] = true;
    self.watch('height', on_height_value_changed, on_bind_type_changed);

    boundToFunction['visible'] = true;
    self.watch('visible', on_visible_value_changed, on_bind_type_changed);

    self.draw = pre_draw;
  };

  function first_draw_BU(ctx) {
    var self = this;

    // these vars were defined by the creator of the box as needed for calculating
    // whether it is invalidated (and needs recalculating) or not
    for (var i = 0; i < self.invalidatingVars.length; i++) {
      add_watch_to_var.call(self, self.invalidatingVars[i]);
    };

    // watching the below vars to determine if need to change the draw function
    // the order here is important because the last vars determine whether the 
    // box is visible or not and set the drawing function to be empty directly
    // without further calcs. If they are not last in the chain then some other
    // callback will set the flag that we need more calcs to determine the draw
    // function to 'true' and it will cost us some performance
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

    boundToFunction['x'] = true;
    self.watch('x', on_x_value_changed, on_bind_type_changed);

    boundToFunction['y'] = true;
    self.watch('y', on_y_value_changed, on_bind_type_changed);

    boundToFunction['alpha'] = true;
    self.watch('alpha', on_alpha_value_changed, on_bind_type_changed);

    boundToFunction['width'] = true;
    self.watch('width', on_width_value_changed, on_bind_type_changed);

    boundToFunction['height'] = true;
    self.watch('height', on_height_value_changed, on_bind_type_changed);

    boundToFunction['visible'] = true;
    self.watch('visible', on_visible_value_changed, on_bind_type_changed);

    self.draw = pre_draw;

    // return cached = true so the parent will not redraw itself if not necessary
    // cause there is nothing to draw here in this frame
    return {cached: true, empty: true,};
  };

  var canvasNeedsResizing = false;

  function resize_buffer_canvas(scale){
    if(!this.useBuffer){
      return;
    }

    if(!bufferCanvas){
      bufferCanvas = document.createElement("canvas");
      bufferCanvas.x = 0;
      bufferCanvas.y = 0;
    }
    
    var w = widthCache * scale;
    var h = heightCache * scale;

    bufferCanvas.width = w;
    bufferCanvas.height = h;
    
    bc = bufferCanvas.getContext('2d');
    bc.scale(scale, scale);
  }

  var useGivenBuffer = false;
  var useGivenBufferMidLevel = false;
  var clipToFitParent = false;
  
  function resize_buffer_canvas_BU(scale){
    if(useGivenBuffer){
      return;
    }

    // TODO: make this in relation to the parent 
    var screenWidth = window.innerWidth;
    var screenHeight = window.innerHeight;
    clipToFitParent = false;
    var w = widthCache;
    var h = heightCache;
    if(widthCache > screenWidth || heightCache > screenHeight){
      clipToFitParent = true;
      w = Math.min(w, screenWidth);
      h = Math.min(h, screenHeight);
    }

    calculationsCanvas.width = w * scale;
    calculationsCanvas.height = h * scale;
    //bufferCanvas.style.width = (w ? w.toString() : '0');
    //bufferCanvas.style.height = (h ? h.toString() : '0');
    //TODO: Fix this according to the correct pixel ratio
    ccc = calculationsCanvas.getContext('2d');
    ccc.scale(scale, scale);



    // TODO: make this in relation to the parent 
    var screenWidth = window.innerWidth;
    var screenHeight = window.innerHeight;
    clipToFitParent = false;
    var w = widthCache;
    var h = heightCache;
    if(widthCache > screenWidth || heightCache > screenHeight){
      clipToFitParent = true;
      w = Math.min(w, screenWidth);
      h = Math.min(h, screenHeight);
    }

    bufferCanvas.width = w;
    bufferCanvas.height = h;
    //bufferCanvas.style.width = (w ? w.toString() : '0');
    //bufferCanvas.style.height = (h ? h.toString() : '0');
    //TODO: Fix this according to the correct pixel ratio
    bc = bufferCanvas.getContext('2d');
    bc.scale(1 / scale, 1 / scale);
  }

  obj.permiateOriginalCanvas = function(canvas, context, levels){
    this.width = canvas.width / window.devicePixelRatio;
    this.height = canvas.height / window.devicePixelRatio;
    levels--;
    if(levels > 0){
      for (var i = 0; i < this.children.length; i++) {
        this.children[i].permiateOriginalCanvas(canvas, context, levels);
      };
    }
  }

  obj.permiateOriginalCanvas_BU = function(canvas, context, levels){
    bufferCanvas = canvas;
    bc = context;
    useGivenBuffer = true;

    levels--;
    if(levels > 0){
      useGivenBufferMidLevel = true;
      this.width = canvas.width / window.devicePixelRatio;
      this.height = canvas.height / window.devicePixelRatio;
      for (var i = 0; i < this.children.length; i++) {
        this.children[i].permiateOriginalCanvas(canvas, context, levels);
      };
      //this.children[0]
    }
  }

  var visibleCache = false;
  var alphaCache = 0.0;
  var xCache = 0;
  var yCache = 0;
  var widthCache = 0;
  var heightCache = 0;
  var childrenCache = [];
  var debugCache = false;
  var onDrawFunctionCache = null;
  var clipCache = false;
  var rotationCache = null;
  var positioningChanged = false;
  function determine_draw_function_and_execute(ctx){
    var self = this;

    if(!visibleCache || alphaCache === 0.0 || widthCache <= 0 || heightCache <= 0){
      self.innerdraw = empty_draw; 
    }
    else if((!alphaCache || alphaCache === 1.0) && (!rotationCache || rotationCache === 0) && !clipCache && !debugCache){
      if(!childrenCache || childrenCache.length === 0){
        if(onDrawFunctionCache){
          if (canvasNeedsResizing){
            resize_buffer_canvas.call(self, window.devicePixelRatio);
            canvasNeedsResizing = false;  
          }

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

    return self.innerdraw(ctx);
  }

  function determine_draw_function_and_execute_BU(ctx){
    var self = this;

    if(!visibleCache || alphaCache === 0.0 || widthCache <= 0 || heightCache <= 0){
      self.innerdraw = empty_draw; 
    }
    else if((!alphaCache || alphaCache === 1.0) && (!rotationCache || rotationCache === 0) && !clipCache && !debugCache){
      if(!childrenCache || childrenCache.length === 0){
        if(onDrawFunctionCache){
          if (canvasNeedsResizing){
            resize_buffer_canvas(2);
            canvasNeedsResizing =false;  
          }
          
          self.innerdraw = simple_draw; 
        }
        else{
          self.innerdraw = empty_draw; 
        }
      }
      else{ // has children
        if (canvasNeedsResizing){
          resize_buffer_canvas(1);
          canvasNeedsResizing = false;  
        }
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

    return self.innerdraw(ctx);
  }

  function on_x_value_changed(new_value, prop, bound_to_function){
    var self = this;

    old_value = xCache;
    xCache = new_value;
    positioningChanged = true;
  }

  function on_y_value_changed(new_value, prop, bound_to_function){
    var self = this;

    old_value = yCache;
    yCache = new_value;
    positioningChanged = true;
  }

  function on_width_value_changed(new_value, prop, bound_to_function){
    var self = this;

    old_value = widthCache;
    widthCache = new_value;
    positioningChanged = true;

    if(!new_value || new_value <= 0){
      // if this callback will be called towards the end (and it will because of the order of putting vars in the hash)
      // then no matter which callbacks came before it there will not be any re-calculation
      self.innerdraw = empty_draw;
      return;
    }
    else if(old_value > 0){
      //do nothing because the new value is also > 0, so the change doesn't affect visibility of the box
      // TODO: the below 2 lines are temp
      canvasNeedsResizing = true;
      self.innerdraw = determine_draw_function_and_execute;
      return;
    }
    else{ 
      // new_value > 0 and old_value <= 0, so we are transffering from empty draw to something else.
      // setting calculate_draw_function to true because determaining the function depends on the other params as well
      canvasNeedsResizing = true;
      self.innerdraw = determine_draw_function_and_execute;
    }
  }

  function on_height_value_changed(new_value, prop, bound_to_function){
    var self = this;

    old_value = heightCache;
    heightCache = new_value;
    positioningChanged = true;

    if(!new_value || new_value <= 0){
      // if this callback will be called towards the end (and it will because of the order of putting vars in the hash)
      // then no matter which callbacks came before it there will not be any re-calculation
      self.innerdraw = empty_draw;
      return;
    }
    else if(old_value > 0){

      //do nothing because the new value is also > 0, so the change doesn't affect visibility of the box
      // TODO: the below 2 lines are temp
      canvasNeedsResizing = true;
      self.innerdraw = determine_draw_function_and_execute;
      return;
    }
    else{ 
      // new_value > 0 and old_value <= 0, so we are transffering from empty draw to something else.
      // setting calculate_draw_function to true because determaining the function depends on the other params as well
      canvasNeedsResizing = true;
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