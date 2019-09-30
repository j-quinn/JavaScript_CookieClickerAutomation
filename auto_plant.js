/* plant seeds, scan garden for mutations, remove unwanted plants */

//garden states
var mg_EMPTY = 0;
var mg_DELAY_PLANT = 1;
var mg_GROW_PARENTS = 2;
var mg_CHECK_MUTS = 3;
var mg_REPLANT = 4;
var mg_GROW_MUTATION = 5;
var mg_GROW_WEED_MUTS = 6;
var mg_REPLANT_ONE = 7;
var mg_NO_JQB = 8;
var mg_JQB_NO_EVERDAISY = 9;
var mg_JQB_AFTER_EVERDAISY = 10;
var mg_JQB_HARVESTED = 11;

// seed types for JQB processing
var mg_SEED_ELDERWORT = 7;
var mg_SEED_QUEENBEET = 20;
var mg_SEED_TIDYGRASS = 31;
var mg_SEED_EVERDAISY = 32;

//soil types
var mg_DIRT = 0;
var mg_FERTILIZER = 1;
var mg_CLAY = 2;
var mg_PEBBLES = 3;
var mg_WOOD_CHIPS = 4;

var mg_M = Game.ObjectsById[2].minigame;

var mg_START_DATE = "";
var mg_FINISH_DATE = "";


//container to hold our current garden metadata
var mg_PlotState = mg_PlotState || {};

//optimal seed patterns for two-parent combinations
//Plant A is the more expensive of the pair
var mg_PlotPatternsRegular = mg_PlotPatternsRegular || {
    level0: {
        numTiles: 0,
        A: [0],
        B: [0]
    },
    level1: {
        numTiles: 2,
        A: [[0, 0], [0, 1]], // 2 x 2 Level 1
        B: [[0, 0], [1, 0]]
    },
    level2: {
        numTiles: 2,
        A: [[0, 1, 0], [0, 0, 0]], // 3 x 2 Level 2
        B: [[0, 0, 0], [0, 1, 0]]
    },
    level3: {
        numTiles: 3,
        A: [[0, 0, 0], [0, 1, 0], [0, 0, 0]], // 3 x 3 Level 3
        B: [[0, 0, 0], [1, 0, 1], [0, 0, 0]]
    },
    level4: {
        numTiles: 4,
        A: [[0, 0, 0, 0], [1, 0, 1, 0], [0, 0, 0, 0]], // 4 x 3 Level 4
        B: [[0, 0, 0, 0], [0, 1, 0, 1], [0, 0, 0, 0]]
    },
    level5: {
        numTiles: 6,
        A: [[0, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 0]], // 4 x 4 Level 5
        B: [[1, 0, 0, 1], [0, 0, 0, 0], [0, 0, 0, 0], [1, 0, 0, 1]]
    },
    level6: {
        numTiles: 8,
        A: [[1, 0, 0, 1, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [1, 0, 0, 1, 0]], // 5 x 4 Level 6
        B: [[0, 1, 0, 0, 1], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 1, 0, 0, 1]]
    },
    level7: {
        numTiles: 8,
        A: [[1, 0, 0, 1, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [1, 0, 0, 1, 0], [0, 0, 0, 0, 0]], // 5 x 5 Level 7
        B: [[0, 1, 0, 0, 1], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 1, 0, 0, 1], [0, 0, 0, 0, 0]]
    },
    level8: {
        numTiles: 9,
        A: [[0, 0, 0, 0, 0, 0], [1, 0, 0, 1, 0, 0], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 1], [1, 0, 0, 1, 0, 0]], // 6 x 5 Level 8
        B: [[1, 0, 0, 1, 0, 0], [0, 0, 0, 0, 0, 1], [0, 0, 0, 0, 0, 0], [1, 0, 0, 1, 0, 0], [0, 0, 0, 0, 0, 0]]
    },
    level9: {
        numTiles: 10,
        A: [[0, 0, 0, 0, 0, 0], [0, 1, 0, 0, 1, 0], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0], [0, 1, 0, 0, 1, 0], [0, 0, 0, 0, 0, 0]], // 6 x 6 Level 9
        B: [[0, 0, 0, 0, 0, 0], [1, 0, 1, 0, 0, 1], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0], [1, 0, 0, 1, 0, 1], [0, 0, 0, 0, 0, 0]]
    },
    level10: { // same as level 9  
        numTiles: 10,
        A: [[0, 0, 0, 0, 0, 0], [0, 1, 0, 0, 1, 0], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0], [0, 1, 0, 0, 1, 0], [0, 0, 0, 0, 0, 0]], // 6 x 6 Level 9
        B: [[0, 0, 0, 0, 0, 0], [1, 0, 1, 0, 0, 1], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0], [1, 0, 0, 1, 0, 1], [0, 0, 0, 0, 0, 0]]
    }
}

var mg_Plants = mg_Plants || {
    'bakerWheat': {
        sequence: 0,
    },
    'thumbcorn': {
        sequence: 1,
        parents: ['bakerWheat'],
        plotPattern: 'regular',
        double: 0,
    },
    'cronerice': {
        sequence: 2,
        parents: ['bakerWheat', 'thumbcorn'],
        plotPattern: 'regular',
        double: 1,
    },
    'gildmillet': {
        sequence: 6,
        parents: ['cronerice', 'thumbcorn'],
        plotPattern: 'regular',
        double: 1,
    },
    'clover': {
        sequence: 10,
        parents: ['bakerWheat', 'gildmillet'],
        plotPattern: 'regular',
        double: 1,
    },
    'goldenClover': {
        sequence: 28,
        parents: ['bakerWheat', 'gildmillet'],
        plotPattern: 'regular',
        double: 1,
    },
    'shimmerlily': {
        sequence: 13,
        parents: ['gildmillet', 'clover'],
        plotPattern: 'regular',
        double: 1,
    },
    'elderwort': {
        sequence: 16,
        parents: ['cronerice', 'shimmerlily'],
        plotPattern: 'regular',
        double: 1,
    },
    'bakeberry': {
        sequence: 11,
        parents: ['bakerWheat'],
        plotPattern: 'regular',
        generator: 1,
        double: 1,
    },
    'chocoroot': {
        sequence: 7,
        parents: ['bakerWheat', 'brownMold'],
        plotPattern: 'regular',
        weedParent: 1,
        generator: 1,
        double: 0,
    },
    'whiteChocoroot': {
        sequence: 8,
        parents: ['chocoroot', 'whiteMildew'],
        plotPattern: 'regular',
        generator: 1,
        double: 0,
    },
    'whiteMildew': {
        sequence: 3,
        parents: ['brownMold'],
        plotPattern: 'regular',
        weedParent: 1,
        double: 0,
    },
    'brownMold': {
        sequence: 999,
        parents: [''],
    },
    'meddleweed': {
        sequence: 999,
        parents: [''],
    },
    'whiskerbloom': {
        sequence: 23,
        parents: ['whiteChocoroot', 'shimmerlily'],
        plotPattern: 'regular',
        double: 1,
    },
    'chimerose': {
        sequence: 26,
        parents: ['whiskerbloom', 'shimmerlily'],
        plotPattern: 'regular',
        double: 1,
    },
    'nursetulip': {
        sequence: 27,
        parents: ['whiskerbloom'],
        plotPattern: 'regular',
        double: 1,
    },
    'drowsyfern': {
        sequence: 20,
        parents: ['chocoroot', 'keenmoss'],
        plotPattern: 'regular',
        double: 1,
    },
    'wardlichen': {
        sequence: 17,
        parents: ['cronerice', 'keenmoss'],
        plotPattern: 'regular',
        double: 1,
    },
    'keenmoss': {
        sequence: 14,
        parents: ['brownMold', 'greenRot'],
        plotPattern: 'regular',
        weedParent: 1,
        double: 1,
    },
    'queenbeet': {
        sequence: 18,
        parents: ['bakeberry', 'chocoroot'],
        plotPattern: 'regular',
        generator: 1,
        double: 1,
    },
    'queenbeetLump': {
        sequence: 29,
        parents: ['queenbeet'],
        plotPattern: 'special',
        generator: 1,
        double: 0,
    },
    'duketater': {
        sequence: 21,
        parents: ['queenbeet'],
        plotPattern: 'regular',
        generator: 1,
        double: 1,
    },
    'crumbspore': {
        sequence: 999,
        parents: [''],
    },
    'doughshroom': {
        sequence: 5,
        parents: ['crumbspore'],
        plotPattern: 'regular',
        weedParent: 1,
        double: 1,
    },
    'glovemorel': {
        sequence: 15,
        parents: ['crumbspore', 'thumbcorn'],
        plotPattern: 'regular',
        weedParent: 1,
        double: 1,
    },
    'cheapcap': {
        sequence: 22,
        parents: ['crumbspore', 'shimmerlily'],
        plotPattern: 'regular',
        weedParent: 1,
        double: 1,
    },
    'foolBolete': {
        sequence: 19,
        parents: ['doughshroom', 'greenRot'],
        plotPattern: 'regular',
        double: 1,
    },
    'wrinklegill': {
        sequence: 4,
        parents: ['crumbspore', 'brownMold'],
        plotPattern: 'regular',
        weedParent: 2,
        double: 0,
    },
    'greenRot': {
        sequence: 12,
        parents: ['clover', 'whiteMildew'],
        plotPattern: 'regular',
        double: 1,
    },
    'shriekbulb': {
        sequence: 24,
        parents: ['wrinklegill', 'elderwort'],
        plotPattern: 'regular',
        double: 1,
    },
    'tidygrass': {
        sequence: 9,
        parents: ['bakerWheat', 'whiteChocoroot'],
        plotPattern: 'regular',
        double: 1,
    },
    'everdaisy': {
        sequence: 30,
        parents: ['tidygrass', 'elderwort'],
        plotPattern: 'special',
        double: 1,
    },
    'ichorpuff': {
        sequence: 25,
        parents: ['crumbspore', 'elderwort'],
        plotPattern: 'regular',
        weedParent: 1,
        double: 1,
    },
};


