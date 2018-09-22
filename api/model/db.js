var config = require("../../config/secrets.js").config;
const R = require('ramda');
const spotArtifact = require("../../../contracts_mvp/build/contracts/Spot.json");
const TruffleContract = require("truffle-contract");
const Web3 = require("web3");
const networkUrl = "http://localhost:9545";
const provider = new Web3.providers.HttpProvider(networkUrl);
const web3 = new Web3(provider);

let defaultAccount;
web3.eth.getAccounts((error, result) =>{defaultAccount = result[0]; console.log(result);})
// get the contract artifact file and use it to instantiate a truffle contract abstraction
let spotContract = TruffleContract(spotArtifact);
// set the provider for our contracts
spotContract.setProvider(provider);
// Save instance	
let deployedSpot;
spotContract.deployed().then(function(inst) {
	deployedSpot = inst;
});

const 	GAS = 3000000;
// Oracle params
const 	MARGIN_RATE = 0.5;

const binance = require('node-binance-api')().options({
	APIKEY: '<key>',
	APISECRET: '<secret>',
	useServerTime: true, // If you get timestamp errors, synchronize to server time at startup
	test: true // If you want to use sandbox mode where orders are simulated
});

let QUOTES = {};
binance.websockets.depthCache(['BNBBTC', 'EOSETH'], (symbol, depth) => {
	let bids = binance.sortBids(depth.bids);
	let asks = binance.sortAsks(depth.asks);
	// console.log(symbol+" depth cache update");
	// console.log("bids", bids);
 	// console.log("asks", asks);
 	// console.log("asks", Object.keys(asks));
	// console.log(symbol + " best bid: "+binance.first(bids));
	QUOTES[symbol] = {bids: bids, asks: asks};
	// console.log(symbol + " best ask: "+binance.first(asks));
});

function myFunc(symbol) {
	if(symbol in QUOTES){
		// console.log(getAvgPrice(symbol.slice(0,3), 300));
  // 		console.log(symbol + ': ' + JSON.stringify(QUOTES[symbol].asks));
  		// console.log(symbol + ': ' + binance.first(QUOTES[symbol].asks));
	}
	else {
		console.log('QUOTES is empty');
	}
}
setInterval(myFunc, 5000, 'EOSETH');

function getAvgPrice(token, amount) {
	let symbol = token + 'ETH';
	let amt = amount;
	let asks = QUOTES[symbol].asks;
	let numerator = 0;
	let denominator = 0;
	for(let i=0; i < Object.keys(asks).length; i++) {
		let quote = Object.keys(asks)[i];
		amt -= asks[quote];
		if(amt <= 0) {
			numerator += quote * (amt + asks[quote]);
			denominator += (amt + asks[quote]);
			break;
		}
		numerator += quote * asks[quote];
		denominator += asks[quote];
	}
	return numerator / denominator;
}

