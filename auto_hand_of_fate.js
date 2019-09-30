/*****************************************************************************
 * auto_hand_of_fate.js -- 
 * Look ahead 25 steps in FtHoF, if a combo exists, populate object with 
 * season and chime data.  Advance spell counter until combo is next FtHoF 
 * spell.  If no combo exists, advance 25 steps and re-check.  Change script 
 * state to auto-click golden cookies.  When frenzy and either building special 
 * or elder frenzy are detected, launch combo.  When all combo buffs have 
 * completed, change script state back and look for next combo.
 ****************************************************************************/

var ahof_ADVANCE_COUNTER = 0;
var ahof_ADVANCE_RETRY = 1;
var ahof_LAUNCH_COMBO = 2;

var ahof_M = Game.ObjectsById[7].minigame;
var ahof_WizardTowers = Game.ObjectsById[7];
var ahof_MinTowerLevel = 5;
var ahof_MinTowerNum = 310;

var ahof_SpellStretch = ahof_M.spellsById[2];
var ahof_SpellHagglers = ahof_M.spellsById[4];
var ahof_SpellFtHoF = ahof_M.spellsById[1];

var ahof_OneSecond = 1000;
var ahof_TwoMinutes = 60 * 2 * ahof_OneSecond;

var ahof_tabCounter = 0;	// indent comments to to better show call nesting
var ahof_tab = "\t";

var ahof_controlObject = {};

/*****************************************************************************
 * ahof_checkAndLaunch -- IIFE that checks for minimum required game state and
 *                   executes function to find next combo, or returns with
 *                   message defining minimum required game state.
 *                   
 *    input:  VOID
 *                   
 *    output: VOID
 ****************************************************************************/
// (function ahof_checkAndLaunch(){
function ahof_checkAndLaunch() {
	if ((ahof_WizardTowers.level >= ahof_MinTowerLevel) && (ahof_WizardTowers.amount >= ahof_MinTowerNum)) {
		ahof_initializeControlObject();
		ahof_advanceUntilCombo();
	} else {
		console.log("Double cast of FtHoF requires level %d Wizard Towers and at least %d towers owned", ahof_MinTowerLevel, ahof_MinTowerNum);
		ahof_controlObject = {};
		return;
	}
}
// } ());


function ahof_initializeControlObject() {
	// export save code
	ahof_controlObject.beginGameSave = "";
	ahof_controlObject.endGameSave = "";
	ahof_controlObject.comboIsActive = 0;
	ahof_controlObject.numGoldenCookies = 2;	// <<< will either be two or four (megacombo or super-megacombo :)
	ahof_controlObject.seasonAndChime = [];
	ahof_controlObject.myOwnedTowers = 0;
	ahof_controlObject.clickInterval = 0;
	ahof_controlObject.godzamokInterval = 0;
	ahof_controlObject.state = ahof_ADVANCE_COUNTER;
}


/*****************************************************************************
 * ahof_advanceUntilCombo -- "main" function for first script state.  Looks forward
 *                      to locate consecutive spells that would result in 
 *                      "megacombo."  Loops until conditions are found. 
 *                   
 *    input:  VOID
 *                   
 *    output: VOID
 ****************************************************************************/
