function sendReq(url, method, headers, content, callback) {

  var req;

  try {

    var proxyURL = "http://localhost:2001/";

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
    window.alert('An error arises when the petition was being sent');
  }
}

function sendRushRequest() {
  var url = 'http://localhost:3001';
  var inputURL = document.getElementById('inputURL');
  var inputQueues = document.getElementById('inputQueues');
  var contentURL = inputURL.value;
  var queuesObj = [];
  var queues = inputQueues.value.split(',');
  var headers = {};

  for (var i = 0; i < queues.length; i++){
    var queueWithoutSpaces = queues[i].split(' ').join('');
    queuesObj.push({id: queueWithoutSpaces});
  }

  headers['x-relayer-host'] = contentURL;
  headers['x-relayer-encoding'] = 'base64';
  headers['x-relayer-topic'] = JSON.stringify(queuesObj);

  var callback = function(req) {
    var parsed = JSON.parse(req.responseText);

    $('#sendReqBtnRush').button('reset');

    if (parsed.ok === true) {
      $('#alertOKRush').removeClass('hidden');
      setTimeout(function() {
        $('#alertOKRush').addClass('hidden');
      }, 5000);
    } else {
      $('#alertErrorRush').removeClass('hidden');
      setTimeout(function() {
        $('#alertErrorRush').addClass('hidden');
      }, 3000);
    }
  }

  $('#sendReqBtnRush').button('loading');
  inputURL.value = '';
  inputQueues.value = '';
  sendReq(url, 'GET', headers, '', callback);

}

function sendPopBoxRequest() {

  var queueInput = document.getElementById('inputQueue');
  var queueID = queueInput.value;
  var url = 'http://localhost:5001/queue/' + queueID + '/pop';
  var headers = {};
  headers['accept'] = 'application/json';

  var callback = function(req) {

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
      $('#noTransPopBoxModal').modal('show');
    }

    $('#sendReqBtnPopBox').button('reset');
  }

  $('#sendReqBtnPopBox').button('loading');
  queueInput.value = '';
  sendReq(url, 'POST', headers, '', callback);

}

$('#rushForm').on('submit', function() {
  try {
    sendRushRequest();
  } catch (e) {
    console.log(e);
  } finally {
    return false;
  }

});

$('#popBoxForm').on('submit', function() {
  try {
    sendPopBoxRequest();
  } catch (e) {
    console.log(e);
  } finally {
    return false;
  }
});

$('#checkErrosBtn').on('click', function() {
  $('#errosListTab').addClass('active');
  $('#aboutTab').removeClass('active');
  $('#sendReqTab').removeClass('active');
  $('#getContentTab').removeClass('active');
});

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

        var elem = document.createElement("tr");
        elem.setAttribute('class', 'error');
        var direction = document.createElement("td");
        direction.appendChild(document.createTextNode(error.dir));
        var queuesTd = document.createElement("td");
        queuesTd.appendChild(document.createTextNode(queuesTxt));
        var errorTd = document.createElement("td");
        errorTd.appendChild(document.createTextNode(error.statusCode + ' - ' + error.errorMsg));

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

getErrors();





