var uijs = require('uijs');
var box = uijs.box;

var app = box();

var iphone = box({
    x: 5, 
    y: 5,
    width: 320 - 10,
    height: 480 - 20 - 10,
});

iphone.ondraw = function(ctx) {
    ctx.fillStyle = 'red';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.strokeStyle = 'black';
    ctx.strokeRect(0, 0, this.width, this.height);
};

app.add(iphone);

module.exports = app;
