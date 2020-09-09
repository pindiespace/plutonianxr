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
     * Error reporting
     * @param {Error} error execution error
     * @param {Boolean} verbose if true
     */
    PUtil.prototype.printError = function (error, explicit) {
        console.log(`[${explicit ? 'Syntax Error (EXPLICIT)' : 'Error (INEXPLICIT)'}] ${error.name}: ${error.message}`);
    };

    /**
     Performance for a particular function
     * @link {https://developer.mozilla.org/en-US/docs/Web/API/Performance/now}
     */
    PUtil.prototype.checkPerformance = function (fn, iterations) {
        const t0 = performance.now();
        fn();
        const t1 = performance.now();
        console.log(`Call to doSomething took ${t1 - t0} milliseconds.`);
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

