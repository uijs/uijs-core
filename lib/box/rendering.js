// returns an optimized renderer
exports.optimized = function() {
  var box = {}; // this is what we are returning
  //box.prepare = first_pre_draw;

  // ---- private

  /// This function is called every frame. It draws the current box (by means of calling `ondraw`)
  /// and then draws the box's children iteratively. This function also implements a few of the basic
  /// drawing capabilities and optimizations: buffering, scaling, rotation.
  // TODO: passing many vars for calculations if to draw boxes or not, see if this optimization is indeed needed, and if so find better way to do it
  // TODO: Change name to draw

  var bufferCanvas = null;
  var bufferContext = null;
  // 1st time we want to recalculate
  box._recalculate = true;
  box._upperLevelNeedsRecalculate = true;
  var cache_use_counter = -1;
  var canvasNeedsResizing = false;
  var use_buffer_needs_recalculating = false;
  box._boundToFunction = [];
  // cache of box properties so we will not need to use the preoperty getters all the times
  // this cache is updated in the OnXXXChanged callbacks
  var xCache = 0;
  var yCache = 0;
  var widthCache = 0;
  var heightCache = 0;
  var visibleCache = false;
  var alphaCache = 0.0;
  box._childrenCache = [];
  var debugCache = false;
  var onDrawFunctionCache = null;
  var clipCache = false;
  var rotationCache = null;
  var useBufferCache = false;

  box.invalidate = function() {
    this._recalculate = true;
    this._upperLevelNeedsRecalculate = true;
    cache_use_counter = -1;
  }

  function on_property_value_changed(){
    this._recalculate = true;
    this._upperLevelNeedsRecalculate = true;
  };

  function on_bind_type_changed(prop, bound_to_function){
    if (bound_to_function){
      this._boundToFunction.push(prop);
      
      // Calculate predraw function
      if(this._boundToFunction.length === 1){
        if(this._childrenCache.length > 0){
          this.prepare = pre_draw;
        }
        else{
          this.prepare = pre_draw_no_children;
        }
      }
    }
    else{
      var prop_index = this._boundToFunction.indexOf(prop);
      if (prop_index === -1) {
        return;
      }
      else{
        this._boundToFunction.splice(prop_index, 1);
        
        // calculate predraw function
        if(this._boundToFunction.length === 0){
          if(this._childrenCache.length > 0){
            this.prepare = pre_draw_no_bound_to_functions;
          }
          else{
            this.prepare = empty_pre_draw;
          }
        }
      }
    }
  };

  function add_watch_to_var(varName){
    this.watch(varName, on_property_value_changed, true, on_bind_type_changed);
  };

  function first_pre_draw(ctx) {
    var self = this;

    //TODO: automatically invalidate any property that's watched
    //TODO: special-case watch for Array.length
    //TODO: support adding an atomic watch on multiple attributes
    // x.watch(['a', 'b'], function() { 
    //   invalidated = true
    // });
    //TODO: frame-local-storage?

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
    self.watch('useBuffer', on_use_buffer_value_changed, true, on_bind_type_changed);
    self.watch('clip', on_clip_value_changed, true, on_bind_type_changed);
    self.watch('rotation', on_rotation_value_changed, true, on_bind_type_changed);
    self.watch('debug', on_debug_value_changed, true, on_bind_type_changed);
    self.watch('children', on_children_value_changed, true, on_bind_type_changed);
    self.watch('ondraw', on_ondraw_value_changed, true, on_bind_type_changed);
    self.watch('x', on_x_value_changed, true, on_bind_type_changed);
    self.watch('y', on_y_value_changed, true, on_bind_type_changed);
    self.watch('alpha', on_alpha_value_changed, true, on_bind_type_changed);
    self.watch('width', on_width_value_changed, true,on_bind_type_changed);
    self.watch('height', on_height_value_changed, true, on_bind_type_changed);
    self.watch('visible', on_visible_value_changed, true, on_bind_type_changed);

    if(self.prepare === first_pre_draw) {alert('No pre_draw was calculated');};
    self.inner_draw = determine_draw_function_and_execute;
    self.prepare();
    return true;
  };

  function empty_pre_draw(){
    return this._upperLevelNeedsRecalculate;
  };

  function pre_draw_no_children() {
    // touch all properties bound to functions to triger invalidation if necessary
    // TODO: maybe need toncat here and work on the copy cause the bound identities may change
    //       need to see if Object.keys return the actual array that may change or already returns a copy
    
    //TODO: move the ability to enumerate bound-to-functions to the binding system.
    var keys = this._boundToFunction;
    var keys_length = keys.length;
    for (var i = 0; i < keys_length; i++) {
      this[keys[i]];
    }   

    // no need to do this._upperLevelNeedsRecalculate |= this._recalculate because anywhere that changes recalculate to
    // e true also changes _upperLevel..
    return this._upperLevelNeedsRecalculate;
  };

  function pre_draw_no_bound_to_functions(){

    // call pre-draw on all children
    // Do the pre-draw stage to detect changes
    
    var children = this._childrenCache;
    var childrenlength = children.length;
    // call pre_draw on all the children and determine whether this box can use 
    // its cache when drawing
    var rec = false;
    for (var i = 0; i < childrenlength; i++) {
      rec |= children[i].prepare();
    };

    this._recalculate |= rec;  
    
    this._upperLevelNeedsRecalculate |= this._recalculate;

    // even if this layer can use its cache, signal to the above layer not 
    // to use its cache in case:
    // 1. the positioning of this box has changed
    // 2. this layer has not yet finished generating its cache (because we
    //    do not want 2 layers to burdain the system with cache generation simultaneousely)
    return this._upperLevelNeedsRecalculate;
  };

  function pre_draw(){
    // touch all properties bound to functions to triger invalidation if necessary
    // TODO: maybe need toncat here and work on the copy cause the bound identities may change
    //       need to see if Object.keys return the actual array that may change or already returns a copy
    
    //TODO: move the ability to enumerate bound-to-functions to the binding system.
    var keys = this._boundToFunction;
    var keys_length = keys.length;
    for (var i = 0; i < keys_length; i++) {
      this[keys[i]];
    }   

    //TODO: add facility in the binding system that allows idenifying what changed in the 
    //last tick. maybe as a result from tick()?

    // call pre-draw on all children
    // Do the pre-draw stage to detect changes
    
    var children = this._childrenCache;
    var childrenlength = children.length;
    // call pre_draw on all the children and determine whether this box can use 
    // its cache when drawing
    var rec = false;
    for (var i = 0; i < childrenlength; i++) {
      if (!children[i]) continue;
      rec |= children[i].prepare();
    };

    this._recalculate |= rec;  
    
    this._upperLevelNeedsRecalculate |= this._recalculate;

    // even if this layer can use its cache, signal to the above layer not 
    // to use its cache in case:
    // 1. the positioning of this box has changed
    // 2. this layer has not yet finished generating its cache (because we
    //    do not want 2 layers to burdain the system with cache generation simultaneousely)
    return this._upperLevelNeedsRecalculate;
  };

  function empty_draw(ctx) {
    this._recalculate = false;
    this._upperLevelNeedsRecalculate = false;
  };

  function simple_draw(ctx, scale, oppositeScale, x, y) {
      ctx.save();
      this._upperLevelNeedsRecalculate = this._recalculate;
      ctx.translate(x + xCache, y + yCache);
      // TODO: uncomment when moving to new style
      //if (recalculate) recalculate = false;
      //call_onprepare.call(this, ctx, recalculate, true);
      if(this._recalculate){
        this._recalculate = false;
        // TODO: uncomment when moving to new style
        //call_onprepare.call(this, ctx, true, false);
        this.onCalculate(ctx, scale, oppositeScale);
      }
      // TODO: uncomment when moving to new style
      //call_onprepare.call(this, ctx, false, true);
      this.onSetContext(ctx);
      onDrawFunctionCache.call(this, ctx, scale, oppositeScale);
      ctx.restore();
  };

  function simple_draw_buffered(ctx, scale, oppositeScale, x, y) {
    ctx.save();
    if(this._recalculate){
      cache_use_counter = -1;
      this._recalculate = false;
      this._upperLevelNeedsRecalculate = true;
      ctx.translate(x + xCache, y + yCache);
      // TODO: uncomment when moving to new style
      //call_onprepare.call(this, ctx, true, true);
      this.onCalculate(ctx, scale, oppositeScale);
      this.onSetContext(ctx);
      onDrawFunctionCache.call(this, ctx, scale, oppositeScale);
    }
    else{
      if(cache_use_counter === -1){ // clear buffer on the buffer canvas and set context and draw on the canvas
        this._upperLevelNeedsRecalculate = true;
        bufferContext.clearRect(0,0,widthCache,heightCache); 
        ctx.translate(x + xCache, y + yCache);
        this.onSetContext(ctx);
        // TODO: uncomment when moving to new style
        //call_onprepare.call(this, ctx, false, true);
        onDrawFunctionCache.call(this, ctx, scale, oppositeScale);
      }
      else if(cache_use_counter === 0){ // set context on the buffer canvas and set context and draw on the canvas
        this._upperLevelNeedsRecalculate = true;
        // TODO: uncomment when moving to new style
        //call_onprepare.call(this, bufferContext, false, true);
        this.onSetContext(bufferContext);
        ctx.translate(x + xCache, y + yCache);
        // TODO: uncomment when moving to new style
        //call_onprepare.call(this, ctx, false, true);
        this.onSetContext(ctx);
        onDrawFunctionCache.call(this, ctx, scale, oppositeScale);
      }
      else if(cache_use_counter === 1){ // draw on the buffer canvas and then draw the buffer canvas on the canvas
        onDrawFunctionCache.call(this, bufferContext, scale, oppositeScale);
        ctx.scale(oppositeScale, oppositeScale);
        ctx.drawImage(bufferCanvas, (x + xCache) * scale, (y + yCache) * scale);
        this._upperLevelNeedsRecalculate = false;
      }
      else{ // draw the buffer canvas on the canvas
        this._upperLevelNeedsRecalculate = false;
        ctx.scale(oppositeScale, oppositeScale);
        ctx.drawImage(bufferCanvas, (x + xCache) * scale, (y + yCache) * scale); 
      }
      cache_use_counter++;
    }
    ctx.restore();
  };

  //TODO: if order or identity of children changes, even if the children array is the
  //      same array then need to not use cache in the parent layer - and start regenerating over again

  function draw_simple_container(ctx, scale, oppositeScale, x, y) {
    ctx.save();
    this._recalculate = false; // need this because it is involved in the calculation of the upper level recalculate later
    this._upperLevelNeedsRecalculate = false;
    
    var children = this._childrenCache;
    var childrenlength = children.length;

    for (var i = 0; i < childrenlength; i++) {
      children[i].inner_draw(ctx, scale, oppositeScale, x + xCache, y + yCache);
    }
    ctx.restore();
  };

  var buffer_generation_complete = false;

  function draw_simple_container_buffered(ctx, scale, oppositeScale, x, y) {
    ctx.save();
    if(this._recalculate) {
      this._recalculate = false;
      this._upperLevelNeedsRecalculate = false;
      cache_use_counter = -1;
      buffer_generation_complete = false;
      var children = this._childrenCache;
      var childrenlength = children.length;
      for (var i = 0; i < childrenlength; i++) {
        children[i].inner_draw(ctx, scale, oppositeScale, x + xCache, y + yCache);
      }
    }
    else if(buffer_generation_complete){
      this._upperLevelNeedsRecalculate = false;
      ctx.scale(oppositeScale, oppositeScale);
      ctx.drawImage(bufferCanvas, (x + xCache) * scale, (y + yCache) * scale); 
    }
    else{
      var children = this._childrenCache;
      var childrenlength = children.length;
      if(cache_use_counter < childrenlength) { // create the buffer in stages
        this._upperLevelNeedsRecalculate = true;
        if(cache_use_counter === -1)
        {
          bufferContext.clearRect(0, 0, widthCache, heightCache); // clear buffer on the buffer canvas
        }
        else{
          children[cache_use_counter].inner_draw(bufferContext, scale, oppositeScale, 0, 0); // draw only one child on the buffer canvas (will later all children on the canvas)
        }
        // draw all children on the canvas since buffer is not yet ready
        for (var i = 0; i < childrenlength; i++) {
          children[i].inner_draw(ctx, scale, oppositeScale, x + xCache, y + yCache);
        }
      }
      else{ // draw the buffer on the canvas
        if(cache_use_counter === childrenlength){
          buffer_generation_complete = true;
        }
        this._upperLevelNeedsRecalculate = false;
        ctx.scale(oppositeScale, oppositeScale);
        ctx.drawImage(bufferCanvas, (x + xCache) * scale, (y + yCache) * scale); 
      }
      cache_use_counter++;
    }
    ctx.restore();
  };

  // TODO: reconsider support for this because there is nothing that
  //       cannot be done by adding a child the size of the box instead
  //       of implementing the ondraw function while having children
  function draw_simple_container_with_self_drawing(ctx, scale, oppositeScale, x, y) {
    ctx.save();
    simple_draw.call(this, ctx, scale, oppositeScale, x, y);
    ctx.restore();
    var temp = this._upperLevelNeedsRecalculate;
    draw_simple_container.call(this, ctx, scale, oppositeScale, x, y);
    this._upperLevelNeedsRecalculate = temp;
  };

  function draw_simple_container_with_self_drawing_buffered(ctx, scale, oppositeScale, x, y) {
    simple_draw_buffered.call(this, ctx, scale, oppositeScale, x, y);
    draw_simple_container.call(this, ctx, scale, oppositeScale, x, y); // not buffered on purpose
  };

  function draw_optimized(ctx, scale, oppositeScale, x, y) {
    var self = this;

    var selfX = x + xCache;
    var selfY = y + yCache;
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
    var children = this._childrenCache;
    var childrenlength = 0;
    if(children){
      childrenlength = children.length;
    }

    if (onDrawFunctionCache && childrenlength > 0) {
      if(useBufferCache){
        draw_simple_container_with_self_drawing_buffered.call(self, ctx, scale, oppositeScale, x, y);
      }
      else{
        draw_simple_container_with_self_drawing.call(self, ctx, scale, oppositeScale, x, y);
      }
    }
    else if(childrenlength > 0){
      if(useBufferCache){
        draw_simple_container_buffered.call(self, ctx, scale, oppositeScale, x, y);
      }
      else{
        draw_simple_container.call(self, ctx, scale, oppositeScale, x, y); 
      }
    }
    else if(onDrawFunctionCache){
      if(useBufferCache){
        simple_draw_buffered.call(self, ctx, scale, oppositeScale, x, y);
      }
      else{
        simple_draw.call(self, ctx, scale, oppositeScale, x, y); 
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
        ctx.moveTo(x, y);
        ctx.lineTo(x + selfWidth, y);
        ctx.lineTo(x + selfWidth, y + selfHeight);
        ctx.lineTo(x, y + selfHeight);
        ctx.closePath();
        ctx.stroke();
      }

      drawborder();
    }

    ctx.restore();
  };

  function generate_buffer(ctx, scale, oppositeScale, x, y) {
    var self = this;

    var selfX = x + xCache;
    var selfY = y + yCache;
    var selfWidth = widthCache;
    var selfHeight = heightCache;

    if(ctx){
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
    }

    // call the correct draw function to render sellf + children
    var children = this._childrenCache;
    var childrenlength = 0;
    if(children){
      childrenlength = children.length;
    }

    if (onDrawFunctionCache && childrenlength > 0) {
      if(useBufferCache){
        draw_simple_container_with_self_drawing_buffered.call(self, ctx, scale, oppositeScale, x, y);
      }
      else{ // draw_simple_container_with_self_drawing
        if(ctx) {
          ctx.save();
          ctx.translate(x + xCache, y + yCache);
          if(this._recalculate){
            this._recalculate = false;
            // TODO: uncomment when moving to new style
            //call_onprepare.call(this, ctx, true, false);
            this.onCalculate(ctx, scale, oppositeScale);
          }
          // TODO: uncomment when moving to new style
          //call_onprepare.call(this, ctx, false, true);
          this.onSetContext(ctx);
          onDrawFunctionCache.call(this, ctx, scale, oppositeScale);
          ctx.restore();
        }
        this._recalculate = false; // need this because it is involved in the calculation of the upper level recalculate later
        this._upperLevelNeedsRecalculate = false;
        for (var i = 0; i < childrenlength; i++) {
          children[i].generate_buffer(ctx, scale, oppositeScale, x + xCache, y + yCache);
        }
      }
    }
    else if(childrenlength > 0){
      if(useBufferCache){ //draw_simple_container_buffered
        if(this._recalculate) {
          this._recalculate = false;
          cache_use_counter = -1;
        }
        if(cache_use_counter < childrenlength) { // create the buffer
          this._upperLevelNeedsRecalculate = false;
          if(cache_use_counter === -1)
          {
            cache_use_counter = childrenlength;
            bufferContext.clearRect(0, 0, widthCache, heightCache); // clear the buffer canvas
          }
          else{
            cache_use_counter = childrenlength;
            // draw children which are not already drawn on the buffer canvas
            var children = this._childrenCache;
            var childrenlength = children.length;
            for (var i = cache_use_counter; i < childrenlength; i++) { 
              children[i].inner_draw(bufferContext, scale, oppositeScale, 0, 0); 
            }
          }
        }
        else{ // draw the buffer on the canvas
          this._upperLevelNeedsRecalculate = false;
          if(ctx){
            ctx.save();
            ctx.scale(oppositeScale, oppositeScale);
            ctx.drawImage(bufferCanvas, (x + xCache) * scale, (y + yCache) * scale); 
            ctx.restore();
          }
        }
      }
      else{
        draw_simple_container.call(self, ctx, scale, oppositeScale, x, y); 
      }
    }
    else if(onDrawFunctionCache){
      if(useBufferCache){ // simple_draw_buffered
        if(this._recalculate){
          this._recalculate = false;
          this._upperLevelNeedsRecalculate = false;
          this.onCalculate(bufferContext, scale, oppositeScale);
          bufferContext.clearRect(0,0,widthCache,heightCache); 
          this.onSetContext(bufferContext);
          // TODO: uncomment when moving to new style
          //call_onprepare.call(this, bufferCtx, true, true);
          onDrawFunctionCache.call(this, bufferContext, scale, oppositeScale);
        }
        else if(cache_use_counter === -1){
          this._upperLevelNeedsRecalculate = false;
          bufferContext.clearRect(0,0,widthCache,heightCache); 
          // TODO: uncomment when moving to new style
          //call_onprepare.call(this, bufferContext, false, true);
          this.onSetContext(bufferContext);
          onDrawFunctionCache.call(this, bufferContext, scale, oppositeScale);
        }
        else if(cache_use_counter === 0){ 
          this._upperLevelNeedsRecalculate = false;
          // TODO: uncomment when moving to new style
          //call_onprepare.call(this, bufferContext, false, true);
          this.onSetContext(bufferContext);
          onDrawFunctionCache.call(this, bufferContext, scale, oppositeScale);
          
        }
        else if(cache_use_counter === 1){ 
          this._upperLevelNeedsRecalculate = false;
          onDrawFunctionCache.call(this, bufferContext, scale, oppositeScale);
        }
        cache_use_counter = 2;
        if(ctx){
          ctx.save();
          ctx.scale(oppositeScale, oppositeScale);
          ctx.drawImage(bufferCanvas, (x + xCache) * scale, (y + yCache) * scale); 
          ctx.restore();
        }
      }
      else{ //simple_draw
        if(ctx){
          ctx.translate(x + xCache, y + yCache);
          if(this._recalculate){
            this._recalculate = false;
            // TODO: uncomment when moving to new style
            //call_onprepare.call(this, ctx, true, false);
            this.onCalculate(ctx, scale, oppositeScale);
          }
          // TODO: uncomment when moving to new style
          //call_onprepare.call(this, ctx, false, true);
          this.onSetContext(ctx);
          onDrawFunctionCache.call(this, ctx, scale, oppositeScale);
        }
      }
    }
    else{
      alert('Jony WTF?!?!?!?!?! no children and no ondraw');
    }

    if(debugCache && ctx){
      function drawborder() {
        ctx.strokeStyle = 'blue';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + selfWidth, y);
        ctx.lineTo(x + selfWidth, y + selfHeight);
        ctx.lineTo(x, y + selfHeight);
        ctx.closePath();
        ctx.stroke();
      }

      drawborder();
    }

    if(ctx){
      ctx.restore();
    }
  };

  box.generate_buffer = generate_buffer;

  function draw_naive(ctx, scale, oppositeScale) {
    var self = this;

    for (var i = 0; i < self.invalidators.length; ++i) {
      var prop = self.invalidators[i];
      self[prop]; // invoke getter
    }

    this._recalculate = true;
    this._upperLevelNeedsRecalculate = true;

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
        self.ondraw(ctx, scale, oppositeScale);
        ctx.restore();
      }
    }

    var children = self.children;
    for (var i = 0; i < children.length; i++) {
      //TODO: do not draw child if out of viewport
      children[i].inner_draw(ctx, scale, oppositeScale);
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

  box.prepare = first_pre_draw;
  box.inner_draw = function() {
    // might happen if parent just got new children and its pre_draw was not yet set to a pre-draw with children
    // should be fixed in the next frame
    console.log('Warning executing empty inner_draw since first_pre_draw was not called yet');
  };

  function recalculateUseBuffer(){
    if (typeof this.useBuffer !== undefined){
      useBufferCache = this.useBuffer;
    }
    else{
      // TODO: don't use hard coded numbers - calculate a size which is between 1/10 and 1/4 of the screen
      if (this._childrenCache && this._childrenCache.length > 1 && (widthCache * heightCache < 50000) && (widthCache * heightCache > 10000)){
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
    this._recalculate = true;
    this._upperLevelNeedsRecalculate = true;
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

  box.permiate = function(canvas, context, levels, scale){
    this.width = canvas.width / scale;
    this.height = canvas.height / scale;
    this.screen = {
      x: 0,
      y: 0,
    };
    levels--;
    if(levels > 0){
      for (var i = 0; i < this.children.length; i++) {
        this.children[i].permiate(canvas, context, levels, scale);
      };
    }
  }

  //TODO: change name to determine_draw_function
  function determine_draw_function_and_execute(ctx, scale, oppositeScale, x, y){
    var self = this;

    if(!visibleCache || alphaCache === 0.0 || widthCache <= 0 || heightCache <= 0){
      self.inner_draw = empty_draw; 
    }
    else if((!alphaCache || alphaCache === 1.0) && (!rotationCache || rotationCache === 0) && !clipCache && !debugCache){
      if(!this._childrenCache || this._childrenCache.length === 0){
        if(onDrawFunctionCache){
          if(use_buffer_needs_recalculating){
            recalculateUseBuffer.call(self);
          }
          if(useBufferCache){
            if (canvasNeedsResizing){
              resize_buffer_canvas.call(self, scale);
              canvasNeedsResizing = false;  
            }
            self.inner_draw = simple_draw_buffered;
          }
          else{
            self.inner_draw = simple_draw; 
          }
        }
        else{
          self.inner_draw = empty_draw; 
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
            self.inner_draw = draw_simple_container_with_self_drawing_buffered;  
          }
          else{
            self.inner_draw = draw_simple_container_with_self_drawing;  
          }
        }
        else{
          if(useBufferCache){
            if (canvasNeedsResizing){
              resize_buffer_canvas.call(self, scale);
              canvasNeedsResizing = false;  
            }
            self.inner_draw = draw_simple_container_buffered; 
          }
          else{
            self.inner_draw = draw_simple_container;   
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
      self.inner_draw = draw_optimized;
    }
    self.inner_draw(ctx, scale, oppositeScale, x, y);
  }

  function on_use_buffer_value_changed(new_value, old_value, prop, bound_to_function, sync){
    canvasNeedsResizing = true;
    use_buffer_needs_recalculating = true;
    this.inner_draw = determine_draw_function_and_execute;
  }

  function on_x_value_changed(new_value, old_value, prop, bound_to_function, sync){
    xCache = new_value;

    // this layer doesn't need recalculating since uts position doesnt affect how it is drawn
    this._upperLevelNeedsRecalculate = true;
  }

  function on_y_value_changed(new_value, old_value, prop, bound_to_function, sync){
    yCache = new_value;

    // this layer doesn't need recalculating since uts position doesnt affect how it is drawn
    this._upperLevelNeedsRecalculate = true;
  }

  function on_width_value_changed(new_value, old_value, prop, bound_to_function, sync){
    widthCache = new_value;
    this._recalculate = true;
    this._upperLevelNeedsRecalculate = true;

    if(!new_value || new_value <= 0){
      // if this callback will be called towards the end (and it will because of the order of putting vars in the hash)
      // then no matter which callbacks came before it there will not be any re-calculation
      this.inner_draw = empty_draw;
      return;
    }
    else if(old_value > 0){
      //do nothing because the new value is also > 0, so the change doesn't affect visibility of the box
      // TODO: the below 2 lines are temp
      canvasNeedsResizing = true;
      use_buffer_needs_recalculating = true;
      this.inner_draw = determine_draw_function_and_execute;
      return;
    }
    else{ 
      // new_value > 0 and old_value <= 0, so we are transffering from empty draw to something else.
      // setting calculate_draw_function to true because determaining the function depends on the other params as well
      canvasNeedsResizing = true;
      use_buffer_needs_recalculating = true;
      this.inner_draw = determine_draw_function_and_execute;
    }
  }

  function on_height_value_changed(new_value, old_value, prop, bound_to_function, sync){
    heightCache = new_value;
    this._recalculate = true;
    this._upperLevelNeedsRecalculate = true;

    if(!new_value || new_value <= 0){
      // if this callback will be called towards the end (and it will because of the order of putting vars in the hash)
      // then no matter which callbacks came before it there will not be any re-calculation
      this.inner_draw = empty_draw;
      return;
    }
    else if(old_value > 0){

      // do nothing because the new value is also > 0, so the change doesn't affect visibility of the box
      // TODO: the below 2 lines are temp
      canvasNeedsResizing = true;
      this.inner_draw = determine_draw_function_and_execute;
      return;
    }
    else{ 
      // new_value > 0 and old_value <= 0, so we are transffering from empty draw to something else.
      // setting calculate_draw_function to true because determaining the function depends on the other params as well
      canvasNeedsResizing = true;
      this.inner_draw = determine_draw_function_and_execute;
    }
  }

  function on_visible_value_changed(new_value, old_value, prop, bound_to_function, sync){
    visibleCache = new_value;

    if(new_value === false){
      // if this callback will be called towards the end (and it will because of the order of putting vars in the hash)
      // then no matter which callbacks came before it there will not be any re-calculation
      this.inner_draw = empty_draw;
      return;
    }
    else{ 
      // the box was invisible and now is visible.
      // setting calculate_draw_function to true because determaining the function depends on the other params as well
      canvasNeedsResizing = true;
      this.inner_draw = determine_draw_function_and_execute;
    }
  }

  function on_clip_value_changed(new_value, old_value, prop, bound_to_function, sync){
    clipCache = new_value;
    this._recalculate = true;
    this._upperLevelNeedsRecalculate = true;

    // clip settings have changed.
    // setting calculate_draw_function to true because determaining the function depends on the other params as well
    this.inner_draw = determine_draw_function_and_execute;
  }

  function on_ondraw_value_changed(new_value, old_value, prop, bound_to_function, sync){
    onDrawFunctionCache = new_value;
    this._recalculate = true;
    this._upperLevelNeedsRecalculate = true;

    // ondraw method was removed or added.
    // setting calculate_draw_function to true because determaining the function depends on the other params as well
    use_buffer_needs_recalculating = true;
    this.inner_draw = determine_draw_function_and_execute;
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
      this.inner_draw = determine_draw_function_and_execute;
    }
  }

  function on_children_value_changed(new_value, old_value, prop, bound_to_function, sync){
    this._childrenCache = new_value;
    this._recalculate = true;
    this._upperLevelNeedsRecalculate = true;

    // TODO: either add a watch on the children length or add calculation of pre_draw function 
    // in add and remove children..

    if(old_value && old_value.length > 0 && this._childrenCache && this._childrenCache.length > 0){
      // nothing to do because the old and new number of children are > 0
      return;
    }
    else{

      // Calculate predraw function
      if(new_value && new_value.length > 0){
        if(this._boundToFunction.length > 0){
          this.prepare = pre_draw;
        }
        else{
          this.prepare = pre_draw_no_bound_to_functions;
        }
      }
      else{ // there are no children
        if(this._boundToFunction.length > 0){
          this.prepare = pre_draw_no_children;
        }
        else{
          this.prepare = empty_pre_draw;
        }
      } 
      // children are empty and were not before or vise versa.
      // setting calculate_draw_function to true because determaining the function depends on the other params as well
      use_buffer_needs_recalculating = true;
      this.inner_draw = determine_draw_function_and_execute;
    }
  }

  function on_alpha_value_changed(new_value, old_value, prop, bound_to_function, sync){
    alphaCache = new_value;
    this._recalculate = true;
    this._upperLevelNeedsRecalculate = true;

    if(new_value === 0.0){
      // if this callback will be called towards the end (and it will because of the order of putting vars in the hash)
      // then no matter which callbacks came before it there will not be any re-calculation
      this.inner_draw = empty_draw;
      return;
    }
    else if(old_value > 0.0 && new_value > 0.0){
      //do nothing because both values are > 0.0, so the change doesn't affect identity of draw function
      this.inner_draw = determine_draw_function_and_execute;
      return;
    }
    else{ 
      // the box was invisible and now is visible.
      // setting calculate_draw_function to true because determaining the function depends on the other params as well
      this.inner_draw = determine_draw_function_and_execute;
    }
  }

  function on_debug_value_changed(new_value, old_value, prop, bound_to_function, sync){
    debugCache = new_value;

    // debug settings have changed.
    // setting calculate_draw_function to true because determaining the function depends on the other params as well
    this.inner_draw = determine_draw_function_and_execute;
  }

  // TODO: remove this when we get rid of the old style
  function call_onprepare(ctx, recalc, setCtx) {
    if (this.onprepare) {
      return this.onprepare(ctx, recalc, setCtx);
    }
    else {
      if (recalc) this.onCalculate && this.onCalculate(ctx);
      if (setCtx) this.onSetContext && this.onSetContext(ctx);
    }
  }

  return box;
};