var view = require('./view');

module.exports = function(options) {
  var self = view(options);
  self.width = function() {
    if (self.image) {
      return self.image.width;
    }
    else return 10;
  };
  self.height = function() {
    if (self.image) {
      return self.image.height;
    }
    else return 10;
  };
  return self;
};