var	money = 0;
var clickUpgradeAmount = 0;
var printUpgradeAmount = 0;
var printUpgradeCost = 100;
var clickUpgradeCost = 10;
var clickValue = 1;
//triggers saveload on site open
window.onload = function(){
	loadSave();
};
//function to handle manual clicks
function moneyClick() {
	var clickValue = clickUpgradeAmount + 1;
	money = money + (clickValue * 1);
	document.getElementById('money').innerHTML = money;
	}
//Function to handle passively generating money, 
function moneyIdle(cashPerSecond){
	money = money + cashPerSecond;
	document.getElementById('money').innerHTML = money;
}
//function to handle click upgrade button
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
//function to handle idle upgrade button
function upgradePrint(upgradeAmount){
	var printUpgradeCost = Math.floor(100 * Math.pow(1.1,printUpgradeAmount));
	if(money >= printUpgradeCost){
		printUpgradeAmount = printUpgradeAmount + 1;
		money = money - printUpgradeCost;
		document.getElementById('printUpgradeAmount').innerHTML = printUpgradeAmount;
		document.getElementById('money').innerHTML = money;
	}
	var nextPrintUpgradeCost = Math.floor(10 * Math.pow(1.1,printUpgradeAmount));
	document.getElementById('printUpgradeCost').innerHTML = nextPrintUpgradeCost;
}
//loads the save from local storage and updates html
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
	if (typeof savegame.printUpgradeCost !== "undefined") {
		printUpgradeCost = savegame.printUpgradeCost;
	}
	if (typeof savegame.printUpgradeAmount !== "undefined") {
		printUpgradeAmount = savegame.printUpgradeAmount;
	}
	document.getElementById('money').innerHTML = money;
	document.getElementById('clickUpgradeCost').innerHTML = clickUpgradeCost;
	document.getElementById('clickUpgradeAmount').innerHTML = clickUpgradeAmount;
	document.getElementById('printUpgradeAmount').innerHTML = printUpgradeAmount;
	document.getElementById('printUpgradeCost').innerHTML = printUpgradeCost;
}
//handles saving vars into local storage
function autoSave(){
	var save = {
		money: money,
		clickUpgradeAmount: clickUpgradeAmount,
		clickUpgradeCost: clickUpgradeCost,
		printUpgradeAmount: printUpgradeAmount,
		printUpgradeCost: printUpgradeCost,
	};
	localStorage.setItem("save",JSON.stringify(save));
}
//game loop to autosave on interval
window.setInterval(function(){
	autoSave();
}, 5000);
//game loop to run idle income function, feeds total income per second from all idle sources
window.setInterval(function(){
	var idleIncomeTotal = printUpgradeAmount;
	moneyIdle(idleIncomeTotal);
	document.title = "$" + money.toString();
}, 1000);
