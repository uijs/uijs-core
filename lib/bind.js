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

  obj.watch = function(prop, cb) {
    var self = this;
    var curr = self[prop];
    
    // TODO: Think about this hack - I am using the wrapper in order to ensure that the 
    //       cb is called with the correct 'this'. if I just give the cb to the ee then
    //       it calls it with 'this' set to be the ee itself, which is not obj.
    //       Consider adding an option in the ee to define the 'this' for each event or
    //       for all the events, and then fix this hack here. (Issue #41).
    function callback_wrapper(new_value){
      cb.call(self, new_value);
    }

    var return_value = self.$_bindings.ee.on(prop, callback_wrapper);

    // only bind if 'prop' is not yet bounded (this will also call the cb)
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

  if (typeof getter != 'function'){
    throw new Error('Error!! Trying to bind to a non function.\nIf you want a property which returns a constant' +
      ' value then use a function which returns it,\nor first bind to a function and then use the setter' +
      ' with a constant value to have the getter always return it.');
  }

  return bind_internal(obj, prop, getter);
}

function bind_internal(obj, prop, getter) {
  if (obj === undefined) {
    return { $bind: getter };
  }

  // add `watch` capability to object.
  addWatch(obj);

  var newly_bounded = false;
  if (!obj.$_bindings.vars[prop]) {
    newly_bounded = true;

    // add indication the 'prop' is bounded
    obj.$_bindings.vars[prop] = true;
  }

  var prev_value;
  var bound_to_literal = false;

  // if we bind to literal then set it as the value
  // (can only happen if we add watch to a litteral because that in the bind 
  // that is exported there is an exception thrown if trying to bind to a literal)
  if (typeof getter != 'function'){
    prev_value = getter;
    bound_to_literal = true;
    // emit a change value event if necessary
    emit_change(prev_value);
  }

  function getterWrapper(){    
    if(bound_to_literal === true){
      return prev_value;
    }

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
    bound_to_literal = true;

    return newval;
  }

  Object.defineProperty(obj, prop, {
    configurable: true,
    enumerable: true,
    get: getterWrapper,
    set: setter,
  });

  // if not newly bounded then set the initial value to be returned and emit a change event if necessary.
  // Doing this only if not newly bounded because only if not newly bounded there can already be a watch
  // set on the property.
  // If newly bounded then if we call getterWrapper here we might get an exception because the getter is
  // not yet ready to be called (for example, if it uses variables from the object to which it is being 
  // bounded and that object is not yet fully initialized).
  if (!newly_bounded){
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
  addWatch(obj);
  return obj;
}

module.exports = bind;
module.exports.autobind = autobind;