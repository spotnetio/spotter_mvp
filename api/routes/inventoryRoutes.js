'use strict';
var db = require('../model/db');

module.exports = function(app) {
	
  var inventory = require('../controllers/inventoryController');

  app.route('/lender_deposit/:lender')
    .post(inventory.lender_deposit);
  app.route('/lender_withdraw/:lender')
    .post(inventory.lender_withdraw);
  app.route('/shortseller_deposit/:shortseller')
    .post(inventory.shortseller_deposit);
  app.route('/shortseller_withdraw/:shortseller')
    .post(inventory.shortseller_withdraw);
  app.route('/create_agreement/')
    .post(inventory.create_agreement);
  app.route('/dissolve_agreement/')
    .post(inventory.dissolve_agreement);
  
  app.route('/shortseller_info/')
    .get(inventory.shortseller_info);
};