var request = require('request');
var cheerio = require('cheerio');
var util = require('util');
var irc = require('xdcc').irc;

var showNameUtil = require('../series-utils');

var winston = require('../logger')

var AbstractXdcc = require('./abstract-xdcc');

var InfexiousXdcc = function() {
  var self = this;

  this.name = 'iNFEXiOUS';
  this.user = 'PiDownloader' + Math.random().toString(36).substr(7, 3);

  this.joinMessage = "Bonjour!";

  this.client = new irc.Client('irc.recycled-irc.net', self.user, {
    channels: [ '#infexious' ],
    userName: self.user,
    realName: self.user,
    autoConnect: false
  });

  this.init();
  this.client.connect();
};

util.inherits(InfexiousXdcc, AbstractXdcc);

InfexiousXdcc.prototype.episodesCommands = function(episodes, callback) {
	var url = 'http://inf.sirc.li/index.php?bot=ALL&t=iNFEXiOUS';
  // winston.log('info', 'get page :'+url);

  var self = this;

	request( url, function(error, response, body) {
		if (!error && response.statusCode == 200) {

      // winston.log('info', 'response OK');
      // winston.log('info', 'nb episodes :'+episodes.length);
			var $ = cheerio.load(body);
      winston.log('info', 'cheerio load finished');

			var commands = [];

			episodes.forEach(function(episode, index, array) {

        var titleToSearch = showNameUtil.toSearchTitle(episode.title);
        winston.log('info', 'search for episode :'+titleToSearch+'.'+episode.code);
				var tags = $('tr > td').filter( function (i, el) {
					var chaine = $(el).find('b > a').text();
					var epCode = $(el).find('b').text()
					return chaine.toLowerCase().indexOf(titleToSearch.toLowerCase()) > -1 && 
							epCode.toLowerCase().indexOf(episode.code.toLowerCase()) > -1;
				}).parent();

        if ($(tags).get().length > 1) {
          tags = $(tags).get(0);
        }
        winston.log('info', 'find results :'+$(tags).get().length);

        if ($(tags).get().length == 0) {
          var log = episode;
          log.cloud = true;
          winston.log('info', 'episode :'+episode.title+' -- not found on ['+self.name+']', log);
          commands.push(null);
        } else {
          var xdccCode = $(tags).find('td').first().text();
          var xdccCommand = $(tags).find('td').last().text();
          var bot = xdccCommand.toString().substring('/msg '.length).split(' ');

          var cmd = {
            bot: bot[0],
            pack: xdccCode,
            cmd: xdccCommand
          };

          var log = {
            episode : episode,
            cmd : cmd,
            cloud = true
          }
          winston.log('info', 'episode :'+episode.title+' -- found on ['+self.name+'] pack :'+xdccCode, log);
          
          commands.push(cmd);
        }
			});

			callback(commands);

		} else {
			callback([]);
		}
	});
};

module.exports = InfexiousXdcc;