function ahof_advanceUntilCombo() {
	let spellObject = {};

	spellObject.stepCount = 0;
	spellObject.firstCast = 0;
	spellObject.advanceUntil = 0;
	spellObject.foundCombo = false;
	spellObject.advanceFlag = false;

	ahof_controlObject.seasonAndChime = new Array(ahof_controlObject.numGoldenCookies);

	for (let i = 0; i < ahof_controlObject.numGoldenCookies; i++) {
		ahof_controlObject.seasonAndChime[i] = { cast: "", season: "", chime: 0 };
	}

	let maxAdvanceSteps = 25;

	do {
		ahof_getNextSpells(spellObject, maxAdvanceSteps);

		ahof_getBestSpells(spellObject);

		ahof_scoreNextSpells(spellObject);

		console.log(spellObject);

		// >>> will this work if no "best spell" found?
		// >>> I think it just outputs the string with blanks.  need to test more fully
		for (let i = 0; i < ahof_controlObject.numGoldenCookies; i++) {
			let castNum = spellObject.advanceUntil + i;

			console.log("Found %s: %s, %s at %d",
				spellObject.spells[castNum].bestCast.name,
				spellObject.spells[castNum].bestCast.season,
				spellObject.spells[castNum].bestCast.sound,
				castNum);
		}

		ahof_stepSpellCounter(spellObject.advanceUntil);
	} while (ahof_controlObject.state === ahof_ADVANCE_RETRY);

	let secondsToFullMagic = ahof_secondsToRefill();

	console.log("Seconds until magic fully recharged: %d", secondsToFullMagic / 1000);

	ahof_controlObject.seasonAndChime[0].cast = spellObject.spells[spellObject.advanceUntil].bestCast.name;
	ahof_controlObject.seasonAndChime[1].cast = spellObject.spells[spellObject.advanceUntil + 1].bestCast.name;

	// make sure that the magic tank is full before going into ahof_autoGolden
	setTimeout(function () {
		// if Golden Switch is on, turn it off
		if (Game.UpgradesById[332].canBuy() && !Game.UpgradesById[332].bought) {
			if (!Game.UpgradesById[332].buy()) {
				console.log("Golden Switch buy failed");
			} else {
				console.log("Golden Switch buy succeeded");
			}
		}

		ahof_controlObject.goldenInterval = setInterval(ahof_autoGolden, 500);
	}, secondsToFullMagic);

	return;
}


/*****************************************************************************
 * ahof_getNextSpells -- loads spell object with spells that result from cast with
 *                  each season and alert chime combination. 
 *
 *    input:  obj -- spellObject defined in ahof_advanceUntilCombo
 *            count -- number of spells to evaluate
 *
 *    output: VOID
 ****************************************************************************/
function ahof_getNextSpells(obj, count) {
	obj.spells = {};

	for (let i = obj.firstCast; i < count; i++) {
		obj.stepCount++;
		obj.spells[i] = obj.spells[i] || {
			// need options for both sound and nosound
			easter: {
				sound: ahof_reportNextSpell(i, "easter", 1),
				nosound: ahof_reportNextSpell(i, "easter", 0)
			},
			halloween: {
				sound: ahof_reportNextSpell(i, "halloween", 1),
				nosound: ahof_reportNextSpell(i, "halloween", 0)
			}
		};
	}

	return;
}


/*****************************************************************************
 * ahof_reportNextSpell -- uses the game's seeded random algorithm to determine 
 *                    result of the cast executed at a point in a sequence.
 *                    Assigns a numeric value to the result to be used to 
 *                    evaluate whether consecutive casts result in megacombo.
 *                    
 *    NOTE:  This code taken almost directly from minigameGrimoire.js
 * 
 *    input:  i -- number of the order in the sequence of casts 
 *            season -- spell results differ between "easter/valentines" and 
 *                   "halloween/christmas" as the e/v cast contains a second
 *                   call to math.random
 *            sound -- similar to season, a second call to math.random occurs
 *                  when the chime is active
 *
 *    output: nextSpell -- object containing the result of the requested cast
 *                      and the score value for the result
 ****************************************************************************/