// IIFE 
(function mg_Interval() {
    // console.log("Begin mg_Interval()...");

    var interval = 0;

    if (typeof (mg_PlotState.gardenState) === 'undefined') {
        console.log("gardenState is undefined");

        // initialize plot state object
        mg_Initialize();

        console.log("After mg_Initialize(), mg_PlotState.gardenState: %s", mg_IdentifyState(mg_PlotState.gardenState));
    }

    if (mg_PlotState.mg_maintIntervalId) {
        mg_clearInterval();

        mg_M.computeStepT();
        var interval = (mg_M.stepT + 1) * 500;

        // console.log("next interval in %d ticks", interval);

        mg_PlotState.mg_maintIntervalId = setInterval(mg_MaintainGarden, interval);

    } else {
        mg_PlotState.mg_maintIntervalId = 1;
        console.log("Executing initial mg_MaintainGarden");
        mg_MaintainGarden();

        mg_Interval();
    }

    // console.log("End mg_Interval()...");
}());


function mg_clearInterval() {
    clearInterval(mg_PlotState.mg_maintIntervalId);
}


function mg_MaintainGarden() {
    if (typeof (mg_PlotState.mg_Iteration) === 'undefined') mg_PlotState.mg_Iteration = 0;

    console.log("%d mg_MaintainGarden()...", mg_PlotState.mg_Iteration++);

    console.log("Plot state: %s", mg_IdentifyState(mg_PlotState.gardenState));
    console.log("Current plant: %s", mg_PlotState.currentPlant.name);

    mg_ScanPlot();

    // main script
    switch (mg_PlotState.gardenState) {
        case mg_EMPTY:
            mg_ActivateSoil(mg_FERTILIZER);
            mg_ProcessPlot();
            // make sure plot is empty
            mg_ClearPlot();
            // plant breeding pattern
            mg_PlantBreedingPattern();
            break;
        case mg_DELAY_PLANT:
            if (mg_PlotState.plantCounter == 0) {
                // update garden state
                console.log("Transitioning to mg_GROW_PARENTS...");
                mg_PlotState.gardenState = mg_GROW_PARENTS;
            }
            mg_ProcessPlot();
            // remove weeds and fungi
            mg_ClearPlot();
            break;
        case mg_GROW_PARENTS:
            mg_ActivateSoil(mg_FERTILIZER);
            mg_ProcessPlot();
            mg_ClearPlot();
            mg_EvalStateGrowParents();
            mg_GetGrowthTime();
            break;
        case mg_CHECK_MUTS:
            mg_ActivateSoil(mg_WOOD_CHIPS);
            mg_ProcessPlot();
            mg_ClearPlot();
            mg_EvalStateCheckMuts();
            break;
        case mg_REPLANT:
            mg_UpdateUnlockedPlants();
            mg_ActivateSoil(mg_FERTILIZER);
            mg_ProcessPlot();
            mg_ClearPlot();
            mg_PlantBreedingPattern();
            break;
        case mg_REPLANT_ONE:
            mg_ActivateSoil(mg_FERTILIZER);
            mg_RePlantOneType();
            break;
        case mg_GROW_MUTATION:
            mg_ActivateSoil(mg_FERTILIZER);
            mg_ProcessPlot();
            mg_ClearPlot();
            mg_EvalStateGrowMutation();
            break;
        case mg_GROW_WEED_MUTS:
            // harvest about-to-expire weeds to get fungus mutations
            // Don't use wood chips as they reduce weed spawn chance
            mg_ActivateSoil(mg_FERTILIZER);
            mg_ProcessPlot();
            mg_ClearPlot();
            mg_EvalStateGrowWeedMuts();
            break;
        case mg_NO_JQB:
            mg_CheckAllJQBPods();
            mg_ClearPlot();
            break;
        case mg_JQB_NO_EVERDAISY:
            mg_CheckEverdaisy();
            break;
        case mg_JQB_AFTER_EVERDAISY:
            mg_CheckJQBGrowth();
            break;
        case mg_JQB_HARVESTED:
            mg_SacrificeGarden();
            break;
        default:
            console.log("womp womp");
    }

    // console.log("End mg_MaintainGarden()...\n");
}


function mg_Initialize() {
    // console.log("Begin mg_Initialize()...");

    mg_START_DATE = Date();

    // controls the rate at which the mg_MaintainGarden() function is called
    mg_PlotState.mg_maintIntervalId = mg_PlotState.mg_maintIntervalId || 0;

    // get farm level
    mg_PlotState.level = mg_PlotState.level || Game.ObjectsById[2].level;

    // >>> currently giving a safe value here to prevent undefined access
    //     may need to fix this.
    let plotLevel = "level" + mg_PlotState.level;
    mg_PlotState.plotPattern = {
        A: mg_PlotPatternsRegular[plotLevel].A,
        B: mg_PlotPatternsRegular[plotLevel].B
    };
    mg_PlotState.numTiles = mg_PlotPatternsRegular[plotLevel].numTiles;

    // initialize tile array
    mg_PlotState.numPlants = 0;

    mg_PlotState.lockedPlantInPlot = 0;

    // reset plotState object
    mg_PlotState.plot = [];
    // get data for each plot tile
    for (let y = 0; y < 6; y++) {
        mg_PlotState.plot[y] = [];
        for (let x = 0; x < 6; x++) {
            mg_PlotState.plot[y][x] = { id: 0, age: 0, locked: 0, remove: 0, harvest: 0 };
        }
    }

    // plantCounter always gets reset to prevent getting stuck in a loop
    mg_PlotState.plantCounter = 0;
    mg_PlotState["currentPlant"] = { id: 0, name: "", parents: [] };

    mg_PlotState.reProcess = 0;

    for (let plnt in mg_Plants) {
        mg_Plants[plnt].unlocked = 0;
        mg_Plants[plnt].growing = 0;
        mg_Plants[plnt].first = { age: 0, x: 0, y: 0 };
    }

    mg_PlotState.jqbPod = {};
    //number of pods equal to (width / 3) * (height / 3)
    //better to be done dynamically but for now, just use known values
    //number of pods available will be 0, 1, 2, or 4
    if (mg_PlotState.level >= 3 && mg_PlotState.level < 8) {
        mg_PlotState.jqbPod.numPods = 1;
    } else if (mg_PlotState.level == 8) {
        mg_PlotState.jqbPod.numPods = 2;
    } else if (mg_PlotState.level > 8) {
        mg_PlotState.jqbPod.numPods = 4;
    }

    console.log("Found %d pods", mg_PlotState.jqbPod.numPods);

    //pods contain queenbeets at 
    //[origin - 1, origin - 1], [origin, origin - 1], [origin + 1, origin - 1], 
    //[origin - 1, origin], do not plant, [origin + 1, origin], 
    //[origin - 1, origin + 1], [origin, origin + 1], [origin + 1, origin + 1]
    mg_PlotState.jqbPod.plantCoords = [
        [-1, -1], [0, -1], [1, -1],
        [-1, 0], [0, 0], [1, 0],
        [-1, 1], [0, 1], [1, 1],
    ];

    //plant three elderwort to complete line across plot
    //to be used as parent for everdaisy
    mg_PlotState.jqbPod.elderwortByPodId = {
        0: [[3, 2], [4, 2], [5, 2]],
        1: [[3, 3], [4, 3], [5, 3]],
        2: [[0, 2], [1, 2], [2, 2]],
        3: [[0, 3], [1, 3], [2, 3]]
    };

    let podCoords = [[1, 1], [4, 1], [1, 4], [4, 4]];

    for (let i = 0; i < mg_PlotState.jqbPod.numPods; i++) {
        mg_PlotState.jqbPod[i] = podCoords[i];
        mg_PlotState.jqbPod[i].mature = 0;
        mg_PlotState.jqbPod[i].jqbFound = 0;
        mg_PlotState.jqbPod[i].mature = 0;
        mg_PlotState.jqbPod[i].expired = 0;
        mg_PlotState.jqbPod[i].cleared = 0;
    }

    mg_InitPods();

    mg_ScanPlot();
    mg_UpdateUnlockedPlants();

    mg_PlotState.weedCount = 0;
    mg_PlotState.weedsAreUnlocked = 0;
    mg_UpdateWeeds();

    // calculate ticks to maturity and total lifespan ticks
    mg_GetAgeAndMaturationTicks();

    // calculate the cost per tick to maturity for A/B pattern
    mg_GetPlantCostPerTick();

    if (mg_PlotState.lockedPlantInPlot) {
        console.log("locked plants are growing...");
        switch (mg_PlotState.currentPlant.name) {
            case "everdaisy":
                mg_PlotState.gardenState = mg_JQB_NO_EVERDAISY;
                break;
            case "queenbeetLump":
                mg_PlotState.gardenState = mg_NO_JQB;
                break;
            case "bakerWheat":
                mg_PlotState.gardenState = mg_JQB_AFTER_EVERDAISY;
                break;
            case "cronerice":
                if (mg_Plants['cronerice'].growing) {
                    mg_PlotState.gardenState = mg_GROW_MUTATION;
                } else if (mg_Plants['meddleweed'].growing) {
                    // somehow a weed got in there
                    mg_PlotState.gardenState = mg_EMPTY;
                    mg_Plants['meddleweed'].growing = 0;
                    // weed is being counted as a locked plant, reset counter
                    mg_PlotState.lockedPlantInPlot = 0;
                    console.log("Locked plant was a weed and has been marked for remove");
                }
                break;
            default:
                mg_PlotState.gardenState = mg_GROW_MUTATION;
                break;
        }
    } else {
        // simpler to clear the plot and start over
        mg_PlotState.gardenState = mg_EMPTY;
        // TODO: scan plot for existing breeding pattern and re-use it if it 
        // matches the currentPlant's breeding pattern
    }

    // console.log("End mg_Initialize()...");
}


