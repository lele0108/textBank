// server.js

// BASE SETUP
// =============================================================================

// call the packages we need
var express    = require('express');        // call express
var app        = express();                 // define our app using express
var bodyParser = require('body-parser');
var wit = require('node-wit');
var ACCESS_TOKEN = "IBENYNTQT2C36HSUMM6Q5EGBPSJ7EUUU";
var CAPONE_KEY = "5299a04263d592b885593d6d6d21aafc";
var request = require('request');

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var port = process.env.PORT || 8080;        // set our port

// ROUTES FOR OUR API
// =============================================================================
var router = express.Router();              // get an instance of the express Router

router.use(function(req, res, next) {
    // do logging
    console.log('Something is happening.');
    next(); // make sure we go to the next routes and don't stop here
});


// test route to make sure everything is working (accessed at GET http://localhost:8080/api)
router.get('/', function(req, res) {
    res.json({ message: 'hooray! welcome to our api!' });   
});

router.route('/speech')
	.post(function(req, res) {
		console.log(req.body.text);
		wit.captureTextIntent(ACCESS_TOKEN, req.body.text, function (err, witRes) {
		    if (err) {
		    	res.json(400, {message: "Error calling Wit.ai"});
		    	console.log("Error: ", err);
		    } else { 	
		    	console.log(JSON.stringify(witRes, null, " "));
		    	computeText(witRes, function(response) {
				    console.log(response); 
				    res.json(response);   
				});
		    }
		});
	});

router.route('/test') 
	.get(function(req, res) {
		capOneBalance("55e94a6bf8d8770528e6144e", function(response) {
			res.json(response);
		});
	});

function computeText(witRes, cb) {
	if (witRes.outcomes) {
		if (witRes.outcomes[0].intent = "greetings") {
			cb({ message: "Hello, what can I help you with?" });
		}
	} else {
		cb({ message: "Sorry I didn't quite get that, could you ask something different"});
	}
}

function capOneGetAccounts(cb) {
	request('http://api.reimaginebanking.com/accounts?key=' + CAPONE_KEY, function (error, response, body) {
	  if (!error && response.statusCode == 200) { 
	    console.log(JSON.parse(body)); // Show the HTML for the Google homepage. 
	    cb(JSON.parse(body));
	  }
	})
}

function capOneBalance(account, cb) {
	request('http://api.reimaginebanking.com/accounts/' + account + '?key=' + CAPONE_KEY, function (error, response, body) {
	  if (!error && response.statusCode == 200) { 
	    console.log(JSON.parse(body)); // Show the HTML for the Google homepage. 
	    cb(JSON.parse(body));
	  }
	})
}

// more routes for our API will happen here

// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api
app.use('/api', router);

// START THE SERVER
// =============================================================================
app.listen(port);
console.log('Magic happens on port ' + port);