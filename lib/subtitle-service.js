var opensubtitles = require('opensubtitles-client');
var request = require('request');
var util = require('util');
var zlib = require('zlib');
var fs = require('fs');
var clone = require('clone');

var showNameUtil = require('./series-utils');
var winston = require('./logger');

var Queue = require('./queue');

var episodeService = require('./episodes-service');

var SubtitleService = function SubtitleService() {
    this.token = null;
    this.loginStartSearchCallback = false;
    this.finishDownloadSubtitleCallback = null;
    this.currentSearch = null;
    
    var self = this;

    opensubtitles.api.login().done(function(token){

        self.token = token;

        if (self.loginStartSearchCallback) {
            // begin searches
            self.subtitleSearchQueue.process();
        }
    });

}

SubtitleService.prototype.downloadSubtitles = function downloadSubtitles(downloadedFilesNoSubtitles, callback) {

    this.subtitleSearchQueue = new Queue(downloadedFilesNoSubtitles);
    this.initSearchQueue(callback);

    if (this.token == null) {
        // if not connected this will trigger
        // process queue after connection
        this.loginStartSearchCallback = true;
    } else {
        // begin search queue
        this.subtitleSearchQueue.process();
    }
}

SubtitleService.prototype.initSearchQueue = function (endCallback) {
    var self = this;
    //current episode search
    this.subtitleSearchQueue.on('next', function(downloadedFile) {

        self.currentSearch = downloadedFile;

        self.spellingSearchQueue = new Queue([
            self.currentSearch.fileName,
            self.currentSearch.title + ' ' + self.currentSearch.code,
            showNameUtil.toSearchTitle(self.currentSearch.title) + '.' + self.currentSearch.code
        ]);

        self.initSpellCheckQueue();
        self.spellingSearchQueue.process();

    });

    // search end
    this.subtitleSearchQueue.on('empty', function() {
        opensubtitles.api.logout(self.token);
        endCallback();
    });

}

SubtitleService.prototype.initSpellCheckQueue = function() {
    var self = this;
    // search current spelling
    this.spellingSearchQueue.on('next', function(spell) {
        self.search(spell, function(results) {
            if (results && results != null && results.length > 0) {
                self.spellingSearchQueue.emptyQueue();
            } else {
                self.spellingSearchQueue.next();
            }
        });
    });

    // when spelling is empty search for next episode
    this.spellingSearchQueue.on('empty', function() {
        self.subtitleSearchQueue.next();
    });
}

SubtitleService.prototype.search = function search(episode, callback) {
    var self = this;
    //search on open subtitle api
    opensubtitles.api.search(self.token, 'fre', episode).done( function(results){
        winston.log('info', 'sub search result length :'+results.length);
        winston.log('info', 'episode :'+util.inspect(self.currentSearch));
        // for each result we create a file
        results.forEach(function(fileNoSubtitles, index, array) {

            winston.log('info', 'sub :'+util.inspect(fileNoSubtitles));

            var filename = self.currentSearch.dirPath + '/' + self.currentSearch.fileName;
            if (index > 0) {
            filename += '.' +index+ '.';
            };
            filename += '.srt';

            var downloadLink = fileNoSubtitles.SubDownloadLink;
            request(downloadLink).pipe(zlib.createGunzip()).pipe(fs.createWriteStream(filename));

            winston.log('info', 'extract :'+filename);
        });

        callback(results);
    });
}

module.exports = SubtitleService;