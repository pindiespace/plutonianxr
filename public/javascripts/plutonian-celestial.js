/**
 * Model of the universe
 * Universe = 1,000,000 parsecs,  10,000,000 units
 * Galaxy   =    30,000 parsecs,     300,000 units (where the skybox is drawn)
 * Hyg Real =       990 parsecs,       9,900 units (stars drawn in 3D)
 * Hyg Max  =   100,000 parsecs,   1,000,000 units (no parallax for star, just a default)
 * (about 10,000 of the 119,000 stars in Hyg3 fall in this category)
 * 
 * Models uses
 * Points (custom in shader)
 * https://github.com/bilkusg/BabyPlanetarium/blob/master/babysky/stars.ts
 * Sprites
 * Meshes
 * WebWorker to shift each data entry beween these three models
 * 
 * Stellar classification parser
 * https://github.com/codebox/stellar-classification-parser
 */


/**
 * Build the celestial space using Hyg3 database and other sources
 */
var PCelestial = (function () {

    // static class variables

    // constructor

    function PCelestial (util, pdata) {

        this.util              = util;   // PUtil object, instantated in plutonian-scene.js
        this.pdata             = pdata;  // PData objects, describes Hyg3 data and World data

        // data model for hyg3 database
        this.PCTYPES = this.pdata.PCTYPES;

        this.parsec = 3.26156; // light years in a parset

        this.dParsecUnits       =     10; // scale parsec distances to the simulation
        this.dKmUnits           =   2370; // 1 unit = 2370km, Pluto = 2370/2370 = 1.0
        this.dMUnits            =   1000; // 1 unit = 1000 meters, Voyager 1000/1000 = 1.0
        this.dSpriteSize        =    128; // default size of sprite panel
        this.dSpriteScreenSize  =      1; // default size of Star sprites
        this.dSpriteScreenIndex =      4;
        this.dMaxHygDist        = 100000;

        // SpriteManager for Hyg3 data
        this.spriteManager      =   null;

        // WebGL
        this.maxTexSize = 2048;         // minimum default for any modern videocard

        // SpriteManager and scene
        this.assetManager = null;
        this.starSprites = null;
        this.scene = null;
        this.camera = null;

        // stellar spectra
        this.spectra = new PSpectrum(util, pdata);

        // computations of planetary positions over time
        this.orrey = new POrrery();

        // see if WebWorker computation is available
        if (typeof(Worker) !== "undefined") {
            console.log("LOADING WORKER....................")
            worker = new Worker('javascripts/plutonian-orrery-worker.js');
        } 

    };

    // prototype class variables

    /*
     * extended sprite index
     * since we only create one pObject, we make the following arrays, some 
     * in the class, some loaded from JSON files
     * dynamically - 2x faster access than if declared as out function (static class)
     */
    PCelestial.prototype.dSpriteIndex = {
        'W': 0,
        'O': 1,
        'A': 2,
        'B': 3,
        'F': 4,
        'G': 5,
        'K': 6,
        'M': 7,
        'N': 8,
        'R': 9,
        'C': 10,
        'S': 11,
        'D': 12, 
        'L': 13,
        'T': 14,
        'Y': 15,
        'P': 16
    };

    // dynamically-filled prototype variables

    // holds data loaded from hyg3 (JSON)
    PCelestial.prototype.hygData = [];
 

    // Stellar colors based on spectrum (JSON)
    PCelestial.prototype.sprites = [];

    // functions

    /**
    * Return radians for (fractional) degrees.
    * @param {Number} n the number, in degrees (0-360).
    * @return {Number} return the same number, in radians (0-2PI).
    */
    PCelestial.prototype.degToRad = function (deg = 0) {
        return parseFloat(deg) * Math.PI / 180;
    };

    /** 
    * Returns radians for (fractional) degress.
    * @param {Number} rad
    */
    PCelestial.prototype.radToDeg = function (rad = 0) {
        return parseFloat(rad) * 180 / Math.PI;
    };

    /**
    * Returns 0-360 degrees for a 24-hour clock, optionally
    * accurate for minutes and seconds.
    */
    PCelestial.prototype.hmsToDeg = function (hours = 0, minutes = 0, seconds = 0) {

            let deg = 0;

            hours = parseFloat(hours); // force to number
            minutes = parseFloat(minutes);
            seconds = parseFloat(seconds);

            if (hours) hours *= (360 / 24);
            if (minutes) minutes *= (360 / 1440); // convert to fractional hours
            if (seconds) seconds *= (360 / 86400);

            return (hours + minutes + seconds);

    };

    /**
     * Convert degrees 0-360 to 0-24
     */
    PCelestial.prototype.degToDecimalHMS = function (degrees) {
        return parseFloat(degrees) / 24;
    };

    /**
     * Returns decimal degrees for degrees written as degrees, minutes, seconds
     */
    PCelestial.prototype.dmsToDecimal = function (d = 0, m = 0, s = 0) {
        if (m < 0) m = -m;
        if (s < 0) s = -s;
        let m0 = m; 
        let s0 = s;
        if (d < 0 || d =='-0') {
            m = -m;
            s = -s;
        }
		return parseFloat(d)+parseFloat(m)/60+parseFloat(s)/3600;	
    };

    /*
     * what the simulation needs to output
     * 
     * Augment the hyg object (which is like pObj.data) with
     * Description
     * computed color
     * computed size (absolute)
     * 
     * use stellar type to set...
     * computed color
     * computed size (actual radius)
     * computed sprite size
     */

    /** 
     * Given a pObj, return the correct scaling. 
     * Some Objects (e.g Stars) can be 3D shapes, or 2D billboarded Sprites
     * @param {Object} data a data object, as defined by PData.PObj
     */
    PCelestial.prototype.scale = function (data) {

        let util = this.util;
        let t = this.PCTYPES;


        let scaled = {
            diameter: data.diameter,
            dist: data.dist,
            segments: 32
        };

        console.log("ORIGNAL DATA DIST:" + scaled.dist)

        switch(data.type) {

            case t.WORLD:
                // diameter and distance don't scale
                break;

            case t.PLANET:
            case t.EXOPLANET:
            case t.MOON:
                // 1 unit = 2370km, Pluto = 2370/2370 = 1.0
                scaled.diameter /= this.dKmUnits,
                scaled.dist /= this.dKmUnits;
                console.log('planet scaled diameter:' + scaled.diameter);
                console.log('planet scaled dist:' + scaled.dist)
                break;

            case t.ROGUE_PLANET: // like a Star, NOT a Planet!
                scaled.diameter /= this.dKmUnits, // planetary dimensions
                scaled.dist *= this.dParsecUnits; // stellar distances
                break;

            case t.BROWN_DWARF:
            case t.STAR:
                scaled.diameter /= this.dKmUnits,
                scaled.dist *= this.dParsecUnits;
                break;

            case t.STARDOME:
            case t.STAR_SYSTEM:
                // 1 unit = 1/10 parsec
                //console.log("STAR BROWNIE dKmUnits:" + this.dParsecUnits + " DIST:" + scaled.dist)
                scaled.diameter /= this.dKmUnits,
                scaled.dist *= this.dParsecUnits;
                //console.log("STAR BROWNDWARF SCALED DIAMETER:" + scaled.diameter + " DISTANCE:" + scaled.dist)
                break;

            case t.GALAXY:
                scaled.diameter *= this.dParsecUnits;
                scaled.dist *= this.dParsecUnits;
                break;

            case t.ARTIFACT:
                beak;

            default:
                console.error('.scale ERROR: invalid celestial type:' + data.type);
                window.tt = t;
                break;

        }

        // warnings for objects without data yet

        if (scaled.diameter < 0.01) {
            console.warn('.scale WARNNG: diameter very small (' + scaled.diameter + ' units for:' + data.type);
        }

        if (scaled.dist < 0.01) {
            console.warn('.scale WARNING: distance very small (' + scaled.dist + ' units for:' + data.type)
        }

        return scaled;

    };

    /**
     * TODO: make color selector that tries
     * - listed color
     * - spectral type, if present
     * TODO: use in celestial and scene alike (merge)
     * @param {PCelestial.data} data
     */
    PCelestial.prototype.color = function (data) {

        let util = this.util;

        if (!util.isObject(data)) {
            console.error('color ERROR: invalid data object passed:' + typeof data);
            return null;
        }

        let color = data.color;
        let c = null;

        if (util.isString(data.spec)) {

            let cc = this.getHygColor(data);
            c = new BABYLON.Color3(cc[0], cc[1], cc[2]);


        } else {
            color = data.color;
        }

        // at this point, we should have an array with 3 valid colors
        try {

            // handle web versus BabylonJS color units (fails for [1,1,1])
            if (color[0] + color[1] + color[2] > 3.0) {
                color[0] /= 255,
                color[1] /= 255,
                color[2] /= 255
            }

            if (color.length === 3) {
                c = new BABYLON.Color3(color[0], color[1], color[2]);
            }
            else if (color.length === 4) {
                c = new BABYLON.Color4(color[0], color[1], color[2], color[3]);
            }

        } catch (e) {
            console.error('color ERROR: could not make a valid color with:' + color);
        }

        return c;

    };

    PCelestial.prototype.rotate = function (data) {
        console.log("celestial.rotate TODO:")
    };

    PCelestial.prototype.rotateByQuat = function (data) {
        console.log("celestial rotatebyquat TODO:");
    };

    /**
     * Make sure the JSON file has the minimum number of columns needed 
     * to create Star sprites or Points. Required:
     * id, 
     * @param {ObjectJSON} star Hyg3 data for a particular star
     */
    PCelestial.prototype.checkHygData = function (hygData) {

        let util = this.util;
        let fn = 'checkHygColumns ';

        if (!util.isArray(hygData)) {
            console.error(fn + 'ERROR: Hyg data not an array');
            return false;
        }

        if (!hygData.length) {
            console.error(fn + 'ERROR: no data in Hyg data');
            return false;
        }

        // look at the first Star in the array
        let star = hygData[0];

        if (!util.isString(star.id)) {
            console.error(fn + 'ERROR: no Star');
            return false;
        }
 
        if (!util.isString(star.proper) && 
        (!util.isString(star.bf) || !util.isString(star.bayer) || !util.isString(star.con))) {
            console.error(fn + 'ERROR: no Star name possible');
        }

        if (!util.isNumber(star.ra) || !util.isNumber(star.dec) || !util.isNumber(star.dist)) {
            console.error(fn + 'ERROR: no Star RA or Dec');
        }

        return true;

    };

    /**
     * set a readable name for the star
     * @param {ObjectJSON} star Hyg3 data for a particular star
     */
    PCelestial.prototype.getHygSpriteName = function (star, sprite) {
        let n = star.proper || star.bf;
        if (n.length) sprite.name = n;
        else if (star.bayer && star.con) sprite.name = star.bayer + star.con;
        else sprite.name = star.id;
    };

    /**
     * Get the colors by loading a JSON file
     * @param {ObjectJSON} star Hyg3 data for a particular star
     * @param {String} name name of star (for error message)
     */
    PCelestial.prototype.getHygColor = function (star) {

        let spectra = this.spectra;

        let c = null;
        let s = star.spect; // complete spectrum
        let slook = this.spectra.spectLookup;

        // look for an exact match to the spectral type
        c = slook[s];
        if (c) {
            return [c.r, c.g, c.b];
        }

        /////////////////////////////////////
        // TODO: THIS SHOULD RELY ON PROPS 
        // TODO:
        // TODO:
        /////////////////////////////////////

        // if an exact match doesn't exist, truncate, e.g. 'M5Ve'...'M5V'...'M5'...'M'
        for (i = s.length - 2; i > 1; i--) {
            let t = s.substring(0, i);
            c = slook[t];
            if (c) {
                return [c.r, c.g, c.b];
            }
        }

        // if everything fails, make it white, includes 'pec' for novas
        if (!c) {

            return [1, 1, 1];

        }

    };

    /**
     * 
     * get the sprite index to display for this type
     */
    PCelestial.prototype.getHygSpriteIndex = function (star, sprite) {
        let s = star.spect[0];
        if (s) {
            // TODO: adjust base on prop values.
            sprite.cellIndex = this.dSpriteIndex[s.toUpperCase()];
        } else {
            sprite.cellIndex = this.dSpriteScreenIndex; // G
        }
    };

    /**
     * Get the estimated size of the star (dwarf, giant, supergiant) from 
     * the spectrum. Secondary scaling based on stellar type.
     * 1. If the star is bigger than the Sun, add the log of increased size to default, so 
     *    100x = 1 + 2 = 3 units
     * 2. If the star is smaller than the Sun, use the absolute value of the inverse of the log
     *    10E-3 = 1 / 3;
     */
    PCelestial.prototype.getHygSpriteSize = function (star, sprite) {
        let w = this.dSpriteScreenSize, h = this.dSpriteScreenSize;

        // flatten the star if rotating quickly
        let rot = star.rot;
        if (rot > 20) h /= 1.5;
        else if (rot > 10) h /= 1.2;

        sprite.width = w,
        sprite.height = h;

        let rad = Math.log10(star.radius);
        if (rad < 0) {
            sprite.size = 1 - (1 - 1/rad);
        } else if (rad >= 0) {
            sprite.size = 1 + rad;
        }

        sprite.size = 1 + rad;

    };

    /**
     * Get the overall color, based on spectral type
     */
    PCelestial.prototype.getHygSpriteColor = function (star, sprite) {

        // compute the color
        sprite.color = new BABYLON.Color4(star.r, star.g, star.b, 1.0);

        // scale brightness up or down a bit based on absolute magnitude
        let s = 1;
        if (star.absmag < 0) {
            s = Math.log10(-star.absMag);
        } else {
            s = Math.log10(-star.absmag);
        }
        // TODO: clamp upwards to 1, 1, 1 or 0,0,0 based on absmag

    };

    /**
     * Set the Star position in 3D space
     * @param {ObjectJSON} star Hyg3 data for a particular star
     */
    PCelestial.prototype.getHygSpritePosition = function (star, sprite) {
        // dParsed units = 10, 10 units per parsec

        let maxHygDist = 100000;
        let scale = dParsecUnits;
        let position = sprite.position;

        // the furthest stars have their position adjusted to just inside the current Skybox
        if (star.dist == maxHygDist) scale = maxHygDist / dParsecUnits;

        //we rotate the coordinate system to BabylonJS coordinates by swapping z and y
        if (star.x) {
            position.x = star.x * scale;
            position.z = star.y * scale; // was y
            position.y = star.z * scale; // wax z
        } else {
            let A = degToRad(parseFloat(star.ra) * 15);
            let B = degToRad(parseFloat(star.dec));
            position.x = Math.cos(B) * Math.cos(A) * scale;
            position.z = Math.cos(B) * Math.sin(A) * scale; // was y
            position.y = Math.sin(B) * scale; // was z
        }

    };

    /**
     * Load the hyg file
     * @param {BABYLON.AssetsManager} assetManager 
     * @param {Object} model 
     * @param {string} dir 
     */
    PCelestial.prototype.loadStarHygData = function (assetManager, dir) {

        let celestial = this;

        // load the Hyg3 database
        let loadHYG = assetManager.addTextFileTask('stardata', dir);

        loadHYG.onSuccess = async function (stars) {
            celestial.hygData = JSON.parse(stars.text);
        };

        loadHYG.onTaskError = function (task) {
            console.log('task failed', task.errorObject.message, task.errorObject.exception);
        };

    };

    /**
     * Load Hyg3 database as a JSON file, optionally using stellar type 
     * colors.
     * @param {BABYLON.AssetManager} assetManager
     * @param {ObjectJSON} model model parameters and asset files
     * @param {String} dir the directory for model files
     */
    PCelestial.prototype.loadHygData = function (model, dir, scene) {

        let celestial = this;         // references for callbacks
        let util = this.util;         // utilities
        let spectra = this.spectra;   // parse stellar type string

        // create a asset manager
        let assetManager = new BABYLON.AssetsManager(scene);

        if (!model.hyg) {
            console.error('loadHygData ERROR: invalid hyg data, dir:' + dir + ' file:' + model.hyg);
        }

        // if present, load stellar colors by stellar spectrum
        if (util.isString(model.colors)) {
            spectra.loadStarPropsBySpectrum(assetManager, dir + model.colors);
        }

        // if present, load stellar colors by ci index (temperature)
        if (util.isString(model.blackbody)) {
            spectra.loadStarColorsByBlackbody(assetManager, dir + model.blackbody);
        }

        // if present, load luminosity class lookup by range and absolute magnitude
        if (util.isString(model.lumlookup)) {
            spectra.loadStarLumByMagnitude(assetManager, dir + model.lumlookup);
        }

        // load hyg3 stellar data
        this.loadStarHygData(assetManager, dir + model.hyg);

        assetManager.onProgress = function(remainingCount, totalCount, lastFinishedTask) {
                console.log('Loading Hyg database files. ' + remainingCount + ' out of ' + totalCount + ' items still need to be loaded.');
        };

        // after all our lookup tables are loaded, parse the hyg3 database
        assetManager.onFinish = async function(tasks) {
            console.log('beginning compute Hyg')
            // TODO: attach to object, look for when computing, assume loads have finished
            // TODO: could put an 'await' here for JSON parsing for both...
            let mgr = await celestial.computeHygSprite(dir + 'sprite/textures/', model, scene)
            .then((spriteManagerStars) => {
                console.log('Finished computing Hyg database')
            });

            console.log('LOADED Hyg database');
        };

        assetManager.load();

    };

    /** 
     * use Hyg3 data to create a 3D galaxy of Star sprites.
     * optimizations:
     * sprite.cullingStrategy = BABYLON.AbstractMesh.CULLINGSTRATEGY_BOUNDINGSPHERE_ONLY;
     * sprite.freezeNormals(); // NOT IN SPRITE
     * sprite.convertToUnIndexedMesh(); // NOT IN SPRITE too few vertices to need indexing
     * @param {Object} dir location of spritesheet
     * @param {Object} model the model we are using
     * @param {BABYLON.Scene} scene
     */
    PCelestial.prototype.computeHygSprite = async function (dir, model, scene) {

        let util = this.util;
        let pdata = this.pdata;
        let hygData = this.hygData;
        let numStars    = hygData.length; // an array of star data objects

        // The loader should already have assigned these when we enter this function.
        if (!hygData || !util.isArray(hygData) || !hygData.length) {
            console.error('computeHygSprite ERROR: invalid Hyg data (not an array)');
            return false;
        }

        let spriteSheetFile = dir + model.spritesheet;
        let size = model.size;

        let maxDist     = this.dMaxHygDist / this.dParsecUnits;
        let oDist       = maxDist / 2; // cutoff for very distant stars in Hyg
        let star;

        // load a SpriteManager for the Stars

        let spriteManagerStars = new BABYLON.SpriteManager('starsManager', spriteSheetFile, numStars, size, scene);
        spriteManagerStars.isPickable = true;

        console.log("COMPUTING HygSprite")

        // create properties objects (up to four) for a Star. Multiple sources used to fill out

        // start the hyg3 loop

        for (let i = 0; i < hygData.length; i++) {
        //for (let i = 0; i < 1000; i++) {

            star = hygData[i];

            // extract stellar properties from the spectrum, returns props
            // NOTE: already merged props with hyg fields
            // NOTE: 'p' are the extracted properties
            // NOTE: 'star' is the hyg object with properties augmented by spectrum data
            let p = this.spectra.spectrumToStellarData(star);

            // create the Sprite
            //let sprite = new BABYLON.Sprite(name, spriteManagerStars); 

            let sprite = {};
            sprite.position = {};

            // make the sprite static
            // sprite.stopAnimation();
            // sprite.isVisible = true;
            // sprite.isPickable = true;
            // get the name
            this.getHygSpriteName(star, sprite);

            // set the star position
            this.getHygSpritePosition(star, sprite);
            this.getHygSpriteIndex(star, sprite);
            this.getHygSpriteSize(star, sprite);
            this.getHygSpriteColor(star, sprite);

            // see if spectrum calculations and Hyg3 data don't match
            if (!star.flags) {
            //if (star.type == 'O') {
                sprite.star = star;
                this.sprites.push(sprite); // only has props[0] for now
                // TODO: get the description right
            }

            //if (!star.radius || star.radius <= 0) {
            //if(star.computedRadius) {
            //    sprite.star = star;
            //    this.sprites.push(sprite);
            //}

            // update function for Sprites
            //function update () {
            //
            //};

            //scene.registerBeforeRender(() => {
            //    update();
            //});

        }

        console.log("@@@@@@@@COMPUTED HygSprite")

        ///////////////////////////////////
        ///////////////////////////////////
        /*
        // async is better for updates
        let i = 0;

        // Load sprites in async blocks
        let asyncLoop = util.asyncLoop(hygData.length, 
            function (i) {
                let star = hygData[i];
                console.log("looping:" + i)
            }, 
            function () {
                console.log('all done with async load')
            }, 
        0);

        //for(let i = 0; i < 100; i++)
        //    asyncLoop.executeNext(i);
        //////////////////////////////////
        //////////////////////////////////
        */

    };

    return PCelestial;

}());

