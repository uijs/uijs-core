var EventEmitter = require('./events').EventEmitter;

function addWatch(obj){
  if (obj.$_bindings) { return; };

  var bindmeta = {
    ee: new EventEmitter(),
    vars: {},
  };

  Object.defineProperty(obj, '$_bindings', {
    value: bindmeta,
    enumerable: false,
  });

  // TODO: Consider adding a watch which will call the cb even when the value returned be the bound function changes
  //       (issue #40).
  obj.watch = function(prop, cb, emitCbOnBind) {
    var self = this;
    var curr = obj[prop];
    
    // only bind if 'prop' is not yet bounded
    if(!obj.$_bindings.vars[prop]) {
      bind(obj, prop, function() { return curr; }, false);
    }
    
    cb.call(obj, curr, false);

    function watch_cb_wrapper(newVal, bound){
      if(!emitCbOnBind && bound === true){
        return;
      }
      cb.call(self, newVal, bound);
    }

    return self.$_bindings.ee.on(prop, watch_cb_wrapper);
  };

  obj.unwatch = function(prop, cb) {
    var self = this;
    return self.$_bindings.ee.off(prop, cb);
  };
}

function bind(obj, prop, getter, emit) {
  // detect the bind(getter, emit) syntax
  if (typeof obj === 'function' && typeof getter === 'undefined' && typeof emit === 'undefined') {
    getter = obj;
    obj = undefined;
    emit = prop;
  }

  if (obj === undefined) {
    return { $bind: { fn: getter, emit: emit } };
  }

  if (typeof emit === 'undefined') {
    emit = true;
  }

  // add `watch` capability to object.
  addWatch(obj);

  // add indication the 'prop' is bounded
  obj.$_bindings.vars[prop] = true;

  if (typeof getter != 'function'){
    throw new Error('Error!! Trying to bind to a non function.\nIf you want a property which returns a constant' +
      ' value then use a function which returns it,\nor first bind to a function and then use the setter' +
      ' with a constant value to have the getter always return it.');
  }

  function setter(newval) {
    // newval has $bind on it immediately after the call to bind 
    // because the call to bind returns the bind promise and calls the setter with it
    if (newval && newval.$bind) {  
      return newval;
    }

    if (typeof newval === 'function'){
      // TODO: Consider not to allow this at all
      console.warn('WARNING: Trying to set value of a property to be a function. ' +
       'This means that when accessing the property, a function and not a value will be returned. ' + 
       'If you are trying to set the getter of the property to be the function use the \'bind\' function.');
    }

    bind(obj, prop, function() { return newval; }, false);

    // emit a change event on the $_bindings.ee event emitter, if defined.
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
    obj.$_bindings.ee.emit(prop, newval, bound);
  }

  return { $bind: { fn: getter, emit: emit } };
}

function autobind(obj) {
  Object.keys(obj).forEach(function(k) {
    var val = obj[k];
    if (val && val.$bind) {
      bind(obj, k, val.$bind.fn, val.$bind.emit);
    }
  });

  // add `watch` capability to object, needed if none of the keys above triggers a binding
  addWatch(obj);
  return obj;
}

module.exports = bind;
module.exports.autobind = autobind;