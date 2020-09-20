/**
  * Plutonian Data manipulation
  * - defines datatypes for world and Hyg3 database entries
  */
'use strict'
var PData = (function () {

    function PData (util) {

        this.util = util;

        this.pObj_ERROR = -1;
        this.hygObj_ERROR = -1;
        this.EMPTY = '';
        this.UNKNOWN = 'unknown';

    };

    // information model
    PData.prototype.PCTYPES = {
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

    PData.prototype.checkWorld = function(world) {

        return true;

    };

    /**
     * check an existing pObj for valid entries
     */
    PData.prototype.checkPObj = function (pObj, checkData = true, checkModels = true) {

        let util = this.util;

        if(!util.isObject(pObj)) {
            console.error('checkPObj ERROR: not a valid object');
            return false;
        }

        if(!util.isString(pObj.key)) {
            console.error('checkPObj ERROR: key missing');
            return false;
        }

        if(!util.isString(pObj.dname)) {
            console.error('checkPObj ERROR:' + pObj.name + ' missing data directory');
            return false;
        }

        if(!util.isString(pObj.name)) {
            console.warn('checkPObj WARNING: name missing');
        }

        // optionally check the data object
        if(checkData == true) {
            return this.checkData(pObj.data, pObj.name, checkModels);
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
        if(!pObj.key) pObj.key = this.EMPTY;
        if(!pObj.dname) pObj.dname = this.EMPTY;
        if(!pObj.name) pObj.name =  this.EMPTY;
        if(!pObj.description) pObj.description = this.EMPTY;
        if(!pObj.references) pObj.references = [];

        if(!pObj.data) {
            pObj.data = this.cloneData();
            //pObj.data = {};
        }
        else {
            //NOTE: don't used returned object
            //this.cloneData(pObj.data);
            let d = pObj.data;
            if(!d.type) d.type = this.UNKNOWN;
            if(!d.diameter) d.diameter = 0;
            if(!d.ra) d.ra = 0;
            if(!d.dec) d.dec = 0;
            if(!d.dist) d.dist = 0;
            if(!d.tilt) d.tilt = 0;
            if(!d.rotation) d.rotation = 0;
            if(!d.color) d.color = [1, 1, 1, 1];

        }

        return Object.assign({}, pObj);

    };

    /**
     * Check data associated with a world object
     */
    PData.prototype.checkData = function(data, name, checkModels = true) {

        let util = this.util;
        let t = this.PCTYPES;

        if(!util.isObject(data)) {
            console.error('checkData ERROR: no data object');
            return false;
        }

        if(!util.isNumber(data.x)) {
            if(!util.isNumber(data.ra) || !util.isNumber(data.dec) || !util.isNumber(data.dist)) {
                console.error('checkData ERROR: missing or invalid for ra:' + data.ra + ' dec:' + data.dec + ' dist:' + data.dist + ' information');
                return false;
            }
        } else {
            if(!util.isData(data.y) || !util.isData(data.z)) {
                console.error('checkData ERROR: missing both ra, dec and xyz data');
                return false;
            }
        }

        if(checkModels == true) {
            return this.checkModel(data.models);
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
        if(!d.type) d.type = this.UNKNOWN;
        if(!d.diameter) d.diameter = 0;
        if(!d.ra) d.ra = 0;
        if(!d.dec) d.dec = 0;
        if(!d.dist) d.dist = 0;
        if(!d.tilt) d.tilt = 0;
        if(!d.rotation) d.rotation = 0;
        if(!d.color) d.color = [1, 1, 1, 0.5];

        return Object.assign({}, d);

    };

    PData.prototype.checkModel = function (models, name) {

        let util = this.util;

        if(!util.isObject(models)) {
            console.error('checkData ERROR: missing model object');
            return false;
        }

        if(!util.isObject(models.default)) {
            console.error('checkData ERROR: no default model');
            return false;
        }

        // TODO: could do more checking of model parameters

        return true;

    };

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
    if(!hygObj.id) hygObj.id = this.hygObj_ERROR;
    if(!hygObj.proper) hygObj.proper = this.EMPTY;
    if(!hygObj.ra) hygObj.ra = 0;
    if(!hygObj.dec) hygObj.dec = 0;
    if(!hygObj.dist) hygObj.dist = 0;
    if(!hygObj.mag) hygObj.mag = 0;
    if(!hygObj.absmag) hygObj.absmag = 0;
    if(!hygObj.spect) hygObj.spect = this.EMPTYs;
    if(!hygObj.x) hygObj.x = 0;
    if(!hygObj.y) hygObj.y = 0;
    if(!hygObj.z) hygObj.z = 0;
    if(!hygObj.con) hygObj.con = this.EMPTY;

    // multiple star
    if(!hygObj.comp) hygObj.comp = this.EMPTY;
    if(!hygObj.comp_primary) hygObj.comp_primary = this.EMPTY;
    if(!hygObj.base) hygObj.base = this.EMPTY;

    //if(!hygObj.lum) hygObj.lum = 1;
    //if(!hygObj.var) hygObj.var = this.EMPTY;
    //if(!hygObj.var_min) = 1;
    //if(!hygObj.var_max) = 1;

    };


    return PData;
}());
