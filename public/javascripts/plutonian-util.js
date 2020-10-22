/* 
 * Utility methods
 * We hand-build our classes similar to TypeScript compiles
 */
'use strict'
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

    /**
     * return the engine
     */
    PUtil.prototype.getEngine = function () {
       return this.engine;
    };

    //functions

    /*
     * ------------------------------------------------------
     * DATA TYPE VALIDATION
     * ------------------------------------------------------
     */

    PUtil.prototype.isString = function (value) {
        return (typeof value === 'string' || value instanceof String);
    };

    /**
     * Check if a string looks like a URL.
     * @param {String} str the test string
     */
    PUtil.prototype.isURL = function (str) {
        return ( /^[\w+:\/\/]/.exec( str ) != null );
    };

    /** 
     * check if string is a computable number
     */
    PUtil.prototype.isNumber = function (value, suppress = false) {

        let v = parseFloat(value);

        if (isNaN(v)) {
            if (this.isString(value)) {
                if (value.indexOf('−') != -1) {
                    if (!suppress) console.error('isNumber ERROR: number:(' + value + ') is not using correct minus symbol');
                } else {
                    if (!suppress) console.error('isNumber ERROR: bad number:(' + value + ')');
                }
            }
        }

        return (typeof v === 'number' && isFinite(v));
    };

    /**
     * NOTE: Array.isArray() is already defined in modern browsers
     */ 
    PUtil.prototype.isArray = function (value) {
        return Array.isArray(value);
    };

    /**
     * NOTE: we don't count arrays as objects
     */ 
    PUtil.prototype.isObject = function (value) {
        //return ((value && typeof value === 'object') && (value.constructor === Object));
        return (typeof value === 'object' && !Array.isArray(value) && value !== null);
    };

    /**
     * Boolean test
     */
    PUtil.prototype.isBoolean = function (value) {
        return value === true || value === false || toString.call(value) === '[object Boolean]';
    };

    /**
     * NULL test
     */
    PUtil.prototype.isNull = function (value) {
        return value === null;
    };

    /**
     * Undefined test
     */
    PUtil.prototype.isUndefined = function (value) {
        return typeof value === 'undefined';
    };

    /** 
     * Check if a number is even.
     * @param {Number} n the variable to be tested.
     * @returns {Boolean} if even, return true, else false.
     */
    PUtil.prototype.isEven = function (n) {
        return parseInt( n ) % 2 == 0;
    };

    /** 
     * Check if a number is odd.
     * @param {Number} n the variable to be tested.
     * @returns {Boolean} if odd, return true, else false.
     */
    PUtil.prototype.isOdd = function (n) {
        return Math.abs( parseInt( n ) % 2 ) == 1;
    };

    /**
     * Check if a string is all numeric symbols (not an actual test for computable number)
     * @param {String} ch 
     */
    PUtil.prototype.isNumeric = function (ch) {
        let len = ch.length;
        if (!len) return false;
        let k = ch.charCodeAt(0);
        if (ch.charCodeAt(0) < 48 || ch.charCodeAt(0) > 57) return false; // ',33'
        for(let i = 1; i < len; i++) {
            k = ch.charCodeAt(i);
            if ((k < 48 && k != 46 && k != 44) || k > 57) return false;
        }
        return true;
    };

    /**
     * check if a character string is all lowercase
     * @param {String} ch 
     */
    PUtil.prototype.isUpperCase = function (ch) {
        let len = ch.length;
        if (!len) return false;
        let k = ch.charCodeAt(0);
        if (k < 65 || k > 90) return false;
        for(let i = 1; i < len; i++) {
            k = ch.charCodeAt(i);
            if (k < 65 || k > 90) return false;
        }
        return true;
    };

    /**
     * check if a character string is all lowercase
     * @param {String} ch 
     */
    PUtil.prototype.isLowerCase = function (ch) {
        let len = ch.length;
        if (!len) return false;
        let k = ch.charCodeAt(0);
        if (k < 97 || k >= 122) return false;
        for(let i = 1; i < len; i++) {
            let k = ch.charCodeAt(i);
            if (k < 97 || k >= 122) return false;
        }
        return true;
    };

    /**
     * check if WebWorkers are supported
     */
    PUtil.prototype.hasWorker = function () {
        return (typeof(Worker) !== 'undefined');
    };

    /*
     * ------------------------------------------------------
     * OBJECT MANIPULATION
     * ------------------------------------------------------
     */

    /** 
     * Number of keys in an associative array or object.
     * NOTE: won't work on old browsers, but we should never get here.
     * @param {Object} obj a JS Object.
     * @returns {Number} the number of keys.
     */
    PUtil.prototype.numKeys = function (obj) {
        if ( this.isObject(obj)) {
            return Object.keys(obj).length;
        }
        return 0;
    };

    /** 
     * Given an associative arry of Number values, sort by those values, 
     * and returns the keys. Used to sort Obj file groups, obj, and material 
     * starts by their start positions in the overall arrays.
     * @param {Object} obj the associative array. Values MUST be numbers.
     * @returns {Array} a set of keys, sorted in order.
     */
    PUtil.prototype.getSortedKeys = function (obj) {
        let keys = Object.keys(obj);
        return keys.sort(function(a, b) { return obj[b] - obj[a]});
    };

    PUtil.prototype.getMaxValueOfArray = function (numArray) {
        return Math.max.apply(null, numArray);
    };

    PUtil.prototype.getMinValueOfArray = function (numArray) {
        return Math.min.apply(null, numArray);
    };

    PUtil.prototype.getIndexOfMaxValueOfArray = function (numArray) {
        return numArray.reduce((iMax, x, i, arr) => x > arr[iMax] ? i : iMax, 0);
    };

    PUtil.prototype.getIndexOfMinValueOfArray = function (numArray) {
        return numArray.reduce((iMax, x, i, arr) => x < arr[iMax] ? i : iMax, 0);
    };

    /**
     * Given an object, loop through all the object's keys. Assume 
     * they have numeric values. 
     * { 'a': 5, 'b': 22, 'c': -60}
     * If so, compare to num. 
     * Return the key with the closest value, along with difference. 
     * Don't use for long lists (should use binary search instead)
     * @param {Object} obj object with key:numeric value list
     * @param {Number} num the number to be matched
     * @param {Number} diff the starting difference, set very large by default
     */
    PUtil.prototype.getKeyForClosestNumericValue = function (obj, num, diff = 1E+14) {
        let oldDiff = diff, val = diff, max = -diff, min = diff, k;
        for (var i in obj) {

            let v = obj[i];
            if (!this.isNumber(v)) {
                console.error('getKeyForClosestNumericValue ERROR: non-numeric value passed');
                return null;
            }
            // compute the difference between supplied num, table entry
            diff = Math.abs(num - v);
            if (diff < oldDiff) {
                oldDiff = diff,
                val = v,
                k = i; // store the key
            }

            // store the max and min of the table when the closest match is outside the range
            if (v > max) max = v;
            if (v < min) min = v;

        }

        // TODO: integrate into luminosity lookup

        return {
            key: k,
            num: num,
            val: val,
            diff: diff,
            max: max,
            min: min
        }
    };

    /*
     * ------------------------------------------------------
     * ASSET IDS
     * ------------------------------------------------------
     */

    /** 
     * Random seed.
     * process between min and max. Number could be 0-10^9
     */
    PUtil.prototype.getSeed = function () {

        let number;

        try {

            // If the client supports the more secure crypto lib
            if ( Uint32Array && window.crypto && window.crypto.getRandomValues ) {

                let numbers = new Uint32Array( 1 );
                window.crypto.getRandomValues( numbers );
                number = numbers.length ? ( numbers[0] + '' ) : null;

            }

        } catch(e) {

        } finally {

            if ( ! number ) {
                number = Math.floor( Math.random() * 1e9 ).toString() + ( new Date().getTime() );
            }

        }

        return number;

    };

    /** 
     * Get an unique object id.
     * @link https://jsfiddle.net/briguy37/2MVFd/
     * @returns {String} a unique UUID format id.
     */
    PUtil.prototype.computeId = function () {

        let d = new Date().getTime();

        let uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace( /[xy]/g, function( c ) {

            let r = (d + Math.random() * 16 ) % 16 | 0;
            d = Math.floor( d / 16 );
            return ( c == 'x' ? r : ( r&0x3|0x8 ) ).toString( 16 );

        });

        return uuid;

    };

    /*
     * ------------------------------------------------------
     * TESTING BROWSER, WINDOW, CANVAS FEATURES
     * ------------------------------------------------------
     */

    /** 
     * Get the width of the entire screen (excluding OS taskbars)
     * @link http://ryanve.com/lab/dimensions/
     */
    PUtil.prototype.getScreenWidth = function () {
        return window.screen.width;
    };

    /** 
     * Get the height of the entire screen (excluding OS taskbars)
     */
    PUtil.prototype.getScreenHeight = function () {
        return window.screen.height;
    };

    /** 
     * get the width of the content region of the browser window.
     */
    PUtil.prototype.getWindowWidth = function () {
        return window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
    };

    /** 
     * get the height of the content region of the browser window.
     */
    PUtil.prototype.getWindowHeight = function ()  {
        return window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
    };

    /**
     * get the maximum texture dimension for WebGL on this system
     * @param {BABYLON.Scene} scene
     */
    PUtil.prototype.getMaxTextureSize = function (scene) {    
        // check texture sizes to figure out what sprites are safe to load
        if (scene) {
            let gl = scene.getEngine()._gl;
            if (gl) {
                return gl.getParameter(gl.MAX_TEXTURE_SIZE);
            }
        }
        return 2048; // lowest value for modern videocards
    };

    /**
     Performance for a particular function
     * @link {https://developer.mozilla.org/en-US/docs/Web/API/Performance/now}
     * @link {https://www.digitalocean.com/community/tutorials/js-js-performance-api}
     */
    PUtil.prototype.checkPerformance = function (fn, iterations) {
        const t0 = performance.now();
        fn();
        const t1 = performance.now();
        console.log(`Call to doSomething took ${t1 - t0} milliseconds.`);
    };

    /**
     * mock lags and delays
     * NOTE: call from an async function with 'await'
     */
    PUtil.prototype.sleep = function (ms) {
        return new Promise(resolve => setTimeout(resolve, ms))
    };

    /*
     * ------------------------------------------------------
     * ASYNC LOADING NETWORK RESOURCES
     * ------------------------------------------------------
     */

    /**
     * Make JSON loading and parsing async (by using the Fetch API)
     * @param {String} url the web address or file location of the JSON text
     * @param {Function} responseFn the function for processing the parsed JSON object
     */
    PUtil.prototype.asyncJSON = function (url, responseFn, debug = false) {
        fetch(url)
        .then((response) => { 
            return response.json();
        })
        .then(data => responseFn(data))
        .catch (e => {
            console.warn('failed to get JSON for url:');
            console.warn(url);
        })
    };

    /**
     * Load and parse XML async
     */
    PUtil.prototype.asyncXML = function (url, responseFn, debug = false) {
        fetch(url)
        .then((res) => {
            if (debug) {
                console.log('asyncXML URL:' + res.url);
                console.log('content-type:' + res.headers.get('content-type'));
                console.log('type:' + res.type)
                console.log('expires:' + res.headers.get('expires'));
                console.log('status:' + res.ok);
                console.log('statusText:' + res.statusText);
            }
            if(res.statusText == 'OK') {
                let parser = new DOMParser();
                let xmlDoc = parser.parseFromString(res.text(), 'text/xml');
                responseFn(xmlDoc);
            }

        });

    };

    /** 
     * Async loop
     */
    PUtil.prototype.asyncLoop = function (iterations, execFn, callbackFn, offset = 0) {
        return new BABYLON.AsyncLoop(iterations, execFn, callbackFn, offset); //offset
    };

    /*
     * ------------------------------------------------------
     * ERROR REPORTING
     * ------------------------------------------------------
     */

    /**
     * Error reporting
     * @param {Error} error execution error
     * @param {Boolean} verbose if true
     */
    PUtil.prototype.printError = function (error, explicit, str = 'printError:') {
        console.log(`[${explicit ? str + ', Syntax Error (EXPLICIT)' : str + ', Error (INEXPLICIT)'}] ${error.name}: ${error.message}`);
    };

   return PUtil;

}());

