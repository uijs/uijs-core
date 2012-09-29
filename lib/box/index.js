var util = require('../util');
var bind = require('../bind');
var rendering = require('./rendering');

var EventEmitter = require('../events').EventEmitter;

var idgenerator = 0;

function Box(options) {

  if (!(this instanceof Box)) return new Box(options);
  EventEmitter.call(this, options);

  var obj = this;

  // some identity
  obj.is_box = true;
  obj._id = 'BOX.' + idgenerator++;

  // binding magic for this box!
  bind(obj);

  // default options
  obj.set({
    id: obj._id,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    children: [],
    rotation: 0.0,
    visible: true,
    clip: false,
    alpha: null,
    debug: false,
    interaction: true, // send interaction events on this box. must be set to true for events to be emitted
    autopropagate: true, // propagate interaction events to child boxes. if false, the parent needs to call `e.propagate()` on the event
    invalidators: [], // property names defined here will cause the box to be invalidated and recached
  });

  // override by options from caller
  obj.set(options);

  // if the `children` array is replaced, override the array's `push` function
  // so that parent-child will be kept. yakk!
  obj.watch('children', function(c) {

    var self = this;

    var _push = c.push;

    c.forEach(function(i) {
      i.parent = obj;
    });

    c.push = function(child) {
      child.parent = obj;
      return _push.apply(c, arguments);
    };
  }, true /* sync */);

  util.mixin(obj, rendering.optimized());

  return obj;
}

var box = Box.prototype = new EventEmitter();

util.mixin(box, require('./children'));
util.mixin(box, require('./interactivity'));
util.mixin(box, require('./animation'));

module.exports = Box;