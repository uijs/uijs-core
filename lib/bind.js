var EventEmitter = require('./events').EventEmitter;

function addWatch(obj){
  if (obj.$watch) { return; };
  obj.$watch = new EventEmitter();
  obj.watch = function(prop, cb) {
    var curr = obj[prop];

    // Only bind if 'prop' is not yet bounded
    if(!obj.$boundedVars || !obj.$boundedVars[prop]) {
      bind(obj, prop, function() { return curr; }, false);
    }
    
    cb.call(obj, curr, false);
    return this.$watch.on(prop, cb);
  };

  obj.unwatch = function(prop, cb) {
    return this.$watch.off(prop, cb);
  };
}

function bind(obj, prop, getter, emit) {
  if (obj === undefined) {
    return { $bind: getter };
  }

  if (typeof emit === 'undefined') {
    emit = true;
  }

  // add `watch` capability to object.
  addWatch(obj);

  // add indication the 'prop' is bounded
  if(!obj.$boundedVars) {
    obj.$boundedVars = {};
  }
  obj.$boundedVars[prop] = true;

  getter = getter || function() { return undefined; };

  function setter(newval) {
    // newval has $bind on it immediately after the call to bind because the call to bind returns the bind promise and calls the setter with it
    if (newval && newval.$bind) {  
      bind(obj, prop, newval.$bind);
      return newval;
    }

    bind(obj, prop, function() { return newval; }, false);

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

  // emit a change event to indicate that we have made a new bind
  if (emit) {
    emit_change(getter, true);
  }

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

  // add `watch` capability to object. Needed if none of the keys above triggers a binding
  addWatch(obj);
  return obj;
}

module.exports = bind;
module.exports.autobind = autobind;