exports.inventory = {

	async sign(text) {
		log(defaultAccount);
		log(text);
		let sha = web3.sha3(text);
		// log(sha);
		let sig = web3.eth.sign(defaultAccount, sha);
		let r = sig.slice(0, 66);
		let s = "0x" + sig.slice(66, 130);
		let v = parseInt(sig.slice(130, 132), 16);
		return [r, s, v];
	},

	async lenderDeposit(lender, amount) {
		let lenders = await deployedSpot.getLenders();
		let lendersMap = lenders.reduce(function(result, item, index, array) {
			result[item] = index; 
			return result;
		}, {});
		let idx = lender in lendersMap ? lendersMap[lender] : -1;
		
		deployedSpot.lenderDeposit(
			idx, 
			lender, 
			amount,
			{from: defaultAccount, gas: GAS}
		);
	},

	async lenderWithdraw(lender, amount, lender_rsv) {
		let lenders = await deployedSpot.getLenders()
		let lendersMap = lenders.reduce(function(result, item, index, array) {
			result[item] = index; 
			return result;
		}, {});

		let agentRsv = sign(
			[
				lendersMap[lender], 
				amount,
			].join('|') + '|' + lender_rsv.join('|')
		);
		deployedSpot.lenderWithdraw(
			lendersMap[lender], 
			amount,
			agentRsv[0],
			agentRsv[1],
			agentRsv[2],
			lender_rsv[0], 
			lender_rsv[1], 
			lender_rsv[2],
			web3.sha3([lender, amount].join('|')),
			{from: defaultAccount, gas: GAS}
		);
	},

	async shortsellerDeposit(shortseller, amount) {
		console.log('shortseller amount ' + shortseller +' ' + amount);
		let shortsellers = await deployedSpot.getShortsellers();
		let shortsellersMap = shortsellers.reduce(function(result, item, index, array) {
			result[item] = index; 
			return result;
		}, {});
		let idx = shortseller in shortsellersMap ? shortsellersMap[shortseller] : -1;
		console.log("deployedSpot.shortsellerDeposit("+idx+","+shortseller+","+amount+","+"{from: "+defaultAccount+", gas: "+GAS+"})");
		return deployedSpot.shortsellerDeposit(
			idx, 
			shortseller, 
			amount,
			{from: defaultAccount, gas: GAS}
		).catch(e=> console.log("error is THIS: "+e));
	},

	async shortsellerWithdraw(shortseller, amount, shortseller_rsv) {
		let shortsellers = await deployedSpot.getShortsellers();
		let shortsellersMap = shortsellers.reduce(function(result, item, index, array) {
			result[item] = index; 
			return result;
		}, {});

		let agentRsv = sign(
			[
				shortsellersMap[shortseller], 
				amount,
			].join('|') + '|' + shortseller_rsv.join('|')
		);
		deployedSpot.shortsellerWithdraw(
			shortsellersMap[shortseller], 
			amount,
			agentRsv[0],
			agentRsv[1],
			agentRsv[2],
			shortseller_rsv[0], 
			shortseller_rsv[1], 
			shortseller_rsv[2],
			web3.sha3([shortseller, amount].join('|')),
			{from: defaultAccount, gas: GAS}
		);
	},

	async CreateAgreement(
		shortseller, 
		lender, 
		token, 
		amountBase, 
		rate, 
		shortseller_rsv
	) {
		let latestRate = getAvgPrice(token, amountBase);
		// validate rate
		if (latestRate > rate * 1.03 || latestRate < rate * 0.97) {
			console.log('rate is no longer valid');
			return;
		}
		let lenders = await deployedSpot.getLenders()
		let lendersMap = lenders.reduce(function(result, item, index, array) {
			result[item] = index; 
			return result;
		}, {});
		let shortsellers = await deployedSpot.getShortsellers()
		let shortsellersMap = shortsellers.reduce(function(result, item, index, array) {
			result[item] = index; 
			return result;
		}, {});
	
		let agentRsv = sign(
			[
				shortsellersMap[shortseller],
				lendersMap[lender],
				token, 
				amountBase,
				latestRate,
			].join('|') + '|' + shortseller_rsv.join('|')
		);
		deployedSpot.CreateAgreement(
			shortsellersMap[shortseller],
			lendersMap[lender],
			token, 
			amountBase,
			latestRate,
			agentRsv[0],
			agentRsv[1],
			agentRsv[2],
			shortseller_rsv[0], 
			shortseller_rsv[1], 
			shortseller_rsv[2],
			web3.sha3([shortseller, lender, token, amountBase, rate].join('|')),
			{from: defaultAccount, gas: GAS}
		);
	},

	async agreements() {
		let agreementsShortseller = await deployedSpot.getAgreementsShortseller();
		let agreementsLender = await deployedSpot.getAgreementsLender();
		let agreementsToken = await deployedSpot.getAgreementsToken();
		let agreementsAmountBase = await deployedSpot.getAgreementsAmountBase();
		let agreementsRate = await deployedSpot.getAgreementsRate();
		let agreements = agreementsShortseller.map(function(agr_shortseller, i) {
			return [
				agr_shortseller, 
				agreementsLender[i],
				agreementsToken[i],
				agreementsAmountBase[i],
				agreementsRate[i],
			];
		});
		return agreements;
	},

	// Helper
	async agreementsByShortseller(agreements, shortseller) {
		return agreements.filter((a) => {
		    return a[0] == shortseller;
		});
	},

	async DissolveAgreement(
		agreement_idx, 
		shortseller, 
		lender, 
		token, 
		amountBase, 
		rate, 
		rsv // Either lender (recall), shorseller (buy to cover) or agent (margin call)
	) {
		let latestRate = getAvgPrice(token, amountBase);
		// validate rate
		if (latestRate > rate * 1.03 || latestRate < rate * 0.97) {
			console.log('rate is no longer valid');
			return;
		}

		let lenders = await deployedSpot.getLenders()
		let lendersMap = lenders.reduce(function(result, item, index, array) {
			result[item] = index; 
			return result;
		}, {});
		let shortsellers = await deployedSpot.getShortsellers()
		let shortsellersMap = shortsellers.reduce(function(result, item, index, array) {
			result[item] = index; 
			return result;
		}, {});

		let due_shortseller = amountBase * latestRate;
		let due_lender = amountBase * rate - due_shortseller;

		let agentRsv = sign(
			[
				agreement_idx,
				shortsellersMap[shortseller],
				lendersMap[lender],
				due_lender,
				due_shortseller,
			].join('|') + '|' + rsv.join('|')
		);
		deployedSpot.DissolveAgreement(
			agreement_idx,
			shortsellersMap[shortseller],
			lendersMap[lender],
			due_lender,
			due_shortseller,
			agentRsv[0],
			agentRsv[1],
			agentRsv[2],
			rsv[0], 
			rsv[1], 
			rsv[2],
			web3.sha3([shortseller, lender, token, amountBase, rate].join('|')),
			{from: defaultAccount, gas: GAS}
		);
	},

	async shortsellerInfo(
		shortseller 
	) {
		let result = {
			'totalBalance': 		'1',
			'availableBalance': 	'2',
			'lendingFeesOwed': 		'3',
			'unrealizedNetPnL': 	'4',
			'marginRequired': 		'5',
			'buyingPower': 			'6',
			'collateralPct':		'7',
			'openPositionsValue': 	'8',
		};

		let ss = await deployedSpot.getShortsellers();
		let balances = await deployedSpot.getShortsellerBalances();
		console.log('ss.length '+ss.length);
		console.log('ss[0] '+ss[0]);
		result['totalBalance'] = balances[0];
		return result;
	}
};













