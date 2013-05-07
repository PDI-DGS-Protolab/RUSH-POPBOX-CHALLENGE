//AUXILIARY FUNCTIONS
// Array Remove - By John Resig (MIT Licensed)
Array.prototype.remove = function(from, to) {
  var rest = this.slice((to || from) + 1 || this.length);
  this.length = from < 0 ? this.length + from : from;
  return this.push.apply(this, rest);
};

//UUID generator
function s4() {
  return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
};

function guid() {
  return s4() + s4() + '' + s4() + '' + s4() + '' +
      s4() + '' + s4() + s4() + s4();
}

function sendRequestThroughProxy(url, method, headers, content, callback) {

  try {

    var proxyURL = 'http://' + location.host + '/' + url;
    var req = new XMLHttpRequest();

    req.open(method, proxyURL, true);

    //Set headers
    for (var head in headers) {
      req.setRequestHeader(head, headers[head]);
    }

    if (callback) {
      req.onload = callback.bind({}, req);
    }

    req.send(content);

  }catch (e) {
    console.log(e);
  }
}

function sendRushRequest() {

  var rushPah = 'rush';
  var textAreaURLs = document.getElementById('textAreaURLs');
  var inputQueues = document.getElementById('inputQueues');
  var urls = textAreaURLs.value.split('\n');
  var queuesObj = [];
  var topic = {};
  var queues = inputQueues.value.split(',');
  var total = 0, completed = 0, errored = 0;

  //Get queue name
  for (var i = 0; i < queues.length; i++){
    var queueWithoutSpaces = queues[i].split(' ').join('');
    queuesObj.push({id: queueWithoutSpaces});
  }

  topic.queues = queuesObj;
  topic.errorQueue = uuid;

  //Hide alert Rush
  $('#alertRush').addClass('hidden');

  //One Request by URL
  for (var i = 0; i < urls.length; i++) {

    var headers = {};

    headers['x-relayer-host'] = urls[i] + '#' + Math.random();  //Avoid cache
    headers['x-relayer-encoding'] = 'base64';
    headers['x-relayer-topic'] = JSON.stringify(topic);

    var callback = function(url, queues, req) {

      var parsed = JSON.parse(req.responseText);
      total++;

      if (parsed.ok === true) {
        completed++;
      } else {
        errored++;
        insertError(url, queues, parsed.errors.pop());
      }

      if (total === urls.length) {
        $('#sendReqBtnRush').button('reset');
        $('#alertRush').removeClass('hidden');
        $('#alertRushCompleted').text('Completed: ' + completed);
        $('#alertRushErrored').text('Errored: ' + errored);
      }
    }.bind({}, urls[i], inputQueues.value);

    sendRequestThroughProxy(rushPah, 'GET', headers, '', callback);
  }

  $('#sendReqBtnRush').button('loading');
  textAreaURLs.value = '';
  inputQueues.value = '';

}

function createDivForQueue(queueID, subscribe, socket) {

  var div = document.getElementById('queue' + queueID);
  var btn;
  var h2;

  //If the div element does not exist, it's created
  if (!div) {
    div = document.createElement('div');
    div.setAttribute('id', 'queue' + queueID);
    div.setAttribute('class', 'hero-unit hidden');
    div.setAttribute('style', 'padding: 20px;')

    h2 = document.createElement('h2');
    h2.setAttribute('id', 'queue' + queueID + 'text')
    //h2.appendChild(document.createTextNode('Queue ' + queueID));

    btn = document.createElement('button');
    btn.setAttribute('id', 'unsubscribe' + queueID);
    btn.setAttribute('type', 'button');
    btn.setAttribute('class', 'close hidden');
    btn.setAttribute('aria-hidden', 'true');
    btn.appendChild(document.createTextNode('Unsubscribe'));

    div.appendChild(btn);
    div.appendChild(h2);
    document.getElementById('picturesDiv').appendChild(div);
  } else {
    btn = document.getElementById('unsubscribe' + queueID);
    h2 = document.getElementById('queue' + queueID + 'text');
  }

  if (h2.firstChild) {
    h2.removeChild(h2.firstChild);
  }

  if (subscribe) {

    if (socket) {
      h2.appendChild(document.createTextNode('Queue ' + queueID + ' (WebSockets)'));
      btn.onclick = function() {
        socket.disconnect();
        $('#unsubscribe' + queueID).addClass('hidden');
      }
    } else {
      h2.appendChild(document.createTextNode('Queue ' + queueID + ' (Recursive Pop)'));
      btn.onclick = function() {
        subscriptionsToBeClosed.push(queueID);
        $('#unsubscribe' + queueID).addClass('hidden');
      }
    }

    $('#queue' + queueID).removeClass('hidden');
    $('#unsubscribe' + queueID).removeClass('hidden');
  } else {
    h2.appendChild(document.createTextNode('Queue ' + queueID + ' (Pop)'));
  }

  return div;

}

