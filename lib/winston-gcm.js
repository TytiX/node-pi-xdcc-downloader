var winston = require('winston');
var util = require('util');
var gcm = require('node-gcm');
var deviceRegister = require('./register-service');
var nconf = require('./conf');

var GcmLogger = winston.transports.CloudLogger = function (options) {
	//
	// Name this logger
	//
	this.name = 'GcmLogger';

	//
	// Set the level from your options
	//
	this.level = options.level || 'info';

	//
	// Configure your storage backing as you see fit
	//
	this.gcmSender = new gcm.Sender(nconf.get('gcm-key'));
};

//
// Inherit from `winston.Transport` so you can take advantage
// of the base functionality and `.handleExceptions()`.
//
util.inherits(GcmLogger, winston.Transport);

GcmLogger.prototype.log = function (level, msg, meta, callback) {
	//
	// Store this message and metadata, maybe use some custom logic
	// then callback indicating success.
	//
	var self = this;
	if (meta.cloud) {
		var gcmMsg = new gcm.Message({
			delayWhileIdle: true,
			data: {
				meta: meta,
				msg: msg
			}
		});
		deviceRegister.findRegistered(function(registrationIds) {
			if (registrationIds == null) {
				winston.log('warn', 'no registration ids found')
			} else {
				self.gcmSender.send(gcmMsg, registrationIds, function (err, result) {
					if(err) {
						winston.log('error', err);
						deviceRegister.handleError(registrationIds, err);
					}
				});
			}
			callback(null, true);
		});
	} else {
		callback(null, true);
	}

};

module.exports = winston;