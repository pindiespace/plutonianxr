/**
 * Decode stellar spectra into Star properties
 */
var PSpectrum = (function () {

    function PSpectrum () {

    };

    // default star colors, if we can't load the JSON file, by one-letter stellar type
    PSpectrum.prototype.dStarColors = {
        'W': {r:0.598529412, g: 0.683578431, b: 1},
        'O': {r:0.598529412, g: 0.683578431, b: 1},
        'A': {r:0.790196078, g: 0.839607843, b: 1},
        'B': {r:0.680490196, g: 0.759068627, b: 1},
        'F': {r:0.933382353, g: 0.930392157, b: 0.991470588},
        'G': {r:1, g: 0.925686274, b: 0.830882353},
        'K': {r:1, g: 0.836421569, b: 0.629656863},
        'M': {r:1, g: 0.755686275, b: 0.421764706},
        'N': {r:0.987654321, g: 0.746356814, b: 0.416557734},
        'R': {r:1, g: 0.868921569, b: 0.705735294},
        'C': {r:1, g: 0.828186274, b: 0.576078431},
        'S': {r:1, g: 0.755686275, b: 0.421764706},
        'D': {r:0.798823529, g: 0.834901961, b: 0.984313726},
        'L': {r:1, g:0.4235294, b:0}, // red, hot brown dwarf, lithium
        'T': {r:1, g:0.219607843, b:0}, // very red, hot brown dwarf, methane
        'Y': {r:1, g:0.3, b:0.1}, // warm, brownish, gas giant able to fuse duterium
        'P': {r: 0.4034, g: 0.27153, b: 0.1235} //  brown, a gas giant
    };

    /**
     * Yerkes prefixes in front of primary letter type, translate to primary type
     * EXAMPLE: sdB5 -> B5VI 
     */
    PSpectrum.prototype.dLumPrefixTrans = {
        'sd': 'VI',
        'd': 'V',
        'sg': 'I',
        'g': 'III',
    };

    /**
     * letter code, Primary type (based on temperature)
     * [prefix] [letter code] [numeric code 0-9] [luminosity] [suffix]
     * if numeric code is not present, assume 5
     */
    PSpectrum.prototype.dStarDesc = {
        'W': 'Wolf-Rayet star, helium-fusing, mass loss through stellar wind, expanding atmospheric envelope',
        'O': 'Blue, luminous ultra-hot supergiant',
        'A': 'Blue luminous giant',
        'B': 'White giant',
        'F': 'Yellow-white star', // giant or dwarf
        'G': 'Yellow star', // giant or dwarf
        'K': 'Yellow-orange star', // giant or dwarf
        'M': 'Red star', //giant or dwarf
        'MS':'Red giant, younger, asymptotic-giant branch carbon star',
        'N': 'Red giant, older carbon star, giant equivalent of lat K to M-type stars',
        'R': 'Red giant, carbon star equivalent of late G to early K-type stars',
        'C': 'Red giant, carbon star',
        'S': 'Red giant, asymptotic-giant-branch carbon star, zirconium oxide in spectrum',
        'SC': 'Red giant, older, asymptotic-giant branch carbon star, high carbon',
        'D': 'White dwarf', // needs sub-classification
        'L': 'Hot brown dwarf, lithium in atmosphere',
        'T': 'Cool brown dwarf, methane in atmosphere',
        'Y': 'Gas giant, warm, able to fuse deuterium',
        'P': 'Gas giant, cold, Jupiter-like'
    };

    /**
     * secondary classifications starting with 'C', greater detail
     */
    PSpectrum.prototype.dStarCarbonDesc = {
        'C-R': ', equivalent of late G to early K-type stars',
        'C-N': ', older, giant equivalent of late K to M-type stars',
        'C-J': ', cool, with a high content of carbon-13',
        'C-H': ', Population II analogues of the C-R stars',
        'C-Hd': ', Hydrogen-deficient, similar to late G supergiants with CH and C2 bands added'
    };

    /**
     * secondary classifications starting with 'W' (Wolf-Rayett), greater detail
     * {@link https://en.wikipedia.org/wiki/Wolf%E2%80%93Rayet_star}
     * Note: for WR stars, higher numbers mean lower temperatures
     */
    PSpectrum.prototype.dStarWolfRayetDesc = {
        'WR': '',
        'WC': ', strong Carbon and Helium lines, Helium absent',
        'WN': ', strong Helium and Nitrogen lines',
        'WO': ', strong Oxygen lines, weak Carbon lines',
        'WC10': ', strong Carbon lines, cool',
        'WC11': ', strong Carbon lines, coolest',
        'WN10': ', strong Nitrogen lines, cool',
        'WN11': ', strong Nitrogen lines, coolest'
    };

    /*
     * secondary classifications starting with 'D' (white dwarf), greater detail
     * [letter code][temperature numeric code (0-9)][suffix]
     */
    PSpectrum.prototype.dStarWhiteDwarfDesc = {
        'DA': ', hydrogen-rich atmosphere or outer layer, 30,000K, strong Balmer hydrogen spectral lines',
        'DB': ', helium-rich atmosphere, 15-30,000K, neutral helium, He I, spectral lines',
        'DO': ', very hot, helium-rich atmosphere, ionized helium, 45-120,000K, He II spectral lines',
        'DQ': ', carbon-rich atmosphere, < 13,000K atomic or molecular carbon lines',
        'DZ': ', cool, metal-rich atmosphere, < 11,000K, merges DG, DK, DM types',
        'DG': ', cool, metal-rich atmosphere, 6000K (old classification)',
        'DK': ', metal-rich atmosphere (old classification)',
        'DM': ', metal-rich atmosphere (old classification)',
        'DC': ', cool, no strong spectral lines, < 11,000K',
        'DX': ', spectral lines unclear',
        'DAB':', hydrogen- and helium-rich white dwarf, neutral helium lines',
        'DAO':', hydrogen- and helium-rich white dwarf displaying ionized helium lines',
        'DAZ':', hydrogen-rich metallic white dwarf',
        'DBZ':', helium-rich metallic white dwarf'
    };

    /**
     * Luminosity, Harvard classification:
     * [prefix] [letter code] [numeric code 0-9] [luminosity] [suffix]
     * {@link https://amedleyofpotpourri.blogspot.com/2019/12/stellar-classification.html}
     * {@link https://github.com/codebox/stellar-classification-parser.git}
     */
    PSpectrum.prototype.dStarLumDesc = {
        '0': ' Hypergiant',
        'Ia+': ' Hypergiant',
        'Ia': ' Highly Luminous Supergiant',
        'Iab': ' Intermediate size Luminous Supergiant',
        'Ib': ' Less Luminous Supergiant',
        'I': ' Supergiant',
        'II': ' Bright Giant',
        'IIa': ' Luminous Bright Giant',
        'IIb': ' Less Luminous Bright Giant',
        'III': ' Giant',
        'IIIa': ' Luminous Giant',
        'IIIb': ' Less Luminous Giant',
        'IV': ' Sub-Giant',
        'IVa': ' Luminous Sub-Giant',
        'IVb': ' Less Luminous Sub-Giant',
        'V' : ' Dwarf (Main Sequence)',
        'Va' : ' Luminous Dwarf (Main Sequence)',
        'Vb' : ' Less Luminous Dwarf (Main Sequence)',
        'VI' : ' Sub-Dwarf',
        'VIa' : ' Luminous Sub-Dwarf',
        'VIb' : ' Less Luminous Sub-Dwarf',
        'VII' : ' White-Dwarf',
        'VIIa' : 'Luminous White-Dwarf',
        'VIIb' : 'Less Luminous White-Dwarf'
    };

    // suffix for luminosity rather than general suffix
    PSpectrum.prototype.dLumSuffix = {
        ':' :  'Uncertain luminosity'
    };

    // suffixes associated with white dwarfs
    PSpectrum.prototype.dWhiteDwarfSuffix = {
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
    PSpectrum.prototype.dStarWolfRayetSuffix = {
        'h': 'hydrogen emission',
        'ha': 'hydrogen emission and absorption',
        'w': 'weak lines',
        's': 'strong lines',
        'b': 'broad strong lines',
        'd': 'dust (occasionally vd, pd, or ed for variable, periodic, or episodic dust'
    };

    /**
     * Suffix after prefix, letter type, luminosity
     * [prefix][letter type][numeric code 0-9][luminosity][suffix]
     * delta-del suffix:
     */
    PSpectrum.prototype.dGlobalSuffix = {
        ':' : ', uncertain values',
        '...' : ', peculiar, truncated spectra',
        '!' : ', special peculiarities',
        'delta del': ', chemically peculiar, hot main-sequence, sharp metallic absorption lines, contrasting broad (nebulous) neutral helium absorption lines.',
        'comp' : ', composite spectrum',
        '+': ', composite spectrum',
        'e' : ', emission lines present',
        '(e)': ', forbidden emission lines present',
        '[e]': ', forbidden emission lines present',
        'er': ', emission lines reversed with center of emission lines weaker than edges',
        'eq' : ', emission lines with P Cygni profile',
        'f' : ', N III and He II emission',
        'f*': ', N IV λ4058Å is stronger than the N III λ4634Å, λ4640Å, & λ4642Å line',
        'f+': ', Si IV λ4089Å & λ4116Å are emitted in addition to the N III line',
        '(f)' : ', N III emission, absence or weak absorption of He II',
        '((f))': ', He II and weak N III emission',
        'f?p': ', strong magnetic field',
        'h': ', WR stars with hydrogen emission lines',
        'ha': ', WR stars with hydrogen seen in both absorption and emission.',
        'He wk': ', weak Helium lines',
        'k': ', spectra contains interstellar absorption features',
        'm' : ', enhanced metal features',
        'n' : ', broad ("nebulous") absorption due to spinning',
        'nn' : ', very broad absorption features',
        'neb': ', a nebula spectrum is mixed in',
        'p': ', chemically peculiar star',
        'pq': ', peculiar, similar to nova spectrum',
        'q': ', P Cygni type, expanding gaseous envelope',
        's': ', narrow absorption lines',
        'ss': ', very narrow absorption lines',
        'sh': ', shell star features',
        'v': ', variable spectral feature',
        'var': ', variable spectral features',
        'w': ', weak spectral lines',
        'wl': ', weak spectral lines',
        'wk': ', weak spectral lines',
        'Sr': ', strong strontium emission lines',
        'He': ', strong Helium emission lines',
        'Eu': ', strong Europium emission lines',
        'Si': ', strong Silicon emission lines',
        'Hg': ', strong Mercury emission lines',
        'Mn': ', strong Manganese emission lines',
        'Cr': ', strong Chromium emission lines',
        'Fe': ', strong Iron emission lines',
        'K': ', strong Potassium emission lines'
    };

    //////////////////////////////////////////////////////////////////
    PSpectrum.prototype.parseYerkesPrefix = function (spect, prop, flag) {
        for (let i in this.dLumPrefixTrans) {
            let l = spect.indexOf(i);
            if(l == 0) {
                if(flag) console.log('found Yerkes prefix for:' + spect + ', ' + i)
                lum = this.dLumPrefixTrans[i];
                prop.luminance.key = this.dLumPrefixTrans[i]; // use to get desc
                return spect.substring(i.length); // swap luminace to end

            } else if(l > 0 && flag) console.log('strange Yerkes...., l:' + l)
            
        }
        return spect;
    };

    PSpectrum.prototype.parseStellarSubType = function (spect, arr, pos, prop, flag) {
        for (let i in arr) {
            let l = spect.indexOf(i);
            if (l == pos) { // extended type starts in same place
                if(flag) console.log('found stellar subtype for:' + spect + ', ' + i)
                prop.type.key2 = i; // use to get subtype desc on demand
                //prop.type.desc = this.dStarWolfRayetDesc[j];
                return spect.substring(i.length)
            } else if (l != -1 && flag) console.warn('weird subtype match at:' + l + ' for ' + i)
        }
        return spect;
    };

    PSpectrum.prototype.parseStellarType = function (spect, prop, flag) {

        for(let i in this.dStarDesc) {
            let l = spect.indexOf(i);
            if(l == 0) {
                if(flag) console.log('found stellar type for:' + spect + ', ' + i);
                    prop.type.key = i;   // type, key for description
                    prop.type.key2 = ''; // subtype, key for description
                    let arr;
                    switch(i) {
                        case 'W':
                            arr = this.dStarWolfRayetDesc;
                            spect = this.parseStellarSubType(spect, arr, l, prop, flag);
                            return spect;
                            break;
                        case 'C':
                            arr = this.dStarCarbonDesc;
                            spect = this.parseStellarSubType(spect, arr, l, prop, flag);
                            return spect;
                            break;
                        case 'D':
                            arr = this.dStarWhiteDwarfDesc;
                            spect = this.parseStellarSubType(spect, arr, l, prop, flag);
                            return spect;
                            break;
                        default:
                            return spect.substring(i.length);
                            break;
                    }

            } else if(l != -1 && flag) console.log('strange Type position...., l:' + l)

        }
        // this happens with stuff like DZ4/5
        if(flag) console.warn('funky stellar type found for:' + spect)

        return spect;
    };

    PSpectrum.prototype.parseStellarRange = function (spect, prop, flag) {
        let r = spect.parseNumeric();
        if(r) {
            prop.range.value = r.num;
            return spect.substring(r.start2);
        }

        return spect;
    };

    PSpectrum.prototype.parseStellarLuminance = function (spect, prop, flag) {
        for(let i in this.dStarLumDesc) {

        }
    };

    /**
     * Use stellar spectum (Harvard/Yerkes classification) to extract stellar data
     * {@link https://en.wikipedia.org/wiki/Stellar_classification}
     * [prefix][type code] [numeric code 0-9] [Yerkes luminosity] [suffix]
     * adds properties to the supplied 'star' object
     * in hyg3 fields
     * - lum - use luminace to compute brightness relative to sun, in the 
     * - var - variable star
     * in plutonian fields
     * extended descriptions based on type and luminance
     * @param {String} spec stellar spectrum
     */
    PSpectrum.prototype.spectrumToStellarData = function (star, props) {

        let util = this.util;

        window.star = star;
        let spect = star.spect;

        let nm =  'spectrumToStellarData WARN:' + star.id + '(' + star.proper + ')' + ' spect:' + spect;

        let end = 0; // pointer to position in string

        let result = {
            type: '', // type (O, A, B,...), key for description
            range: -1, // range (0-9)
            lum: '', // luminance (I, II, III,...), key for description
            mods: [] // modifiers (ss, sh, p, Fe), series of keys for description
        };

        let flag = false;
        // if(spect.indexOf('O') != -1) flag = true;
        if(spect.indexOf('k-m') != -1) flag = true;

        if (!spect || !star) return false;

        spect.stripWhitespace(); // remove all whitespace, augmented String prototype in util.js

        if(flag) console.log('=====\nspect:' + spect)

        // split on - or /, save as one or two (more is probably an error)

        //let spects = spect.split('-');
        let spects = spect.split(/\/|-/);

        if(spects.length > 3) {
            console.warn('spectrumToStellarData WARN: separators >2:' + spects.length + ' spect:' + spect)
        }

        // spects[0], spects[1], spects[2], spects[3]

        // find patterns and return substring missing pattern
        for(let i = 0; i < spects.length; i++) {
            spects[i] = this.parseYerkesPrefix(spects[i], props[i], flag);
            if(flag) console.log('spects['+ i + '] Yerkes parsed:[' + spects[i] + ']');
            spects[i] = this.parseStellarType(spects[i], props[i], flag);
            if(flag) console.log('spects[' + i + ']type parsed:[' + spects[i] + ']');
            spects[i] = this.parseStellarRange(spects[i], props[i], flag);
            if(flag) console.log('spects[' + i + ']type parsed:[' + spects[i] + ']');
            spects[i] = this.parseStellarLuminance(spects[i], props[i], flag);
        }

        // scan for a numeric range
        // if present, save range value
        // advance pointer to the end of the type
        // if not present, reset

        // scan for luminance
        // if present, save luminance key
        // advance pointer to end of luminance
        // if not present, reset

        // scan for multiple suffixes, using switch
        // to resolve ambiguities like 'ss' versus 's' versus 'sh'
        // advance pointer to end
        // NOTE: for 'delta del' suffix, change type to a, add 'm' suffix
        // https://en.wikipedia.org/wiki/Chemically_peculiar_star
        // https://heasarc.gsfc.nasa.gov/W3Browse/all/cpstars.html

    };

    return PSpectrum;

}());