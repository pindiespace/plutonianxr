
// load global configuration object ./config.js
const config = require('../config').config;

// model functions
var model = require('../models/crud-model.js');

let controller = {
 
	formConfig: function (req, res) {
		res.render('form-config', { title: config.appName,  message: 'Use this form to configure' });

	},

	create: function (req, res) {
		const createData = model.create();
		res.send('<h1>'+createData+'</h1>');
	},

	fetch: function (req, res) {
		const fetchData = model.fetch();
		res.send('<h1>'+fetchData+'</h1>');

	},

	edit: function (req, res) {
		const editId = req.params.id;
		const editData = model.edit(editId);
		res.render('crud-operation',{editData:editData,editId:editId});
	},

	update:function(req,res){
	     const updateId = req.params.id;
	     const updateData = model.update(updateId);
	     res.send('<h1>'+updateData+'</h1>');
	},

	delete:function(req,res){
	    const deleteId = req.params.id;
	    const deleteData = model.delete(deleteId);
	    res.send('<h1>'+deleteData+'</h1>');
	}

};

module.exports = controller;