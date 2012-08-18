function EventEmitter() {
  var self = this;
  
  self._subscriptions = {};
  self._pipes = [];

  return self;
}

EventEmitter.prototype.emit = function(event, arg1, arg2, arg3, arg4, arg5, arg6) {
  var self = this;

  var handlers = self._subscriptions[event];
  //var original_arguments = arguments;

  var handled;

  if (handlers) {
    //var args = [];
    //for (var i = 1; i < arguments.length; ++i) {
    //  args.push(arguments[i]);
    //}

    var num_handlers = handlers.length;
    for (var i = 0; i < num_handlers; i++) {
      handlers[i].call(self, arg1, arg2, arg3, arg4, arg5, arg6);
    };
    //handlers.forEach(function(fn) {
    //  var ret = fn.apply(self, args);
    //  if (typeof ret === 'undefined' || ret === true) handled = true;
    //  if (ret === false) handled = false;
    //});
  }

  // emit events on all pipes
  var pipes = self._pipes;
  var num_pipes = pipes.length;
  for (var i = 0; i < num_pipes; i++) {
    var pipe = pipes[i];
    pipe.emit.call(pipe, arg1, arg2, arg3, arg4, arg5, arg6);
  };

  //self._pipes.forEach(function(target) {
  //  var ret = target.emit.apply(target, original_arguments);
  //  if (typeof ret === 'undefined' || ret === true) handled = true;
  //  if (ret === false) handled = false;
  //});

  //return handled;
};

// emits the event (with arguments) after 100ms
// should be used to allow ui to update when emitting
// events from event handlers.
EventEmitter.prototype.queue = function(event) {
  var self = this;
  var args = arguments;
  setTimeout(function() {
    self.emit.apply(self, args);
  }, 5);
};

EventEmitter.prototype.on = function(event, handler) {
  var self = this;
  if (!self._subscriptions) return;
  var handlers = self._subscriptions[event];
  if (!handlers) handlers = self._subscriptions[event] = [];
  handlers.push(handler);

  return self;
};

EventEmitter.prototype.removeAllListeners = function(event) {
  var self = this;
  if (!self._subscriptions) return;
  delete self._subscriptions[event];
  return self;
};

EventEmitter.prototype.removeListener = 
EventEmitter.prototype.off = function(event, handler) {
  var self = this;
  if (!self._subscriptions) return;
  var handlers = self._subscriptions[event];

  var found = -1;
  for (var i = 0; i < handlers.length; ++i) {
    if (handlers[i] === handler) {
      found = i;
    }
  }

  if (found !== -1) {
    handlers.splice(found, 1);
  }

  return self;
};

// forward all events from this EventEmitter to `target`.
EventEmitter.prototype.forward = function(target) {
  var self = this;
  self._pipes.push(target);
  return self;
};

// remove a forward
EventEmitter.prototype.unforward = function(target) {
  var self = this;
  var i = self._pipes.indexOf(target);
  if (i === -1) return false;
  self._pipes.splice(i, 1);
  return true;
};

exports.EventEmitter = EventEmitter;