// -- animation
var easing = require('./easing');

module.exports = function(from, to, options) {
  options = options || {};
  options.duration = options.duration || 250;
  options.ondone = options.ondone || function() { };
  options.curve = options.curve || easing.easeInOutCubic;
  options.name = options.name || from.toString() + '_to_' + to.toString();
  options.event = options.event || 'animation-complete';

  var startTime = Date.now();
  var endTime = Date.now() + options.duration;
  var callbackCalled = false;

  return function () {
    var box = this;

    if (typeof from === 'function') from = from.call(box);
    if (typeof to === 'function') to = to.call(box);

    var elapsedTime = Date.now() - startTime;
    var ratio = elapsedTime / options.duration;
    if (ratio < 1.0) {
      curr = from + (to - from) * options.curve(ratio);
    }
    else {
      curr = to;
      if (options.ondone && !callbackCalled) {
        callbackCalled = true;
        box.emit(options.event, {
          from: from, to: to, options: options
        });
        options.ondone.call(box);
      }
    }
    return curr;
  };
};