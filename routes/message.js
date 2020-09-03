var express = require('express');
var router = express.Router();

/* GET users listing
 * IMPORTANT: (note: even if this is /message, we write '/' here...)
 */
router.get('/', function(req, res, next) {
  res.send({'message': 'This is the JSON message'});
});

module.exports = router;
