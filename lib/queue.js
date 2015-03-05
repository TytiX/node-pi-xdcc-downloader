var clone = require('clone');
var events = require('events');

var winston = require('./logger');

function Queue(queueElements) {

	winston.log('create queue with elements :'+queueElements);

	events.EventEmitter.call(this);

	queueElements = queueElements || null;

	this.queueList = [];
	if (queueElements != null) {
		this.queueList = clone(queueElements);
	}
	this.processing = false;

	winston.log('create queue with elements :'+this.queueList);

	this.current = null;

	this.process = function () {
		winston.log('info', 'begin process queue : '+this.queueList);
		if (!this.processing) {
			this.processing = true;
			this.next();
		}
	};

	this.put = function(element) {
		winston.log('info', 'put new element in queue');
		this.queueList.push(element);
	};

	this.next = function() {
		if (this.queueList == null || this.queueList.length == 0) {
			winston.log('info', 'queue is empty');
			this.emit('empty');
		} else {
			this.current = this.queueList.pop();
			winston.log('info', 'queue next element :'+this.current);
			this.emit('next', this.current);
		}
	};

	this.emptyQueue = function() {
		winston.log('info', 'empty queue');
		this.queueList.length = 0;
		this.emit('empty');
	}

};

Queue.prototype.__proto__ = events.EventEmitter.prototype;


module.exports = Queue;