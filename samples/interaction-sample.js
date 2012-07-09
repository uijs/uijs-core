var uijs = require('uijs');
var box = uijs.box;
var c = uijs.util.constant;
var defaults = uijs.util.defaults;
var html = uijs.html;
var positioning = uijs.positioning;

function rect(options) {
  options = defaults(options, {
    color: c('white'),
    label: c(false),
  });

  var obj = box(options);

  var is_touching = false;
  var points = [];
  var marker_delta = Math.round(Math.random() * 100) % 10 - 5;

  obj.touching = function() {
    return is_touching;
  };

  obj.ondraw = function(ctx) {
    ctx.fillStyle = this.color();
    ctx.shadowBlur = 20.0;
    ctx.shadowColor = 'black';
    ctx.fillRect(0,0,this.width(),this.height());

    if (this.label()) {
      ctx.fillStyle = 'black';
      ctx.shadowBlur = 0;
      ctx.fillText(this.label(), 20, 20);
    }

    if (this.touching()) {
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 3.0;
      ctx.strokeRect(0, 0, this.width(), this.height());
    }

    ctx.fillStyle = 'black';

    if (points.length > 0) {
      var lastpt = points[points.length - 1];

      if (is_touching) {
        ctx.fillStyle = this.color();
        ctx.fillRect(lastpt.x + marker_delta, lastpt.y + marker_delta, 10, 10);

        ctx.beginPath();
        ctx.moveTo(lastpt.x, lastpt.y);
        for (var i = points.length - 1; i >= 0; i--) {
          var pt = points[i];
          if (!pt) continue;
          ctx.lineTo(pt.x, pt.y, 5, 5);
        }

        ctx.lineWidth = 5.0;
        ctx.globalAlpha = 0.2;
        ctx.stroke();
      }
    }
  };

  function addpt(pt) {
    if (!pt || !pt.x || !pt.y) return;
    points.push(pt);
    if (points.length > 10) points.shift();
  }

  obj.on('touchstart', function(pt) {
    is_touching = true;
    addpt(pt);
    this.startCapture();
  });

  obj.on('touchmove', function(pt) {
    addpt(pt);
  });

  obj.on('touchend', function(pt) {
    addpt(pt);
    is_touching = false;
    this.stopCapture();
    points = [];
  });

  return obj;
}

var app = rect();

var with_capture = app.add(rect({
  id: c('#anchor1'),
  x: c(50),
  y: c(50),
  width: c(300),
  height: c(400),
  color: c('#BF0C43'),
  interaction: c(true),
  label: c('interaction=true'),
}));

with_capture.add(rect({
  x: c(50),
  y: c(50),
  width: c(100),
  height: c(100),
  color: c('#127A97'),
  interaction: c(true),
  label: c('child+interaction'),
}));

var without_capture = app.add(rect({
  x: c(100),
  y: c(250),
  width: c(350),
  height: c(100),
  color: c('#F9BA15'),
  interaction: c(false),
  label: c('interaction = false (see through)'),
}));

var noprop = app.add(rect({
  id: c('#anchor2'),
  x: c(250),
  y: c(100),
  width: c(300),
  height: c(100),
  color: c('#8EAC00'),
  interaction: c(true),
  autopropagate: c(false),
  label: c('interaction = true, autopropagate = false'),
}));

noprop.add(rect({
  color: c('#452B72'),
  x: c(20),
  y: c(50),
  width: c(150),
  height: c(30),

}));

var help = app.add(html({
  x: positioning.relative('#anchor2').right(100),
  y: positioning.relative('#anchor1').top(),
  width: c(500),
  height: c(800),
}));

help.onload = function(container) {
  container.innerHTML = [
    '<h3>Touch Interaction</h3>',
    '<h4>The <code>interaction</code> attribute</h4>',
    '<p>When you touch a box, the <code>interaction</code> attribute determine which box receives events via <code>box.on("touchxxx")</code>.</p>',
    '<ul>',
    '<li>The <strong>pink box</strong> has <code>interaction</code> and <code>autopropagate</code> which means that any touches on it will be captures and if',
    'a child is hit (the blue box), it will also receive interaction events. You can see that when you click on the <strong>blue box</strong>, there are three boxes',
    'that receive events: the app, the pink box and the blue box</li>',
    '<li>The <strong>green box</strong> is a sibling of the pink one and it also has <code>interaction</code>. Since it covers it (physically), when it is',
    'touched in common areas, it will "hide" the events from the pink box</li>',
    '<li>The <strong>orange box</strong> does not have <code>interaction</code> enabled and therefore it is basically transparent, so touches just pass through it</li>',
    '</ul>',
    '<h4>The <code>autopropagate</code> attribute</h4>',
    '<p>This attribute determines if a box propagates touch events to child boxes automatically, or an explicit call to <code>box.propagate()</code> is needed.',
    'This allows boxes to control how child boxes receive events.</p>',
    '<p>The <strong>purple box</strong> is a child of the <strong>green box</strong> which has <code>autopropagate</code> set to <code>false</code>.',
    'This means that even when the purple box is hit, events are not propagated.</p>',
    '<h4><code>box.startCapture()</code> and <code>box.stopCapture()</code></h4>',
    '<p>If <code>box.startCapture()</code> is called, all events will be propagated to it until <code>stopCapture()</code> is called.</p>',
    '<p>Boxes in this demo capture events between <code>touchstart</code> and <code>touchend</code>. You can see a little rectangle colored like the',
    'box whenever a box captures the events. Touch a box and move outside of its bounds and you can see the markers. The box\'s border will also remain',
    'in effect as long as the box as the capture.</p>',
  ].join('\n');
};

module.exports = app;