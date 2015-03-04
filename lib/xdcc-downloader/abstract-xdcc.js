var winston = require('../logger');
var nconf = require('../conf');
var util = require('util');
var fs = require('node-fs');
var path = require('path');
var clone = require('clone');

var Queue = require('../queue');

var AbstractXdcc = function() {

	this.downloadProgress = [];

	this.joined = false;

	this.joinDownloadCallBack = null;

	this.downloadQueue = [];

	this.currentDownload = null;

	this.downloadCallback = null;

};

AbstractXdcc.prototype.initClient = function () {
	var self = this;

	self.client.on('join', function(channel, nick, message) {
		self.joined = true;
		// say hello on join
		self.client.say(channel, self.joinMessage);
		
		winston.log('info', 'irc :' +self.name+ ' -- join channel :'+channel);

		if (self.joinDownloadCallBack != null) {
			// we are waiting for join, callback
			self.joinDownloadCallBack();
		}
	});

	self.client.on('xdcc-connect', function(meta) {
		winston.log('info', 'Connected: ' + util.inspect(meta, false, null));
		self.currentDownload.size = meta.length;
		self.currentDownload.file = meta.file;
		// connected to XDCC
		// create a progress array [5, 10, ...]
		var arr = Array.apply(null, Array(18));
		self.downloadProgress = arr.map(function (x, i) { return (i+1)*5 });
		winston.log('info', 'progress :'+self.downloadProgress);
	});

	self.client.on('xdcc-data', function(received) {
		// send progress every 5%
		var progress = received*100/self.currentDownload.size;
		if (self.downloadProgress.length > 0 && progress >= self.downloadProgress[0]) {
			var log = clone(self.currentDownload);
			log.cloud = true;
			log.progress = Math.floor(progress);
			winston.log('info', 'Download progress '+log.progress+'%', log);
			self.downloadProgress.shift();
		}
	});

	self.client.on('xdcc-end', function(received) {
		var log = clone(self.currentDownload);
		log.cloud = true;
		winston.log('info', 'Download completed', log);
		self.dowloadedFiles.push(self.currentDownload);
		// file downloaded, download next one
		self.downloadQueue.next();
	});

	self.client.on('notice', function(from, to, message) {
		// nothing here
	});

	self.client.on('error', function(message) {
		winston.error(message);
		self.downloadCallback(self.dowloadedFiles);
	});

};

AbstractXdcc.prototype.initQueue = function() {

	var self = this;

	this.downloadQueue.on('next', function(ep) {
		// store the current queue element
		self.currentDownload = ep;

		// compute file path
		var downloadPath = self.computeDownloadPath(self.currentDownload);

		self.currentDownload.path = downloadPath;

		winston.log('info', 'download path :'+downloadPath);

		// create path if not exists
		if (!fs.existsSync(downloadPath)) {
			winston.log('info', 'this path do not exists');
			fs.mkdirSync(downloadPath, 0777, true);
		}

		// send notif
		var log = clone(self.currentDownload);
		log.cloud = true;
		winston.log('info', 'Start Download', log);
		// xdcc send
		self.client.getXdcc(self.currentDownload.cmd.bot, 'xdcc send ' + self.currentDownload.cmd.pack, downloadPath);
	});

	this.downloadQueue.on('empty', function() {
		// callback de fin de tous les telechargement
		self.downloadEndCallback(self.dowloadedFiles);
	});
};

AbstractXdcc.prototype.computeDownloadPath = function(episode) {
	// compute folder name
	var seasonFolder = 'S';
	if (this.currentDownload.saison > 9) {
		seasonFolder+=this.currentDownload.saison;
	} else {
		seasonFolder+='0'+this.currentDownload.saison;
	}

	winston.log('info', 'join :'+nconf.get('download-path')+'+'+this.currentDownload.title+'+'+seasonFolder);
	var downloadPath = path.join(
		nconf.get('download-path'),
		this.currentDownload.title,
		seasonFolder
	);
	// always absolute path ...
	// if (!path.isAbsolute(downloadPath)) {
	//   winston.log('info', 'relative path for download');
	//   downloadPath = "./"+downloadPath;
	// }
	return downloadPath;
};

AbstractXdcc.prototype.episodesCommands = function (episodes, callback) {
	callback([]);
};

AbstractXdcc.prototype.downloadEpisodes = function (episodes, commands, callback) {

	// downloaded files init
	this.dowloadedFiles = [];

	var downloadElement = [];
	episodes.forEach(function(episode, index, array) {
		var command = commands[index];
		if (command != null) {
			var queueingEpisode = clone(episode);
			queueingEpisode.cmd = command;
			downloadElement.push(queueingEpisode);
		}
	});

	// create queue
	this.downloadQueue = new Queue(downloadElement);
	// init callback
	this.initQueue();

	this.downloadEndCallback = callback;

	// if already join begin queue process
	// else whait for callback
	if (this.joined) {
		this.downloadQueue.process();
	} else {
		var self = this;
		winston.log('info', 'use join dowload callback');
		this.joinDownloadCallBack = function() {
			self.downloadQueue.process();
		};
	}

};


AbstractXdcc.prototype.end = function () {
	this.client.disconnect();
};

module.exports = AbstractXdcc;