//Copyright 2012 Telefonica Investigación y Desarrollo, S.A.U
//
//This file is part of RUSH.
//
//  RUSH is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
//  RUSH is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.
//
//  You should have received a copy of the GNU Affero General Public License along with RUSH
//  . If not, seehttp://www.gnu.org/licenses/.
//
//For those usages not covered by the GNU Affero General Public License please contact with::dtc_support@tid.es

var MG = require('./myGlobals').C;

var path = require('path');
var log = require('PDITCLogger');
var http = require('http');
var logger = log.newLogger();
logger.prefix = path.basename(module.filename, '.js');

Array.prototype.remove = function(from, to) {
  var rest = this.slice((to || from) + 1 || this.length);
  this.length = from < 0 ? this.length + from : from;
  return this.push.apply(this, rest);
};

function sendReq(trans) {

  var options = {
    port: 5001,
    host: 'localhost',
    path: '/trans',
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json'
    }
  };

  var req = http.request(options, function(res) {

    var data = ''; //returned object from request
    res.setEncoding('utf8');

    res.on('data', function(chunk) {
      data += chunk;
    });

    res.on('end', function() {
      logger.info('onPopBoxReq', data)
    });
  });

  req.on('error', function(e) {
    logger.warning('onPopBoxReq', err);
  });

  var transStr = JSON.stringify(trans);
  req.end(transStr);

}


function init(emitter) {
  'use strict';
  return function(callback) {
    emitter.on(MG.EVENT_NEWSTATE, function onNewEvent(data) {

      var trans =  {
        'priority': 'L',
        'expirationDate': Math.round(new Date().getTime() / 1000 + 3600)
      };

      var queues = JSON.parse(data.topic);
      var queueErrorID;

      for (var i = 0; i < queues.length; i++) {
        if (queues[i].errorID) {
          queueErrorID = queues[i].errorID;
          queues.remove(i, i);
        }
      }

      if (data.state === MG.STATE_COMPLETED) {

        var encoding = data.result.encoding;
        var message = data.result.body;

        trans.payload = message;
        trans.encoding = encoding;
        trans.queue = queues;

        sendReq(trans);


      } else if (data.state === MG.STATE_ERROR) {

        var result = {};
        result.dir = data.task.headers[MG.HEAD_RELAYER_HOST];
        result.queues = queues;
        result.statusCode = data.result.statusCode;
        result.errorMsg = data.result.error;

        trans.payload = JSON.stringify(result);
        trans.queue = [{id: 'RushErrors' + queueErrorID}];

        sendReq(trans);
      }
    });

    callback(null, 'ev_popbox OK');
  };
}

exports.init = init;

require('./hookLogger.js').init(exports, logger);