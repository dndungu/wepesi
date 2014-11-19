"use strict";

var fs = require("fs");
var cache = {};

var self = module.exports = {
	init: function(context, then){
		self.initSite(context, function(error, site){
			if(error)
				return then(error, null);
			self.initService(context, function(error, service){
				if(error)
					return then(error, null);
				self.initRoute(context, function(error, route){
					if(error)
						return then(error, null);
					context.set("route", route);
					self.initStorage(context, function(error, db){
						context.get("storage").set("local", db);
						then(null, context.get("service").routes);
					});
				});
			});
		});
	},
	initSite: function(context, then){
		var storage = context.get("storage").get("global");
		var collection = storage.collection("site");
		var query = {
			alias : context.get('host')
		};
		collection.find(query).toArray(function(error, items){
			if(error)
				return then(error, null)
			if(!items.length)
				return then('Could not find any service for host ' + context.get("host"), null);
			context.set('site', items[0]);
			then(null, items[0]);
		});
	},
	initService : function(context, then){
		try{
			var site = context.get('site');
			var service = require(context.get("site").service);
			context.set("service", service);
			then(null, service);
		}catch(error){
			context.log(1, error.stack);
			then(error.toString(), null);
		}
	},
	initRoute: function(context, then){
		context.set('parameters', {});
		var routes = context.get('service').routes;
		var uri = context.get('uri');
		for(var i in routes){
			var route = routes[i];
			for(var j in route.matches){
				var match = route.matches[j];
				if(uri == match)
					return then(null, route);
				var variables = match.match(/<([^>]+)>/g);
				if(!variables)
					continue;
				var root = match.substring(0, match.indexOf(variables[0]));
				if(uri.substring(0, root.length) != root)
					continue;
				var parameters = self.parameters(uri.slice(root.length - 1), match.slice(root.length - 1));
				if(!parameters)
					continue;
				context.set('parameters', parameters);
				return then(null, route);
			}
		}
		then('Could not match route for ' + uri, null);
	},
	initStorage: function(context, then){
		var site_id = context.get("site")._id;
		if(cache[site_id])
			return then(null, cache[site_id]);
		var settings = context.get('site').settings.database;
		settings.server_options = context.get('settings').database.server_options;
		settings.db_options = context.get('settings').database.db_options;
		context.get('storage').db(settings).open(function(error, db){
			if(error)
				return then(error, null);
			cache[site_id] = db;
			then(null, db);
		});
	},
	parameters: function(uri, match){
		var variables = match.match(/<([^>]+)>/g);
		var parts = self.split(match);
		var keys = self.keys(variables);
		var values = [];
		var i = 0;
		while(true){
			if(!uri.length)
				break;
			uri = uri.split(parts[i]);
			uri.shift();
			var value = uri[0];
			uri = uri.join(parts[i]);
			i += 2;
			if(i >= parts.length)
				value = uri;
			value && value.length && values.push(value);
			if(i >= parts.length)
				break;
		}
		if(keys.length != values.length)
			return;
		var parameters = {};
		for(var i in keys){
		    parameters[keys[i]] = values[i];
		}
		return parameters;
	},
	split: function(match){
		var parts = match.split(/<([^>]+)>/g);
		var result = [];
		for(var i in parts){
			if(parts[i].length)
				result.push(parts[i]);
		}
		return result;
	},
	keys: function(variables){
		var keys = [];
		for(var i in variables){
			var key = variables[i].replace(/[<>]/g, '');
		    keys.push(key);
		}
		return keys;
	}
};
