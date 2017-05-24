var express = require('express');
var bodyParser = require('body-parser');
var expressSession = require('express-session');
var mongodb = require('mongodb');
var ObjectID = require("mongodb").ObjectId;

//var secrets = require("./secrets.js");

var db;

mongodb.MongoClient.connect('mongodb://localhost', function(err, database) {
	if (err) {
		console.log(err);
		return;
	}
	console.log("Connected to Database. Baking pizza...");
	db = database;
	startListening();
});

var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: true
}));


app.use(expressSession({
	secret: 'keyboard cat',
	resave: false,
	saveUninitialized: true
}));

// Register a new user
app.post('/api/register', function(req, res){
	// Check to see if username already exists
	db.collection('users').findOne({
		username: req.body.username
	}, function(err, data){
		console.log(data);
		if(err){
			console.log(err);
			return;
		}
		if(data !== null){
			res.send('exists');
			return;
		}
		// If username does not exist, add user to db
		db.collection('users').insertOne({
			username: req.body.username,
			password: req.body.password //todo: hash this
		}, function(err, data){
			if(err){
				console.log(err);
				res.status(500);
				res.send('error');
				return;
			}
			res.send(data);

		});
	});
});

// Post to login
app.post('/api/login', function(req, res){
	db.collection('users').findOne({
		username: req.body.username,
		password: req.body.password
	}, function(err, data){
		if(data === null){
			res.send('error');
			return;
		}
		// Associate this cookie (session) with this user (object)
		req.session.user = {
			_id: data._id,
			username: data.username
		};
		res.send('success');
	});
});


//Create new pizza place

app.post('/api/newPlace', function(req, res){
	// Check if user is logged in
	if(!req.session.user){
		res.status(403);
		res.send('forbidden');
		return;
	}
	// If so, add new pizza place
	db.collection('places').insertOne({
		name: req.body.name,
		address: req.body.address,
		city: req.body.city,
		state: req.body.state,
		phone: req.body.phone,
		url: req.body.url,
		newYork: req.body.newYork,
		deepDish: req.body.deepDish,
		brickOven: req.body.brickOven,
		authentic: req.body.authentic,
		delivery: req.body.delivery,
		kids: req.body.kids,
		upVotes: parseInt(req.body.upVotes),
		downVotes: parseInt(req.body.downVotes),
		submitter: req.session.user._id
	}, function(err, data){
		if(err){
			console.log(err);
			res.status(500);
			res.send('error');
			return;
		}
		res.send(data);
	});
});

// Up and Down Vote Handlers
app.post('/api/upvote', function(req, res) {
	db.collection('places').updateOne({_id: ObjectID(req.body._id)}, {$inc: {upVotes: 1}}, function(err, result) {
		if (err) {
			console.log(err);
		}
		console.log('result? ', result);
		res.send(result);
	});
});

app.post('/api/downvote', function(req, res) {
	db.collection('places').updateOne({_id: ObjectID(req.body._id)}, {$inc: {downVotes: -1}}, function(err, result) {
		if (err) {
			console.log(err);
		}
		console.log('result? ', result);
		res.send(result);
	});
});

// Top Ten List
app.get('/api/topTen', function(req, res){
	//a possible solution to the Top Ten List
	db.collection('places').find({}).toArray(function(err, docs){
		if(err){
			return console.log(err);
		}
		var totalVotes = [];
		for(var i = 0; i < docs.length; i++){
			var diff = docs[i].upVotes - docs[i].downVotes;
			totalVotes.push([docs[i]._id, diff]);
		}
		totalVotes.sort(function(a, b){
			return b[1] - a[1];
		});
		res.send(totalVotes.splice(10));
		console.log(totalVotes.splice(10));
	});
});

// List all pizza places
app.get('/api/getPizzerias', function(req, res) {
	db.collection('places').find({}).toArray(function(err, docs) {
		if(err){
			console.log(err);
			res.status(500);
			res.send('error');
			return;
		}
		console.log(docs);
		res.send(docs);
	});
});

// Filter pizza places


// Chats
app.post('/api/newChats', function(req, res){
	// check to see if user is logged in
	if(!req.session.user){
		res.status(403);
		res.send('forbidden');
		return;
	}

	db.collection('chats').insertOne({
		timestamp: Date.now(),
		message: req.body.message,
		submitter: req.session.user._id
	});

});

app.get('/api/getChats', function(req, res){
	//check to ee if user is logged in
	if(!req.session.user){
		res.status(403);
		res.send('forbidden');
		return;
	}

	db.collection('chats').find({}).toArray(function(err, docs){
		if(err){
			return console.log(err);
		}
		res.send(data);
	});
});












//Files to be served out of static public folder
app.use(express.static('public'));

//404 boilerplate
app.use(function(req, res, next) {
	res.status(404);
	res.send("File Not Found! No pizza in sight!");
});

//500 boilerplate
app.use(function(err, req, res, next) {
	console.log(err);
	res.status(500);
	res.send("Internal Server Error! Pizza got burned.");
	res.send(err);
});


//start listening after we've connected to the db
function startListening() {
	app.listen(8080, function() {
		console.log("Sever started at http://localhost:8080 Grab a slice!");
	});
}