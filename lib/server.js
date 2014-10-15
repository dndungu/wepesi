"use strict";

var core = require(__dirname + "/core.js");
var fs = require("fs");
var url = require("url");
var utilities = require(__dirname + "/utilities/utilities.js");
var storage = utilities.storage;
var settings;
var self = {
	respond: function(request, response){
		var context = self.context();
		context.get("cookies").parseCookie(request.headers['cookie']);
		context.set("request", request);
		context.set("response", response);
		var host = request.headers.host ? request.headers.host.split(':')[0] : settings.server.host;
		context.set("host", host);
		context.set("method", request.method.toLowerCase());
		var url_parts = url.parse(request.url.trim(), true, true);
		context.set("uri", url_parts.pathname);
		context.set("query", url_parts.query);
		context.set("storage", storage);
		core.router.init(context);
		core.authenticator.init(context);
		core.cache.init(context);
		core.operator.init(context);
		context.get('broker').emit({type : 'server.end', data : context});
	},
	context: function(){
		var context = new utilities.context();
		context.init();
		context.set("settings", settings);
		var encryption = new utilities.encryption();
		var broker = new utilities.broker();
		broker.log = context.log;
		var cookies = new utilities.cookies();
		var publisher = new utilities.publisher();
		var user = new utilities.user();
		context.set("user", user.init());
		context.set("encryption", encryption.init(settings.key));
		context.set("broker", broker.init());
		context.set("cookies", cookies.init());
		context.set('publisher', publisher.init());
		return context;
	},
	http: function(){
		var http = require('http');
		http.createServer(this.respond).listen(settings.server.port, settings.server.host);
	},
	https: function(){
		var https = require('https');
		var ssl = {
			key: fs.readFileSync(settings.server.key, 'utf8'),
			cert: fs.readFileSync(settings.server.cert, 'utf8')
		};
		https.createServer(ssl, this.respond).listen(settings.server.port, settings.server.host);
	}
};

module.exports = {
	listen: function(){
		settings = arguments[0];
		storage.db(settings.database).open(function(error, db){
			if(error)
				return console.log(error.toString());
			storage.set("global", db);
			if(settings.server.secure)
				self.https(settings);
			else
				self.http(settings);
		});
	}
};
