// returns an optimized renderer
exports.optimized = function() {

  var box = {}; // this is what we are returning

  box.prepare = first_pre_draw;

  box.draw = function draw(ctx, scale, oppositeScale) {
    ctx.save();
    inner_draw.call(this, ctx, scale, oppositeScale);
    ctx.restore();
  };

  // TODO: what is this?
  box.permiate = function(canvas, context, levels, scale) {
    this.width = canvas.width / scale;
    this.height = canvas.height / scale;
    levels--;
    if(levels > 0){
      for (var i = 0; i < this.children.length; i++) {
        this.children[i].permiate(canvas, context, levels, scale);
      };
    }
  };

  // ---- private

  /// This function is called every frame. It draws the current box (by means of calling `ondraw`)
  /// and then draws the box's children iteratively. This function also implements a few of the basic
  /// drawing capabilities and optimizations: buffering, scaling, rotation.
  // TODO: passing many vars for calculations if to draw boxes or not, see if this optimization is indeed needed, and if so find better way to do it
  // TODO: Change name to draw
  var bufferCanvas = null;
  var bufferContext = null;
  // 1st time we want to recalculate
  var recalculate = true;
  var upperLevelNeedsRecalculate = true;
  var cache_use_counter = -1;
  var canvasNeedsResizing = false;
  var use_buffer_needs_recalculating = false;
  var boundToFunction = {};
  // cache of box properties so we will not need to use the preoperty getters all the times
  // this cache is updated in the OnXXXChanged callbacks
  var xCache = 0;
  var yCache = 0;
  var widthCache = 0;
  var heightCache = 0;
  var visibleCache = false;
  var alphaCache = 0.0;
  var childrenCache = [];
  var debugCache = false;
  var onDrawFunctionCache = null;
  var clipCache = false;
  var rotationCache = null;
  var useBufferCache = false;
  var inner_draw = function() { new Error('you shouldnt get here. talk to shaiber'); };

  function on_property_value_changed(){
    recalculate = true;
  };

  function on_bind_type_changed(prop, bound_to_function){
    if (bound_to_function){
      boundToFunction[prop] = true;
    }
    else{
      delete boundToFunction[prop];
    }
  };

  function add_watch_to_var(varName){
    boundToFunction[varName] = true;
    this.watch(varName, on_property_value_changed, true, on_bind_type_changed);
  };

  function first_pre_draw(ctx) {
    var self = this;

    // these vars were defined by the creator of the box as needed for calculating
    // whether it is invalidated (and needs recalculating) or not
    var vars = self.invalidators;
    var length = vars.length;
    for (var i = 0; i < length; i++) {
      add_watch_to_var.call(self, vars[i]);
    };

    // watching the below vars to determine if need to change the draw function
    // the order here is important because the last vars determine whether the 
    // box is visible or not and set the drawing function to be empty directly
    // without further calcs. If they are not last in the chain then some other
    // callback will set the flag that we need more calcs to determine the draw
    // function to 'true' and it will cost us some performance
    boundToFunction['useBuffer'] = true;
    self.watch('useBuffer', on_use_buffer_value_changed, true, on_bind_type_changed);

    boundToFunction['clip'] = true;
    self.watch('clip', on_clip_value_changed, true, on_bind_type_changed);

    boundToFunction['rotation'] = true;
    self.watch('rotation', on_rotation_value_changed, true, on_bind_type_changed);

    boundToFunction['debug'] = true;
    self.watch('debug', on_debug_value_changed, true, on_bind_type_changed);

    boundToFunction['children'] = true;
    self.watch('children', on_children_value_changed, true, on_bind_type_changed);

    boundToFunction['ondraw'] = true;
    self.watch('ondraw', on_ondraw_value_changed, true, on_bind_type_changed);

    boundToFunction['x'] = true;
    self.watch('x', on_x_value_changed, true, on_bind_type_changed);

    boundToFunction['y'] = true;
    self.watch('y', on_y_value_changed, true, on_bind_type_changed);

    boundToFunction['alpha'] = true;
    self.watch('alpha', on_alpha_value_changed, true, on_bind_type_changed);

    boundToFunction['width'] = true;
    self.watch('width', on_width_value_changed, true,on_bind_type_changed);

    boundToFunction['height'] = true;
    self.watch('height', on_height_value_changed, true, on_bind_type_changed);

    boundToFunction['visible'] = true;
    self.watch('visible', on_visible_value_changed, true, on_bind_type_changed);

    self.prepare = pre_draw;
    inner_draw = determine_draw_function_and_execute;
    self.prepare();

    return true;
  };

  function pre_draw(){
    // touch all properties bound to functions to triger invalidation if necessary
    // TODO: maybe need toncat here and work on the copy cause the bound identities may change
    //       need to see if Object.keys return the actual array that may change or already returns a copy
    var keys = Object.keys(boundToFunction);
    var keys_length = keys.length;
    for (var i = 0; i < keys_length; i++) {
      this[keys[i]]; 
    };

    // call pre-draw on all children
    // Do the pre-draw stage to detect changes
    var children = childrenCache;
    var childrenlength = children.length;
    
    // call pre_draw on all the children and determine whether this box can use 
    // its cache when drawing
    var rec = false;
    for (var i = 0; i < childrenlength; i++) {
      if (!children[i]) continue;
      rec |= children[i].prepare();
    };

    recalculate |= rec;
    upperLevelNeedsRecalculate |= recalculate;

    // even if this layer can use its cache, signal to the above layer not 
    // to use its cache in case:
    // 1. the positioning of this box has changed
    // 2. this layer has not yet finished generating its cache (because we
    //    do not want 2 layers to burdain the system with cache generation simultaneousely)
    return upperLevelNeedsRecalculate;
  };

  function empty_draw(ctx) {
    recalculate = false;
    upperLevelNeedsRecalculate = false;
  };

  function simple_draw(ctx, scale, oppositeScale) {
    upperLevelNeedsRecalculate = recalculate;
    ctx.translate(xCache, yCache);
    call_onprepare.call(this, ctx, recalculate);
    if (recalculate) recalculate = false;
    onDrawFunctionCache.call(this, ctx);
  };

  function simple_draw_buffered(ctx, scale, oppositeScale) {
    if(recalculate){
      cache_use_counter = -1;
      recalculate = false;
      upperLevelNeedsRecalculate = true;
      ctx.translate(xCache, yCache);
      call_onprepare.call(this, ctx, true);
      onDrawFunctionCache.call(this, ctx);
    }
    else{
      if(cache_use_counter === -1){
        upperLevelNeedsRecalculate = true;
        bufferContext.clearRect(0,0,widthCache,heightCache); // clear buffer on the buffer canvas and set context and draw on the canvas
        ctx.translate(xCache, yCache);
        call_onprepare.call(this, ctx, false);
        onDrawFunctionCache.call(this, ctx);
      }
      else if(cache_use_counter === 0){ // set context on the buffer canvas and set context and draw on the canvas
        upperLevelNeedsRecalculate = true;
        call_onprepare.call(this, bufferContext, false);
        ctx.translate(xCache, yCache);
        call_onprepare.call(this, ctx, false);
        onDrawFunctionCache.call(this, ctx);
      }
      else if(cache_use_counter === 1){ // draw on the buffer canvas and then draw the buffer canvas on the canvas
        onDrawFunctionCache.call(this, bufferContext);
        ctx.scale(oppositeScale, oppositeScale);
        ctx.drawImage(bufferCanvas, xCache * scale, yCache * scale);
        upperLevelNeedsRecalculate = false;
      }
      else{ // draw the buffer canvas on the canvas
        upperLevelNeedsRecalculate = false;
        ctx.scale(oppositeScale, oppositeScale);
        ctx.drawImage(bufferCanvas, xCache * scale, yCache * scale); 
      }
      cache_use_counter++;
    }
  };

  //TODO: if order or identity of children changes, even if the children array is the
  //      same array then need to not use cache in the parent layer - and start regenerating over again

  function draw_simple_container(ctx, scale, oppositeScale) {
    recalculate = false; // need this because it is involved in the calculation of the upper level recalculate later
    upperLevelNeedsRecalculate = false;
    
    var children = childrenCache;
    var childrenlength = children.length;

      
    ctx.translate(xCache, yCache);
    for (var i = 0; i < childrenlength; i++) {
      children[i].draw(ctx, scale, oppositeScale);
    }
  };

  function draw_simple_container_buffered(ctx, scale, oppositeScale) {
    if(recalculate) {
      recalculate = false;
      upperLevelNeedsRecalculate = false;
      cache_use_counter = -1;
      ctx.translate(xCache, yCache);
      var children = childrenCache;
      var childrenlength = children.length;
      for (var i = 0; i < childrenlength; i++) {
        children[i].draw(ctx, scale, oppositeScale);
      }
    }

    else{
      var children = childrenCache;
      var childrenlength = children.length;
      if(cache_use_counter < childrenlength) { // create the buffer in stages
        upperLevelNeedsRecalculate = true;
        if(cache_use_counter === -1)
        {
          bufferContext.clearRect(0, 0, widthCache, heightCache); // clear buffer on the buffer canvas
        }
        else{
          children[cache_use_counter].draw(bufferContext, scale, oppositeScale); // draw only one child on the buffer canvas (will later all children on the canvas)
        }
        // draw all children on the canvas since buffer is not yet ready
        ctx.translate(xCache, yCache);
        for (var i = 0; i < childrenlength; i++) {
          children[i].draw(ctx, scale, oppositeScale);
        }
      }
      else{ // draw the buffer on the canvas
        upperLevelNeedsRecalculate = false;
        ctx.scale(oppositeScale, oppositeScale);
        ctx.drawImage(bufferCanvas, xCache * scale, yCache * scale); 
      }
      cache_use_counter++;
    }
  };

  // TODO: reconsider support for this because there is nothing that
  //       cannot be done by adding a child the size of the box instead
  //       of implementing the ondraw function while having children
  function draw_simple_container_with_self_drawing(ctx, scale, oppositeScale) {
    ctx.save();
    simple_draw.call(this, ctx, scale, oppositeScale);
    ctx.restore();
    var temp = upperLevelNeedsRecalculate;
    draw_simple_container.call(this, ctx, scale, oppositeScale);
    upperLevelNeedsRecalculate = temp;
  };

  function draw_simple_container_with_self_drawing_buffered(ctx, scale, oppositeScale) {
    ctx.save();
    simple_draw_buffered.call(this, ctx, scale, oppositeScale);
    ctx.restore();
    draw_simple_container.call(this, ctx, scale, oppositeScale); // not buffered on purpose
  };

  function draw_optimized(ctx, scale, oppositeScale) {
    var self = this;

    var selfX = xCache;
    var selfY = yCache;
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
    if (alphaCache) ctx.globalAlpha = alphaCache;

    if (clipCache) {
      var right = selfX + selfWidth;
      var buttom = selfY + selfHeight;
      ctx.beginPath();
      ctx.moveTo(selfX, selfY);
      ctx.lineTo(right, selfY);
      ctx.lineTo(right, buttom);
      ctx.lineTo(selfX, buttom);
      ctx.closePath();
      ctx.clip();
    }

    // call the correct draw function to render sellf + children
    var children = childrenCache;
    var childrenlength = 0;
    if(children){
      childrenlength = children.length;
    }

    if (onDrawFunctionCache && childrenlength > 0) {
      if(useBufferCache){
        draw_simple_container_with_self_drawing_buffered.call(self, ctx, scale, oppositeScale);
      }
      else{
        draw_simple_container_with_self_drawing.call(self, ctx, scale, oppositeScale);
      }
    }
    else if(childrenlength > 0){
      if(useBufferCache){
        draw_simple_container_buffered.call(self, ctx, scale, oppositeScale);
      }
      else{
        draw_simple_container.call(self, ctx, scale, oppositeScale); 
      }
    }
    else if(onDrawFunctionCache){
      if(useBufferCache){
        simple_draw_buffered.call(self, ctx, scale, oppositeScale);
      }
      else{
        simple_draw.call(self, ctx, scale, oppositeScale); 
      }
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

  function draw_naive(ctx, scale, oppositeScale) {
    var self = this;

    for (var i = 0; i < self.invalidators.length; ++i) {
      var prop = self.invalidators[i];
      self[prop]; // invoke getter
    }

    recalculate = true;

    var selfX = self.x;
    var selfY = self.y;
    var selfWidth = self.width;
    var selfHeight = self.height;

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

    // call `ondraw` for rendering.
    if (self.ondraw) {
      if (selfWidth > 0 && selfHeight > 0) {
        ctx.save();
        self.ondraw(ctx);
        ctx.restore();
      }
    }

    var children = self.children;
    for (var i = 0; i < children.length; i++) {
      //TODO: do not draw child if out of viewport
      children[i].draw(ctx, scale, oppositeScale);
    };

    if(self.debug){
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
  
  function recalculateUseBuffer(){
    if (typeof this.useBuffer !== undefined){
      useBufferCache = this.useBuffer;
    }
    else{
      if (childrenCache && childrenCache.length > 1 && (widthCache * heightCache < 50000) && (widthCache * heightCache > 10000)){
        useBufferCache = true;
      }
      else{
        useBufferCache = false;
      }
    }
  }

  function resize_buffer_canvas(scale){
    if(!useBufferCache){
      alert('WTF?')
      return;
    }

    // TODO: make this a function and move somewhere else.
    // TODO: think if we need both recalculate and canusecashe and see how to solve
    recalculate = true;
    upperLevelNeedsRecalculate = true;
    cache_use_counter = -1;

    if(!bufferCanvas){
      bufferCanvas = document.createElement("canvas");
      bufferCanvas.x = 0;
      bufferCanvas.y = 0;
    }
    
    bufferCanvas.width = widthCache * scale;
    bufferCanvas.height = heightCache * scale;
    
    bufferContext = bufferCanvas.getContext('2d');
    bufferContext.scale(scale, scale);
  }

  //TODO: change name to determine_draw_function
  function determine_draw_function_and_execute(ctx, scale, oppositeScale){
    var self = this;

    if(!visibleCache || alphaCache === 0.0 || widthCache <= 0 || heightCache <= 0){
      inner_draw = empty_draw; 
    }
    else if((!alphaCache || alphaCache === 1.0) && (!rotationCache || rotationCache === 0) && !clipCache && !debugCache){
      if(!childrenCache || childrenCache.length === 0){
        if(onDrawFunctionCache){
          if(use_buffer_needs_recalculating){
            recalculateUseBuffer.call(self);
          }
          if(useBufferCache){
            if (canvasNeedsResizing){
              resize_buffer_canvas.call(self, scale);
              canvasNeedsResizing = false;  
            }
            inner_draw = simple_draw_buffered;
          }
          else{
            inner_draw = simple_draw; 
          }
        }
        else{
          inner_draw = empty_draw; 
        }
      }
      else{ // has children
        if(use_buffer_needs_recalculating){
          recalculateUseBuffer.call(self);
        }
        if(onDrawFunctionCache){
          if(useBufferCache){
            if (canvasNeedsResizing){
              resize_buffer_canvas.call(self, scale);
              canvasNeedsResizing = false;  
            }
            inner_draw = draw_simple_container_with_self_drawing_buffered;  
          }
          else{
            inner_draw = draw_simple_container_with_self_drawing;  
          }
        }
        else{
          if(useBufferCache){
            if (canvasNeedsResizing){
              resize_buffer_canvas.call(self, scale);
              canvasNeedsResizing = false;  
            }
            inner_draw = draw_simple_container_buffered; 
          }
          else{
            inner_draw = draw_simple_container;   
          }
        } 
      }
    }
    // TODO: Make this more fine grained by adding more draw function types
    else{ // if((alphaCache >= 0.0 && alphaCache <= 1.0) || rotationCache > 0 || clipCache || debugCache){
      if(use_buffer_needs_recalculating){
        recalculateUseBuffer.call(self);
      }
      if (canvasNeedsResizing && useBufferCache){
        resize_buffer_canvas.call(self, scale);
        canvasNeedsResizing = false;  
      }
      inner_draw = draw_optimized;
    }

    inner_draw.call(self, ctx, scale, oppositeScale);
  }

  function on_use_buffer_value_changed(new_value, old_value, prop, bound_to_function, sync){
    //useBufferCache = new_value;

    canvasNeedsResizing = true;
    use_buffer_needs_recalculating = true;
    inner_draw = determine_draw_function_and_execute;
  }

  function on_x_value_changed(new_value, old_value, prop, bound_to_function, sync){
    xCache = new_value;

    // this layer doesn't need recalculating since uts position doesnt affect how it is drawn
    upperLevelNeedsRecalculate = true;
  }

  function on_y_value_changed(new_value, old_value, prop, bound_to_function, sync){
    yCache = new_value;

    // this layer doesn't need recalculating since uts position doesnt affect how it is drawn
    upperLevelNeedsRecalculate = true;
  }

  function on_width_value_changed(new_value, old_value, prop, bound_to_function, sync){
    widthCache = new_value;
    recalculate = true;

    if(!new_value || new_value <= 0){
      // if this callback will be called towards the end (and it will because of the order of putting vars in the hash)
      // then no matter which callbacks came before it there will not be any re-calculation
      inner_draw = empty_draw;
      return;
    }
    else if(old_value > 0){
      //do nothing because the new value is also > 0, so the change doesn't affect visibility of the box
      // TODO: the below 2 lines are temp
      canvasNeedsResizing = true;
      use_buffer_needs_recalculating = true;
      inner_draw = determine_draw_function_and_execute;
      return;
    }
    else{ 
      // new_value > 0 and old_value <= 0, so we are transffering from empty draw to something else.
      // setting calculate_draw_function to true because determaining the function depends on the other params as well
      canvasNeedsResizing = true;
      use_buffer_needs_recalculating = true;
      inner_draw = determine_draw_function_and_execute;
    }
  }

  function on_height_value_changed(new_value, old_value, prop, bound_to_function, sync){
    heightCache = new_value;
    recalculate = true;

    if(!new_value || new_value <= 0){
      // if this callback will be called towards the end (and it will because of the order of putting vars in the hash)
      // then no matter which callbacks came before it there will not be any re-calculation
      inner_draw = empty_draw;
      return;
    }
    else if(old_value > 0){

      //do nothing because the new value is also > 0, so the change doesn't affect visibility of the box
      // TODO: the below 2 lines are temp
      canvasNeedsResizing = true;
      inner_draw = determine_draw_function_and_execute;
      return;
    }
    else{ 
      // new_value > 0 and old_value <= 0, so we are transffering from empty draw to something else.
      // setting calculate_draw_function to true because determaining the function depends on the other params as well
      canvasNeedsResizing = true;
      inner_draw = determine_draw_function_and_execute;
    }
  }

  function on_visible_value_changed(new_value, old_value, prop, bound_to_function, sync){
    visibleCache = new_value;

    if(new_value === false){
      // if this callback will be called towards the end (and it will because of the order of putting vars in the hash)
      // then no matter which callbacks came before it there will not be any re-calculation
      inner_draw = empty_draw;
      return;
    }
    else{ 
      // the box was invisible and now is visible.
      // setting calculate_draw_function to true because determaining the function depends on the other params as well
      canvasNeedsResizing = true;
      inner_draw = determine_draw_function_and_execute;
    }
  }

  function on_clip_value_changed(new_value, old_value, prop, bound_to_function, sync){
    clipCache = new_value;
    recalculate = true;

    // clip settings have changed.
    // setting calculate_draw_function to true because determaining the function depends on the other params as well
    inner_draw = determine_draw_function_and_execute;
  }

  function on_ondraw_value_changed(new_value, old_value, prop, bound_to_function, sync){
    onDrawFunctionCache = new_value;
    recalculate = true;

    // ondraw method was removed or added.
    // setting calculate_draw_function to true because determaining the function depends on the other params as well
    use_buffer_needs_recalculating = true;
    inner_draw = determine_draw_function_and_execute;
  }

  function on_rotation_value_changed(new_value, old_value, prop, bound_to_function, sync){
    rotationCache = new_value;

    if(old_value > 0 && new_value > 0){
      //do nothing because both values are > 0, so the change doesn't affect identity of draw function
      return;
    }
    else{ 
      // switching between rotation on and off or vice versa.
      // setting calculate_draw_function to true because determaining the function depends on the other params as well
      inner_draw = determine_draw_function_and_execute;
    }
  }

  function on_children_value_changed(new_value, old_value, prop, bound_to_function, sync){
    childrenCache = new_value;
    recalculate = true;

    if(old_value && old_value.length > 1 && childrenCache && childrenCache.length > 1){
      // nothing to do because the old and new number of children are > 0
      return;
    }
    else{ 
      // children are empty and were not before or vise versa.
      // setting calculate_draw_function to true because determaining the function depends on the other params as well
      use_buffer_needs_recalculating = true;
      inner_draw = determine_draw_function_and_execute;
    }
  }

  function on_alpha_value_changed(new_value, old_value, prop, bound_to_function, sync){
    alphaCache = new_value;
    recalculate = true;

    if(new_value === 0.0){
      // if this callback will be called towards the end (and it will because of the order of putting vars in the hash)
      // then no matter which callbacks came before it there will not be any re-calculation
      inner_draw = empty_draw;
      return;
    }
    else if(old_value > 0.0 && new_value > 0.0){
      //do nothing because both values are > 0.0, so the change doesn't affect identity of draw function
      inner_draw = determine_draw_function_and_execute;
      return;
    }
    else{ 
      // the box was invisible and now is visible.
      // setting calculate_draw_function to true because determaining the function depends on the other params as well
      inner_draw = determine_draw_function_and_execute;
    }
  }

  function on_debug_value_changed(new_value, old_value, prop, bound_to_function, sync){
    debugCache = new_value;

    // debug settings have changed.
    // setting calculate_draw_function to true because determaining the function depends on the other params as well
    inner_draw = determine_draw_function_and_execute;
  }

  // TODO: remove this when we get rid of the old style
  function call_onprepare(ctx, recalc) {
    if (this.onprepare) {
      return this.onprepare(ctx, recalc);
    }
    else {
      if (recalc) this.onCalculate && this.onCalculate(ctx);
      this.onSetContext && this.onSetContext(ctx);
    }
  }

  return box;
};