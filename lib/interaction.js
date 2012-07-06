var EVENTS = {
  ontouchstart: 'touchstart',
  ontouchmove: 'touchmove',
  ontouchend: 'touchend',
  onmousedown: 'touchstart',
  onmousemove: 'touchmove',
  onmouseup: 'touchend',
};

function capture(el, fn) {

  // bind to all mouse/touch interaction events
  Object.keys(EVENTS).forEach(function(k) {
    el[k] = function(e) {
      var name = EVENTS[k];
      e.preventDefault();
      var coords = (name !== 'touchend' || !e.changedTouches) ? relative(e) : relative(e.changedTouches[0]);
      return fn(name, coords, e);
    };
  });

  // get the coordinates for a mouse or touch event
  // http://www.nogginbox.co.uk/blog/canvas-and-multi-touch
  function relative(e) {
    if (e.touches && e.touches.length > 0) {
      e = e.touches[0];
      return { x: e.pageX - el.offsetLeft, y: e.pageY - el.offsetTop };
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
      return { x: e.pageX - el.offsetLeft, y: e.pageY - el.offsetTop };
    }
  }
}

exports.capture = capture;