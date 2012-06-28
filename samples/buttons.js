var UI = require('uijs');
var constant = UI.util.constant;
var derive = UI.util.derive;
var animate = UI.animation;

var app = UI.app({
  layout: UI.layouts.dock({ padding: constant(10), spacing: constant(10) }),
  fillStyle: constant('white'),
  children: [
    UI.button({
      layout: UI.layouts.dock(),
      dockStyle: constant('top'),
      font: constant('x-large Doppio One'),
      id: constant('#clickme'),
      text: constant('click me'),
      children: [
        UI.image({
          width: constant(50),
          image: UI.util.loadimage('button-icon.png'),
          imageHorizontalAlign: constant('center'),
          dockStyle: constant('left'),
        })
      ]
    }),

    UI.terminal({
      dockStyle: constant('fill'),
      height: constant(100),
    }),
  ],
});

module.exports = app;
