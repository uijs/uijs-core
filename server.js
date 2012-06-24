var http = require('http');
var fs = require('fs');
var path = require('path');

var server = http.createServer(function(req, res) {
    var fp = path.join(__dirname, req.url);
    console.log(fp);
    var file = fs.createReadStream(fp);
    file.on('error', function(err) {
        res.writeHead(404);
        return res.end();
    });
    return file.pipe(res);
});
server.listen(3000);