function insertImageInDiv(div, data) {
  var link = document.createElement('a');
  var img = document.createElement("img");

  //Link
  link.setAttribute('href', 'data:image/png;base64,' + data);
  link.setAttribute('target', '_blank');

  //Image
  img.setAttribute('src', 'data:image/png;base64,' + data);
  img.setAttribute('style', 'height: 75px');
  img.setAttribute('alt', 'Your picture');

  link.appendChild(img);
  div.appendChild(link);
}

function sendPopBoxRequest(queueID, timeout, maxElements, subscribe, callback) {

  var popBoxPath;
  var headers = {};

  timeout = (subscribe) ? 60 : timeout;
  maxElements = (subscribe) ? 1 : maxElements;
  popBoxPath = 'popbox/queue/' + queueID + '/pop?timeout=' + timeout + '&max=' + maxElements;
  headers['accept'] = 'application/json';

  var div = createDivForQueue(queueID, subscribe);

  var callbackHTTP = function(req) {

    var receivedData = JSON.parse(req.responseText);

    if (receivedData.data.length > 0) {

      $('#queue' + queueID).removeClass('hidden');

      for (var i = 0; i < receivedData.data.length; i++) {
        insertImageInDiv(div, receivedData.data[i]);
      }

    } else {
      if (!subscribe) {
        $('#noTransPopBoxModal').modal('show');
      }
    }

    if (callback) {
      callback();
    }

    var indexOfQueue = subscriptionsToBeClosed.indexOf(queueID);
    if (subscribe && indexOfQueue === -1) {
      sendPopBoxRequest(queueID, timeout, maxElements, subscribe);
    } else if (subscribe) {
      subscriptionsToBeClosed.remove(indexOfQueue, indexOfQueue);
    }
  }

  sendRequestThroughProxy(popBoxPath, 'POST', headers, '', callbackHTTP);
}

function resetPopBoxFileds() {
  var queueInput = document.getElementById('inputQueue');
  var maxElementsInput = document.getElementById('inputMaxElements');
  var timeoutInput =  document.getElementById('inputTimeout');

  queueInput.value = '';
  maxElementsInput.value = '';
  timeoutInput.value = '';

  //Reset Method
  $('input[id="optionsRadiosPop"]').prop('checked', true);
  $('input[id="optionsRadiosSubscribe"]').prop('checked', false);
  $('input[id="optionsRadiosWebSockets"]').prop('checked', false);
}

function pop() {

  var queueInput = document.getElementById('inputQueue');
  var queueID = queueInput.value;
  var maxElementsInput = document.getElementById('inputMaxElements');
  var maxElements = maxElementsInput.value || 1000;
  var timeoutInput =  document.getElementById('inputTimeout');
  var timeout = timeoutInput.value || 0;

  $('#popBtn').button('loading');
  resetPopBoxFileds();

  var callback = function() {
    $('#popBtn').button('reset');
  }

  sendPopBoxRequest(queueID, timeout, maxElements, false, callback);
}

function subscribe() {

  var queueInput = document.getElementById('inputQueue');
  var queueID = queueInput.value;

  resetPopBoxFileds();

  sendPopBoxRequest(queueID, 60, 1, true);
}