function ahof_reportNextSpell(i, season, sound) {
	if (typeof season === 'undefined') season = Game.season;

	// >>> why is this needed?
	let failChance = ahof_M.getFailChance(ahof_SpellFtHoF);

	let nextSpell = {};
	nextSpell.name = "";
	nextSpell.value = 0;

	Math.seedrandom(Game.seed + '/' + (ahof_M.spellsCastTotal + i));

	let choices = [];

	if (Math.random() < (1 - failChance)) {
		// playSound includes an additional Math.random call
		if (sound) Math.random();

		Math.random();
		Math.random();

		if (season === 'valentines' || season === 'easter') Math.random();

		choices.push('frenzy', 'multiply cookies');
		if (!Game.hasBuff('Dragonflight')) choices.push('click frenzy');
		if (Math.random() < 0.1) choices.push('chain cookie', 'cookie storm', 'blab');
		if (Game.BuildingsOwned >= 10 && Math.random() < 0.25) choices.push('building special');
		if (Math.random() < 0.15) choices = ['cookie storm drop'];
		if (Math.random() < 0.0001) choices.push('free sugar lump');

	} else {
		if (sound) Math.random();

		Math.random();
		Math.random();

		if (season === 'valentines' || season === 'easter') Math.random();

		choices.push('clot', 'ruin cookies');
		if (Math.random() < 0.1) choices.push('cursed finger', 'blood frenzy');
		if (Math.random() < 0.003) choices.push('free sugar lump');
		if (Math.random() < 0.1) choices = ['blab'];
	}

	nextSpell.name = choose(choices);

	// assign numeric value to each possible outcome for comparison purposes
	switch (nextSpell.name) {
		case "free sugar lump":
			nextSpell.value = 99;
			break;
		case "blood frenzy":
			nextSpell.value = 15;
			break;
		case "building special":
			nextSpell.value = 7;
			break;
		case "click frenzy":
			nextSpell.value = 2;
			break;
		case "frenzy":
		case "multiply cookies":
		case "chain cookie":
		case "cookie storm":
		case "cookie storm drop":
			nextSpell.value = 1;
			break;
		case "clot":
		case "cursed finger":
		case "blab":
			nextSpell.value = 0;
			break;
	}

	Math.seedrandom();

	return nextSpell;
}


/*****************************************************************************
 * ahof_getBestSpells -- examines spell cast results and identifies the spell with 
 *                  the highest score for each cast element in the sequence  
 *
 *    input:  obj -- spellObject defined in ahof_advanceUntilCombo
 *
 *    output: VOID
 ****************************************************************************/
function ahof_getBestSpells(obj) {
	let i = obj.firstCast;

	while (i < obj.stepCount) {
		obj.spells[i].bestCast = ahof_findBestCast(obj.spells[i]);

		i++;
	}
}


/*****************************************************************************
 * ahof_scoreNextSpells -- iterate through the spell object and add the values of
 *                    the best cast result for the current element and the
 *                    next element.  If the sum matches the value of a 
 *                    consecutive building special and click frenzy in either
 *                    order, identify the sequence number of the cast and
 *                    transition the script state to activate golden cookies.
 *
 *    input:  obj -- spellObject defined in ahof_advanceUntilCombo
 *
 *    output: VOID
 ****************************************************************************/
function ahof_scoreNextSpells(obj) {
	let i = obj.firstCast;
	// firstCast is usually zero but make sure to subtract from numSpells 
	// in case it begins to be used
	let numSpells = Object.keys(obj.spells).length - obj.firstCast;

	while (i < obj.stepCount) {
		let j = i + 1;

		// don't start counting if current spell isn't significant
		if (obj.spells[i].bestCast.value < 2) {
			// advance counter before exiting loop
			i++;
			continue;
		}

		// TODO:  handle sugar lump

		// add values of next four spells
		// >>> changed back to next two spells as super-ultra-mega-combo isn't implemented
		obj.spells[i].bestCast.scoreTwo = obj.spells[i].bestCast.value;
		while ((j < numSpells) && (j < (i + 2))) {
			obj.spells[i].bestCast.scoreTwo += obj.spells[j].bestCast.value;
			j++;
		}

		if (!obj.foundCombo) {
			// detection mechanism needs to be improved before auto-launching four-cookie combos
			// >>> should the comparison be ">= 9" to allow for blood frenzy and free sugar lump?
			if (obj.spells[i].bestCast.scoreTwo === 9) {
				// ahof_controlObject.numGoldenCookies = 2;  // <<< not needed until 4 cookie combos are added
				ahof_controlObject.seasonAndChime[0].season = obj.spells[i].bestCast.season;
				ahof_controlObject.seasonAndChime[0].chime = obj.spells[i].bestCast.sound === "sound" ? 1 : 0;

				ahof_controlObject.seasonAndChime[1].season = obj.spells[i + 1].bestCast.season;
				ahof_controlObject.seasonAndChime[1].chime = obj.spells[i + 1].bestCast.sound === "sound" ? 1 : 0;
				obj.advanceUntil = i;
				obj.foundCombo = true;
			}
		}

		i++;
	}

	if (obj.foundCombo) {
		ahof_controlObject.state = ahof_LAUNCH_COMBO;
	} else {
		console.log("ahof_ADVANCE_RETRY");
		ahof_controlObject.state = ahof_ADVANCE_RETRY;
	}
}


