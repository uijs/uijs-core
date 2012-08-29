var demostack = require('./lib/demostack');
var uijs = require('uijs');
var box = uijs.box;
var bind = uijs.bind;

var app = demostack();

var b1 = box({
  title: 'ThIs is the title of the demo box',
  height: 130,
});

var b2 = box({
  clip: true,
  title: 'ThE crazy snake',
  height: bind(function() { return this.parent.height - this.y; }),
  dropVelocity: -3.8,
  points: [],
  touching: false,
  invalidators: ['points', 'touching'],
});

app.add(b1);
app.add(b2);
b1.onCalculate = function (){

}

b1.onSetContext = function(ctx){
  ctx.fillStyle = 'black';
}

b1.ondraw = function(ctx) {
  ctx.fillText('This is demo box number 1. There are no options for it', 10, 20);
};

var palette = [
  '#BF0C43',
  '#F9BA15',
  '#8EAC00',
  '#127A97',
  '#452B72',
];

var total_points = 0;
var touch_end = 0;
var points_to_keep = 50;

b2.onCalculate = function (){

}

b2.onSetContext = function(ctx){
  ctx.lineCap = 'butt';
  ctx.lineWidth = 10;
}

b2.ondraw = function(ctx) {
  var self = this;
  var points = self.points;
  if (points.length === 0) return;
  
  var alpha = 0.0;
  dt = (Date.now() - touch_end) / 1000.0;

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  var keep_drawing = false;
  points.forEach(function(pt, i) {
    if (i === 0) return;
    ctx.lineTo(pt.x, pt.y);
    ctx.globalAlpha = alpha;
    alpha += 0.1;
    ctx.strokeStyle = pt.color;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    if (!self.touching) {
      pt.y = (points.length - i - self.dropVelocity) + pt.y + 12.8 * dt * dt;
    }
    if(pt.y <= self.height){
      keep_drawing = true;
    }
  });
  if(keep_drawing){
    self.points = points.concat(); // to keep the control invalid
  }
};

b2.on('touchstart', function() {
  b2.touching = true;
  touch_end = 0;
  b2.points = [];
  this.startCapture();
});

b2.on('touchmove', function(pt) {
  if (!b2.touching) return;
  b2.points.push({
    x: pt.x,
    y: pt.y,
    color: palette[(total_points++) % palette.length]
  });
  if (b2.points.length > points_to_keep) b2.points.shift();
  b2.points = b2.points.concat(); // to invalidate the box
});

b2.on('touchend', function() {
  b2.touching = false;
  touch_end = Date.now();
  this.stopCapture();
});

b2.onoptions = function(container) {
  container.innerHTML = [
    '<h1>Options for the crazy snake demo</h1>',
    '<label>Drop velocity:</label>',
    '<input id="velo" type="input" value="' + b2.dropVelocity + '"><br>',
    '<label>Number of points:</label>',
    '<input id="points" type="input" value="' + points_to_keep + '"><br>',
    '<button id="apply">Apply</button>',
  ].join('\n');

  document.getElementById('apply').onclick = function() {
    var v = document.getElementById('velo').value;
    var pts = document.getElementById('points').value;
    b2.dropVelocity = v;
    points_to_keep = parseInt(pts);
    app.closeOptions();
  };
}

module.exports = app;
