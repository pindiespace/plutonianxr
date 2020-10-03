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
        this.EMPTY        = '';
        this.ZERO         =  0;
        this.FALSE        = false;
        this.TRUE         = true;
        this.NAN          = NaN;
        this.UNKNOWN      = 'unknown';

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
     * create a PSpectrum property object, also used by PCelestial 
     */
    PData.prototype.createPSpectrum = function (spect) {
        return {
            spect: '', // spectra string
            type: { // type (O, A, B,...)
                key: this.EMPTY, // key for description (values in PSpectrum)
                key2: this.EMPTY, // subtype (white dwarf, wolf-rayet)
                con: this.ZERO
            },
            range: { // range (0-9)
                key: this.EMPTY, // no key in almost all cases
                value: this.NAN,  // value (in spectrum string)
                con: this.ZERO
            },
            luminance: { // luminance (I, II, III,...)
                key: this.EMPTY,  // key for description (values in PSpectrum, star/Sun)
                value: this.NAN,   // value (estimated from luminance key)
                con: this.ZERO
            },
            mass: {
                value: this.NAN,
                con: this.ZERO
            },   // mass ratio, to the Sun
            radius: {
                value: this.NaN,
                flatten: this.NAN,
                con: this.ZERO
            }, // radius ratio, to the Sun
            rotation: {
                value: this.NAN,
                con: this.ZERO
            },
            temp: {
                value: this.NAN,
                con: this.ZERO
            },   // temperature (kelvin)
            ci: {
                value: this.EMPTY,
                con: this.ZERO
            },     // color index b-v
            color: {
                r:0,
                g:0,
                b:0
            },     // color
            absmag: {
                value: this.NAN,
                con: this.ZERO
            }, //absolute magnitude
            var: {
                lum1: this.NAN,
                lum2: this.NAN,
                period: this.NAN,
                con: this.ZERO
            },
            age: {
                value: this.NAN,
                con: this.ZERO
            },
            //TODO: rotation: this.NAN 
            mods: []          // modifiers (ss, sh, p, Fe), series of keys (values in PSpectrum)
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
     * HYG3 database object ( used by PCelestial)
     * ------------------------------------------------------
     */

    PData.prototype.checkHygObj = function(hygObj) {
        return true;
    };

    /** 
     * Build a HygObj based on Hyg3 database fields. 
     * - If nothing is passed, build an empty object.
     * - Otherwise, add any needed fields
     */
    PData.prototype.cloneHygObj = function (hygObj = {}) {

    // required fields
    if (!hygObj.id) hygObj.id = this.hygObj_ERROR;
    if (!hygObj.proper) hygObj.proper = this.EMPTY;
    if (!hygObj.ra) hygObj.ra = 0;
    if (!hygObj.dec) hygObj.dec = 0;
    if (!hygObj.dist) hygObj.dist = 0;
    if (!hygObj.mag) hygObj.mag = 0;
    if (!hygObj.absmag) hygObj.absmag = 0;
    if (!hygObj.spect) hygObj.spect = this.EMPTYs;
    if (!hygObj.x) hygObj.x = 0;
    if (!hygObj.y) hygObj.y = 0;
    if (!hygObj.z) hygObj.z = 0;
    if (!hygObj.con) hygObj.con = this.EMPTY;

    // multiple star
    if (!hygObj.comp) hygObj.comp = this.EMPTY;
    if (!hygObj.comp_primary) hygObj.comp_primary = this.EMPTY;
    if (!hygObj.base) hygObj.base = this.EMPTY;

    //if (!hygObj.lum) hygObj.lum = 1;
    //if (!hygObj.var) hygObj.var = this.EMPTY;
    //if (!hygObj.var_min) = 1;
    //if (!hygObj.var_max) = 1;

    };

    /**
     * Given a hyg data-like object, convert to a pObj
     */
    PData.prototype.hygToPObj = function () {
        
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

    return PData;

}());
