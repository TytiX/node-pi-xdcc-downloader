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
var infexious = require('./lib/xdcc-downloader/infexious-xdcc');
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

    infexious.episodesCommands([
        {
          title: "Archer",
          code: "S03E01"
        },
        {
          title: "Arrow",
          code: "S01E01"
        },
        {
          title: "Breaking",
          code: "S01E01"
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

  router.get('/dl', function(req, res) {
    var bot = req.query.bot;
    var command = '#'+req.query.cmd;
    winston.log('info', 'bot :'+bot);
    winston.log('info', 'command :'+command);
    winston.log('info', 'path :'+nconf.get('download-path'));
    var user = 'desu' + Math.random().toString(36).substr(7, 3);

    winston.log('info', 'Connecting...');
    //irc.recycled-irc.net/6667
    //#infexious
    var client = new irc.Client('irc.recycled-irc.net', user, {
      channels: [ '#infexious' ],
      userName: user,
      realName: user
    });

    //iNFEXiOUS`Archer xdcc get 64
    client.on('join', function(channel, nick, message) {
      if (nick !== user) return;
      winston.log('info', 'Joined', channel);
      client.getXdcc(bot, 'xdcc send ' + command, nconf.get('download-path'));
    });

    client.on('xdcc-connect', function(meta) {
      winston.log('info', 'Connected: ' + meta.ip + ':' + meta.port);
      winston.log('info', 'All meta: ' + util.inspect(meta, false, null));
    });

    var last = 0;
    client.on('xdcc-data', function(received) {
      last = received;
    });

    client.on('xdcc-end', function(received) {
      winston.log('info', 'Download completed');
      res.send('bot :'+bot+'<br/>cmd :'+command);
    });

    client.on('notice', function(from, to, message) {
      if (to == user && from == bot) {
        winston.log('info', "[notice]", message);
      }
    });

    client.on('error', function(message) {
      console.error(message);
    });

  });
}
// apply the routes to our application
app.use('/api', router);

app.listen(port);
winston.log('info', 'see localhost port :'+port, {cloud:true});
