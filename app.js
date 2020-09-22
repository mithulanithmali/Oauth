const express = require('express');
//librarry for image upload
const multer = require('multer');
const app = express();

const fs = require('fs');

app.set('view engine', 'ejs');
//import credentilas
const OAuthCredentials = require('./client_credentials.json');

//import google apis
const { google } = require('googleapis');

const ClientID = OAuthCredentials.web.client_id;
const ClientSecret = OAuthCredentials.web.client_secret;
const RedirectURI = OAuthCredentials.web.redirect_uris[0];

var name, pic;

//client object
const OauthClient = new google.auth.OAuth2(ClientID, ClientSecret, RedirectURI);
var authorizized = false;
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile';

var Storage = multer.diskStorage({
	destination: function (req, file, callback) {
		callback(null, './images');
	},
	filename: function (req, file, callback) {
		callback(null, file.fieldname + '_' + Date.now() + '_' + file.originalname);
	},
});

var upload = multer({
	storage: Storage,
}).single('file'); //Field name and max count

//home page
app.get('/', (req, res) => {
	// res.render('index');
	if (!authorizized) {
		var url = OauthClient.generateAuthUrl({
			access_type: 'offline',
			scope: SCOPES,
		});
		console.log(url);
		res.render('index', { url: url });
	} else {
		var oauth2 = google.oauth2({
			auth: OauthClient,
			version: 'v2',
		});

		//user info

		oauth2.userinfo.get(function (err, response) {
			if (err) throw err;
			console.log(response.data);
			name = response.data.name;
			pic = response.data.picture;

			res.render('success', { name: name, pic: pic, success: false });
		});
	}
});

//get authorized token
app.get('/google/redirect', function (req, res) {
	const authCode = req.query.code;
	if (authCode) {
		OauthClient.getToken(authCode, function (err, tokens) {
			if (err) {
				console.log('error');
				console.log(err);
			} else {
				console.log('successfully authenticated');
				console.log(tokens);
				OauthClient.setCredentials(tokens);
				authorizized = true;
				res.redirect('/');
			}
		});
	} else {
	}
});

//upload files
app.post('/upload', (req, res) => {
	upload(req, res, function (err) {
		if (err) throw err;
		console.log(req.file.path);
		const drive = google.drive({
			version: 'v3',
			auth: OauthClient,
		});

		const filemetadata = {
			name: req.file.filename,
		};

		const media = {
			mimeType: req.file.mimetype,
			body: fs.createReadStream(req.file.path),
		};

		drive.files.create(
			{
				resource: filemetadata,
				media: media,
				fields: 'id',
			},
			(err, file) => {
				if (err) throw err;

				fs.unlinkSync(req.file.path);
				res.render('success', { name: name, pic: pic, success: true });
			}
		);
	});
});
app.use(express.static('public'));
app.get('/logout', (req, res) => {
	authorizized = false;
	res.redirect('/');
});
app.listen(5000, () => {
	console.log('App start on PORT 5000');
});
