var EventEmitter = require('./events').EventEmitter;

function addWatch(obj){
  if (obj.$_bind) { return; };

  var bindmeta = {
    ee: new EventEmitter(),
    vars: {},
  };

  Object.defineProperty(obj, '$_bind', {
    value: bindmeta,
    enumerable: false,
  });

  obj.watch = function(prop, cb) {
    var curr = obj[prop];

    var newlyBounded = false;
    
    // Only bind if 'prop' is not yet bounded
    if(!obj.$_bind.vars[prop]) {
      bind(obj, prop, function() { return curr; }, false);
      newlyBounded = true;
    }
    
    // TODO: Before, we always called with 'false', even if we did bind the function (which is not a consistent behavior).
    //       But my fix is also problematic because now cb that care whether the property was newly bound or not might behave
    //       unexpectedly because up until now they could assume that bounded === true only if someone explicitely called
    //       bind outside of the watch, and that the the bind was to a function (that doesn't always return the same value).
    //       Now, they must get the cb with bounded === true, even if no one explicitely called bind with a function.
    //       This is also related to the TODO below about allowing to bind to non functions.
    cb.call(obj, curr, newlyBounded);
    return this.$_bind.ee.on(prop, cb);
  };

  obj.unwatch = function(prop, cb) {
    return this.$_bind.ee.off(prop, cb);
  };
}

function bind(obj, prop, getter, emit) {
  //Detect the bind(getter, emit) syntax
  if (typeof obj === 'function' && typeof getter === 'undefined' && typeof emit === 'undefined') {
    getter = obj;
    obj = undefined;
    emit = prop;
  }

  if (obj === undefined) {
    return { $Bind: getter, $Emit: emit };
  }

  if (typeof emit === 'undefined') {
    emit = true;
  }

  // add `watch` capability to object.
  addWatch(obj);

  // add indication the 'prop' is bounded
  obj.$_bind.vars[prop] = true;

  // TODO: maybe best to not allow to bind to something that is not a function.
  //       If someone does this then most likely it is an error because unless you add a watch to the property
  //       there is no value in creating a property for a non function value. This is because that when you do add a watch, it
  //       automatically binds to a function that returns the current value if the var is not already bounded,
  //       so binding before calling watch doesn't contribute anything.
  //       Allowing such a bind can also
  //       lead to inconsistent and unexpected behavior because when we add a watch then the callback is
  //       called the with bounded === true whenever bind is called on the var. In these callbacks, it is assumed that
  //       when bind is called, it is called with a function (like in the box children watch). If we call it without
  //       a function then these callbacks may have unexpected behavior.
  if (typeof getter != 'function'){
    var returnValue = typeof getter === 'undefined' ? undefined : getter;
    getter = function() { return returnValue; }
  }

  function setter(newval) {
    // newval has $Bind on it immediately after the call to bind 
    // because the call to bind returns the bind promise and calls the setter with it
    if (newval && newval.$Bind) {  
      bind(obj, prop, newval.$Bind);
      return newval;
    }

    if (typeof newval === 'function'){
      // TODO: Consider not to allow this at all
      console.warn('WARNING: Trying to set value of a property to be a function. ' +
       'This means that when accessing the property, a function and not a value will be returned. ' + 
       'If you are trying to set the getter of the property to be the function use the \'bind\' function.');
    }

    bind(obj, prop, function() { return newval; }, false);

    // emit a change event on the $_bind.ee event emitter, if defined.
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
    obj.$_bind.ee.emit(prop, newval, bound);
  }

  return { $Bind: getter };
}

function autobind(obj) {
  Object.keys(obj).forEach(function(k) {
    var val = obj[k];
    if (val && val.$Bind) {
      bind(obj, k, val.$Bind, val.$Emit);
    }
  });

  // add `watch` capability to object, needed if none of the keys above triggers a binding
  addWatch(obj);
  return obj;
}

module.exports = bind;
module.exports.autobind = autobind;