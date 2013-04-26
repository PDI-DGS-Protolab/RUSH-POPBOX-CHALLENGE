var http = require('http');
var url = require('url');


http.createServer(function (clientReq, clientRes) {

  var clientData = '';

  clientReq.on('data', function(chunk) {
    clientData += chunk;
  });

  clientReq.on('end', function () {

    //Headers required by the browser
    clientRes.setHeader('Access-Control-Allow-Origin', '*');
    if (clientReq.headers['access-control-request-headers']) {  //OPTIONS
      clientRes.setHeader('Access-Control-Allow-Headers', clientReq.headers['access-control-request-headers']);
    }

    if(clientReq.headers['relayer-host']) {

      var options = url.parse(clientReq.headers['relayer-host']);
      options.method = clientReq.method;

      //Set headers
      options.headers = clientReq.headers;
      delete options.headers['relayer-host'];

      console.log(options);

      var serverReq = http.request(options, function(serverRes) {
        var newData = '';

        serverRes.on('data', function(chunk) {
          newData += chunk;
        });

        serverRes.on('end', function() {
          clientRes.end(newData);
        });
      });

      serverReq.end(clientData);

    } else {
      clientRes.end();
    }
  });

}).listen(2001, 'localhost');