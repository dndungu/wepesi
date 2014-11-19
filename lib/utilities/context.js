"use strict";
var fs = require('fs');
var http = require('http');
module.exports = function(){

	var self = {};

	return {
		init: function(){
			self.store = {};
			return this;
		},
		kill: function(){
			self = {};
			return this;
		},
		set : function(name, value) {
			self.store[name] = value;
			return this;
		},
		get : function(name) {
			return self.store.hasOwnProperty(name) ? self.store[name] : null;
		},
		crash: function(code, error){
			var response = this.get("response");
			response.writeHead(code, {'Content-Type': 'text/plain'});
			response.end("{error : " + http.STATUS_CODES[code] + "}");
		},
		log: function(severity, message){
			var logfile = self.store.settings.debug.file;
			var uri = self.store.uri;
			var ip = self.store.request.connection.remoteAddress;
			var method = self.store.method.toUpperCase();
			var host = self.store.host;
			if(severity > self.store.settings.debug.level)
				return;
			var line = '\r' + '(' +severity + ') ' + (new Date()) + ' {' + ip + '} [' + method + '] ' + ' {' + host + uri + '} ' + (JSON.stringify(message));
			fs.appendFile(logfile, line, function(){
				console.log(line);
			});
			return this;
		}
	}
};
