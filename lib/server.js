"use strict";

var core = require(__dirname + "/core.js");
var fs = require("fs");
var url = require("url");
var utilities = require(__dirname + "/utilities/utilities.js");
var storage = utilities.storage;
var settings;
var self = {
	init: function(request, response){
		var context = self.context();
		context.get("cookies").parseCookie(request.headers['cookie']);
		context.set("request", request);
		context.set("response", response);
		var host = request.headers.host ? request.headers.host.split(':')[0] : settings.server.host;
		context.set("host", host);
		context.set("method", request.method.toLowerCase());
		var parts = url.parse(request.url.trim(), true, true);
		context.set("uri", parts.pathname);
		console.time('request-' + context.get('uri'));
		context.set("query", parts.query);
		context.set("storage", storage);
		response.on('finish', function(){
			console.timeEnd('request-' + context.get('uri'));
		});
		self.execute(context);
	},
	execute: function(context){
//	console.time('router-' + context.get('uri'));
		core.router.init(context, function(error, routes){
//			console.timeEnd('router-' + context.get('uri'));
			if(error)
				return context.crash(404, error);
//			console.time('authenticator-' + context.get('uri'));
			core.authenticator.init(context, function(error, permissions){
//				console.timeEnd('authenticator-' + context.get('uri'));
				if(error)
					return context.get("publisher").redirect(context, "/sign-in").end(context);
//				console.time("operator-" + context.get('uri'));
				core.operator.init(context, function(error, data){
//					console.timeEnd("operator-" + context.get('uri'));
					if(error)
						return context.crash(500, error);
				});
			});
		});
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
		http.createServer(this.init).listen(settings.server.port, settings.server.host);
	},
	https: function(){
		var https = require('https');
		var ssl = {
			key: fs.readFileSync(settings.server.key, 'utf8'),
			cert: fs.readFileSync(settings.server.cert, 'utf8')
		};
		https.createServer(ssl, this.init).listen(settings.server.port, settings.server.host);
	}
};

module.exports = {
	listen: function(){
		settings = arguments[0];
		storage.connect(settings.database, function(error, db){
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