/*****************************************************************************
 * ahof_stepSpellCounter -- execute the least costly spell, delay until mana
 *                     tank is refilled, and repeat until desired number of 
 *                     spells have been cast
 *
 *    input:  numSpells -- integer containing the number of steps to advance
 *
 *    output: VOID
 ****************************************************************************/
async function ahof_stepSpellCounter(numSpells) {

	if (ahof_controlObject.state === ahof_ADVANCE_RETRY) {
		// reduce number of advancements by one to prevent missing combo
		numSpells -= 1;
	}

	for (let i = 0; i < numSpells; i++) {
		console.log("Executing count %i", i);

		let waitTime = ahof_secondsToRefill();

		let countPromise = new Promise((resolve, reject) => {
			setTimeout(() => resolve(ahof_M.castSpell(ahof_SpellHagglers)), waitTime)
		});

		await countPromise;
	}

	console.log("All spell casts complete.  Magic: %f  Game save before ahof_autoGolden:", ahof_M.magic);

	console.log(Game.WriteSave(1));
}


/*****************************************************************************
 * ahof_secondsToRefill -- uses the game's mana replenishment algorithm to 
 *                    determine the number of seconds needed to delay in order
 *                    to completely refill mana tank.
 *                    ***the rate at which mana replenishes increases as the 
 *                       tank fills.  Fuller tank is better.
 *
 *    input:  VOID
 *
 *    output: integer value of seconds needed to completely refill mana tank
 ****************************************************************************/
function ahof_secondsToRefill() {
	let currentLevel = ahof_M.magic;
	let maxLevel = ahof_M.magicM;

	let count = 0;

	while (currentLevel < maxLevel) {
		currentLevel += Math.max(0.002, Math.pow(currentLevel / Math.max(maxLevel, 100), 0.5)) * 0.002;
		count++;
	}

	return count / Game.fps * 1000;
}


/*****************************************************************************
 * ahof_findBestCast -- determine highest value result for season/sound combination
 *                 for current cast
 *
 *    input:  obj -- spellObject defined in ahof_advanceUntilCombo
 *
 *    output: bestCast -- object containing the result of the highest valued
 *                        result for that element
 ****************************************************************************/
function ahof_findBestCast(obj) {
	let gameSeasons = ["easter", "halloween"];
	let soundValues = ["sound", "nosound"];

	let bestCast = {};
	bestCast.value = obj[gameSeasons[0]][soundValues[0]].value;
	bestCast.name = obj[gameSeasons[0]][soundValues[0]].name;
	bestCast.season = gameSeasons[0];
	bestCast.sound = soundValues[0];

	// compare initial bestCast to all season/sound variations for this object
	for (let outeri in gameSeasons) {
		for (let outerj in soundValues) {
			let lVal = obj[gameSeasons[outeri]][soundValues[outerj]];

			for (let inneri in gameSeasons) {
				for (let innerj in soundValues) {
					if (bestCast.value < obj[gameSeasons[inneri]][soundValues[innerj]].value) {

						bestCast.name = obj[gameSeasons[inneri]][soundValues[innerj]].name;
						bestCast.value = obj[gameSeasons[inneri]][soundValues[innerj]].value;
						bestCast.season = gameSeasons[inneri];
						bestCast.sound = soundValues[innerj];
					}
				}
			}
		}
	}

	// don't report uniniteresting outcomes
	if (bestCast.value < 2) {
		bestCast.name = "";
		bestCast.value = 0;
	}

	return bestCast;
}


/*****************************************************************************
 * ahof_autoGolden -- check if a golden cookie exists.  If not cookie storm, pop 
 *               cookies on screen, then check for combination of buffs that
 *               would result in megacombo after FtHoF is cast. 
 *                   
 *    input:  VOID
 *                   
 *    output: VOID
 ****************************************************************************/
