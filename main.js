var	money = 0;
var clickUpgradeAmount = 0;
var clickUpgradeCost = 0;
var clickValue = 1;

window.onload = function(){
	loadSave();
};

function moneyClick() {
	var clickValue = clickUpgradeAmount + 1;
	money = money + (clickValue * 1);
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
		clickUpgradeCost: nextClickUpgradeCost,
	};
	localStorage.setItem("save",JSON.stringify(save));
}

window.setInterval(function(){
	autoSave();
}, 5000);