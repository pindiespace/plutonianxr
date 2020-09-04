/* 
 * Utility methods
 */

 // File available to browser (NOT NodeJS check)
function isValidFile (url) { 
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
function isObject (value) {
    //return ((value && typeof value === 'object') && (value.constructor === Object));
    return (typeof value === 'object' && !Array.isArray(value) && value !== null);
};

function isBoolean (value) {
    return value === true || value === false || toString.call(value) === '[object Boolean]';
};

function isNull (value) {
    return value === null;
};

function isUndefined (value) {
    return typeof value === 'undefined';
};


/**
 * Return radians for (fractional) degrees.
 * @param {Number} n the number, in degrees (0-360).
 * @returns {Number} return the same number, in radians (0-2PI).
 */
function degToRad( deg ) {
    return parseFloat( deg ) * Math.PI / 180;
};

/** 
 * Returns radians for (fractional) degress.
 * @param {Number} rad
 */
function radToDeg ( rad ) {
    return parseFloat( rad ) * 180 / Math.PI;
}

/**
 * Returns 0-360 degrees for a 24-hour clock, optionally
 * accurate for minutes and seconds.
 */
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

  // performance
  // https://www.digitalocean.com/community/tutorials/js-js-performance-api

