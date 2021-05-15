const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const EventHubReader = require('./scripts/event-hub-reader.js');

var Client = require('azure-iothub').Client;
var Message = require('azure-iot-common').Message;



//const iotHubConnectionString = process.env.IotHubConnectionString;
//const eventHubConsumerGroup = process.env.EventHubConsumerGroup;
const iotHubConnectionString = 'HostName=ELE400FANCY.azure-devices.net;SharedAccessKeyName=service;SharedAccessKey=1m7TGFIl/6IUre7HiVqrk/Jth19esu4HmW/xyyPZyQk='
const eventHubConsumerGroup = 'ELE400FancyClient';
const targetDevice = 'RaspberryPi';

// Redirect requests to the public subdirectory to the root
const app = express();
app.use(express.static(path.join(__dirname, 'public')));

const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use((req, res) => {
  console.log("YO, IT's YA BOI TRUMP");

  console.log('params: ' + JSON.stringify(req.params));
	console.log('body: ' + JSON.stringify(req.body.message));
  console.log('query: ' + JSON.stringify(req.query));
  
  sendC2D(req.body.message);

  res.redirect('/');
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

/*var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.urlencoded({extended: true})); 
app.use(express.json());   


app.use(express.json());       // to support JSON-encoded bodies
app.use(express.urlencoded()); // to support URL-encoded bodies

app.get('/endpoint', function(req, res){

  console.log("777777777777777777777777");
	var obj = {};
	obj.title = 'title';
	obj.data = 'data';
	
	console.log('params: ' + JSON.stringify(req.params));
	console.log('body: ' + JSON.stringify(req.body));
	console.log('query: ' + JSON.stringify(req.query));
	
	res.header('Content-type','application/json');
	res.header('Charset','utf8');
	res.send(req.query.callback + '('+ JSON.stringify(obj) + ');');
});


/*app.post('/endpoint', function(req, res){
	var obj = {};
	console.log("YES!");
	res.send(req.body);
});*/


/*var bodyParser = require('body-parser')
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
})); 

app.use(express.json());       // to support JSON-encoded bodies
app.use(express.urlencoded()); // to support URL-encoded bodies

app.post('/endpoint', function(req, res){
	var obj = {};
	console.log("YES!");
	res.send(req.body);
});*/

wss.broadcast = (data) => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        console.log(`Broadcasting data ${data}`);
        client.send(data);
      } catch (e) {
        console.error(e);
      }
    }
  });
};

server.listen(process.env.PORT || '3000', () => {
  console.log('Listening on %d.', server.address().port);
});

const eventHubReader = new EventHubReader(iotHubConnectionString, eventHubConsumerGroup);

(async () => {
  await eventHubReader.startReadMessage((message, date, deviceId) => {
    try {
      const payload = {
        IotData: message,
        MessageDate: date || Date.now().toISOString(),
        DeviceId: deviceId,
      };
      wss.broadcast(JSON.stringify(payload));
    } catch (err) {
      console.error('Error broadcasting: [%s] from [%s].', err, message);
    }
  });
})().catch();


var serviceClient = Client.fromConnectionString(iotHubConnectionString);


function printResultFor(op) {
  return function printResult(err, res) {
    if (err) console.log(op + ' error: ' + err.toString());
    if (res) console.log(op + ' status: ' + res.constructor.name);
  };
}


function receiveFeedback(err, receiver){
  receiver.on('message', function (msg) {
    console.log('Feedback message:')
    console.log(msg.getData().toString('utf-8'));
  });
}


serviceClient.open(function (err) {
  if (err) {
    console.error('Could not connect: ' + err.message);
  } else {
    console.log('Service client connected');
    serviceClient.getFeedbackReceiver(receiveFeedback);
    var message = new Message('Cloud to device message.');
    message.ack = 'full';
    message.messageId = "My Message ID";
    console.log('Sending message: ' + message.getData());
    serviceClient.send(targetDevice, message, printResultFor('send'));
  }
});


function sendC2D(message)
{
  console.log("777777777777777777777777777777777777:", message);
  serviceClient.send(targetDevice, message, printResultFor('send'));
}



