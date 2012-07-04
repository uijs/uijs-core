var uijs = (function(global, undefined){
  var DEBUG         = false,
      pkgdefs       = {},
      pkgmap        = {},
      global        = {},
      lib           = undefined,
      nativeRequire = typeof require != 'undefined' && require,
      ties, locals;
  lib = (function(exports){
  exports.path = (function(exports){ 
    // Copyright Joyent, Inc. and other Node contributors.
// Minimized fork of NodeJS' path module, based on its an early version.
exports.join = function () {
  return exports.normalize(Array.prototype.join.call(arguments, "/"));
};
exports.normalizeArray = function (parts, keepBlanks) {
  var directories = [], prev;
  for (var i = 0, l = parts.length - 1; i <= l; i++) {
    var directory = parts[i];
    // if it's blank, but it's not the first thing, and not the last thing, skip it.
    if (directory === "" && i !== 0 && i !== l && !keepBlanks) continue;
    // if it's a dot, and there was some previous dir already, then skip it.
    if (directory === "." && prev !== undefined) continue;
    if (
      directory === ".."
      && directories.length
      && prev !== ".."
      && prev !== "."
      && prev !== undefined
      && (prev !== "" || keepBlanks)
    ) {
      directories.pop();
      prev = directories.slice(-1)[0]
    } else {
      if (prev === ".") directories.pop();
      directories.push(directory);
      prev = directory;
    }
  }
  return directories;
};
exports.normalize = function (path, keepBlanks) {
  return exports.normalizeArray(path.split("/"), keepBlanks).join("/");
};
exports.dirname = function (path) {
  return path && path.substr(0, path.lastIndexOf("/")) || ".";
};
    return exports;
  })({});
    global.process = exports.process = (function(exports){
    /**
 * This is module's purpose is to partly emulate NodeJS' process object on web browsers. It's not an alternative 
 * and/or implementation of the "process" object.
 */
function Buffer(size){
  if (!(this instanceof Buffer)) return new Buffer(size);
  this.content = '';
};
Buffer.prototype.isBuffer = function isBuffer(){
  return true;
};
Buffer.prototype.write = function write(string){
  this.content += string;
};
global.Buffer = exports.Buffer = Buffer;
function Stream(writable, readable){
  if (!(this instanceof Stream)) return new Stream(writable, readable);
  Buffer.call(this);
  this.emulation = true;
  this.readable = readable;
  this.writable = writable;
  this.type = 'file';
};
Stream.prototype = Buffer(0,0);
exports.Stream = Stream;
function notImplemented(){
  throw new Error('Not Implemented.');
}
exports.binding = (function(){
  
  var table = {
    'buffer':{ 'Buffer':Buffer, 'SlowBuffer':Buffer }
  };
  return function binding(bname){
    if(!table.hasOwnProperty(bname)){
      throw new Error('No such module.');
    }
    return table[bname];
  };
})();
exports.argv = ['onejs'];
exports.env = {};
exports.nextTick = function nextTick(fn){
  return setTimeout(fn, 0);
};
exports.stderr = Stream(true, false);
exports.stdin = Stream(false, true);
exports.stdout = Stream(true, false);
exports.version = '1.6.0';
exports.versions = {};
/**
 * void definitions
 */
exports.pid = 
exports.uptime = 0;
exports.arch = 
exports.execPath = 
exports.installPrefix = 
exports.platform =
exports.title = '';
exports.chdir = 
exports.cwd = 
exports.exit = 
exports.getgid = 
exports.setgid =
exports.getuid =
exports.setuid =
exports.memoryUsage =
exports.on = 
exports.umask = notImplemented;
    return exports;
  })({});
  return exports;
})({});
  function findPkg(uri){
    return pkgmap[uri];
  }
  function findModule(workingModule, uri){
    var module = undefined,
        moduleId = lib.path.join(lib.path.dirname(workingModule.id), uri).replace(/\.js$/, ''),
        moduleIndexId = lib.path.join(moduleId, 'index'),
        pkg = workingModule.pkg;
    var i = pkg.modules.length,
        id;
    while(i-->0){
      id = pkg.modules[i].id;
      if(id==moduleId || id == moduleIndexId){
        module = pkg.modules[i];
        break;
      }
    }
    return module;
  }
  function genRequire(callingModule){
    return function require(uri){
      var module,
          pkg;
      if(/^\./.test(uri)){
        module = findModule(callingModule, uri);
      } else if ( ties && ties.hasOwnProperty( uri ) ) {
        return ties[ uri ];
      } else {
        pkg = findPkg(uri);
        if(!pkg && nativeRequire){
          try {
            pkg = nativeRequire(uri);
          } catch (nativeRequireError) {}
          if(pkg) return pkg;
        }
        if(!pkg){
          throw new Error('Cannot find module "'+uri+'" @[module: '+callingModule.id+' package: '+callingModule.pkg.name+']');
        }
        module = pkg.index;
      }
      if(!module){
        throw new Error('Cannot find module "'+uri+'" @[module: '+callingModule.id+' package: '+callingModule.pkg.name+']');
      }
      module.parent = callingModule;
      return module.call();
    };
  }
  function module(parentId, wrapper){
    var parent = pkgdefs[parentId],
        mod = wrapper(parent),
        cached = false;
    mod.exports = {};
    mod.require = genRequire(mod);
    mod.call = function(){
            if(cached) {
        return mod.exports;
      }
      cached = true;
      global.require = mod.require;
      mod.wrapper(mod, mod.exports, global, global.Buffer,global.process, global.require);
      return mod.exports;
    };
    if(parent.mainModuleId == mod.id){
      parent.index = mod;
      parent.parents.length == 0 && ( locals.main = mod.call );
    }
    parent.modules.push(mod);
  }
  function pkg(/* [ parentId ...], wrapper */){
    var wrapper = arguments[ arguments.length - 1 ],
        parents = Array.prototype.slice.call(arguments, 0, arguments.length - 1),
        ctx = wrapper(parents);
    if(pkgdefs.hasOwnProperty(ctx.id)){
      throw new Error('Package#'+ctx.id+' "' + ctx.name + '" has duplication of itself.');
    }
    pkgdefs[ctx.id] = ctx;
    pkgmap[ctx.name] = ctx;
    arguments.length == 1 && ( pkgmap['main'] = ctx );
  }
  function mainRequire(uri){
    return pkgmap.main.index.require(uri);
  }
  function stderr(){
    return lib.process.stderr.content;
  }
  function stdin(){
    return lib.process.stdin.content;
  }
  function stdout(){
    return lib.process.stdout.content;
  }
  return (locals = {
    'lib'        : lib,
    'findPkg'    : findPkg,
    'findModule' : findModule,
    'name'       : 'uijs',
    'module'     : module,
    'pkg'        : pkg,
    'packages'   : pkgmap,
    'stderr'     : stderr,
    'stdin'      : stdin,
    'stdout'     : stdout,
    'require'    : mainRequire
});
})(this);
uijs.pkg(function(parents){
  return {
    'id':1,
    'name':'uijs',
    'main':undefined,
    'mainModuleId':'lib/index',
    'modules':[],
    'parents':parents
  };
});
uijs.module(1, function(/* parent */){
  return {
    'id': 'lib/animation',
    'pkg': arguments[0],
    'wrapper': function(module, exports, global, Buffer,process, require, undefined){
      // -- animation
var constant = require('./util').constant;
var curves = exports.curves = {};
curves.linear = function() {
  return function(x) {
    return x;
  };
};
curves.easeInEaseOut = function() {
  return function(x) {
    return (1 - Math.sin(Math.PI / 2 + x * Math.PI)) / 2;
  };
};
module.exports = function(from, to, options) {
  options = options || {};
  options.duration = options.duration || constant(250);
  options.callback = options.callback || function() { };
  options.curve = options.curve || curves.easeInEaseOut();
  options.name = options.name || from.toString() + '_to_' + to.toString();
  var startTime = Date.now();
  var endTime = Date.now() + options.duration();
  var callbackCalled = false;
  return function () {
    var elapsedTime = Date.now() - startTime;
    var ratio = elapsedTime / options.duration();
    if (ratio < 1.0) {
      curr = from + (to - from) * options.curve(ratio);
    }
    else {
      // console.timeEnd(options.name);
      curr = to;
      if (options.callback && !callbackCalled) {
        options.callback.call(this);
        callbackCalled = true;
      }
    }
    return curr;
  };
};
    }
  };
});
uijs.module(1, function(/* parent */){
  return {
    'id': 'lib/box',
    'pkg': arguments[0],
    'wrapper': function(module, exports, global, Buffer,process, require, undefined){
      var constant = require('./util').constant;
var defaults = require('./util').defaults;
var valueof = require('./util').valueof;
// # box(options)
// `options.x` - x-position of the box (default `constant(0)`)
// `options.y` - y-position of the box (default `constant(0)`)
// `options.width` - width of the box (default `constant(100)`)
// ...
module.exports = function(options) {
  var obj = defaults(options, {
    x: constant(0),
    y: constant(0),
    width: constant(100),
    height: constant(100),
    rotation: constant(0.0),
    visible: constant(true),
    clip: constant(false),
    alpha: null,
    id: function() { return this._id; },
    terminal: function() { return this.query('#terminal'); },
  });
  obj._id       = '<unattached>';
  obj._is_box  = true;
  obj._children = {};
  obj._nextid   = 0;
  /// ## Logging
  /// ### box.log(...)
  /// Sends a log line into an attached terminal. A terminal is a box with the ID `#terminal`.
  /// if there is no such child box attached, this function will not do anything.
  obj.log = function() {
    var self = this;
    var term = self.terminal();
    if (!term) return;
    var args = [];
    var id = (self.id && self.id()) || self._id;
    args.push('[' + id + ']');
    for (var i = 0; i < arguments.length; ++i) {
      args.push(arguments[i]);
    }
    term.writeLine(args.join(' '));
  };
  /// ## EventEmitter
  /// Each box implements the basic EventEmitter functions: `on()` and `emit()`.
  var _subscriptions = {};
  obj.emit = function(event) {
    var self = this;
    var handlers = _subscriptions[event];
    var handled;
    if (handlers) {
      var args = [];
      for (var i = 1; i < arguments.length; ++i) {
        args.push(arguments[i]);
      }
      handlers.forEach(function(fn) {
        var ret = fn.apply(self, args);
        if (typeof ret === 'undefined' || ret === true) handled = true;
        if (ret === false) handled = false;
      });
    }
    return handled;
  };
  // emits the event (with arguments) after 100ms
  // should be used to allow ui to update when emitting
  // events from event handlers.
  obj.queue = function(event) {
    var self = this;
    var args = arguments;
    console.log('emitting later', event);
    setTimeout(function() {
      self.emit.apply(self, args);
    }, 50);
  };
  obj.on = function(event, handler) {
    var self = this;
    if (!_subscriptions) return;
    var handlers = _subscriptions[event];
    if (!handlers) handlers = _subscriptions[event] = [];
    handlers.push(handler);
  };  
  /// ## Box Hierarchy
  /// Boxes have children and parents.
  // returns the root of the box hierarchy
  obj.root = function() {
    var self = this;
    if (!self.parent) return self;
    return self.parent.root();
  };
  // adds a child to the end of the children's stack.
  obj.add = function(child) {
    var self = this;
    if (Array.isArray(child)) {
      return child.forEach(function(c) {
        self.add(c);
      });
    }
    if (!child._is_box && !child._is_view) throw new Error('can only add boxes as children to a box');
    var previd = self._nextid;
    child._id = self._nextid++;
    child.parent = self;
    child.bringToTop = function() {
      self.remove(child);
      self.add(child);
    };
    child.remove = function() {
      self.remove(child);
    };
    child.prev = function() {
      var prev = null;
      
      for (var id in self._children) {
        if (id == child._id) {
          return self._children[prev];
        }
        prev = id;
      }
      return null;
    };
    var allow = true;
    var child_ret = child.emit('before-add-child', self);
    if (typeof child_ret === 'undefined') allow = true;
    else allow = !!child_ret;
    if (allow) {
      var ret = self.emit('before-add-child', child);
      if (typeof ret === 'undefined') allow = true;
      else allow = !!ret;
    }
    if (allow) {
      self._children[child._id] = child;
      self.emit('after-add-child', child);
      child.emit('after-child-added', self);
    }
  };
  // removes a child
  obj.remove = function(child) {
    var self = this;
    delete self._children[child._id];
    child.parent = null;
    return child;
  };
  // removes all children
  obj.empty = function() {
    var self = this;
    for (var k in self._children) {
      self.remove(self._children[k]);
    }
  };
  // retrieve a child by it's `id()` property. children without
  // this property cannot be retrieved using this function.
  obj.get = function(id) {
    var self = this;
    for (var k in self._children) {
      var child = self._children[k];
      if (child.id && child.id() === id) {
        return child;
      }
    }
    return null;
  };
  // ### box.query(id)
  // Retrieves a child from the entire box tree by id.
  obj.query = function(id) {
    var self = this;
    var child = self.get(id);
    if (!child) {
      for (var k in self._children) {
        var found = self._children[k].query(id);
        if (found) {
          child = found;
          break;
        }
      }
    }
    return child;
  };
  /// ### box.all()
  /// Returns all the children of this box.
  obj.all = function() {
    var self = this;
    return Object.keys(self._children)
      .map(function(k) { return self._children[k]; });
  };
  /// ### box.rest(child)
  /// Returns all the children that are not `child`.
  obj.rest = function(child) {
    var self = this;
    return Object.keys(self._children)
      .filter(function(k) { return k != child._id; })
      .map(function(k) { return self._children[k]; });
  };
  /// ## Drawing
  /// ### box.ondraw(ctx)
  /// `ondraw` is called __every frame__ with a `CanvasRenderingContext2D` as a single
  /// parameter. The box should draw itself as efficiently as possible.
  obj.ondraw = null;
  /// ### box.draw(ctx)
  /// This function is called every frame. It draws the current box (by means of calling `ondraw`)
  /// and then draws the box's children iteratively. This function also implements a few of the basic
  /// drawing capabilities and optimizations: buffering, clipping, scaling, rotation.
  obj.draw = function(ctx) {
    var self = this;
    ctx.save();
    if (self.rotation && self.rotation()) {
      var centerX = self.x() + self.width() / 2;
      var centerY = self.y() + self.height() / 2;
      ctx.translate(centerX, centerY);
      ctx.rotate(self.rotation());
      ctx.translate(-centerX, -centerY);
    }
    // TODO: add alpha check as well (do not box if transparent)
    if (self.visible()) {
      // stuff that applies to all children
      ctx.translate(self.x(), self.y());
      if (self.alpha) ctx.globalAlpha = self.alpha();
      if (self.clip()) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(self.width(), 0);
        ctx.lineTo(self.width(), self.height());
        ctx.lineTo(0, self.height());
        ctx.closePath();
        ctx.clip();
      }
      ctx.save();
      // stuff that applies only to this child
      if (self.ondraw) {
        if (self.width() > 0 && self.height() > 0) {
          self.ondraw(ctx);
        }
      }
      ctx.restore();
      Object.keys(self._children).forEach(function(key) {
        //TODO: do not draw child if out of viewport
        var child = self._children[key];
        child.draw.call(child, ctx);
      });
      ctx.restore();
    }
  };
  // returns the first child
  obj.first = function() {
    var self = this;
    var keys = self._children && Object.keys(self._children);
    if (!keys || keys.length === 0) return null;
    return self._children[keys[0]];
  };
  // if `children` is defined in construction, add them and
  // replace with a property so we can treat children as an array
  if (obj.children) {
    obj.add(obj.children);
    delete obj.children;
  }
  // -- interactivity
  // returns {x,y} in child coordinates
  obj.hittest = function(child, pt) {
    var self = this;
    if (pt.x >= child.x() &&
        pt.y >= child.y() &&
        pt.x <= child.x() + child.width() &&
        pt.y <= child.y() + child.height()) {
      
      // convert to child coords
      var child_x = pt.x - child.x();
      var child_y = pt.y - child.y();
      return { x: child_x, y: child_y };
    }
    return null;
  };
  var current_handler = null;
  obj._propagate = function(event, pt, e) {
    var self = this;
    var handler = null;
    for (var id in self._children) {
      var child = self._children[id];
      var child_pt = self.hittest(child, pt);
      if (child_pt) {
        var child_handler = child.interact(event, child_pt, e);
        if (child_handler) handler = child_handler;
      }
    }
    if (!handler) {
      if (self.emit(event, pt, e)) {
        handler = self;
      }
    }
    if (handler) self.log(event, 'handled by', handler.id());
    return handler;
  }
  // called with a mouse/touch event and relative coords
  // and propogates to child boxes. if child box did not handle
  // the event, the event is emitted to the parent (dfs).
  obj.interact = function(event, pt, e) {
    var self = this;
    if (event === 'touchstart' || event === 'mousedown') {
      current_handler = null;
      var handler = self._propagate(event, pt, e);
      if (handler) current_handler = handler;
      return current_handler;
    }
    // check if we already have an ongoing touch
    if (current_handler) {
      // convert pt to current handler coordinates.
      var current_handler_screen = current_handler.screen();
      var this_screen = self.screen();
      var delta = {
        x: current_handler_screen.x - this_screen.x,
        y: current_handler_screen.y - this_screen.y,
      };
      pt.x = pt.x || 0;
      pt.y = pt.y || 0;
      pt = {
        x: pt.x - delta.x,
        y: pt.y - delta.y,
      };
      var handled = current_handler.emit(event, pt, e);
      if (event === 'touchend' || event === 'mouseup') current_handler = null;
      return handled ? self : null;
    }
    return null;
  };
  // returns the screen coordinates of this obj
  obj.screen = function() {
    var self = this;
    var pscreen = self.parent ? self.parent.screen() : { x: 0, y: 0 };
    return {
      x: pscreen.x + self.x(),
      y: pscreen.y + self.y()
    };
  };
  return obj;
};
    }
  };
});
uijs.module(1, function(/* parent */){
  return {
    'id': 'lib/canvasize',
    'pkg': arguments[0],
    'wrapper': function(module, exports, global, Buffer,process, require, undefined){
      var box = require('./box');
var constant = require('./util').constant;
var INTERACTION_EVENTS = [
  'touchstart',
  'touchmove',
  'touchend',
  'mousedown',
  'mousemove',
  'mouseup',
];
module.exports = function(options) {
  options = options || {};
  window.requestAnimationFrame || (
    window.requestAnimationFrame = 
    window.webkitRequestAnimationFrame || 
    window.mozRequestAnimationFrame    || 
    window.oRequestAnimationFrame      || 
    window.msRequestAnimationFrame     || 
    function(cb) { setTimeout(cb, 1000/60); }
  );
  window.devicePixelRatio || (window.devicePixelRatio = 1);
  console.log('devicePixelRatio is', window.devicePixelRatio);
  var canvas = null;
  if (options.element) {
    canvas = options.element;
    canvas.width = canvas.width || parseInt(canvas.style.width) * window.devicePixelRatio;
    canvas.height = canvas.height || parseInt(canvas.style.height) * window.devicePixelRatio;
  }
  else {
    if (document.body.hasChildNodes()) {
      while (document.body.childNodes.length) {
        document.body.removeChild(document.body.firstChild);
      }
    }
    document.body.style.background = 'white';
    document.body.style.padding = '0px';
    document.body.style.margin = '0px';
    canvas = document.createElement('canvas');
    canvas.style.background = 'green';
    document.body.appendChild(canvas);
    window.onresize = function() {
      // http://joubert.posterous.com/crisp-html-5-canvas-text-on-mobile-phones-and
      canvas.width = window.innerWidth * window.devicePixelRatio;
      canvas.height = window.innerHeight * window.devicePixelRatio;
      canvas.style.width = window.innerWidth;
      canvas.style.height = window.innerHeight;
      var c = canvas.getContext('2d');
      c.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    document.body.onorientationchange = window.onresize;
    setTimeout(function() { 
      window.scrollTo(0, 0);
      window.onresize();
    }, 0);
    window.onresize();
  }
  var ctx = canvas.getContext('2d');
  options = options || {};
  options.id = options.id || constant('canvas');
  options.x = options.x || constant(0);
  options.y = options.y || constant(0);
  options.width = options.width || function() { return canvas.width / window.devicePixelRatio; };
  options.height = options.height || function() { return canvas.height / window.devicePixelRatio; };
  var main = box(options);
  // get the coordinates for a mouse or touch event
  // http://www.nogginbox.co.uk/blog/canvas-and-multi-touch
  function getCoords(e) {
    if (e.touches && e.touches.length > 0) {
      e = e.touches[0];
      return { x: e.pageX - canvas.offsetLeft, y: e.pageY - canvas.offsetTop };
    }
    else if (e.offsetX) {
      // works in chrome / safari (except on ipad/iphone)
      return { x: e.offsetX, y: e.offsetY };
    }
    else if (e.layerX) {
      // works in Firefox
      return { x: e.layerX, y: e.layerY };
    }
    else if (e.pageX) {
      // works in safari on ipad/iphone
      return { x: e.pageX - canvas.offsetLeft, y: e.pageY - canvas.offsetTop };
    }
  }
  // add mouse/touch interaction events
  INTERACTION_EVENTS.forEach(function(name) {
    canvas['on' + name] = function(e) {
      e.preventDefault();
      var coords = (name !== 'touchend') ? getCoords(e) : getCoords(e.changedTouches[0]);
      // coords.x *= window.devicePixelRatio;
      // coords.y *= window.devicePixelRatio;
      if (coords) main.log('on' + name, coords.x + ',' + coords.y);
      else main.log('error - no coords for ' + name);
      
      main.interact(name, coords, e);
    };
  });
  function redraw() {
    //TODO: since the canvas fills the screen we don't really need this?
    if (main.alpha && main.alpha() < 1.0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    main.draw(ctx);
    window.requestAnimationFrame(redraw);
  }
  redraw();
  main.INTERACTION_EVENTS = INTERACTION_EVENTS;
  return main;
};
    }
  };
});
uijs.module(1, function(/* parent */){
  return {
    'id': 'lib/index',
    'pkg': arguments[0],
    'wrapper': function(module, exports, global, Buffer,process, require, undefined){
      exports.canvasize = require('./canvasize');
exports.box = require('./box');
exports.util = require('./util');
exports.positioning = require('./positioning');
exports.animation = require('./animation');
// TODO: remove
exports.view = exports.box; // legacy
exports.app = exports.box; // legacy
exports.terminal = require('./terminal');
exports.rterm = require('./rterm');
    }
  };
});
uijs.module(1, function(/* parent */){
  return {
    'id': 'lib/positioning',
    'pkg': arguments[0],
    'wrapper': function(module, exports, global, Buffer,process, require, undefined){
      exports.top = function(box) {
  return box.y();
};
exports.left = function(box) { 
  return box.x();
};
exports.right = function(box) {
  return box.x() + box.width();
};
exports.bottom = function(box) {
  return box.y() + box.height();
};
exports.width = function(box) {
  return box.width();
};
exports.height = function(box) {
  return box.height();
};
function _rulefn(rule) {
  if (Object.keys(rule).length !== 1) {
    throw new Error('positioning can only accept a single key as positioning rule');
  }
  var measure = Object.keys(rule)[0];
  var value = rule[measure];
  return function(box) {
    return exports[measure](box) + value;
  };
}
exports.parent = function(rule) {
  var fn = _rulefn(rule);
  return function() {
    return fn(this.parent);
  };
};
exports.relative = function(rule) {
  var fn = _rulefn(rule);
  return function() {
    return fn(this.prev());
  };
};
exports.centerx = function(delta) {
  delta = delta || 0;
  return function() {
    return this.parent.x() + this.parent.width() / 2 - this.width() / 2 + delta;
  };
};
exports.centery = function(delta) {
  delta = delta || 0;
  return function() {
    return this.parent.y() + this.parent.height() / 2 - this.height() / 2 + delta;
  };
};
    }
  };
});
uijs.module(1, function(/* parent */){
  return {
    'id': 'lib/rterm',
    'pkg': arguments[0],
    'wrapper': function(module, exports, global, Buffer,process, require, undefined){
      var box = require('./box');
var constant = require('./util').constant;
var defaults = require('./util').defaults;
module.exports = function(socket, options) {
  if (!socket) throw new Error('`socket` is required');
  var obj = box(defaults(options, {
    id: constant('#terminal'),
    visible: constant(false),
  }));
  obj.writeLine = function() {
    var args = [];
    
    for (var i = 0; i < arguments.length; ++i) {
      args.push(arguments[i]);
    }
    var line = {
      time: Date.now(),
      data: args.join(' '),
    };
    socket.emit('log', line);
    return line;
  };
  return obj;
};
    }
  };
});
uijs.module(1, function(/* parent */){
  return {
    'id': 'lib/terminal',
    'pkg': arguments[0],
    'wrapper': function(module, exports, global, Buffer,process, require, undefined){
      var box = require('./box');
var constant = require('./util').constant;
var max = require('./util').max;
module.exports = function(options) {
  options = options || {};
  options.bufferSize = options.bufferSize || constant(100);
  options.id = options.id || constant('#terminal'); // for `box.log(...)`
  options.lineHeight = options.lineHeight || constant(12);
  var self = box(options);
  self.fillStyle = constant('black');
  var lines = [];
  self.writeLine = function(s) {
    var line = {
      data: s,
      time: Date.now()
    };
    lines.push(line);
    var bufferSize = self.bufferSize && self.bufferSize();
    if (bufferSize) {
      while (lines.length > bufferSize) {
        lines.shift();
      }
    }
    return line;
  };
  var _ondraw = self.ondraw;
  self.ondraw = function(ctx) {
    _ondraw.call(self, ctx);
    ctx.save();
    var lineHeight = self.lineHeight();
    ctx.font = lineHeight + 'px Courier';
    ctx.textAlign = 'left';
    // calculate how many lines can fit into the terminal
    var maxLines = self.height() / lineHeight;
    var first = max(0, Math.round(lines.length - maxLines) + 1);
    var y = 0;
    for (var i = first; i < lines.length; ++i) {
      var line = lines[i].data;
      var now = '[' + new Date(lines[i].time).toISOString().replace(/.*T/, '') + '] ';
      ctx.fillStyle = 'gray';
      ctx.fillText(now, 0, y);
      ctx.fillStyle = 'white';
      ctx.fillText(line, ctx.measureText(now).width, y);
      y += lineHeight;
    }
    ctx.restore();
  };
  return self;
}
    }
  };
});
uijs.module(1, function(/* parent */){
  return {
    'id': 'lib/util',
    'pkg': arguments[0],
    'wrapper': function(module, exports, global, Buffer,process, require, undefined){
      exports.constant = function(x) { return function() { return x; }; };
exports.centerx = function(target, delta) { return function() { return target.width() / 2 - this.width() / 2 + (delta || 0); }; };
exports.centery = function(target, delta) { return function() { return target.height() / 2 - this.height() / 2 + (delta || 0); }; };
exports.top = function(target, delta) { return function() { return (delta || 0); }; };
exports.left = function(target, delta) { return function() { return (delta || 0); }; };
exports.right = function(target, delta) { return function() { return target.width() + (delta || 0); }; };
exports.bottom = function(target, delta) { return function() { return target.height() + (delta || 0); }; };
exports.min = function(a, b) { return a < b ? a : b; };
exports.max = function(a, b) { return a > b ? a : b; };
// returns a function that creates a new object linked to `this` (`Object.create(this)`).
// any property specified in `options` (if specified) is assigned to the child object.
exports.derive = function(options) {
  return function() {
    var obj = Object.create(this);
    obj.base = this;
    if (options) {
      for (var k in options) {
        obj[k] = options[k];
      }
    }
    return obj;
  };  
};
// returns the value of `obj.property` if it is defined (could be `null` too)
// if not, returns `def` (or false). useful for example in tri-state attributes where `null` 
// is used to disregard it in the drawing process (e.g. `fillStyle`).
exports.valueof = function(obj, property, def) {
  if (!obj) throw new Error('`obj` is required');
  if (!def) def = false;
  if (!(property in obj)) return def;
  else return obj[property];
};
exports.defaults = function(target, source) {
  var valueof = exports.valueof;
  target = target || {};
  for (var k in source) {
    target[k] = valueof(target, k, source[k]);
  }
  return target;
};
exports.loadimage = function(src) {
  if (typeof src === 'function') src = src();
  
  var img = new Image();
  img.src = src;
  img.onload = function() { };
  return function() {
    return img;
  }
};
    }
  };
});
uijs.module(1, function(/* parent */){
  return {
    'id': 'lib/index',
    'pkg': arguments[0],
    'wrapper': function(module, exports, global, Buffer,process, require, undefined){
      exports.canvasize = require('./canvasize');
exports.box = require('./box');
exports.util = require('./util');
exports.positioning = require('./positioning');
exports.animation = require('./animation');
// TODO: remove
exports.view = exports.box; // legacy
exports.app = exports.box; // legacy
exports.terminal = require('./terminal');
exports.rterm = require('./rterm');
    }
  };
});
if(typeof module != 'undefined' && module.exports ){
  module.exports = uijs;
  if( !module.parent ){
    uijs.main();
  }
};
window.require = uijs.require;
window.app = telobike.require('uijs');
