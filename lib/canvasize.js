var view = require('./view');
var constant = require('./util').constant;
var layouts = require('./layouts');

var INTERACTION_EVENTS = [
  'touchstart',
  'touchmove',
  'touchend',
  'touchcancel',
  'mousedown',
  'mouseup',
  // 'click',
  // 'ongesturestart',
  // 'ongesturechange',
  // 'ongestureend',
];

module.exports = function(options) {

  window.requestAnimationFrame || (window.requestAnimationFrame = 
    window.webkitRequestAnimationFrame || 
    window.mozRequestAnimationFrame    || 
    window.oRequestAnimationFrame      || 
    window.msRequestAnimationFrame     || 
    function(callback, element) {
      return window.setTimeout(function() {
        callback(+new Date());
    }, 1000 / 60);
  });

  window.devicePixelRatio || (window.devicePixelRatio = 1);
  // window.devicePixelRatio = 1;
  console.log('devicePixelRatio:', window.devicePixelRatio);

  if (document.body.hasChildNodes()) {
    while (document.body.childNodes.length) {
      document.body.removeChild(document.body.firstChild);
    }
  }

  var canvas = document.createElement('canvas');
  document.body.appendChild(canvas);
  document.body.style.background = 'white';
  canvas.style.background = 'white';
  document.body.style.padding = '0px';
  document.body.style.margin = '0px';
  // document.body.style['min-height'] = '416px'; // this is the iphone screen height without the bottom safari bar

  window.onresize = function() {
    // http://joubert.posterous.com/crisp-html-5-canvas-text-on-mobile-phones-and
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
    canvas.style.width = window.innerWidth;
    canvas.style.height = window.innerHeight;
    canvas.getContext('2d').scale(window.devicePixelRatio, window.devicePixelRatio);
  };

  document.body.onorientationchange = window.onresize;

  setTimeout(function() { 
    window.scrollTo(0, 0);
    window.onresize();
  }, 0);

  window.onresize();

  var ctx = canvas.getContext('2d');

  options = options || {};
  options.id = options.id || constant('canvas');
  options.x = options.x || constant(0);
  options.y = options.y || constant(0);
  options.width = options.width || function() { return canvas.width / window.devicePixelRatio; };
  options.height = options.height || function() { return canvas.height / window.devicePixelRatio; };
  options.layout = options.layout || layouts.none();

  var main = view(options);

  // get the coordinates for a mouse or touch event
  // http://www.nogginbox.co.uk/blog/canvas-and-multi-touch
  function getCoords(e) {
    if (e.offsetX) {
      // works in chrome / safari (except on ipad/iphone)
      return { x: e.offsetX, y: e.offsetY };
    }
    else if (e.layerX) {
      // works in Firefox
      return { x: e.layerX, y: e.layerY };
    }
    else {
      // works in safari on ipad/iphone
      return { x: e.pageX - canvas.offsetLeft, y: e.pageY - canvas.offsetTop };
    }
  }

  // will log into a terminal (if attached).
  main.log = function() {
    var args = [];
    for (var i = 0; i < arguments.length; ++i) {
      args.push(arguments[i]);
    }

    var t = main.get('terminal');
    if (t) t.writeLine(args.join(' '));
  };

  // add mouse/touch interaction events
  INTERACTION_EVENTS.forEach(function(name) {
    canvas['on' + name] = function(e) {
      e.preventDefault();
      var coords = (name !== 'touchend') ? getCoords(e) : getCoords(e.changedTouches[0]);
      main.log('on' + name, coords.x + ',' + coords.y);
      main.interact(name, coords);
    };
  });

  function redraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    main.draw(ctx);
    window.requestAnimationFrame(redraw);
  }

  redraw();

  main.INTERACTION_EVENTS = INTERACTION_EVENTS;

  return main;
};