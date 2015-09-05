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
var CAPONE_CUSTOMER = "55e94a6af8d8770528e60e54";
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
		capOneBill(function(response) {
			res.json(response);
		});
	});

function computeText(witRes, cb) {
	if (witRes.outcomes) {
		if (witRes.outcomes[0].intent == "greetings") {
			cb({ message: "Hello, what can I help you with?" });
		}
		else if (witRes.outcomes[0].intent == "checking_balance") {
			var text = "Thanks for waiting. ";
			capOneGetAccounts(function(res) {
				console.log(res);
				for (i = 0; i < res.length; i++) {
					console.log("YESMAN");
					text = text + "You have $" + res[i].balance.toString().substring(0, res[i].balance.toString().length - 2) + "." +  + res[i].balance.toString().substring(res[i].balance.toString().length - 2, res[i].balance.toString().length) + " in your " + res[i].type + " account. ";
				}
				cb({ message: text});
			});
		}
	} else {
		cb({ message: "Sorry I didn't quite get that, could you ask something different"});
	}
}

function capOneGetAccounts(cb) { //get all of customer's account based on customer ID
	request('http://api.reimaginebanking.com/customers/' + CAPONE_CUSTOMER + '/accounts?key=' + CAPONE_KEY, function (error, response, body) {
	  if (!error && response.statusCode == 200) { 
	    var ret = JSON.parse(body);
	    cb(ret);
	  }
	})
}

function capOneBalance(account, cb) { //pass account ID to get balance
	request('http://api.reimaginebanking.com/accounts/' + account + '?key=' + CAPONE_KEY, function (error, response, body) {
	  if (!error && response.statusCode == 200) { 
	    console.log(JSON.parse(body));
	    cb(JSON.parse(body));
	  }
	})
}

function capOneBill(cb) { //get all of a customer's bill based on a customer's ID
	request('http://api.reimaginebanking.com/customers/' + CAPONE_CUSTOMER + '/bills?key=' + CAPONE_KEY, function (error, response, body) {
	  if (!error && response.statusCode == 200) { 
	    console.log(JSON.parse(body));
	    cb(JSON.parse(body));
	  }
	})
}

function capOneLocations(cb) { //get location of capital one offices
	request('http://api.reimaginebanking.com/branches?key=' + CAPONE_KEY, function (error, response, body) {
	  if (!error && response.statusCode == 200) { 
	    console.log(JSON.parse(body));
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