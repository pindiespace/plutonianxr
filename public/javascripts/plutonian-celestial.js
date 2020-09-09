/**
 * Model of the universe
 * Universe = 1,000,000 parsecs,  10,000,000 units
 * Galaxy   =    30,000 parsecs,     300,000 units (where the skybox is drawn)
 * Hyg Real =       990 parsecs,       9,900 units (stars drawn in 3D)
 * Hyg Max  =   100,000 parsecs,   1,000,000 units (no parallax for star, just a default)
 * (about 10,000 of the 119,000 stars in Hyg3 fall in this category)
 */


/**
 * Contains computations for planetary positions
 */
var POrrey = (function () {

    function POrrey () {

    };

    return POrrey;

}());

var PCelestial = (function () {

    // constructor

    function PCelestial (util) {

        this.util              = util; // PUtil object, instantated in plutonian-scene.js

        this.dParsecUnits      =     10; // scale parsec distances to the simulation
        this.dKmUnits          =   2370; // 1 unit = 2370km, Pluto = 2370/2370 = 1.0
        this.dMUnits           =   1000; // 1 unit = 1000 meters, Voyager 1000/1000 = 1.0
        this.dSpriteSize       =    128; // default size of sprite panel
        this.dSpriteScreenSize =      1; // default size of Star sprites
        this.dMaxHygDist       = 100000;

        // Hyg data (JSON)
        this.hygData           =     [];
        this.spriteManager     =   null;

        // Stellar colors (JSON)
        this.hygColors         = []; // full set, in JSON file

        // SpriteManager and scene
        this.assetManager = null;
        this.starSprites = null;
        this.scene = null;
        this.camera = null;

        // TODO: STATIC VARIABLES ARE SLOWER, CONVERT OUR DEFAULTS

        // computations of planetary positions over time
        this.orrey = new POrrey();

    };

    // information model
    PCelestial.prototype.PCTYPES = {
        WORLD: 'world',
        GALAXY: 'galaxy',
        STARDOME: 'stardome',
        STAR_SYSTEM: 'star_system',
        STAR: 'star',
        BROWN_DWARF: 'brown_dwarf',
        EXOPLANET: 'exoplanet',
        PLANET: 'planet',
        MOON: 'moon',
        ARTIFACT: 'artifact'
    };


    // functions

    /**
     * Return pObj.data default object
      */
    PCelestial.prototype.createCelestialData = function (type, diameter = 0, ra = 0, dec = 0, distance = 0) { 
        return {
            'type': type,
            'diameter': diameter,
            'ra': ra,
            'dec': dec,
            'distance': distance,
            'barycenter':0,
            'tilt': 0,
            'rotation':0,
            'color': [],
            'models': {},
            'mesh': null
        };

    };

    /**
     * Check the data on a data object
     * @param {PCData.data} data object
     */
    PCelestial.prototype.checkData = function (data) {
        // TODO: write check function
        return true;
    };

    // private static variables

    // default star colors
    var dStarColors = [];
        dStarColors['o'] = {r:0.598529412, g: 0.683578431, b: 1},
        dStarColors['b'] = {r:0.680490196, g: 0.759068627, b: 1},
        dStarColors['a'] = {r:0.790196078, g: 0.839607843, b: 1},
        dStarColors['f'] = {r:0.933382353, g: 0.930392157, b: 0.991470588},
        dStarColors['g'] = {r:1, g: 0.925686274, b: 0.830882353},
        dStarColors['k'] = {r:1, g: 0.836421569, b: 0.629656863},
        dStarColors['m'] = {r:1, g: 0.755686275, b: 0.421764706},
        dStarColors['n'] = {r:0.987654321, g: 0.746356814, b: 0.416557734},
        dStarColors['w'] = {r:0.598529412, g: 0.683578431, b: 1},
        dStarColors['r'] = {r:1, g: 0.868921569, b: 0.705735294},
        dStarColors['c'] = {r:1, g: 0.828186274, b: 0.576078431},
        dStarColors['s'] = {r:1, g: 0.755686275, b: 0.421764706},
        dStarColors['d'] = {r:0.798823529, g: 0.834901961, b: 0.984313726},
        dStarColors['l'] = {r:1, g:0.4235294, b:0},
        dStarColors['t'] = {r:1, g:0.219607843, b:0};
        dStarColors['y'] = {r:1, g:0, b:0};

    var dAbsMag = [];
        dAbsMag['o'] = -10, // standard
        dAbsMag['b'] = -2,
        dAbsMag['a'] = 2,
        dAbsMag['f'] = 3,
        dAbsMag['g'] = 0
        dAbsMag['k'] = 0,
        dAbsMag['m'] = 6,
        dAbsMag['n'] = 0, // less common
        dAbsMag['w'] = -11,
        dAbsMag['r'] = 1,
        dAbsMag['c'] = -1,
        dAbsMag['s'] = 4,
        dAbsMag['d'] = 10;
 

    var dSpriteIndex = [];
        dSpriteIndex['o'] = 6, //standard
        dSpriteIndex['b'] = 5,
        dSpriteIndex['a'] = 4,
        dSpriteIndex['f'] = 3,
        dSpriteIndex['g'] = 2,
        dSpriteIndex['k'] = 1,
        dSpriteIndex['m'] = 0,
        dSpriteIndex['n'] = 0, //less common
        dSpriteIndex['w'] = 6,
        dSpriteIndex['r'] = 1,
        dSpriteIndex['c'] = 1,
        dSpriteIndex['s'] = 0,
        dSpriteIndex['d'] = 4;


    // functions

    /**
    * Return radians for (fractional) degrees.
    * @param {Number} n the number, in degrees (0-360).
    * @returns {Number} return the same number, in radians (0-2PI).
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
     * Returns decimal degrees for degrees written as degrees, minutes, seconds
     */
    PCelestial.prototype.dmsToDecimal = function (d = 0, m = 0, s = 0) {
		if(m < 0) m = -m;
		if(s < 0) s = -s;
		let m0 = m; 
        let s0 = s;
		if(d < 0 || d =='-0') {
            m = -m;
            s = -s;
        }
		return parseFloat(d)+parseFloat(m)/60+parseFloat(s)/3600;	
    };

    /**
     * Convert b-v values reported to stars to RGB color
     * @param {Number} bv the b-v value for the star.s
     * {@link https://stackoverflow.com/questions/21977786/star-b-v-color-index-to-apparent-rgb-color}
     * {@link http://www.vendian.org/mncharity/dir3/blackbody/UnstableURLs/bbr_color.html}
     * {@link https://www.pas.rochester.edu/~emamajek/EEM_dwarf_UBVIJHK_colors_Teff.txt}
     */
    PCelestial.prototype.bvToRGB = function (bv) {

        var r = 0, g = 0, b = 0, t = 0;

        if(bv < -0.4) bv = -0.4
        if(bv > 2.0) bv = 2.0

        if(bv >= -0.40 && bv < 0.00) {
            t = (bv + 0.40) / (0.00 + 0.40)
            r = 0.61 + 0.11 * t + 0.1 * t * t
            g = 0.70 + 0.07 * t + 0.1 * t * t
            b = 1.0
        }
        else if(bv >= 0.00 && bv < 0.40) {
            t = (bv - 0.00) / (0.40 - 0.00)
            r = 0.83 + (0.17 * t)
            g = 0.87 + (0.11 * t)
            b = 1.0
        }
        else if(bv >= 0.40 && bv < 1.60) {
            t = (bv - 0.40) / (1.60 - 0.40)
            r = 1.0
            g = 0.98 - 0.16 * t
        }
        else {
            t = (bv - 1.60) / (2.00 - 1.60)
            r = 1.0
            g = 0.82 - 0.5 * t * t
        }

        if (bv >= 0.40 && bv < 1.50) {
            t = (bv - 0.40) / (1.50 - 0.40)
            b = 1.00 - 0.47 * t + 0.1 * t * t
        }
        else if(bv >= 1.50 && bv < 1.951) {
            t = (bv - 1.50) / (1.94 - 1.50)
            b = 0.63 - 0.6 * t * t
        }
        else {
            b = 0.0
        }

        return {
            r: r, 
            g: g, 
            b: b
        };

    };

    /** 
     * Given a pObj, return the correct scaling
     */
    PCelestial.prototype.scale = function (data) {

        let util = this.util;
        let t = this.PCTYPES;

        if(!this.checkData()) {
            console.error('getScale: invalid celestial data object passed');
            return false;
        }

        let scaled = {
            diameter: data.diameter,
            distance: data.distance,
            segments: 32
        };

        switch(data.type) {

            case t.PLANET:
            case t.MOON:
                // 1 unit = 2370km, Pluto = 2370/2370 = 1.0
                scaled.diameter /= this.dKmUnits,
                scaled.distance /= this.dKmUnits;
                break;

            case t.BROWN_DWARF:
            case t.STAR:
            case t.STARDOME:
            case t.STAR_SYSTEM:
            case t.GALAXY:
                // 1 unit = 1/10 parsec
                scaled.diameter /= this.dKmUnits,
                scaled.distance *= this.dParsecUnits;
                break;

            case t.ARTIFACT:
                beak;

            default:
                console.error('.scale ERROR: invalide celestial type');
                break;

        }

        // warnings for objects without data yet

        if(scaled.diameter < 0.01) {
            console.warn('.scale WARNNG: diameter very small (' + scaled.diameter + ' units');
        }

        if(scaled.distance < 0.01) {
            console.warn('.scale WARNING: distance very small (' + scaled.distance + ' units')
        }

        return scaled;

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

        if(!util.isArray(hygData)) {
            console.error(fn + 'ERROR: Hyg data not an array');
            return false;
        }

        if(!hygData.length) {
            console.error(fn + 'ERROR: no data in Hyg data');
            return false;
        }

        // look at the first Star in the array
        let star = hygData[0];

        if(!util.isString(star.id)) {
            console.error(fn + 'ERROR: no Star');
            return false;
        }
 
        if(!util.isString(star.proper) && 
        (!util.isString(star.bf) || !util.isString(star.bayer) || !util.isString(star.con))) {
            console.error(fn + 'ERROR: no Star name possible');
        }

        if(!util.isNumber(star.ra) || !util.isNumber(star.dec) || !util.isNumber(star.dist)) {
            console.error(fn + 'ERROR: no Star RA or Dec');
        }

        return true;

    };

    /**
     * set a readable name for the star
     * @param {ObjectJSON} star Hyg3 data for a particular star
     */
    PCelestial.prototype.getHygName = function (star) {
        let n = star.proper || star.bf;
        if(n.length) return n;
        else if(star.bayer.length && star.con.length) return star.bayer + star.con;
        else return star.id;
    };

    /**
     * Get the colors by loading a JSON file
     * @param {ObjectJSON} star Hyg3 data for a particular star
     * @param {String} name name of star (for error message)
     */
    PCelestial.prototype.getHygColor = function (star) {

        let c = null;
        let s = star.spect;

        // window.bvToRGB = this. bvToRGB; ///////////////////////////////

        // look for an exact match
        c = this.hygColors[s];
        if(c) {
            return c;
        }

        // if an exact match doesn't exist, truncate, e.g. 'M5Ve'...'M5V'...'M5'
        for (i = s.length - 2; i > 1; i--) {
            let t = s.substring(0, i);
            c = this.hygColors[t];
            if(c) {
                return c;
            }
        }

        // one-letter average default, part of this class
        //console.log('setting default:' + s.substring(0,1).toLowerCase() + ' for:' + s)
        c = dStarColors[s.substring(0,1).toLowerCase()];

        // if everything fails, make it white, includes 'pec' for novas
        if(!c) {
            if(s == 'pec') {
                c = dStarColors['a']; // probably a nova, use blue-white
            }
            else {
                //console.warn('no color for spect type:' + s)
                c = dStarColors['f']; // whiteish
            }

        }

        return c;

    };


    /**
     * get the sprite index to display for this type
     */
    PCelestial.prototype.getHygSpriteIndex = function (star) {
        let s = star.spect;
        if(s) {
            c = dSpriteIndex[s.substring(0,1).toLowerCase()];
            if(this.util.isNumber(c)) {
                return c;
            }
        }

        // novas
        if(s == 'pec') return 4; // hot white-blue

        // console.warn('no index for spectral type:' + s);

        return 2; // whitish
    };

    /**
     * Get the size of the star (dwarf, giant, supergiant) from 
     * the spectrum.
     */
    PCelestial.prototype.getHygSize = function (spect) {

        return 1;
    };

    /** 
     * Get an absolute magnitude for stars by stellar type, when 
     * absolute magnitude is not available in Hyg3
     * @param {String} spect the stellar spectral type
     */
    PCelestial.prototype.getHygAbsMag = function (spect) {
        return dAbsMag[spect];
    };

    /**
     * Set the Star position in 3D space
     * @param {ObjectJSON} star Hyg3 data for a particular star
     */
    PCelestial.prototype.getHygPosition = function (star) {

        //we rotate the coordinate system to BabylonJS coordinates by swapping z and y
        if(star.x) {
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
     * Load stellar colors for all stellar types from JSON data
     * JSON file source
     * @link {http://www.isthe.com/chongo/tech/astro/HR-temp-mass-table-byhrclass.html}
     * Additional data (cross-reference)
     * @link {https://www.pas.rochester.edu/~emamajek/EEM_dwarf_UBVIJHK_colors_Teff.txt}
     * @link {http://www.vendian.org/mncharity/dir3/starcolor/details.html}
     * @link {https://sites.uni.edu/morgans/astro/course/Notes/section2/spectraltemps.html}
     * @link {https://en.wikipedia.org/wiki/List_of_star_systems_within_25%E2%80%9330_light-years}
     * @link {http://www.livingfuture.cz/stars.php}
     * @link {http://www.vendian.org/mncharity/dir3/blackbody/UnstableURLs/bbr_color.html}
     */
    PCelestial.prototype.loadStarColors = function (assetManager, model, dir) {

        let celestial = this;
        let colors = dir + model.colors;

        console.log("------------------------------");
        console.log('loading colors for all stellar types:' + colors)

        const loadColors = assetManager.addTextFileTask('starcolors', colors);

        loadColors.onSuccess = async function (colors) {

            console.log('PCELESTIAL Stellar colors loaded, parsing data...')

            celestial.hygColors =  JSON.parse(colors.text);
    
        };

        loadColors.onTaskError = function (task) {
            console.log('task failed', task.errorObject.message, task.errorObject.exception);
        };

    };

    PCelestial.prototype.loadStarData = function (assetManager, model, dir) {

        let util = this. util;
        let celestial = this;

        // load the Hyg3 database
        let hyg = dir + model.hyg;
        let loadHYG = assetManager.addTextFileTask('stardata', hyg);

        loadHYG.onSuccess = async function (stars) {

            celestial.hygData = JSON.parse(stars.text);

/*
            // Async version of JSON.parse, using Fetch API
            util.asyncJSON(hyg, async function (stars) {
                console.log('@@@@@@@@@@building stars')
                if(celestial.checkHygData(stars)) {
                    celestial.hygData = stars;
                    //this.spriteMgr = await celestial.computeHygSprite(stars, dir + 'sprite/textures/' + model.spritesheet, model.size, scene).then((spriteManagerStars) => {
                    //    console.log('@@@@@@@@@@@@Hyg data loaded');
                    //});
                }

            });
*/

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

        let celestial = this; // references for callbacks
        let util = this.util; // utilities

        // NOTE: we replaced DG, DK, and DM with DZ.
        // NOTE: https://en.wikipedia.org/wiki/Stellar_classification#Extended_spectral_types

        // NOTE: use stellar classifications to change appearance of star types!!!
        // https://www.enchantedlearning.com/subjects/astronomy/stars/startypes.shtml

        // primary, 'G' then 1-10 subclasses
        // the 'dXXX' indicates generate
        // the 'XXXe' indicates emission lines in spectrum


        let assetManager = new BABYLON.AssetsManager(scene);

        if(!model.hyg) {
            console.error('loadHygData ERROR: invalid hyg data, dir:' + dir + ' file:' + model.hyg);
        }

        // if present, load stellar colors
        this.loadStarColors(assetManager, model, dir);

        // load stellar data
        this.loadStarData(assetManager, model, dir);

        assetManager.onProgress = function(remainingCount, totalCount, lastFinishedTask) {
                console.log('Loading Hyg database files. ' + remainingCount + ' out of ' + totalCount + ' items still need to be loaded.');
        };

        assetManager.onFinish = async function(tasks) {
            console.log('######FINISHED, LOADING')
            // TODO: attach to object, look for when computing, assume loads have finished
            // TODO: could put an 'await' here for JSON parsing for both...
            let mgr = await celestial.computeHygSprite(dir + 'sprite/textures/' + model.spritesheet, model.size, scene)
            .then((spriteManagerStars) => {
                console.log('COMPUTED Hyg database')
            });

            console.log('LOADED Hyg database');
        };

        assetManager.load();

    };

    /** 
     * use Hyg3 data to create a 3D galaxy of Star sprites.
     * @param {Object} hygData an array of objects with Hyg3 stellar data
     * @param {String} spriteSheetFile the image file to use for Sprite images
     * @param {Number} size the height in pixels of the spriteSheet image. Generally several images horizontally
     * @param {BABYLON.Scene} scene
     */
    PCelestial.prototype.computeHygSprite = async function (spriteSheetFile, size, scene) {

        let util = this.util;

        // The loader should already have assigned these when we enter this function.

        let hygColors = this.hygColors;
        let hygData = this.hygData;

        window.hygColors = hygColors;
        window.hygData   = hygData;

        if(! hygData || !util.isArray(hygData) || !hygData.length) {
            console.error('computeHygSprite ERROR: invalid Hyg data (not an array)');
            return false;
        }

        let numStars    = hygData.length; // an array of star data objects
        let spriteSize  = size || this.dSpriteScreenSize; // set for existing scene, environment
        let maxDist     = this.dMaxHygDist / this.dParsecUnits;
        let oDist       = maxDist / 2; // cutoff for very distant stars in Hyg
        let star        = null;
        let name        = '';
        let color       = {};
        let spect       = null;
        let spriteIndex = 0;

        // load a SpriteManager for the Stars

        let spriteManagerStars = new BABYLON.SpriteManager('starsManager', spriteSheetFile, numStars, size, scene);
        spriteManagerStars.isPickable = true;

        console.log("@@@@@COMPUTING HygSprite")

        for (let i = 0; i < hygData.length; i++) {
        //for (let i = 0; i < 1000; i++) {
            star = hygData[i];
            name = this.getHygName(star);
            //console.log("name is:" + name)
            color = this.getHygColor(star);
            //console.log("color is:" + color)
            spriteIndex = this.getHygSpriteIndex(star);
            //console.log("index is:" + spriteIndex)

        }

        console.log("@@@@@@@@@@@@COMPUTED HygSprite")


        ///////////////////////////////////
        ///////////////////////////////////
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
    if(star.x) {
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

    if(!isNumber(aMag)) {
        if(aMag == '') {
            let s = star.spect.toLowerCase()[0];
            if(s == '') aMag = 0;
            else aMag = sMag[s];
        } else aMag = 0;
    }

    // empirical formula
    let mag = 1 - ((20 + (aMag^2))/200);

    if(mag < 0) m = 0;
    if(mag > 1) m = 1;

    return mag;
};

/**
 * 
 * @param {ObjectJSON} star 
 */
var setHygName = function (star) {
    let n = star.proper || star.bf;
    if(n.length) return n;
    else if(star.bayer.length && star.con.length) return star.bayer + star.con;
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

    if(Array.isArray(hygData)) {

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

        window.camera = scene.cameras[0]; ///////////////////////////TODO TODO

        // TODO: await function here!!!

        // Get the HYG data (up to 120k)
        for (let i = 0; i < hygData.length; i++) {

            let star = hygData[i];

            // name
            let name = setHygName(star);

            // colors (accessed by shifting sprite texture)
            spect = star.spect.toLowerCase()[0];
            if(spect == '') spriteIndex = 3; // no spectrum probably means distant and bright
            else spriteIndex = sIndex[spect];

            // create the Sprite
            let sprite = new BABYLON.Sprite(name, spriteManagerStars); 

            // make the sprite static
            sprite.stopAnimation();

            // For stars at undetermined (maximum) distance, pre-compute once, size, etc

            if(star.dist == maxHygDist) { // 100,000 parsecs, 1,000,000 units
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
            sprite.hyId = star.id;
            sprite.aMag  = setHygMag(star);

            let baseDist = 100; ///////////////////////////////////
            let baseScale = 0.2 ///////////////////////////////////

            if(star.id == "11734") { // Polaris
                window.polaris = sprite;
                sprite.size *= 100;
                sprite.lookAt = function (camera) { camera.target = this.position}
            }

            if(star.id == "7574") { // Achernar
                window.achernar = sprite;
                sprite.size *= 3;
                sprite.lookAt = function (camera) { camera.target = this.position}
            }

            if(star.id == "118441") { // star behind sirius
                sprite.size = 0.001
            }

            if(star.id == "32263") { // Sirius
                window.sirius = sprite;
                sprite.size /= 2;
                sprite.lookAt = function (camera) {camera.target = this.position}
            }

            if(star.id == "27919") {  // Betelgeuse
                window.betelgeuse = sprite;
                sprite.size *= baseDist * 0.5 * baseScale;
                sprite.lookAt = function (camera) { camera.target = this.position}
            }

            if(star.id == "24378") { // Rigel
                window.rigel = sprite;
                sprite.size *= baseDist * 0.75 * baseScale;
                sprite.lookAt = function (camera) { camera.target = this.position}
            }

             // Bellatrix
            if(star.id == "25273") { // Bellatrix
                window.bellatrix = sprite;
                sprite.size *= baseDist * 0.2 * baseScale;
                sprite.lookAt = function (camera) { camera.target = this.position}
            }

             // saiph
            if(star.id == "27298") { // Saiph
                window.saiph = sprite;
                sprite.size *= baseDist * 0.5 * baseScale;
                sprite.lookAt = function (camera) { camera.target = this.position}
            }

            if(star.id == "26662") { // Alnitak, orion belt, left
                window.alnitak = sprite;
                sprite.size *= baseDist * 0.7 * baseScale;
                sprite.lookAt = function (camera) { camera.target = this.position}
                //camera.target = sprite.position;
            }
            if(star.id == "26246") { // Alnilam, orion belt, middle
                window.alnilam = sprite;
                sprite.size *= baseDist * 1.6 * baseScale;
                sprite.lookAt = function (camera) { camera.target = this.position}

            }
            if(star.id == "25865") { // Mintaka, right
                sprite.size *= baseDist * 0.7 * baseScale;
                window.mintaka = sprite;
                sprite.lookAt = function (camera) { camera.target = this.position}
            }

            //if(star.id == "5154") { // very distant star, > 30,000 parsecs
            //    sprite.size *= baseDist * 1;
            //    window.betphe = sprite;
            //    sprite.lookAt = function (camera) { camera.target = this.position}
            //}

            //if(star.id == "71456") { // alpha centauri
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

                //if(dist < 400) { // somewhere between 400 and 600
                if(dist < 400) {
                    spriteManagerStars.disableDepthWrite = false;
                    sprite.width = sprite.height = dSpriteScreenSize;
                    sprite.color.a = 1;
                    // TODO: alpha based on absolute magnitude
                } else if (dist >= oDist) { // distance not resolved in Hyg, pre-set above
                    // about 30% of Hyg3 entries are at 100000, all others are 1000 or less
                    // these don't need to be recomputed to the Hyg limit (~1000 parsecs)
                }
                else {
                    // this greatly reduces 'flicker' for overlapping distant stars
                    spriteManagerStars.disableDepthWrite = true;
                    // keep size > 1 pixel
                    sprite.width = sprite.height = dSpriteScreenSize + (dist/800);
                    // empirical adjustment of magnitude for best '3D' effect
                    let a = 2 * sprite.aMag - (dist/1200);
                    if (a < 0.1) a = 0.1;
                    if(a > 0.9) a = 1;
                    sprite.color.a = a;
                }

        }

        // update function for sprites
        scene.registerBeforeRender(() => {
            let dx = pos.x - oPos.x,
            dy = pos.y - oPos.y,
            dz = pos.z - oPos.z;
            if((dx + dy + dz) != 0) {
                for(let i = 0; i < hygData.length; i++) {
                    update(spriteManagerStars.children[i], camera);
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