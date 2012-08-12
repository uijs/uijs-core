var EventEmitter = require('./events').EventEmitter; 

function attachBindings(obj){
  if (obj.$_bindings) { return; };

  var bindmeta = {
    ee: new EventEmitter(),
    vars: {},
  };

  Object.defineProperty(obj, '$_bindings', {
    value: bindmeta,
    enumerable: false,
  });

  obj.watch = function(prop, cb) {
    var self = this;
    var curr = self[prop];
    
    // using the wrapper to ensure that cb is called with the correct 'this'
    function callback_wrapper(new_value){
      cb.call(self, new_value);
    }

    var return_value = self.$_bindings.ee.on(prop, callback_wrapper);

    // only bind if 'prop' is not yet bound (this will also call the cb)
    if(!self.$_bindings.vars[prop]) {
      bind_internal(self, prop, curr);
    }
    else{
      callback_wrapper(curr);
    }

    return return_value;
  };

  obj.unwatch = function(prop, cb) {
    var self = this;
    return self.$_bindings.ee.off(prop, cb);
  };
}

function bind(obj, prop, getter) {
  // detect the bind(getter) syntax
  if (typeof obj === 'function' && typeof getter === 'undefined') {
    getter = obj;
    obj = undefined;
  }

  if (typeof getter !== 'function'){
    throw new Error('trying to bind to a non function.\nIf you want a property which returns a constant' +
      ' value then use a function which returns it,\nor first bind to a function and then use the setter' +
      ' with a constant value to have the getter always return it.');
  }

  return bind_internal(obj, prop, getter);
}

function bind_internal(obj, prop, getter) {
  // return a bind promise - promise to bind later when obj is initialized
  if (obj === undefined) {
    if (typeof getter !== 'function'){
    throw new Error('trying to bind to a non function.\nIf you want a property which returns a constant' +
      ' value then use a function which returns it,\nor first bind to a function and then use the setter' +
      ' with a constant value to have the getter always return it.');
    }
    return { $bind: getter };
  }

  // add `watch` capability to object.
  attachBindings(obj);

  var newly_bound = false;
  if (!obj.$_bindings.vars[prop]) {
    newly_bound = true;

    // add indication that 'prop' is bound
    obj.$_bindings.vars[prop] = true;
  }

  var prev_value;
  var bound_to_literal = false;

  // if we bind to literal then set it as the value
  // (can only happen if this bind is part of adding a watch to a litteral since
  // the bind function that is exported and can be used from outside this file
  // throws an exception if trying to bind to a literal)
  if (typeof getter !== 'function'){
    prev_value = getter;
    bound_to_literal = true;
    // emit a change value event if necessary
    emit_change(prev_value);
  }

  function getterWrapperSimple(){
    return prev_value;
  }

  function getterWrapper(){
    var self = this; 

    function get_value(){
      var new_value = getter.call(self); 
      if (new_value !== prev_value){ 
        // emit a change event on the $_bindings.ee event emitter, if defined.
        emit_change(new_value);
      } 
      prev_value = new_value; 
      return new_value;
    }

    if (self.$freeze) { 
      var freezed_value = self.$freeze[prop];
      if (!freezed_value) { 
        freezed_value = get_value(); 
        self.$freeze[prop] = freezed_value;
      } 
      return freezed_value; 
    } 
    else { 
      return get_value();
    } 
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

    // emit a change event on the $_bindings.ee event emitter, if defined.
    emit_change(newval);

    prev_value = newval;

    if(bound_to_literal === false){
      
      // Set the simple getter wrapper

      Object.defineProperty(obj, prop, {
        configurable: true,
        enumerable: true,
        get: getterWrapperSimple,
        set: setter,
      });
      bound_to_literal = true;
    }
    

    return newval;
  }

  Object.defineProperty(obj, prop, {
    configurable: true,
    enumerable: true,
    get: bound_to_literal ? getterWrapperSimple : getterWrapper,
    set: setter,
  });

  // if not newly bound then set the initial value to be returned and emit a change event if necessary.
  // Doing this only if not newly bound because only if not newly bound there can already be a watch
  // set on the property.
  // If newly bound then if we call getterWrapper here we might get an exception because the getter is
  // not yet ready to be called (for example, if it uses variables from the object to which it is being 
  // bound and that object is not yet fully initialized).
  if (!newly_bound){
    getterWrapper();
  }

  function emit_change(newval) {
    obj.$_bindings.ee.emit(prop, newval);
  }

  return { $bind: getter };
}

function autobind(obj) {
  Object.keys(obj).forEach(function(k) {
    var val = obj[k];
    if (val && val.$bind) {
      bind_internal(obj, k, val.$bind);
    }
  });

  // add `watch` capability to object, needed if none of the keys above triggers a binding
  attachBindings(obj);
  return obj;
}

module.exports = bind;
module.exports.autobind = autobind;