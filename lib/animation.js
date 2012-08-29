// -- animation
var easing = require('./easing');

module.exports = function(from, to, options) {
  options = options || {};
  options.duration = options.duration || 250;
  options.ondone = options.ondone || function() { };
  options.curve = options.curve || easing.easeInOutCubic;
  options.name = options.name || from.toString() + '_to_' + to.toString();

  var startTime = Date.now();
  var endTime = Date.now() + options.duration;
  var callbackCalled = false;

  return function () {
    if (typeof from === 'function') from = from.call(this);
    if (typeof to === 'function') to = to.call(this);

    var elapsedTime = Date.now() - startTime;
    var ratio = elapsedTime / options.duration;
    if (ratio < 1.0) {
      curr = from + (to - from) * options.curve(ratio);
    }
    else {
      // console.timeEnd(options.name);
      curr = to;
      if (options.ondone && !callbackCalled) {
        callbackCalled = true;
        options.ondone.call(this);
      }
    }
    return curr;
  };
};