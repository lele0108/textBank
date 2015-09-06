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
var PLAID = {
	client_id: "55eb144bf1b303e8243a3fdc",
	secret: "7f170be3c42b4200dea017c4c36d71",
}
var monthNames = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

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
		var SMS = false;
		if (req.body.ToCountry) {
			console.log(req.body);
			SMS = true;
			req.body.text = req.body.Body;
		}
		console.log(req.body.text);
		wit.captureTextIntent(ACCESS_TOKEN, req.body.text, function (err, witRes) {
		    if (err) {
		    	res.json(400, {message: "Error calling Wit.ai"});
		    	console.log("Error: ", err);
		    } else { 	
		    	console.log(JSON.stringify(witRes, null, " "));
		    	computeText(witRes, function(response) {
				    console.log(response); 
				    if (!SMS) {
				    	res.json(response);  
				    } else {
				    	res.send('<?xml version="1.0" encoding="UTF-8" ?><Response><Message>' + response.message + '</Message></Response>'); 
				    }
				});
		    }
		});
	});

router.route('/test') 
	.get(function(req, res) {
		getPlaidInfo(function(response) {
			res.json(response);
		});
	});

function computeText(witRes, cb) {
	if (witRes.outcomes) {
		if (witRes.outcomes[0].intent == "greetings") {
			cb({ message: "Hello, what can I help you with? 😃" });
		}
		else if (witRes.outcomes[0].intent == "checking_balance") {
			var text = "Thanks for waiting. ";
			if (witRes._text.toLowerCase().indexOf("checking") > -1 || witRes._text.toLowerCase().indexOf("savings") > -1) {
				capOneGetAccounts(function(res) {
					var query = "";
					if (witRes._text.toLowerCase().indexOf("checking") > -1) {
						query = "Checking";
					} else if (witRes._text.toLowerCase().indexOf("savings") > -1) {
						query = "Savings"
					}
					for (i = 0; i < res.length; i++) {
						if (res[i].type == query) {
							text = text + "You have $" + res[i].balance.toString().substring(0, res[i].balance.toString().length - 2) + "." +  + res[i].balance.toString().substring(res[i].balance.toString().length - 2, res[i].balance.toString().length) + "💸 in your " + res[i].type + " account.";
						}
					}
					cb({ message: text});
				});
			} else {
				capOneGetAccounts(function(res) {
					console.log(res);
					for (i = 0; i < res.length; i++) {
						text = text + "You have $" + res[i].balance.toString().substring(0, res[i].balance.toString().length - 2) + "." +  + res[i].balance.toString().substring(res[i].balance.toString().length - 2, res[i].balance.toString().length) + "💸 in your " + res[i].type + " account. ";
					}
					cb({ message: text});
				});
			}
		}
		else if (witRes.outcomes[0].intent == "bill_query") {
			var text = "Thanks for waiting. Your bills are as follows: "
			capOneBill(function(response) {
				console.log(response);
				for (i = 0; i < response.length; i++) {
					if (response[i].status == "recurring") {
						text = text + response[i].payee + " is recurring on the " + response[i].recurring_date + "rd of every month for $" + response[i].payment_amount + "💵. "; 
					}
				}
				cb({ message: text});
			});
		}
		else if (witRes.outcomes[0].intent == "bank_location") {
			var text = "";
			if (witRes.outcomes[0].entities.location) {
				var location = witRes.outcomes[0].entities.location[0].value;
				capOneLocations(function(res) {
					for (i = 0; i < res.length; i++) {
						var branch = res[i];
						if (branch.address.city.toLowerCase() == location.toLowerCase()) {
							text = "I found a branch near you🏦. It's located on " + branch.address.street_number + " " + branch.address.street_name + " and is open from 9 AM - 5 PM today. Here's a map with directions: ";
							cb({ message: text, 'lat': branch.geocode.lat, 'lng': branch.geocode.lng});
						}
					}
					text = "Hmm, there doesn't seem to be a Capital One branch in your city. Sorry about that! 😶";
					cb({ message: text});
				});
			} else {
				text = "What city are you located?📍 I live on the internet!";
				cb({ message: text});
			}
		}
		else if (witRes.outcomes[0].intent == "expense_query") {
			var text = "Thanks for waiting!";
			var intent = "";
			var query = witRes._text.toLowerCase();
			if (query.indexOf("food") > -1) {
				intent = "Food and Drink";
			} else if (query.indexOf("coffee") > -1) {
				intent = "Coffee Shop";
			} else if (query.indexOf("venmo") > -1) {
				intent = "Venmo";
			} else if (query.indexOf("apple") > -1) {
				intent = "Computers and Electronics";
			}
			getPlaidInfo(function(res) {
				var match = [];
				var transactions = res.transactions;
				for (i = 0; i < transactions.length; i++) {
					var cats = transactions[i].category;
					console.log(cats);
					if (cats) {
						if (cats.indexOf(intent) > -1 ) {
							match.push(transactions[i]);
						}
					}
				}
				text = text + " I've found " + match.length + " recent transactions."
				for(j = 0; j < match.length; j++) {
					var d = new Date(match[j].date);
					text = text + " You spent 💰$" + match[j].amount + " at " + match[j].name + " on " + monthNames[d.getMonth()] + " " + d.getDate() + ".";
				}
				cb({ message: text });
			});
		}
		else if (witRes.outcomes[0].intent == "spending_check") {
			var text = "Thanks for waiting!";
			var total = 0;
			getPlaidInfo(function(res) {
				var transactions = res.transactions;
				for (i = 0; i < transactions.length; i++) {
					console.log(transactions[i]);
					if (transactions[i].amount && transactions[i].amount > 0) {
						total = total + transactions[i].amount;
					}
				}
				text = text + " You have spent a total of $" + total.toFixed(2) + " this month on " + transactions.length + " different purchases 💳.";
				cb({ message: text });
			});
		}
		else {
			cb({ message: "Sorry I didn't quite get that, could you ask something different"});
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

function getPlaidInfo(cb) {
	request.post('https://tartan.plaid.com/connect?client_id=55eb144bf1b303e8243a3fdc&secret=7f170be3c42b4200dea017c4c36d71&username=plaid_test&password=plaid_good&type=wells', function (error, response, body) {
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