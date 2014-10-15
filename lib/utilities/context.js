"use strict";
var fs = require('fs');
module.exports = function(){

	var self = {};

	return {
		init: function(){
			self.store = {};
			return this;
		},
		destroy: function(){
			self.store = {};
			return this;
		},
		set : function(name, value) {
			self.store[name] = value;
			return this;
		},
		get : function(name) {
			return self.store.hasOwnProperty(name) ? self.store[name] : null;
		},
		publish: function(){
			this.set("queue", (this.get("queue") - 1));
			if(this.get("queue") > 0)
				return this;
			this.get("publisher").write(this);
		},
		redirect: function(url){
			var publisher = this.get("publisher");
            publisher.header("Location", url);
            publisher.statusCode(302);
            publisher.writeHead(this);
            this.get("response").end();
			this.destroy();
		},
		log: function(severity, message){
			var logfile = self.store.settings.path + self.store.settings.debug.file;
			var uri = self.store.uri;
			var method = self.store.method;
			if(severity > self.store.settings.debug.level)
				return;
			var line = (new Date()) + ' (' + severity + ') : [' + uri + '] ' + ' {' + method + '} ' + (JSON.stringify(message)) + '\n';
			fs.appendFile(logfile, line, function(){
				console.log(line);
			});
			return this;
		}
	}
};
