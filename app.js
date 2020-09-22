/**
 * Default requires for app to run as a web server
 * - https support
 * - express
 * - node-sass
 */

// Express configuration
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var session = require('express-session'); // cookies
var favicon = require('serve-favicon');
var logger = require('morgan');
var sassMiddleware = require('node-sass-middleware');

// routes (javascript)

// this leads to http://{host}/ or users or message
var indexRouter   = require('./routes/index');
var usersRouter   = require('./routes/users');
var messageRouter = require('./routes/message');
var crudRouter    = require('./routes/crud'); // this leads to several, e.g. http://{host}/crud/config

// App constants
const config = require('./config').config;

var app = express();

// view engine setup (using Pug/Jade)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

/**
 * Support cookies and sessions
 * Setting default cookie .sameSite attribute 
 * https://web.dev/samesite-cookie-recipes/
 * For a full session
 * https://www.geeksforgeeks.org/session-management-using-express-session-module-in-node-js/
*/

if(config.useCookie) {

    let sessionConfig = {
      secret: '75FFzg!6WwwlivwV1B)cPY`~5p:_Kz8ugWz$-=JrD:o^rUs3S;d@R?A',
      name: config.appName,
      resave: true, 
      saveUninitialized: true,
      cookie: {}
      //cookie : {
      //  SameSite: 'none', // needs better config for secure sessions
      //  Secure: 'false'
      //}
    };

    if (config.useSSL) {
      app.set('trust proxy', 1); // trust first proxy
      sessionConfig.cookie.sameSite = 'none';
      sessionConfig.cookie.secure = true; // serve secure cookies
    } else {
      //sessionConfig.cookie.sameSite = 'lax';
      sessionConfig.cookie.sameSite = 'none';
      sessionConfig.cookie.secure = false;
    }

    // Add basic sessions
    app.use(session(sessionConfig));

}

// Support favicon
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')))

/**
 * SASS support for stylesheets (must be ahead of static join of 'public' below)
 * 1. Weirdly, sassMiddleare looks at the CSS link in <html> template files, THEN appends the directory
 *  it finds in <link rel="stylesheet" href="LINK">. 
 *      ./assets/stylesheets/style.scss (for the scss)
 *      ./public/stylesheets/style.css  (for the css)
 * 2. The SCSS->CSS transition happens when the page is refreshed, NOT when 
 *    the .scss file is updated!
 * NOTE: converted to .scss from the original .sass, easier to document
 */
app.use(sassMiddleware({
  src: path.join(__dirname, 'assets'),
  dest: path.join(__dirname, 'public'),
  indentedSyntax: false, // true = .sass and false = .scss
  debug: true,
  sourceMap: true
}));

// Static files, default web directories
app.use(express.static(path.join(__dirname, 'public'))); // standard css, js
app.use(express.static(path.join(__dirname, 'assets'))); // assets, models and data

// Page templates for routes loaded earlier
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/message', messageRouter);

// configuration forms, e.g. http://{host}/crud/config
app.use('/crud', crudRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

// Export the app object

module.exports = { 'app': app };

