var express = require('express');
var session = require('express-session');
var http = require('http');
var https = require('https');
var acl = require('acl');
var webid = require('webid/tls');
var fs = require('fs');
var path = require('path');

var app = express();

var PORT = 3000;

var server_creds = {
    key: fs.readFileSync('keys/key.pem'),
    cert: fs.readFileSync('keys/cert.pem'),
    requestCert: true
};

app.set('views', './views');
app.set('view engine', 'jade');

// Set up the session middleware
app.use(session({
    secret: 'wgac',
    cookie: { maxAge: 20000 },
    resave: false,
    saveUninitialize: false
}));

// Routes /////////////////////////////////////////////////////////////////////
app.get('/', function (req, res) {
    var sess = req.session;
    // Some access data
    sess.cert = req.connection.getPeerCertificate();
    sess.authed = false;

    var redirect_uri = '';

    // Check the webid first
    webid.verify(sess.cert, function (err, result) {
        if (err || sess.cert == {}) {
            redirect_uri = '/unauthed';
        } else {
            redirect_uri = '/authed';
        }

        console.log(result);
        sess.authed = true;
        console.log(sess.authed);
        req.session = sess;
        res.redirect(redirect_uri);
    });
});

app.get('/unauthed', function (req, res) {
    res.render('access', {
        title: 'WGAC: Unauthorized',
        body: {
            h1: 'WARNING ACCESS DENIED: GET OUTTA HERE >:(',
            p1: 'Oh, that\'s too bad. You we could\'nt validate your webid. \n \
                You can still try to access the site resources below if you want.'
        }
    });
});

app.get('/authed', function (req, res) {
    var sess = req.session;

    if (sess.authed == true) {
        res.render('access', {
            title: 'WGAC: Authorized',
            body: {
                h1: 'LOOKS LIKE YOU\'RE WHO YOU SAY YOU ARE >:)',
                p1: 'Congratz, [webid here]. You\'ve been authorized.'
            }
        });
    }
});

// This area should only be visible to a valid WebID
app.get('/secretarea', function (req, res) {
    // Now check the acl file for this route
    var template_params = {
        title: 'WGAC: Secretarea',
        body: {
            h1: 'Well aren\'t you special. Gettin secret area access and such.',
            p1: 'Below are some ACL controlled resources that you can try to access.',
            links: [
                { uri: '/admin.txt', text: 'Admin File' },
                { uri: '/writeToMe.rdf', text: 'Test RDF file'}
            ]
        }
    }
    res.render('area.jade', template_params);
});

app.get('/grouparea', function (req, res) {

});

// Only the webid representing the group should be able to access this area
app.get('/grouponly')
///////////////////////////////////////////////////////////////////////////////

// Set up HTTPS server ////////////////////////////////////////////////////////
var https_server = https.createServer(server_creds, app).listen(PORT);
///////////////////////////////////////////////////////////////////////////////
