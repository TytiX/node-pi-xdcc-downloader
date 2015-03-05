var util = require('util');
var bodyParser = require('body-parser');
var express = require('express');
var gcm = require('node-gcm');
var CronJob = require('cron').CronJob;

var nconf = require('./conf');
var winston = require('./logger');

var deviceRegister = require('./register-service');
var episodeService = require('./episodes-service');
var SubtitleService = require('./subtitle-service');
var Infexious = require('./xdcc-downloader/infexious-xdcc');
var MockXdcc = require('./xdcc-downloader/mock-xdcc');

var downloaderApp = {};

downloaderApp.server = express();
downloaderApp.server.use(bodyParser.json());
downloaderApp.server.use(bodyParser.urlencoded({ extended: true }));

downloaderApp.start = function(port, cronTab, showsIds) {

	downloaderApp.showsIds = showsIds;

	if (cronTab != null) {
		downloaderApp.launchRegister(port);

		downloaderApp.launchCron(cronTab);
	} else {
		downloaderApp.scanAndDownload();
	}

};

downloaderApp.launchCron = function(cronTab) {
	var job = new CronJob(cronTab, function() {
		downloaderApp.scanAndDownload();
	}, null, true, "Europe/Paris");
};

downloaderApp.launchRegister = function(port) {

	var router = express.Router();

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
			var gcmSender = new gcm.Sender(nconf.get('gcm-key'));
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
				if (registrationIds == null || registrationIds.length == 0) {
					res.send({code:501, msg: 'no registrationIds in base'});
				} else {
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
				}
			});
		});
	}

	downloaderApp.server.use('/api', router);

	downloaderApp.server.listen(port);
	winston.log('info', 'application started on:'+port, {cloud:true});

};

downloaderApp.scanAndDownload = function() {

	// update local database with series
	episodeService.updateFromBetaSeries(downloaderApp.showsIds, function() {
		// get episodes to download
		episodeService.episodesToDownload(function(episodes) {
			// find episodes on xdcc
			var infexious = new Infexious();
			infexious.episodesCommands(episodes, function(commands) {
				// download episode from xdcc
				infexious.downloadEpisodes(episodes, commands, function(downloaded) {
					// update downloaded episodes
					episodeService.updateDownloaded(downloaded, function() {
						winston.log('info', downloaded);
						winston.log('info', 'fin des telechargements');
						infexious.end();

						// episodes downloaded with no subtitles
						episodeService.episodesToWithoutSubtitles(function(result) {
							var subtitleService = new SubtitleService();
							// download subtitles for not subtitled episodes
							subtitleService.downloadSubtitles(result, function() {
								winston.log('info', 'subtitle end');
							});
						});

					});
				});
			});
		});
	});

};

downloaderApp.testBetaSeriesUpdate = function(showsIds) {
	episodeService.updateFromBetaSeries(showsIds, function() {
		episodeService.episodesToDownload(function(episodes) {

			//winston.log('info', episodes);
		});
	});
};

downloaderApp.testXdccSearch = function() {
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
		winston.log('info', commands);
	});
};

downloaderApp.testDownload = function() {
	var tmpEpisode = [
		{
			id:439597,
			title:"Arrow",
			code:"S03E15",
			saison:3,
			episode:15,
			_id:"CKcrmls1pyMKIzr3"
		},
		{
			id:433226,
			title:"Rizzoli & Isles",
			code:"S05E14",
			saison:5,
			episode:14,
			_id:"Rs7ARODN1YxmmgEB"
		}
	];

	// var infexious = new Infexious();
	var infexious = new MockXdcc();
	infexious.episodesCommands(tmpEpisode, function(commands) {

		winston.log('info', 'commands :'+util.inspect(commands));
		
		infexious.downloadEpisodes(tmpEpisode, 
			commands, 
			function(downloaded) {

				episodeService.updateDownloaded(downloaded, function() {
					winston.log('info', 'download update');
				});

				winston.log('info', downloaded);
				winston.log('info', 'fin des telechargements');
				infexious.end();
			}
		);

	});
};

downloaderApp.testEpisodesSuptitle = function() {

	var subtitles = [
		{
			id:439597,
			title:"Arrow",
			code:"S03E15",
			saison:3,
			episode:15,
			completeFilePath: './download/mock-a.avi',
			dirPath: './download',
			fileName: 'mock-a',
			download: true,
			_id:"CKcrmls1pyMKIzr3"
		},
		{
			id:433226,
			title:"Rizzoli & Isles",
			code:"S05E14",
			saison:5,
			episode:14,
			completeFilePath: './download/mock-reta.avi',
			dirPath: './download',
			fileName: 'mock-reta',
			download: true,
			_id:"Rs7ARODN1YxmmgEB"
		}
	];

	var subtitleService = new SubtitleService();
	subtitleService.downloadSubtitles(subtitles, function() {
		winston.log('info', 'subtitle end');
	});
	// episodeService.episodesToWithoutSubtitles(function(result) {
	// 	winston.log('info', 'downloaded sub :'+util.inspect(result));
	// 	var subtitleService = new SubtitleService();
	// 	subtitleService.downloadSubtitles(subtitles, function() {
	// 		winston.log('info', 'subtitle end');
	// 	});
	// });

};

module.exports = downloaderApp;