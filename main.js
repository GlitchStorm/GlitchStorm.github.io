var	money = 0;
var clickUpgradeAmount = 0;
var printUpgradeAmount = 0;
var clickUpgradeCost = 0;
var clickValue = 1;

window.onload = function(){
	
};

function moneyClick() {
	var clickValue = clickUpgradeAmount + 1;
	money = money + (clickValue * 1);
	document.getElementById('money').innerHTML = money;
	}

function moneyIdle(cashPerSecond){
	money = money + cashPerSecond;
	document.getElementById('money').innerHTML = money;
}

function upgradeClick(upgradeAmount){
	var clickUpgradeCost = Math.floor(10 * Math.pow(1.1,clickUpgradeAmount));
	if(money >= clickUpgradeCost){
		clickUpgradeAmount = clickUpgradeAmount + 1;
		money = money - clickUpgradeCost;
		document.getElementById('clickUpgradeAmount').innerHTML = clickUpgradeAmount;
		document.getElementById('money').innerHTML = money;
	}
	var nextClickUpgradeCost = Math.floor(10 * Math.pow(1.1,clickUpgradeAmount));
	document.getElementById('clickUpgradeCost').innerHTML = nextClickUpgradeCost;
}

function upgradePrint(upgradeAmount){
	var printUpgradeCost = Math.floor(10 * Math.pow(1.1,printUpgradeAmount));
	if(money >= printUpgradeCost){
		printUpgradeAmount = printUpgradeAmount + 1;
		money = money - printUpgradeCost;
		document.getElementById('printUpgradeAmount').innerHTML = printUpgradeAmount;
		document.getElementById('money').innerHTML = money;
	}
	var nextPrintUpgradeCost = Math.floor(10 * Math.pow(1.1,printUpgradeAmount));
	document.getElementById('printUpgradeCost').innerHTML = nextPrintUpgradeCost;
}

function loadSave(){
	var savegame = JSON.parse(localStorage.getItem("save"));
	if (typeof savegame.money !== "undefined") {
		money = savegame.money;
	}
	if (typeof savegame.clickUpgradeAmount !== "undefined") {
		clickUpgradeAmount = savegame.clickUpgradeAmount;
	}
	if (typeof savegame.clickUpgradeCost !== "undefined") {
		clickUpgradeCost = savegame.clickUpgradeCost;
	}
	document.getElementById('money').innerHTML = money;
	document.getElementById('clickUpgradeCost').innerHTML = clickUpgradeCost;
	document.getElementById('clickUpgradeAmount').innerHTML = clickUpgradeAmount;
}

function autoSave(){
	var save = {
		money: money,
		clickUpgradeAmount: clickUpgradeAmount,
		clickUpgradeCost: clickUpgradeCost,
	};
	localStorage.setItem("save",JSON.stringify(save));
}

window.setInterval(function(){
	autoSave();
}, 5000);

window.setInterval(function(){
	var idleIncomeTotal = printUpgradeAmount;
	moneyIdle(idleIncomeTotal);
}, 1000);