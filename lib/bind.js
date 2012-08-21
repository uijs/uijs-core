var EventEmitter = require('./events').EventEmitter; 
var state_change_event_name_suffix = 'bind';

var global_frame_count = 0;

function tick(){
  global_frame_count++;
}

var nexttick = function(cb) {
  setTimeout(cb, 0);
};

function attachBindings(obj){
  if (obj.$_bindings) { return; };

  var bindmeta = {
    ee: new EventEmitter(),
    vars: {}
  };

  Object.defineProperty(obj, '$_bindings', {
    value: bindmeta,
    enumerable: false
  });

  obj.watch = function(prop, cb, bindStatChangeCb) {
    // TODO: Add tests to all the throws
    // TODO: Add tests to only onr cb
    if(prop === undefined){
      throw new Error('prop must be defined');
    }
    var self = this;
    var curr = self[prop];

    var at_least_one_cb = false;
    if (cb){
      if(typeof cb !== 'function'){
        throw new Error('cb must be a function');
      }

      // using the wrapper to ensure that cb is called with the correct 'this'
      function callback_wrapper(new_value, prop, bound_to_function){
        cb.call(self, new_value, prop, bound_to_function);
      }

      self.$_bindings.ee.on(prop, callback_wrapper);
      at_least_one_cb = true;
    }
    if(bindStatChangeCb){
      if(typeof bindStatChangeCb !== 'function'){
        throw new Error('bindStatChangeCb_wrapper must be a function');
      }

      // using the wrapper to ensure that cb is called with the correct 'this'
      function bindStatChangeCb_wrapper(prop, bound_to_function){
        bindStatChangeCb.call(self, prop, bound_to_function);
      }

      self.$_bindings.ee.on(prop + state_change_event_name_suffix, bindStatChangeCb_wrapper);
      at_least_one_cb = true;
    }

    if (!at_least_one_cb){
      throw new Error('At least one callback must be defined');
    }

    // only bind if 'prop' is not yet bound (this will also call the cb)
    if(!self.$_bindings.vars[prop]) {
      // TODO: Add test to the scenario where curr is a function
      if(typeof curr === 'function'){
        // first, bind to undefined to create bind to a literal, then - call the setter with the function
        bind_internal(self, prop, undefined);  
        self[prop] = curr;
      }
      else{
        bind_internal(self, prop, curr);
      }
    }
    else{
      if(bindStatChangeCb){
        bindStatChangeCb_wrapper(prop, self.$_bindings.vars[prop] === 'function'); 
      }
      if(cb){
        callback_wrapper(curr, prop, self.$_bindings.vars[prop] === 'function');
      }
    }
  };

  //TODO: Add unwatch test
  obj.unwatch = function(prop, cb) {
    var self = this;
    return self.$_bindings.ee.off(prop, cb);
  };

  obj.unwatchStateChange = function(prop, cb) {
    var self = this;
    return self.$_bindings.ee.off(prop + state_change_event_name_suffix, cb);
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
    if (typeof getter !== 'function') {
    throw new Error('trying to bind to a non function.\nIf you want a property which returns a constant' +
      ' value then use a function which returns it,\nor first bind to a function and then use the setter' +
      ' with a constant value to have the getter always return it.');
    }
    return { $bind: getter };
  }

  // add `watch` capability to object.
  attachBindings(obj);

  var newly_bound = false;
  var bind_status_changed = false;
  if (!obj.$_bindings.vars[prop]) {
    newly_bound = true;
  }

  if(obj.$_bindings.vars[prop] !== 'function'){
    bind_status_changed = true;
  }

  obj.$_bindings.vars[prop] = 'function';

  var prev_value = newly_bound ? undefined : obj[prop];
  var emit_change_event = false;

  // if we bind to literal then set it as the value
  // (can only happen if this bind is part of adding a watch to a literal since
  // the bind function that is exported and can be used from outside this file
  // throws an exception if trying to bind to a literal)
  if (typeof getter !== 'function') {
    prev_value = getter;
    obj.$_bindings.vars[prop] = 'literal';
    emit_change_event = true;
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
        prev_value = new_value;
      } 
      return new_value;
    }

    var gfc = global_frame_count;
    if(self.$freeze.frameCount !== global_frame_count){
      self.$freeze = {
        frameCount: gfc,
      };
    }

    var freezed_value = self.$freeze[prop];
    if (freezed_value === undefined) { 
      freezed_value = get_value(); 
      self.$freeze[prop] = freezed_value;
    }
    else{
      //TODO: Add test that cbs are not called in this case
    } 
    return freezed_value;  
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

    var bind_status_changed = obj.$_bindings.vars[prop] === 'function';

    obj.$_bindings.vars[prop] = 'literal';
    // emit a change event on the $_bindings.ee event emitter, if defined.
    if(bind_status_changed){
      emit_bind_status_change();
    }
    if(prev_value !== newval){
      prev_value = newval;
      emit_change(newval);
    }
      
    // Set the simple getter wrapper
    Object.defineProperty(obj, prop, {
      configurable: true,
      enumerable: true,
      get: getterWrapperSimple,
      set: setter
    });
    
    return newval;
  }

  Object.defineProperty(obj, prop, {
    configurable: true,
    enumerable: true,
    get: obj.$_bindings.vars[prop] === 'literal' ? getterWrapperSimple : getterWrapper,
    set: setter
  });

  // TODO: Add test that bind stat is fired b4 value change
  if (bind_status_changed){
    emit_bind_status_change();
  }
  // emit a change value event if necessary
  if(emit_change_event){
    emit_change(prev_value);
  }

  // if not newly bound then set the initial value to be returned and emit a change event if necessary.
  // Doing this only if not newly bound because only if not newly bound there can already be a watch
  // set on the property.
  // If newly bound then if we call getterWrapper here we might get an exception because the getter is
  // not yet ready to be called (for example, if it uses variables from the object to which it is being 
  // bound and that object is not yet fully initialized).
  if (!newly_bound && obj.$_bindings.vars[prop] === 'function'){
    getterWrapper.call(obj);
  }

  function emit_change(newval) {
    obj.$_bindings.ee.emit(prop, newval, prop, obj.$_bindings.vars[prop] === 'function');
  }

  function emit_bind_status_change() {
    obj.$_bindings.ee.emit(prop + state_change_event_name_suffix, prop, obj.$_bindings.vars[prop] === 'function');
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
module.exports.tick = tick;
module.exports.nexttick = function(nt) {
  nexttick = nt;
};