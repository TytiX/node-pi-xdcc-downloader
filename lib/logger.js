var winston = require('winston');

winston.add(winston.transports.File, { filename: './info.log' });

module.exports = winston;
