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

  requestAnimationFramePolyfill();

  // // TODO: This line is added so we can measure performance differences correctly between versions.
  // //       Remove before releasing the platform (or consider keeping it since it provides maximum performance)
  // window.requestAnimationFrame = function(cb) { setTimeout(cb, 1); }

  window.devicePixelRatio || (window.devicePixelRatio = 1);
  // TODO: this line fixes freezes in Android on chrome browser. Find out why
  //       and then remove (this is extra weird cause the devicePixelRatio is a number and 
  //       its value is 2 before the set - so why does setting it again to the same value make
  //       any difference????????!!!
  // TODO: any references to this somewhere?
  if (window.devicePixelRatio === 2){
    window.devicePixelRatio = 2;
  }

  console.log('devicePixelRatio:', window.devicePixelRatio);

  var canvas = null;
  var ctx = null;

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


      var c = canvas.getContext('2d');
      c.scale(scale, scale);
      ctx = c;

      if(main){
        // TODO: this is temporary - it saves the binding of width and height
        main.permiate(canvas, c , 2, scale);
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
  var firstDraw = true;

  function redraw(force) {
    if (!force && main.paused) return; // stop redraw loop if we are paused.
    if(!ctx) return;
    
    // hack - the first draw is called on the first thread, and if we tick here then 
    // all the watch callbacks which are supposed to be called the next thread will be called
    // on this one.
    // TODO: Find a better way to do this
    if(firstDraw){
      firstDraw = false;
    }
    else{
      tick();
      var rec = main.prepare();
      if (rec)
      {
        ctx.clearRect(0, 0, canvas.width, canvas.height); 
        var dpr = window.devicePixelRatio;
        main.draw(ctx, dpr, 1/dpr);
      }
    }

    // calculate FPS

    var now = Date.now();
    var delta = now - fps_start_time;
    fps++;

    main.fps = fps / (delta / 1000);

    // emit fps every ~1sec
    if (delta >= 1000) {
      main.emit('fps', main.fps);
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

// -- private

// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating

// requestAnimationFrame polyfill by Erik Möller
// fixes from Paul Irish and Tino Zijdel
function requestAnimationFramePolyfill() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame'] 
                                   || window[vendors[x]+'CancelRequestAnimationFrame'];
    }
 
    if (!window.requestAnimationFrame)
      console.warn('no window.requestAnimationFrame');
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); }, 
              timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
 
    if (!window.cancelAnimationFrame)
      console.warn('no window.cancelAnimationFrame');
      window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
};