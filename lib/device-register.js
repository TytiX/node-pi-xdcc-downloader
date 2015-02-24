var deviceRegister = exports;
// import
var winston = require('./logger');
var Datastore = require('nedb');

// open reg database
var dbRegId = new Datastore({ filename: 'data/regId.db', autoload: true });

deviceRegister.register = function(registration, callback) {
  dbRegId.insert({regId: registration}, callback);
};

deviceRegister.find = function(registration, callback) {
  dbRegId.findOne({regId: registration}, callback);
};

deviceRegister.update = function(oldRegistration, registration, callback) {
  dbRegId.update({regId: oldRegistration}, {regId: registration}, {}, callback);
};