function ahof_autoGolden() {
	let goldenCookies = [];

	Game.shimmers.forEach(function (shimmer, i) {
		if (shimmer.type === "golden") {
			goldenCookies[i] = shimmer;
		}
	});

	if (goldenCookies.length <= 2) {  // fewer than 3 cookies on screen so safe to assume it's not a cookie storm
		goldenCookies.forEach(function (goldenCookie) { goldenCookie.pop(); });
	}

	if (Game.hasBuff('Frenzy') && (
		Game.hasBuff('High-five') ||
		Game.hasBuff('Congregation') ||
		Game.hasBuff('Luxuriant harvest') ||
		Game.hasBuff('Ore vein') ||
		Game.hasBuff('Oiled-up') ||
		Game.hasBuff('Juicy profits') ||
		Game.hasBuff('Fervent adoration') ||
		Game.hasBuff('Manabloom') ||
		Game.hasBuff('Delicious lifeforms') ||
		Game.hasBuff('Breakthrough') ||
		Game.hasBuff('Righteous cataclysm') ||
		Game.hasBuff('Golden ages') ||
		Game.hasBuff('Extra cycles') ||
		Game.hasBuff('Solar flare') ||
		Game.hasBuff('Winning streak') ||
		Game.hasBuff('Macrocosm'))
	) {
		let shortestBuff = ahof_TwoMinutes;
		for (let i in Game.buffs) {
			let buffTicks = (Game.buffs[i].time / Game.fps) * ahof_OneSecond;
			if (buffTicks > shortestBuff) { shortestBuff = buffTicks; }
		}

		// only launch megacombo if all of the buffs will last longer than a click frenzy interval
		if (shortestBuff > (30 * ahof_OneSecond)) {
			// don't launch megacombo if there isn't enough mana in the tank for a double cast
			if (ahof_M.magic === ahof_M.magicM) {
				clearInterval(ahof_controlObject.goldenInterval);
				ahof_launchCombo();
			} else {
				if (comboIsActive === 0) {
					console.log("Not enough mana, skipping combo launch");
				}
			}
		}
	}
}


/*****************************************************************************
 * ahof_launchCombo -- this is the "main" function of the second state.  Executes
 *                FtHoF casts and sells and re-buys buildings to allow for 
 *                double cast.
 *                   
 *    input:  VOID
 *                   
 *    output: VOID
 ****************************************************************************/
async function ahof_launchCombo() {
	if (ahof_controlObject.comboIsActive === 0) {

		console.log("Begin ahof_launchCombo");

		ahof_controlObject.comboIsActive = 1;

		ahof_controlObject.beginGameSave = Game.WriteSave(1);
		console.log(Game.WriteSave(1));

		getBuffsAndDuration();

		///  auto-click 10x/sec when combo is active
		ahof_controlObject.clickInterval = setInterval(Game.ClickCookie, 100);
		console.log("clickInterval: %d", ahof_controlObject.clickInterval);
		if (Game.hasGod('ruin')) {
			ahof_controlObject.godzamokInterval = setInterval(ahof_activateGodzamok, 100);
			console.log("godzamokInterval: %d", ahof_controlObject.godzamokInterval);
		}

		let origChimeType = Game.chimeType;
		let activeComboDelay = 0;

		ahof_controlObject.myOwnedTowers = ahof_WizardTowers.amount;

		// turn on golden switch
		if (Game.UpgradesById[331].canBuy() && !Game.UpgradesById[331].bought) {
			if (!Game.UpgradesById[331].buy()) {
				console.log("Golden Switch buy failed");
			} else {
				console.log("Golden Switch buy succeeded");
			}
		}

		ahof_controlObject.startComboChips = Math.floor(Game.HowMuchPrestige(Game.cookiesEarned));

		console.log("Start of combo, heavenly chips owned: " + ahof_controlObject.startComboChips);

		console.log("Expecting %s from season: %s, sound: %s", ahof_controlObject.seasonAndChime[0].cast, ahof_controlObject.seasonAndChime[0].season, ahof_controlObject.seasonAndChime[0].chime);

		// change season
		await ahof_prepareAndCast(ahof_controlObject.seasonAndChime[0].season, ahof_controlObject.seasonAndChime[0].chime);

		// first GC
		await ahof_popCookie();

		getBuffsAndDuration();

		// sell all towers
		await ahof_sellAllTowers(ahof_controlObject.myOwnedTowers);

		// buy one tower
		await ahof_buyOneTower();

		console.log("Expecting %s from season: %s, sound: %s", ahof_controlObject.seasonAndChime[1].cast, ahof_controlObject.seasonAndChime[1].season, ahof_controlObject.seasonAndChime[1].chime);

		await ahof_prepareAndCast(ahof_controlObject.seasonAndChime[1].season, ahof_controlObject.seasonAndChime[1].chime);

		// rebuy all towers
		await ahof_rebuyAllTowers(ahof_controlObject.myOwnedTowers);

		// second GC
		await ahof_popCookie();

		getBuffsAndDuration();

		await ahof_goldenSwitchDelay();

		// read time values for all active buffs and set delay to longest + 1000
		for (let i in Game.buffs) {
			// don't let Haggler's Misery cause Godzamok to run for an hour
			// NOTE: It's possible that a FtHoF cast will double the duration of a building special
			//       In this case, still kill Devastation buff after two minutes because it isn't 
			//       really a megacombo
			if ((Game.buffs[i].time / Game.fps * ahof_OneSecond) > ahof_TwoMinutes) { continue };

			let buffTicks = (Game.buffs[i].time / Game.fps) * ahof_OneSecond;
			if (buffTicks > activeComboDelay) { activeComboDelay = buffTicks; }
		}

		console.log("activeComboDelay: %d", activeComboDelay);

		await ahof_cleanupAfterCombo(activeComboDelay);

		// restore chime value
		Game.chimeType = origChimeType;

		// export save code
		ahof_controlObject.endGameSave = Game.WriteSave(1);

		ahof_controlObject.state = ahof_ADVANCE_COUNTER;
		ahof_initializeControlObject();

		ahof_advanceUntilCombo();
	} else {
		console.log("Combo is already active.");
	}

	console.log("End ahof_launchCombo");
}


