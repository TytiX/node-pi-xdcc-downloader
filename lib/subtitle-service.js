var opensubtitles = require('opensubtitles-client');
var request = require('request');
var util = require('util');
var zlib = require('zlib');
var fs = require('fs');
var clone = require('clone');

var showNameUtil = require('./series-utils');
var winston = require('./logger');

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
            self.nextSearch();
        }
    });

}

SubtitleService.prototype.downloadSubtitles = function downloadSubtitles(downloadedFilesNoSubtitles, callback) {

    this.subtitleSearchQueue = downloadedFilesNoSubtitles.slice(0, downloadedFilesNoSubtitles.length);;

    winston.log('info', 'subtitleSearchQueue :'+util.inspect(this.subtitleSearchQueue));

    this.finishDownloadSubtitleCallback = callback;

    if (this.token == null) {
        // if not connected this will trigger
        // nextSearch after connection
        this.loginStartSearchCallback = true;
    } else {
        // begin search queue
        this.nextSearch();
    }
}

SubtitleService.prototype.nextSearch = function nextSearch() {

    if (this.subtitleSearchQueue.length == 0) {
        // queue is empty logout
        opensubtitles.api.logout(this.token);
        // call callback of downloadSubtitles
        this.finishDownloadSubtitleCallback();
    } else {
        // next element in queue
        this.currentSearch = this.subtitleSearchQueue.pop();

        // try 3 spelling for the current search
        this.searchesForCurrentEpisode = [
            this.currentSearch.fileName,
            this.currentSearch.title + ' ' + this.currentSearch.code,
            showNameUtil.toSearchTitle(this.currentSearch.title) + '.' + this.currentSearch.code
        ];

        winston.log('info', 'searches :'+util.inspect(this.searchesForCurrentEpisode));

        var self = this;
        // search for spelling of the current search
        this.nextCurrentSearch(function() {
            self.nextSearch();
        });
    }

}

SubtitleService.prototype.nextCurrentSearch = function nextCurrentSearch(callback) {

    if(this.searchesForCurrentEpisode.length == 0) {
        // no spelling for current search anymore
        // there is no subtitle for this episode
        var log = clone(this.currentSearch);
        log.cloud = true;
        winston.log('info', 'no subtitles', log);
        //next search
        callback();
    } else {
        var self = this;

        var search = this.searchesForCurrentEpisode.pop();
        // try a spelling
        this.search(search, function(results) {
            if (results == null || results.length == 0) {
                // no result with current spelling
                // try next spelling
                self.nextCurrentSearch(callback);
            } else {
                //empty the search
                self.searchesForCurrentEpisode.length = 0;

                // send message to
                var log = clone(self.currentSearch);
                log.cloud = true;
                winston.log('info', 'subtitles downloaded', log);
                //update current episode
                episodeService.updateSubtitles(self.currentSearch, function() {
                    callback();
                });
            }
        });
    }
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