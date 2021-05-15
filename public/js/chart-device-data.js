/* eslint-disable no-restricted-globals */
/* eslint-disable no-undef */


$(document).ready(() => {

  var interval = setInterval(function() {
    var dt = new Date();
    var time = dt.getHours() + ":" + dt.getMinutes() + ":" + dt.getSeconds();
    $("#time").text(time);
  }, 100);

  // if deployed to a site supporting SSL, use wss://
  const protocol = document.location.protocol.startsWith('https') ? 'wss://' : 'ws://';
  const webSocket = new WebSocket(protocol + location.host);

  // A class for holding the last N points of telemetry for a device
  class DeviceData {
    constructor(deviceId) {
      this.deviceId = deviceId;
      this.maxLen = 50;
      this.timeData = new Array(this.maxLen);
      this.temperatureData = new Array(this.maxLen);
      this.humidityData = new Array(this.maxLen);
    }

    addData(time, temperature, humidity) {
      this.timeData.push(time);
      this.temperatureData.push(temperature);
      this.humidityData.push(humidity || null);

      if (this.timeData.length > this.maxLen) {
        this.timeData.shift();
        this.temperatureData.shift();
        this.humidityData.shift();
      }
    }
  }

  // All the devices in the list (those that have been sending telemetry)
  class TrackedDevices {
    constructor() {
      this.devices = [];
    }

    // Find a device based on its Id
    findDevice(deviceId) {
      for (let i = 0; i < this.devices.length; ++i) {
        if (this.devices[i].deviceId === deviceId) {
          return this.devices[i];
        }
      }

      return undefined;
    }
  }

  const trackedDevices = new TrackedDevices();

  // Define the chart axes
  const chartData = {
    datasets: [
      {
        fill: false,
        label: 'Temperature',
        yAxisID: 'Temperature',
        borderColor: 'rgba(255, 204, 0, 1)',
        pointBoarderColor: 'rgba(255, 204, 0, 1)',
        backgroundColor: 'rgba(255, 204, 0, 0.4)',
        pointHoverBackgroundColor: 'rgba(255, 204, 0, 1)',
        pointHoverBorderColor: 'rgba(255, 204, 0, 1)',
        spanGaps: true,
      },
      {
        fill: false,
        label: 'Humidity',
        yAxisID: 'Humidity',
        borderColor: 'rgba(24, 120, 240, 1)',
        pointBoarderColor: 'rgba(24, 120, 240, 1)',
        backgroundColor: 'rgba(24, 120, 240, 0.4)',
        pointHoverBackgroundColor: 'rgba(24, 120, 240, 1)',
        pointHoverBorderColor: 'rgba(24, 120, 240, 1)',
        spanGaps: true,
      }
    ]
  };

  const chartOptions = {
    scales: {
      yAxes: [{
        id: 'Temperature',
        type: 'linear',
        scaleLabel: {
          labelString: 'Temperature (ºC)',
          display: true,
        },
        position: 'left',
      },
      {
        id: 'Humidity',
        type: 'linear',
        scaleLabel: {
          labelString: 'Humidity (%)',
          display: true,
        },
        position: 'right',
      }]
    }
  };

  // Get the context of the canvas element we want to select
  const ctx = document.getElementById('iotChart').getContext('2d');
  const myLineChart = new Chart(
    ctx,
    {
      type: 'line',
      data: chartData,
      options: chartOptions,
    });

  // Manage a list of devices in the UI, and update which device data the chart is showing
  // based on selection
  const listOfDevices = document.getElementById('listOfDevices');
  function OnSelectionChange() {
    const device = trackedDevices.findDevice(listOfDevices[listOfDevices.selectedIndex].text);
    chartData.labels = device.timeData;
    chartData.datasets[0].data = device.temperatureData;
    chartData.datasets[1].data = device.humidityData;
  }
  listOfDevices.addEventListener('change', OnSelectionChange, false);

  // When a web socket message arrives:
  // 1. Unpack it
  // 2. Validate it has date/time and temperature
  // 3. Find or create a cached device to hold the telemetry data
  // 4. Append the telemetry data
  // 5. Update the chart UI
  webSocket.onmessage = function onMessage(message) {
    try {
      const messageData = JSON.parse(message.data);
      console.log(messageData);

      // time and temperature are required
      if (!messageData.MessageDate || !messageData.IotData.temperature) {
        return;
      }

      // find or add device to list of tracked devices
      const existingDeviceData = trackedDevices.findDevice(messageData.DeviceId);

      if (existingDeviceData) {
        existingDeviceData.addData(messageData.MessageDate, messageData.IotData.temperature, messageData.IotData.humidity);
        $("#temperature").val(Math.floor(messageData.IotData.temperature));
        $("#pression").val(Math.floor(messageData.IotData.pressure));
        $("#moncar").val(messageData.IotData.monca);
        $("#humidity").val(Math.floor(messageData.IotData.humidity));
        setpos(messageData.IotData.position, messageData.IotData.angle);
        setLight(messageData.IotData.position);
      } else {
        const newDeviceData = new DeviceData(messageData.DeviceId);
        trackedDevices.devices.push(newDeviceData);
        newDeviceData.addData(messageData.MessageDate, messageData.IotData.temperature, messageData.IotData.humidity);

        // add device to the UI list
        const node = document.createElement('option');
        const nodeText = document.createTextNode(messageData.DeviceId);
        node.appendChild(nodeText);
        listOfDevices.appendChild(node);

        // if this is the first device being discovered, auto-select it
        if (listOfDevices.selectedIndex === -1) {
          listOfDevices.selectedIndex = 0;
          OnSelectionChange();
        }
      }

      myLineChart.update();
    } catch (err) {
      console.error(err);
    }
  };

  function setLight(pos)
  {
    if((pos > 0.75) & (pos < 1.5))
    {
      $("#Yellow").css("background-color", "Yellow");
      $("#Red").css("background-color", "White");
      $("#Green").css("background-color", "White");
      sendmessage("2");
    }
    else if(pos < 0.75)
    {
      $("#Red").css("background-color", "Red");
      $("#Yellow").css("background-color", "White");
      $("#Green").css("background-color", "White");
      sendmessage("1");
    }
    else
    {
      $("#Green").css("background-color", "Green");
      $("#Red").css("background-color", "White");
      $("#Yellow").css("background-color", "White");
      sendmessage("3");
    }
  }


  function sendmessage(message)
  {

      console.log("sending message...");

      var data = {};
			data.title = "title";
      data.message = message;
      console.log(JSON.stringify(data));
			
			$.ajax({
				type: 'POST',
				data: JSON.stringify(data),
			  contentType: 'application/json',
        url: 'http://localhost:3000/',						
        success: function(data) {
          console.log('success');
          //console.log(JSON.stringify(data));
        }
      });
  }

  function setpos(pos, angle)
  {
    var $rad = $('#rad');
    rad = $rad.width() / 2;
    //radxpos = $radP.offset().left;
    //radypos = $radP.offset().top;
    radxpos = 347;
    radypos = 345;
    pos = pos;
    deg = angle;
    raddeg = 90 + (deg * (Math.PI / 180));
    xpos = Math.cos(raddeg) * pos;
    ypos = Math.sin(raddeg) * pos;
    leftpos = radxpos + ((xpos * rad) / 1.5);
    toppos = radypos + ((ypos * rad) / 1.5);
    console.log("leftpos:", leftpos, "\n xpos:", xpos, "\n radxpos:", radxpos);
    //$("#dot").attr("data-x", leftpos);
    //$("#dot").attr("data-y", toppos);

    $("#dot").data().x = leftpos;
    $("#dot").data().y = toppos;

    //console.log("leftpos:", $("#dot"), "\n xpos:", $("#dot").data().x, "\n radxpos:", $("#dot").data().y)
  }


  $(function() {
    
    var $rad = $('#rad'),
        $obj = $('.obj'),
        deg = 0,
        rad = $rad.width() / 2;
  
    (function rotate() {   
      
      
      $obj.each(function(){
      //console.log($(this).data().x, $(this).data().y);
      var pos = $(this).data(),
          getAtan = Math.atan2(pos.x-rad, pos.y-rad),
          getDeg = (-getAtan/(Math.PI/180) + 180) | 0;
      // Read/set positions and store degree
      $(this).css({left:pos.x, top:pos.y}).attr('data-atDeg', getDeg);
    });
      $rad.css({transform: 'rotate('+ deg +'deg)'}); // Radar rotation
      $('[data-atDeg='+deg+']').stop().fadeTo(0,1).fadeTo(1700,0.2); // Animate dot at deg
  
      deg = ++deg % 360;      // Increment and reset to 0 at 360
      setTimeout(rotate, 25); // LOOP
    })();
  
  });

  var state = 1;

  $( "#trafficLight" ).click(function() {

    if(state)
    {
      $("#Red").css("background-color", "Red");
      $("#Yellow").css("background-color", "Yellow");
      $("#Green").css("background-color", "Green");
      state = 0;
    }
    else
    {
      $("#Red").css("background-color", "White");
      $("#Yellow").css("background-color", "White");
      $("#Green").css("background-color", "White");
      state = 1;
    }     
  });
  
});