function mg_InitPods() {
    var podCoords = [[1, 1], [4, 1], [1, 4], [4, 4]];

    for (var i = 0; i < mg_PlotState.jqbPod.numPods; i++) {
        mg_PlotState.jqbPod[i] = podCoords[i];
        mg_PlotState.jqbPod[i].mature = 0;
        mg_PlotState.jqbPod[i].jqbFound = 0;
        mg_PlotState.jqbPod[i].mature = 0;
        mg_PlotState.jqbPod[i].expired = 0;
        mg_PlotState.jqbPod[i].cleared = 0;
    }
}


function mg_RePlantOneType() {
    // console.log("Begin mg_RePlantOneType()...");

    var rePlant = "";
    var survivor = "";
    var rePlantPattern = "";
    var survivorPattern = "";

    // determine which plant is still alive and calculate the time remaining
    // until it expires
    if (mg_IsGrowthPattern("A")) {
        survivor = mg_PlotState.currentPlant.parentA;
        rePlant = mg_PlotState.currentPlant.parentB;
        survivorPattern = "A";
        rePlantPattern = "B";
    } else {
        survivor = mg_PlotState.currentPlant.parentB;
        rePlant = mg_PlotState.currentPlant.parentA;
        survivorPattern = "B";
        rePlantPattern = "A";
    }

    // if ticks remaining in current plants is greater than the number of ticks
    // required for the other plant to reach maturity, schedule re-plant.
    // re-plant if remaining plant is immortal
    if (mg_HasTimeForReplant(survivorPattern, survivor, rePlant)) {
        // remove any plants that may still be growing in the re-plant pattern
        mg_ClearPattern(rePlantPattern);

        if (!(mg_PlotState.gardenState == mg_DELAY_PLANT)) {
            mg_PlantParent(rePlant, rePlantPattern, 0);
        }
    } else {
        // insufficient time remaining for re-plant, start fresh
        console.log("Insufficient time remaining to replant one parent");
        console.log("Transitioning to mg_REPLANT...");
        mg_PlotState.gardenState = mg_REPLANT;
    }

    // console.log("End mg_RePlantOneType()...");
}


function mg_PlantBreedingPattern() {
    // console.log("Begin mg_PlantBreedingPattern()...");

    var parentA = "";
    var parentB = "";

    if (mg_PlotState.gardenState == mg_EMPTY || mg_PlotState.doublePlant) {

        console.log("Planting %s", mg_PlotState.currentPlant.name);

        // get parents
        mg_PlotState.currentPlant.parents = mg_Plants[mg_PlotState.currentPlant.name].parents;
        parentA = parentB = mg_PlotState.currentPlant.parents[0];
        if (mg_PlotState.currentPlant.parents.length == 2) {
            var temp = "";

            parentB = mg_PlotState.currentPlant.parents[1];
        }

        mg_PlotState.currentPlant.parentA = parentA;
        mg_PlotState.currentPlant.parentB = parentB;

        // check if parents are weeds to protect them during mg_ClearPlot for
        // mg_GROW_PARENTS and mg_CHECK_MUTS
        mg_WeedParents();

        console.log("parentA: %s, parentB: %s", parentA, parentB);
        console.log("parentA.unlocked: %d", mg_Plants[parentA].unlocked);
        console.log("parentB.unlocked: %d", mg_Plants[parentB].unlocked);

        // check to see if parents are unlocked, if not, transition to weed
        // mutations
        if (mg_Plants[parentA].unlocked && mg_Plants[parentB].unlocked) {
            // get the plot pattern
            var plotLevel = "level" + mg_PlotState.level;
            mg_PlotState.plotPattern = {
                A: mg_PlotPatternsRegular[plotLevel].A,
                B: mg_PlotPatternsRegular[plotLevel].B
            };
            mg_PlotState.numTiles = mg_PlotPatternsRegular[plotLevel].numTiles;

            // calculate the number of ticks needed for each plant
            var numTicksParentA = mg_Plants[parentA].maturityTicks;
            var numTicksParentB = mg_Plants[parentB].maturityTicks;

            // calculate delay necessary for both plants to mature at the same
            // time
            var numDelayTicks = Math.abs(numTicksParentA - numTicksParentB);
            var plantToDelay = "";
            var plantNow = "";
            var patternNow = "";
            var patternDelay = "";
            if (numTicksParentA < numTicksParentB) {
                console.log("Swapping parentA and parentB");
                plantNow = parentB;
                patternNow = "B";
                plantToDelay = parentA;
                patternDelay = "A";
            } else {
                plantNow = parentA;
                patternNow = "A";
                plantToDelay = parentB;
                patternDelay = "B";
            }

            // plant seeds
            if (!(mg_PlotState.gardenState == mg_DELAY_PLANT)) {
                if (!mg_IsGrowthPattern(patternNow) || !mg_HasTimeForReplant(patternNow, plantNow, plantToDelay)) {
                    mg_ClearPattern(patternNow);
                    mg_PlantParent(plantNow, patternNow, 0);
                } else {
                    numDelayTicks = 0;
                }

                if (!mg_IsGrowthPattern(patternDelay) || !mg_HasTimeForReplant(patternDelay, plantToDelay, plantNow)) {
                    mg_ClearPattern(patternDelay);
                    mg_PlantParent(plantToDelay, patternDelay, numDelayTicks);
                }
            }
        } else {
            console.log("Parents not unlocked");
            if (mg_PlotState.weedsAreUnlocked) {
                // something is broken
                // re-run plant structure initialization
                // get list of owned plant types
                mg_UpdateUnlockedPlants();
                mg_UpdateWeeds();
            } else {
                console.log("Transitioning to mg_GROW_WEED_MUTS...");
                mg_PlotState.gardenState = mg_GROW_WEED_MUTS;
            }
        }
    } else {
        if (mg_PlotState.lockedPlantInPlot) {
            console.log("Unable to plant breeding pattern, locked plant in plot, transitioning to mg_GROW_MUTATION");
            mg_PlotState.gardenState = mg_GROW_MUTATION;
        }
    }

    // console.log("End mg_PlantBreedingPattern()...");
}


function mg_ActivateSoil(soilType) {
    if (mg_M.nextSoil < Date.now()) {
        if (!(mg_M.soil == soilType)) {
            switch (soilType) {
                case mg_WOOD_CHIPS:
                    console.log("Activating Wood Chips...");
                    l('gardenSoil-4').click();
                    break;
                case mg_FERTILIZER:
                    console.log("Activating Fertilizer...");
                    l('gardenSoil-1').click();
                    break;
                default:
                    break;
            }
        } else {
            // console.log("Soil type %d is already active", soilType);
        }
    } else {
        if (mg_M.nextSoil) {
            console.log("Need to wait %d seconds to update soil", (mg_M.nextSoil - Date.now()) / 1000);
        }
    }
}


//plant maturity is stored in the plantsById mature value
//the value in the game's "plants" object is converted to matureBase
function mg_GetGrowthTime() {
    // console.log("Begin mg_GetGrowthTime()...");

    var numMatures = 0;

    for (var y = 0; y < 6; y++) {
        for (var x = 0; x < 6; x++) {
            if (mg_PlotState.plot[y][x].parent) {
                if (mg_PlotState.plot[y][x].id) {
                    if (mg_PlotState.plot[y][x].age >= mg_M.plantsById[(mg_PlotState.plot[y][x].id - 1)].mature) {
                        numMatures++;
                    }
                }
            }
        }
    }

    if (mg_PlotState.gardenState == mg_GROW_PARENTS) {
        if (numMatures >= (mg_PlotState.numTiles * 0.8)) {
            // advance to next state
            console.log("Transitioning to mg_CHECK_MUTS...");
            mg_PlotState.gardenState = mg_CHECK_MUTS;

            // gardenState has changed
            mg_MaintainGarden();
        }
    }

    // console.log("End mg_GetGrowthTime()...");
}


//execute in two stages
//1) read the plot = mg_ScanPlot()
//2) characterize the data = mg_ProcessPlot()
function mg_ScanPlot() {
    // console.log("Begin mg_ScanPlot()...");

    mg_PlotState.numPlants = 0;

    // get data for each plot tile
    for (var y = 0; y < 6; y++) {
        for (var x = 0; x < 6; x++) {
            // load current growth pattern 
            var checkTile = (mg_PlotState.plotPattern.A[y][x] || mg_PlotState.plotPattern.B[y][x]);

            mg_PlotState.plot[y][x].parent = checkTile;

            // examine game's plot tiles
            if (mg_M.plot[y][x][0] == 0) {
                mg_PlotState.plot[y][x].id = 0;
                mg_PlotState.plot[y][x].age = 0;
                mg_PlotState.plot[y][x].locked = 0;
                mg_PlotState.plot[y][x].remove = 0;
                mg_PlotState.plot[y][x].harvest = 0;
            } else {
                mg_PlotState.numPlants++;
            }

            // update age
            mg_PlotState.plot[y][x].age = mg_M.plot[y][x][1];
            mg_PlotState.plot[y][x].id = mg_M.plot[y][x][0];
        }
    }

    // console.log("End mg_ScanPlot()...");
}


