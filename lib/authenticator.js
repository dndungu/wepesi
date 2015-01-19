"use strict";
var self = module.exports = {
	init: function(context, then){
		self.initUser(context, function(error, user){
			if(error)
				return then(error, null);
			self.setUser(context, user);
			self.findRoles(context, function(error, permissions){
				if(error)
					return then(error, null);
				self.setPermissions(context, permissions);	
				self.initModules(context, function(error, modules){
					if(error)
						return then(error, null);
					context.set('modules', modules);
					context.set("queue", modules.length);
					then(null, user);
				});
			});
		});
	},
	initUser : function(context, then){
		var query = {};
		var user_id = self.cookieUserId(context);
		if(user_id)
			query._id = user_id;
		var token = self.basicAuthToken(context);
		if(token)
			query.token = token;
		self.findUser(context, query, function(error, user){
			if(error)
				then(error, null);
			else
				then(null, user);
		});
	},
	cookieUserId: function(context){
		var cookieName = context.get("settings").cookie.name;
		var cookie = context.get("cookies").find(cookieName);
		var encryption = context.get("encryption");
		var user_id = cookie ? encryption.decrypt(cookie) : '';
		var uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
		return uuid.test(user_id) ? user_id : null;
	},
	basicAuthToken: function(context){
		var header = context.get('request').headers['authorization'] || "";
		var token = header.split(/\s+/).pop() || '';
		var auth = new Buffer(token, 'base64').toString();
		return auth.split(/:/)[0];
	},
	findUser: function(context, query, then){
		if(!query._id && !query.token)
			return then(null, context.get("user").createGuest(context));
		var storage = context.get("storage").get("global");
		storage.collection("user").find(query).toArray(function(error, items){
			if(error)
				return then(error, null);
			var user = items.length ? items[0] : context.get("user").createGuest(context, query._id);
			then(null, user);
		});
	},
	setUser: function(context, user){
		for(var i in user){
			context.get('user').set(i, user[i]);
		}
		context.get("user").setCookie(context, user._id);
	},
	findRoles: function(context, then){
		var roles = context.get('user').get("roles");
		var site_id = context.get('site')._id;
		var site_roles = roles[site_id];
		if(!site_roles)
			return then(null, [{permissions : []}]);
		var storage = context.get("storage").get("global");
		storage.collection("role").find({"name" : {$in : site_roles}}).toArray(function(error, roles){
			if(error)
				return then(error, null);
			then(null, roles);
		});
	},
	setPermissions: function(context, roles){
		var permissions = ["public.permission"];
		for(var i in roles){
			for(var j in roles[i].permissions){
				permissions.push(roles[i].permissions[j]);
			}
		}
		context.get('user').set('permissions', permissions);
	},
	initModules: function(context, then){
		var route = context.get('route');
		var assigned = context.get("user").get("permissions");
		var modules = [];
		if(!self.test(assigned, route.permissions))
			return then('You are not allowed to access this path.');
		for(var i in route.modules){
			var module = route.modules[i];
			var required = module.permissions;
			if(self.test(assigned, required)){
				modules.push(module);
			}
		}
		if(modules.length)
			then(null, modules);
		else
			then('There are no authorised modules on the path.', null);
	},
	test : function(assigned, required){
		for(var i in required){
			if(assigned.indexOf(required[i]) != -1)
				return true;
		}
		return false;
	}
};
