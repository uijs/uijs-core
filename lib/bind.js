var EventEmitter = require('./events').EventEmitter;

function addWatch(obj){
  if (obj.$bind) { return; };

  var bindmeta = {
    ee: new EventEmitter(),
    vars: {},
  };

  Object.defineProperty(obj, '$bind', {
    value: bindmeta,
    enumerable: false,
  });

  obj.watch = function(prop, cb) {
    var curr = obj[prop];

    // Only bind if 'prop' is not yet bounded
    if(!obj.$bind.vars[prop]) {
      bind(obj, prop, function() { return curr; }, false);
    }
    
    cb.call(obj, curr, false);
    return this.$bind.ee.on(prop, cb);
  };

  obj.unwatch = function(prop, cb) {
    return this.$bind.ee.off(prop, cb);
  };
}

function bind(obj, prop, getter, emit) {
  if (obj === undefined) {
    return { $bindPromise: getter };
  }

  if (typeof emit === 'undefined') {
    emit = true;
  }

  // add `watch` capability to object.
  addWatch(obj);

  // add indication the 'prop' is bounded
  obj.$bind.vars[prop] = true;

  // TODO: Consider adding check that getter exists, but is not a function and throw and error
  getter = getter || function() { return undefined; };

  function setter(newval) {
    // newval has $bindPromise on it immediately after the call to bind 
    // because the call to bind returns the bind promise and calls the setter with it
    if (newval && newval.$bindPromise) {  
      bind(obj, prop, newval.$bindPromise);
      return newval;
    }

    // TODO: Consider adding a check and throw an error if newval is a function

    bind(obj, prop, function() { return newval; }, false);

    // emit a change event on the $bind.ee event emitter, if defined.
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
    obj.$bind.ee.emit(prop, newval, bound);
  }

  return { $bindPromise: getter };
}

function autobind(obj) {
  Object.keys(obj).forEach(function(k) {
    var val = obj[k];
    if (val && val.$bindPromise) {
      bind(obj, k, val.$bindPromise);
    }
  });

  // add `watch` capability to object, needed if none of the keys above triggers a binding
  addWatch(obj);
  return obj;
}

module.exports = bind;
module.exports.autobind = autobind;