function isNumber (value) {
    value = parseFloat(value);
    return typeof value === 'number' && isFinite(value);
};

var dParsecUnits      =   10; // scale parsec distances to the simulation
var dKmUnits          = 2370; // 1 unit = 2370km, Pluto = 2370/2370 = 1.0
var dSpriteSize       =  128; // default size of sprite panel
var dSpriteScreenSize =    1;

/**
 * set the position of a star based on Hyg3 data
 * @param {ObjectJSON} star 
 * @param {Mesh.position} position 
 */
var setHygPosition = function (star, position) {

    //we rotate the coordinate system to BabylonJS coordinates by swapping z and y
    if (star.x) {
        position.x = star.x * dParsecUnits;
        position.z = star.y * dParsecUnits; // was y
        position.y = star.z * dParsecUnits; // wax z
    } else {
        let A = degToRad(parseFloat(star.ra) * 15);
        let B = degToRad(parseFloat(star.dec));
        position.x = Math.cos(B) * Math.cos(A) * star.dist * dParsecUnits;
        position.z = Math.cos(B) * Math.sin(A) * star.dist * dParsecUnits; // was y
        position.y = Math.sin(B) * star.dist * dParsecUnits; // was z
    }

};

/**
 * Set and clamp a usable magnitude from Hyg3 data, -17 to +19
 * @param {ObjectJSON} star
 */
