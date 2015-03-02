var opensubtitles = require('opensubtitles-client');
var request = require('request');
var showNameUtil = require('./series-utils');

var SubtitleService = function SubtitleService() {
    this.token = null;
    this.loginStartSearchCallback = null;
    this.finishDownloadSubtitleCallback = null;
    this.currentSearch = null;
    
    var self = this;

    opensubtitles.api.login().done(function(token){

        self.token = token;

        if (self.loginStartSearchCallback != null) {
            self.loginStartSearchCallback();
        }
    });

}

SubtitleService.prototype.downloadSubtitles = function(downloadedFilesNoSubtitles, callback) {

    this.subtitleSearchQueue = new Array(downloadedFilesNoSubtitles);

    this.finishDownloadSubtitleCallback = callback;

    if (this.token == null) {
        this.loginStartSearchCallback = this.nexSearch();
    } else {
        this.nexSearch();
    }
}

SubtitleService.prototype.nextSearch = function() {

    if (this.subtitleSearchQueue.length == 0) {
        opensubtitles.api.logout(this.token);
        this.finishDownloadSubtitleCallback();
    } else {
        this.currentSearch = this.subtitleSearchQueue.pop();

        this.searchesForCurrentEpisode = [
            this.currentSearch.filename,
            this.currentSearch.title + ' ' + this.currentSearch.code,
            showNameUtil.toSearchTitle(this.currentSearch.title) + '.' + this.currentSearch.code
        ];
        var self = this;
        this.nextCurrentSearch(function() {
            self.nexSearch();
        });
    }

}

SubtitleService.prototype.nextCurrentSearch = function(callback) {
    if(this.searchesForCurrentEpisode.length == 0) {
        callback();
    } else {
        var self = this;

        var search = this.searchesForCurrentEpisode.pop();

        this.search(search, function(results) {
            if (results == null || results.length == 0) {
                self.nextCurrentSearch(callback);
            } else {
                this.searchesForCurrentEpisode.length = 0;
                callback();
            }
        });
    }
}

SubtitleService.prototype.search = function(episode, callback) {
    opensubtitles.api.search(token, 'fre', episode).done( function(results){
        winston.log('info', 'sub search result length :'+results.length);

        results.forEach(function(result, index, array) {

            var filename = fileNoSubtitles.dirPath + '/' + fileNoSubtitles.fileName;
            if (index > 0) {
            filename += '.' +index+ '.';
            };
            filename += '.srt';

            var downloadLink = result.SubDownloadLink;
            request(downloadLink).pipe(zlib.createGunzip()).pipe(fs.createWriteStream(filename));
            winston.log('info', 'extract :'+filename);
        });

        callback(results);
    });
}

module.exports = SubtitleService;