function mg_ProcessPlot() {
    // console.log("Begin mg_ProcessPlot()...");

    let entryState = mg_PlotState.gardenState;

    // process the plot 
    for (var y = 0; y < 6; y++) {
        for (var x = 0; x < 6; x++) {
            if (mg_PlotState.plot[y][x].id) {
                var plantName = mg_M.plantsById[(mg_PlotState.plot[y][x].id - 1)].key;

                if (mg_PlotState.gardenState == mg_EMPTY) {
                    console.log("mg_EMPTY Removing %s at x: %d, y: %d", plantName, x, y);
                    mg_PlotState.plot[y][x].remove = 1;
                }

                // special case for meddleweed and mutations
                if (mg_Plants[plantName].sequence == 999 || mg_PlotState.gardenState == mg_GROW_WEED_MUTS) {
                    mg_ProcessWeed(plantName, x, y);
                } else {
                    mg_PlotState.plot[y][x].remove = mg_MarkForRemove(plantName, x, y);
                }

                mg_CheckOldestPlantInPlot(plantName, x, y);

                // remove mature plants from breeding pattern before harvesting
                // as "harvest" will re-run mg_ProcessPlot
                if (mg_Plants[plantName].unlocked == 0 && (mg_PlotState.plot[y][x].age > mg_M.plants[plantName].mature)) {
                    // leave meddleweed in order to harvest on last tick
                    if (!(plantName == 'meddleweed')) {
                        // click to harvest
                        console.log("Marking %s for harvest at x: %d, y: %d", plantName, x, y);
                        mg_PlotState.plot[y][x].harvest = 1;
                        console.log("Ordering reProcess at plant is mature");
                        mg_PlotState.reProcess = 2;
                    }
                    //					}
                } // harvest mature plant
            } // plant exists
        } // inner loop
    }// outer loop

    // it's possible that a growing mutation can be overtaken by one of the 
    // crumbspore that are being used as parents
    if (mg_PlotState.numPlants < mg_PlotState.lockedPlantInPlot) {
        // wait for current growth to finish and then re-initialize
        if (mg_PlotState.numPlants == 0) {
            mg_Initialize();
        }
    }

    // transition to mg_EMPTY
    if (mg_PlotState.gardenState !== mg_GROW_WEED_MUTS) {
        if (mg_PlotState.lockedPlantInPlot === 0 && mg_PlotState.numPlants === 0) {
            // no locked plants && no plants && weeds unlocked
            mg_PlotState.gardenState = mg_EMPTY;
            console.log("Transitioning to mg_EMPTY, no lockedPlantInPlot, numPlants == 0, weedsAreUnlocked");
        }
    }

    if (mg_PlotState.reProcess) {
        console.log("reprocess has been ordered..");
        mg_ClearPlot();
        if (mg_PlotState.reProcess > 1) {
            mg_ScanPlot();
        }
        mg_PlotState.reProcess = 0;
        mg_ProcessPlot();
    }

    // console.log("End mg_ProcessPlot()...");
}


function mg_EvalStateGrowParents() {
    let entryState = mg_PlotState.gardenState;

    let growthPatternA = mg_IsGrowthPattern("A");
    let growthPatternB = mg_IsGrowthPattern("B");

    if (mg_PlotState.weedsAreUnlocked) {
        if (mg_Plants[mg_PlotState.currentPlant.name].growing) {
            console.log("weeds are unlocked, currentPlant is growing, transitioning to mg_GROW_MUTATION");
            mg_PlotState.gardenState = mg_GROW_MUTATION;
        } else {
            if (mg_PlotState.currentPlant.parents.length == 2 && (growthPatternA != growthPatternB)) {
                console.log("currentPlant is not growing, one parent expired, Transitioning to mg_REPLANT_ONE");
                mg_PlotState.gardenState = mg_REPLANT_ONE;
            } else if (mg_PlotState.lockedPlantInPlot && (growthPatternA && growthPatternB) == false) {
                console.log("current plant is not growing, locked plant in plot, not growth pattern, transitioning to mg_REPLANT");
                mg_PlotState.gardenState = mg_REPLANT;
            }
        }
    } else if (mg_Plants[mg_PlotState.currentPlant.name].growing && (mg_PlotState.doublePlant == 0)) {
        console.log("weeds are locked, locked plant growing, not doublePlant, transitioning to mg_GROW_MUTATION");
        mg_PlotState.gardenState = mg_GROW_MUTATION;
    }

    if (mg_PlotState.gardenState !== entryState) {
        console.log("gardenState has changed, old: %s, new: %s", mg_IdentifyState(entryState), mg_IdentifyState(mg_PlotState.gardenState));
        mg_MaintainGarden();
    }
}


function mg_EvalStateGrowWeedMuts() {
    let entryState = mg_PlotState.gardenState;

    if (mg_PlotState.weedsAreUnlocked) {
        console.log("weeds are unlocked, transitioning to mg_GROW_MUTATION");
        mg_PlotState.gardenState = mg_GROW_MUTATION;
    }

    if (mg_PlotState.gardenState !== entryState) {
        console.log("gardenState has changed, old: %s, new: %s", mg_IdentifyState(entryState), mg_IdentifyState(mg_PlotState.gardenState));
        mg_MaintainGarden();
    }
}


function mg_EvalStateCheckMuts() {
    let entryState = mg_PlotState.gardenState;

    let growthPatternA = mg_IsGrowthPattern("A");
    let growthPatternB = mg_IsGrowthPattern("B");

    if (mg_PlotState.weedsAreUnlocked) {
        if (mg_Plants[mg_PlotState.currentPlant.name].growing) {
            if (mg_PlotState.doublePlant) {
                // doublePlant can only begin from grow_mutation or check_mutation, otherwise it will spin
                console.log("current plant is growing, doublePlant, weeds are unlocked, transitioning to mg_REPLANT");
                mg_PlotState.gardenState = mg_REPLANT;
            } else {
                console.log("current plant is growing, not doublePlant, weeds are unlocked, transitioning to mg_GROW_MUTATION");
                mg_PlotState.gardenState = mg_GROW_MUTATION;
            }
        } else {
            if (mg_PlotState.currentPlant.parents.length == 2 && (growthPatternA != growthPatternB)) {
                console.log("currentPlant is not growing, one parent expired, Transitioning to mg_REPLANT_ONE");
                mg_PlotState.gardenState = mg_REPLANT_ONE;
            } else if ((growthPatternA && growthPatternB) == false) {
                console.log("current plant is not growing, locked plant in plot, not growth pattern, transitioning to mg_REPLANT");
                mg_PlotState.gardenState = mg_REPLANT;
            }
        }
    } else {
        if (mg_PlotState.lockedPlantInPlot) {
            console.log("weeds are locked, lockedPlantInPlot, transitioning to mg_GROW_MUTATION");
            mg_PlotState.gardenState = mg_GROW_MUTATION;
        }
    }

    if (mg_PlotState.gardenState !== entryState) {
        console.log("gardenState has changed, old: %s, new: %s", mg_IdentifyState(entryState), mg_IdentifyState(mg_PlotState.gardenState));
        mg_MaintainGarden();
    }
}


function mg_EvalStateGrowMutation() {
    let entryState = mg_PlotState.gardenState;

    // next plant is queenbeetLump and goldenClover and nursetulip have been harvested
    if (mg_PlotState.currentPlant.name == 'queenbeetLump' && mg_Plants['goldenClover'].unlocked && mg_Plants['nursetulip'].unlocked) {
        mg_PlotState.gardenState = mg_NO_JQB;
        mg_GenerateJQBPattern();
    }

    if (mg_Plants[mg_PlotState.currentPlant.name].growing) {
        if (mg_PlotState.doublePlant && mg_PlotState.weedsAreUnlocked) {
            // doublePlant can only begin from grow_mutation or check_mutation, otherwise it will spin
            console.log("current plant is growing, doublePlant, weeds are unlocked, transitioning to mg_REPLANT");
            mg_PlotState.gardenState = mg_REPLANT;
            mg_UpdateUnlockedPlants();
        }
    } else {
        if (mg_PlotState.weedsAreUnlocked === 0) {
            if (mg_PlotState.lockedPlantInPlot) {
                // bakeberry
                mg_UpdateUnlockedPlants();
            } else {
                console.log("current plant is not growing, weeds are not unlocked, transitioning to mg_EMPTY");
                mg_PlotState.gardenState = mg_EMPTY;
            }
        }
    }

    if (mg_PlotState.gardenState !== entryState) {
        console.log("gardenState has changed, old: %s, new: %s", mg_IdentifyState(entryState), mg_IdentifyState(mg_PlotState.gardenState));
        mg_MaintainGarden();
    }
}


