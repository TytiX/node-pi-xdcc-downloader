var appDownloader = require('./lib/pi-downloader');

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