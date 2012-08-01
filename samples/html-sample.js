var uijs = require('uijs');
var box = uijs.box;
var positioning = uijs.positioning;
var animate = uijs.animation;
var bind = uijs.bind;

var html = uijs.html;

// the `color` attribute is a function that returns
// the color based on the current HTML <option> selection.
var app = box({ 
  color: bind(app, 'color', function() {
    var sel = document.getElementById('color');

    // since the inner DOM is not loaded immediately, we must
    // be ready to `sel` to be null.
    if (!sel) return 'red';

    return sel.options[sel.selectedIndex].value;
  }),
});

app.ondraw = function(ctx) {
  // just fill with `color()`.
  ctx.fillStyle = this.color;
  ctx.fillRect(0,0,this.width, this.height);
};

// This is where we add the `html` box. Pretty much self explainatory.
var htmlBox = html({
  html: '<h1>select color!</h1>',
  onload: function(container) {
    container.innerHTML += [
      '<select id="color">',
      '<option value="red">Red</option>',
      '<option value="green">Green</option>',
      '<option value="blue">Blue</option>',
      '<option value="cyan">Cyan</option>',
      '</select>',
      '<button id="butt">Click me!</button>',
    ].join('\n');

    var butt = document.getElementById('butt');
    butt.onclick = function() {
      alert('you clicked me man!')
    };
  },
  x: bind(htmlBox, 'x', animate(0, 200, {duration:1000})),
  y: bind(htmlBox, 'y', animate(0, 100, {duration:1000})),
  width: 200,
  height: 200,
});

app.add(htmlBox);


module.exports = app;
