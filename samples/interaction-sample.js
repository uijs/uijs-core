var uijs = require('uijs');
var box = uijs.box;
var defaults = uijs.util.defaults;
var html = uijs.html;
var positioning = uijs.positioning;
var bind = uijs.bind;

function rect(options) {
  options = defaults(options, {
    color: 'white',
    label: false,
    touching: false,
    points: [],
  });

  var obj = box(options);

  var marker_delta = Math.round(Math.random() * 100) % 10 - 5;

  obj.ondraw = function(ctx) {
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 20.0;
    ctx.shadowColor = 'black';
    ctx.fillRect(0,0,this.width,this.height);

    ctx.fillStyle = 'black';
    ctx.fillText(this._id, 3, this.height - 3);

    if (this.label) {
      ctx.fillStyle = 'black';
      ctx.shadowBlur = 0;
      ctx.fillText(this.label, 20, 20);
    }

    if (this.touching) {
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 3.0;
      ctx.strokeRect(0, 0, this.width, this.height);
    }

    ctx.fillStyle = 'black';

    if (this.points.length > 0) {
      var lastpt = this.points[this.points.length - 1];

      if (this.touching) {
        ctx.fillStyle = this.color;
        ctx.fillRect(lastpt.x + marker_delta, lastpt.y + marker_delta, 10, 10);

        ctx.beginPath();
        ctx.moveTo(lastpt.x, lastpt.y);
        for (var i = this.points.length - 1; i >= 0; i--) {
          var pt = this.points[i];
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
    this.points.push(pt);
    if (this.points.length > 10) this.points.shift();
  }

  obj.on('touchstart', function(pt) {
    this.touching = true;
    addpt.call(this, pt);
    this.startCapture();
  });

  obj.on('touchmove', function(pt) {
    addpt.call(this, pt);
  });

  obj.on('touchend', function(pt) {
    addpt.call(this, pt);
    this.touching = false;
    this.stopCapture();
    this.points = [];
  });

  return obj;
}

var app = rect();

var with_capture = app.add(rect({
  id: '#anchor1',
  x: 50,
  y: 50,
  width: 300,
  height: 400,
  color: '#BF0C43',
  interaction: true,
  label: 'interaction=true',
}));

with_capture.add(rect({
  x: 50,
  y: 50,
  width: 100,
  height: 100,
  color: '#127A97',
  interaction: true,
  label: 'child+interaction',
}));

var without_capture = app.add(rect({
  x: 100,
  y: 250,
  width: 350,
  height: 100,
  color: '#F9BA15',
  interaction: false,
  label: 'interaction = false (see through)',
}));

var noprop = app.add(rect({
  id: '#anchor2',
  x: 250,
  y: 100,
  width: 300,
  height: 100,
  color: '#8EAC00',
  interaction: true,
  autopropagate: false,
  label: 'interaction = true, autopropagate = false',
}));

noprop.add(rect({
  color: '#452B72',
  x: 20,
  y: 50,
  width: 150,
  height: 30,

}));

var help = app.add(html({
  x: bind(positioning.relative('#anchor2').right(100)),
  y: bind(positioning.relative('#anchor1').top()),
  width: 500,
  height: 800,
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

app.on('touchstart', function(e) {
  boxes = app.hittest(e);
  console.log('hit boxes:', Object.keys(boxes));
});

module.exports = app;