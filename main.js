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
//var winston = require('winston');
var opensubtitles = require('opensubtitles-client');
var nconf = require('nconf');

var lib = require('./lib/lib-test');
var deviceRegister = require('./lib/device-register');
var winston = require('./lib/logger');

nconf.argv().env().file({ file: 'config/config.json' });

var dbRegId = new Datastore({ filename: 'data/regId.db', autoload: true });

var gcmSender = new gcm.Sender(nconf.get('gcm-key'));

var app = express();
var port = 3000;

var router = express.Router();

winston.log('info', lib.mylib('toto'));

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
    if (!registration){
        res.send({code:"401", msg:"no registration id sended"});
    } else {

        deviceRegister.insert(registration, function (error, newDoc) {
           if (error) {
               res.send({code:"402", msg:"erreur insertion base"})
           } else {
               res.send({code:"200"});
           }
        });
    }
});

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

	var registrationIds = [];
	dbRegId.find({}, function (err, docs) {
		docs.forEach(function(doc, index, array) {
			registrationIds.push(doc.regId);
		});
	});
	gcmSender.send(gcmMsg, registrationIds, function (err, result) {
		if(err) console.error(err);
		else    winston.log('info', result);
	});
});

router.get('/betaseries', function(req, res) {
  request({
    method: 'POST',
    qs: {
      'v': '2.4',
      'login': nconf.get('bs-user'),
      'password': md5(nconf.get('bs-password'))
    },
    uri: 'https://api.betaseries.com/members/auth',
    headers: {
      'X-BetaSeries-Key': nconf.get('bs-key')
    }
  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      winston.log('info', 'logging :'+util.inspect(body));

      var token = JSON.parse(body).token;

      winston.log('info', 'token :'+token);

      if (token != ''){
        request({
          uri: 'https://api.betaseries.com/episodes/list',
          method: 'GET',
          qs: {
            'v': '2.4',
            'token': token
          },
          headers: {
            'X-BetaSeries-Key': nconf.get('bs-key')
          }
        }, function (error, response, body) {
             var api = JSON.parse(body);
             winston.log('info', 'request unseen list');
             var episodes = new Array();
             api.shows.forEach(function(show, index, array) {
               show.unseen.forEach(function(unseenEpisode, index, array) {
                 episodes.push(unseenEpisode.show.title+'.'+unseenEpisode.code);
                 //winston.log('info', 'unseen ep ['+index+'] = '+unseenEpisode.show.title+'.'+unseenEpisode.code);
               });
             });
             winston.log('info', 'request :'+util.inspect(episodes));
             res.send(util.inspect(episodes));
         });
      }

    }
  });
});

router.get('/xdcc-list', function(req, res) {
  var show = req.query.show;
  var code = req.query.code;
  winston.log('info', 'requestParam :'+show);
  winston.log('info', 'requestParam :'+code);

  var url = 'http://inf.sirc.li/index.php?bot=ALL&t=iNFEXiOUS';

  request( url, function(error, response, body) {
    if (!error && response.statusCode == 200) {
      var sb = [];

      winston.log('info', 'page response');
      var $ = cheerio.load(body);
      winston.log('info', 'cheerio loaded');

      var flashs = $('tr > td').filter( function (i, el) {
        var chaine = $(el).find('b > a').text();
        var epCode = $(el).find('b').text()
        return chaine.toLowerCase().indexOf(show.toLowerCase()) > -1 && 
                 epCode.toLowerCase().indexOf(code.toLowerCase()) > -1;
      }).parent();

      var xdccCode = $(flashs).find('td').first().text();
      var xdccCommand = $(flashs).find('td').last().text();
      var bot = xdccCommand.toString().substring('/msg '.length).split(' ');
      res.send('nbResonse :'+flashs.length+'<br/>code :'+xdccCode+'<br/>bot :'+bot[0]+'<br/>command :'+xdccCommand+'<br/>bot :'+bot[0]);
    }
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

// apply the routes to our application
app.use('/api', router);

app.listen(port);
winston.log('info', 'see localhost port :'+port);
