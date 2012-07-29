module.exports = function() {
  var obj = {};

  obj.create = function(w, h) {
    var canvas = module.exports.factory();
    canvas.width = w;
    canvas.height = h;
    return canvas;
  };

  return obj;
};

module.exports.factory = function() {
  return document.createElement('canvas');
};