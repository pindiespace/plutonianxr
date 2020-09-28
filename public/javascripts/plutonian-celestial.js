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
 * 
 * Stellar classification parser
 * https://github.com/codebox/stellar-classification-parser
 */

/**
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

        this.dParsecUnits      =     10; // scale parsec distances to the simulation
        this.dKmUnits          =   2370; // 1 unit = 2370km, Pluto = 2370/2370 = 1.0
        this.dMUnits           =   1000; // 1 unit = 1000 meters, Voyager 1000/1000 = 1.0
        this.dSpriteSize       =    128; // default size of sprite panel
        this.dSpriteScreenSize =      1; // default size of Star sprites
        this.dMaxHygDist       = 100000;

        // SpriteManager for Hyg3 data
        this.spriteManager     =   null;

        // SpriteManager and scene
        this.assetManager = null;
        this.starSprites = null;
        this.scene = null;
        this.camera = null;

        // computations of planetary positions over time
        this.orrey = new POrrery();

        // see if WebWorker computation is available
        if (typeof(Worker) !== "undefined") {
            console.log("LOADING WORKER....................")
            worker = new Worker('javascripts/plutonian-orrery-worker.js');
        } 

    };

    // prototype class variables

    /*
     * since we only create one pObject, we make the following arrays, some 
     * in the class, some loaded from JSON files
     * dynamically - 2x faster access than if declared as out function (static class)
     */

    // default star colors, if we can't load the JSON file, by one-letter stellar type
    PCelestial.prototype.dStarColors = {
        'w': {r:0.598529412, g: 0.683578431, b: 1},
        'o': {r:0.598529412, g: 0.683578431, b: 1},
        'a': {r:0.790196078, g: 0.839607843, b: 1},
        'b': {r:0.680490196, g: 0.759068627, b: 1},
        'f': {r:0.933382353, g: 0.930392157, b: 0.991470588},
        'g': {r:1, g: 0.925686274, b: 0.830882353},
        'k': {r:1, g: 0.836421569, b: 0.629656863},
        'm': {r:1, g: 0.755686275, b: 0.421764706},
        'n': {r:0.987654321, g: 0.746356814, b: 0.416557734},
        'r': {r:1, g: 0.868921569, b: 0.705735294},
        'c': {r:1, g: 0.828186274, b: 0.576078431},
        's': {r:1, g: 0.755686275, b: 0.421764706},
        'd': {r:0.798823529, g: 0.834901961, b: 0.984313726},
        'l': {r:1, g:0.4235294, b:0},
        't': {r:1, g:0.219607843, b:0},
        'y': {r:1, g:0.3, b:0.1}, // brownish, gas giant able to fuse duterium
        'p': {r: 0.4034, g: 0.27153, b: 0.1235} //  brown, a gas giant
    };

    /**
     * Yerkes prefixes in front of primary letter type, translate to primary type
     * EXAMPLE: sdB5 -> B5VI 
     */
    PCelestial.prototype.dLumPrefixTrans = {
        'sd' : 'VI',
        'd' : 'V',
        'sg' : 'I',
        'g' : 'III',
    };

    /**
     * letter code, Primary type (based on temperature)
     * [prefix] [letter code] [numeric code 0-9] [luminosity] [suffix]
     * if numeric code is not present, assume 5
     */
    PCelestial.prototype.dStarDesc = {
        'W': 'Wolf-Rayet star, helium-fusing, mass loss through stellar wind, expanding atmospheric envelope',
        'O': 'Blue, luminous ultra-hot supergiant',
        'A': 'Blue luminous giant',
        'B': 'White giant',
        'F': 'Yellow-white star', // giant or dwarf
        'G': 'Yellow star', // giant or dwarf
        'K': 'Yellow-orange star', // giant dwarf
        'M': 'Red star', //giant or dwarf
        'MS':'Red giant, younger, asymptotic-giant branch carbon star',
        'N': 'Red giant, older carbon star, giant equivalent of lat K to M-type stars',
        'R': 'Red giant, carbon star equivalent of late G to early K-type stars',
        'C': 'Red giant, carbon star',
        'C-R': 'Red giant, carbon star equivalent of late G to early K-type stars',
        'C-N': 'Red giant, older carbon star, giant equivalent of late K to M-type stars',
        'C-J': 'Red giant, cool carbon stars with a high content of carbon-13',
        'C-H': 'Population II analogues of the C-R stars',
        'C-Hd': 'Hydrogen-deficient carbon stars, similar to late G supergiants with CH and C2 bands added',
        'S': 'Red giant, asymptotic-giant-branch carbon star, zirconium oxide in spectrum',
        'SC': 'Red giant, older, asymptotic-giant branch carbon star, high carbon',
        'D': 'White dwarf', // needs sub-classification
        'L': 'Hot brown dwarf, lithium in atmosphere',
        'T': 'Cool brown dwarf, methane in atmosphere',
        'Y': 'Gas giant, warm, able to fuse deuterium',
        'P': 'Gas giant, cold, Jupiter-like'
    };

    /**
     * secondary classifications starting with 'W' (Wolf-Rayett), greater detail
     * {@link https://en.wikipedia.org/wiki/Wolf%E2%80%93Rayet_star}
     * Note: for WR stars, higher numbers mean lower temperatures
     */
    PCelestial.prototype.dStarWolfRayetDesc = {
        'WR':'',
        'WC':'strong Carbon and Helium lines, Helium absent',
        'WN':'strong Helium and Nitrogen lines',
        'WO':'strong Oxygen lines, weak Carbon lines',
        'WC10':'strong Carbon lines, cool',
        'WC11':'strong Carbon lines, coolest',
        'WN10':'strong Nitrogen lines, cool',
        'WN11':'strong Nitrogen lines, coolest'
    };

    /*
     * secondary classifications starting with 'D' (white dwarf), greater detail
     * [letter code][temperature numeric code (0-9)][suffix]
     */
    PCelestial.prototype.dStarWhiteDwarfDesc = {
        'DA': 'hydrogen-rich atmosphere or outer layer, strong Balmer hydrogen spectral lines',
        'DB': 'helium-rich atmosphere, neutral helium, He I, spectral lines',
        'DO': 'helium-rich atmosphere, ionized helium, He II, spectral lines',
        'DQ': 'carbon-rich atmosphere, atomic or molecular carbon lines',
        'DZ': 'metal-rich atmosphere, merges DG, DK, DM types',
        'DG': 'metal-rich atmosphere (old classification)',
        'DK': 'metal-rich atmosphere (old classification)',
        'DM': 'metal-rich atmosphere (old classification)',
        'DC': 'no strong spectral lines',
        'DX': 'spectral lines unclear',
        'DAB': 'hydrogen- and helium-rich white dwarf, neutral helium lines',
        'DAO': 'hydrogen- and helium-rich white dwarf displaying ionized helium lines',
        'DAZ': 'hydrogen-rich metallic white dwarf',
        'DBZ': 'helium-rich metallic white dwarf'
    };

    /**
     * Luminosity, Harvard classification:
     * [prefix] [letter code] [numeric code 0-9] [luminosity] [suffix]
     * {@link https://amedleyofpotpourri.blogspot.com/2019/12/stellar-classification.html}
     * {@link https://github.com/codebox/stellar-classification-parser.git}
     */
    PCelestial.prototype.dStarLumDesc = {
        '0': 'Hypergiant',
        'Ia+': 'Hypergiant',
        'Ia': 'Highly Luminous Supergiant',
        'Iab': 'Intermediate size Luminous Supergiant',
        'Ib': 'Less Luminous Supergiant',
        'I': 'Supergiant',
        'II': 'Bright Giant',
        'IIa': 'Luminous Bright Giant',
        'IIb': 'Less Luminous Bright Giant',
        'III': 'Giant',
        'IIIa': 'Luminous Giant',
        'IIIb': 'Less Luminous Giant',
        'IV': 'Sub-Giant',
        'IVa': 'Luminous Sub-Giant',
        'IVb': 'Less Luminous Sub-Giant',
        'V' : 'Dwarf (Main Sequence)',
        'Va' : 'Luminous Dwarf (Main Sequence)',
        'Vb' : 'Less Luminous Dwarf (Main Sequence)',
        'VI' : 'Sub-Dwarf',
        'VIa' : 'Luminous Sub-Dwarf',
        'VIb' : 'Less Luminous Sub-Dwarf',
        'VII' : 'White-Dwarf',
        'VIIa' : 'Luminous White-Dwarf',
        'VIIb' : 'Less Luminous White-Dwarf'
    };

    PCelestial.prototype.dWhiteDwarfSuffix = {
        ':'  : 'Uncertain spectral class',
        'P'  : 'Magnetic white dwarf with detectable polarization',
        'E'  : 'White dwarf with emission lines present',
        'H'  : 'Magnetic white dwarf without detectable polarization',
        'V'  : 'Variable white dwarf',
        'PEC': 'Peculiarities exist'
    };

    /**
     * {@link https://en.wikipedia.org/wiki/Wolf%E2%80%93Rayet_star}
     */
    PCelestial.prototype.dStarWolfRayetSuffix = {
        'h': 'hydrogen emission',
        'ha': 'hydrogen emission and absorption',
        'w': 'weak lines',
        's': 'strong lines',
        'b': 'broad strong lines',
        'd': 'dust (occasionally vd, pd, or ed for variable, periodic, or episodic dust'
    };

    /**
     * Sufix for luminosity rather than general suffix
     */
    PCelestial.prototype.dLumSuffix = {
        ':' :  'Uncertain luminosity'
    };
    
    /**
     * Suffix after prefix, letter type, luminosity
     * [prefix][letter type][numeric code 0-9][luminosity][suffix]
     */
    PCelestial.prototype.dGlobalSuffix = {
        ':' : 'Uncertain values',
        '...' : 'Undescribed peculiarities',
        '!' : 'Special peculiarities',
        'comp' : 'Composite spectrum',
        '+': 'Composite spectrum',
        'e' : 'Emission lines present',
        '(e)': 'Forbidden emission lines present',
        '[e]': 'Forbidden emission lines present',
        'er': 'Reversed, center of emission lines weaker than edges',
        'eq' : 'Emission lines with P Cygni profile',
        'f' : 'N III and He II emission',
        'f*': 'N IV λ4058Å is stronger than the N III λ4634Å, λ4640Å, & λ4642Å line',
        'f+': 'Si IV λ4089Å & λ4116Å are emitted, in addition to the N III line',
        '(f)' : 'N III emission, absence or weak absorption of He II',
        '((f))' : 'He II and weak N III emission',
        'f?p': 'Strong magnetic field',
        'h': 'WR stars with hydrogen emission lines',
        'ha': 'WR stars with hydrogen seen in both absorption and emission.',
        'He wk' : 'Weak Helium lines',
        'k': 'Spectra with interstellar absorption features',
        'm' : 'Enhanced metal features',
        'n' : 'Broad ("nebulous") absorption due to spinning',
        'nn' : 'Very broad absorption features',
        'neb': 'A nebula spectrum is mixed in',
        'p' : 'Unspecified peculiarity, chemically peculiar star',
        'pq': 'Peculiar, similar to nova spectrum',
        'q': 'P Cygni type, expanding gaseous envelope',
        's' : 'Narrow absorption lines',
        'ss': 'Very narrow absorption lines',
        'sh' : 'Shell star features',
        'v' : 'Variable spectral feature',
        'var' : 'Variable spectral features',
        'w' : 'Weak spectral lines',
        'wl' : 'Weak spectral lines',
        'wk' : 'Weak spectral lines',
        'Sr' : 'Strong strontium emission lines',
        'He' : 'Strong Helium emission lines',
        'Eu' : 'Strong Europium emission lines',
        'Si' : 'Strong Silicon emission lines',
        'Hg' : 'Strong Mercury emission lines',
        'Mn' : 'Strong Manganese emission lines',
        'Cr' : 'Strong Chromium emission lines',
        'Fe' : 'Strong Iron emission lines',
        'K'  : 'Strong Potassium emission lines'
    };

    //////////////////////////////////////////////////////////////////

    /**
     * Use stellar spectum (Harvard/Yerkes classification) to extract stellar data
     * {@link https://en.wikipedia.org/wiki/Stellar_classification}
     * [prefix] [letter code] [numeric code 0-9] [Yerkes luminosity] [suffix]
     * Prefix: translates to Yerkes luminosity
     * First letter: primary class by effective temperature
     * First number (0-9): temperature within the class
     * Yerkes luminosity: Roman Numerals and letters, also indicate 'giant' or 'dwarf'
     * Suffix: additional information about the star
     * A slash (/) means that a star is either one class or the other.
     * A dash (-) means that the star is in between the two classes.
     * @param {String} spec stellar spectrum
     */
    PCelestial.prototype.spectrumToStellarData = function (star) {

        let util = this.util;

        window.star = star;
        let spect = star.spect;

        let nm =  'spectrumToStellarData WARN:' + star.id + '(' + star.proper + ')' + ' spect:' + spect;

        let done = false; // flag for complete parsing
    
        let prefix = '', body = '', type = '', lum = '', suffix = '';
        let descType = '', descLum = '', descSuf = '';

        // find the position of the first number (range) without using a regex
        let len = spect.length;
        let p1 = spect.indexOfFirstNumber();
        range = spect[p1];

        if(p1 == 0) {
            console.warn(nm + ' invaid, only a single number');
        } 
        else if(p1 == -1) { // number not found
            prefix = spect.substring(0, len);
            range = -1;
        } 
        else { // number found
            prefix = spect.substring(0, p1);
            range = spect[p1];
            // get longer numbers, e.g. 5.5, avoiding regex, since only numbers and decimals present
            let c = p1 + 1;
            while(c < len && (spect[c] == '.') || util.isNumber(spect[c], true)) {
                range += spect[c++] + ''; // force as string addition
            }
            body = spect.substring(c, len); // suffix not defined yet

        }
        console.log('========')
        console.log('spect:' + spect + ' p:' + prefix + ' r:' + range + ' l:' + lum + ' b:' + body);

        // we now have the prefix, up to the range, and a body mixed with suffix
        // split away a Yerkes prefix
        for (let i in this.dLumPrefixTrans) {
            if(prefix.indexOf(i) != -1) {
                console.log('found luminance prefix for:' + spect + ', ' + i)
                lum = this.dLumPrefixTrans[i];
                break;
            }
        }

        // look for the type, and strip
        for (let i in this.dStarDesc) {
            if(prefix.indexOf(i) == 0) {
                type = i;
                descType = this.dStarDesc[i]; 
                console.log('found TYPE ' + i + ' in:' + spect)

                // sub-types for white dwarfs, wolf-rayet
                if (type == 'D') {
                    for (let j in this.dStarWhiteDwarfDesc) {
                        if(prefix.indexOf(j) == 0) {
                            console.log('found SUBTYPE ' + j + 'in:' + prefix);
                            type = j;
                            descType += this.dStarWhiteDwarfDesc[j];
                            prefix = prefix.substring(j.length, prefix.length);
                        }
                    }
                
                }
                else if (type == 'W') {
                    for (let j in this.dStarWolfRayetDesc) {
                        if(prefix.indexOf(j) == 0) {
                            console.log('found SUBTYPE ' + j + ' in:' + prefix)
                            type = j;
                            descType += this.dStarWolfRayetDesc[JSONCookie];
                            prefix = prefix.substring(j.length, prefix.length);
                        }

                    }

                } else {
                    prefix = prefix.substring(i.length, prefix.length);
                }

                break;
            }
        }

        console.log('type:' + type + ' prefix:' + prefix);

        // look for a luminosity
        for (let i in this.dStarLumDesc) {
            if(body.indexOf(i) == 0) {
                console.log('found LUM ' + i + ' in:' + spect)
                lum = i;
                descLum = this.dStarLumDesc[i];
                body = body.substring(0, body.length);
                break;
            }
        }


    };

    //////////////////////////////////////////////////////////////////

    // default Sprite index table for star quad image
    PCelestial.prototype.dSpriteIndex = [
        {'w': 6},
        {'o': 6}, //standard
        {'b': 5},
        {'a': 4},
        {'f': 3},
        {'g': 2},
        {'k': 1},
        {'m': 0},
        {'n': 0}, //less common
        {'r': 1},
        {'c': 1},
        {'s': 0},
        {'d': 4},
        {'y': 6}, // TODO: add
        {'p': 7}  // TODO: add
    ];

    // default absolute magnitude table}, by one-letter stellar type
    PCelestial.prototype.dAbsMag = [
        {'w': -11}, 
        {'o': -10}, // standard
        {'a':   2},
        {'b':  -2},
        {'f':   3},
        {'g':   0},
        {'k':   0},
        {'m':   6},
        {'n':   0}, // less common
        {'r':   1},
        {'c':  -1},
        {'s':   4},
        {'d':  10},
        {'y':  15},
        {'p':  18}
    ];

    // dynamically-filled prototype variables

    // holds data loaded from hyg3
    PCelestial.prototype.hygData = [];
 
    /**
     * dynamically filled, blackbody colors table
     * {@link http://www.vendian.org/mncharity/dir3/blackbody/UnstableURLs/bbr_color.html}
     */
    PCelestial.prototype.hygBBColors = [];

    // Stellar colors based on spectrum (JSON)
    PCelestial.prototype.hygColors = []; // full set, in JSON file

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
     */
    PCelestial.prototype.degToDecimalHMS = function (degrees) {
        return parseFloat(degrees) / 24;
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
     * Convert b-v (colorindex) values reported to stars to RGB color
     * @param {Number} bv the b-v value for the star.s
     * {@link https://stackoverflow.com/questions/21977786/star-b-v-color-index-to-apparent-rgb-color}
     * {@link http://www.vendian.org/mncharity/dir3/blackbody/UnstableURLs/bbr_color.html}
     * {@link https://www.pas.rochester.edu/~emamajek/EEM_dwarf_UBVIJHK_colors_Teff.txt}
     * {@link https://en.wikipedia.org/wiki/Color_index}
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
     * convert a blue-violet color index (B-V) to a temperature, table lookup
     * {@link https://stackoverflow.com/questions/21977786/star-b-v-color-index-to-apparent-rgb-color}
     * @param {Number} ci 
     */
    PCelestial.prototype.bvTableToRGB = function (ci) {
        let t1 = (4600 * (1 / (0.92 * ci + 1.7) + 1 / (0.92 * ci + 0.62)));
        return this.tempToBlackbodyColor(t1);
    };

    /**
     * compute stellar color from a temperature
     * @param {Number} temp 
     */
    PCelestial.prototype.tempToBlackbodyColor = function (temp) {
        
        let t = Math.floor(temp / 200);
        t = t * 200;
        if (t < 1000) {
          t = 1000;
        } else if (t > 29800) {
          t = 29800;
        }

        const c = this.hygBBColors[t];

    };

    /*
     * what the simulation needs to output
     * 
     * Augment the hyg object (which is like pObj.data) with
     * Description
     * computed color
     * computed size (absolute)
     * 
     * use stellar type to set...
     * computed color
     * computed size (actual radius)
     * computed sprite size
     */

    /** 
     * Given a pObj, return the correct scaling
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

            case t.ROGUE_PLANET:
                scaled.diameter /= this.dKmUnits, // planetary dimensions
                scaled.dist *= this.dParsecUnits; // stellar distances
                break;

            case t.BROWN_DWARF:
            case t.STAR:
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

        }

        // warnings for objects without data yet

        if(scaled.diameter < 0.01) {
            console.warn('.scale WARNNG: diameter very small (' + scaled.diameter + ' units for:' + data.type);
        }

        if(scaled.dist < 0.01) {
            console.warn('.scale WARNING: distance very small (' + scaled.dist + ' units for:' + data.type)
        }

        return scaled;

    };

    /**
     * TODO: make color selector that tries
     * - listed color
     * - spectral type, if present
     * TODO: use in celestial and scene alike (merge)
     * @param {PCelestial.data} data
     */
    PCelestial.prototype.color = function (data) {

        let util = this.util;

        if(!util.isObject(data)) {
            console.error('color ERROR: invalid data object passed:' + typeof data);
            return null;
        }

        let color = data.color;
        let c = null;

        if(util.isString(data.spec)) {

            let cc = getHygColor(data);
            c = new BABYLON.Color3(cc[0], cc[1], cc[2]);


        } else {
            color = data.color;
        }

        // at this point, we should have an array with 3 valid colors
        try {

            // handle web versus BabylonJS color units (fails for [1,1,1])
            if(color[0] + color[1] + color[2] > 3.0) {
                color[0] /= 255,
                color[1] /= 255,
                color[2] /= 255
            }

            if(color.length === 3) {
                c = new BABYLON.Color3(color[0], color[1], color[2]);
            }
            else if (color.length === 4) {
                c = new BABYLON.Color4(color[0], color[1], color[2], color[3]);
            }

        } catch (e) {
            console.error('color ERROR: could not make a valid color with:' + color);
        }

        return c;

    };

    PCelestial.prototype.rotate = function (data) {
        console.log("celestial.rotate TODO:")
    };

    PCelestial.prototype.rotateByQuat = function (data) {
        console.log("celestial rotatebyquat TODO:");
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

        let   c = null;
        let   s = star.spect;
        let dsc = this.dStarColors;

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
        c = dsc[s.substring(0,1).toLowerCase()];

        // if everything fails, make it white, includes 'pec' for novas
        if(!c) {
            if(s == 'pec') {
                c = dsc['a']; // probably a nova, use blue-white
            }
            else {
                //console.warn('no color for spect type:' + s)
                c = dsc['f']; // whiteish
            }

        }

        return c;

    };

    /**
     * 
     * get the sprite index to display for this type
     */
    PCelestial.prototype.getHygSpriteIndex = function (star) {
        let s = star.spect;
        if(s) {
            c = this.dSpriteIndex[s.substring(0,1).toLowerCase()];
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
     * Get the estimated size of the star (dwarf, giant, supergiant) from 
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
        return this.dAbsMag[spect];
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
     * Load rgb color versus temperature table based on blackbody calculations
     * {@link http://www.vendian.org/mncharity/dir3/blackbody/UnstableURLs/bbr_color.html}
     * @param {BABYLON.AssetsManager} assetManager 
     * @param {String} dir loaction of file
     */
    PCelestial.prototype.loadStarColorsByBlackbody = function (assetManager, dir) {

        let celestial = this;

        console.log("------------------------------");
        console.log('loading star colors by blackbody:' + dir);

        const loadBlackbody = assetManager.addTextFileTask('blackbody', dir);

        loadBlackbody.onSuccess = async function (bbColors) {
            console.log('PCELESTIAL Stellar Blackbody colors loaded, parsing data...')
            celestial.hygBBColors =  JSON.parse(bbColors.text);
        };

        loadBlackbody.onTaskError = function (task) {
            console.log('task failed', task.errorObject.message, task.errorObject.exception);
        };

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
    PCelestial.prototype.loadStarColorsBySpectrum = function (assetManager, dir) {

        let celestial = this;

        console.log("------------------------------");
        console.log('loading colors for all stellar types:' + dir)

        const loadColors = assetManager.addTextFileTask('starcolors', dir);

        loadColors.onSuccess = async function (colors) {
            console.log('PCELESTIAL Stellar colors loaded, parsing data...')
            celestial.hygColors =  JSON.parse(colors.text);
    
        };

        loadColors.onTaskError = function (task) {
            console.log('task failed', task.errorObject.message, task.errorObject.exception);
        };

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

        // if present, load stellar colors by stellar spectrum
        if(util.isString(model.colors)) {
            this.loadStarColorsBySpectrum(assetManager, dir + model.colors);
        }

        // if present, load stellar colors by ci index (temperature)
        if(util.isString(model.blackbody)) {
            this.loadStarColorsByBlackbody(assetManager, dir + model.blackbody);
        }

        // load stellar data
        this.loadStarHygData(assetManager, dir + model.hyg);

        assetManager.onProgress = function(remainingCount, totalCount, lastFinishedTask) {
                console.log('Loading Hyg database files. ' + remainingCount + ' out of ' + totalCount + ' items still need to be loaded.');
        };

        assetManager.onFinish = async function(tasks) {
            console.log('beginning compute Hyg')
            // TODO: attach to object, look for when computing, assume loads have finished
            // TODO: could put an 'await' here for JSON parsing for both...
            let mgr = await celestial.computeHygSprite(dir + 'sprite/textures/' + model.spritesheet, model.size, scene)
            .then((spriteManagerStars) => {
                console.log('Finished computing Hyg database')
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

        //for (let i = 0; i < hygData.length; i++) {
        for (let i = 0; i < 100; i++) {

            star = hygData[i];
            name = this.getHygName(star);

            //console.log("name is:" + name)
            color = this.getHygColor(star);

            // additional data from spectrum
            spec = this.spectrumToStellarData(star);

            // TODO: radius based on temperature

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

        // TODO: this might be a way to prevent 1-pixel sparkle of distant stars
        //spriteManagerStars.fogEnabled = false;

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

            // NOT DEFINED FOR SPRITE
            //sprite.cullingStrategy = BABYLON.AbstractMesh.CULLINGSTRATEGY_BOUNDINGSPHERE_ONLY;
            //sprite.freezeNormals(); // NOT IN SPRITE
            //sprite.convertToUnIndexedMesh(); // NOT IN SPRITE too few vertices to need indexing

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
            sprite.hygid = star.id;
            sprite.aMag  = setHygMag(star);

            let baseDist = 100; ///////////////////////////////////
            let baseScale = 0.2 ///////////////////////////////////

            if(star.id == "11734") { // Polaris
                window.polaris = sprite;
                sprite.size *= 100;
                sprite.lookAt = function (camera) {camera.setTarget(this.position)}
                // just changing camera.target only works in preview edition
                //sprite.lookAt = function (camera) { camera.target = this.position}
            }

            if(star.id == "7574") { // Achernar
                window.achernar = sprite;
                sprite.size *= 3;
                sprite.lookAt = function (camera) {camera.setTarget(this.position)}
            }

            if(star.id == "25583") { // AB Doradus
                window.abdor = sprite;
                sprite.size *= 10;
                sprite.lookAt = function (camera) {
                    console.log(sprite.name + " position:" + sprite.position)
                    camera.setTarget(this.position)
                    }
            }

            if(star.id == "118441") { // star behind sirius
                sprite.size = 0.001
            }

            if(star.id == "32263") { // Sirius
                window.sirius = sprite;
                sprite.size /= 2;
                sprite.lookAt = function (camera) {camera.setTarget(this.position)}
            }

            if(star.id == "27919") {  // Betelgeuse
                window.betelgeuse = sprite;
                sprite.size *= baseDist * 0.5 * baseScale;
                sprite.lookAt = function (camera) {camera.setTarget(this.position)}
            }

            if(star.id == "24378") { // Rigel
                window.rigel = sprite;
                sprite.size *= baseDist * 0.75 * baseScale;
                sprite.lookAt = function (camera) {camera.setTarget(this.position)}
            }

             // Bellatrix
            if(star.id == "25273") { // Bellatrix
                window.bellatrix = sprite;
                sprite.size *= baseDist * 0.2 * baseScale;
                sprite.lookAt = function (camera) {camera.setTarget(this.position)}
            }

             // saiph
            if(star.id == "27298") { // Saiph
                window.saiph = sprite;
                sprite.size *= baseDist * 0.5 * baseScale;
                sprite.lookAt = function (camera) {camera.setTarget(this.position)}
            }

            if(star.id == "26662") { // Alnitak, orion belt, left
                window.alnitak = sprite;
                sprite.size *= baseDist * 0.7 * baseScale;
                sprite.lookAt = function (camera) {camera.setTarget(this.position)}
                //camera.target = sprite.position;
            }
            if(star.id == "26246") { // Alnilam, orion belt, middle
                window.alnilam = sprite;
                sprite.size *= baseDist * 1.6 * baseScale;
                sprite.lookAt = function (camera) {camera.setTarget(this.position)}

            }
            if(star.id == "25865") { // Mintaka, right
                sprite.size *= baseDist * 0.7 * baseScale;
                window.mintaka = sprite;
                sprite.lookAt = function (camera) {camera.setTarget(this.position)}
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
                    if(a > 0.9) a = 1;
                    sprite.color.a = a;
                }

        }

        // update function for sprites
        // note: this is NOT a bottleneck for rendering at present!
        scene.registerBeforeRender(() => {
            let dx = pos.x - oPos.x,
            dy = pos.y - oPos.y,
            dz = pos.z - oPos.z;

            // note preview verson has .children as an alias to .sprites

            if((dx + dy + dz) != 0) {
                for(let i = 0; i < hygData.length; i++) {
                    update(spriteManagerStars.sprites[i], camera);
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