var express = require('express');
const app = require('../app');

// load global configuration object
const config = require('../config').config;

var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {

  // set session
  //req.session.appName = config.appSessionName;

  //req.session.destroy(function(error){ 
  //   console.log("Session Destroyed") 
  //});

  // render, passing some variables to the pug html template
  res.render('index', {title: config.appName, tagline: config.appTagline} );  // config is in ./config.js

});

module.exports = router;
