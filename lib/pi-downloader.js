var util = require('util');

var nconf = require('./conf');
var winston = require('./logger');

var deviceRegister = require('./register-service');
var episodeService = require('./episodes-service');
var SubtitleService = require('./subtitle-service');
var Infexious = require('./xdcc-downloader/infexious-xdcc');

var downloaderApp = {};

downloaderApp.start = function() {

};

downloaderApp.testBetaSeriesUpdate = function(showsIds) {
	episodeService.updateFromBetaSeries(function() {
		episodeService.episodesToDownload(function(episodes) {

			//winston.log('info', episodes);
		});
	}, showsIds);
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
		}
	];

	var infexious = new Infexious();
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

	episodeService.episodesToWithoutSubtitles(function(result) {
		winston.log('info', 'downloaded sub :'+util.inspect(result));

		var subtitleService = new SubtitleService();
		subtitleService.downloadSubtitles(result, function() {
			winston.log('info', 'subtitle end');
		});
	});

};

module.exports = downloaderApp;