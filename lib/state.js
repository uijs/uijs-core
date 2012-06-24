module.exports = function(options) {
  return function() {
    var child_this = Object.create(this);
    if (options) {
      for (var k in options) {
        child_this[k] = options[k];
      }
    }
    return child_this;
  };
};