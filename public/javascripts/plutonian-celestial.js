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
 * Databases
 * Hyg3 database
 * {@link https://github.com/astronexus/HYG-Database}
 * ARI Database for Nearby Stars cross-connected with 
 * (Gliese, GJ, Gliese, GJ, Woolley, HIP, FK, PPM, BS, HR, HD, HDE, BD, CoD, CPD)
 * {@link https://wwwadd.zah.uni-heidelberg.de/datenbanken/aricns/index.htm}
 * SIMBAD
 * {@link http://simbad.u-strasbg.fr/simbad/sim-fsam}
 * NASA HEASARC Archive
 * {@link https://heasarc.gsfc.nasa.gov/docs/archive.html}
 * {@link https://heasarc.gsfc.nasa.gov/db-perl/W3Browse/w3browse.pl}
 * HEASARSC Gliese search
 * {@link https://heasarc.gsfc.nasa.gov/db-perl/W3Browse/w3table.pl?tablehead=name%3Dgliese2mas&Action=More+Options}
 * Archive for space telescopes (good search function)
 * {@link https://archive.stsci.edu/spec_class/search.php}
 * Nearby Star Systems to add:
 * {@link https://en.wikipedia.org/wiki/List_of_star_systems_within_25%E2%80%9330_light-years}
 * {@link http://phl.upr.edu/projects/nearby-stars-catalog}
 * {@link https://www.livingfuture.cz/stars.php}
 * {@link http://solstation.com/index.html#sthash.dXOO2F6I.dpbs}
 * T-Dwarf Page
 * {@link http://web.mit.edu/ajb/www/tdwarf/}
 * 
 * Exoplanets
 * Exoplanet.eu
 * {@link http://exoplanet.eu/catalog/all_fields}
 * NASA Exoplanet archive
 * {@link https://exoplanets.nasa.gov/discovery/exoplanet-catalog/}
 * 
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
        this.dSpriteScreenSize  =      1; // default size of Star sprites
        this.dSpriteScreenIndex =      4;
        this.dMaxHygDist        = 100000;

        // SpriteManager for Hyg3 data
        this.spriteManager        = null;
        this.SPRITE_INDEX_DEFAULT =    7;

        // WebGL
        this.maxTexSize = 2048;         // minimum default for any modern videocard

        // SpriteManager and scene
        this.assetManager = null;

        // we don't do this for the luminosity classes, since they are in an Array, not an Object, and pre-sorted

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

    /**
     * M-K liminosity class assignment
     * pre-sorted by length for .indexOf(xxx) matching
     * This gives the array index for a sprite, with combined 
     * with stellar type
     */
    PCelestial.prototype.dLuminosityClassIndex = [
        'III', // 0, giant
        'Ia',  // 1, hypergiant
        'Ib',  // 2, supergiant
        'II',  // 3, bright giant
        'IV',  // 4, subgiant
        'VI',  // 5, subdwarf
        'V',   // 6, dwarf
        'D',   // 7, white dwarf
        '',    // 8, use when no luminosity class is present (white and brown dwarfs, truncated spectra)
    ];

    /** 
     * Image sprites are selected via a combination of [type + luminosity class]
     * The program matches by finding the correct luminosity class from .PCelestial.dLuminosityClassIndex,
     * and using its index to retrive the sprite index from the matrix below
     *
     * In theory, one image or texture can be made for every stellar [type + luminosity]
     * As more complex spritesheets are built, these indices would be less redundant
     *
        'III', // 0  giant
        'Ia',  // 1, hypergiant
        'Ib',  // 2, supergiant
        'II',  // 3, bright giant
        'IV',  // 4, subgiant
        'VI',  // 5, subdwarf
        'V',   // 6, dwarf
        'D',   // 7, white dwarf
        ''     // 8, unknown

        TODO: check POSITION ZERO INDEX!!!!!!!!!!!!!!!!!!!!!!!!!!!!
     */
    PCelestial.prototype.dSpriteIndex = {
        'LBV': [ 1,  1,  1,  1,  1,  1, -1, -1,  1], //luminous blue variable
        'W':   [ 0,  0,  0,  0,  0,  0, -1, -1,  0], // Wolf-Rayet
        'WR':  [ 0,  0,  0,  0,  0,  0, -1, -1,  0], // Wolf-Rayet, young
        'WC':  [ 0,  0,  0,  0,  0,  0, -1, -1,  0], // Wolf-Rayet, producing dust, strong C
        'WN':  [ 0,  0,  0,  0,  0,  0, -1, -1,  0], // Wolf-Rayet CNO
        'WO':  [ 0,  0,  0,  0,  0,  0, -1, -1,  0], // Wolf-Rayet strong O
        'WC10':[ 0,  0,  0,  0,  0,  0, -1, -1,  0], // Wolf-Rayet, cooler, strong C
        'WC11':[ 0,  0,  0,  0,  0,  0, -1, -1,  0], // Wolf-Rayet, coolest, strong C
        'WNh' :[ 0,  0,  0,  0,  0,  0, -1, -1,  0], // Wolf-Rayet, young and massive
        'WN10':[ 0,  0,  0,  0,  0,  0, -1, -1,  0], // Wolf-Rayet cooler, strong N
        'WN11':[ 0,  0,  0,  0,  0,  0, -1, -1,  0], // Wolf-Rayet coolest, strong N
        'O':   [ 1,  0,  0,  1,  1,  1,  1, -1,  1], // Blue, luminous ultra-hot supergiant
        'A':   [ 2,  2,  2,  2,  2,  2,  2, -1,  2], // Blue giant, subgiant or dwarf
        'B':   [ 3,  3,  3,  3,  3,  3,  3, -1,  3], // Blue-White giant, bigger than type A
        'F':   [ 4,  4,  4,  4,  4,  4,  4, -1,  4], // Yellow-white, giant or dwarf
        'G':   [ 5,  5,  5,  5,  5,  5,  5, -1,  5], // Yellow, giant or dwarf
        'K':   [ 6,  6,  6,  6,  6,  6,  6, -1,  6], // Yellow-orange, giant or dwarf
        'M':   [ 8,  9,  9,  8,  7,  7,  7, -1,  7], // Red, giant or dwarf or subdwarf
        'MS':  [ 9,  9,  9,  9,  9, -1, -1, -1,  9], // Red giant, asymptotic-giant branch carbon star, younger, transition to SC
        'S':   [ 8,  9,  9,  9,  9, -1, -1, -1,  9], // Red giant, sub-carbon star, asymptotic-giant-branch, zirconium oxide in spectrum
        'SC':  [ 8,  9,  9,  9,  8, -1, -1, -1,  9], // Red giant, older asymptotic-giant branch sub-carbon star, zirconium oxide in spectrum
        'R':   [ 9,  9,  9,  9,  9,  9,  8, -1,  9], // Red giant, carbon star equivalent of late G to early K-type stars
        'N':   [ 8, 10,  8,  8,  8,  8,  8, -1, 10], // Red older carbon star, giant equivalent of late K to M-type stars
        'C':   [ 8,  9,  9,  8,  8,  8,  7, -1,  8], // Red carbon star, giant/dwarf
        'C-R': [ 9,  9,  9,  9,  9,  8,  7, -1,  9], // Red giant, carbon star, equivalent of late G to early K-type stars
        'C-N': [ 9, 10, 10,  8,  8,  8,  7, -1, 10], // Red carbon star, older, giant equivalent of late K to M-type stars
        'C-J': [ 9, 10, 10,  8,  2,  8, -1, -1, 10], // Red giant, cool carbon star with a high content of carbon-13
        'C-H': [ 9, 10, 10,  8,  2, 10, -1, -1, 10], // Red giant, Population II equivalent of the C-R red giants
        'C-Hd':[ 9, 10, 10,  8,  2, 10, -1, -1, 10], // Red giant, Hydrogen-deficient, similar to late G supergiants with CH and C2 bands added
        'D':   [-1, -1, -1, -1, -1, -1, -1, 11, 11], // White dwarf
        'DO':  [-1, -1, -1, -1, -1, -1, -1, 11, 11], // White Dwarf, very hot, helium-rich atmosphere, 45-120,000K
        'DAO': [-1, -1, -1, -1, -1, -1, -1, 11, 11], // White Dwarf, very hot, hydrogen and helium-rich atmosphere, ionized helium lines, >30,000K
        'DA':  [-1, -1, -1, -1, -1, -1, -1, 11, 11], // White Dwarf, hydrogen-rich, 30,000K
        'DAB': [-1, -1, -1, -1, -1, -1, -1, 11, 11], // White Dwarf, hot, hydrogen and helium-rich atmosphere, neutral helium lines, 30,000K
        'DAZ': [-1, -1, -1, -1, -1, -1, -1, 11, 11], // White Dwarf, hot, hydrogen-rich atmosphere, metallic spectral lines
        'DB':  [-1, -1, -1, -1, -1, -1, -1, 11, 11], // White Dwarf, helium-rich, 15-30,000K
        'DBZ': [-1, -1, -1, -1, -1, -1, -1, 11, 11], // White Dwarf, cool, 15-30,000K, neutral helium, He I, spectral lines, metallic spectral lines',
        'DQ':  [-1, -1, -1, -1, -1, -1, -1, 11, 11], // White Dwarf, carbon-rich atmosphere, < 13,000K atomic or molecular carbon lines
        'DZ':  [-1, -1, -1, -1, -1, -1, -1, 11, 11], // White Dwarf, cool, metal-rich atmosphere, < 11,000K, merges DG, DK, DM, DF types
        'DG':  [-1, -1, -1, -1, -1, -1, -1, 11, 11], // White Dwarf, cool, metal-rich atmosphere, 6000K (old classification, now DZ)
        'DK':  [-1, -1, -1, -1, -1, -1, -1, 11, 11], // White Dwarf, metal-rich atmosphere (old classification, now DZ)
        'DM':  [-1, -1, -1, -1, -1, -1, -1, 11, 11], // White Dwarf, metal-rich atmosphere (old classification, now DZ)
        'DF':  [-1, -1, -1, -1, -1, -1, -1, 11, 11], // White Dwarf, metal-rich, CaII, FeI, no H (old classification, now DZ)
        'DC':  [-1, -1, -1, -1, -1, -1, -1, 11, 11], // White Dwarf, cool, no strong spectral lines, < 11,000K
        'DX':  [-1, -1, -1, -1, -1, -1, -1, 11, 11], // White Dwarf, spectral lines unclear',
        'L':   [-1, -1, -1, -1, -1, 12, 12, -1, 12], // Hot brown dwarf, lithium in atmosphere, dust grains
        'T':   [-1, -1, -1, -1, -1, 13, 13, -1, 13], // Cool brown dwarf, methane in atmosphere
        'Y':   [-1, -1, -1, -1, -1, 14, 14, -1, 14], // Gas giant, warm, able to fuse deuterium
        'P':   [-1, -1, -1, -1, -1, 14, 15, -1, 15], // Gas giant, cold, Jupiter-like
        'Q':   [ 0,  0,  0, -1, -1, -1, -1, -1,  0], // Recurring nova, white dwarf companion to mass donating star
        '':    [ 4,  4,  4,  4,  4,  4,  4,  4,  4], // Unknown stellar type
    };

    // dynamically-filled prototype variables

    // holds data loaded from hyg3 (JSON)
    PCelestial.prototype.hygData = [];
 

    // Stellar colors based on spectrum (JSON)
    PCelestial.prototype.sprites = [];

    // collect failed stellar type classifications for debugging
    PCelestial.prototype.failedTypeLookup = [];

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
     * @param {Number} degrees - 0-360
     * @returns {Number} degree value, scaled 0-24
     */
    PCelestial.prototype.degToDecimalHMS = function (degrees) {
        return parseFloat(degrees) / 24;
    };

    /** 
     * Convert decimal hours to HH:MM:SS
     * @param {Number} hours, 0-24, in decimal format
     * @returns {String} string formatted 'HH MM SS'
     */
    PCelestial.prototype.decimalHoursToHMS = function (hours) {
        let n = new Date(0,0).setSeconds(+hours * 3600);
        return (n.toTimeString().slice(0, 8));
    };

    /**
     * Convert hours, minutes, seconds to decimal hours
     * (needed to convert SIMBAD RA to hyg3 values)
     * @param {Number} h - hours, 0-24
     * @param {Number} m - minutes, 0-60
     * @param {Number} s - seconds, 0-60
     * @returns {Number} decimal hours
     */
    PCelestial.prototype.HMSToDecimalHours = function (h = 0, m = 0, s = 0) {
        let util = this.util;
        return parseFloat(h + (m/60) + (s/3600));
    };

    /**
     * 
     * @param {String} s - string formatted HH MM SS, with spaces between
     * @returns {Number} decimal hours, 0-24
     */
    PCelestial.prototype.HMSToDecimalHoursFromString = function (s) {
        let util = this.util;
        let str = s.split(' ');
        return this.HMSToDecimalHours(parseFloat(str[0]), parseFloat(str[1]), parseFloat(str[2]));
    };

    /**
     * Convert seconds to HH:MM:SS
     * @param {Number} seconds - seconds of time
     * @returns {String} - hours, minutes, and seconds as a string
     */
    PCelestial.prototype.secondsToHMS = function (seconds) {
        return (seconds * 1000).toISOString().substr(11, 8);
    };

    /**
     * Returns decimal degrees for degrees written as degrees, minutes, seconds
     * @param {Number} d - degrees, 0-360
     * @param {Number} m - minutes
     * @param {Number} s - seconds
     * @returns {Number} degrees, as a decimal number
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

    /**
     * compute satistics
     */
    PCelestial.prototype.stats = function () {

    };

    /**
     * 
     * @param {Number} ly - distance, in light years
     * @returns {Number} distance, in parsecs
     */
    PCelestial.lightYearsToParsecs = function (ly) {
        return ly* 0.30660139;
    };

    /**
     * 
     * @param {Number} ps - distance, in parsecs
     * @returns {Number} distance, in light years
     */
    PCelestial.parsecsToLightYears = function (ps) {
        return ps * 3.26156378;
    };

    /**
     * 
     * @param {Number} parallax in arcseconds
     * @returns {Number} distance, in parsecs
     */
    PCelestial.prototype.parallaxToDistance = function (parallax) {

    };

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

        };

        // warnings for objects without data yet

        if (scaled.diameter < 0.01) {
            console.warn('.scale WARNNG: diameter very small (' + scaled.diameter + ' units for:' + data.type);
        }

        if (scaled.dist < 0.01) {
            console.warn('.scale WARNING: distance very small (' + scaled.dist + ' units for:' + data.type)
        }

        return scaled;

    };

    PCelestial.prototype.rotate = function (data) {
        console.log("celestial.rotate TODO:")
    };

    PCelestial.prototype.rotateByQuat = function (data) {
        console.log("celestial rotatebyquat TODO:");
    };

    /**
     * Make sure the hyg3 JSON file looks correct.
     * Check the first entry for the minimum values needed to create a Sprite
     * Minimum fields:
     * id - hyg3 ID value
     * @param {ObjectJSON} star Hyg3 data for a particular star
     */
    PCelestial.prototype.checkHygData = function (hygData) {

        let util = this.util;

        if (!util.isArray(hygData)) {
            console.error(fn + 'checkHygData ERROR: Hyg data not an array');
            return false;
        }

        if (!hygData.length) {
            console.error(fn + 'checkHygData ERROR: no data in Hyg JSON');
            return false;
        }

        // look at the first Star in the array
        let star = hygData[0];

        if (!util.isString(star.id)) {
            console.error(fn + 'checkHygData ERROR: no Star');
            return false;
        }

        // stellar type defined? (required for selecting Sprite frame)
        if (!star.spect) console.log('checkHygData no type for hygid:' + star.id)

        // position in space defined?
        if (!util.isNumber(star.ra) || !util.isNumber(star.dec) || !util.isNumber(star.dist)) {
            console.error(fn + 'checkHygData ERROR: no Star RA or Dec');
        }

        return true;

    };

    /**
     * set a readable name for the star created from the hyg record
     * @param {Object.PData.HygObj} hyg - Hyg3 data for a particular star
     */
    PCelestial.prototype.getHygSpriteName = function (hyg) {
        let name = '';
        let n = hyg.proper || hyg.bf;
        if (n.length) name = n;
        else if (hyg.bayer && hyg.con) name = hyg.bayer + hyg.con;
        else name = hyg.id;

        return name;
    };

    /**
     * Get the colors from the hyg record (if they're not there, they can't be computed)
     * NOTE: specifying a Sprite color SLOWS IT DOWN!
     * @param {ObjectJSON} star Hyg3 data for a particular star
     * @param {String} name name of star (for error message)
     * @return {BABYLON.Color3}
     */
    PCelestial.prototype.getHygColor = function (hyg) {
        if (hyg.r + hyg.g + hyg.b > 0) return [hyg.r, hyg.g, hyg.b];
        else return [1, 1, 1];
    };

    /**
     * create links between Stars defined as double or multiple. Should 
     * only run AFTER Hyg data is processed. 
     * Source 1 - 'comp', 'comp_primary', 'base' fields in hyg3
     * Source 2 - spectra is composite (spectroscopic double or multiple Star)
     */
    PCelestial.prototype.computeMultipleStars = function () {
        // TODO: create links, zoom option to 'split' multiple stars
    };

    /**
     * Return current Sprites from the SpriteManager
     * @return {BABYLON.SpriteManager} 
     */
    PCelestial.prototype.getSprites = function () {
        return this.spriteManager.sprites;
    };

    /**
     * move the camera to just in front of a Sprite by one of its identifiers
     * - hygid - hyg3 id
     * - hip: hipparcos
     * - hr: 
     * - hd: H. Draper
     * - gaia:
     */

    /**
     * Get a Sprite by an identifier
     * @param {String} hygid - the hyg database id of the object represented by the Sprite
     * @return {Babylon.Sprite}
     */
    PCelestial.prototype.getSpriteByIdentifier = function (id) {
        let util = this.util;
        let sprites = this.getSprites();
        let identifier = '';

        if (util.isNumber(id)) {
            id += ''; // coerce to string
        }
        identifier = id.split(' ');
        let iden = identifier[0];
        identifier.splice(0, 1);
        let val = identifier.join(' ');
        let s;
        for (let i = 0; i < sprites.length; i++) {
            let hyg = sprites[i].hyg;

            switch (iden.toLowerCase()) {
                case 'hd':
                    if (hyg.hd && hyg.hd == val) {
                        s = sprites[i];
                    }
                    break;
                case 'hr':
                    if (hyg.hr && hyg.hr == val) {
                        s = sprites[i];
                    }
                    break;
                case 'gl': 
                    if (hyg.gl && hyg.gl == iden + ' ' + val) {
                        s = sprites[i];
                    }
                case 'gaia':
                    if (hyg.gaia && hyg.gaia == val) {
                        s = sprites[i];
                    }
                    break;
                case 'proper':
                    if (hyg.proper && hyg.proper == val) {
                        s = sprites[i];
                    }
                default:
                    if (hyg.id == id) { // wasn't split, get back default string
                        s =  sprites[i]; // just an id? use hyg.id
                    }
                    break; 

            }

        }

        // TODO: debug
        window.sprite = s;

        if (!s) console.warn('.getSpriteByIdentifier: failed to find:' + id);
        
        return s;
    };

    /**
     * move the camera to just in front of a Sprite, offset 5 units 
     * in the z-axis
     * @param {String} id - the hyg3 identifier (hygid, hip, hd, hr, gaia)
     */
    PCelestial.prototype.goToSpriteByIdentifier = function (id) {
        let scene = this.spriteManager._scene;
        let camera = scene.activeCamera;
        let s = this.getSpriteByIdentifier(id);
        if (s) {
            camera.position = s.position.add(new BABYLON.Vector3(0, 0, 5));
            camera.setTarget(s.position);
        }
    };

    PCelestial.prototype.getHygSpriteIndex = function (star) {
        let index = -1;
        let SPRITE_INDEX_DEFAULT = this.SPRITE_INDEX_DEFAULT;

        let pt = star.primary.type;
        let si = this.dSpriteIndex[pt]; // exact match to type needed

        // M-K typelist, each type with a luminosity vs. spriteIndex array
        if (si) {

            // M-K luminosity - index lookup
            let lc = this.dLuminosityClassIndex; 
            let pl = star.primary.luminosity;
            if (pl) {

                for (let j = 0; j < lc.length; j++) {  // look for luninosity class
                    let idx = pl.indexOf(lc[j]);
                    if (pl && idx == 0) {
                        let ii = si[j];
                        if (ii == -1) {
                            console.log('bad index, proper:' + star.proper + ' type:' + pt + ' lum:' + lc[j] + ' index:' + si[j]);
                        }
                        return ii;
                    }
                } // end of loop

            } // luminosity present

            return si[SPRITE_INDEX_DEFAULT]; // no luminosity class present, use default for type

        } else {
            console.warn('.getHygSpriteIndex WARN: did not find:' + pt + ' in lookup');
            this.failedTypeLookup.push(star)
        }

        return SPRITE_INDEX_DEFAULT; // emergency default
    };

    /**
     * Compute a logarithmic scaled size for the star compatible with the simulation
     * - primary scaling a log of radius
     * - secondary scaling for very large and small Stars
     * @param {Object.PData.HygObj} star
     * @param {BABYLON.Sprite} sprite
     */
    PCelestial.prototype.setHygSpriteSize = function (star, sprite) {

        let util = this.util;

        let w = this.dSpriteScreenSize, h = this.dSpriteScreenSize;

        // flatten the star if it is rotating quickly
        let rot = star.rot;
        if (rot > 20) h /= 1.5;
        else if (rot > 10) h /= 1.2;

        sprite.width = w,
        sprite.height = h;
        //TODO: rationalize
        // TODO: lum < 1 is being classified too large, when there is no lumClass
        // TODO: adjust sprites based on radius, not just type
        // TODO: red dwarves are too big relative to G class star
        //sprite.size = 0.69897 + (Math.log(Number(star.radius) + 1));
        //sprite.size = 1 + (util.logWithBase(Number(star.radius) + 1, 3));
        sprite.size = Math.pow(star.radius, 0.4);
    };

    /**
     * Set the Star position in 3D space
     * @param {ObjectJSON} star Hyg3 data for a particular star
     */
    PCelestial.prototype.setHygSpritePosition = function (star, sprite) {
        // dParsed units = 10, 10 units per parsec

        let maxHygDist = 100000;
        let scale = this.dParsecUnits;
        let position = sprite.position;

        // the furthest stars have their position adjusted to just inside the current Skybox
        if (star.dist == maxHygDist) scale = maxHygDist / this.dParsecUnits;

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
            console.error('PCelestial.loadHygData ERROR: invalid hyg data, dir:' + dir + ' file:' + model.hyg);
        }

        // if present, load stellar colors by blackbody temperature
        if (util.isString(model.blackbody)) {
            spectra.loadStarColorsByBlackbody(assetManager, dir + model.blackbody);
        }

        // load the [type + range + luminosity] table used by PSectrum to parse complete spectra
        if (util.isString(model.trl)) {
            spectra.loadTRL(assetManager, dir + model.trl);
        }

        // load the [type + luminosity] table used by PSpectrum to parse incomplete spectra
        if (util.isString(model.tl)) {
            spectra.loadTL(assetManager, dir + model.tl);
        }

        // if present, load luminosity class lookup by range and absolute magnitude
        if (util.isString(model.lumlookup)) {
            spectra.loadStarLumByMagnitude(assetManager, dir + model.lumlookup);
        }

        // load hyg3 stellar data
        this.loadStarHygData(assetManager, dir + model.hyg);

        assetManager.onProgress = function(remainingCount, totalCount, lastFinishedTask) {
                console.log('PCelestial.loadHygData: Loading Hyg database files. ' + remainingCount + ' out of ' + totalCount + ' items still need to be loaded.');
        };

        // after all our lookup tables are loaded, parse the hyg3 database
        assetManager.onFinish = async function(tasks) {
            console.log('beginning compute Hyg')
            // TODO: attach to object, look for when computing, assume loads have finished
            // TODO: could put an 'await' here for JSON parsing for both...
            let mgr = await celestial.computeHygSprite(dir + 'sprite/textures/', model, scene)
            .then((spriteManagerStars) => {
                console.log('Finished computing Hyg database')
                // compute multiple Star links TODO:
                celestial.computeMultipleStars();
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
        let numStars  = hygData.length; // an array of star data objects
        let TWOPI = Math.PI * 2;
        //let camera = scene.cameras[0]; // can't EDIT scene.activeCamera, conficts with WebXR
        let camera = scene.activeCamera;

        // The loader should already have assigned these when we enter this function.
        if (!this.checkHygData(hygData)) return false;

        let spriteSheetFile = dir + model.spritesheet;
        let size = model.size;

        let maxDist = this.dMaxHygDist / this.dParsecUnits;
        let oDist   = maxDist / 2; // cutoff for very distant stars in Hyg

        // load a SpriteManager for the Stars

        this.spriteManager = new BABYLON.SpriteManager('starsManager', spriteSheetFile, numStars, size, scene);

        // by default, make them all pickable
        this.spriteManager.isPickable = true;
        
         let sManager = this.spriteManager;

        //this.spriteManager.disableDepthWrite = true;

//////////////////////////////////////////
        // TODO: change red giant equtorial band
        // TODO: integrate shader for star, planet
        // TODO: UI for visiting star (on topmost panels?)
        // TODO: VR Gaze selection
        // TODO: Sprite to pObj conversion
/////////////////////////////////////////

        console.log("COMPUTING HygSprite")

        // create properties objects (up to four) for a Star. Multiple sources used to fill out

        // start the hyg3 loop

        // 0-20,000 - 58fps
        //   40,000 - 30fps
        //  119,000 - 23fps

        for (let i = 0; i < hygData.length; i++) {
        //////////////////////for (let i = 0; i < 400; i++) {

            let hyg = hygData[i];

            /* 
             * extract stellar properties from the spectrum, returns props
             * NOTE: already merged props with hyg fields
             * NOTE: 'p' are the extracted properties
             * NOTE: 'hyg' is a hyg record with properties augmented by spectrum data
             */
            let p = this.spectra.spectrumToStellarData(hyg);

            let name = this.getHygSpriteName(hyg);


            // create the Sprite
            let sprite = new BABYLON.Sprite(name, sManager); 
            sprite.stopAnimation();

            // make the sprite static
            sprite.isVisible = true;
            sprite.isPickable = true;

            // random angle for sprite billboard image (not the same as stellar rotation)
            sprite.angle = Math.random() * TWOPI;

            sprite.hyg = hyg;

            sprite.cellIndex = this.getHygSpriteIndex(hyg);

            // set the star position
            this.setHygSpritePosition(hyg, sprite);
            //// TODO:
            this.setHygSpriteSize(hyg, sprite);
            /// TODO:
            /// TODO:

            // TODO: possibly a way to "apply" or "call" so we don't have to create a unique function
            // TODO:
            // TODO:
            // banard's star test case
            ///if (hyg.id == '87665') sprite.width = sprite.height = dSpriteScreenSize *20
            // if (hyg.id == "117999") { // high-carbon red dwarf
            //    window.dwarf = sprite;
            //    sprite.lookAt = function () {camera.setTarget(this.position)}
            //}

            if (hyg.id == "66250") { // mislabeled dwarf
                window.bad = sprite;
                sprite.lookAt = function () {camera.setTarget(this.position)}
            }

            if (sprite.size > 3) {
                window.big = sprite;
                big.lookAt = function () {camera.setTarget(this.position)}
            }


            // update function for Sprites
            function update (sprite, cam) {

                /*
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
                */
            
            };

            scene.registerBeforeRender(() => {

                /*
                 let dx = pos.x - oPos.x,
                dy = pos.y - oPos.y,
                dz = pos.z - oPos.z;

                // note preview verson has .children as an alias to .sprites

                if ((dx + dy + dz) != 0) {
                    for(let i = 0; i < hygData.length; i++) {
                        update(spriteManagerStars.sprites[i], camera);
                    }

                }
                */

            });

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
