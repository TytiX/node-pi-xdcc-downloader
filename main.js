var gcm = require('node-gcm');
var bodyParser = require('body-parser');
var express = require('express');

var nconf = require('./lib/conf');
var winston = require('./lib/logger');

var deviceRegister = require('./lib/register-service');
var appDownloader = require('./lib/pi-downloader');

var gcmSender = new gcm.Sender(nconf.get('gcm-key'));

var app = express();
var port = 3000;

var router = express.Router();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

router.get('/', function(req, res) {
  res.send('api home page');  
});

router.get('/register', function(req, res) {
  res.send('post registration key'); 
});

router.post('/register', function(req, res) {
  winston.log('info', req.body);
  var registration = req.body.regId;
  deviceRegister.register(registration, function (returnObj) {
    res.send(returnObj);
  });
});

if (nconf.get('test-page')) {
  router.get('/test', function(req, res) {
  	var gcmMsg = new gcm.Message({
  		collapseKey: 'test',
  		delayWhileIdle: true,
  		timeToLive: 3,
  		data: {
  			testkey: 'message key',
  			msg: 'test message from api'
  		}
  	});
    deviceRegister.findRegistered(function(registrationIds) {
      gcmSender.send(gcmMsg, registrationIds, function (err, result) {
        if(err) {
          winston.log('error', err);
          deviceRegister.handleError(registrationIds, err);
          res.send({code:"401", msg: err});
        }
        else {
          winston.log('info', result);
          res.send({code:"200"});
        }
      });
    });
  });

}
// apply the routes to our application
app.use('/api', router);

// app.listen(port);
winston.log('info', 'application started on:'+port, {cloud:true});

// appDownloader.testDownload();

appDownloader.testEpisodesSuptitle();

// appDownloader.testBetaSeriesUpdate([
//     5010, // Arrow
//     196, // Grey's Anatomy
//     14, // TBBT
//     1474, // Rizzoli & Isles
//     6197 // The Blacklist
//   ]
// );