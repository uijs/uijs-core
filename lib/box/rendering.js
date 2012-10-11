exports.optimizedPrivates = function() {
  var box = {}; // this is what we are returning

  box._bufferCanvas = null;
  box._bufferContext = null;
  // 1st time we want to recalculate
  box._recalculate = true;
  box._upperLevelNeedsRecalculate = true;
  box._cache_use_counter = -1;
  box._canvasNeedsResizing = false;
  box._use_buffer_needs_recalculating = false;
  box._boundToFunction = [];
  // cache of box properties so we will not need to use the preoperty getters all the times
  // this cache is updated in the OnXXXChanged callbacks
  box._x = 0;
  box._y = 0;
  box._width = 0;
  box._height = 0;
  box._visible = false;
  box._alpha = 0.0;
  box._children = [];
  box._debug = false;
  box._onDrawFunction = null;
  box._clip = false;
  box._rotation = null;
  box._useBuffer = false;

  return box;
}


// returns an optimized renderer
exports.optimizedPrototype = function() {
  var box = {}; // this is what we are returning

  box.invalidate = function() {
    this._recalculate = true;
    this._upperLevelNeedsRecalculate = true;
    this._cache_use_counter = -1;
  }

  function on_property_value_changed(){
    this._recalculate = true;
    this._upperLevelNeedsRecalculate = true;
  };

  function on_bind_type_changed(prop, bound_to_function){
    if (bound_to_function){
      
      // TODO: This is for debuging purpose. Maybe can remove later
      var prop_index = this._boundToFunction.indexOf(prop);
      if (prop_index !== -1) {
        alert('trying to push ' + prop + ' to _boundToFunction more than once!!!');
      }

      this._boundToFunction.push(prop);
      
      // Calculate predraw function
      if(this._boundToFunction.length === 1){
        if(this._children.length > 0){
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
          if(this._children.length > 0){
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
    

    //TODO: automatically invalidate any property that's watched
    //TODO: special-case watch for Array.length
    //TODO: support adding an atomic watch on multiple attributes
    // x.watch(['a', 'b'], function() { 
    //   invalidated = true
    // });
    //TODO: frame-local-storage?

    // these vars were defined by the creator of the box as needed for calculating
    // whether it is invalidated (and needs recalculating) or not
    var vars = this.invalidators;
    var length = vars.length;
    for (var i = 0; i < length; i++) {
      add_watch_to_var.call(this, vars[i]);
    };

    // watching the below vars to determine if need to change the draw function
    // the order here is important because the last vars determine whether the 
    // box is visible or not and set the drawing function to be empty directly
    // without further calcs. If they are not last in the chain then some other
    // callback will set the flag that we need more calcs to determine the draw
    // function to 'true' and it will cost us some performance
    this.watch('useBuffer', on_use_buffer_value_changed, true, on_bind_type_changed);
    this.watch('clip', on_clip_value_changed, true, on_bind_type_changed);
    this.watch('rotation', on_rotation_value_changed, true, on_bind_type_changed);
    this.watch('debug', on_debug_value_changed, true, on_bind_type_changed);
    this.watch('children', on_children_value_changed, true, on_bind_type_changed);
    this.watch('ondraw', on_ondraw_value_changed, true, on_bind_type_changed);
    this.watch('x', on_x_value_changed, true, on_bind_type_changed);
    this.watch('y', on_y_value_changed, true, on_bind_type_changed);
    this.watch('alpha', on_alpha_value_changed, true, on_bind_type_changed);
    this.watch('width', on_width_value_changed, true,on_bind_type_changed);
    this.watch('height', on_height_value_changed, true, on_bind_type_changed);
    this.watch('visible', on_visible_value_changed, true, on_bind_type_changed);

    if(this.prepare === first_pre_draw) {alert('No pre_draw was calculated');};
    this.inner_draw = determine_draw_function_and_execute;
    this.prepare();
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
    
    var children = this._children;
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
    
    var children = this._children;
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
      ctx.translate(x + this._x, y + this._y);
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
      this._onDrawFunction.call(this, ctx, scale, oppositeScale);
      ctx.restore();
  };

  function simple_draw_buffered(ctx, scale, oppositeScale, x, y) {
    ctx.save();
    if(this._recalculate){
      this._cache_use_counter = -1;
      this._recalculate = false;
      this._upperLevelNeedsRecalculate = true;
      ctx.translate(x + this._x, y + this._y);
      // TODO: uncomment when moving to new style
      //call_onprepare.call(this, ctx, true, true);
      this.onCalculate(ctx, scale, oppositeScale);
      this.onSetContext(ctx);
      this._onDrawFunction.call(this, ctx, scale, oppositeScale);
    }
    else{
      if(this._cache_use_counter === -1){ // clear buffer on the buffer canvas and set context and draw on the canvas
        this._upperLevelNeedsRecalculate = true;
        this._bufferContext.clearRect(0,0,this._width,this._height); 
        ctx.translate(x + this._x, y + this._y);
        this.onSetContext(ctx);
        // TODO: uncomment when moving to new style
        //call_onprepare.call(this, ctx, false, true);
        this._onDrawFunction.call(this, ctx, scale, oppositeScale);
      }
      else if(this._cache_use_counter === 0){ // set context on the buffer canvas and set context and draw on the canvas
        this._upperLevelNeedsRecalculate = true;
        // TODO: uncomment when moving to new style
        //call_onprepare.call(this, this._bufferContext, false, true);
        this.onSetContext(this._bufferContext);
        ctx.translate(x + this._x, y + this._y);
        // TODO: uncomment when moving to new style
        //call_onprepare.call(this, ctx, false, true);
        this.onSetContext(ctx);
        this._onDrawFunction.call(this, ctx, scale, oppositeScale);
      }
      else if(this._cache_use_counter === 1){ // draw on the buffer canvas and then draw the buffer canvas on the canvas
        this._onDrawFunction.call(this, this._bufferContext, scale, oppositeScale);
        ctx.scale(oppositeScale, oppositeScale);
        ctx.drawImage(this._bufferCanvas, (x + this._x) * scale, (y + this._y) * scale);
        this._upperLevelNeedsRecalculate = false;
      }
      else{ // draw the buffer canvas on the canvas
        this._upperLevelNeedsRecalculate = false;
        ctx.scale(oppositeScale, oppositeScale);
        ctx.drawImage(this._bufferCanvas, (x + this._x) * scale, (y + this._y) * scale); 
      }
      this._cache_use_counter++;
    }
    ctx.restore();
  };

  //TODO: if order or identity of children changes, even if the children array is the
  //      same array then need to not use cache in the parent layer - and start regenerating over again

  function draw_simple_container(ctx, scale, oppositeScale, x, y) {
    ctx.save();
    this._recalculate = false; // need this because it is involved in the calculation of the upper level recalculate later
    this._upperLevelNeedsRecalculate = false;
    
    var children = this._children;
    var childrenlength = children.length;

    for (var i = 0; i < childrenlength; i++) {
      children[i].inner_draw(ctx, scale, oppositeScale, x + this._x, y + this._y);
    }
    ctx.restore();
  };

  // TODO: is this really needed??
  box._buffer_generation_complete = false;

  function draw_simple_container_buffered(ctx, scale, oppositeScale, x, y) {
    ctx.save();
    if(this._recalculate) {
      this._recalculate = false;
      this._upperLevelNeedsRecalculate = false;
      this._cache_use_counter = -1;
      this._buffer_generation_complete = false;
      var children = this._children;
      var childrenlength = children.length;
      for (var i = 0; i < childrenlength; i++) {
        children[i].inner_draw(ctx, scale, oppositeScale, x + this._x, y + this._y);
      }
    }
    else if(this._buffer_generation_complete){
      this._upperLevelNeedsRecalculate = false;
      ctx.scale(oppositeScale, oppositeScale);
      ctx.drawImage(this._bufferCanvas, (x + this._x) * scale, (y + this._y) * scale); 
    }
    else{
      var children = this._children;
      var childrenlength = children.length;
      if(this._cache_use_counter < childrenlength) { // create the buffer in stages
        this._upperLevelNeedsRecalculate = true;
        if(this._cache_use_counter === -1)
        {
          this._bufferContext.clearRect(0, 0, this._width, this._height); // clear buffer on the buffer canvas
        }
        else{
          children[this._cache_use_counter].inner_draw(this._bufferContext, scale, oppositeScale, 0, 0); // draw only one child on the buffer canvas (will later all children on the canvas)
        }
        // draw all children on the canvas since buffer is not yet ready
        for (var i = 0; i < childrenlength; i++) {
          children[i].inner_draw(ctx, scale, oppositeScale, x + this._x, y + this._y);
        }
      }
      else{ // draw the buffer on the canvas
        if(this._cache_use_counter === childrenlength){
          this._buffer_generation_complete = true;
        }
        this._upperLevelNeedsRecalculate = false;
        ctx.scale(oppositeScale, oppositeScale);
        ctx.drawImage(this._bufferCanvas, (x + this._x) * scale, (y + this._y) * scale); 
      }
      this._cache_use_counter++;
    }
    ctx.restore();
  };

  // TODO: reconsider support for this because there is nothing that
  //       cannot be done by adding a child the size of the box instead
  //       of implementing the ondraw function while having children
  // TODO: (if keeping support then inplement more correctly)
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
    var selfX = x + this._x;
    var selfY = y + this._y;
    var selfWidth = this._width;
    var selfHeight = this._height;

    ctx.save();

    if (this.rotation) {
      var centerX = selfX + selfWidth / 2;
      var centerY = selfY + selfHeight / 2;
      ctx.translate(centerX, centerY);
      ctx.rotate(this._rotation);
      ctx.translate(-centerX, -centerY);
    }

    // stuff that applies to all children
    if (this._alpha) ctx.globalAlpha = this._alpha;

    if (this._clip) {
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
    var children = this._children;
    var childrenlength = 0;
    if(children){
      childrenlength = children.length;
    }

    if (this._onDrawFunction && childrenlength > 0) {
      if(this._useBuffer){
        draw_simple_container_with_self_drawing_buffered.call(this, ctx, scale, oppositeScale, x, y);
      }
      else{
        draw_simple_container_with_self_drawing.call(this, ctx, scale, oppositeScale, x, y);
      }
    }
    else if(childrenlength > 0){
      if(this._useBuffer){
        draw_simple_container_buffered.call(this, ctx, scale, oppositeScale, x, y);
      }
      else{
        draw_simple_container.call(this, ctx, scale, oppositeScale, x, y); 
      }
    }
    else if(this._onDrawFunction){
      if(this._useBuffer){
        simple_draw_buffered.call(this, ctx, scale, oppositeScale, x, y);
      }
      else{
        simple_draw.call(this, ctx, scale, oppositeScale, x, y); 
      }
    }
    else{
      alert('Jony WTF?!?!?!?!?! no children and no ondraw');
    }

    if(this._debug){
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

      drawborder.call(this);
    }

    ctx.restore();
  };

  function generate_buffer(ctx, scale, oppositeScale, x, y) {
    var selfX = x + this._x;
    var selfY = y + this._y;
    var selfWidth = this._width;
    var selfHeight = this._height;

    if(ctx){
      ctx.save();

      if (this.rotation) {
        var centerX = selfX + selfWidth / 2;
        var centerY = selfY + selfHeight / 2;
        ctx.translate(centerX, centerY);
        ctx.rotate(this._rotation);
        ctx.translate(-centerX, -centerY);
      }

      // stuff that applies to all children
      if (this._alpha) ctx.globalAlpha = this._alpha;

      if (this._clip) {
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
    var children = this._children;
    var childrenlength = 0;
    if(children){
      childrenlength = children.length;
    }

    if (this._onDrawFunction && childrenlength > 0) {
      if(this._useBuffer){
        draw_simple_container_with_self_drawing_buffered.call(this, ctx, scale, oppositeScale, x, y);
      }
      else{ // draw_simple_container_with_self_drawing
        if(ctx) {
          ctx.save();
          ctx.translate(x + this._x, y + this._y);
          if(this._recalculate){
            this._recalculate = false;
            // TODO: uncomment when moving to new style
            //call_onprepare.call(this, ctx, true, false);
            this.onCalculate(ctx, scale, oppositeScale);
          }
          // TODO: uncomment when moving to new style
          //call_onprepare.call(this, ctx, false, true);
          this.onSetContext(ctx);
          this._onDrawFunction.call(this, ctx, scale, oppositeScale);
          ctx.restore();
        }
        this._recalculate = false; // need this because it is involved in the calculation of the upper level recalculate later
        this._upperLevelNeedsRecalculate = false;
        for (var i = 0; i < childrenlength; i++) {
          children[i].generate_buffer(ctx, scale, oppositeScale, x + this._x, y + this._y);
        }
      }
    }
    else if(childrenlength > 0){
      if(this._useBuffer){ //draw_simple_container_buffered
        if(this._recalculate) {
          this._recalculate = false;
          this._cache_use_counter = -1;
        }
        if(this._cache_use_counter < childrenlength) { // create the buffer
          this._upperLevelNeedsRecalculate = false;
          if(this._cache_use_counter === -1)
          {
            this._cache_use_counter = childrenlength;
            this._bufferContext.clearRect(0, 0, this._width, this._height); // clear the buffer canvas
          }
          else{
            this._cache_use_counter = childrenlength;
            // draw children which are not already drawn on the buffer canvas
            var children = this._children;
            var childrenlength = children.length;
            for (var i = this._cache_use_counter; i < childrenlength; i++) { 
              children[i].inner_draw(this._bufferContext, scale, oppositeScale, 0, 0); 
            }
          }
        }
        else{ // draw the buffer on the canvas
          this._upperLevelNeedsRecalculate = false;
          if(ctx){
            ctx.save();
            ctx.scale(oppositeScale, oppositeScale);
            ctx.drawImage(this._bufferCanvas, (x + this._x) * scale, (y + this._y) * scale); 
            ctx.restore();
          }
        }
      }
      else{
        draw_simple_container.call(this, ctx, scale, oppositeScale, x, y); 
      }
    }
    else if(this._onDrawFunction){
      if(this._useBuffer){ // simple_draw_buffered
        if(this._recalculate){
          this._recalculate = false;
          this._upperLevelNeedsRecalculate = false;
          this.onCalculate(this._bufferContext, scale, oppositeScale);
          this._bufferContext.clearRect(0,0,this._width,this._height); 
          this.onSetContext(this._bufferContext);
          // TODO: uncomment when moving to new style
          //call_onprepare.call(this, bufferCtx, true, true);
          this._onDrawFunction.call(this, this._bufferContext, scale, oppositeScale);
        }
        else if(this._cache_use_counter === -1){
          this._upperLevelNeedsRecalculate = false;
          this._bufferContext.clearRect(0,0,this._width,this._height); 
          // TODO: uncomment when moving to new style
          //call_onprepare.call(this, this._bufferContext, false, true);
          this.onSetContext(this._bufferContext);
          this._onDrawFunction.call(this, this._bufferContext, scale, oppositeScale);
        }
        else if(this._cache_use_counter === 0){ 
          this._upperLevelNeedsRecalculate = false;
          // TODO: uncomment when moving to new style
          //call_onprepare.call(this, this._bufferContext, false, true);
          this.onSetContext(this._bufferContext);
          this._onDrawFunction.call(this, this._bufferContext, scale, oppositeScale);
          
        }
        else if(this._cache_use_counter === 1){ 
          this._upperLevelNeedsRecalculate = false;
          this._onDrawFunction.call(this, this._bufferContext, scale, oppositeScale);
        }
        this._cache_use_counter = 2;
        if(ctx){
          ctx.save();
          ctx.scale(oppositeScale, oppositeScale);
          ctx.drawImage(this._bufferCanvas, (x + this._x) * scale, (y + this._y) * scale); 
          ctx.restore();
        }
      }
      else{ //simple_draw
        if(ctx){
          ctx.translate(x + this._x, y + this._y);
          if(this._recalculate){
            this._recalculate = false;
            // TODO: uncomment when moving to new style
            //call_onprepare.call(this, ctx, true, false);
            this.onCalculate(ctx, scale, oppositeScale);
          }
          // TODO: uncomment when moving to new style
          //call_onprepare.call(this, ctx, false, true);
          this.onSetContext(ctx);
          this._onDrawFunction.call(this, ctx, scale, oppositeScale);
        }
      }
    }
    else{
      alert('Jony WTF?!?!?!?!?! no children and no ondraw');
    }

    if(this._debug && ctx){
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
    for (var i = 0; i < this.invalidators.length; ++i) {
      var prop = this.invalidators[i];
      this[prop]; // invoke getter
    }

    this._recalculate = true;
    this._upperLevelNeedsRecalculate = true;

    var selfX = this.x;
    var selfY = this.y;
    var selfWidth = this.width;
    var selfHeight = this.height;

    ctx.save();

    // TODO: Rotation and clip will probably not work well right now - investigate 
    if (this.rotation) {
      var centerX = selfX + selfWidth / 2;
      var centerY = selfY + selfHeight / 2;
      ctx.translate(centerX, centerY);
      ctx.rotate(this._rotation);
      ctx.translate(-centerX, -centerY);
    }

    // stuff that applies to all children
    ctx.translate(selfX, selfY);
    if (this.alpha) ctx.globalAlpha = this.alpha;

    if (this.clip) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(selfWidth, 0);
      ctx.lineTo(selfWidth, selfHeight);
      ctx.lineTo(0, selfHeight);
      ctx.closePath();
      ctx.clip();
    }

    // call `ondraw` for rendering.
    if (this.ondraw) {
      if (selfWidth > 0 && selfHeight > 0) {
        ctx.save();
        this.ondraw(ctx, scale, oppositeScale);
        ctx.restore();
      }
    }

    var children = this.children;
    for (var i = 0; i < children.length; i++) {
      //TODO: do not draw child if out of viewport
      children[i].inner_draw(ctx, scale, oppositeScale);
    };

    if(this.debug){
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

      drawborder.call(this);
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
      this._useBuffer = this.useBuffer;
    }
    else{
      // TODO: don't use hard coded numbers - calculate a size which is between 1/10 and 1/4 of the screen
      if (this._children && this._children.length > 1 && (this._width * this._height < 50000) && (this._width * this._height > 10000)){
        this._useBuffer = true;
      }
      else{
        this._useBuffer = false;
      }
    }
  }

  function resize_buffer_canvas(scale){
    if(!this._useBuffer){
      alert('WTF?')
      return;
    }

    // TODO: make this a function and move somewhere else.
    // TODO: think if we need both recalculate and canusecashe and see how to solve
    this._recalculate = true;
    this._upperLevelNeedsRecalculate = true;
    this._cache_use_counter = -1;

    if(!this._bufferCanvas){
      this._bufferCanvas = document.createElement("canvas");
      this._bufferCanvas.x = 0;
      this._bufferCanvas.y = 0;
    }
    
    this._bufferCanvas.width = this._width * scale;
    this._bufferCanvas.height = this._height * scale;
    
    this._bufferContext = this._bufferCanvas.getContext('2d');
    this._bufferContext.scale(scale, scale);
  }

  // TODO: make sure that this is needed and change name if it is
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
    if(!this._visible || this._alpha === 0.0 || this._width <= 0 || this._height <= 0){
      this.inner_draw = empty_draw; 
    }
    else if((!this._alpha || this._alpha === 1.0) && (!this._rotation || this._rotation === 0) && !this._clip && !this._debug){
      if(!this._children || this._children.length === 0){
        if(this._onDrawFunction){
          if(this._use_buffer_needs_recalculating){
            recalculateUseBuffer.call(this);
          }
          if(this._useBuffer){
            if (this._canvasNeedsResizing){
              resize_buffer_canvas.call(this, scale);
              this._canvasNeedsResizing = false;  
            }
            this.inner_draw = simple_draw_buffered;
          }
          else{
            this.inner_draw = simple_draw; 
          }
        }
        else{
          this.inner_draw = empty_draw; 
        }
      }
      else{ // has children
        if(this._use_buffer_needs_recalculating){
          recalculateUseBuffer.call(this);
        }
        if(this._onDrawFunction){
          if(this._useBuffer){
            if (this._canvasNeedsResizing){
              resize_buffer_canvas.call(this, scale);
              this._canvasNeedsResizing = false;  
            }
            this.inner_draw = draw_simple_container_with_self_drawing_buffered;  
          }
          else{
            this.inner_draw = draw_simple_container_with_self_drawing;  
          }
        }
        else{
          if(this._useBuffer){
            if (this._canvasNeedsResizing){
              resize_buffer_canvas.call(this, scale);
              this._canvasNeedsResizing = false;  
            }
            this.inner_draw = draw_simple_container_buffered; 
          }
          else{
            this.inner_draw = draw_simple_container;   
          }
        } 
      }
    }
    // TODO: Make this more fine grained by adding more draw function types
    else{ // if((this._alpha >= 0.0 && this._alpha <= 1.0) || this._rotation > 0 || this._clip || this._debug){
      if(this._use_buffer_needs_recalculating){
        recalculateUseBuffer.call(this);
      }
      if (this._canvasNeedsResizing && this._useBuffer){
        resize_buffer_canvas.call(this, scale);
        this._canvasNeedsResizing = false;  
      }
      this.inner_draw = draw_optimized;
    }
    this.inner_draw(ctx, scale, oppositeScale, x, y);
  }

  function on_use_buffer_value_changed(new_value, old_value, prop, bound_to_function, sync){
    this._canvasNeedsResizing = true;
    this._use_buffer_needs_recalculating = true;
    this.inner_draw = determine_draw_function_and_execute;
  }

  function on_x_value_changed(new_value, old_value, prop, bound_to_function, sync){
    this._x = new_value;

    // this layer doesn't need recalculating since uts position doesnt affect how it is drawn
    this._upperLevelNeedsRecalculate = true;
  }

  function on_y_value_changed(new_value, old_value, prop, bound_to_function, sync){
    this._y = new_value;

    // this layer doesn't need recalculating since uts position doesnt affect how it is drawn
    this._upperLevelNeedsRecalculate = true;
  }

  function on_width_value_changed(new_value, old_value, prop, bound_to_function, sync){
    this._width = new_value;
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
      this._canvasNeedsResizing = true;
      this._use_buffer_needs_recalculating = true;
      this.inner_draw = determine_draw_function_and_execute;
      return;
    }
    else{ 
      // new_value > 0 and old_value <= 0, so we are transffering from empty draw to something else.
      // setting calculate_draw_function to true because determaining the function depends on the other params as well
      this._canvasNeedsResizing = true;
      this._use_buffer_needs_recalculating = true;
      this.inner_draw = determine_draw_function_and_execute;
    }
  }

  function on_height_value_changed(new_value, old_value, prop, bound_to_function, sync){
    this._height = new_value;
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
      this._canvasNeedsResizing = true;
      this.inner_draw = determine_draw_function_and_execute;
      return;
    }
    else{ 
      // new_value > 0 and old_value <= 0, so we are transffering from empty draw to something else.
      // setting calculate_draw_function to true because determaining the function depends on the other params as well
      this._canvasNeedsResizing = true;
      this.inner_draw = determine_draw_function_and_execute;
    }
  }

  function on_visible_value_changed(new_value, old_value, prop, bound_to_function, sync){
    this._visible = new_value;

    if(new_value === false){
      // if this callback will be called towards the end (and it will because of the order of putting vars in the hash)
      // then no matter which callbacks came before it there will not be any re-calculation
      this.inner_draw = empty_draw;
      return;
    }
    else{ 
      // the box was invisible and now is visible.
      // setting calculate_draw_function to true because determaining the function depends on the other params as well
      this._canvasNeedsResizing = true;
      this.inner_draw = determine_draw_function_and_execute;
    }
  }

  function on_clip_value_changed(new_value, old_value, prop, bound_to_function, sync){
    this._clip = new_value;
    this._recalculate = true;
    this._upperLevelNeedsRecalculate = true;

    // clip settings have changed.
    // setting calculate_draw_function to true because determaining the function depends on the other params as well
    this.inner_draw = determine_draw_function_and_execute;
  }

  function on_ondraw_value_changed(new_value, old_value, prop, bound_to_function, sync){
    this._onDrawFunction = new_value;
    this._recalculate = true;
    this._upperLevelNeedsRecalculate = true;

    // ondraw method was removed or added.
    // setting calculate_draw_function to true because determaining the function depends on the other params as well
    this._use_buffer_needs_recalculating = true;
    this.inner_draw = determine_draw_function_and_execute;
  }

  function on_rotation_value_changed(new_value, old_value, prop, bound_to_function, sync){
    this._rotation = new_value;

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
    this._children = new_value;
    this._recalculate = true;
    this._upperLevelNeedsRecalculate = true;

    // TODO: either add a watch on the children length or add calculation of pre_draw function 
    // in add and remove children..

    if(old_value && old_value.length > 0 && this._children && this._children.length > 0){
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
      this._use_buffer_needs_recalculating = true;
      this.inner_draw = determine_draw_function_and_execute;
    }
  }

  function on_alpha_value_changed(new_value, old_value, prop, bound_to_function, sync){
    this._alpha = new_value;
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
    this._debug = new_value;

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