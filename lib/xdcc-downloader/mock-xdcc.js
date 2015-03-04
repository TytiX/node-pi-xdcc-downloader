var util = require('util');
var events = require('events');
var CronJob = require('cron').CronJob;

var AbstractXdcc = require('./abstract-xdcc');

var winston = require('../logger');

function MockClient() {

	events.EventEmitter.call(this);

	var self = this;

	this.connect = function() {
		winston.log('info', 'connect send in 3s');
		setTimeout(function(){
			winston.log('info', 'connect emit');
			self.emit('join', 'channel', 'nick', 'message');
		}, 3000);
	};

	this.say = function(channel, message) {
		winston.log('info', 'mock say');
	};

	this.getXdcc = function (bot, command, path) {
		winston.log('info', 'mock xdcc');
		setTimeout(function() {
			winston.log('info', 'emit xdcc-connect');
			self.emit('xdcc-connect', {length: 100, file:'mocklife.mp4'});
			setTimeout(function() {
				var index = 1;
				var job = new CronJob('* * * * * *', function(){
						winston.log('info', 'emit xdcc-data : '+index);
						self.emit('xdcc-data', index);
						if (index >= 99) {
							job.stop();
						}
						index++;
					}, function () {
						winston.log('info', 'emit xdcc-end');
						self.emit('xdcc-end', 100);
					},
					true /* Start the job right now */,
					'Europe/Paris' /* Time zone of this job. */
				);
			}, 500);
		}, 2000);
	};

	this.disconnect = function () {
		winston.log('info', 'mock deconnect');
	};
};
MockClient.prototype.__proto__ = events.EventEmitter.prototype;

var MockXdcc = function() {

	winston.log('info', 'new instance of mock');
	var self = this;

	this.name = 'Mock';
	this.user = 'ploppy' + Math.random().toString(36).substr(7, 3);

	this.joinMessage = "Bonjour!";

	this.client = new MockClient();

	this.init();


	this.client.connect();
}

util.inherits(MockXdcc, AbstractXdcc);

MockXdcc.prototype.episodesCommands = function(episodes, callback) {

	var commands = [];
	episodes.forEach(function(el, index) {
		commands.push({
            bot: 'bot',
            pack: '#2',
            cmd: 'xdccCommand'
          });
	});

	callback(commands);
}

module.exports = MockXdcc;