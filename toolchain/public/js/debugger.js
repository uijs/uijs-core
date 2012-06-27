window.onload = function() {
  var socket = io.connect('http://localhost');
  var UI = require('cui');

  console.log(document.getElementById('canvas'));

  var canvas = UI.canvasize({
    element: document.getElementById('canvas'),
  });

  canvas.add(UI.rterm(socket));
  canvas.add(app);
};