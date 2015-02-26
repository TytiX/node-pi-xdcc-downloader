var logger = require('./logger');

var CronJob = require('cron').CronJob;
var job = new CronJob('* * * * * *', function() {
	// every second
	logger.log('info', 'test cron task');
}, null, true, "Europe/Paris");

module.exports = job;