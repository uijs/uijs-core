var global;
if (typeof window !== 'undefined') global = window;
else if (typeof process !== 'undefined') global = process;
else global = {};
global.notifications = [];

global.ticks = 0;

function tick() {
  // clear notifications before invoking callbacks so if we queue a notification within a callback
  // it will be called in the next tick and won't screw up with the array.
  var clone = global.notifications.concat();
  global.notifications = [];

  var notifications_length = clone.length;
  for (var i = 0; i < notifications_length; ++i) {
    var n = clone[i];
    n.call(n.obj);
  }

  global.ticks++;
}

function nexttick(fn) {
  fn.obj = this;
  global.notifications.push(fn);
}

function  _property(prop) {
  var self = this;

  var bindings = self._bindings = self._bindings || { 
    properties: {} 
  };

  var property = bindings.properties[prop] = bindings.properties[prop] || {
    name: prop,
    watchers: [],
    sync_watchers: [],
    bound: null,
    timestamp: -1,
    value: undefined,
  };

  return property;
}

function _magic(prop) {
  var self = this;

  var property = _property.call(self, prop);

  var watched = property.watchers.length > 0 || property.sync_watchers.length > 0;
  var bound = property.bound;
  var prev_value = property.value;

  if (!watched && !bound) {
    Object.defineProperty(self, prop, {
      value: prev_value,
      enumerable: true,
      configurable: true,
    });
  }

  if (!watched && bound) {
    Object.defineProperty(self, prop, {
      get: function() {
        var gt = global.ticks;
        if (property.timestamp !== gt) {
          property.timestamp = gt;
          return prev_value = property.value = bound.call(self);
        }
        else{
          return prev_value;
        }
      },
      set: function(curr) {
        unbind_unwatched(curr);
        return curr;
      },
      enumerable: true,
      configurable: true,
    });
  }

  if (watched && !bound) {
    Object.defineProperty(self, prop, {
      get: function() {
        return prev_value; 
      },
      set: function(curr) {
        if (prev_value !== curr){
          var prev = prev_value;
          prev_value = property.value = curr;
          notify(prev, curr, false);
        }
        return curr;
      },
      enumerable: true,
      configurable: true,
    });
  }

  if (watched && bound) {
    Object.defineProperty(self, prop, {
      get: function() {
        var gt = global.ticks;
        if (property.timestamp !== gt) {
          var curr = bound.call(self);
          property.timestamp = gt;
          if (prev_value !== curr){
            var prev = prev_value;
            prev_value = property.value = curr;
            notify(prev, curr, true);
          }
          return curr;
        }
        else {
          return prev_value;
        }
      },
      set: function(curr) {
        var prev = prev_value;
        unbind_watched(curr);
        if (prev !== curr){
          notify(prev, curr, false);
        }
        return curr;
      },
      enumerable: true,
      configurable: true,
    });
  }

  function notify(prev, curr, bound) {
    // call synchronous watchers
    var watchers = property.sync_watchers;
    var watchers_length = watchers.length;
    for (var i = 0; i < watchers_length; ++i) {
      watchers[i].call(self, curr, prev, prop, bound, true);
    }

    watchers = property.watchers.concat();
    watchers_length = watchers.length;
    nexttick.call(self, function() {
      for (var i = 0; i < watchers_length; ++i) {
        watchers[i].call(self, curr, prev, prop, bound, false);
      }
    });
  }

  function unbind_unwatched(newval) {
    prev_value = property.value = newval;
    property.bound = null;
    _magic.call(self, prop);
  }

  function unbind_watched(newval) {
    prev_value = property.value = newval;
    property.bound = null;
    _magic.call(self, prop);
  }
}

function watch(prop, callback, sync) {
  var self = this;

  var property = _property.call(self, prop);
  var bound = property.bound;

  function add_watch(watchers) {
    var curr = self[prop]; // if `prop` is bound, this will call getter (and purhaps notify other watchers)
    property.value = curr;

    // add watcher (only after we retrieved the current value to make sure this watcher will not be called).
    watchers.push(callback);
    _magic.call(self, prop);
    
    callback.call(self, curr, undefined, prop, bound ? true : false, false);
  }

  if (!sync) {
    // call callback the first time with <undefined, curr>
    nexttick.call(self, function() {
      add_watch(property.watchers);
    });
  }
  else {
    add_watch(property.sync_watchers);
  }
}

function unwatch(prop, callback) {
  var self = this;

  var property = _property.call(self, prop);
  var idx = property.watchers.indexOf(callback);
  if (idx !== -1) {
    property.watchers.splice(idx, 1);
  }
  // TODO: add test for unwatching sync and bind status change callbacks
  idx = property.sync_watchers.indexOf(callback);
  if (idx !== -1) {
    property.sync_watchers.splice(idx, 1);
  }

  _magic.call(self, prop);

  return true;
}

function bind(prop, fn) {
  var self = this;
  if (typeof fn !== 'function') throw new Error('`fn` must be a function');

  var property = _property.call(self, prop);
  
  // TODO: Add test that binding after there is a bind status change callback set for the property
  //       doesn't bind to the property, but to the desired function!!

  property.bound = fn;

  _magic.call(self, prop);

  return { $: 'motherfucker' };
}

// ---

//
// If a function is used, returns a promise to bind. This usage is for binding properties in
// an object literal. e.g. `var obj = { x: bind(function() { return 6; }) };`
// 
// If an object is used, adds binding capabilities to the object and fullfills all the binding
// promises (if any). e.g. `bind(obj)` will make `obj.x` return `6`.
//
module.exports = function(obj_or_fn) {
  if (arguments.length > 1) throw new Error('motherfucker'); // TODO: remove?


  if (typeof obj_or_fn === 'function') {
    var fn = obj_or_fn;
    return { $bind: fn };
  }
  else {
    var obj = obj_or_fn;
    obj.bind = bind;
    obj.watch = watch;
    obj.unwatch = unwatch;

    Object.keys(obj).forEach(function(key) {
      var value = obj[key];
      if (value && value.$bind) {
        obj.bind(key, value.$bind);
      }
    });

    return obj;
  }
};

module.exports.tick = tick;