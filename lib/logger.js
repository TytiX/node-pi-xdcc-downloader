'user strict';

var winston = require('winston');

exports = new (winston.Logger)({
    transports: [
      new (winston.transports.Console)(),
      new (winston.transports.File)({ filename: 'pi-manager.log' })
    ]
});
