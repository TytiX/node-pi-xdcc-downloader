var bodyParser = require('body-parser');
var express = require('express');
var Datastore = require('nedb');
var gcm = require('node-gcm');
var request = require('request');
var cheerio = require('cheerio');
var md5 = require('MD5');
var irc = require('xdcc').irc;
var zlib = require('zlib');
var fs = require('fs');
var util = require('util');
var opensubtitles = require('opensubtitles-client');

var nconf = require('./lib/conf');
var winston = require('./lib/logger');

var deviceRegister = require('./lib/register-service');
var episodeService = require('./lib/episodes-service');
var Infexious = require('./lib/xdcc-downloader/infexious-xdcc');
//var task = require('./lib/cron-task');

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

  router.get('/betaseries', function(req, res) {
    episodeService.updateFromBetaSeries(function() {
      episodeService.episodesToDownload(function(episodes) {
        res.send(episodes);
      });
    });
  });

  router.get('/xdcc-list', function(req, res) {
    var show = req.query.show;
    var code = req.query.code;
    winston.log('info', 'requestParam :'+show);
    winston.log('info', 'requestParam :'+code);
    var infexious = new Infexious();
    infexious.episodesCommands([
        {
          title: "Archer (2009)",
          code: "S03E01",
          saison: 3,
          episode: 1,
        },
        {
          title: "Arrow",
          code: "S01E01",
          saison: 1,
          episode: 1,
        },
        {
          title: "Breaking Bad",
          code: "S01E01",
          saison: 1,
          episode: 1,
        }
      ], function(commands) {
      res.send(commands);
    });
  });

  router.get('/sub', function(req, res) {
    var episode = req.query.ep;
    opensubtitles.api.login().done(function(token){

      // login
      opensubtitles.api.search(token, 'fre', episode).done( function(results){

        // search
        winston.log('info', 'sub search result length :'+results.length);

        results.forEach(function(result, index, array) {
             var filename = './download/' + episode + '-'+ index +'.srt';
             var downloadLink = result.SubDownloadLink;
             winston.log('info', 'download link :'+downloadLink);
             request(downloadLink).pipe(zlib.createGunzip()).pipe(fs.createWriteStream(filename));
             winston.log('info', 'extract :'+filename);
        });

        res.send(results);

        opensubtitles.api.logout(token);

      });

    });
  });

  router.get('/chaine-test', function(req, res) {
    episodeService.updateFromBetaSeries(function() {
      episodeService.episodesToDownload(function(episodes) {
        var infexious = new Infexious();
        infexious.episodesCommands(episodes, function(commands){
          var objects = [];
          episodes.forEach(function(episode, index, array) {
            objects.push({
              episode : episode,
              command : commands[index]
            });
          });
          res.send(objects);
        });
      });
    });
  });

}
// apply the routes to our application
app.use('/api', router);

//app.listen(port);
winston.log('info', 'application started on:'+port, {cloud:true});

// test connection IRC
// var tmpEpisode = [
//   { 
//     id: 452518,
//     title: 'Archer (2009)',
//     code: 'S06E08',
//     saison: 6,
//     episode: 8,
//     _id: 'Ye9Zay0mHf5QbWnL' 
//   },
//   { 
//     id: 654654,
//     title: 'Futurama',
//     code: 'S07E01',
//     saison: 7,
//     episode: 1 
//   }
// ];

// var infexious = new Infexious();
// infexious.episodesCommands(tmpEpisode, function(commands) {

//     winston.log('info', 'commands :'+util.inspect(commands));

//     infexious.downloadEpisodes(tmpEpisode, 
//       commands, 
//       function(downloaded) {

//         winston.log('info', downloaded);
//         winston.log('info', 'fin des telechargements');
//         infexious.end();
//       }
//     );

//   });

// test mise a jour et recuperation series
episodeService.updateFromBetaSeries(function() {
      episodeService.episodesToDownload(function(episodes) {
        winston.log('info', episodes.length);
      });
    });