/**
 * strip characters from the left side of a String
 * @param {String} charlist list of characters to strip
 */
String.prototype.stripLeft = function (charlist) {
    if (charlist === undefined) charlist = "\s";
    return this.replace(new RegExp("^[" + charlist + "]+"), "");
};

/**
 * strip characters from the right side of a String
 * @param {String} charlist list of characters to strip
 */
String.prototype.stripRight = function (charlist) {
    if (charlist === undefined) charlist = "\s";
        return this.replace(new RegExp("[" + charlist + "]+$"), "");
};

/**
 * trim characters from both sides of string
 * @param {String} charlist list of characters to strip
 */
String.prototype.strip = function (charlist) {
    return this.trimLeft(charlist).trimRight(charlist);
};

/**
 * @param {String} str the string to strip whitespace from
 * remove all whitespace fro a string
 */
String.prototype.stripWhitespace = function () {
    return this.replace(/\s+/g, '');
};

// These methods speed up the operation of non-regex string parsing

/**
 * specific for parsing some strings (e.g. stellar types)
 * - Find the first numeric string
 * - return string start
 * - optional start beyond position = 0 in the string
 * @param {Number} start optional start in interior of string
 */
String.prototype.parseNumeric = function (start = 0) {

    let i = start, ii = 0, cc = 0, cd = 0; 

    if (start > this.length) {
        console.error('parseNumeric ERROR: invalid start:' + start);
        return null;
    }

    // scan until first numeric character
    for (; this[i] < '0' || this[i] > '9'; i++); 
    if (i == this.length) return null;

    // start grab at 1st numeric character
    ii = i; let j = '';
    // loop through 0-9, '.' and ','
    for (; j=this[ii], (ii <= this.length) && ((j >= '0' && j <= '9') || j == '.' || j == ','); ii++) {
        if(j == '.' && (this[ii - 1] < '0' || j > '9')) {ii--; break;}
        if(j == ',' && (this[ii - 1] < '0' || j > '9')) {ii--; break;}
        if(cd > 1) {break;}
        if(cc > 1) {break;}
        if(j == '.') cd++;
        if(j == ',') cc++;
    }
    // decrement to remove trailing decimals and commas
    if(this[ii-1] == '.' || this[ii-1] == ',') ii--;

    let s = this.substring(i, ii);
    return {
        start1: i,
        start2: ii,
        num: s
    };

};