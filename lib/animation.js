// -- animation
var curves = exports.curves = {};

curves.linear = function() {
  return function(x) {
    return x;
  };
};

curves.easeInEaseOut = function() {
  return function(x) {
    return (1 - Math.sin(Math.PI / 2 + x * Math.PI)) / 2;
  };
};

module.exports = function(from, to, options) {
  options = options || {};
  options.duration = options.duration || 250;
  options.ondone = options.ondone || function() { };
  options.curve = options.curve || curves.easeInEaseOut();
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
        options.ondone.call(this);
        callbackCalled = true;
      }
    }
    return curr;
  };
};