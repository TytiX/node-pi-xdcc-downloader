var Datastore = require('nedb');
var logger = require('winston');

// open reg database
var dbRegId = new Datastore({ filename: 'data/regId.db', autoload: true });

var registerService = {};

registerService.register = function(registration, callback) {
	if (!registration || registration === ""){
		logger.log('info', 'no registration id');
		callback({code:"401", msg:"no registration id sended"});
	} else {
		dbRegId.findOne({regId : registration}, function (error, doc) {
			if (error) {
				logger.log('error', 'error finding in database');
				callback({code:"403", msg:"error finding registration :"+registration});
			} else if (doc) {
				logger.log('info', 'registration already in database :'+registration);
				callback({code:"501", msg:"registration already present :"+registration})
			} else {
				dbRegId.insert({regId : registration}, function (error, newDoc) {
					if (error) {
						logger.log('error', 'error insertion in database');
						callback({code:"402", msg:"erreur insertion base"})
					} else {
						callback({code:"200"});
					}
				});
			}
		});
	}
};

registerService.findRegistered = function(callback) {
	var registrationIds = [];
	dbRegId.find({}, function (err, docs) {
		docs.forEach(function(doc, index, array) {
			registrationIds.push(doc.regId);
		});
		logger.log('info', 'find :'+registrationIds);
		callback(registrationIds);
	});
};

registerService.handleError = function(registrationIds, error) {
	// see what to do with the error
};

module.exports = registerService;