function webSockets() {

  var queueInput = document.getElementById('inputQueue');
  var queueID = queueInput.value;

  resetPopBoxFileds();

  var socket = io.connect('http://' + location.hostname + ':5001', {'force new connection': true});
  var div = createDivForQueue(queueID, true, socket);

  socket.on('connected', function(data){

    socket.emit('subscribe', queueID);

    socket.on('data', function(data) {
      insertImageInDiv(div, data.data.pop());
    });

  });
}

//Load URLS from a file
function handleFileSelect(evt) {
  var files = evt.target.files; // FileList object

  // Loop through the FileList and show file content in the text area
  for (var i = 0, f; f = files[i]; i++) {

    var reader = new FileReader();

    // Closure to capture the file information.
    reader.onload = (function(theFile) {
      return function(e) {
        var textAreaURLs = document.getElementById('textAreaURLs');
        textAreaURLs.value += e.target.result;
      };
    })(f);

    // Read the file as text
    reader.readAsText(f);

    //Show the file that has been read
    $('#filePath').text(f.name);
  }
}

function insertError(dir, queues, errorMsg) {

  var tableRow = document.createElement("tr");
  tableRow.setAttribute('class', 'error');
  var directionTd = document.createElement("td");
  directionTd.appendChild(document.createTextNode(dir));
  var queuesTd = document.createElement("td");
  queuesTd.appendChild(document.createTextNode(queues));
  var errorTd = document.createElement("td");
  errorTd.appendChild(document.createTextNode(errorMsg));

  tableRow.appendChild(directionTd);
  tableRow.appendChild(queuesTd);
  tableRow.appendChild(errorTd);

  document.getElementById("errorsTable").appendChild(tableRow);

}

//Load Rush errors from PopBox
function getErrors() {

  var popBoxErrorsPath = 'popbox/queue/RushErrors' + uuid + '/pop?timeout=60';
  var headers = {};
  headers['accept'] = 'application/json';

  var callback = function(req) {

    var errors = JSON.parse(req.responseText);

    if (errors.data.length > 0) {

      $('#errorModal').modal('show');

      for (var i = 0; i < errors.data.length; i++) {

        var error = JSON.parse(errors.data[i]);
        var queuesTxt = '';
        var queues = error.queues;
        var errorMsg;
        var direction;

        for (var i = 0; i < queues.length; i++) {

          queuesTxt += queues[i].id;

          if (i !== queues.length - 1) {
            queuesTxt += ', ';
          }
        }

        if (error.statusCode) {
          errorMsg = error.statusCode + ' - ' + error.errorMsg;
        } else {
          errorMsg = error.errorMsg;
        }

        var indexSharp = error.dir.lastIndexOf('#');
        direction = error.dir.substring(0, indexSharp);

        insertError(direction, queuesTxt, errorMsg);
      }
    }

    //Subscribe again
    setTimeout(getErrors, 0);
  }

  sendRequestThroughProxy(popBoxErrorsPath, 'POST', headers, '', callback);
}

//MAIN SCRIPT
var iosocket;       //Socket.IO (necessary to reconnect)
var uuid = guid();  //Error queue ID
getErrors();        //Subscribe to error events

//Adapt Upload URLs Button
$('#uploadURLsBtn').on('click', function() {
  $('#fileURLsInput').click();
});

//Load URLs from a file
document.getElementById('fileURLsInput').addEventListener('change', handleFileSelect, false);

//Rush form action on submit
$('#rushForm').on('submit', function() {
  try {
    sendRushRequest();
  } catch (e) {
    console.log(e);
  } finally {
    return false;
  }

});

//PopBox form action on submit
$('#popBoxForm').on('submit', function(ev) {

  var method = $("input[name='methodRadios']:checked").val();

  try {
    if (method === 'subscribe') {
      subscribe();
    } else if (method === 'pop') {
      pop();
    } else if (method === 'webSockets') {
      webSockets();
    }
  } catch (e) {
    console.log(e);
  }




  return false;
});

//Subscriptions to be closed
var subscriptionsToBeClosed = [];

//Check Errors Button action on click
$('#checkErrorsBtn').on('click', function() {
  $('#errosListTab').addClass('active');
  $('#aboutTab').removeClass('active');
  $('#sendReqTab').removeClass('active');
  $('#getContentTab').removeClass('active');
});