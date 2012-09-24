var box = require('./box');
var capture = require('./interaction').capture;
var bind = require('./bind');
var tick = bind.tick;

module.exports = function(options) {
  options = options || {};

  // we are "DOMfull" if we have a `window` object.
  var domless = (typeof window === 'undefined');

  // by default, start non-paused unless we are domless.
  options.paused = 'paused' in options ? options.paused : domless;

  // by default we do not do auto resize
  options.autoresize = 'autoresize' in options ? options.autoresize : false;

  // shim `window` for DOM-less executions (e.g. node.js)
  if (domless) window = {};

  window.requestAnimationFrame || (
    window.requestAnimationFrame = 
    window.webkitRequestAnimationFrame || 
    window.mozRequestAnimationFrame    || 
    window.oRequestAnimationFrame      || 
    window.msRequestAnimationFrame     || 
    function(cb) { setTimeout(cb, 14); }
  );

  // TODO: This line is added so we can measure performance differences correctly between versions.
  //       Remove before releasing the platform (or consider keeping it since it provides maximum performance)
  window.requestAnimationFrame = function(cb) { setTimeout(cb, 20); }

  // TODO: incorporate this:
  /*
  devicePixelRatio = window.devicePixelRatio || 1,
        backingStoreRatio = context.webkitBackingStorePixelRatio ||
                            context.mozBackingStorePixelRatio ||
                            context.msBackingStorePixelRatio ||
                            context.oBackingStorePixelRatio ||
                            context.backingStorePixelRatio || 1,

        ratio = devicePixelRatio / backingStoreRatio;
  */
  // TODO: read about it here: http://www.html5rocks.com/en/tutorials/canvas/hidpi/

  window.devicePixelRatio || (window.devicePixelRatio = 1);
  // TODO: this line fixes freezes in Android on chrome browser. Find out why
  //       and then remove (this is extra weird cause the devicePixelRatio is a number and 
  //       its value is 2 before the set - so why does setting it again to the same value make
  //       any difference????????!!!
  if (window.devicePixelRatio === 2){
    window.devicePixelRatio = 2;
  }

  //window.devicePixelRatio = 2;
  // window.devicePixelRatio = 2;
  //alert(window.devicePixelRatio);

  //TODO: Added 4 lines below for debugging - remove when done
  //TODO: please do not submit this hunk uncommented because tests fail
  //alert('Pixel ratio' + window.devicePixelRatio);
  //window.devicePixelRatio = 2;
  //alert('Pixel ratio' + window.devicePixelRatio);

  var canvas = null;
  var bufferCanvas = null;
  var ctx = null;
  var bctx = null;
  var mctx = null;
  var dpr = 1; //device pixel ratio
  var odpr = 1; //opposite device pixel ratio
  var canvasWidth = 0;
  var canvasHeight = 0;

  function createMockCtx(ctx){
    var mockContext = { 
      
      // command types: 
      // 1 - property set
      // 2 - function with arguments
      // 3 - function without arguments
      commands: [],
      realContext: ctx,
      properties: ['fillStyle', 'strokeStyle', 'shadowColor', 'shadowBlur', 'shadowOffsetX', 'shadowOffsetY',
                   'lineCap', 'lineJoin', 'lineWidth', 'miterLimit', 'font', 'textAlign', 'textBaseline',
                   'globalAlpha', 'globalCompositeOperation', 'canvas'],

      // TODO: Make special case for draw image in order not to pass the image itself              
      functionsWithParams: ['createLinearGradient', 'createPattern', 'createRadialGradient', 'addColorStop',
                            'rect', 'fillRect', 'strokeRect', 'clearRect', 'moveTo', 'lineTo', 'quadraticCurveTo',
                            'bezierCurveTo', 'arc', 'arcTo', 'scale', 'rotate', 'translate',
                            'transform', 'setTransform', 'fillText', 'strokeText', 'drawImage'],
      functionsWithoutParams: ['fill', 'stroke', 'beginPath', 'closePath', 'clip', 'save', 'restore'],
      unsupportedFunctions: ['createImageData', 'getImageData', 'putImageData', 
                             'createEvent', 'getContext', 'toDataURL', 'isPointInPath'],

      commandsLength: 0,

      createProperty: function(prop) {
        Object.defineProperty(this, prop, {
          get: function() {
            return this.realContext[prop];
          },
          set: function(value) {
            var length = this.commandsLength;
            this.commands[length] = 1; //meaning prop
            this.commands[length + 1] = prop; //
            this.commands[length + 2] = value; //
            this.commandsLength += 3;
          },
          enumerable: true,
          configurable: true,
        });
      },

      createProperties: function(){
        for (var i = 0; i < this.properties.length; i++) {
          this.createProperty(this.properties[i]); 
        };
      },

      createFunction: function(name, receivesArgs, supported) {
        if(supported) {
          this[name] = function() {
            var length = this.commandsLength;
            receivesArgs ? this.commands[length] = 2 : this.commands[length] = 3;
            this.commands[length + 1] = name;
            if (receivesArgs){
              this.commands[length + 2] = arguments;
              this.commandsLength += 3;
            }
            else{
              this.commandsLength += 2;
            }
          }
        }
        else {
          this[name] = function(){
            throw new Error(name + ' is not supported');
          }
        }
      },

      createFunctions: function(){
        for (var i = 0; i < this.functionsWithParams.length; i++) {
          this.createFunction(this.functionsWithParams[i], true, true); 
        };

        for (var i = 0; i < this.functionsWithoutParams.length; i++) {
          this.createFunction(this.functionsWithoutParams[i], false, true); 
        };

        for (var i = 0; i < this.unsupportedFunctions.length; i++) {
          this.createFunction(this.unsupportedFunctions[i], false, false); 
        };
      },

      measureText: function(text) {
        //this.commands.push(2);
        //this.commands.push('measureText');
        //this.commands.push(arguments);
        //this.commandsLength += 3;
        var length = this.commandsLength;
        this.commands[length] = 2;
        this.commands[length + 1] = 'measureText';
        this.commands[length + 2] = arguments;
        this.commandsLength += 3;
        return this.realContext.measureText(text);
      },

      executeCommands: function(){
        var context = this.realContext;
        var commands = this.commands;
        var commandsLength = this.commandsLength;
        
        for(var i =0; i < commandsLength; i++){
          // command types: 
          // 1 - property set
          // 2 - function with arguments
          // 3 - function without arguments
          var command = commands[i];
          if(command === 3){
           context[commands[++i]](); 
          }
          else if(command === 1){
            context[commands[++i]] = commands[++i];
          }
          else if(command === 2){
           context[commands[++i]].apply(context, commands[++i]); 
          }
          
          //command = commands[++i];
        }
        this.commandsLength = 0;

        /*
        var command = commands.shift();
        while(command != null){
          // command types: 
          // 1 - property set
          // 2 - function with arguments
          // 3 - function without arguments

          if(command === 3){
           context[commands.shift()](); 
          }
          else if(command === 1){
            context[commands.shift()] = commands.shift();
          }
          else if(command === 2){
           context[commands.shift()].apply(context, commands.shift()); 
          }
          
          command = commands.shift();
        }
        */
      },

    } 

    mockContext.createProperties();
    mockContext.createFunctions();
    return mockContext;  
  }

  if (options.element) {
    canvas = options.element;
    canvas.width = canvas.width || parseInt(canvas.style.width) * window.devicePixelRatio;
    canvas.height = canvas.height || parseInt(canvas.style.height) * window.devicePixelRatio;
  }
  else {
    if (typeof document === 'undefined') {
      throw new Error('No DOM. Please pass a Canvas object (e.g. node-canvas) explicitly');
    }

    if (document.body.hasChildNodes()) {
      while (document.body.childNodes.length) {
        document.body.removeChild(document.body.firstChild);
      }
    }

    document.body.style.background = 'rgba(0,0,100,0.0)';
    document.body.style.padding = '0px';
    document.body.style.margin = '0px';

    canvas = document.createElement('canvas');
    canvas.style.background = 'rgba(0,0,0,0.0)';
    document.body.appendChild(canvas);

    bufferCanvas = document.createElement("canvas");
    bufferCanvas.style.background = 'rgba(0,0,0,0.0)';

    function adjust_size() {
      var scale = window.devicePixelRatio;

      // http://joubert.posterous.com/crisp-html-5-canvas-text-on-mobile-phones-and
      // TODO: if devicepixelratio changes then need to invalidate all boxes in the system
      // TODO: if canvas dimentions change then need to invalidate only top layer to draw on top
      // of the canvas
      canvas.width = window.innerWidth * scale;
      canvas.height = window.innerHeight * scale;
      //window.innerWidth = window.innerWidth * 2;
      //window.innerHeight = window.innerHeight * 2;
      canvas.style.width = window.innerWidth;
      canvas.style.height = window.innerHeight;
      dpr = scale;
      odpr = 1 / scale;
      canvasWidth = canvas.width;
      canvasHeight = canvas.height;
      bufferCanvas.width = canvasWidth;
      bufferCanvas.height = canvasHeight;

      var c = canvas.getContext('2d');
      var bc = bufferCanvas.getContext('2d');
      c.scale(scale, scale);
      bc.scale(scale,scale);
      ctx = c;
      bctx = bc;
      mctx = createMockCtx(ctx);

      if(main){
        // TODO: this is temporary - it saves the binding of width and height
        main.permiateOriginalCanvas(canvas, c , 2, scale);
      }
    }

    window.onresize = function() {
      if (main && main.autoresize) {
        adjust_size();
      }
    };

    document.body.onorientationchange = function() {
      adjust_size();
    };

    setTimeout(function() { 
      window.scrollTo(0, 0);
      adjust_size();
      window.onresize();
    }, 0);

    adjust_size();
  }

  options = options || {};
  options.id = options.id || 'canvas';
  options.x = options.x || 0;
  options.y = options.y || 0;

  var main = box(options);

  main.domless = domless;
  main.canvas = canvas;
  main.bufferCanvas = bufferCanvas;

  // hook canvas events to `main.interact()`.
  capture(canvas, function(event, coords, e) {
    return main.interact(event, coords, e);
  });

  main.paused = options.paused;

  var fps_start_time = Date.now();
  var fps = 0;
  var biggestDelta = 0;
  var smallestDelta = 99999;
  var lastTime = 0;
  var counter = 0;

  function first_redraw(){
    // this function exists because if we call the regular redraw the 1st time then
    // all the callbacks which are supposed to run on the second thread run on the 1st 

    main.redraw = redraw;

    //setInterval(redraw, 33.33);
    window.requestAnimationFrame(redraw);
  }

  function redraw() {
    //if (!main.paused) {
         
    //}
    window.requestAnimationFrame(redraw); 
    tick();
    // TODO: pre_draw -> invalidated() 
    if (main.pre_draw()) {
      //ctx.clearRect(0, 0, canvasWidth, canvasHeight); 
      main.inner_draw(ctx, dpr, odpr, 0, 0);
    }

    // calculate FPS
    //TODO: change to property instead of `emit`.

    // TODO: move stats calculation elsewhere
    
    var now = Date.now();
    var delta = now - fps_start_time;
    fps++;

    // emit fps every ~1sec
    if (delta >= 1000) {
      console.log('FPS: ', (fps / (delta / 1000)));
      fps = 0;
      fps_start_time = now;
    };

    //window.requestAnimationFrame(redraw); 

    //TODO: BAL (browser abstraction layer)
  }

  function redraw_BU() {
    if (!main.paused) window.requestAnimationFrame(redraw);
    var startTime = Date.now();
    if (main.paused) return; // stop redraw loop if we are paused.
    
    counter++;

    //if(counter < 500){
    if(true){
      if(true){
        tick();
          // TODO: pre_draw -> invalidated()
        var invalidated = main.pre_draw(); 
        //invalidated = true;
        if (invalidated) {
          ctx.clearRect(0, 0, canvasWidth, canvasHeight); 
          main.inner_draw(ctx, dpr, odpr);
          //var imgData=ctx.getImageData(250,250,50,50);
        }
        else {
          //ctx.clearRect(0, 0, 1, 1); 
        }
      }
      else if(counter === 500){
        console.log('drawing buffer only');
      }
      var endTime = Date.now();
      var deltaTime = endTime - startTime;
      if(deltaTime < 0){
        //console.log('using timer: ' + (20 - deltaTime));
        setTimeout(function() {
          ctx.clearRect(0,0,canvasWidth,canvasHeight);

          ctx.drawImage(bctx.canvas, 0, 0);  

          var now = Date.now();
          var cd = now - lastTime;
          var delta = now - fps_start_time;
          lastTime = now;
          if (cd > biggestDelta) {
            biggestDelta = cd;
          }
          else if (cd < smallestDelta) {
            smallestDelta = cd;
          }

          fps++;

          // emit fps every ~1sec
          if (delta >= 1000) {
            //main.emit('fps', (fps / (delta / 1000)));
            console.log('FPS: ', (fps / (delta / 1000)));
            //console.log('BD: ', biggestDelta);
            //console.log('SD: ', smallestDelta);
            biggestDelta = 0;
            smallestDelta = 99999;
            fps = 0;
            fps_start_time = now;
          };
          

          //TODO: BAL (browser abstraction layer)
          if (!main.paused) window.requestAnimationFrame(redraw);

        }, 30 - deltaTime);
        return;
      }
      else{
        //ctx.scale(odpr,odpr);
        //ctx.clearRect(0,0,canvasWidth,canvasHeight);

        //ctx.drawImage(bctx.canvas, 0, 0);
      }
    }
    else if(counter === 500){
      console.log('Started using mock as proxy');
    }
    else if(counter < 1000){
      tick();
      var invalidated = main.pre_draw(); 
      invalidated = true;
      if (invalidated) {
        mctx.clearRect(0, 0, canvasWidth, canvasHeight); 
        main.inner_draw(mctx, dpr, odpr);
      }
      else {
        // temp - this is to make animation smoother - make the GPU work a little bit even when there is nothing to be done
        // TODO: find better way to do this
        mctx.clearRect(0, 0, 1, 1); 
      }
      //var tmp = mctx.commands.concat();
      mctx.executeCommands();
    }
    else if(counter === 1000){
      
      tick();
      var invalidated = main.pre_draw(); 
      invalidated = true;
      if (invalidated) {
        mctx.clearRect(0, 0, canvasWidth, canvasHeight); 
        main.inner_draw(mctx, dpr, odpr);
      }
      else {
        // temp - this is to make animation smoother - make the GPU work a little bit even when there is nothing to be done
        // TODO: find better way to do this
        mctx.clearRect(0, 0, 1, 1); 
      }
      console.log('started using only mock. /nnumber of commands: ' + mctx.commands.length + ' ' + mctx.commandsLength);
    }
    else{
      //var tmp = mctx.commands.concat();
      var tmp = mctx.commandsLength;
      mctx.executeCommands();
      //mctx.commands = tmp;
      mctx.commandsLength = tmp;
    }

    
    
    // calculate FPS
    //TODO: change to property instead of `emit`.

    // TODO: move stats calculation elsewhere
    var now = Date.now();
    var cd = now - lastTime;
    var delta = now - fps_start_time;
    lastTime = now;
    if (cd > biggestDelta) {
      biggestDelta = cd;
    }
    else if (cd < smallestDelta) {
      smallestDelta = cd;
    }

    fps++;

    // emit fps every ~1sec
    if (delta >= 1000) {
      //main.emit('fps', (fps / (delta / 1000)));
      console.log('FPS: ', (fps / (delta / 1000)));
      //console.log('BD: ', biggestDelta);
      //console.log('SD: ', smallestDelta);
      biggestDelta = 0;
      smallestDelta = 99999;
      fps = 0;
      fps_start_time = now;
    };
    

    //TODO: BAL (browser abstraction layer)
    
  }
  
  main.redraw = first_redraw;

  main.pause = function() {
    this.paused = true;
  };

  main.resume = function() {
    this.paused = false;
    main.redraw(); // kick start redraw
  };

  if (!main.paused) {
    main.redraw();
  }



  return main;
};