/*****************************************************************************
 * ahof_prepareAndCast -- set game season and sound values and execute FtHoF cast 
 * 
 *    input:  season -- string containing requested season name
 *
 *            chime -- 1 or 0 for "chime" or "no chime"
 *
 *    output: VOID
 ****************************************************************************/
async function ahof_prepareAndCast(season, chime) {
	ahof_tabCounter++;
	let tabs = ahof_tab.repeat(ahof_tabCounter);

	console.log("%sBegin ahof_prepareAndCast", tabs);

	// change season 
	console.log("%sRequested season: %s, Game.season: %s", tabs, season, Game.season);
	if (!(season === Game.season)) {
		console.log("%sChanging season...", tabs);
		Game.UpgradesById[(season === "easter") ? 209 : 183].buy();
	}

	// toggle chime 
	console.log("%sRequested chime: %s, Game.chimeType: %s", tabs, chime, Game.chimeType);
	if (!(chime === Game.chimeType)) {
		console.log("%sChanging chimeType...", tabs);
		Game.chimeType = chime;
	}

	let ahof_prepareAndCastPromise = new Promise(resolve => {
		setTimeout(function () {

			console.log("%sCurrent magic: %d, Max magic: %d, Towers owned: %d", tabs, ahof_M.magic, ahof_M.magicM, ahof_WizardTowers.amount);

			// cast force
			ahof_M.castSpell(ahof_SpellFtHoF);

			console.log("%safter castSpell", tabs);
			resolve("%sspell cast", tabs);
		}, 500);
	});

	await ahof_prepareAndCastPromise;

	console.log("%sEnd ahof_prepareAndCast", tabs);

	ahof_tabCounter--;
}


/*****************************************************************************
 * ahof_popCookie -- executes "pop" command on all cookies on screen 
 *                   
 *    input:  VOID
 *                   
 *    output: VOID
 ****************************************************************************/
async function ahof_popCookie() {
	ahof_tabCounter++;
	let tabs = ahof_tab.repeat(ahof_tabCounter);

	console.log("%sBegin ahof_popCookie", tabs);

	let ahof_popCookiePromise = new Promise(resolve => {
		setTimeout(function () {
			console.log("%sShimmers:", tabs);
			for (let shm in Game.shimmers) {
				console.log(Game.shimmers[shm]);
			}

			// pop cookie
			Game.shimmers[0].pop();
			resolve("%sPoppin' cookies!", tabs);
		}, 100);
	});

	await ahof_popCookiePromise;

	console.log("%sEnd ahof_popCookie", tabs);

	ahof_tabCounter--;
}