function mg_ProcessWeed(plantName, x, y) {
    if (mg_PlotState.weedsAreUnlocked) {
        if (plantName == 'meddleweed') {
            console.log("Removing meddleweed after weedsAreUnlocked");
            mg_PlotState.plot[y][x].remove = 1;
        }

        // weed types can be used as parent plants.  Don't remove them from 
        // patterns after varieties are unlocked
        // possible to have other plant types growing after weeds are unlocked.  
        // don't remove locked plants
        if ((mg_PlotState.plot[y][x].parent == 0 && mg_PlotState.plot[y][x].locked == 0) || mg_PlotState.gardenState == mg_GROW_MUTATION) {
            // remove weeds at any growth state
            mg_PlotState.plot[y][x].remove = 1;
        }
    } else {
        if (mg_Plants[plantName].unlocked && !(plantName == 'meddleweed')) {
            console.log("Removing %s at x: %d, y: %d", plantName, x, y);
            mg_PlotState.plot[y][x].remove = 1;
        }

        if (mg_Plants[plantName].sequence == 999) {
            // remove weeds one tile from growing plants to prevent weed takeover
            // if current tile contains a weed, check for a vulnerable neighbor
            if (mg_PreserveNeighbor(plantName, x, y - 1) || mg_PreserveNeighbor(plantName, x, y + 1) || mg_PreserveNeighbor(plantName, x - 1, y) || mg_PreserveNeighbor(plantName, x + 1, y)) {
                if (mg_PlotState.plot[y][x].harvest == 0) {
                    console.log("Removing %s to preserve neighbor at x: %d, y: %d", plantName, x, y);
                    mg_PlotState.plot[y][x].remove = 1;
                }
            }
        }

        // use "remove" because "harvest" triggers plant db update routines
        if (plantName == 'meddleweed' && mg_GetTicksRemaining(plantName, x, y) == 1) {
            console.log("Removing mature meddleweeed at x: %d, y: %d", x, y);
            mg_PlotState.plot[y][x].remove = 1;
        }

        // delay until cronerice is growing
        if (mg_Plants['cronerice'].growing) {
            if (mg_PlotState.gardenState !== mg_GROW_WEED_MUTS) {
                console.log("Transitioning to mg_GROW_WEED_MUTS...");
                mg_PlotState.gardenState = mg_GROW_WEED_MUTS;
            }
        } else {
            mg_PlotState.plot[y][x].remove = 1;
        }
    }
}


function mg_CheckOldestPlantInPlot(plantName, x, y) {
    // console.log("Begin mg_CheckOldestPlantInPlot()...");

    // if this plant is locked, check to see if we already
    // have one of this type and record the older of the two
    if (mg_Plants[plantName].unlocked == 0 && !(mg_Plants[plantName].sequence == 999)) {
        if (mg_Plants[plantName].first.age) {
            if (mg_PlotState.doublePlant) {
                if (mg_PlotState.plot[y][x].locked == 0) {
                    // console.log("First age: %d, current plant age: %d", mg_Plants[plantName].first.age, mg_PlotState.plot[y][x].age);

                    console.log("Marking duplicate %s for remove at x: %d, y: %d", plantName, x, y);
                    mg_PlotState.plot[y][x].remove = 1;
                }
            } else {
                // console.log("Not in doublePlant, preserving %s at x: %d, y: %d", plantName, x, y);
            }
        } else {
            console.log("Evaluating %s at x: %d, y: %d", plantName, x, y);

            // need to be in doublePlant for goldenClover to be raised while nursetulip is
            // still growing.  When goldenClover is discovered, reset doublePlant to prevent
            // transition to mg_REPLANT so that a proper transition to mg_NO_JQB can occur.
            if (mg_M.plantsById[(mg_PlotState.plot[y][x].id - 1)].key === "goldenClover") {
                mg_PlotState.doublePlant = 0;
            }

            if (mg_Plants[plantName].first.age == 0 || mg_Plants[plantName].first.age < mg_PlotState.plot[y][x].age) {
                // mutations have age of zero until first tick passes adding one 
                // to the mutation age allows the plant to be recorded successfully
                mg_Plants[plantName].first.age = mg_PlotState.plot[y][x].age + 1;
                mg_Plants[plantName].first.x = x;
                mg_Plants[plantName].first.y = y;

                mg_PlotState.plot[y][x].locked = 1;

                mg_Plants[plantName].growing = 1;

                mg_PlotState.lockedPlantInPlot++;
            }
        }
    } // update mark oldest locked plant
    // console.log("End mg_CheckOldestPlantInPlot()...");
}



function mg_PreserveNeighbor(centerPlant, x, y) {
    //	console.log("Begin mg_PreserveNeighbor()...");
    var retval = false;

    // if current tile contains a weed type and has a neighbor in the up, down, left, or right position
    // and the neighboring tile is a locked plant type, and not a weed type, and the neighbor has not already
    // been identified for removal, clear the current tile

    // neighbor tile is within boundaries...
    if ((y >= 0) && (y < 6) && (x >= 0) && (x < 6)) {
        // ...is populated, and the contained plant type is locked
        if (mg_PlotState.plot[y][x].id && !(mg_M.plantsById[(mg_PlotState.plot[y][x].id - 1)].unlocked)) {
            console.log("Neighbor tile contains a locked plant type: %s", mg_M.plantsById[mg_PlotState.plot[y][x].id - 1].key);
            // neighbor tile is not a weed type
            if (!(mg_Plants[mg_M.plantsById[mg_PlotState.plot[y][x].id - 1].key].sequence == 999)) {
                retval = true;
            } else if (centerPlant == 'meddleweed' && !(mg_M.plantsById[mg_PlotState.plot[y][x].id - 1].key == 'meddleweed')) {
                retval = true;
            }
        }
    }

    //	console.log("End mg_PreserveNeighbor()...");
    return retval;
}


//use plantsById to determine lock/unlock
function mg_ClearPlot() {
    // console.log("Begin mg_ClearPlot()...");

    var updatePlantData = 0;

    //	console.log("Removing unwanted plants and harvesting mature plants");
    for (var y = 0; y < 6; y++) {
        for (var x = 0; x < 6; x++) {

            if (mg_PlotState.plot[y][x].id) {
                if (mg_PlotState.plot[y][x].remove) {
                    // console.log("Removing %s at x: %d, y: %d", mg_M.plantsById[mg_PlotState.plot[y][x].id - 1].key, x, y);
                    mg_M.clickTile(x, y);
                    mg_PlotState.plot[y][x].id = 0;
                    mg_PlotState.plot[y][x].age = 0;
                    // there should not be a case when a locked tile is marked 
                    // "remove" and not "harvest"
                    if (mg_PlotState.plot[y][x].locked) {
                        mg_PlotState.lockedPlantInPlot--;
                        mg_PlotState.plot[y][x].locked = 0;
                    }
                    mg_PlotState.plot[y][x].remove = 0;
                    mg_PlotState.numPlants--;
                } else if (mg_PlotState.plot[y][x].harvest) {
                    console.log("Harvesting %s at x: %d, y: %d", mg_M.plantsById[mg_PlotState.plot[y][x].id - 1].key, x, y);
                    mg_M.clickTile(x, y);
                    if (mg_PlotState.plot[y][x].locked) {
                        mg_PlotState.lockedPlantInPlot--;
                        mg_PlotState.plot[y][x].locked = 0;
                    } else {
                        console.log(mg_PlotState.plot[y][x]);
                    }
                    mg_PlotState.plot[y][x].id = 0;
                    mg_PlotState.plot[y][x].age = 0;
                    mg_PlotState.plot[y][x].harvest = 0;
                    mg_PlotState.numPlants--;
                    updatePlantData = 1;
                } else {
                    if (mg_PlotState.plot[y][x].locked) {
                        // console.log("Locked tile at x: %d, y: %d", x, y);
                    }
                } // EMPTY
            } // plant exists
        } // inner loop
    } // outer loop

    //	check to see if we have gained a new plant type
    if (updatePlantData) {
        console.log("In mg_ClearPlot, updating unlocked plants");
        mg_UpdateUnlockedPlants();
        if (mg_PlotState.weedsAreUnlocked == 0) {
            mg_UpdateWeeds();
        }
    }

    // console.log("End mg_ClearPlot()...");
}


function mg_GetAgeAndMaturationTicks() {
    // From minigameGarden:
    // age: Math.ceil((100/((me.ageTick+me.ageTickR/2)))*(1))
    // mature: Math.ceil((100/((me.ageTick+me.ageTickR/2)))*(me.mature/100))

    for (var plant in mg_M.plants) {
        var mg_AgeTick = mg_M.plants[plant].ageTick;
        var mg_AgeTickR = mg_M.plants[plant].ageTickR;
        var mg_MatureTicks = mg_M.plants[plant].mature;

        var hundredDividedByTicks = (100 / (mg_AgeTick + mg_AgeTickR / 2));

        mg_Plants[plant]["maturityTicks"] = Math.ceil(hundredDividedByTicks * (mg_MatureTicks / 100));
        mg_Plants[plant]["ageTicks"] = Math.ceil(hundredDividedByTicks);
    }
}


function mg_GetPlantCostPerTick() {
    var cost = 0;
    var costPerTick = 0;
    var coefficient = 0.0;
    var exponent = 0;

    for (var plant in mg_M.plants) {
        cost = Math.max(mg_M.plants[plant].costM, Game.cookiesPs * mg_M.plants[plant].cost * 60) * (Game.HasAchiev('Seedless to nay') ? 0.95 : 1);

        costPerTick = cost / mg_Plants[plant].maturityTicks;

        costString = costPerTick.toFixed();
        mg_Plants[plant]["costPerTick"] = { coefficient: 0.0, exponent: 0 };
        [coefficient, exponent] = costString.split("e+");
        mg_Plants[plant].costPerTick.coefficient = parseFloat(coefficient);
        mg_Plants[plant].costPerTick.exponent = parseInt(exponent);
    }
}


