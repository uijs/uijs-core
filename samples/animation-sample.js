var uijs = require('uijs');
var box = uijs.box;
var easing = uijs.easing;
var html = uijs.html;

var app = box();

var b = app.add(box({
    x: 0, y: 0, width: 20, height: 20,
}));

b.ondraw = function(ctx) {
  ctx.fillStyle = 'red';
  ctx.fillRect(0, 0, this.width, this.height);
};

var h = '<form><select id="combo">';
for (var k in easing) h += '<option name="' + k + '">' + k + '</option>';
h += '</select></form>';

var f = app.add(html({
  html: h,
  x: 10, y: 50,
  width: 200, height: 50,
}));

f.on('load', function(div) {
  var select = document.getElementById('combo');
  select.onchange = function(x) {
    b.animate({ x: 500 }, {
      duration: 5000,
      curve: easing[select.value],
      ondone: function() {
        console.log('...and back');
        b.animate({ x: 0 }, {
          duration: 500,
          curve: easing[select.value]
        });
      },
    });
  };
});


module.exports = app;