var nconf = require('./conf');
var winston = require('./logger');
var request = require('request');
var md5 = require('MD5');
var util = require('util');
var Datastore = require('nedb');
var path = require('path');

var dbEpisode = new Datastore({ filename: 'data/episodes.db', autoload: true });

var episodeService = {};

episodeService.unseenEpisodes = function(callback, showsIds) {
	showsIds = showsIds || null;
	request({
		method: 'POST',
		qs: {
			'v': '2.4',
			'login': nconf.get('bs-user'),
			'password': (nconf.get('bs-password').encrypt == 'true' ? nconf.get('bs-password').pass : md5(nconf.get('bs-password').pass) )
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
						winston.log('info', show.id + ' ' +show.title);
						if (showsIds == null || showsIds.indexOf(show.id) != -1) {
							winston.log('info', showsIds);
							show.unseen.forEach(function(unseenEpisode, index, array) {
								episodes.push({
									id: unseenEpisode.id,
									title: unseenEpisode.show.title,
									code: unseenEpisode.code,
									saison: unseenEpisode.season,
									episode: unseenEpisode.episode
								});
								winston.log('info', 'unseen ep ['+index+'] = '+unseenEpisode.show.title+'.'+unseenEpisode.code);
							});
						}
					});
					winston.log('info', 'request :'+util.inspect(episodes));
					callback(episodes);
				});
			} else {
				winston.log('error', 'no token!!!');
				callback([]);
			}

		} else {
			winston.log('error', error);
			winston.log('error', body);
			callback([]);
		}
	});
};

episodeService.updateFromBetaSeries = function(callback, showsIds) {
	showsIds = showsIds || null;
	episodeService.unseenEpisodes(function(episodes) {
		var itt = episodes.length;
		episodes.forEach(function(episode, index, array) {
			winston.log('info', 'try finding episode :'+util.inspect(episode));
			dbEpisode.findOne({id :episode.id}, function(err, doc) {
				winston.log('info', 'find :'+util.inspect(doc));
				if (!err && doc == null) {
					dbEpisode.insert(episode, function(err, newDoc) {
						winston.log('info', 'insert :'+util.inspect(newDoc));
						if(!err) {
							itt--;
							if (itt == 0) {
								callback();
							}
						} else {
							itt--;
							if (itt == 0) {
								callback();
							}
						}
					});
				} else {
					itt --;
					if (itt == 0) {
						callback();
					}
				}
			});
		});
	}, showsIds);
}

episodeService.episodesToDownload = function(callback) {
	dbEpisode.find({$or:[{download: {$exists:false}}, {download:false}] }, function(err, docs) {
		callback(docs);
	});
}

episodeService.episodesToWithoutSubtitles = function(callback) {
	dbEpisode.find({download:true, $or:[{subtitles:false}, {subtitles:{$exists:false}}] }, function(err, docs) {
		callback(docs);
	});
}

episodeService.updateSubtitles = function(subtitledFile, callback) {
	dbEpisode.update(
		{
			id: subtitledFile.id
		},
		{
			$set: {
				subtitles: true
			}
		},
		function(err, numReplaced) {
			callback();
		}
	);
}

episodeService.updateDownloaded = function(dowloadedFiles, callback) {
	var itt = dowloadedFiles.length;
	dowloadedFiles.forEach(function(downloadFile, index, array) {
		downloadFile.file
		downloadFile.path
		dbEpisode.update(
			{
				id: downloadFile.id
			}, 
			{
				$set: {
					completeFilePath: downloadFile.path+'/'+downloadFile.file,
					dirPath: downloadFile.path,
					fileName: path.basename(downloadFile.file, path.extname(downloadFile.file)),
					download: true
				}
			}, 
			function (err, numReplaced) {
				itt--;
				if(itt==0) {
					callback();
				}
			}
		);
	});
}

module.exports = episodeService;