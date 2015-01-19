"use strict";
module.exports = function(){
	var self = {
		store: {}
	};
	return {
		init: function(){
			for(var i in arguments[0]){
				self.store[i] = arguments[0][i];
			}
			return this;
		},
		set: function(key, value){
			self.store[key] = value
			return this;
		},
		get: function(key){
			return self.store[key] ? self.store[key] : null;
		},
		hasPermission: function(){
			var permission = arguments[0];
			return (self.store.permissions.indexOf(arguments[0]) != -1);
		},
		createGuest: function(context, _id){
			if(!_id) 
				_id = context.get("storage").uuid();
			var user = {
				_id : _id,
				roles : ["guest"],
				guest : true
			};
			this.setCookie(context, user._id);
			return user;
		},
		setCookie: function(context, _id){
	        var value = context.get("encryption").encrypt(_id);
    	    var name = context.get("settings").cookie.name;
        	var age = context.get("settings").cookie.age;
	        var expires = (new Date((new Date()).valueOf() + (age*1000))).toUTCString();
    	    var secure = context.get("settings").server.secure;
        	var cookie = {
	            name: name,
    	        value: value,
        	    path: "/",
            	expires: expires,
	            secure: secure,
    	        httpOnly: true
        	};
	        context.get("cookies").push(cookie);
		}
	}
};
