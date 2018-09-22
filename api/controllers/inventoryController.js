'use strict';
import { getContracts } from "../../contracts";

var db = require('../model/db');
var CORS = '*';// 'http://localhost:8000';
let TOKENS_LIST = [
	'EOS', 
	'BNB',
  	'TRX',
  	'OMG'
];

exports.inventoryByToken = function(req, res) {
	res.setHeader('Access-Control-Allow-Origin', CORS);
	let role = req.params.role;
	res.json(
		db.inventory.inventoryByToken(role)
	);
}

exports.tokens = function(req, res) {
	res.setHeader('Access-Control-Allow-Origin', CORS);
	let token = req.params.token;
	let contracts = getContracts();
	if (token == null) {
		let result = {};
		for(let c in contracts) {
			if (TOKENS_LIST.includes(c)) {
				result[c] = contracts[c];
			}
		}
		res.json(result);
	}
	else {
		res.json(contracts[token]);
	}
};

exports.contracts = function(req, res) {
	res.setHeader('Access-Control-Allow-Origin', CORS);
	let id = req.params.id;
	let contracts = getContracts();
	if (id == null) {
		res.json(contracts);
	}
	else {
		res.json(contracts[id]);
	}
};

exports.lender_deposit = function(req, res) {
	res.setHeader('Access-Control-Allow-Origin', CORS);
	let lender = req.params.lender;
	if (lender == null) {
		console.log('lender cannot be null');
		res.json();
	}
	else {
		res.json(db.inventory.lenderDeposit(
			lender,
			req.body.amount,
		));
	}
};

exports.lender_withdraw = function(req, res) {
	res.setHeader('Access-Control-Allow-Origin', CORS);
	let lender = req.params.lender;
	if (lender == null) {
		console.log('lender cannot be null');
		res.json();
	}
	else {
		res.json(db.inventory.lenderWithdraw(
			lender,
			req.body.amount,
		));
	}
};

exports.shortseller_deposit = function(req, res) {
	res.setHeader('Access-Control-Allow-Origin', CORS);
	let shortseller = req.params.shortseller;
	if (shortseller == null) {
		console.log('shortseller cannot be null');
		res.json();
	}
	else {
		res.json(db.inventory.shortsellerDeposit(
			shortseller,
			req.body.amount,
		));
	}
};

exports.shortseller_withdraw = function(req, res) {
	res.setHeader('Access-Control-Allow-Origin', CORS);
	let shortseller = req.params.shortseller;
	if (shortseller == null) {
		console.log('shortseller cannot be null');
		res.json();
	}
	else {
		res.json(db.inventory.shortsellerWithdraw(
			shortseller,
			req.body.amount,
		));
	}
};

exports.agreementsByShortseller = function(req, res) {
	res.setHeader('Access-Control-Allow-Origin', CORS);
	let shortseller = req.params.shortseller;
	let agreements = db.inventory.agreements();
	res.json(agreementsByShortseller(agreements, shortseller));
};

exports.create_agreement = function(req, res) {
	res.setHeader('Access-Control-Allow-Origin', CORS);
	res.json(db.inventory.CreateAgreement(
		req.body.shortseller,
		req.body.lender,
		req.body.token,
		req.body.amountBase,
		req.body.rate,
	));
};

exports.dissolve_agreement = function(req, res) {
	res.setHeader('Access-Control-Allow-Origin', CORS);
	res.json(db.inventory.DissolveAgreement(
		req.body.shortseller,
		req.body.lender,
		req.body.token,
		req.body.amountBase,
		req.body.rate,
	));
};

exports.shortseller_info = async function(req, res) {
	res.setHeader('Access-Control-Allow-Origin', CORS);
	res.json(await db.inventory.shortsellerInfo(
		req.query.shortseller,
	));
};


















