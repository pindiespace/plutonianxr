/**
  * Plutonian local assets, used since we often need two 
  * materials sharing a common texture or cubeTexture for 
  * VR and non-VR cases
  */
'use strict'

/**
 * PObj data creation, cloning, validation
 * - defines PObj data structure, required fields
 * - defines data structure datatypes Hyg3 database entries
 */
var PData = (function () {

    // static to class
    // information model
    PData.PCTYPES = {
        WORLD: 'world',
        GALAXY: 'galaxy',
        NEBULA: 'nebula',
        STARDOME: 'stardome',
        STAR_SYSTEM: 'star_system',
        STAR: 'star',
        BROWN_DWARF: 'brown_dwarf',
        EXOPLANET: 'exoplanet',
        ROGUE_PLANET: 'rogue_planet', // planet not orbiting a star
        PLANET: 'planet',
        EXOMOON: 'exomoon',
        MOON: 'moon',
        ARTIFACT: 'artifact'
    };

    // dynamic to class

    PData.prototype.PCTYPECHECK = [];

    // constructor

    function PData (util) {

        this.util = util;

        this.pObj_ERROR   = -1;
        this.hygObj_ERROR = -1;

        this.EMPTY        = '',
        this.ZERO         =  0,
        this.MINUS_ONE    = -1,
        this.ONE          = 1,
        this.NULL         = null,
        this.FALSE        = false,
        this.TRUE         = true,
        this.NAN          = NaN,
        this.UNKNOWN      = 'unknown',
        this.NOT_FOUND    = -1;

        // initialize PCTYPECHECK array for fast type checking

        this.PCTYPES = PData.PCTYPES;

        for (var i in this.PCTYPES) {
            this.PCTYPECHECK[this.PCTYPES[i]] = true;
        }

    };

    /*
     * ------------------------------------------------------
     * PSpectrum (used by PSpectrum, PCelestial objects)
     * ------------------------------------------------------
     */

    /**
     * some PSpectrum constants, 
     * indicating the type of spectrum or sub-spectrum
     */
    PData.prototype.SPECTROLES = {
        PRIMARY: 'primary',
        COMPOSITE: 'composite',
        INTERMEDIATE: 'intermediate',
        UNKNOWN: 'unknown'
    };

    /**
     * create a PSpectrum property object, also used by PCelestial 
     */
    PData.prototype.createPSpectrum = function (spect = '', role = '', confidence = 0, flag = '') {
        return {
            spect: spect || this.EMPTY, // spectra (sub)string
            role: role || this.SPECTROLES.UNKNOWN,
            confidence: confidence || this.ZERO, // confidence in results (reduced if values mismatch, or mostly computed)
            flag: flag || '', // verbal description of problems for debugging
            type: { // type (O, A, B,...)
                key: this.EMPTY, // key for description (values in PSpectrum)
            },
            range: { // range (0-9)
                key: this.EMPTY,
                value: this.NAN  // value (in spectrum string)
            },
            luminosity: { // luminosity (I, II, III,...)
                key: this.EMPTY,    // Morgan-Keenan luminosity key (I, II, III...) from spectrum
                value: this.NAN,    // numeric luminosity value (Star/Sun), from lookup tables
            },
            mods: {
                keys: []         // modifiers (ss, sh, p, Fe), series of keys (values in PSpectrum)
            },
            mass: {
                value: this.NAN,
                cvalue: this.NAN  // COMPUTED mass
            },   // mass ratio, (Star/Sun)
            radius: {
                value: this.NAN,
                cvalue: this.NAN // COMPUTED radius
            }, // radius ratio, (Star/Sun)
            rotation: {
                value: this.NAN
            },
            temp: {
                value: this.NAN,
                lvalue: this.NAN, // lookup table value
                cvalue: this.NAN, // COMPUTED temprature
            },   // temperature (kelvin)
            ci: {
                value: this.EMPTY
            },     // color index b-v
            color: {
                r:0,
                g:0,
                b:0
            },     // color
            absmag: {
                value: this.NAN,
                lvalue: this.NAN, // lookup table value
                cvalue: this.NAN, // COMPUTED absolute magnitude
                hvalue: this.NAN  // Hyg value
            }, // absolute magnitude, given or estimated
            bolo: {
                value: this.NAN
            }, // bolometric correction
            var: {
                var_min: this.NAN,
                var_max: this.NAN
            } // variability in absolute magnitudes

        };

    };

    PData.prototype.checkPSpectrum = function (pSpect) {

        let util = this.util;

        if (!util.checkObject(pSpect)) {
            console.error('checkPSpectrum ERROR: no object');
            return false;
        }

        return true;
    };


    /*
     * ------------------------------------------------------
     * HYG3 database object ( used by PCelestial)
     * extended with data extracted from spectrum
     * ------------------------------------------------------
     */

    // constants related to hyg data
    PData.prototype.hygConstants = {
        max_dist: 100000
    };

    /**
     * Create our internal Hyg object, using Hyg3 data, plus additional 
     * fields that can be filled by examining the star's spectral type, 
     * leaving out low-density or redundant fields in the actual hyg3 database
     * {@link https://github.com/astronexus/HYG-Database}
     */
    PData.createHygObj = function () {
        return {
            id: this.MINUS_ONE,
            hip: this.MINUS_ONE,
            hd: this.MINUS_ONE,
            hr: this.MINUS_ONE,
            gl: this.EMPTY,
            bf: this.EMPTY,
            proper: this.EMPTY,
            ra: this.ZERO,
            dec: this.ZERO,
            dist: this.ZERO,
            //pmra, pmdec:, rv:
            mag: this.ZERO,
            absmag: this.ZERO,
            spect: this.EMPTY,
            ci: this.EMPTY,
            x: this.ZERO,
            y: this.ZERO,
            z: this.ZERO,
            //vx:, vy:, vz:, rarad:, decrad:, pmrarad:, pmdecrad:, bayer:, flam:
            con: this.EMPTY,
            lum: this.ONE,
            var: false,
            var_min: this.NOT_FOUND,
            var_max: this.NOT_FOUND,
            // additional, from spectrum parsing
            intermediate: [], // list intermediate type to primary
            //comp, comp_primary, base
            composite: [], // list composite spectral types
            temp: this.ZERO,
            radius: this.ONE,
            r: this.ZERO,
            g: this.ZERO,
            b: this.ZERO,
            rot: this.ONE,
            dust: false,
            envelope: false,
            description: this.EMPTY
        };

    };

    PData.prototype.checkHygObj = function (hygObj) {
        return true;
    };

    PData.prototype.cloneHygObj = function (hygObj = {}) {
            if (!hygObj.id) hygObj.id = this.MINUS_ONE;
            if (!hygObj.hip) hygObj.hip = this.MINUS_ONE;
            if (!hygObj.hd) hygObj.hd = this.MINUS_ONE;
            if (!hygObj.hr) hygObj.hr = this.MINUS_ONE;
            if (!hygObj.gl) hygObj.gl = this.EMPTY;
            if (!hygObj.bf) hygObj.bf = this.EMPTY;
            if (!hygObj.proper) hygObj.proper = this.EMPTY;
            if (!hygObj.ra) hygObj.ra = this.ZERO;
            if (!hygObj.dec) hygObj.dec = this.ZERO;
            if (!hygObj.dist) hygObj.dist = this.ZERO;
            //pmra, pmdec:, rv:
            if (!hygObj.mag) hygObj.mag = this.ZERO;
            if (!hygObj.absmag) hygObj.absmag = this.ZERO;
            if (!hygObj.spect) hygObj.spect = this.EMPTY;
            if (!hygObj.ci) hygObj.ci = this.EMPTY;
            if (!hygObj.x) hygObj.x = this.ZERO;
            if (!hygObj.y) hygObj.y = this.ZERO;
            if (!hygObj.z) hygObj.z = this.ZERO;
            //vx:, vy:, vz:, rarad:, decrad:, pmrarad:, pmdecrad:, bayer:, flam:
            if (!hygObj.con) hygObj.con = this.EMPTY;
            if (!hygObj.lum) hygObj.lum = this.ZERO;
            if (!hygObj.var) hygObj.var = false;
            if (!hygObj.var_min) hygObj.var_min = this.NOT_FOUND;
            if (!hygObj.var_max) hygObj.var_max = this.NOT_FOUND;
            // additional, from spectrum parsing
            if (!hygObj.intermediate) hygObj.intermediate = []; // list intermediate type to primary
            //comp, comp_primary, base
            if (!hygObj.composite) hygObj.composite = []; // list composite spectral types
            if (!hygObj.temp) hygObj.temp = this.ZERO;
            if (!hygObj.radius) hygObj.radius = this.ONE;
            if (!hygObj.r) hygObj.r = this.ZERO;
            if (!hygObj.g) hygObj.g = this.ZERO;
            if (!hygObj.b) hygObj.b = this.ZERO;
            if (!hygObj.rot) hygObj.rot = this.ONE;
            if (!hygObj.dust) hygObj.dust = false;
            if (!hygObj.envelope) hygObj.envelope = false;
            if (!hygObj.description) hygObj.description = this.EMPTY;

            return hygObj;
    };


    /*
     * ------------------------------------------------------
     * PObj (used by PScene, PCelestial)
     * ------------------------------------------------------
     */

    /**
     * Create an empty PObj
     * @param {String} key 
     * @param {String} dname 
     * @param {String} name 
     * @param {String} description 
     * @param {Boolean} suppress 
     */
    PData.prototype.createPObj = function (key, dname, name, description, suppress = false) {

        return {
            key: key || this.EMPTY,
            dname: dname || this.EMPTY,
            name: name || this.EMPTY,
            description: description || this.EMPTY
        };

    };

    /**
     * check an existing pObj for valid entries
     */
    PData.prototype.checkPObj = function (pObj, checkData = true, checkModels = true, suppress = false) {

        let util = this.util;

        let name = pObj.name;

        if (!util.isObject(pObj)) {
            if (!suppress) console.error('checkPObj ERROR:' + name + ' not a valid object');
            return false;
        }

        if (!util.isString(pObj.key)) {
            if (!suppress) console.error('checkPObj ERROR:' + name + ' key missing');
            return false;
        }

        if (!util.isString(pObj.dname)) {
            if (!suppress) console.error('checkPObj ERROR:' + name + ' missing data directory');
            return false;
        }

        if (!util.isString(pObj.name)) {
            console.warn('checkPObj WARNING: name missing');
        }

        // optionally check the data object
        if (checkData == true) {
            return this.checkData(pObj.data, pObj.name, checkModels, suppress);
        }

        return true;

    };

    /**
     * Copy a pObj
     * 1. If nothing is passed, build an empty object.
     * 2. Otherwise, add any needed fields to the existing object.
     * 3. Finally, return a cloned copy of the original object.
     */
    PData.prototype.clonePObj = function (pObj = {}) {
        if (!pObj.key) pObj.key = this.EMPTY;
        if (!pObj.dname) pObj.dname = this.EMPTY;
        if (!pObj.name) pObj.name =  this.EMPTY;
        if (!pObj.description) pObj.description = this.EMPTY;
        if (!pObj.references) pObj.references = [];

        if (!pObj.data) {
            pObj.data = this.cloneData();
            //pObj.data = {};
        }
        else {
            //NOTE: don't used returned object
            //this.cloneData(pObj.data);
            let d = pObj.data;
            if (!d.type) d.type = this.UNKNOWN;
            if (!d.diameter) d.diameter = 0;
            if (!d.ra) d.ra = 0;
            if (!d.dec) d.dec = 0;
            if (!d.dist) d.dist = 0;
            if (!d.tilt) d.tilt = 0;
            if (!d.rotation) d.rotation = 0;
            if (!d.color) d.color = [1, 1, 1, 1];

        }

        return Object.assign({}, pObj);

    };

    /*
     * ------------------------------------------------------
     * PData (internal to PObj, used by PScene, PCelestial)
     * ------------------------------------------------------
     */

    /**
     * Crate a PData object
     * @param {this.PCTYPES} type 
     * @param {Number} diameter 
     * @param {Number} ra 
     * @param {Number} dec 
     * @param {Number} dist 
     * @param {Array} rotation 
     * @param {Array} color 
     * @param {Boolean} suppress 
     */ 
    PData.prototype.createPData = function (type, diameter, ra, dec, dist, rotation, color, suppress = false) {

        let util = this.util;

        if (!this.PCTYPECHECK[data.type]) {
            if (!suppress) console.error('createPData ERROR:' + name + 'type:' + data.type + ' not registered');
            return {};
        }
        // TODO: rotation
        if (!util.isArray(rotation) || rotation.length != 3) {

        }

        return {
            type: type,
            diameter: diameter || this.ZERO,
            ra: ra || this.ZERO,
            dec: dec || this.ZERO,
            dist: dist || this.ZERO,
            rotation: rotation,
            color: color,
            models: {}
        };

    };

    /**
     * Check data associated with a world object
     */
    PData.prototype.checkData = function(data, name, checkModels = true, suppress = false) {

        let util = this.util;
        let t = this.PCTYPES;

        if (!util.isObject(data)) {
            if (!suppress) console.error('checkData ERROR:' + name + ' no data object');
            return false;
        }

        // check if valid data type
        if (!this.PCTYPECHECK[data.type]) {
            if (!suppress) console.error('checkData ERROR:' + name + 'type:' + data.type + ' not registered');
            return false;
        }

        if (!util.isNumber(data.x)) {
            if (!util.isNumber(data.ra) || !util.isNumber(data.dec) || !util.isNumber(data.dist)) {
                if (!suppress) console.error('checkData ERROR:' + name + ' missing or invalid for ra:' + data.ra + ' dec:' + data.dec + ' dist:' + data.dist + ' information');
                return false;
            }
        } else {
            if (!util.isData(data.y) || !util.isData(data.z)) {
                if (!suppress) console.error('checkData ERROR: ' + name + ' missing both ra, dec and xyz data');
                return false;
            }
        }

        if (checkModels == true) {
            return this.checkModel(data.models, name, suppress);
        }

        return true;
    };

    /**
     * Clone a data sub-object from pObj
     * 1. If nothing is passed, build an empty object.
     * 2. Otherwise, add any needed fields to the existing object.
     * 3. Finally, return a cloned copy of the original object.
     */
    PData.prototype.cloneData = function({}, data, type) {
        let d = data;
        if (!d.type) d.type = this.UNKNOWN;
        if (!d.diameter) d.diameter = 0;
        if (!d.ra) d.ra = 0;
        if (!d.dec) d.dec = 0;
        if (!d.dist) d.dist = 0;
        if (!d.tilt) d.tilt = 0;
        if (!d.rotation) d.rotation = 0;
        if (!d.color) d.color = [1, 1, 1, 0.5];

        return Object.assign({}, d);

    };

    /*
     * ------------------------------------------------------
     * Models (internal to PData, highly variable)
     * ------------------------------------------------------
     */

    PData.prototype.checkModel = function (models, name, suppress = false) {

        let util = this.util;

        if (!util.isObject(models)) {
            if (!suppress) console.error('checkData ERROR:' + name + ' missing model object');
            return false;
        }

        if (!util.isObject(models.default)) {
            if (!suppress) console.error('checkData ERROR:' + name + ' no default model');
            return false;
        }

        // TODO: could do more checking of model parameters
        let activeFlag = false;
        for(var i in models) {
            if (models[i].active) activeFlag = true;
        }
        if (!activeFlag) {
            if (!suppress) console.error('checkData ERROR:' + name + ' has models, but none are active');
        }

        return true;

    };

    /*
     * ------------------------------------------------------
     * World (JSON file, contains everything in a Scene, used by PScene)
     * ------------------------------------------------------
     */

    /**
     * check World file for schema validity, report on elements
     * @param {Object} world
     */
    PData.prototype.checkWorld = function(world) {

        let util = this.util;

        if (!util.isObject(world)) {
            console.error('checkWorld ERROR: world not defined');
            return false;
        }

        // Top level should have default data, and 'galaxies' and 'dark matter' arrays
        if (!this.checkPObj(world, true, false)) {
            console.error('checkWorld ERROR: default world object not valid');
            return false;
        }

        if (!util.isArray(world.dark_matter)) {
            console.warn('checkWorld WARNING: no dark matter in this universe')
        }

        if (!util.isArray(world.galaxies)) {
            console.error('checkWorld WARNING: no galaxies in this universe');
        }

        // there should be at least 1 active galaxy, with 1 active model
        let gFlag = false;
        for(let i = 0; i < world.galaxies.length; i++) {
            let g = world.galaxies[i];
            if (!this.checkPObj(g, true, true, true)) {
                console.warn('checkWorld WARNING:' + g.name + ' not complete');
            } else {
                gFlag = true;
            }

        }
        if (!gFlag) {
            console.error('checkWorld ERROR: no active galazies in world');
            return false;
        }

        // active galaxy has Stars
        // TODO:

        return true;

    };

    /*
     * ------------------------------------------------------
     * FILE SAVING
     * ------------------------------------------------------
     */

   PUtil.prototype.isValidFile = function (url) {

    if (url.length !== 0) { 

            http.open('HEAD', url, false); 
            http.send(); 

            if (http.status === 200) { 
                return true; 
            } else { 
                return false;
            }

        }

   };

   /** 
    * save a file 
    * TODO: 
    * https://github.com/eligrey/FileSaver.js
    */

    return PData;

}());
