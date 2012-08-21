var notifications = [];
var ticks = 0;

function tick() {

  for (var i = 0; i < notifications.length; ++i) {
    var n = notifications[i];
    // console.log("STACK:", n.stack);
    n.callback.call(n.obj);
  }

  notifications = [];

  ticks++;
}

function nexttick(fn) {
  var self = this;
  notifications.push({
    // stack: new Error().stack,
    callback: fn,
    obj: self,
  });
}

function _magic(prop) {
  var self = this;

  var watched = self._watch && self._watch[prop];
  var bound = self._bindings && self._bindings[prop];
  var values = self._values = self._values || {};

  if (!watched && !bound) {
    var val = values[prop];
    Object.defineProperty(self, prop, {
      value: val,
      enumerable: true,
      configurable: true,
    });
  }

  if (!watched && bound) {
    Object.defineProperty(self, prop, {
      get: bound,
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
      get: function() { return values[prop]; },
      set: function(curr) {
        if (curr && curr.$) throw new Error(curr.$);
        return notify(values[prop], curr); 
      },
      enumerable: true,
      configurable: true,
    });
  }

  if (watched && bound) {
    Object.defineProperty(self, prop, {
      get: function() {
        var prev = values[prop];
        var val = bound.call(self);
        return notify(prev, val);
      },
      set: function(curr) {
        if (curr && curr.$) throw new Error(curr.$);
        var prev = values[prop];
        unbind(curr);
        return notify(prev, curr);
      },
      enumerable: true,
      configurable: true,
    });
  }

  function notify(prev, curr) {
    if (prev === curr) return curr;
    values[prop] = curr;
    var watched_snapshot = watched.concat();

    nexttick.call(self, function() {
      for (var i = 0; i < watched_snapshot.length; ++i) {
        var fn = watched_snapshot[i];
        fn.call(self, curr, prev, prop, !!~bound);
      }
    });

    return curr;
  }

  function unbind(newval) {
    values[prop] = newval;
    delete self._bindings[prop];
    _magic.call(self, prop);
    return newval;
  }
}

function watch(prop, callback) {
  var self = this;

  var curr = self[prop]; // if `prop` is bound, this will call getter (and purhaps notify other watchers)
  var bound = self._bindings && self._bindings[prop];

  // add watcher (only after we retrieved the current value to make sure this watcher will not be called).
  self._watch = self._watch || {};
  self._watch[prop] = self._watch[prop] = self._watch[prop] || [];
  self._watch[prop].push(callback);
  _magic.call(self, prop, true);

  // call callback the first time with <undefined, curr>
  nexttick(function() {
    callback.call(self, curr, undefined, prop, bound ? true : false);
    self._values[prop] = curr;
  });
}

function unwatch(prop, callback) {
  var self = this;
  if (!self._watch) return false;
  if (!self._watch[prop]) return false;
  if (!self._watch[prop].length) return false;

  var idx = self._watch[prop].indexOf(callback)
  if (idx !== -1) {
    self._watch[prop].splice(idx, 1);
  }

  _magic.call(self, prop);

  return true;
}

function bind(prop, fn) {
  var self = this;
  if (typeof fn !== 'function') throw new Error('`fn` must be a function');

  self._bindings = self._bindings || {};
  self._bindings[prop] = fn;
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

// var obj = {};

// obj.watch = watch;
// obj.unwatch = unwatch;
// obj.bind = bind;

// function callback1(curr, prop, is_bound, prev) {
//   console.log(prop, 'changed from', prev, 'to', curr, is_bound ? '(bound)' : '');
// }

// function callback2() {
//   console.log('x changed, yeah!');
// }

// obj.watch('x', callback1);
// obj.watch('x', callback2);

// obj.x = 100;
// obj.x = 200;

// obj.bind('y', function() { return 444; });

// console.log('bound:', obj.y);

// obj.bind('x', function() { return 'this is coming from a function'; });
// obj.x;

// obj.y = 88;
// console.log(obj.y);

// obj.x = 12;


// var api_bind = module.exports;
// var api_autobind = api_bind.autobind;


// var foo = {
//   y: api_bind(function() { return 555; }),
// };

// api_bind(foo, 'x', function() { return 123; });
// console.log(foo.x);
// foo.watch('x', function() { return console.log('x changed'); });
// foo.x = 888;