var setHygMag = function (star) {

    let aMag = star.absmag;
    let util = this.util;

    let sMag = [];
    sMag ['n'] = 0,
    sMag ['s'] = 4,
    sMag ['r'] = 1,
    sMag ['c'] = -1,
    sMag ['d'] = 10,
    sMag ['w'] = -11,

    sMag ['o'] = -10,
    sMag ['b'] = -2,
    sMag ['a'] = 2,
    sMag ['f'] = 3,
    sMag ['g'] = 0,
    sMag ['k'] = 0,
    sMag['m'] = 6;

    if (!isNumber(aMag)) {
        if (aMag == '') {
            let s = star.spect.toLowerCase()[0];
            if (s == '') aMag = 0;
            else aMag = sMag[s];
        } else aMag = 0;
    }

    // empirical formula
    let mag = 1 - ((20 + (aMag^2))/200);

    if (mag < 0) m = 0;
    if (mag > 1) m = 1;

    return mag;
};

/**
 * 
 * @param {ObjectJSON} star 
 */
var setHygName = function (star) {
    let n = star.proper || star.bf;
    if (n.length) return n;
    else if (star.bayer && star.con) return star.bayer + star.con;
    else return star.id;
};

/**
 * Load star information from a Hyg file in JSON format parsed to a JS object.
 * note: spritemanager.children gets the individual sprites meatball
 *
 * NOTE: TODO: used 'async' so the calling function can go '.then() 
 *
 * https://www.babylonjs-playground.com/#N74LDU#5
 * https://www.babylonjs-playground.com/#8AH0JV#23
 * @param {Array} data
 * @param {String} spriteSheet 
 * @param {Scene} scene
 */
