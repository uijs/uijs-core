var EventEmitter = require('./events').EventEmitter;

function bind(obj, prop, getter) {
  if (obj === undefined) {
    return { $bind: getter };
  }

  // add `watch` capability to object.
  if (!obj.$watch) {
    obj.$watch = new EventEmitter();

    obj.watch = function(prop, cb) {
      var curr = obj[prop];
      bind(obj, prop, function() { return curr; });
      return this.$watch.on(prop, cb);
    };

    obj.unwatch = function(prop, cb) {
      return this.$watch.off(prop, cb);
    };
  }

  getter = getter || function() { return undefined; };

  function setter(newval) {
    if (newval && newval.$bind) {
      bind(obj, prop, newval.$bind);
      return newval;
    }

    bind(obj, prop, function() { return newval; });

    // emit a change event on the $watch event emitter, if defined.
    emit_change(newval, false);

    return newval;
  }

  Object.defineProperty(obj, prop, {
    configurable: true,
    enumerable: true,
    get: getter,
    set: setter,
  });

  // emit a change event to indicate that we 
  emit_change(getter(), true);

  function emit_change(newval, bound) {
    if (!obj.$watch) return;
    obj.$watch.emit(prop, newval, bound);
  }

  return { $bind: getter };
}

function autobind(obj) {
  Object.keys(obj).forEach(function(k) {
    var val = obj[k];
    if (val && val.$bind) {
      bind(obj, k, val.$bind);
    }
  });

  return obj;
}

module.exports = bind;
module.exports.autobind = autobind;