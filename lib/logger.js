var winston = require('./winston-gcm');

winston.add(winston.transports.File, { filename: './info.log' });
winston.add(winston.transports.CloudLogger, {});

module.exports = winston;
