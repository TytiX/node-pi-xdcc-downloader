var appDownloader = require('./lib/pi-downloader');

var Queue = require('./lib/queue');
var winston = require('./lib/logger');

var port = 3000;

// appDownloader.start(
//   port, 
//   null /* '0 30 11,17 * * 1-5' */, 
//   [
//     5010, // Arrow
//     196, // Grey's Anatomy
//     14, // TBBT
//     1474, // Rizzoli & Isles
//     6197 // The Blacklist
//   ]
// );

// var dlQueue = new Queue([1, 2, 3, 4, 5]);

// dlQueue.on('next', function(number) {
// 	winston.log('info', 'dl queue element :'+number);
// 	setTimeout(function() {
// 		dlQueue.next();
// 	}, 1000);
// });

// dlQueue.on('empty', function() {
// 	winston.log('info', 'dl queue empty');
// });

// dlQueue.process();

appDownloader.testDownload();

// appDownloader.testEpisodesSuptitle();

// appDownloader.testBetaSeriesUpdate([
//     5010, // Arrow
//     196, // Grey's Anatomy
//     14, // TBBT
//     1474, // Rizzoli & Isles
//     6197 // The Blacklist
//   ]
// );