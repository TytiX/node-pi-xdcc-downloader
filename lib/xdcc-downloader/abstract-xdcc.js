var winston = require('../logger');
var nconf = require('../conf');
var util = require('util');
var fs = require('node-fs');
var path = require('path');
var clone = require('clone');

var AbstractXdcc = function() {

  this.downloadProgress = [];

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
    self.downloadNext();
  });

  self.client.on('notice', function(from, to, message) {
    if (to == self.user) {
      //winston.log('info', "[notice]", message);
    }
  });

  self.client.on('error', function(message) {
    winston.error(message);
    self.downloadCallback(self.dowloadedFiles);
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
    if (command != null) {
      var queueingEpisode = clone(episode);
      queueingEpisode.cmd = command;
      self.downloadQueue.push(queueingEpisode);
    }
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
    var log = clone(this.currentDownload);
    log.cloud = true;
    winston.log('info', 'Start Download', log);
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

    this.currentDownload.path = downloadPath;

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