/**
 * User input to the app.
 * OUTSTANDING tutorial:
 * https://codingstatus.com/express-mvc-structure/
 */

var express = require('express');

var controller = require('../controllers/crud-controller');

var router = express.Router();

// crud form route
router.get('/form-config', controller.formConfig);

// create data route
router.post('/create', controller.create);

// display data route
router.get('/fetch', controller.fetch);

// edit data route
router.get('/edit/:id', controller.edit);

// update data route
router.post('/edit/:id', controller.update);

// delete data route
router.get('/delete/:id', controller.delete);

module.exports = router;