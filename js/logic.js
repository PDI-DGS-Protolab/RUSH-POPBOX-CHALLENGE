function sendReq(url, method, headers, content, callback) {

  var req;

  try {

    var proxyURL = "http://localhost:2001/proxy";

    req = new XMLHttpRequest();
    req.open(method, proxyURL, true);

    //Set headers
    req.setRequestHeader('relayer-host', url);
    for (var head in headers) {
      req.setRequestHeader(head, headers[head]);
    }

    if (callback) {
      req.onload = callback.bind({}, req);
    }
    req.send(content);

  }catch (e) {
    console.log('Error processing the URL ' + e);
  }
}

function sendRushRequest() {


  var proxyURL = 'http://localhost:3001'
  var textAreaURLs = document.getElementById('textAreaURLs');
  var inputQueues = document.getElementById('inputQueues');
  var urls = textAreaURLs.value.split('\n');
  var queuesObj = [];
  var queues = inputQueues.value.split(',');
  var total = 0, completed = 0, errored = 0;

  for (var i = 0; i < queues.length; i++){
    var queueWithoutSpaces = queues[i].split(' ').join('');
    queuesObj.push({id: queueWithoutSpaces});
  }

  for (var i = 0; i < urls.length; i++) {

    var headers = {};

    headers['x-relayer-host'] = urls[i] + '#' + Math.random();  //Avoid cache
    headers['x-relayer-encoding'] = 'base64';
    headers['x-relayer-topic'] = JSON.stringify(queuesObj);

    var callback = function(req) {
      var parsed = JSON.parse(req.responseText);

      total++;

      if (parsed.ok === true) {
        completed++;
      } else {
        errored++;
      }

      if (total === urls.length) {
        $('#sendReqBtnRush').button('reset');
        $('#alertRush').removeClass('hidden');
        $('#alertRushCompleted').text('Completed: ' + completed);
        $('#alertRushErrored').text('Errored: ' + errored);
      }
    }

    sendReq(proxyURL, 'GET', headers, '', callback);
  }

  $('#sendReqBtnRush').button('loading');
  textAreaURLs.value = '';
  inputQueues.value = '';

}

function sendPopBoxRequest(queueID, timeout, maxElements, subscribe, callback) {

  var url;
  var headers = {};
  timeout = (subscribe) ? 60 : timeout;
  maxElements = (subscribe) ? 1 : maxElements;
  url = 'http://localhost:5001/queue/' + queueID + '/pop?timeout=' + timeout + '&max=' + maxElements;
  headers['accept'] = 'application/json';

  console.log(url);

  var callbackHTTP = function(req) {

    var recData = JSON.parse(req.responseText);

    if (recData.data.length > 0) {

      for (var i = 0; i < recData.data.length; i++) {

        var div = document.getElementById('queue' + queueID);

        if (!div) {
          div = document.createElement('div');
          div.setAttribute('id', 'queue' + queueID);
          div.setAttribute('class', 'hero-unit');
          div.setAttribute('style', 'padding: 20px;')

          var h2 = document.createElement('h2');
          h2.appendChild(document.createTextNode('Queue ' + queueID));

          div.appendChild(h2);
          document.getElementById('picturesDiv').appendChild(div);
        }

        var link = document.createElement('a');
        var img = document.createElement("img");

        //Link
        link.setAttribute('href', 'data:image/png;base64,' + recData.data[i]);
        link.setAttribute('target', '_blank');

        //Image
        img.setAttribute('src', 'data:image/png;base64,' + recData.data[i]);
        img.setAttribute('style', 'height: 75px');
        img.setAttribute('alt', 'Your picture');

        link.appendChild(img);
        div.appendChild(link);
      }


    } else {
      if (!subscribe) {
        $('#noTransPopBoxModal').modal('show');
      }
    }

    if (callback) {
      callback();
    }

    if (subscribe) {
      sendPopBoxRequest(queueID, timeout, maxElements, subscribe);
    }

  }

  sendReq(url, 'POST', headers, '', callbackHTTP);
}

function resetPopBoxFileds() {
  var queueInput = document.getElementById('inputQueue');
  var maxElementsInput = document.getElementById('inputMaxElements');
  var timeoutInput =  document.getElementById('inputTimeout');

  queueInput.value = '';
  maxElementsInput.value = '';
  timeoutInput.value = '';
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

//Charge URLS from a file
function handleFileSelect(evt) {
  var files = evt.target.files; // FileList object

  // Loop through the FileList and render image files as thumbnails.
  for (var i = 0, f; f = files[i]; i++) {

    var reader = new FileReader();

    // Closure to capture the file information.
    reader.onload = (function(theFile) {
      return function(e) {
        var textAreaURLs = document.getElementById('textAreaURLs');
        textAreaURLs.value += e.target.result;
      };
    })(f);

    // Read in the image file as a data URL.
    reader.readAsText(f);
  }
}

//Load Rush errors from PopBox
function getErrors() {

  var url = 'http://localhost:5001/queue/RushErrors/pop?timeout=60';
  var headers = {};
  headers['accept'] = 'application/json';

  var callback = function(req) {

    var errors = JSON.parse(req.responseText);

    if (errors.data.length > 0) {

      $('#errorModal').modal('show');

      for (var i = 0; i < errors.data.length; i++) {
        var error = JSON.parse(errors.data[i]);

        var queuesTxt = '';
        var queues = JSON.parse(error.queues);

        for (var i = 0; i < queues.length; i++) {

          queuesTxt += queues[i].id;

          if (i !== queues.length - 1) {
            queuesTxt += ', ';
          }
        }

        var errorMsg;
        if (error.statusCode) {
          errorMsg = error.statusCode + ' - ' + error.errorMsg;
        } else {
          errorMsg = error.errorMsg;
        }

        var elem = document.createElement("tr");
        elem.setAttribute('class', 'error');
        var direction = document.createElement("td");
        direction.appendChild(document.createTextNode(error.dir));
        var queuesTd = document.createElement("td");
        queuesTd.appendChild(document.createTextNode(queuesTxt));
        var errorTd = document.createElement("td");
        errorTd.appendChild(document.createTextNode(errorMsg));

        elem.setAttribute("style","cursor: pointer");
        elem.appendChild(direction);
        elem.appendChild(queuesTd);
        elem.appendChild(errorTd);

        document.getElementById("errorsTable").appendChild(elem);
      }
    }

    //Subscribe again
    setTimeout(getErrors, 0);
  }

  sendReq(url, 'POST', headers, '', callback);
}

//Main Script
getErrors();      //Subscribe to error events

//Adapt Upload URLs Button
$('#uploadURLsBtn').on('click', function() {
  $('#fileURLsInput').click();
});
document.getElementById('fileURLsInput').addEventListener('change', handleFileSelect, false); //Charge URLs from a file

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

  var checkBox = document.getElementById('subscribeCheckBox');

  try {
    if (checkBox.checked) {
      subscribe();
    } else {
      pop();
    }
  } catch (e) {

  }

  checkBox.checked = false;
  return false;
});

//Check Errors Button action on click
$('#files').change(handleFileSelect);
$('#checkErrosBtn').on('click', function() {
  $('#errosListTab').addClass('active');
  $('#aboutTab').removeClass('active');
  $('#sendReqTab').removeClass('active');
  $('#getContentTab').removeClass('active');
});




