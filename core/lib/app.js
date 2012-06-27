var view = require('./view');
var defaults = require('./util').defaults;
var constant = require('./util').constant;

module.exports = function(options) {
  return view(defaults(options, {
    dockStyle: constant('fill'),
  }));
}