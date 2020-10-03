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

    /**
     * Check if a string looks like a URL.
     * @param {String} str the test string
     */
    PUtil.prototype.isURL = function (str) {

        return ( /^[\w+:\/\/]/.exec( str ) != null );

    };

    PUtil.prototype.isNumber = function (value, suppress = false) {

        let v = parseFloat(value);

        if (isNaN(v)) {
            if (this.isString(value)) {
                if (value.indexOf('−') != -1) {
                    if (!suppress) console.error('isNumber ERROR: number:' + value + ' is not using correct minus symbol');
                } else {
                    if (!suppress) console.error('isNumber ERROR: bad number:' + value);
                }
            }
        }

        return (typeof v === 'number' && isFinite(v));
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

    /** 
     * Scale a color up to the top, or down to the bottom 
     * of the 0-1 color channel range used by BabylonJS
     */
    PUtil.prototype.scaleColor = function (color, up = true) {

        let num = [];
        let n = 0;

        if (this.isArray(color)) {
            num = color;
        } else if (this.isObject(color)) {
            num[0] = color.r,
            num[1] = color.g,
            num[2] = color.b;
        } else {
            console.error('clampColor ERROR: invalid color');
            return null;
        }

        for(var i = 0; i < num.length; i++) {
            if (num[i] < 0 || num[i] > 1) {
                console.error('clampColor ERROR: color value out of range');
                return null;
            }
        }

        if (up) {
            n = Math.max.apply(null, num);
            let r = (1 - n);
            console.log('--clr n:' + n + ' r:' + r)
            for(var i = 0; i < num.length; i++) {
                num[i] += r;
            }

        } else {
            n = Math.min.apply(null, num);
            let r = (1 - n);
            for(var i = 0; i < num.length; i++) {
                num[i] -= r;
            }
        }
        
        return new BABYLON.Color3(num[0], num[1], num[2]);

    };

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
     * Error reporting
     * @param {Error} error execution error
     * @param {Boolean} verbose if true
     */
    PUtil.prototype.printError = function (error, explicit, str = 'printError:') {
        console.log(`[${explicit ? str + ', Syntax Error (EXPLICIT)' : str + ', Error (INEXPLICIT)'}] ${error.name}: ${error.message}`);
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
     * parse an XML string
     */
    PUtil.prototype.asyncXML = function (url, responseFn) {
        fetch(url)
        .then(response => responseFn(data));
    }

    /** 
     * Async loop
     */
    PUtil.prototype.asyncLoop = function (iterations, execFn, callbackFn, offset = 0) {
        return new BABYLON.AsyncLoop(iterations, execFn, callbackFn, offset); //offset
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
    this.replace(/\s+/g, '');
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

    let i = start, ii = 0; 

    if (start > this.length) {
        console.error('parseNumeric ERROR: invalid start:' + start);
        return null;
    }

    for (; (this[i] < '0' || this[i] > '9') && this[i] != '.'; i++); // scan until first numeric character

    if (i == this.length) {
        return null;
    } else {
        ii = i;
        for (; (this[ii] >= '0' && this[ii] <= '9') || this[ii] == '.' || this[ii] == ','; ii++);
        if (this[ii - 1] == '.' || this[ii - 1] == ',') ii--;
    }
    if (i == ii) return null;
    let s = this.substring(i, ii);
    return {
        start1: i,
        start2: ii,
        num: s
    }

};
