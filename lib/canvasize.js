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
    function(cb) { setTimeout(cb, 1000/60); }
  );

  // TODO: This line is added so we can measure performance differences correctly between versions.
  //       Remove before releasing the platform (or consider keeping it since it provides maximum performance)
  //window.requestAnimationFrame = function(cb) { setTimeout(cb, 1); }

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
  var ctx = null;
  var dpr = 1; //device pixel ratio
  var odpr = 1; //opposite device pixel ratio
  var canvasWidth = 0;
  var canvasHeight = 0;

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

    var bufferCanvas = document.createElement("canvas");

    function adjust_size() {
      var scale = window.devicePixelRatio;

      // http://joubert.posterous.com/crisp-html-5-canvas-text-on-mobile-phones-and
      canvas.width = window.innerWidth * scale;
      canvas.height = window.innerHeight * scale;
      canvas.style.width = window.innerWidth;
      canvas.style.height = window.innerHeight;
      dpr = scale;
      odpr = 1 / scale;
      canvasWidth = canvas.width;
      canvasHeight = canvas.height;

      var c = canvas.getContext('2d');
      c.scale(scale, scale);
      ctx = c;

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

  function first_redraw(){
    // this function exists because if we call the regular redraw the 1st time then
    // all the callbacks which are supposed to run on the second thread run on the 1st 

    main.redraw = redraw;

    window.requestAnimationFrame(redraw);
  }

  function redraw() {
    if (main.paused) return; // stop redraw loop if we are paused.
    
    tick();

    // TODO: pre_draw -> invalidated()
    var invalidated = main.pre_draw(); 
    if (invalidated) {
      ctx.clearRect(0, 0, canvasWidth, canvasHeight); 
      main.draw(ctx, dpr, odpr);
    }
    else {
      // temp - this is to make animation smoother - make the GPU work a little bit even when there is nothing to be done
      // TODO: find better way to do this
      ctx.clearRect(0, 0, 1, 1); 
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
      console.log('BD: ', biggestDelta);
      console.log('SD: ', smallestDelta);
      biggestDelta = 0;
      smallestDelta = 99999;
      fps = 0;
      fps_start_time = now;
    };

    //TODO: BAL (browser abstraction layer)
    if (!main.paused) window.requestAnimationFrame(redraw);
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