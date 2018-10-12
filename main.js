var	money = 0;
var clickUpgradeAmount = 0;
var clickUpgradeCost = 0;
var clickValue = 1;

function moneyClick() {
	var clickValue = clickUpgradeAmount + 1;
	money = money + (clickValue * 1);
	document.getElementById('money').innerHTML = money;
	};

function upgradeClick(upgradeAmount){
	var clickUpgradeCost = Math.floor(10 * Math.pow(1.1,clickUpgradeAmount));
	if(money >= clickUpgradeCost){
		clickUpgradeAmount = clickUpgradeAmount + 1;
		money = money - clickUpgradeCost;
		document.getElementById('clickUpgradeAmount').innerHTML = clickUpgradeAmount;
		document.getElementById('money').innerHTML = money;
	};
	var nextClickUpgradeCost = Math.floor(10 * Math.pow(1.1,clickUpgradeAmount));
	document.getElementById('clickUpgradeCost').innerHTML = nextClickUpgradeCost;
};