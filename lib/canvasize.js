var box = require('./box');
var capture = require('./interaction').capture;
var bind = require('./bind');

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

  window.devicePixelRatio || (window.devicePixelRatio = 1);

  //TODO: Added 4 lines below for debugging - remove when done
  //TODO: please do not submit this hunk uncommented because tests fail
  //window.requestAnimationFrame = function(cb) { setTimeout(cb, 1); }
  //alert('Original pixel ratio: ' + window.devicePixelRatio);
  //window.devicePixelRatio = 2;
  //alert('Pixel ratio: ' + window.devicePixelRatio);

  var canvas = null;

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
      // http://joubert.posterous.com/crisp-html-5-canvas-text-on-mobile-phones-and
      canvas.width = window.innerWidth * window.devicePixelRatio;
      canvas.height = window.innerHeight * window.devicePixelRatio;
      canvas.style.width = window.innerWidth;
      canvas.style.height = window.innerHeight;

      // The buffer will be used only on platforms on which it is benefitial 
      // (some platforms gain much from using it while others perform slower)
      bufferCanvas.x = canvas.x;
      bufferCanvas.y = canvas.y;
      bufferCanvas.width = canvas.width;
      bufferCanvas.height = canvas.height;
      bufferCanvas.style.width = canvas.style.width;
      bufferCanvas.style.height = canvas.style.height;

      var c = canvas.getContext('2d');
      c.scale(window.devicePixelRatio, window.devicePixelRatio);
      var bc = bufferCanvas.getContext('2d');
      bc.scale(window.devicePixelRatio, window.devicePixelRatio);
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
  // TODO: deliberately binding with wrong names in order to get an autobind and not get the property bound to options cause then
  // in the box constructor it will already be a property and not transffer from attributes to obj. 
  // Need to fix this!!
  var hoptions;
  options.width = options.width || bind(hoptions, 'width', function() { return canvas.width / window.devicePixelRatio; });
  options.height = options.height || bind(hoptions, 'height', function() { return canvas.height / window.devicePixelRatio; });

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

  function redraw(force) {
    if (!force && main.paused) return; // stop redraw loop if we are paused.
    var ctx = canvas.getContext('2d');
    var bufferCtx = bufferCanvas.getContext('2d');

    // TODO: determine this var based on the platform on which we are running
    // (some platforms gain much from using it while others perform slower)
    var useBuffer = false;
    //TODO: since the canvas fills the screen we don't really need this?
    if (main.alpha && main.alpha() < 1.0) {
      if (useBuffer) {
        bufferCtx.clearRect(0, 0, canvas.width, canvas.height);  
      }
      else{
        ctx.clearRect(0, 0, canvas.width, canvas.height);   
      }
    }
    
    // TODO: passing many vars for calculations if to draw boxes or not, see if this optimization is indeed needed, and if so find better way to do it
    main.draw(useBuffer ? bufferCtx : ctx, 0, 0, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);

    if (useBuffer) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bufferCtx.canvas);
    }

    //TODO: maybe can do this in stead of scale..
    //ctx.drawImage(bufferCtx.canvas, 0, 0, 500, 500, 0,0,1000, 1000);

    var now = Date.now();
    var delta = now - fps_start_time;
    fps++;

    // emit fps every ~1sec
    if (delta >= 1000) {
      main.emit('fps', (fps / (delta / 1000)));
      // TODO: remove when build tools support windows in their latest version
      console.log('fps: ', (fps / (delta / 1000)));
      fps = 0;
      fps_start_time = now;
    };

    if (!main.paused) window.requestAnimationFrame(redraw);
  }
  
  if (!main.paused) {
    redraw();
  }

  main.redraw = function() {
    redraw(true);
  };

  main.pause = function() {
    this.paused = true;
  };

  main.resume = function() {
    this.paused = false;
    redraw(); // kick start redraw
  };

  return main;
};