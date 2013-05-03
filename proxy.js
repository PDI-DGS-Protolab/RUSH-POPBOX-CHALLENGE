var http = require('http');
var urlModule = require('url');
var express = require('express');
var path = require('path');

var POPBOX_PATH = '/popbox';
var RUSH_PATH = '/rush';

var proxy = function(url, clientReq, clientRes) {

  var callback;

  //Headers required by the browser
  clientRes.setHeader('Access-Control-Allow-Origin', '*');

  if (clientReq.method === 'OPTIONS') {

    clientRes.setHeader('Access-Control-Allow-Headers', clientReq.headers['access-control-request-headers']);
    clientRes.end();

  } else {

    var options = urlModule.parse(url);
    options.method = clientReq.method;

    //Set headers
    options.headers = clientReq.headers;
    delete options.headers['relayer-host'];

    var serverReq = http.request(options, function(serverRes){
      serverRes.pipe(clientRes, { end: true });

      serverRes.on('end', function() {
        clientReq.connection.removeListener('close', callback);
      })
    });

    clientReq.pipe(serverReq, { end: true });

    callback = function() {
      serverReq.abort();
      clientReq.connection.removeListener('close', callback);
    }

    clientReq.connection.addListener('close', callback);
  }
};

var popbox = function(clientReq, clientRes) {
  var path = clientReq.url.replace(POPBOX_PATH, '');
  var url = 'http://localhost:5001' + path;
  proxy(url, clientReq, clientRes);
}

var rush = function(clientReq, clientRes) {
  var url = 'http://localhost:3001';
  proxy(url, clientReq, clientRes);
}

var server = express();
server.port = 2001;

//Config URL
server.all(POPBOX_PATH + '*', popbox);
server.all(RUSH_PATH + '*', rush);
server.use('/', express.static(path.dirname(module.filename)));

//Start server
server.listen(server.port);

process.on('uncaughtException', function onUncaughtException(err) {
  console.log(err);
});