var computeHygSprite = async function (hygData, spriteFile, size, scene) {

    if (Array.isArray(hygData)) {

        let numStars = hygData.length; // an array of objects
        let spriteSize = size || dSpriteSize;
        let maxHygDist = 100000;
        let maxDist = maxHygDist / dParsecUnits;
        let oDist = maxDist / 2; // cutoff for very distant stars in Hyg
        let spriteIndex = 0;

        // index for different star sprites, based on color
        let sIndex = [];

        sIndex['n'] = 0,
        sIndex['s'] = 0,
        sIndex['r'] = 1,
        sIndex['c'] = 1,
        sIndex['d'] = 4,
        sIndex['w'] = 6,

        sIndex['o'] = 6,
        sIndex['b'] = 5,
        sIndex['a'] = 4,
        sIndex['f'] = 3,
        sIndex['g'] = 2,
        sIndex['k'] = 1,
        sIndex['m'] = 0; // JS works with an empty string key

        // create the sprite manager
        var spriteManagerStars = new BABYLON.SpriteManager('starsManager', spriteFile, numStars, spriteSize, scene);
        spriteManagerStars.isPickable = true;

        // TODO: this might be a way to prevent 1-pixel sparkle of distant stars
        //spriteManagerStars.fogEnabled = false;

        window.camera = scene.cameras[0]; ///////////////////////////TODO TODO

        // TODO: await function here!!!

        // Get the HYG data (up to 120k)
        for (let i = 0; i < hygData.length; i++) {

            let star = hygData[i];

            // name
            let name = setHygName(star);

            // colors (accessed by shifting sprite texture)
            spect = star.spect.toLowerCase()[0];
            if (spect == '') spriteIndex = 3; // no spectrum probably means distant and bright
            else spriteIndex = sIndex[spect];

            // create the Sprite
            let sprite = new BABYLON.Sprite(name, spriteManagerStars); 

            // make the sprite static
            sprite.stopAnimation();

            // NOT DEFINED FOR SPRITE
            //sprite.cullingStrategy = BABYLON.AbstractMesh.CULLINGSTRATEGY_BOUNDINGSPHERE_ONLY;
            //sprite.freezeNormals(); // NOT IN SPRITE
            //sprite.convertToUnIndexedMesh(); // NOT IN SPRITE too few vertices to need indexing

            // For stars at undetermined (maximum) distance, pre-compute once, size, etc

            if (star.dist == maxHygDist) { // 100,000 parsecs, 1,000,000 units
                star.x /= dParsecUnits;   // galaxy (skybox) is 300,000 units
                star.y /= dParsecUnits;   // dParsecUnits drop it to 100,000 units
                star.z /= dParsecUnits;   // won't ever move
                star.dist = maxDist;      // the furthest stars are all at the same distance
                sprite.width = sprite.height = dSpriteScreenSize + (maxDist/60);
                sprite.color.a = setHygMag(star);
            } 
            else {
                // default size;
                sprite.width = sprite.height = dSpriteScreenSize;
            }

            // set the star position
           setHygPosition(star, sprite.position);

            // set which area of sprite image to use
            sprite.cellIndex = spriteIndex;

            // make sprite pickable
            sprite.isPickable = true;

            // add some additional properties to the Sprite
            sprite.hygid = star.id;
            sprite.aMag  = setHygMag(star);

            let baseDist = 100; ///////////////////////////////////
            let baseScale = 0.2 ///////////////////////////////////

            if (star.id == "11734") { // Polaris
                window.polaris = sprite;
                sprite.size *= 100;
                sprite.lookAt = function (camera) {camera.setTarget(this.position)}
                // just changing camera.target only works in preview edition
                //sprite.lookAt = function (camera) { camera.target = this.position}
            }

            if (star.id == "7574") { // Achernar
                window.achernar = sprite;
                sprite.size *= 3;
                sprite.lookAt = function (camera) {camera.setTarget(this.position)}
            }

            if (star.id == "25583") { // AB Doradus
                window.abdor = sprite;
                sprite.size *= 10;
                sprite.lookAt = function (camera) {
                    console.log(sprite.name + " position:" + sprite.position)
                    camera.setTarget(this.position)
                    }
            }

            if (star.id == "118441") { // star behind sirius
                sprite.size = 0.001
            }

            if (star.id == "32263") { // Sirius
                window.sirius = sprite;
                sprite.size /= 2;
                sprite.lookAt = function (camera) {camera.setTarget(this.position)}
            }

            if (star.id == "27919") {  // Betelgeuse
                window.betelgeuse = sprite;
                sprite.size *= baseDist * 0.5 * baseScale;
                sprite.lookAt = function (camera) {camera.setTarget(this.position)}
            }

            if (star.id == "24378") { // Rigel
                window.rigel = sprite;
                sprite.size *= baseDist * 0.75 * baseScale;
                sprite.lookAt = function (camera) {camera.setTarget(this.position)}
            }

             // Bellatrix
            if (star.id == "25273") { // Bellatrix
                window.bellatrix = sprite;
                sprite.size *= baseDist * 0.2 * baseScale;
                sprite.lookAt = function (camera) {camera.setTarget(this.position)}
            }

             // saiph
            if (star.id == "27298") { // Saiph
                window.saiph = sprite;
                sprite.size *= baseDist * 0.5 * baseScale;
                sprite.lookAt = function (camera) {camera.setTarget(this.position)}
            }

            if (star.id == "26662") { // Alnitak, orion belt, left
                window.alnitak = sprite;
                sprite.size *= baseDist * 0.7 * baseScale;
                sprite.lookAt = function (camera) {camera.setTarget(this.position)}
                //camera.target = sprite.position;
            }
            if (star.id == "26246") { // Alnilam, orion belt, middle
                window.alnilam = sprite;
                sprite.size *= baseDist * 1.6 * baseScale;
                sprite.lookAt = function (camera) {camera.setTarget(this.position)}

            }
            if (star.id == "25865") { // Mintaka, right
                sprite.size *= baseDist * 0.7 * baseScale;
                window.mintaka = sprite;
                sprite.lookAt = function (camera) {camera.setTarget(this.position)}
            }

            //if (star.id == "5154") { // very distant star, > 30,000 parsecs
            //    sprite.size *= baseDist * 1;
            //    window.betphe = sprite;
            //    sprite.lookAt = function (camera) { camera.target = this.position}
            //}

            //if (star.id == "71456") { // alpha centauri
            //    console.log("FOUND ALPHA CENTAURI SPRITE, x:"+ sprite.position.x + " y:" + sprite.position.y + " z:" + sprite.position.z)
            //    sprite.size *= 2;
            //    window.sprite =sprite
            //}

            //sprite.setScale( width, height);

            // GUI text
            //https://www.babylonjs-playground.com/#HH8T00#1

            // SCENE OPTIMIZER
            // https://doc.babylonjs.com/how_to/how_to_use_sceneoptimizer

            // ASYNC
            //https://doc.babylonjs.com/how_to/page10

            //SHADERTOY
            //https://www.shadertoy.com/results?query=star

        }

        // save the old camera position, update sprite size only when necessary
        let pos = camera.position;
        let oPos = { x: camera.position.x, y: camera.position.y, z:camera.position.z};

        https://forum.babylonjs.com/t/disable-camera-depending-scaling-on-a-sprite/9252

        function update(sprite, cam) {

            let dx = cam.position.x - sprite.position.x,
            dy = cam.position.y - sprite.position.y,
            dz = cam.position.z - sprite.position.z;
            let dist = Math.sqrt(dx*dx + dy*dy + dz*dz);

            // shim the Sprite size at long distances, reduce 1-pixel flickering
            // TODO: this may be screen resolution-dependent! done for 72dpi
            // TODO: dependent on size of star default versus pixels as well

                //if (dist < 400) { // somewhere between 400 and 600
                if (dist < 400) {
                    ///////spriteManagerStars.disableDepthWrite = false;
                    sprite.width = sprite.height = dSpriteScreenSize;
                    sprite.color.a = 1;
                    // TODO: alpha based on absolute magnitude
                } else if (dist >= oDist) { // distance not resolved in Hyg, pre-set above
                    // about 30% of Hyg3 entries are at 100000, all others are 1000 or less
                    // these don't need to be recomputed to the Hyg limit (~1000 parsecs)
                }
                else {
                    // this greatly reduces 'flicker' for overlapping distant stars
                    ///////spriteManagerStars.disableDepthWrite = true;
                    // keep size > 1 pixel
                    sprite.width = sprite.height = dSpriteScreenSize + (dist/800);
                    // empirical adjustment of magnitude for best '3D' effect
                    let a = 2 * sprite.aMag - (dist/1200);
                    if (a < 0.1) a = 0.1;
                    if (a > 0.9) a = 1;
                    sprite.color.a = a;
                }

        }

        // update function for sprites
        // note: this is NOT a bottleneck for rendering at present!
        scene.registerBeforeRender(() => {
            let dx = pos.x - oPos.x,
            dy = pos.y - oPos.y,
            dz = pos.z - oPos.z;

            // note preview verson has .children as an alias to .sprites

            if ((dx + dy + dz) != 0) {
                for(let i = 0; i < hygData.length; i++) {
                    update(spriteManagerStars.sprites[i], camera);
                }

            }

        });

    }

    return spriteManagerStars;

};

/**
 * Compute planetary, stellar positions over time
 * @link {https://github.com/mgvez/planet-positions}
 * @link {https://www.html5gamedevs.com/topic/33484-calculating-elliptical-planet-orbits/}
 * @param {*} obj 
 */
var computePositions = function(obj) {

};