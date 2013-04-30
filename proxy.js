var http = require('http');
var url = require('url');
var express = require('express');
var path = require('path');


var proxy = function(clientReq, clientRes) {
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

    var serverReq = http.request(options, function(serverRes){
      serverRes.pipe(clientRes, { end: true });
    });

    clientReq.pipe(serverReq, { end: true });

    clientReq.connection.addListener('close', function () {
      serverReq.abort();
    });

  } else {
    clientRes.end();
  }
};

var server = express();
server.port = 2001;

//Config URL
server.all('/proxy', proxy);
server.use('/', express.static(path.dirname(module.filename)));

//Start server
server.listen(server.port);

process.on('uncaughtException', function onUncaughtException(err) {
  console.log('Uncaught Exception: ' + err);
});