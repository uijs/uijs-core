var animate = require('../animation');

var box = module.exports = {};

box.animate = function(properties, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  var animation_options = {};
  for (var k in options) {
    animation_options[k] = options[k];
  }

  if (callback) {
    animation_options.ondone = callback;
  }

  var self = this;
  Object.keys(properties).forEach(function(k) {
    var curr = self[k];
    var target = properties[k];
    console.log('[' + self.id + ']', 'animating', k, 'from', curr, 'to', target);
    self.bind(k, animate(curr, target, animation_options));
  });
};