"use strict";

var redis = require('redis');
var client = redis.createClient();

var self = module.exports = {
	init: function(context, then){
		var modules = context.get('modules');
		var method = context.get('method');
		self.initPublish(context, then);
		for(var i in modules){
			var module = modules[i];
			if(method == 'get' && module.cache > 0)
				self.find(context, module);
			else
				self.execute(context, module);
		}
	},
	initPublish: function(context, then){
		context.get("broker").on(["module.data", "module.error"], function(event){
			context.set("queue", (context.get("queue") - 1))
			if(event.data.data)
				context.get("publisher").push(event.data.module.module, event.data.module.handler, event.data.data);
            if(context.get("queue") > 0)
				return;
           	context.get("publisher").write(context);
			then(null, context);
		});
	},
	find: function(context, module){
		var key = self.createKey(context, module);
		client.get(key, function(error, data){
			if(data)
				context.get("broker").emit({type : "module.data", data : {module : module, data : data}});
			else
				self.execute(context, module);
		});
	},
	execute: function(context, module){
		try {
			var method = context.get('method');
			var handler = require(module.module);
			if(!handler[module.handler] || !handler[module.handler][method])
				return context.get("broker").emit({type : "module.error", data : module.module + " " + module.handler + " " + method + " is not a function"});
			handler[module.handler][method](context, function(error, data){
				if(error)
					return context.get("broker").emit({type : "module.error", data : {module : module, error : error}});
				if(module.cache) {
					var key = self.createKey(context, module);
					client.set(key, data);
					client.expire(key, module.cache);
				}
				context.get("broker").emit({type : "module.data", data : {module : module, data : data}});
			});
		}catch(error){
			context.get("broker").emit({type : "module.error", data : {module : module, error : error.toString()}});
		}
	},
	createKey: function(context, module){
		var key = [];
		key.push(context.get('site')._id);
		key.push(module.module);
		key.push(module.handler);
		key.push(context.get('uri').replace('/', '-'));
		var query = context.get("query");
		query = query ? query : {};
		for(var i in query){
			key.push(i + '.' + query[i]);
		}
		return key.join(':');
	}
};