/*****************************************************************************
 * ahof_goldenSwitchDelay -- it's possible that insufficient cookies exist to buy
 *                      golden switch the first time around.  This is a 
 *                      backstop function that should activate the switch if
 *                      it couldn't be done earlier in the script.
 *                   
 *    input:  VOID
 *                   
 *    output: VOID
 ****************************************************************************/
async function ahof_goldenSwitchDelay() {
	ahof_tabCounter++;
	let tabs = ahof_tab.repeat(ahof_tabCounter);

	console.log("%sBegin ahof_goldenSwitchDelay", tabs);

	let ahof_goldenSwitchDelay = new Promise(resolve => {
		setTimeout(function () {
			//  >>> this should ***not*** be necessary :(
			if (ahof_controlObject.godzamokInterval === 0) {
				console.log("%sActivating Godzamok...", tabs);
				ahof_activateGodzamok();
			}

			// turn on golden switch
			if (Game.UpgradesById[331].canBuy() && !Game.UpgradesById[331].bought) {
				if (!Game.UpgradesById[331].buy()) {
					console.log("%sGolden Switch buy failed", tabs);
				} else {
					console.log("%sGolden Switch buy succeeded", tabs);
				}
			}

			resolve("%scombo in progress", tabs);
		}, 100);
	});

	await ahof_goldenSwitchDelay;

	console.log("%sEnd ahof_goldenSwitchDelay", tabs);

	ahof_tabCounter--;
}


/*****************************************************************************
 * ahof_cleanupAfterCombo -- clear intervals and report those fabulous gainzzz!
 *                   
 *    input:  VOID
 *                   
 *    output: VOID
 ****************************************************************************/
async function ahof_cleanupAfterCombo(delay) {
	ahof_tabCounter++;
	let tabs = ahof_tab.repeat(ahof_tabCounter);

	console.log("%sBegin ahof_cleanupAfterCombo, delay for %d seconds", tabs, delay / ahof_OneSecond);

	let ahof_cleanupAfterComboPromise = new Promise(resolve => {
		setTimeout(function () {
			console.log("%sCombo is over.  Toggling ahof_controlObject.comboIsActive flag", tabs);
			ahof_controlObject.comboIsActive = 0;

			clearInterval(ahof_controlObject.godzamokInterval);
			clearInterval(ahof_controlObject.clickInterval);

			ahof_controlObject.godzamokInterval = 0;
			ahof_controlObject.clickInterval = 0;

			console.log(tabs + "Start of combo, heavenly chips owned: " + ahof_controlObject.startComboChips);
			ahof_controlObject.endComboChips = Math.floor(Game.HowMuchPrestige(Game.cookiesEarned));
			console.log(tabs + "End of combo, total heavenly chips owned: " + ahof_controlObject.endComboChips);
			let comboChipsEarned = ahof_controlObject.endComboChips - ahof_controlObject.startComboChips;
			console.log(tabs + "End of combo, heavenly chips earned: " + comboChipsEarned);

			resolve("%scombo has ended", tabs);
		}, delay);
	});

	await ahof_cleanupAfterComboPromise;

	console.log("%sEnd ahof_cleanupAfterCombo", tabs);

	ahof_tabCounter--;
}


/*****************************************************************************
 * ahof_sellAllTowers -- execute sale of all wizard towers
 *                   
 *    input:  VOID
 *                   
 *    output: VOID
 ****************************************************************************/
async function ahof_sellAllTowers() {
	ahof_tabCounter++;
	let tabs = ahof_tab.repeat(ahof_tabCounter);

	console.log("%sBegin ahof_sellAllTowers", tabs);

	let ahof_sellAllTowersPromise = new Promise(resolve => {
		setTimeout(function () {
			l('storeBulkSell').click();
			l('storeBulkMax').click();
			l("productIcon7").click();
			resolve("%sTowers sold", tabs);
		}, 100);
	});

	await ahof_sellAllTowersPromise;

	console.log("%sEnd ahof_sellAllTowers", tabs);

	ahof_tabCounter--;
}


