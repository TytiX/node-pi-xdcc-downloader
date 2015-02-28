var nconf = require('./conf');
var winston = require('./logger');
var request = require('request');
var md5 = require('MD5');
var util = require('util');
var Datastore = require('nedb');

var dbEpisode = new Datastore({ filename: 'data/episodes.db', autoload: true });

var episodeService = {};

episodeService.unseenEpisodes = function(callback) {

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
						show.unseen.forEach(function(unseenEpisode, index, array) {
							episodes.push({
								id: unseenEpisode.id,
								title: unseenEpisode.show.title,
								code: unseenEpisode.code,
								saison: unseenEpisode.saison,
								episode: unseenEpisode.episode
							});
							//winston.log('info', 'unseen ep ['+index+'] = '+unseenEpisode.show.title+'.'+unseenEpisode.code);
						});
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

episodeService.updateFromBetaSeries = function(callback) {
	episodeService.unseenEpisodes(function(episodes) {
		var itt = episodes.length;
		episodes.forEach(function(episode, index, array) {
			winston.log('info', 'try finding episode :'+util.inspect(episode));
			dbEpisode.findOne(episode, function(err, doc) {
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
	});
}

episodeService.episodesToDownload = function(callback) {
	dbEpisode.find({$or:[{download: {$exists:false}}, {download:false}] }, function(err, docs) {
		callback(docs);
	});
}

module.exports = episodeService;