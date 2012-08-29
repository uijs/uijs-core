var uijs = require('uijs');
var positioning = uijs.positioning;
var defaults = uijs.util.defaults;
var box = uijs.box;
var override = uijs.util.override;
var html = uijs.html;
var animate = uijs.animation;
var bind = uijs.bind;

function label(options) {
  var obj = box(defaults(options, {
    title: false,
    lineHeight: 1,
    height: 30,
    backgroundColor: '#0191C8',
    width: bind(positioning.parent.width()), 
  }));
  obj._is_adornment = true;
  obj.onCalculate = function (){

  }

  obj.onSetContext = function(ctx){
    
  }

  obj.ondraw = function(ctx) {

    var lineHeight = this.lineHeight;

    ctx.fillStyle = this.backgroundColor;
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'black';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.shadowBlur = 0;

    ctx.font = '16px Helvetica';
    ctx.fillStyle = 'black';

    if (this.title) {
      ctx.fillText(this.title, 10, 20 + lineHeight);
    }
  };
  return obj;
}

module.exports = function(options) {
  options = defaults(options, {
    backgroundColor: '#005B9A',
  });
  
  var obj = box(options);
  obj.x = 0;
  obj.y = 0;
  obj.bind('width', positioning.parent.width());
  obj.bind('height', positioning.parent.height());

  var content = obj.add(box({
    x: 0,
    y: 0,
    width: bind(positioning.parent.width()),
    height: bind(positioning.parent.height()),
  }));

  var options_box = obj.add(html({
    x: bind(positioning.parent.centerx()),
    y: bind(positioning.parent.centery()),
    width: 0,
    height: 0,
  }));

  options_box.onCalculate = function (){

  }

  options_box.onSetContext = function(ctx){
    ctx.fillStyle = 'white';
    ctx.shadowBlur = 20;
    ctx.shadowColor = 'black';
  }

  options_box.ondraw = function(ctx) {
    ctx.fillRect(0, 0, this.width, this.height);
  };

  options_box.onload = function(c) {
    c.style.padding = 10;
  };

  obj.closeOptions = function() {
    var currw = options_box.width;
    var currh = options_box.height;
    options_box.bind('width', animate(currw, 0));
    options_box.bind('height', animate(currh, 0));
  };

  content.onCalculate = function (){

  }

  content.onSetContext = function(ctx){
    ctx.fillStyle = 'white';
  }

  content.ondraw = function(ctx) {
    ctx.fillRect(0, 0, this.width, this.height);
  };

  obj.add = function(child) {

    var children = content.all();
    var last = children[children.length - 1];
    if (last) last.remove();

    var titlebar = content.add(label({
      y: bind(positioning.prev.bottom()),
      title: child.title || 'child has no `title` attribute',
    }));

    var options_button = titlebar.add(html({
      html: '<button>Options</button>',
      x: bind(positioning.parent.right(-65)),
      y: 4,
      width: 60,
      height: 22,
    }));

    options_button.onload = function(container) {
      var button = container.firstChild;
      button.style.width = '100%';
      button.style.height = '100%';
      button.onclick = function() {
        if (!child.onoptions) {
          alert('No options for this demo. Define `onoptions(box)` and set `box.innerHTML`');
          return;
        }

        options_box.bind('width', animate(0, options_box.parent.width * 0.5));
        options_box.bind('height', animate(0, options_box.parent.height * 0.8));
        child.onoptions(options_box.container);
      };
    };

    child.bind('width', positioning.parent.width());
    child.bind('y', positioning.prev.bottom());
    var ret = content.add(child);

    var contentToAdd = label({
      y: bind(positioning.prev.bottom()),
      height: bind(function() { return content.parent.height - content.y; }),
    })

    content.add(contentToAdd);

    return child;
  };

  obj.onCalculate = function (){

  }

  obj.onSetContext = function(ctx){
    ctx.fillStyle = this.backgroundColor;
  }

  obj.ondraw = function(ctx) {
    ctx.fillRect(0, 0, this.width, this.height);
  };

  return obj;
};