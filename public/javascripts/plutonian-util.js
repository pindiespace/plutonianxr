/* 
 * Utility methods
 * We hand-build our classes similar to TypeScript compiles
 */
var PUtil = (function () {

   //constructor

   function PUtil (engine) {

        this.engine = engine;       // assign class variables

        // isArray polyfill
        if (typeof Array.isArray === 'undefined') {
            Array.isArray = function(obj) {
                return Object.prototype.toString.call(obj) === '[object Array]';
            }
        };
   };
	
   //functions

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

    PUtil.prototype.isString = function (value) {
        return typeof value === 'string' || value instanceof String;
    };

    PUtil.prototype.isNumber = function (value) {
        value = parseFloat(value);
        return typeof value === 'number' && isFinite(value);
    };

    // NOTE: Array.isArray() is already defined in modern browsers
    PUtil.prototype.isArray = function (value) {
        return Array.isArray(value);
    };

    // NOTE: we don't count arrays as objects
    PUtil.prototype.isObject = function (value) {
        //return ((value && typeof value === 'object') && (value.constructor === Object));
        return (typeof value === 'object' && !Array.isArray(value) && value !== null);
    };

    PUtil.prototype.isBoolean = function (value) {
        return value === true || value === false || toString.call(value) === '[object Boolean]';
    };

    PUtil.prototype.isNull = function (value) {
        return value === null;
    };

    PUtil.prototype.isUndefined = function (value) {
        return typeof value === 'undefined';
    };

    /**
    * Return radians for (fractional) degrees.
    * @param {Number} n the number, in degrees (0-360).
    * @returns {Number} return the same number, in radians (0-2PI).
    */
    PUtil.prototype.degToRad = function (deg = 0) {
        return parseFloat(deg) * Math.PI / 180;
    };

    /** 
    * Returns radians for (fractional) degress.
    * @param {Number} rad
    */
    PUtil.prototype.radToDeg = function (rad = 0) {
        return parseFloat(rad) * 180 / Math.PI;
    };

    /**
    * Returns 0-360 degrees for a 24-hour clock, optionally
    * accurate for minutes and seconds.
    */
    PUtil.prototype.hmsToDeg = function (hours = 0, minutes = 0, seconds = 0) {

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
     * Error reporting
     * @param {Error} error execution error
     * @param {Boolean} verbose if true
     */
    PUtil.prototype.printError = function (error, explicit) {
        console.log(`[${explicit ? 'Syntax Error (EXPLICIT)' : 'Error (INEXPLICIT)'}] ${error.name}: ${error.message}`);
    };

    /**
     * mock lags and delays
     */
    PUtil.prototype.sleep = function (ms) {
        return new Promise(resolve => setTimeout(resolve, ms))
    };

    /**
     * Make JSON loading and parsing async (by using the Fetch API)
     * @param {String} url the web address or file location of the JSON text
     * @param {Function} responseFn the function for processing the parsed JSON object
     */
    PUtil.prototype.asyncJSON = function (url, responseFn) {
        fetch(url)
        .then(response => response.json())
        .then(data => responseFn(data));
    };

    /** 
     * Async loop
     */
    PUtil.prototype.asyncLoop = function (iterations, execFn, callbackFn, offset = 0) {
        return new BABYLON.AsyncLoop(iterations, execFn, callbackFn, offset); //offset
    };

   return PUtil;

}());

// Check types
// https://2ality.com/2020/01/typing-objects-typescript.html

function isString (value) {
    return typeof value === 'string' || value instanceof String;
};

function isNumber (value) {
    value = parseFloat(value);
    return typeof value === 'number' && isFinite(value);
};

// NOTE: Array.isArray() is already defined in modern browsers

// NOTE: we don't count arrays as objects
//function isObject (value) {
//    //return ((value && typeof value === 'object') && (value.constructor === Object));
//    return (typeof value === 'object' && !Array.isArray(value) && value !== null);
//};

//function isBoolean (value) {
//    return value === true || value === false || toString.call(value) === '[object Boolean]';
//};

//function isNull (value) {
//    return value === null;
//};

///function isUndefined (value) {
//    return typeof value === 'undefined';
//};

/**
 * Return radians for (fractional) degrees.
 * @param {Number} n the number, in degrees (0-360).
 * @returns {Number} return the same number, in radians (0-2PI).
 */
////function degToRad( deg ) {
//    return parseFloat( deg ) * Math.PI / 180;
//};

/** 
 * Returns radians for (fractional) degress.
 * @param {Number} rad
 */
//function radToDeg ( rad ) {
//    return parseFloat( rad ) * 180 / Math.PI;
//}

/**
 * Returns 0-360 degrees for a 24-hour clock, optionally
 * accurate for minutes and seconds.
 */
/*
function hmsToDeg ( hours = 0, minutes = 0, seconds = 0 ) {

        let deg = 0;

        hours = parseFloat( hours ); // force to number
        minutes = parseFloat( minutes );
        seconds = parseFloat( seconds );

        if ( hours ) hours *= ( 360 / 24 );
        if ( minutes ) minutes *= ( 360 / 1440 ); // convert to fractional hours
        if ( seconds ) seconds *= ( 360 / 86400 );

        return ( hours + minutes + seconds );

};
*/

// augment String

String.prototype.stripLeft = function (charlist) {
    if (charlist === undefined) charlist = "\s";
    return this.replace(new RegExp("^[" + charlist + "]+"), "");
  };

  String.prototype.stripRight = function (charlist) {
    if (charlist === undefined) charlist = "\s";
    return this.replace(new RegExp("[" + charlist + "]+$"), "");
  };

  String.prototype.strip = function (charlist) {
    return this.trimLeft(charlist).trimRight(charlist);
  };

// Errors

//var printError = function(error, explicit) {
//    console.log(`[${explicit ? 'JSON Syntax Error (EXPLICIT)' : 'JSON Error (INEXPLICIT)'}] ${error.name}: ${error.message}`);
//}

