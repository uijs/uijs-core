var UI = require('uijs');
var constant = UI.util.constant;
var derive = UI.util.derive;
var animate = UI.animation;

var app = UI.app({
  layout: UI.layouts.dock({ padding: constant(0) }),
  children: [
    UI.view({
      id: constant('#frame'),
      layout: UI.layouts.dock(),
      dockStyle: constant('top'),
      fillStyle: constant('gray'),
      height: constant(65),
      children: [
        UI.button({
          font: constant('x-large Doppio One'),
          id: constant('#clickme'),
          dockStyle: constant('top'),
          height: animate(0, 50),
          // height: constant(100),
          text: constant('click me'),
          shadowOffsetX: constant(5),
          shadowOffsetY: constant(5),
          shadowColor: constant('rgba(0,0,0,0.5)'),
          shadowBlur: constant(5),
          highlighted: {
            text: function() {
              return 'x=' + this.x()
            },
            // textFillStyle: constant('red'),
            shadowOffsetX: constant(0),
            shadowOffsetY: constant(0),
            x: function() { return this.base.x() + 5; },
            y: function() { return this.base.y() + 5; },
          },
        }),
      ],
    }),
    UI.terminal({
      dockStyle: constant('fill'),
      height: constant(100),
    }),
  ],
});

app.query('#clickme').add(UI.image({
  imagesrc: constant('34-coffee.png'),
  dockStyle: constant('left'),
}));

module.exports = app;