async function mg_PlantParent(plantName, pattern, delayTicks) {
    var seed = mg_M.plants[plantName].id;
    var delayCount = 0;

    mg_PlotState.plantCounter++;

    mg_M.computeStepT();
    delayCount = delayTicks * mg_M.stepT * 1000;

    // need to prevent plot overwrite as state will not transition to
    // grow_parents until both mg_PlantParent have completed.
    if (!(mg_PlotState.gardenState == mg_DELAY_PLANT)) {
        console.log("Transitioning to mg_DELAY_PLANT...");
        mg_PlotState.gardenState = mg_DELAY_PLANT;
    }

    let plantPromise = new Promise((resolve, reject) => {
        setTimeout(() => {
            mg_ClearPattern(pattern);
            // TODO: add checks for plot boundaries
            for (y = 0; y < mg_PlotState.plotPattern[pattern][0].length; y++) {
                for (x = 0; x < mg_PlotState.plotPattern[pattern].length; x++) {
                    if (mg_PlotState.plotPattern[pattern][x][y]) {
                        mg_M.getCost(Game.ObjectsById[2].minigame.plantsById[seed]);
                        var cost = mg_M.getCost(Game.ObjectsById[2].minigame.plantsById[seed]);
                        l('gardenSeed-' + seed).click();
                        // plant seed
                        // reverse x and y to keep plot orientation
                        mg_M.clickTile(y, x);
                    }  // plotPattern check
                } // y axis loop
            } // x axis loop
            resolve();
        }, delayCount); // setTimeout
    });  // Promise

    await plantPromise;

    mg_PlotState.plantCounter--;

    // console.log("Completed planting %s in pattern %s, plantCounter: %d", plantName, pattern, mg_PlotState.plantCounter);
}


function mg_IsGrowthPattern(pattern) {
    // console.log("Begin mg_IsGrowthPattern()...");

    var retval = true;

    var prnt = "";

    if (typeof (pattern) === 'undefined') {
        // "growth pattern" is only true if both A and B patterns are true
        retval = (mg_IsGrowthPattern("A") && mg_IsGrowthPattern("B"));
    } else {
        if (pattern == "A") {
            // console.log("examining growth pattern for pattern A");
            plotPattern = mg_PlotState.plotPattern.A;
        } else {
            // console.log("examining growth pattern for pattern B");
            plotPattern = mg_PlotState.plotPattern.B;
        }

        var prnt = "parent" + pattern;

        for (var y = 0; y < 6; y++) {
            // no need to execute the entire loop if we find a pattern breaker
            if (retval == false) break;

            for (var x = 0; x < 6; x++) {
                var pId = 0;

                // check if this is a plot pattern tile
                if (plotPattern[y][x]) {
                    pId = mg_PlotState.plot[y][x].id;
                    if (pId) {
                        // console.log("x: %d, y: %d, plant: %s", x, y, mg_M.plantsById[pId - 1].key);
                    }

                    // determine if it's a parent plant type
                    if (pId == 0) {
                        retval = false;
                        break;
                    } else {
                        if (mg_M.plantsById[pId - 1].key !== mg_PlotState.currentPlant[prnt]) {
                            console.log("%s is not a matching parent plant", mg_M.plantsById[pId - 1].key);
                            retval = false;
                            break;
                        }
                    }
                }
            }// inner loop
        }// outer loop
    } // pattern identification

    // console.log("End mg_IsGrowthPattern()...");

    return retval;
}


//scan the breeding pattern.  if all plants in pattern have ticks sufficient to
//grow a plant to maturity in the other pattern
function mg_HasTimeForReplant(pattern, testForKeep, rePlant) {
    var retval = true;

    for (var y = 0; y < 6; y++) {
        // no need to execute the entire loop if we find a pattern breaker
        if (retval == false) break;

        for (var x = 0; x < 6; x++) {
            // check if this is a plot pattern tile
            if (mg_PlotState.plotPattern[pattern][y][x] && mg_PlotState.plot[y][x].id) {
                var ticksRemaining = mg_GetTicksRemaining(testForKeep, x, y);

                console.log("Survivor pattern: %s, x: %d, y: %d, ticks remaining: %d, ticks needed; %d", pattern, x, y, ticksRemaining, mg_Plants[rePlant].maturityTicks);

                if (ticksRemaining == -1 || ticksRemaining > mg_Plants[rePlant].maturityTicks) {
                    // console.log("Okay to replant one parent");
                } else {
                    // insufficient time remaining for re-plant, start fresh
                    // console.log("Insufficient time remaining to replant one parent");
                    retval = false;
                    break;
                }
            }
        }
    }

    return retval;
}


function mg_WeedParents() {
    if (mg_Plants[mg_PlotState.currentPlant.name].weedParent) {
        mg_PlotState.currentPlant.weedParent = [];

        for (var i = 0; i < mg_Plants[mg_PlotState.currentPlant.name].parents.length; i++) {
            for (var j = 0; j < mg_Plants.weeds.length; j++) {
                if (mg_Plants[mg_PlotState.currentPlant.name].parents[i] == mg_Plants.weeds[j])
                    mg_PlotState.currentPlant.weedParent[i] = mg_Plants.weeds[j];
            }
        }
    }
}


function mg_UpdateWeeds() {
    // console.log("Begin mg_UpdateWeeds()...");

    // reset counter before re-counting
    mg_PlotState.weedCount = 0;

    mg_Plants.weeds = ['meddleweed', 'brownMold', 'crumbspore'];
    // add unlocked values of weed types
    for (var weed in mg_Plants.weeds) {
        if (mg_M.plants[mg_Plants.weeds[weed]].unlocked) {
            mg_Plants[mg_Plants.weeds[weed]].unlocked = mg_M.plants[mg_Plants.weeds[weed]].unlocked;
            mg_PlotState.weedCount++;
        }
    }

    if (mg_PlotState.weedCount == 3) {
        console.log("Weeds are unlocked");
        mg_PlotState.weedsAreUnlocked = 1;
    }

    // console.log("End mg_UpdateWeeds()...");
}


function mg_GetTicksRemaining(plantName, x, y) {
    //	function mg_GetTicksRemaining(survivor, rePlant, x, y){
    var ticksRemaining = 0;

    var mg_AgeTick = mg_M.plants[plantName].ageTick;
    var mg_AgeTickR = mg_M.plants[plantName].ageTickR;
    var mg_MatureTicks = mg_M.plants[plantName].mature;

    var ticksToMature = Math.ceil((100 / (mg_M.plotBoost[y][x][0] * (mg_AgeTick + mg_AgeTickR / 2))) * ((mg_MatureTicks - mg_PlotState.plot[y][x].age) / 100));

    //	console.log("%s at %d, %d: %d", plantName, x, y, plantAge);

    // if ticks remaining in current plants is greater than the number of ticks
    // required for the other plant to reach maturity, schedule re-plant.
    // re-plant if remaining plant is immortal
    // "elderwort" is the only current plant that is both immortal and a parent.  Update if necessary.
    if (mg_M.plants[plantName].key == 'elderwort') {
        ticksRemaining = -1;
    } else {
        ticksRemaining = mg_Plants[plantName].ageTicks - mg_Plants[plantName].maturityTicks + ticksToMature;
    }

    return ticksRemaining;
}


