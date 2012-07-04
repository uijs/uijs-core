var box = require('./box');
var constant = require('./util').constant;

var INTERACTION_EVENTS = [
  'touchstart',
  'touchmove',
  'touchend',
  'mousedown',
  'mousemove',
  'mouseup',
];

module.exports = function(options) {
  options = options || {};

  // we are "DOMfull" if we have a `window` object.
  var domless = (typeof window === 'undefined');

  // by default, start non-paused unless we are domless.
  options.paused = 'paused' in options ? options.paused : domless;

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

    document.body.style.background = 'white';
    document.body.style.padding = '0px';
    document.body.style.margin = '0px';

    canvas = document.createElement('canvas');
    canvas.style.background = 'green';
    document.body.appendChild(canvas);

    window.onresize = function() {

      // http://joubert.posterous.com/crisp-html-5-canvas-text-on-mobile-phones-and
      canvas.width = window.innerWidth * window.devicePixelRatio;
      canvas.height = window.innerHeight * window.devicePixelRatio;
      canvas.style.width = window.innerWidth;
      canvas.style.height = window.innerHeight;

      var c = canvas.getContext('2d');
      c.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    document.body.onorientationchange = window.onresize;

    setTimeout(function() { 
      window.scrollTo(0, 0);
      window.onresize();
    }, 0);

    window.onresize();
  }

  var ctx = canvas.getContext('2d');

  options = options || {};
  options.id = options.id || constant('canvas');
  options.x = options.x || constant(0);
  options.y = options.y || constant(0);
  options.width = options.width || function() { return canvas.width / window.devicePixelRatio; };
  options.height = options.height || function() { return canvas.height / window.devicePixelRatio; };

  var main = box(options);

  main.domless = domless;
  main.canvas = canvas;

  // get the coordinates for a mouse or touch event
  // http://www.nogginbox.co.uk/blog/canvas-and-multi-touch
  function getCoords(e) {
    if (e.touches && e.touches.length > 0) {
      e = e.touches[0];
      return { x: e.pageX - canvas.offsetLeft, y: e.pageY - canvas.offsetTop };
    }
    else if (e.offsetX) {
      // works in chrome / safari (except on ipad/iphone)
      return { x: e.offsetX, y: e.offsetY };
    }
    else if (e.layerX) {
      // works in Firefox
      return { x: e.layerX, y: e.layerY };
    }
    else if (e.pageX) {
      // works in safari on ipad/iphone
      return { x: e.pageX - canvas.offsetLeft, y: e.pageY - canvas.offsetTop };
    }
  }

  // add mouse/touch interaction events
  INTERACTION_EVENTS.forEach(function(name) {
    canvas['on' + name] = function(e) {
      e.preventDefault();
      var coords = (name !== 'touchend') ? getCoords(e) : getCoords(e.changedTouches[0]);
      if (coords) main.log('on' + name, coords.x + ',' + coords.y);
      else main.log('error - no coords for ' + name);
      
      main.interact(name, coords, e);
    };
  });

  main.paused = options.paused;

  function redraw(force) {
    if (!force && main.paused) return; // stop redraw loop if we are paused.

    //TODO: since the canvas fills the screen we don't really need this?
    if (main.alpha && main.alpha() < 1.0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    main.draw(ctx);

    if (!main.paused) window.requestAnimationFrame(redraw);
  }

  main.INTERACTION_EVENTS = INTERACTION_EVENTS;
  
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