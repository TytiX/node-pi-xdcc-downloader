var request = require('request');
var cheerio = require('cheerio');

var infexious = {}; 

infexious.episodesCommands = function(episodes, callback) {
	
	var url = 'http://inf.sirc.li/index.php?bot=ALL&t=iNFEXiOUS';

	request( url, function(error, response, body) {
		if (!error && response.statusCode == 200) {

			var $ = cheerio.load(body);

			var itt = episodes.length;

			var commands = [];

			episodes.forEach(function(episode, index, array) {

				var tags = $('tr > td').filter( function (i, el) {
					var chaine = $(el).find('b > a').text();
					var epCode = $(el).find('b').text()
					return chaine.toLowerCase().indexOf(episode.title.toLowerCase()) > -1 && 
							epCode.toLowerCase().indexOf(episode.code.toLowerCase()) > -1;
				}).parent();

				var xdccCode = $(tags).find('td').first().text();
				var xdccCommand = $(tags).find('td').last().text();
				var bot = xdccCommand.toString().substring('/msg '.length).split(' ');

				commands.push({
					bot: bot[0],
					pack: xdccCode,
					cmd: xdccCommand
				});

			});

			callback(commands)

		} else {
			callback([]);
		}
	});
};

module.exports = infexious;