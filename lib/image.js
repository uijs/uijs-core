var view = require('./view');
var defaults = require('./util').defaults;
var constant = require('./util').constant;

module.exports = function(options) {
  var obj = view(defaults(options, {
    stretch: constant(false),
  }));

  var base = {
    width: self.width,
    height: self.height,
  };

  // console.log('!!!');

  // obj.width = function() {
  //   var self = this;
  //   if (self.image && !self.stretch()) {
  //     return self.image.width;
  //   }

  //   else return base.width.call(self);
  // };

  // obj.height = function() {
  //   var self = this;
  //   if (self.image & !self.stretch()) {
  //     return self.image.height;
  //   }
  //   else return base.height.call(self);
  // };

  return obj;
};