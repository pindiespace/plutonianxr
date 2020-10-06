/**
 * Decode stellar spectra into Star properties, WITHOUT using regex, 
 * which is slow on browsers which don't cache regex.
 * 
 * Parsed type has keys relating to descriptions of the properties, along with 
 * computed properties
 *
 * Referencing (cross-reference)
 * @link {https://www.pas.rochester.edu/~emamajek/EEM_dwarf_UBVIJHK_colors_Teff.txt}
 * @link {http://www.vendian.org/mncharity/dir3/starcolor/details.html}
 * @link {https://sites.uni.edu/morgans/astro/course/Notes/section2/spectraltemps.html}
 * @link {https://en.wikipedia.org/wiki/List_of_star_systems_within_25%E2%80%9330_light-years}
 * @link {http://www.livingfuture.cz/stars.php}
 * @link {http://www.vendian.org/mncharity/dir3/blackbody/UnstableURLs/bbr_color.html}
 */
var PSpectrum = (function () {

    function PSpectrum (util, pdata) {

        this.util = util;
        this.pdata = pdata;

        // TODO: remove
        this.counter1 = 0;
        this.counter2 = 0; // FOR DEBUGGING

    };

    /**
     * many properties are expressed as multiples of the Sun
     */
    PSpectrum.prototype.SOL = {
        mass: 1,
        radius: 1,
        radiusKm: 695700,
        lumWatts: 3.828E26,
        absmag: 4.83,
        temp: 5778, // kelvins
        metallicity: 1.0
    };

    /**
     * exoplanet mass often express of mass ratio to Jupiter
     */
    PSpectrum.prototype.JUPITER = {
        mEarth: 317.646185839028
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
     * replace some patterns in the spectrum string for easier parsing
     */
    PSpectrum.prototype.dSpectrumTrans = {
        'Ia-0': 'Ia0',
        'Ia-0/Ia': 'Ia0-Ia',
        'Ia-ab': 'Ia/Iab',
        'Ia/ab': 'Ia-Iab',
        'IVb': 'Iva/V',
        'Vb': 'V-VI',
        'III/III-IV': 'III/IV' // small difference
    }

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
        'N': 'Red giant, older carbon star, giant equivalent of lat K to M-type stars',
        'R': 'Red giant, carbon star equivalent of late G to early K-type stars',
        'C': 'Red giant, carbon star',
        'S': 'Red giant, asymptotic-giant-branch carbon star, zirconium oxide in spectrum',
        'D': 'White dwarf', // needs sub-classification
        'L': 'Hot brown dwarf, lithium in atmosphere',
        'T': 'Cool brown dwarf, methane in atmosphere',
        'Y': 'Gas giant, warm, able to fuse deuterium',
        'P': 'Gas giant, cold, Jupiter-like'
    };

    PSpectrum.prototype.dRGAysmpYoungDesc = {
        'MS': 'Red giant, asymptotic-giant branch carbon star, younger'
    };

    /** 
     * secondary classification beginning with 'S', greater detail
     */
    PSpectrum.prototype.dGAsympOldDesc = {
        'SC': 'Red giant, asymptotic-giant-branch carbon star, zirconium oxide in spectrum, older',
        'SN': 'Supernova'
    };

    /**
     * secondary classifications starting with 'C', greater detail
     */
    PSpectrum.prototype.dStarCarbonDesc = {
        'C-R': 'Red giant, carbon star, equivalent of late G to early K-type stars',
        'C-N': 'Red giant, carbon star, older, giant equivalent of late K to M-type stars',
        'C-J': 'Red giant, cool carbon star with a high content of carbon-13',
        'C-H': 'Red giant, Population II equivalent of the C-R red giants',
        'C-Hd': 'Red giant, Hydrogen-deficient, similar to late G supergiants with CH and C2 bands added'
    };

    /**
     * sub-types for 'W' (Wolf-Rayett), greater detail
     * {@link https://en.wikipedia.org/wiki/Wolf%E2%80%93Rayet_star}
     * Note: for WR stars, higher numbers mean lower temperatures
     */
    PSpectrum.prototype.dStarWolfRayetDesc = {
        'WR': 'Wolf-Rayet star, young, helium-fusing, stellar wind mass loss, expanding atmospheric envelope',
        'WC': 'Wolf-Rayet star, helium-fusing, stellar wind mass loss, producing dust, strong Carbon and Helium lines, Helium absent',
        'WN': 'Wolf-Rayet star, helium-fusing, stellar wind mass loss, CNO cycle burn, strong Helium and Nitrogen lines',
        'WO': 'Wolf-Rayet star, helium-fusing, stellar wind mass loss, strong Oxygen lines, weak Carbon lines',
    };

    /**
     * sub-sub types for 'W' (Wolf-Rayett), carbon lines
     */
    PSpectrum.prototype.dStarWolfRayetCDesc = {
        'WC10': 'Wolf-Rayet star, helium-fusing, cooler, stellar wind mass loss, strong Carbon lines',
        'WC11': 'Wolf-Rayet star, helium-fusing, coolest, stellar wind mass loss, strong Carbon lines'
    };

    /**
     * sub-sub types for 'W' (Wolf-Ryett), Nitrogen lines
     */
    PSpectrum.prototype.dStarWolfRayetNDesc = {
        'WNh' : 'Wolf-Rayet star, young and massive, helium and hydrogen fusion, stellar wind mass loss',
        'WN10': 'Wolf-Rayet star, helium-fusing, cooler, stellar wind mass loss, strong Nitrogen lines',
        'WN11': 'Wolf-Rayet star, helium-fusing, coolest, stellar wind mass loss, strong Nitrogen lines'
    };

    /**
     * sub-types for'D' (white dwarf), greater detail
     * {@link https://en.wikipedia.org/wiki/Stellar_classification#Extended_spectral_types}
     */
    PSpectrum.prototype.dStarWhiteDwarfDesc = {
        'DA': 'White Dwarf, hydrogen-rich atmosphere or outer layer, 30,000K, strong Balmer hydrogen spectral lines',
        'DB': 'White Dwarf, helium-rich atmosphere, 15-30,000K, neutral helium, He I, spectral lines',
        'DO': 'White Dwarf, very hot, helium-rich atmosphere, ionized helium, 45-120,000K, He II spectral lines',
        'DQ': 'White Dwarf, carbon-rich atmosphere, < 13,000K atomic or molecular carbon lines',
        'DZ': 'White Dwarf, cool, metal-rich atmosphere, < 11,000K, merges DG, DK, DM types',
        'DG': 'White Dwarf, cool, metal-rich atmosphere, 6000K (old classification)',
        'DK': 'White Dwarf, metal-rich atmosphere (old classification)',
        'DM': 'White Dwarf, metal-rich atmosphere (old classification)',
        'DC': 'White Dwarf, cool, no strong spectral lines, < 11,000K',
        'DX': 'White Dwarf, spectral lines unclear',
    };

    /**
     * sub-sub type, of hydrogen-rich white dwarf
     */
    PSpectrum.prototype.dStarWhiteDwarfHDesc = {
        'DAB':'White Dwarf, hot, hydrogen and helium-rich atmosphere, neutral helium lines, 30,000K',
        'DAO':'White Dwarf, very hot, hydrogen and helium-rich atmosphere, ionized helium lines, >30,000K',
        'DAZ':'White Dwarf, hot, hydrogen-rich atmosphere, metallic spectral lines'
    };

    /**
     * sub-sub type of helium-rich white dwarf
     */
    PSpectrum.prototype.dStarWhiteDwarfHeDesc = {
        'DBZ':'White Dwarf, cool, 15-30,000K, neutral helium, He I, spectral lines, metallic spectral lines'
    };

    /**
     * Luminosity, Harvard classification:
     * [prefix] [letter code] [numeric code 0-9] [luminosity] [suffix]
     * {@link https://amedleyofpotpourri.blogspot.com/2019/12/stellar-classification.html}
     * {@link https://github.com/codebox/stellar-classification-parser.git}
     */
    PSpectrum.prototype.dStarLumDesc = {
        'Ia0': ' Hypergiant',
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
        'VIab': '  Luminous dwarf',
        'V' : ' Dwarf (Main Sequence)',
        'Va' : ' Luminous Dwarf (Main Sequence)',
        'Vb' : ' Regular Dwarf (Main Sequence)',
        'Vz' : ' Lower main sequence Dwarf',
        'VI' : ' Sub-Dwarf',
        'VIa' : ' Luminous Sub-Dwarf',
        'VIb' : ' Less Luminous Sub-Dwarf',
        'VII' : ' White-Dwarf',
        'VIIa' : 'Luminous White-Dwarf',
        'VIIb' : 'Less Luminous White-Dwarf'
    };

    /**
     * if we don't have an absolute magnitude, estimate magnitude (multiple of Sun)
     * from luminosity class - ROUGH
     * http://spiff.rit.edu/classes/phys440/lectures/lumclass/lumclass.html
     */
    PSpectrum.prototype.dLumClassMagnitude = {
        'Ia0': '-10',
        'Ia+': '-6',
        'Ia': '-6',
        'Iab': '-6',
        'Ib': '-5',
        'I': '-6',
        'II': '-3',
        'IIa': '-3',
        'IIb': '-4',
        'III': '-3',
        'IIIa': '-1',
        'IIIb': '-5',
        'IV': '3',
        'IVa': '0',
        'IVb': '3',
        'V' : '4',
        'Va' : '5',
        'Vb' : '19',
        'VI' : '7',
        'VIa' : '6',
        'VIb' : '10',
        'VII' : '12',
        'VIIa' : '10',
        'VIIb' : '15'
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
    PSpectrum.prototype.dStarMods = {
        ':' : ', uncertain values',
        '...' : ', peculiar, truncated spectra',
        '!' : ', special peculiarities',
        'delta del': ', chemically peculiar, hot main-sequence, sharp metallic absorption lines, contrasting broad (nebulous) neutral helium absorption lines.',
        'comp' : ', composite spectrum, unresolved multiple star',
        '+': ', composite spectrum',
        'e' : ', emission lines present',
        '(e)': ', forbidden emission lines present',
        '[e]': ', forbidden emission lines present',
        'er': ', emission lines reversed with center of emission lines weaker than edges',
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
        'nn' : ', very broad absorption features (rotating fast)s',
        'neb': ', a nebula spectrum is mixed in',
        'p': ', chemically peculiar star',
        'pq': ', peculiar, similar to nova spectrum',
        'q': ', P Cygni profile, expanding gaseous envelope',
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

    // disambiguate, e.g. 'n' from 'nn' by disallowed left character
    PSpectrum.prototype.dStarModAmbigStart = {
        'p': '?',
        'k': 'w'
    };

    // disambiguate, e.g. 'p' from 'pq' by disallowed right character
    PSpectrum.prototype.dStarModAmbigEnd = {
        'e': ')]r',
        'f': '*+)?',
        'h': 'a',
        'n': 'en',
        'p': 'q',
        's': 'sh',
        'v': 'a',
        'w': 'lk'
    };

    /** 
     * properties, based on [type][range][luminosity]
     * e.g. 'O1Ia0'
     * {@link http://www.isthe.com/chongo/tech/astro/HR-temp-mass-table-byhrclass.html}
     */
    PSpectrum.prototype.spectLookup = {};

    // methods

    /**
     * blackbody temperature colors table (JSON)
     * {@link http://www.vendian.org/mncharity/dir3/blackbody/UnstableURLs/bbr_color.html}
     */
    PSpectrum.prototype.bbColors = [];

    // test array
    PSpectrum.prototype.test = [];

    /*
     * ------------------------------------------------------
     * PARSING
     * ------------------------------------------------------
     */

    /**
     * transform spectra tokens as defined as Simbad
     * Ia-0 -> Ia0
     * Ia-0/Ia -> Ia0-Ia
     * Ia-ab -> Ia/Iab
     * IVb -> Iva/V
     * Vb -> V-VI
     * Ia/ab -> Ia-Iab
     * III/III-IV -> III/IV (small difference)
     * {@link http://simbad.u-strasbg.fr/simbad/sim-display?data=sptypes}

        NOTE: for 'delta del' suffix, change type to a, add 'm' suffix
        https://en.wikipedia.org/wiki/Chemically_peculiar_star
        https://heasarc.gsfc.nasa.gov/W3Browse/all/cpstars.html
     */
    PSpectrum.prototype.transformSpec = function (spect, flag) {

        for (let i in this.dSpectrumTrans) {
            if(spect.indexOf(i) != -1) {
                if(flag) console.log('for spect:' + spect + ', replacing:' + i + ' with:' + this.dSpectrumTrans[i]);
                spect.replace(i, this.dSpectrumTrans[i]);
            }
        }

        return spect;

    };

    /**
     * Convert the Yerkex prefix to a Harvard luminosity value, and remove from spectrum.
     * @param {String} spect the spectrum
     * @param {Object} prop the properties output object, defined in PData
     */
    PSpectrum.prototype.parseYerkesPrefix = function (spect, prop, flag) {
        // todo: spect.length != 0
        for (let i in this.dLumPrefixTrans) {
            let l = spect.indexOf(i);
            if (l == 0) {
                if (flag) console.log('found Yerkes prefix for:' + spect + ': ' + i)
                lum = this.dLumPrefixTrans[i];
                prop.luminosity.key = this.dLumPrefixTrans[i]; // use to get desc
                return spect.substring(i.length); // swap luminace to end

            } else if (l > 0 && flag) console.log('strange Yerkes...., l:' + l)
            
        }
        return spect;
    };

    /**
     * parse subtype (Wolf-Rayet, White dwarfs) after finding the single-letter stellar type
     * @param {String} spect the current spectrum string (may be truncated)
     * @param {Array} arr the lookup array table for the subtype
     * @param {Number} pos check that type and subtype start at same point in spectrum string
     * @param {Object} prop stellar property, defined in PData
     */
    //PSpectrum.prototype.parseSpectrumSubType = function (spect, arr, pos, prop, flag) {
    PSpectrum.prototype.parseSpectrumSubType = function (spect, arr, pos, key, flag) {
        //todo: spect.length != 0
        for (let i in arr) {
            let l = spect.indexOf(i);
            if (l == pos) { // extended type starts in same place
                if (flag) console.log('found stellar subtype for:' + spect + ', ' + i)
                /////////////////////prop.type.key2 = i; // use to get subtype desc on demand
                /////////////////////
                key = i;
                ////////////////////
                //prop.type.desc = this.dStarWolfRayetDesc[j];
                return spect.substring(i.length)
            } else if (l != -1 && flag) console.warn('weird subtype match at:' + l + ' for ' + i)
        }
        return spect;
    };

    /**
     * Parse a subtype, storing both key and reference to array it is found in
     */
    PSpectrum.prototype.parseSubtype = function (spect, arr, prop, flag) {
        if(arr[spect]) {
            prop.type.key = spect;
            prop.type.arr = arr;
            return true;
        }
        return false;
    };

    /**
     * parse the primary (single-letter) spectrum type, branching to subtype if necessary.
     * @param {String} spect the current spectrum string (may be truncated)
     * @param {Object} prop stellar property, defined in PData
     */
    PSpectrum.prototype.parseSpectrumType = function (spect, prop, flag) {
        // TODO: spect.length != 0
        // TODO: if one-letter, and a '-' or '/' try uppercasing
        for(let i in this.dStarDesc) {
            let l = spect.indexOf(i);
            if (l == 0) {
                if (flag) console.log('found stellar type for:' + spect + ': ' + i);
                    prop.type.key = i;   // type, key for description
                    prop.type.arr = this.dStarDesc; /////////////////////////////////////
                    prop.type.key2 = ''; // subtype, key for description TODO: REMOVE
                    let arr;
                    let len = spect.length; // length of original spectra
                    switch(i) {
                        case 'W':

                            //arr = this.dStarWolfRayetCDesc;
                            //if(!this.parseSubtype(spect, arr, prop, flag)) {
                            //    arr = this.dStarWolfRayetNDesc;
                            //    this.parseSubtype(spect, arr, prop, flag)) {
                            //}
                            // TODO: replace multiple keys with a single key
                            // TODO: scan specifically for 
                            // TODO: sthis.dStarWolfRayetSuffix
                            // TODO: when we scan for mods

                            //spect = this.parseSpectrumSubType(spect, arr, l, prop, flag);
                            // this.dStarWolfRayetSuffix
                            arr = this.dStarWolfRayetDesc;
                            spect = this.parseSpectrumSubType(spect, arr, l, prop.type.key2, flag);
                            return spect;
                            break;
                        case 'C':
                            //spect = this.parseSpectrumSubType(spect, arr, l, prop, flag);
                            arr = this.dStarCarbonDesc;
                            spect = this.parseSpectrumSubType(spect, arr, l, prop.type.key2, flag);
                            return spect;
                            break;
                        case 'D':
                            // key3
                            // this.dWhiteDwarfSuffix
                            //spect = this.parseSpectrumSubType(spect, arr, l, prop, flag);
                            arr = this.dStarWhiteDwarfDesc;
                            spect = this.parseSpectrumSubType(spect, arr, l, prop.type.key2, flag);
                            return spect;
                            break;
                        case 'M':
                            // key3
                            //spect = this.parseSpectrumSubType(spect, arr, l, prop, flag);
                            arr = this.dRGAysmpYoungDesc;
                            spect = this.parseSpectrumSubType(spect, arr, l, prop.type.key2, flag);
                            break;
                        case 'S':
                            // spect = this.parseSpectrumSubType(spect, arr, l, prop, flag);
                            arr = this.dGAsympOldDesc;
                            spect = this.parseSpectrumSubType(spect, arr, l, prop.type.key2, flag);
                            break;
                        default:
                            return spect.substring(i.length);
                            break;
                    }

            } else if (l != -1 && flag) console.log('strange Type position...., l:' + l)

        }
        // this happens with stuff like DZ4/5
        if (flag) console.warn('no stellar type found for:' + spect)

        return spect;
    };

    /**
     * parse the spectrum range (0-9) between types
     * @param {String} spect the current spectrum string (may be truncated)
     * @param {Object} prop stellar property, defined in PData
     */
    PSpectrum.prototype.parseSpectrumRange = function (spect, prop, flag) {
        // TODO: spect.length != 0 test
        let r = spect.parseNumeric();
        if (r) {
            if (flag) console.log('range start1:' + r.start1 + ' start2:' + r.start2 + ' r:' + r.num)
            prop.range.key = r.num + ''; // force key to string
            prop.range.value = r.num;
            return spect.substring(r.start2);
        } //else console.warn(spect + ':no range found')

        return spect;
    };

    /**
     * parse the luminosity classification
     * @param {String} spect the current spectrum string (may be truncated)
     * @param {Object} prop stellar property, defined in PData
     */
    PSpectrum.prototype.parseSpectrumLuminosity = function (spect, prop, flag) {
        // TODO: spect.length != 0 test
        // TODO: Ia0-a means Ia0 - Ia
        let k = ''; // longest match
        for(let i in this.dStarLumDesc) {
            let l = spect.indexOf(i);
            // record the new match, store if longer than previous one
            if (l != -1) {
                if(i.length > k.length) { // new match is longer than previous (k)
                    k = i;
                }
                // keep looking, looking for longer match...
            }
            // if we get a match beyond zero, there's a suffix, remove it
            if (l > 0) { // suffix between type and luminosity?
                if (flag) console.warn('strange Luminosity position...., l:' + l + ' for:' + i)
                    // if there was an intervening suffix before luminosity, parse it away
                    let s = spect.substring(0, l);
                    spect = spect.substring(l); // trim it off, luminosity = 0 in next loop
                    if(flag) console.warn('trimming off:"' + s + '" spect:' + spect)
                    this.parseSpectrumMods(s, prop, flag);
            }

        }
        if (flag) console.log('final luminosity:' + k)

        // get the luminosity key and magnitude
        if (k.length) {
            prop.luminosity.key = k;
            prop.luminosity.value = this.dLumClassMagnitude[k];

            return spect.substring(k.length);
        }

        return spect;
    };

    /**
     * parse modifiers for the spectrum
     * @param {String} spect the current spectrum string (may be truncated)
     * @param {Object} prop stellar property, defined in PData
     */
    PSpectrum.prototype.parseSpectrumMods = function (spect, prop, flag) {

        if (spect.length) {

            let lok = true, rok = true;

            // TODO: of Wolf-Rayet, parse specifically for 'W' suffix
            // TODO: for Whte Dwarf, parse specifically for 'D' suffix
            // TODO: then scan for other suffixes

            for (let i in this.dStarMods) {
                p1 = spect.indexOf(i); // get position of key in suffix

                if (p1 != -1) {

                    // lots of possibilities. Check the left and right char to know what to assign
                    if (p1 > 0) p2 = spect[p1 - 1]; else p2 = ''; // left-side character
                    if (p1 < spect.length - 1) p3 = spect[p1 + 1]; else p3 = ''; // right-side character
                    if (flag) console.log('left:' + p2 + ' i:' + i + 'right:' + p3)
                    switch(i) {
                        case ':': 
                        case '...': 
                        case '!':
                        case '+': 
                        case 'k':
                        case 'm':
                        case 'q':
                            prop.mods.push(i); //mutiple keys in array
                            break;
                        case 'e':
                        case 'f':
                        case 'h':
                        case 'n':
                        case 'p':
                        case 's':
                        case 'v':
                        case 'w':
                            if (this.dStarModAmbigEnd[i])
                                if (this.dStarModAmbigEnd[i].indexOf(p3) != -1)
                                    rok = false;
                            if (this.dStarModAmbigStart[i])
                                if (this.dStarModAmbigStart[i].indexOf(p2) != -1)
                                    lok = false
                            if (lok && rok) {
                                if(flag) console.log('prop.mods indexOf(' + i + ') is:' + prop.mods.indexOf(i))
                                if(prop.mods.indexOf(i) != -1) { // avoid duplicates
                                    prop.mods.push(i);
                                }
                                lok = rok = true; // reset (may be redundant)
                            }
                        default:
                            if (prop.mods.indexOf(i) != -1) { // avoid duplicates
                                prop.mods.push(i);
                            }
                            break;

                    }

                } //else if (flag) console.warn('suffix:' + i + ' found beyond zero');

            }
            if (flag) console.log('mods:"' + prop.mods + '"');
        }

        return spect;

    };

    /**
     * Use the lookup table for the 1000 or so common stellar types, sans modifications
     * @param {Object} prop
     */
    PSpectrum.prototype.getSpectrumProps = function (prop, flag) {
        let util = this.util;
        let t = prop.type.key,
        r = prop.range.value,
        l = prop.luminosity.key;

        // generate the combined type - range - luminosity key
        let lp = t;
        if(util.isNumber(r, true)) { // suppress error messages
            lp += r;
            if(l.length) {
                lp += l;
            }
        } else {
            //console.error('getSpectrumProps: bad number:' + r + ' for:' + prop.spect);
        }

        if (flag) console.log("scan spectrumProps with:" + lp)

        if(lp.length) {
            lp = this.spectLookup[t + r + l];
            if (lp) {
                if(flag) console.log('spectrumProps (' + t + r + l + ') HIT')
                // TODO: confidence interval
                // TODO: approx radius
                prop.mass.value = lp.mass,
                prop.luminosity.value = lp.luminosity,
                prop.radius.value = lp.radius,
                prop.temp.value = lp.temp,
                prop.ci.value = lp.ci,
                prop.absmag.value = lp.absmag,
                prop.bolo.value = lp.bolo,
                prop.color.r = lp.r,
                prop.color.g = lp.g,
                prop.color.b = lp.b;
                window.prop = prop; // TODO: REMOVE/////////////////////
            }
        }

        return prop;

    };

    /**
     * Determine if the prop is 
     * 1. primary spectrum
     * 2. part of a composite ('/') spectrum, e.g. (A0/D0)
     *    most composites will actually be multiple stars
     * 3. part of an in-between ('-'), e.g. "k-m"
     * 
     * We do this AFTER parsing out all the prop elements (type, range, luminance, mods) 
     * by determining whether a '/' or '-' appears ahead of it in the original spectra
     * 
     * @param {String} spect the original spectra
     * @param {Object} prop the resolved property set
     */
    PSpectrum.prototype.classifyProp = function (spect, prop, flag) {

        let util = this.util;

        // possible values for role
        let spectRole = this.pdata.SPECTROLES;

        let pos = -1; // position of spectrum element in original string
        let key = ''; // default key

        // prop.type
        if (prop.type.key2.length > 0) key = prop.type.key2;
        else key = prop.type.key;

        // to improve recognition, convert 'A' to 'A[0-9]' if possible
        if (prop.range.key) key += prop.range.key;
        if(flag) console.log('GENERATED KEY:' + key + ' ORIGINAL:' + prop.spect);

        // if there is a key...
        if(key.length > 0) {
            pos = spect.indexOf(key); // check in original spectra string
            if (pos == 0) prop.type.role = spectRole.PRIMARY;
            else if (pos > 0) {
                let c = spect[pos - 1];
                if (c == '-') prop.type.role = spectRole.INTERMEDIATE;
                else if (c == '/') prop.type.role = spectRole.COMPOSITE;
                else prop.type.role = spectRole.PRIMARY;
            } else {
                console.warn('classifyProp WARNING,  key:' + key + ' not found in:' + prop.spect + ' for:' + spect)
            }

        }

        // for prop.range, if there is a range
        key = prop.range.key;
        if (key.length > 0) {

        }

        // for prop.luminosity, if there is a luminosity
        key = prop.luminosity.key;
        if(key.length > 0) {

        }

        // other properties either are derived, or apply to all sub-regions of spectrum

        return prop;

    };

    /**
     * Use stellar spectum (Harvard/Yerkes classification) to extract stellar data
     * {@link https://en.wikipedia.org/wiki/Stellar_classification}
     * [prefix][type code] [numeric code 0-9] [Yerkes luminosity] [suffix]
     * adds properties to the supplied 'star' object in hyg3 fields
     * extended descriptions based on type and luminosity
     * @param {Object} star hyg3 (truncated) fields
     * @param {Object} props stellar properties object, defined in PData
     */
    PSpectrum.prototype.spectrumToStellarData = function (star) {

        let util = this.util;
        let pdata = this.pdata;

        // get the spectrum string
        let spect = star.spect;

        let nm = 'spectrumToStellarData WARN:' + star.id + '(' + star.proper + ')' + ' spect:' + spect;

        let flag = false;
        //////////////////////////////////////////////////////////
        //if (spect.indexOf('O') != -1) flag = true;
        //if (spect.indexOf('Ia0') != -1) flag = true;
        //if (spect.indexOf('-') != -1) flag = true;
        if (spect.indexOf('-') != -1 && spect.indexOf('/') != -1) flag = true;

        if(flag) window.spectra = this;
        /////////////////////////////////////////////////////////

        if (!spect || !star) return false;

        spect.stripWhitespace(); // remove all whitespace, augmented String prototype in util.js

        if (flag) console.log('=====\nspect:' + spect + ' #' + this.counter1)

        // replace a few patterns for easier parsing
        spect = this.transformSpec(spect);

        let s = {
            spect: spect,
            props: []
        };
        let props = s.props;

        /*
         * split on - or /, save the individual spectra and fragments
         * a '/' means composite (possible multiple star)
         * a '-' means between the two types
         * TODO: need to know the separators!!!!
         * TODO: figure out if we were split from a '/' or a '-'
         * TODO: regex for simultaneous search: (?=.*\/)(?=.*-)
         * TODO: spectra: "spect":"A2/3mA4-A7",
         * TODO: have to compute similar to that for luminance
         * A2  3mA4 - A7
         */
        let spects = spect.split(/\/|-/);

        if (spects.length > 3) {
            console.warn('spectrumToStellarData WARN: separators >2:' + spects.length + ' spect:' + spect)
        }

        // TODO: split this into composite '/' and in-between

        // find patterns and return substring missing pattern
        for(let i = 0; i < spects.length; i++) {
            let s = spects[i];
            let p = pdata.createPSpectrum();
            p.spect = s; // Partial spectra TODO: REMOVE
            props.push(p); // save our props object in an array
            s = this.parseYerkesPrefix(s, p, flag);
            if (flag) console.log('spects['+ i + '] Yerkes parsed:[' + s + '] remains');
            s = this.parseSpectrumType(s, p, flag);
            if (flag) console.log('spects[' + i + '] type parsed:[' + s + '] remains');
            s = this.parseSpectrumRange(s, p, flag);
            if (flag) console.log('spects[' + i + ']  range parsed:[' + s + '] remains');
            s = this.parseSpectrumLuminosity(s, p, flag);
            if (flag) console.log('spects[' + i + '] luminosity parsed:[' + s + '] remains');

            // if we have a type, range, and luminosity, do a lookup for additional results

            props[i] = this.getSpectrumProps(p, flag);

            s = this.parseSpectrumMods(s, p, flag);
            if (flag) console.log('spects[' + i + '] mods parsed:[' + s + ']');
            this.classifyProp(spect, p, flag);
            if(flag) console.log('-----')

        }

        //////////////////////////////////////////////////
        // save a copy for testing
        if(flag) {
            if(this.test.length < 10)
                this.test.push(Object.assign({}, s));
        }
        //////////////////////////////////////////////////

        // TODO: REMOVE
        this.counter1++;

    };

    /**
     * log the properties
     */
    PSpectrum.prototype.propToDescription = function (s) {

        console.log('Spectrum:' + s.spect) 
        for (let i = 0; i < s.props.length; i++) {
            let prop = s.props[i];
            let t = this.dStarDesc[prop.type.key];
            let l = this.dStarLumDesc[prop.luminosity.key];
            if (l) {
                let idx = t.indexOf(' star');
                t = t.substring(0, idx);
                t += l;
            }
            console.log('type:' + prop.type.key + ' ('+ t +'),' + ' absolute magnitude:' + prop.luminosity.value + '(' + prop.luminosity.key + ')');
            console.log('range:' + prop.range.value);
            console.log('mass:' + prop.mass.value + ' radius:' + prop.radius.value + ' temp:' + prop.temp.value);


        }

    };

    /*
     * ------------------------------------------------------
     * CONVERSION
     * ------------------------------------------------------
     */

    /**
     * look up a color from temperature, via blackbody estimation
     * @param {Number} temp 
     */
    PSpectrum.prototype.tempToBlackbodyColor = function (temp) {
        
        let t = Math.floor(temp / 200);
        t = t * 200;
        if (t < 1000) {
          t = 1000;
        } else if (t > 29800) {
          t = 29800;
        }

        const c = this.bbColors[t];

    };

    /**
     * compute temperature from a blue-violet color index (B-V)
     * {@link https://stackoverflow.com/questions/21977786/star-b-v-color-index-to-apparent-rgb-color}
     * @param {Number} ci 
     */
    PSpectrum.prototype.bvToRGB = function (ci) {
        let t1 = (4600 * (1 / (0.92 * ci + 1.7) + 1 / (0.92 * ci + 0.62)));
        return this.tempToBlackbodyColor(t1);
    };

    /**
     * Convert b-v (colorindex) values reported to stars to RGB color
     * @param {Number} bv the b-v value for the star.s
     * {@link https://stackoverflow.com/questions/21977786/star-b-v-color-index-to-apparent-rgb-color}
     * {@link http://www.vendian.org/mncharity/dir3/blackbody/UnstableURLs/bbr_color.html}
     * {@link https://www.pas.rochester.edu/~emamajek/EEM_dwarf_UBVIJHK_colors_Teff.txt}
     * {@link https://en.wikipedia.org/wiki/Color_index}
     */
    PSpectrum.prototype.bvToRGB = function (bv) {

        var r = 0, g = 0, b = 0, t = 0;

        if (bv < -0.4) bv = -0.4
        if (bv > 2.0) bv = 2.0

        if (bv >= -0.40 && bv < 0.00) {
            t = (bv + 0.40) / (0.00 + 0.40)
            r = 0.61 + 0.11 * t + 0.1 * t * t
            g = 0.70 + 0.07 * t + 0.1 * t * t
            b = 1.0
        }
        else if (bv >= 0.00 && bv < 0.40) {
            t = (bv - 0.00) / (0.40 - 0.00)
            r = 0.83 + (0.17 * t)
            g = 0.87 + (0.11 * t)
            b = 1.0
        }
        else if (bv >= 0.40 && bv < 1.60) {
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
        else if (bv >= 1.50 && bv < 1.951) {
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
     * Compute absolute magnitude from magnitude
     * @param {Number} mag observed magnitude
     * @param {Number} dist distance in parsecs
     * {@link http://cas.sdss.org/dr3/en/proj/advanced/hr/radius1.asp}
     */
    PSpectrum.prototype.computeAbsMag = function (mag, dist) {
        return mag - (5 * (Math.log10(dist) - 1));
    };

    /**
     * compute luminosity from radius and temperature
     * {@link https://www.omnicalculator.com/physics/luminosity}
     * @param {Number} radius, expressed as multiple of sun's radius
     * @param {Number} temp, expressed in kelvins.
     */
    PSpectrum.prototype.computeLuminosity = function (radius, temp) {
        return Math.pow(radius, 2) * Math.pow(temp/this.SOL.temp, 4);
    };

    /**
     * Compute stellar radius, based on luminosity
     * - luminosity ratio to solar luminosity
     * - temperature ratio to solar temperature
     * {@link http://www.handprint.com/ASTRO/specclass.html}
     * R/R⊙ = √(L/L⊙)/(T/T⊙)4
     * @param {Number} absMag absolute magnitude
     * @param {Number} temp temperature in Kelvins
     */
     PSpectrum.prototype.computeRadius = function (absmag, temp) {
        return Math.pow(parseFloat(this.SOL.temp)/temp, 2) * Math.sqrt(Math.pow(2.51188643150958, (this.SOL.absmag - absmag)));
     };

    /**
     * rough calculation using mass-luminosity relationship
     * @param {Number} luminosity, multiples of the sun
     */
    PSpectrum.prototype.computeMass = function (luminosity) {
        return Math.pow(luminosity, 1/3.5);
    };

    /**
     * Compute stellar lifetime on main sequence, assuming the Sun lasts 10 billion years
     * @param {Number} massRatio ratio of star mass relative to Sol
     */
    PSpectrum.prototype.computeLifetime = function (massRatio) {
        return 1E+10 * Math.pow(massRatio, 2.5);
    };

    /*
     * ------------------------------------------------------
     * DATA/FILE LOADING
     * ------------------------------------------------------
     */

    /**
     * request data using the Aladin API
     * {@link https://aladin.u-strasbg.fr/AladinLite/doc/API/}
     */
    PSpectrum.prototype.loadDatafromAladin = function (query, options) {
        return false;
    };

    /**
     * load data from exoplanets.eu
     * {@link http://exoplanet.eu/API/}
     * NASA exoplanets
     * {@link https://exoplanets.nasa.gov/exoplanet-catalog/}
     */
    PSpectrum.prototype.loadDatafromExoplanetEU = function (query, options) {
        return false;
    };

    /**
     *
     * documentation for the resolver to use with JSON
     * {@link https://simbad.u-strasbg.fr/simbad/sim-nameresolver}
     *
     * example for JSON, HD database:
     * https://simbad.u-strasbg.fr/simbad/sim-nameresolver?Ident=HD123&data=I.0,J,M(U,B,V,G),S,I&output=json'
     *
     * look up identifiers in SIMBAD (e.g HD, HIP)
     * https://cds.u-strasbg.fr/cgi-bin/Dic-Simbad
     *
     * query by criteria
     * http://simbad.u-strasbg.fr/simbad/sim-fsam
     *
     * more complex, Mikulski archive for space telecscopes: 
     * {@link https://archive.stsci.edu/spec_class/search.php} 
     * @param {String} id SIMBAD identifier
     * @param {Function} resFn a callback function to process returned JSON data
     */
    PSpectrum.prototype.loadSpectrumFromSIMBAD = function (id, resFn) {

        // sample identifiers: NOTE: use the Vizer link, and can remove the %20 spaces

        id = 'HD48915'; // Sirius, HD query
        //id = 'HIP32349';
        //id = 'HIC32349';
        //id = 'GaiaDR26423349579465419392';
        //id = 'Sirius'; // get several things back
        //id = '2MASS%20J07332733-5035032';

        // by name NAME ALTAIR

        // json query
        let url = 'https://simbad.u-strasbg.fr/simbad/sim-nameresolver?Ident='+id+'&data=I.0,J,M(U,B,V,G),S,I&output=json';

        this.util.asyncJSON(url, function(json) {

            window.json = json;

            /*
             * the result comes back as an array, with all objects matching the ID
             * for example, a query for Sirius gets two results, Sirius and its white 
             * dwarf companion
             */

            // execute our local processing
            if (json && resFn) resFn(json);

        }, true);


    };

    /** 
     * load data from Aladin interactive system (e.g. photo of object) 
     */
    PSpectrum.prototype.load

    /**
     * Load an rgb color versus temperature table based on blackbody calculations
     * {@link http://www.vendian.org/mncharity/dir3/blackbody/UnstableURLs/bbr_color.html}
     * @param {BABYLON.AssetsManager} assetManager 
     * @param {String} dir loaction of file
     */
    PSpectrum.prototype.loadStarColorsByBlackbody = function (assetManager, dir) {

        let spectrum = this;
 
        console.log("------------------------------");
        console.log('PSpectra: loading star colors by blackbody:' + dir);

        const loadBlackbody = assetManager.addTextFileTask('blackbody', dir);

        loadBlackbody.onSuccess = async function (bbColors) {
            console.log('PSpectra: blackbody color table loaded, parsing data...')
            try {
                spectrum.bbColors =  JSON.parse(bbColors.text);
            } catch (e) {
                util.printError(e, false, 'Blackbody table load:');
                spectrum.bbColors = [];
            }

        };

        loadBlackbody.onTaskError = function (task) {
            console.log('task failed', task.errorObject.message, task.errorObject.exception);
        };

    };

    /**
     * Load stellar colors for all stellar types from JSON data
     * JSON file source
     * @link {http://www.isthe.com/chongo/tech/astro/HR-temp-mass-table-byhrclass.html}
     */
    PSpectrum.prototype.loadStarPropsBySpectrum = function (assetManager, dir) {

        let spectrum = this;
        let util = this.util;

        console.log("------------------------------");
        console.log('PSpectra: loading colors for all stellar types:' + dir)

        const loadColors = assetManager.addTextFileTask('starprops', dir);

        loadColors.onSuccess = async function (colors) {
            console.log('PSpectra: stellar properties loaded, parsing data...')
            try {
                spectrum.spectLookup =  JSON.parse(colors.text);
            } catch (e) {
                util.printError(e, false, 'Stellar properties by spectrum table:');
                spectrum.spectLookup = [];
            }

        };

        loadColors.onTaskError = function (task) {
            console.log('PSpectrum task failed', task.errorObject.message, task.errorObject.exception);
        };

    };

    return PSpectrum;

}());