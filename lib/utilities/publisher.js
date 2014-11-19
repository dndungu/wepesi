"use strict";

var fs = require('fs');
var zlib = require("zlib");

module.exports = function(){

	var self = {};

	return {
		init: function(){
			self.statusCode = 200;
			self.headers = {};
			self.body = {};
			return this;
		},
		push: function(module, handler, content){
            self.body[module] = self.body[module] ? self.body[module] : [];
            self.body[module][handler] = content;
            return this;		
		},
		redirect: function(context, url){
            this.header("Location", url);
            this.statusCode(302);
            this.writeHead(context);
			return this;
		},
		end: function(context){
			context.get("response").end();
		},
		write: function(context){
			this.writeHead(context);
			this.writeContent(context);
			return this;
		},
		writeHead: function(context){
            var response = context.get("response");
            if(response.headersSent)
                return this;
            if(!this.header("content-encoding"))
                this.header("content-encoding", this.encoding(context));
            if(!this.header("content-type"))
                this.header("content-type", context.get("route").type);
            var cookies = context.get("cookies").toSetCookieString();
            if(cookies)
                this.header("set-cookie", cookies);
            response.writeHead(this.statusCode(), this.headers());
            return this;	
		},
		writeContent: function(context){
			var response = context.get("response");
			var stream = this.stream(context);
			switch(this.encoding(context)){
				case "gzip":
					var gzip = zlib.createGzip();
					stream.pipe(gzip).pipe(response);
					break;
				case "deflate":
					var deflate = zlib.createDeflate();
					stream.pipe(deflate).pipe(response);
					break;
				default:
					stream.pipe(response);
					break;
			}
			return this;
		},
        statusCode: function(statusCode){
            if(statusCode)
                self.statusCode = statusCode;
            return self.statusCode;
        },
        header: function(key, value){
            key = key.toLowerCase();
            if(value)
                self.headers[key] = value;
            else
                return self.headers[key];
            return this;
        },
        headers: function(){
            return self.headers;
        },
        stream: function(context){
            var route = context.get('route');
            switch(route.type){
                case "application/json":
                    return this.streamJSON(context);
                case "application/xml":
                    return this.streamXML();
                default:
                    return this.streamText();
            }
        },
        streamJSON: function(context){
			var that = this;
            var stream = new (require('stream'));
            stream.pipe = function(reader, options){
                if(!options)
                    options = {end : true};
				if(context.get("route").sync)
	                reader.write(JSON.stringify(self.body, null, 4));
				else
					reader.write(JSON.stringify(that.toArray(), null, 4));
                if(options.end)
                    reader.end();
                reader.end();
                return reader;
            };
            return stream;
        },
        streamXML: function(){
            var transform = function(content){
                var xml = [];
                for(var i in content){
                    var name = isNaN(i) ? i : 'node-' + String(i);
                    var value = ['number', 'boolean', 'string'].indexOf(typeof content[i]) == -1 ? transform(content[i]) : String(content[i]);
                    xml.push('<' + name + '>' + value + '</' + name + '>');
                }
                return xml;
            };
            var stream = new (require('stream'));
            stream.pipe = function(reader, options){
				if(!options)
					options = {end : true};
                var xml = transform({data : self.body});
                xml.unshift('<?xml version="1.0"?>');
                reader.write(xml.join("\n"));
				if(options.end)
                	reader.end();
                return reader;
            };
            return stream;
        },
		streamText: function(){
			var body = this.toArray();
			var stream = new (require('stream'));
			stream.pipe = function(reader, options){
				if(!options)
					options = {end : true};
				reader.write(body.length == 1 ? body[0] : body.join('\n'));
				if(options.end)
	                reader.end();
                return reader;				
			};
			return stream;
		},
		toArray: function(){
			var text = [];
			for(var i in self.body){
				for(var j in self.body[i]){
					text.push(self.body[i][j]);
				}
			}
			return text;			
		},
        encoding: function(context){
            var accept = String(context.get("request").headers["accept-encoding"]);
            var encoding = "identity";
            if(accept.indexOf("deflate") != -1)
                encoding = "deflate";
            if(accept.indexOf("gzip") != -1)
                encoding = "gzip";
            return encoding;
        }
	};
};
