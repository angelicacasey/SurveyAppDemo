var express = require('express'),
	app = express(),
	PORT = process.env.PORT || 8080,
	bodyParser = require('body-parser');

app.use(function (req, res, next) {
 //Enabling CORS
 res.header("Access-Control-Allow-Origin", "*");
 res.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
 res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, x-client-key, x-client-token, x-client-secret, Authorization");
 next();
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var routes = require('./approuter.js');
routes(app);

app.listen(PORT, () =>{
	console.log('Server listening on port ' + PORT + '...');
});