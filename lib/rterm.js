var box = require('./box');
var constant = require('./util').constant;
var defaults = require('./util').defaults;

module.exports = function(socket, options) {
  if (!socket) throw new Error('`socket` is required');

  var obj = box(defaults(options, {
    id: constant('#terminal'),
    visible: constant(false),
  }));

  obj.writeLine = function() {
    var args = [];
    
    for (var i = 0; i < arguments.length; ++i) {
      args.push(arguments[i]);
    }

    var line = {
      time: Date.now(),
      data: args.join(' '),
    };

    socket.emit('log', line);
    return line;
  };

  return obj;
};