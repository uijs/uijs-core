var global;
if (typeof window !== 'undefined') global = window;
else if (typeof process !== 'undefined') global = process;
else global = {};

var ticks = global.ticks || 0;

function tick() {
  global.notifications = global.notifications || [];

  // clear notifications before invoking callbacks so if we queue a notification within a callback
  // it will be called in the next tick and won't screw up with the array.

  var clone = global.notifications.concat();
  global.notifications = [];

  for (var i = 0; i < clone.length; ++i) {
    var n = clone[i];
    n.callback.call(n.obj);
  }

  ticks++;
}

function nexttick(fn) {
  var self = this;
  global.notifications = global.notifications || [];
  global.notifications.push({
    // stack: new Error().stack,
    callback: fn,
    obj: self,
  });
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

  if (!watched && !bound) {
    var val = property.value;
    Object.defineProperty(self, prop, {
      value: val,
      enumerable: true,
      configurable: true,
    });
  }

  if (!watched && bound) {
    Object.defineProperty(self, prop, {
      get: function() {
        var prev = property.value;
        if (property.timestamp !== ticks) {
          property.timestamp = ticks;
          prev = property.value = bound.call(self);
        }
        return prev;
      },
      set: function(curr) {
        if (curr && curr.$) throw new Error(curr.$);
        return unbind(curr);
      },
      enumerable: true,
      configurable: true,
    });
  }

  if (watched && !bound) {
    Object.defineProperty(self, prop, {
      get: function() {
        return property.value; 
      },
      set: function(curr) {
        if (curr && curr.$) throw new Error(curr.$);
        return notify(property.value, curr); 
      },
      enumerable: true,
      configurable: true,
    });
  }

  if (watched && bound) {
    Object.defineProperty(self, prop, {
      get: function() {
        var prev = property.value;
        if (property.timestamp !== ticks) {
          var curr = bound.call(self);
          property.timestamp = ticks;
          return notify(prev, curr);
        }
        else {
          return prev;
        }
      },
      set: function(curr) {
        if (curr && curr.$) throw new Error(curr.$);
        var prev = property.value;
        unbind(curr);
        return notify(prev, curr);
      },
      enumerable: true,
      configurable: true,
    });
  }

  function notify(prev, curr) {
    if (prev === curr) return curr;
    property.value = curr;

    // call synchronous watchers
    for (var i = 0; i < property.sync_watchers.length; ++i) {
      var fn = property.sync_watchers[i];
      fn.call(self, curr, prev, prop, bound ? true : false, true);
    }

    var watchers = property.watchers.concat();
    nexttick.call(self, function() {
      for (var i = 0; i < watchers.length; ++i) {
        var fn = watchers[i];
        fn.call(self, curr, prev, prop, bound ? true : false, false);
      }
    });

    return curr;
  }

  function unbind(newval) {
    property.value = newval;
    property.bound = null;
    _magic.call(self, prop);
    return newval;
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
    property.value = curr;
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
  var idx = property.watchers.indexOf(callback)
  if (idx !== -1) {
    property.watchers.splice(idx, 1);
  }

  _magic.call(self, prop);

  return true;
}

function bind(prop, fn) {
  var self = this;
  if (typeof fn !== 'function') throw new Error('`fn` must be a function');

  var property = _property.call(self, prop);
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
    obj.bind = obj.bind || bind;
    obj.watch = obj.watch || watch;
    obj.unwatch = obj.unwatch || unwatch;

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