/*****************************************************************************
 * ahof_buyOneTower -- buy single wizard tower
 *                   
 *    input:  VOID
 *                   
 *    output: VOID
 ****************************************************************************/
async function ahof_buyOneTower() {
	ahof_tabCounter++;
	let tabs = ahof_tab.repeat(ahof_tabCounter);

	console.log("%sBegin ahof_buyOneTower", tabs);

	let ahof_buyOneTowerPromise = new Promise(resolve => {
		setTimeout(function () {
			l('storeBulkBuy').click();
			l('storeBulk1').click();
			l('product7').click();
			resolve("%sPurchased one tower", tabs);
		}, 100);
	});

	await ahof_buyOneTowerPromise;

	console.log("%sEnd ahof_buyOneTower", tabs);

	ahof_tabCounter--;
}


/*****************************************************************************
 * ahof_rebuyAllTowers -- rebuy a maximum of 600 towers 
 *                   
 *    input:  numTowers -- integer representing number of towers owned when 
 *                         script launched.  May be larger than the maximum of
 *                         600 to rebuy.
 *                   
 *    output: VOID
 ****************************************************************************/
async function ahof_rebuyAllTowers(numTowers) {
	ahof_tabCounter++;
	let tabs = ahof_tab.repeat(ahof_tabCounter);

	console.log("%sBegin ahof_rebuyAllTowers", tabs);

	let ahof_rebuyAllTowersPromise = new Promise(resolve => {
		setTimeout(function () {
			// prevent overbuying at high building numbers
			// >>> number of towers may be lower at earlier place in game
			if (numTowers > 600) {
				numTowers = 600;
			}

			l('storeBulk100').click();
			for (let i = 0; i < parseInt(numTowers / 100); i++) {
				l('product7').click();
			}

			l('storeBulk10').click();
			for (let i = 0; i < parseInt((numTowers % 100) / 10); i++) {
				l('product7').click();
			}

			l('storeBulk1').click();
			for (let i = 0; i < parseInt((numTowers % 100) / 1); i++) {
				l('product7').click();
			}

			resolve("%sTowers purchased", tabs);
		}, 100);
	});

	await ahof_rebuyAllTowersPromise;

	console.log("%sEnd ahof_rebuyAllTowers", tabs);

	ahof_tabCounter--;
}


//sell and rebuy buildings for click frenzy
/*****************************************************************************
 * ahof_activateGodzamok -- sells and re-buys buildings in order to activate the 
 *                     godzamok buff
 *                   
 *    input:  VOID
 *                   
 *    output: VOID
 ****************************************************************************/
function ahof_activateGodzamok() {
	let buildingList = [0, 2, 3, 4, 5, 0, 0];
	if (Game.hasGod('ruin') && !Game.hasBuff('Devastation')) {
		for (let theBuilding in buildingList) {
			let numCurrentBuilding = Game.ObjectsById[buildingList[theBuilding]].amount;

			if (numCurrentBuilding >= 100) {
				let numCurrentBuildingByHundred = parseInt(numCurrentBuilding / 100);

				let storeProduct = "product" + buildingList[theBuilding];

				// prevent over-buying 
				if (numCurrentBuildingByHundred > 6) {
					numCurrentBuildingByHundred = 6;
				}

				l('storeBulkSell').click();
				l('storeBulkMax').click();
				l(storeProduct).click();

				// rebuy all buildings
				l('storeBulkBuy').click();
				l('storeBulk100').click();
				for (let i = 0; i < numCurrentBuildingByHundred; i++) {
					l(storeProduct).click();
				}
			}
		}
	}
}


/*****************************************************************************
 * getBuffsAndDuration -- iterates through list of active buffs and reports
 *                     name of buff and duration seconds remaining 
 *                   
 *    input:  VOID
 *                   
 *    output: VOID
 ****************************************************************************/
function getBuffsAndDuration() {
	for (let ahof_Buff in Game.buffs) {
		console.log("Buff %s for duration %d seconds", Game.buffs[ahof_Buff].name, Game.buffs[ahof_Buff].time / Game.fps);
	}
}

///////////////////////////////////////
