var winston = require('../logger');
var nconf = require('../conf');
var util = require('util');
var fs = require('node-fs');
var path = require('path');

var AbstractXdcc = function() {

  this.joined = false;

  this.joinDownloadCallBack = null;

  this.downloadQueue = [];

  this.currentDownload = null;

  this.downloadCallback = null;

};

AbstractXdcc.prototype.init = function init() {
	var self = this;

	self.client.on('join', function(channel, nick, message) {
		self.joined = true;
		self.client.say(channel, self.joinMessage);
    winston.log('info', 'irc :' +self.name+ ' -- join channel :'+channel);
    if (self.joinDownloadCallBack != null) {
      self.joinDownloadCallBack();
    }
	});

	self.client.on('xdcc-connect', function(meta) {
    winston.log('info', 'Connected: ' + util.inspect(meta, false, null));
    self.currentDownload.size = meta.length;
    self.currentDownload.file = meta.file;
    // start recieving
    // put file name in current download
  });

  self.client.on('xdcc-data', function(received) {
    // progress bar ???
    var progress = received*100/self.currentDownload.size;
    if (progress%5 == 0) {
      winston.log('info', 'received :'+received);
    }
  });

  self.client.on('xdcc-end', function(received) {
    var log = self.currentDownload;
    log.cloud = true;
    winston.log('info', 'Download completed', log);
    self.dowloadedFiles.push(self.currentDownload);
    self.downloadNext();
  });

  self.client.on('notice', function(from, to, message) {
    if (to == self.user) {
      //winston.log('info', "[notice]", message);
    }
  });

  self.client.on('error', function(message) {
    winston.error(message);
  });

};

AbstractXdcc.prototype.episodesCommands = function episodesCommands(episodes, callback) {
	callback([]);
};

AbstractXdcc.prototype.downloadEpisodes = function downloadEpisodes(episodes, commands, callback) {
  var self = this;
  self.downloadQueue = [];
  self.dowloadedFiles = [];

  episodes.forEach(function(episode, index, array) {
    var command = commands[index];
    self.downloadQueue.push({
      episode : episode,
      cmd : command
    });
  });

  self.downloadCallback = callback;

  if (self.joined) {
    this.downloadNext();
  } else {
    winston.log('info', 'use join dowload callback');
    this.joinDownloadCallBack = this.downloadNext;
  }

};

AbstractXdcc.prototype.downloadNext = function downloadNext() {

  if (this.downloadQueue.length == 0) {
    this.downloadCallback(this.dowloadedFiles);
  } else {
    this.currentDownload = this.downloadQueue.pop();
    var log = this.currentDownload;
    log.cloud = true;
    winston.log('info', 'Start Download', log);
    var seasonFolder = 'S';
    if (this.currentDownload.episode.saison > 9) {
      seasonFolder+=this.currentDownload.episode.saison;
    } else {
      seasonFolder+='0'+this.currentDownload.episode.saison;
    }

    var downloadPath = path.join(
      nconf.get('download-path'),
      this.currentDownload.episode.title,
      seasonFolder
    );

    if (!path.isAbsolute(downloadPath)) {
      winston.log('info', 'relative path for download');
      downloadPath = "./"+downloadPath;
    }

    winston.log('info', 'download path :'+downloadPath);

    if (!fs.existsSync(downloadPath)) {
      winston.log('info', 'this path do not exists');
      fs.mkdirSync(downloadPath, 0777, true);
    } 

    this.client.getXdcc(this.currentDownload.cmd.bot, 'xdcc send ' + this.currentDownload.cmd.pack, downloadPath);

  }

};


AbstractXdcc.prototype.end = function end() {
  this.client.disconnect();
};

module.exports = AbstractXdcc;