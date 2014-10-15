var server = require("./lib/server.js");
var settings = require("./settings.json");
settings.path = __dirname + "/";
server.listen(settings);
