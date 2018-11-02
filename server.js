var express = require('express'),
	app = express(),
	PORT = process.env.PORT || 8080,
	bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var routes = require('./approuter.js');
routes(app);

app.listen(PORT, () =>{
	console.log('Server listening on port ' + PORT + '...');
});