function mg_UpdateUnlockedPlants() {
    // console.log("Begin mg_UpdateUnlockedPlants()...");

    var plantSequence = {};

    mg_PlotState.currentPlant.name = "";

    if (typeof (mg_PlotState.sequence) === 'undefined') {
        var valuesRaw = [];

        for (var plant in mg_Plants) {
            mg_Plants[plant].first.age = mg_Plants[plant].first.age || 0;
            mg_Plants[plant].first.x = mg_Plants[plant].first.x || 0;
            mg_Plants[plant].first.y = mg_Plants[plant].first.y || 0;

            if (mg_Plants[plant].sequence == 999) {
                continue;
            }
            valuesRaw.push(mg_Plants[plant].sequence);
        }

        var sorted = valuesRaw.sort(function (a, b) { return a - b });

        for (var i = 0; i < sorted.length; i++) {
            for (var plant in mg_Plants) {
                if (sorted[i] == mg_Plants[plant].sequence) {
                    plantSequence[sorted[i]] = plant;
                }
            }
        }

        mg_PlotState.sequence = plantSequence;
    }

    // examine current plot state to identify growing plants
    for (var y = 0; y < 6; y++) {
        for (var x = 0; x < 6; x++) {
            if (mg_PlotState.plot[y][x].id) {
                // don't mark weeds 
                if (mg_Plants[mg_M.plantsById[(mg_PlotState.plot[y][x].id - 1)].key].sequence === 999) {
                    continue;
                } else {
                    if (mg_M.plants[mg_M.plantsById[(mg_PlotState.plot[y][x].id - 1)].key].unlocked === 0) {
                        var plantName = mg_M.plantsById[(mg_PlotState.plot[y][x].id - 1)].key;

                        console.log("Found locked %s at x: %d, y: %d", plantName, x, y);

                        if (mg_Plants[mg_M.plantsById[(mg_PlotState.plot[y][x].id - 1)].key].growing === 0) {
                            console.log("Found growing %s at x: %d, y: %d", plantName, x, y);
                            mg_Plants[mg_M.plantsById[(mg_PlotState.plot[y][x].id - 1)].key].growing = 1;
                            // if mg_UpdateUnlockedPlants is run during initialize, plants discovered need to be 
                            // characterized as "oldest" in order to be identified as a locked plant growing
                            mg_CheckOldestPlantInPlot(plantName, x, y);
                        }
                    }
                }
            }
        }
    }

    // start index at 1 to skip bakerWheat
    for (var i = 1; i < Object.keys(mg_PlotState.sequence).length; i++) {
        // handle potential gaps in sequence numbers
        if (typeof (mg_PlotState.sequence[i]) === 'undefined') {
            continue;
        } else {
            mg_Plants[mg_PlotState.sequence[i]].unlocked = mg_M.plants[mg_PlotState.sequence[i]].unlocked;
            mg_Plants[mg_PlotState.sequence[i]].growing = mg_Plants[mg_PlotState.sequence[i]].growing || 0;

            // locked but not growing
            if (mg_Plants[mg_PlotState.sequence[i]].unlocked == 0 && mg_Plants[mg_PlotState.sequence[i]].growing == 0) {
                console.log("plant: %s is locked and not currently growing", mg_PlotState.sequence[i])
                mg_PlotState.currentPlant.name = mg_PlotState.sequence[i];
                mg_PlotState.currentPlant.id = mg_M.plants[mg_PlotState.sequence[i]].id;
                mg_PlotState.currentPlant.parents = mg_Plants[mg_PlotState.sequence[i]].parents;

                mg_PlotState.doublePlant = mg_Plants[mg_PlotState.sequence[i]].double;
                break;
            }
        }
    }

    // no currentPlant means that all plants that can be unlocked are either unlocked or growing
    // set currentPlant to bakerWheat to indicate end of cycle
    if (mg_PlotState.currentPlant.id === 0) {
        mg_PlotState.currentPlant.name = "bakerWheat";
    }

    // configure bakerWheat
    mg_Plants["bakerWheat"].unlocked = 1;

    console.log("End mg_UpdateUnlockedPlants, num locked plants in plot: %d", mg_PlotState.lockedPlantInPlot);

    // console.log("End mg_UpdateUnlockedPlants()...");
}


// >>> can this be udpated to mark tiles for remove and then call mg_ClearPlot?
function mg_ClearPattern(pattern) {
    // console.log("Begin mg_ClearPattern()...");

    for (var y = 0; y < 6; y++) {
        for (var x = 0; x < 6; x++) {
            // plot tile is populated
            if (mg_M.plot[y][x][0] && mg_PlotState.plotPattern[pattern][y][x]) {
                console.log("Marking %s for remove at %d, %d", mg_M.plantsById[mg_M.plot[y][x][0] - 1].key, x, y);
                mg_M.clickTile(x, y);
            }
        }
    }

    // console.log("End mg_ClearPattern()...");
}


function mg_MarkForRemove(plantName, x, y) {
    //	console.log("Begin mg_MarkForRemove()...");

    var retval = 0;

    // we already own this plant
    // remove unlocked plants when
    //   - plot is empty
    //   - when growing weeds, weeds are locked and plant is not meddleweed
    //   - weeds are unlocked and plant is meddleweed
    //   - not in breeding pattern <-- does it matter what state we're in?
    //   - in breeding pattern and grow_mutation or (replant and doublePlant)
    if (mg_Plants[plantName].unlocked) {
        if (mg_PlotState.gardenState == mg_EMPTY) {
            retval = 1;
        } else if (mg_PlotState.weedsAreUnlocked) {
            if (mg_PlotState.plot[y][x].parent && mg_Plants[plantName].sequence == 999) {
                retval = 1;
            }

        } else if (!(mg_PlotState.weedsAreUnlocked)) {
            if (!(plantName == 'meddleweed') && mg_PlotState.gardenState == mg_GROW_WEED_MUTS) {
                retval = 1;
            }

            // >>> "mg_REPLANT" leaves parent tiles growing if next plant is no double 
            if (mg_PlotState.plot[y][x].parent && mg_PlotState.gardenState == mg_GROW_MUTATION) {
                retval = 1;
            }

        }

        if (mg_PlotState.plot[y][x].parent) {

            if (mg_PlotState.gardenState == mg_GROW_MUTATION && mg_Plants[mg_PlotState.currentPlant.name].growing) {
                retval = 1;
            }

        } else {
            if (mg_PlotState.plot[y][x].parent == 0) {
                retval = 1;
            }
        }

        if (mg_PlotState.doublePlant && mg_PlotState.gardenState == mg_REPLANT) {
            if (mg_PlotState.plot[y][x].parent && !(plantName == mg_PlotState.currentPlant.parents[0] || plantName == mg_PlotState.currentPlant.parents[1])) {
                retval = 1;
            }
        }

        if (mg_PlotState.gardenState == mg_REPLANT) {
            if (mg_PlotState.plot[y][x].parent && !(plantName == mg_PlotState.currentPlant.parents[0] || plantName == mg_PlotState.currentPlant.parents[1])) {
                retval = 1;
            }
        }
    }

    //	console.log("End mg_MarkForRemove()...");

    return retval;
}


function mg_CheckAllJQBPods() {
    let matureFlag = 0;
    let numExpired = 0;
    let jqbFound = 0;

    if (typeof (mg_PlotState.jqbPod[0]) === 'undefined') {
        console.log("Initializing pod data...");
        mg_InitPods();
    }

    for (var i = 0; i < mg_PlotState.jqbPod.numPods; i++) {
        mg_CheckOneJQBPod(i);

        if (mg_PlotState.jqbPod[i].jqbFound) {
            jqbFound = i + 1; // provide non-zero value to be used for existence test 
        }

        if (mg_PlotState.jqbPod[i].mature) {
            matureFlag = 1;
            mg_PlotState.jqbPod[i].mature = 0;
        }

        if (mg_PlotState.jqbPod[i].expired) {
            mg_ClearJQBPod(i);
        }

        if (mg_PlotState.jqbPod[i].cleared) {
            numExpired++;
        }
    }

    if (jqbFound) {
        console.log("Changing state to mg_JQB_NO_EVERDAISY");
        mg_PlotState.gardenState = mg_JQB_NO_EVERDAISY;
        mg_PlotState.jqbPod.jqbGrowthPod = jqbFound - 1;  // restore original podId 
        mg_SurroundJQB();
        mg_ActivateSoil(mg_FERTILIZER);
    } else if (matureFlag) {
        mg_ActivateSoil(mg_WOOD_CHIPS);
    } else if (numExpired === mg_PlotState.jqbPod.numPods) {
        // clear plot and re-plant
        console.log("Resetting plot...");
        for (var i = 0; i < mg_PlotState.jqbPod.numPods; i++) {
            // handle situation where plant breeds in previously cleared JQB plot tile
            mg_ClearJQBPod(i);
        }
        mg_InitPods();
        mg_GenerateJQBPattern();
    }
}


function mg_CheckOneJQBPod(podId) {
    //	console.log("Begin mg_CheckOneJQBPod()...");

    let numMature = 0; // count number of mature queenbeet for soil change

    var podY = mg_PlotState.jqbPod[podId][0];
    var podX = mg_PlotState.jqbPod[podId][1];

    for (var j = 0; j < mg_PlotState.jqbPod.plantCoords.length; j++) {
        var plantX = podX + mg_PlotState.jqbPod.plantCoords[j][0];
        var plantY = podY + mg_PlotState.jqbPod.plantCoords[j][1];

        if (j == 4) {
            continue;
        }

        // empty tile?
        if ((mg_PlotState.jqbPod[podId].cleared === 0) && (mg_PlotState.plot[plantX][plantY].age === 0)) {
            console.log("Empty tile found at %d, %d, tagging plot as expired", plantX, plantY);
            mg_PlotState.jqbPod[podId].expired = 1;
        } else {
            // check if plant is mature
            if (mg_M.soil === mg_FERTILIZER) {
                // check if plant is mature
                if (mg_PlotState.plot[plantX][plantY].age >= mg_M.plantsById[mg_M.plants["queenbeet"].id].mature) {
                    numMature++;
                    //console.log("Mature Queenbeet at %d, %d", plantX, plantY);
                }
            } else {
                // mature plant is growing, check center tile for JQB
                if (mg_PlotState.plot[podX][podY].id) {
                    if (mg_PlotState.plot[podX][podY].id === 22) {
                        console.log("Found Juicy Queenbeet in Pod %d", podId);
                        mg_PlotState.jqbPod[podId].jqbFound = 1;
                    } else {
                        console.log("Removing %s from %d, %d", mg_M.plantsById[mg_PlotState.plot[podX][podY].id - 1].key, podX, podY);
                        mg_PlotState.plot[podX][podY].remove = 1;
                    }
                }
            }
        }
    }

    if (numMature >= 6) {
        console.log("Tagging pod %d as mature", podId);
        mg_PlotState.jqbPod[podId].mature = 1;
    }

    //	console.log("End mg_CheckOneJQBPod()...");
}


