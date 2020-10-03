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

        // TODO: load our stellar data types (e.g. spectrum_props.tdl here)

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
    }

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
        'MS':'Red giant, younger, asymptotic-giant branch carbon star',
        'N': 'Red giant, older carbon star, giant equivalent of lat K to M-type stars',
        'R': 'Red giant, carbon star equivalent of late G to early K-type stars',
        'C': 'Red giant, carbon star',
        'S': 'Red giant, asymptotic-giant-branch carbon star, zirconium oxide in spectrum',
        'SC': 'Red giant, older, asymptotic-giant branch carbon star, high carbon',
        'SN': 'Supernova',
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

    /**
     * secondary classifications starting with 'D' (white dwarf), greater detail
     * {@link https://en.wikipedia.org/wiki/Stellar_classification#Extended_spectral_types}
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
        'comp' : ', composite spectrum',
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
        'nn' : ', very broad absorption features',
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
    PSpectrum.prototype.parseSpectrumSubType = function (spect, arr, pos, prop, flag) {
        //todo: spect.length != 0
        for (let i in arr) {
            let l = spect.indexOf(i);
            if (l == pos) { // extended type starts in same place
                if (flag) console.log('found stellar subtype for:' + spect + ', ' + i)
                prop.type.key2 = i; // use to get subtype desc on demand
                //prop.type.desc = this.dStarWolfRayetDesc[j];
                return spect.substring(i.length)
            } else if (l != -1 && flag) console.warn('weird subtype match at:' + l + ' for ' + i)
        }
        return spect;
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
                    prop.type.key2 = ''; // subtype, key for description
                    let arr;
                    switch(i) {
                        case 'W':
                            arr = this.dStarWolfRayetDesc;
                            spect = this.parseSpectrumSubType(spect, arr, l, prop, flag);
                            return spect;
                            break;
                        case 'C':
                            arr = this.dStarCarbonDesc;
                            spect = this.parseSpectrumSubType(spect, arr, l, prop, flag);
                            return spect;
                            break;
                        case 'D':
                            arr = this.dStarWhiteDwarfDesc;
                            spect = this.parseSpectrumSubType(spect, arr, l, prop, flag);
                            return spect;
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

            // TODO: prop.mod is an array, must be cleared

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
     * 
     */
    PSpectrum.prototype.getSpectrumProps = function (prop, flag) {
        let util = this.util;
        let t = prop.type.key,
        r = prop.range.value,
        l = prop.luminosity.key;

        if (flag) console.log("scan spectrumProps with:" + t + r + l)

        // TODO: introduce equations at this link for approx age
        // http://www.handprint.com/ASTRO/specclass.html
        // TODO: NOT GETTING HITS
        // TODO: parse type and celestial for direct lookup, as first try

        if(t.length && r > 0 && r < 10 && l.length) {
            let lp = this.spectLookup[t + r + l];
            if (lp) {
                if(flag) console.log('spectrumProps (' + t + r + l + ') HIT')
                // TODO: confidence interval
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
                window.prop = prop; /////////////////////
            }
        }



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
        if (spect.indexOf('Ia0') != -1) flag = true;
        //if (spect.indexOf('-') != -1) flag = true;

        if(flag) window.spectra = this;
        /////////////////////////////////////////////////////////

        if (!spect || !star) return false;

        spect.stripWhitespace(); // remove all whitespace, augmented String prototype in util.js

        if (flag) console.log('=====\nspect:' + spect)

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

        // find patterns and return substring missing pattern
        for(let i = 0; i < spects.length; i++) {
            props.push(pdata.createPSpectrum()); // make our props object
            props[i].spect = spects[i]; // TODO: REMOVE
            spects[i] = this.parseYerkesPrefix(spects[i], props[i], flag);
            if (flag) console.log('spects['+ i + '] Yerkes parsed:[' + spects[i] + '] remains');
            spects[i] = this.parseSpectrumType(spects[i], props[i], flag);
            if (flag) console.log('spects[' + i + '] type parsed:[' + spects[i] + '] remains');
            spects[i] = this.parseSpectrumRange(spects[i], props[i], flag);
            if (flag) console.log('spects[' + i + ']  range parsed:[' + spects[i] + '] remains');
            spects[i] = this.parseSpectrumLuminosity(spects[i], props[i], flag);
            if (flag) console.log('spects[' + i + '] luminosity parsed:[' + spects[i] + '] remains');

            // if we have a type, range, and luminosity, do a lookup for additional results

            props[i] = this.getSpectrumProps(props[i], flag);

            spects[i] = this.parseSpectrumMods(spects[i], props[i], flag);
            if (flag) console.log('spects[' + i + '] mods parsed:[' + spects[i] + ']');
            if(flag) console.log('-----')

        }

        //////////////////////////////////////////////////
        // save a copy for testing
        if(flag) {
            if(this.test.length < 10)
                this.test.push(Object.assign({}, s));
        }
        //////////////////////////////////////////////////

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
     * {@link http://cas.sdss.org/dr3/en/proj/advanced/hr/radius1.asp}
     */
    PSpectrum.prototype.computeAbsMag = function (mag, dist) {
        return mag - (5 * (Math.log10(dist) - 1));
    };

    /**
     * compute luminosity from radius and temperature
     * {@link https://www.omnicalculator.com/physics/luminosity}
     */
    PSpectrum.prototype.computeLuminosity = function (radius, temperature) {
        return  = Math.pow(radius/this.SOL.radiusKm, this.SOL.temp) * Math.pow(temp, 4);
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
     * load a spectral type by SESAME query. The XML results will have 
     * the 'best' values for composite spectra
     * http://vizier.u-strasbg.fr/doc/sesame.htx
     * - output basic:
     * http://vizier.u-strasbg.fr/viz-bin/nph-sesame/-ox/?HD60753
     * - output fluxes (magnitudes):
     * http://vizier.u-strasbg.fr/viz-bin/nph-sesame/-oxpF/?HD60753
     * use "v" magnitude for apparent visual magnitude
     * - get all the aliases
     * http://cdsweb.u-strasbg.fr/cgi-bin/nph-sesame/-oxI?HIP123
     * - gets everything
     * http://cdsweb.u-strasbg.fr/cgi-bin/nph-sesame/-oIfx?HIP123 
     * - exampe for Sirius
     * http://cdsweb.u-strasbg.fr/cgi-bin/nph-sesame/-oIfx?HD48915
     * more complex and slow: http://archive.stsci.edu/spec_class/search.php 
     */
    PSpectrum.prototype.loadSpectrumfromSIMBAD = function (id) {

        //TODO: complete this!!!

        this.util.asyncXML(id, function (response) {

            let parser = new DOMParser();
            let xml = parser.parseFromString(response, 'text/xml');

            let spect = xmlDoc.getElementsByTagName('spType')[0].childNodes[0].nodeValue;

        /*
            var text, parser, xmlDoc;

            text = "<bookstore><book>" +
            "<title>Everyday Italian</title>" +
            "<author>Giada De Laurentiis</author>" +
            "<year>2005</year>" +
            "</book></bookstore>";

            parser = new DOMParser();
            xmlDoc = parser.parseFromString(text,"text/xml");

            document.getElementById("demo").innerHTML =
            xmlDoc.getElementsByTagName("title")[0].childNodes[0].nodeValue;
        */

        });

    };

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