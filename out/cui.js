var cui = (function(global, undefined){
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
    'name'       : 'cui',
    'module'     : module,
    'pkg'        : pkg,
    'packages'   : pkgmap,
    'stderr'     : stderr,
    'stdin'      : stdin,
    'stdout'     : stdout,
    'require'    : mainRequire
});
})(this);
cui.pkg(function(parents){
  return {
    'id':1,
    'name':'cui',
    'main':undefined,
    'mainModuleId':'lib/index',
    'modules':[],
    'parents':parents
  };
});
cui.module(1, function(/* parent */){
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
  // console.time(options.name);
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
cui.module(1, function(/* parent */){
  return {
    'id': 'lib/button',
    'pkg': arguments[0],
    'wrapper': function(module, exports, global, Buffer,process, require, undefined){
      var view = require('./view');
var layouts = require('./layouts');
var image = require('./image');
var constant = require('./util').constant;
var derive = require('./util').derive;
module.exports = function(options) {
    options        = options        || {};
    options.height = options.height || constant(40);
    options.radius = options.radius || constant(4);
    options.layout = options.layout || layouts.dock();
    options.font   = options.font   || constant('x-large Helvetica');
    // some default styling
    options.fillStyle = options.fillStyle || constant('#aaaaaa');
    options.textFillStyle = options.textFillStyle || constant('white');
    options.highlighted = options.highlighted || {};
    options.highlighted.fillStyle = options.highlighted.fillStyle || constant('#666666');
    var self = view(options);
    self.on('touchstart', function() { self.override = derive(self.highlighted); });
    self.on('touchend',   function() { self.override = null; });
    self.on('mousedown',  function() { self.emit('touchstart'); });
    self.on('mouseup',    function() { self.emit('touchend'); });
    return self;
  }
    }
  };
});
cui.module(1, function(/* parent */){
  return {
    'id': 'lib/canvasize',
    'pkg': arguments[0],
    'wrapper': function(module, exports, global, Buffer,process, require, undefined){
      var view = require('./view');
var constant = require('./util').constant;
var layouts = require('./layouts');
var INTERACTION_EVENTS = [
  'touchstart',
  'touchmove',
  'touchend',
  'mousedown',
  'mousemove',
  'mouseup',
];
module.exports = function(options) {
  window.requestAnimationFrame || (
    window.requestAnimationFrame = 
    window.webkitRequestAnimationFrame || 
    window.mozRequestAnimationFrame    || 
    window.oRequestAnimationFrame      || 
    window.msRequestAnimationFrame     || 
    function(cb) { setTimeout(cb, 1000/60); }
  );
  window.devicePixelRatio || (window.devicePixelRatio = 1);
  // window.devicePixelRatio = 1;
  console.log('devicePixelRatio:', window.devicePixelRatio);
  if (document.body.hasChildNodes()) {
    while (document.body.childNodes.length) {
      document.body.removeChild(document.body.firstChild);
    }
  }
  var canvas = document.createElement('canvas');
  document.body.appendChild(canvas);
  document.body.style.background = 'white';
  canvas.style.background = 'white';
  document.body.style.padding = '0px';
  document.body.style.margin = '0px';
  window.onresize = function() {
    // http://joubert.posterous.com/crisp-html-5-canvas-text-on-mobile-phones-and
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
    canvas.style.width = window.innerWidth;
    canvas.style.height = window.innerHeight;
    canvas.getContext('2d').scale(window.devicePixelRatio, window.devicePixelRatio);
  };
  document.body.onorientationchange = window.onresize;
  setTimeout(function() { 
    window.scrollTo(0, 0);
    window.onresize();
  }, 0);
  window.onresize();
  var ctx = canvas.getContext('2d');
  options = options || {};
  options.id = options.id || constant('canvas');
  options.x = options.x || constant(0);
  options.y = options.y || constant(0);
  options.width = options.width || function() { return canvas.width / window.devicePixelRatio; };
  options.height = options.height || function() { return canvas.height / window.devicePixelRatio; };
  options.layout = options.layout || layouts.none();
  var main = view(options);
  // get the coordinates for a mouse or touch event
  // http://www.nogginbox.co.uk/blog/canvas-and-multi-touch
  function getCoords(e) {
    if (e.offsetX) {
      // works in chrome / safari (except on ipad/iphone)
      return { x: e.offsetX, y: e.offsetY };
    }
    else if (e.layerX) {
      // works in Firefox
      return { x: e.layerX, y: e.layerY };
    }
    else if (e.touches && e.touches.length > 0) {
      e = e.touches[0];
      return { x: e.pageX - canvas.offsetLeft, y: e.pageY - canvas.offsetTop };
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
      main.log('on' + name, coords.x + ',' + coords.y);
      main.interact(name, coords, e);
    };
  });
  function redraw() {
    //TODO: since the canvas fills the screen we don't really need this?
    // ctx.clearRect(0, 0, canvas.width, canvas.height);
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
cui.module(1, function(/* parent */){
  return {
    'id': 'lib/image',
    'pkg': arguments[0],
    'wrapper': function(module, exports, global, Buffer,process, require, undefined){
      var view = require('./view');
module.exports = function(options) {
  var self = view(options);
  self.width = function() {
    if (self.image) {
      return self.image.width;
    }
    else return 10;
  };
  self.height = function() {
    if (self.image) {
      return self.image.height;
    }
    else return 10;
  };
  return self;
};
    }
  };
});
cui.module(1, function(/* parent */){
  return {
    'id': 'lib/index',
    'pkg': arguments[0],
    'wrapper': function(module, exports, global, Buffer,process, require, undefined){
      exports.canvasize = require('./canvasize');
exports.animation = require('./animation');
exports.util = require('./util');
exports.image = require('./image');
exports.label = require('./label');
exports.layouts = require('./layouts');
exports.rectangle = require('./rectangle');
exports.view = require('./view');
exports.terminal = require('./terminal');
exports.button = require('./button');
    }
  };
});
cui.module(1, function(/* parent */){
  return {
    'id': 'lib/label',
    'pkg': arguments[0],
    'wrapper': function(module, exports, global, Buffer,process, require, undefined){
      var view = require('./view');
module.exports = function(options) {
  return view(options);
};
    }
  };
});
cui.module(1, function(/* parent */){
  return {
    'id': 'lib/layouts',
    'pkg': arguments[0],
    'wrapper': function(module, exports, global, Buffer,process, require, undefined){
      var constant = require('./util').constant;
var max = require('./util').max;
exports.stack = function(options) {
  options = options || {};
  options.padding = options.padding || constant(5);
  options.spacing = options.spacing || constant(5);
  return function() {
    var parent = this;
    parent.on('after-add-child', function(child) {
      child.x = options.padding;
      child.width = function() {
        return parent.width() - options.padding() * 2 - child.shadowOffsetX();
      };
      var prev = child.prev();
      if (!prev) child.y = options.padding;
      else child.y = function() { return prev.y() + prev.height() + options.spacing() + child.shadowOffsetY() };
    });
  };
};
exports.dock = function(options) {
  options = options || {};
  options.spacing = options.spacing || constant(5);
  options.padding = options.padding || constant(5);
  var dockers = {};
  dockers.top = function(child) {
    var parent = this;
    child.x = function() { 
      var region = parent.unoccupied(child);
      return region.x; 
    };
    child.y = function() { 
      var region = parent.unoccupied(child);
      return region.y; 
    };
    child.width = function() { 
      var region = parent.unoccupied(child);
      return region.width - child.shadowOffsetX();
    };
  };
  dockers.bottom = function(child) {
    var parent = this;
    child.x = function() { 
      var region = parent.unoccupied(child);
      return region.x; 
    };
    child.y = function() { 
      var region = parent.unoccupied(child);
      return region.y + region.height - child.height() - child.shadowOffsetY();
    };
    child.width = function() { 
      var region = parent.unoccupied(child);
      return region.width - child.shadowOffsetX();
    };
  };
  dockers.left = function(child) {
    var parent = this;
    child.x = function() { 
      var region = parent.unoccupied(child);
      return region.x; 
    };
    child.y = function() { 
      var region = parent.unoccupied(child);
      return region.y; 
    };
    child.height = function() { 
      var region = parent.unoccupied(child);
      return region.height - child.shadowOffsetY(); 
    };
  };
  dockers.right = function(child) { 
    var parent = this;
    child.x = function() { 
      var region = parent.unoccupied(child);
      return region.x + region.width - child.width() - child.shadowOffsetX(); 
    };
    child.y = function() { 
      var region = parent.unoccupied(child);
      return region.y; 
    };
    child.height = function() { 
      var region = parent.unoccupied(child);
      return region.height - child.shadowOffsetY();
    };
  };
  dockers.fill = function(child) {
    var parent = this;
    child.x = function() { 
      var region = parent.unoccupied(child);
      return region.x; 
    };
    child.y = function() { 
      var region = parent.unoccupied(child);
      return region.y; 
    };
    child.width = function() { 
      var region = parent.unoccupied(child);
      return region.width - child.shadowOffsetX();
    };
    child.height = function() { 
      var region = parent.unoccupied(child);
      return region.height - child.shadowOffsetY();
    };
  }
  return function() {
    var parent = this;
    // returns the unoccupied region after distributing
    // frames for all children (up to `upto` child, if specified).
    parent.unoccupied = function(upto) {
      // start with the entire parent region
      var curr = {
        x: options.padding(),
        y: options.padding(),
        width: parent.width() - options.padding() * 2,
        height: parent.height() - options.padding() * 2,
      };
      for (var id in parent._children) {
        
        // break until we reach `upto`
        if (upto && upto._id == id) {
          break;
        }
        var child = parent._children[id];
        var dockStyle = (child.dockStyle && child.dockStyle()) || 'top';
        switch (dockStyle) {
          case 'top':
            curr.y += child.height() + options.spacing() + child.shadowOffsetY();
            curr.height -= child.height() + child.shadowOffsetY() + options.spacing();
            break;
          case 'bottom':
            curr.height -= child.height() + child.shadowOffsetY() + options.spacing();
            break;
          case 'left':
            curr.x += child.width() + options.spacing() + child.shadowOffsetX();
            curr.width -= child.width() + child.shadowOffsetX() + options.spacing();
            break;
          case 'right':
            curr.width -= child.width() + child.shadowOffsetX() + options.spacing();
            break;
          case 'fill':
            curr.width -= child.width() + child.shadowOffsetX();
            curr.height -= child.height() + child.shadowOffsetY();
            break;
        }
        if (curr.width < 0) curr.width = 0;
        if (curr.height < 0) curr.height = 0;
        if (curr.width === 0 || curr.height === 0) break;
      }
      return curr;
    };
    this.on('before-add-child', function(child) {
      var dockStyle = (child.dockStyle && child.dockStyle()) || 'top';
      var docker = dockers[dockStyle];
      if (docker) docker.call(parent, child);
    });
  };
};
exports.none = function() {
  return function() { };
};
    }
  };
});
cui.module(1, function(/* parent */){
  return {
    'id': 'lib/rectangle',
    'pkg': arguments[0],
    'wrapper': function(module, exports, global, Buffer,process, require, undefined){
      var view = require('./view');
module.exports = function(options) {
  return view(options);
}
    }
  };
});
cui.module(1, function(/* parent */){
  return {
    'id': 'lib/terminal',
    'pkg': arguments[0],
    'wrapper': function(module, exports, global, Buffer,process, require, undefined){
      var view = require('./view');
var constant = require('./util').constant;
var max = require('./util').max;
module.exports = function(options) {
  options = options || {};
  options.bufferSize = options.bufferSize || constant(100);
  options.id = options.id || constant('#terminal'); // for `view.log(...)`
  var self = view(options);
  self.fillStyle = constant('black');
  var lines = [];
  self.writeLine = function(s) {
    lines.push({
      data: s,
      time: Date.now()
    });
    var bufferSize = self.bufferSize && self.bufferSize();
    if (bufferSize) {
      while (lines.length > bufferSize) {
        lines.shift();
      }
    }
  };
  var _ondraw = self.ondraw;
  self.ondraw = function(ctx) {
    _ondraw.call(self, ctx);
    ctx.save();
    var height = 8;
    ctx.font = height + 'px Courier';
    ctx.textAlign = 'left';
    // calculate how many lines can fit into the terminal
    var maxLines = self.height() / height;
    var first = max(0, Math.round(lines.length - maxLines) + 1);
    var y = 0;
    for (var i = first; i < lines.length; ++i) {
      var line = lines[i].data;
      var now = '[' + new Date(lines[i].time).toISOString().replace(/.*T/, '') + '] ';
      ctx.fillStyle = 'gray';
      ctx.fillText(now, 0, y);
      ctx.fillStyle = 'white';
      ctx.fillText(line, ctx.measureText(now).width, y);
      y += height;
    }
    ctx.restore();
  };
  return self;
}
    }
  };
});
cui.module(1, function(/* parent */){
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
    }
  };
});
cui.module(1, function(/* parent */){
  return {
    'id': 'lib/view',
    'pkg': arguments[0],
    'wrapper': function(module, exports, global, Buffer,process, require, undefined){
      var layouts = require('./layouts');
var constant = require('./util').constant;
module.exports = function(options) {
  var view       = options       || {};
  view.x         = view.x        || function() { return 0; };
  view.y         = view.y        || function() { return 0; };
  view.width     = view.width    || function() { return 100; };
  view.height    = view.height   || function() { return 50; };
  view.rotation  = view.rotation || function() { return 0; };
  view.visible   = view.visible  || function() { return true; };
  view.clip      = view.clip     || function() { return true; };
  view.layout    = view.layout   || layouts.stack();
  view.alpha     = view.alpha    || null;
  view.override  = view.override || null;
  
  view.shadowOffsetX = view.shadowOffsetX || function() { return 0; };
  view.shadowOffsetY = view.shadowOffsetY || function() { return 0; };
  view.shadowBlur = view.shadowBlur || function() { return 0; };
  view.shadowColor = view.shadowColor || function() { return 'black'; };
  view.textShadowBlur = view.textShadowBlur || function() { return 0; };
  view.textShadowColor = view.textShadowColor || function() { return 'black' };
  view.textShadowOffsetX = view.textShadowOffsetX || function() { return 0; };
  view.textShadowOffsetY = view.textShadowOffsetY || function() { return 0; };
  // rect
  view.radius    = view.radius || constant(0);
  // image
  view.imagesrc  = view.imagesrc || null;
  view.image     = view.image    || null;
  
  // text
  view.text              = view.text || null;
  view.textBaseline      = view.textBaseline || constant('top');
  view.textAlign         = view.textAlign || constant('center');
  view.textVerticalAlign = view.textVerticalAlign || constant('middle');
  view._id       = '<unattached>';
  view._is_view  = true;
  view._children = {};
  view._nextid   = 0;
  if (!('textFillStyle' in view) && !('textStrokeStyle' in view)) {
    view.textFillStyle = constant('black');
  }
  if (view.imagesrc) {
    var img = new Image();
    img.src = view.imagesrc();
    img.onload = function() { view.image = this; }
  }
  // -- log
  view.log = function() {
    var self = this;
    var root = self.root();
    var term = root.get('#terminal');
    if (!term) return;
    var args = [];
    var id = (self.id && self.id()) || self._id;
    args.push('[' + id + ']');
    for (var i = 0; i < arguments.length; ++i) {
      args.push(arguments[i]);
    }
    term.writeLine(args.join(' '));
  };
  // -- event emitter
  var _subscriptions = {};
  view.emit = function(event) {
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
  view.on = function(event, handler) {
    var self = this;
    if (!_subscriptions) return;
    var handlers = _subscriptions[event];
    if (!handlers) handlers = _subscriptions[event] = [];
    handlers.push(handler);
  };  
  // call layout initialization function on the child
  if (view.layout) {
    view.layout();
  }
  // -- children/parents
  // returns the root of the view hierarchy
  view.root = function() {
    var self = this;
    if (!self.parent) return self;
    return self.parent.root();
  };
  // adds a child to the end of the children's stack.
  view.add = function(child) {
    var self = this;
    if (Array.isArray(child)) {
      return child.forEach(function(c) {
        self.add(c);
      });
    }
    if (!child._is_view) throw new Error('can only add views as children to a view');
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
    var ret = self.emit('before-add-child', child);
    if (typeof ret === 'undefined') allow = true;
    else allow = !!ret;
    if (allow) {
      self._children[child._id] = child;
      self.emit('after-add-child', child);
    }
  };
  // removes a child
  view.remove = function(child) {
    var self = this;
    delete self._children[child._id];
    child.parent = null;
    return child;
  };
  // removes all children
  view.empty = function() {
    var self = this;
    for (var k in self._children) {
      self.remove(self._children[k]);
    }
  };
  // retrieve a child by it's `id()` property. children without
  // this property cannot be retrieved using this function.
  view.get = function(id) {
    var self = this;
    for (var k in self._children) {
      var child = self._children[k];
      if (child.id && child.id() === id) {
        return child;
      }
    }
    return null;
  };
  // retrieve a child from the entire view tree by id.
  view.query = function(id) {
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
  // -- drawing
  // default draw for view is basically to draw a rectangle
  view.ondraw = function(ctx) {
    var self = this;
    var radius = self.radius();
    ctx.beginPath();
    ctx.moveTo(0 + radius, 0);
    ctx.lineTo(0 + self.width() - radius, 0);
    ctx.quadraticCurveTo(0 + self.width(), 0, 0 + self.width(), 0 + radius);
    ctx.lineTo(0 + self.width(), 0 + self.height() - radius);
    ctx.quadraticCurveTo(0 + self.width(), 0 + self.height(), 0 + self.width() - radius, 0 + self.height());
    ctx.lineTo(0 + radius, 0 + self.height());
    ctx.quadraticCurveTo(0, 0 + self.height(), 0, 0 + self.height() - radius);
    ctx.lineTo(0, 0 + radius);
    ctx.quadraticCurveTo(0, 0, 0 + radius, 0);
    ctx.closePath();
    
    self.drawFill(ctx);
    self.drawImage(ctx);
    self.drawBorder(ctx);
    self.drawText(ctx);
  };
  view.drawFill = function(ctx) {
    var self = this;
    if (!self.fillStyle) return;
    ctx.fill();
  };
  view.drawBorder = function(ctx) {
    var self = this;
    if (!self.strokeStyle) return;
    // we don't want shadow the border
    ctx.save();
    ctx.shadowOffsetY = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowBlur = 0;
    ctx.stroke();
    ctx.restore();
  };
  view.drawImage = function(ctx) {
    var self = this;
    if (self.image) {
      ctx.drawImage(self.image, 0, 0, self.width(), self.height());
    }
  }
  view.drawText = function(ctx) {
    var self = this;
    if (!self.text || !self.text() || self.text().length === 0) return;
    if (!self.textFillStyle && !self.textStrokeStyle) return;
    var text = self.text();
    var width = self.width();
    var height = self.height();
    var top = 0;
    var left = 0;
    // http://stackoverflow.com/questions/1134586/how-can-you-find-the-height-of-text-on-an-html-canvas
    var textHeight = ctx.measureText('ee').width;
    switch (ctx.textAlign) {
      case 'start':
      case 'left': left = 0; break;
      case 'end':
      case 'right': left = width; break;
      case 'center': left = width / 2; break;
    }
    switch (self.textVerticalAlign()) {
      case 'top': top = 0; break;
      case 'middle': top = height / 2 - textHeight / 2; break;
      case 'bottom': top = height - textHeight; break;
    }
    ctx.save();
    if (self.textShadowBlur) ctx.shadowBlur = self.textShadowBlur();
    if (self.textShadowColor) ctx.shadowColor = self.textShadowColor();
    if (self.textShadowOffsetX) ctx.shadowOffsetX = self.textShadowOffsetX();
    if (self.textShadowOffsetY) ctx.shadowOffsetY = self.textShadowOffsetY();
    if (self.textFillStyle) {
      ctx.fillStyle = self.textFillStyle();
      ctx.fillText(text, left, top, width);
    }
    if (self.textStrokeStyle) {
      ctx.strokeStyle = self.textStrokeStyle();
      ctx.strokeText(text, left, top, width);
    }
    ctx.restore();
  };
  view._self = function() {
    var override = this.override && this.override();
    if (override) return override;
    else return this;
  };
  view.draw = function(ctx) {
    var self = this._self();
    ctx.save();
    if (self.rotation && self.rotation()) {
      var centerX = self.x() + self.width() / 2;
      var centerY = self.y() + self.height() / 2;
      ctx.translate(centerX, centerY);
      ctx.rotate(self.rotation());
      ctx.translate(-centerX, -centerY);
    }
    if (self.visible()) {
      ctx.translate(self.x(), self.y());
      ctx.save();
      if (self.alpha) ctx.globalAlpha = self.alpha();
      if (self.fillStyle) ctx.fillStyle = self.fillStyle();
      if (self.shadowBlur) ctx.shadowBlur = self.shadowBlur();
      if (self.shadowColor) ctx.shadowColor = self.shadowColor();
      if (self.shadowOffsetX) ctx.shadowOffsetX = self.shadowOffsetX();
      if (self.shadowOffsetY) ctx.shadowOffsetY = self.shadowOffsetY();
      if (self.lineCap) ctx.lineCap = self.lineCap();
      if (self.lineJoin) ctx.lineJoin = self.lineJoin();
      if (self.lineWidth) ctx.lineWidth = self.lineWidth();
      if (self.strokeStyle) ctx.strokeStyle = self.strokeStyle();
      if (self.font) ctx.font = self.font();
      if (self.textAlign) ctx.textAlign = self.textAlign();
      if (self.textBaseline) ctx.textBaseline = self.textBaseline();
      if (self.ondraw) {
        if (self.width() > 0 && self.height() > 0) {
          self.ondraw(ctx);
        }
      }
      ctx.restore();
      if (self.clip()) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(self.width(), 0);
        ctx.lineTo(self.width(), self.height());
        ctx.lineTo(0, self.height());
        ctx.closePath();
        ctx.clip();
      }
      Object.keys(self._children).forEach(function(key) {
        var child = self._children[key];
        child.draw.call(child, ctx);
      });
      ctx.restore();
    }
  };
  // returns the first child
  view.first = function() {
    var self = this;
    var keys = self._children && Object.keys(self._children);
    if (!keys || keys.length === 0) return null;
    return self._children[keys[0]];
  };
  // if `children` is defined in construction, add them and
  // replace with a property so we can treat children as an array
  if (view.children) {
    view.add(view.children);
    delete view.children;
  }
  // -- interactivity
  // returns {x,y} in child coordinates
  view.hittest = function(child, pt) {
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
  view._propagate = function(event, pt, e) {
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
  // and propogates to child views. if child view did not handle
  // the event, the event is emitted to the parent (dfs).
  view.interact = function(event, pt, e) {
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
  // returns the screen coordinates of this view
  view.screen = function() {
    var self = this;
    var pscreen = self.parent ? self.parent.screen() : { x: 0, y: 0 };
    return {
      x: pscreen.x + self.x(),
      y: pscreen.y + self.y()
    };
  };
  return view;
};
    }
  };
});
cui.module(1, function(/* parent */){
  return {
    'id': 'lib/index',
    'pkg': arguments[0],
    'wrapper': function(module, exports, global, Buffer,process, require, undefined){
      exports.canvasize = require('./canvasize');
exports.animation = require('./animation');
exports.util = require('./util');
exports.image = require('./image');
exports.label = require('./label');
exports.layouts = require('./layouts');
exports.rectangle = require('./rectangle');
exports.view = require('./view');
exports.terminal = require('./terminal');
exports.button = require('./button');
    }
  };
});
if(typeof module != 'undefined' && module.exports ){
  module.exports = cui;
  if( !module.parent ){
    cui.main();
  }
};