function mg_ClearJQBPod(podId) {
    //	console.log("Begin mg_ClearJQBPod()...");

    // reverse X and Y to be compatible with clickTile
    var podY = mg_PlotState.jqbPod[podId][0];
    var podX = mg_PlotState.jqbPod[podId][1];

    for (var j = 0; j < mg_PlotState.jqbPod.plantCoords.length; j++) {
        var plantX = podX + mg_PlotState.jqbPod.plantCoords[j][0];
        var plantY = podY + mg_PlotState.jqbPod.plantCoords[j][1];

        if (j == 4) {
            continue;
        }

        // plant exists?
        if (mg_PlotState.plot[plantX][plantY].id) {
            console.log("Marking tile %d, %d for remove", plantX, plantY);
            mg_PlotState.plot[plantX][plantY].remove = 1;
        }
    }

    mg_ClearPlot();

    mg_PlotState.jqbPod[podId].expired = 0;
    mg_PlotState.jqbPod[podId].cleared = 1;

    //	console.log("End mg_ClearJQBPod()...");
}


function mg_GenerateJQBPattern() {
    // console.log("Begin mg_GenerateJQBPattern()...");

    console.log("Planting %d pods", mg_PlotState.jqbPod.numPods);
    for (var i = 0; i < mg_PlotState.jqbPod.numPods; i++) {
        console.log("Planting pod %d", i);
        mg_PlantOneJQBPod(i, mg_SEED_QUEENBEET);
    }

    mg_ActivateSoil(mg_FERTILIZER);

    // console.log("End mg_GenerateJQBPattern()...");
}


//can be used to plant both queenbeet and elderwort
function mg_PlantOneJQBPod(podId, seedToPlant) {
    // console.log("Begin mg_PlantOneJQBPod()...");

    // reverse X and Y to be compatible with clickTile
    var podY = mg_PlotState.jqbPod[podId][0];
    var podX = mg_PlotState.jqbPod[podId][1];

    for (var j = 0; j < mg_PlotState.jqbPod.plantCoords.length; j++) {
        var plantX = podX + mg_PlotState.jqbPod.plantCoords[j][0];
        var plantY = podY + mg_PlotState.jqbPod.plantCoords[j][1];

        if (j == 4) {
            continue;
        }

        if (mg_PlotState.plot[plantX][plantY].id) {
            console.log("Tile %d, %d is occupied", plantX, plantY);
        } else {
            // select queenbeet seed
            mg_M.seedSelected = seedToPlant;

            // plant queenbeet
            mg_M.clickTile(plantY, plantX);
        }
    }

    // console.log("End mg_PlantOneJQBPod()...");
}


function mg_SurroundJQB() {
    let podId = mg_PlotState.jqbPod.jqbGrowthPod;

    // clear the plot
    console.log("Clearing JQB Pods");
    for (var i = 0; i < mg_PlotState.jqbPod.numPods; i++) {
        mg_ClearJQBPod(i);
    }
    // surround pod with elderwort
    mg_PlantOneJQBPod(podId, mg_SEED_ELDERWORT);

    // plant additional elderwort to create line across plot
    var elderwortCoords = mg_PlotState.jqbPod.elderwortByPodId[podId];

    for (var i = 0; i < elderwortCoords.length; i++) {
        var plantX = elderwortCoords[i][0];
        var plantY = elderwortCoords[i][1];

        console.log("Planting at %d, %d", plantX, plantY);

        if (mg_PlotState.plot[plantX][plantY].id) {
            console.log("Tile %d, %d is occupied", plantX, plantY);
        } else {
            mg_M.seedSelected = mg_SEED_ELDERWORT;
            mg_M.clickTile(plantY, plantX);
        }
    }

    mg_CheckTidygrass();
}


function mg_CheckEverdaisy() {
    console.log("Begin mg_CheckEverdaisy()...");

    let everdaisyColumn = 2;
    let foundEverdaisy = 0;

    if (mg_PlotState.jqbPod.tidygrassColumn === 4) {
        everdaisyColumn = 3;
    }

    for (let i = 0; i < 6; i++) {
        if ((mg_PlotState.plot[i][everdaisyColumn].id - 1) === mg_SEED_EVERDAISY) {
            mg_PlotState.everdaisyY = i;
            mg_PlotState.everdaisyX = everdaisyColumn;
            console.log("Found everdaisy at %d, %d", i, everdaisyColumn);
            foundEverdaisy = 1;
            mg_PlotState.gardenState = mg_JQB_AFTER_EVERDAISY;

            mg_ActivateSoil(mg_FERTILIZER);
        }
    }

    if (foundEverdaisy === 0) {
        console.log("No everdaisy found");
        mg_CheckTidygrass();
    }

    console.log("End mg_CheckEverdaisy()...");
}


function mg_CheckJQBGrowth() {
    var podY = mg_PlotState.jqbPod[mg_PlotState.jqbPod.jqbGrowthPod][0];
    var podX = mg_PlotState.jqbPod[mg_PlotState.jqbPod.jqbGrowthPod][1];

    if (mg_M.plants["everdaisy"].unlocked === 0) {
        console.log("Checking everdaisy maturity at %d, %d", mg_PlotState.everdaisyY, mg_PlotState.everdaisyX);
        if (mg_PlotState.plot[mg_PlotState.everdaisyY][mg_PlotState.everdaisyX].age >= mg_M.plantsById[mg_M.plants["everdaisy"].id].mature) {
            console.log("Harvesting mature everdaisy");
            // mg_M.clickTile(mg_PlotState.everdaisyX, mg_PlotState.everdaisyY);
            mg_PlotState.plot[mg_PlotState.everdaisyY][mg_PlotState.everdaisyX].harvest = 1;
        }
    }

    console.log("Checking JQB maturity at %d, %d", podX, podY);
    if (mg_PlotState.plot[podX][podY].age >= mg_M.plantsById[mg_M.plants["queenbeetLump"].id].mature) {
        // mark JQB for harvest
        // mg_M.clickTile(podY, podX);
        console.log("Harvesting mature queenbeetLump");
        mg_PlotState.plot[podX][podY].harvest = 1;
        mg_PlotState.gardenState = mg_JQB_HARVESTED;
    }

    mg_ClearPlot();
}


function mg_CheckTidygrass() {
    console.log("Begin mg_CheckTidygrass()...");

    let podId = mg_PlotState.jqbPod.jqbGrowthPod;
    let numTidygrass = 0;
    let numMatureTidygrass = 0;

    if (podId % 2) {
        mg_PlotState.jqbPod.tidygrassColumn = 1;
    } else {
        mg_PlotState.jqbPod.tidygrassColumn = 4; // pod 0 or 2
    }

    // scan tidygrass column.  If exists one block of three tidygrass, don't replant
    for (let i = 0; i < 6; i++) {
        let currentTile = mg_PlotState.plot[i][mg_PlotState.jqbPod.tidygrassColumn];

        if ((currentTile.id - 1) === mg_SEED_TIDYGRASS) {
            if (currentTile.age >= mg_M.plantsById[mg_M.plants["tidygrass"].id].mature) {
                numMatureTidygrass++;
            }
            numTidygrass++;
        } else {
            // fewer than three consecutive plants is a broken pattern
            if (numTidygrass < 3) {
                numTidygrass = 0;
            }
        }

        if (numMatureTidygrass >= 5) {
            mg_ActivateSoil(mg_WOOD_CHIPS);
        }
    }

    if (numTidygrass < 3) {
        mg_ActivateSoil(mg_FERTILIZER);
        // clear and replant tidygrass column
        for (let i = 0; i < 6; i++) {
            let currentTile = mg_PlotState.plot[i][mg_PlotState.jqbPod.tidygrassColumn];
            if (currentTile.id) {
                currentTile.remove = 1;
            }
        }

        mg_ClearPlot();
        mg_PlantTidygrass();
    }

    console.log("End mg_CheckTidygrass()...");
}


function mg_PlantTidygrass() {
    for (let i = 0; i < 6; i++) {
        let currentTile = mg_M.plot[i][mg_PlotState.jqbPod.tidygrassColumn];
        mg_M.seedSelected = mg_SEED_TIDYGRASS;
        mg_M.clickTile(mg_PlotState.jqbPod.tidygrassColumn, i);
    }
}


function mg_SacrificeGarden() {
    l('gardenTool-3').click();
    l('promptOption0').click();
    // return to initial state and re-start script
    mg_PlotState.gardenState = mg_EMPTY;
    // re-initialize script object
    mg_Initialize();
}


function mg_IdentifyState(state) {
    var theState = "";
    switch (state) {
        case mg_EMPTY:
            theState = "mg_EMPTY";
            break;
        case mg_DELAY_PLANT:
            theState = "mg_DELAY_PLANT";
            break;
        case mg_GROW_PARENTS:
            theState = "mg_GROW_PARENTS";
            break;
        case mg_CHECK_MUTS:
            theState = "mg_CHECK_MUTS";
            break;
        case mg_REPLANT_ONE:
            theState = "mg_REPLANT_ONE";
            break;
        case mg_REPLANT:
            theState = "mg_REPLANT";
            break;
        case mg_GROW_MUTATION:
            theState = "mg_GROW_MUTATION";
            break;
        case mg_GROW_WEED_MUTS:
            theState = "mg_GROW_WEED_MUTS";
            break;
        case mg_NO_JQB:
            theState = "mg_NO_JQB";
            break;
        case mg_JQB_NO_EVERDAISY:
            theState = "mg_JQB_NO_EVERDAISY";
            break;
        case mg_JQB_AFTER_EVERDAISY:
            theState = "mg_JQB_AFTER_EVERDAISY";
            break;
        case mg_JQB_HARVESTED:
            theState = "mg_JQB_HARVESTED";
            break;
        default:
            console.log("womp womp");
    }

    return theState;
}


