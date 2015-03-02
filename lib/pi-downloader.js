var nconf = require('./conf');
var winston = require('./logger');

var deviceRegister = require('./register-service');
var episodeService = require('./episodes-service');
var Infexious = require('./xdcc-downloader/infexious-xdcc');

var downloaderApp = exports;

