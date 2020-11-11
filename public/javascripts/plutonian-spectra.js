/**
 * Decode stellar spectra into Star properties, without using regex, 
 * which is slow on browsers which don't cache regex (non-Firefox).
 * 
 * Parsing a spectra provides additional properties not present in the 
 * hyg3 database, which are added to hyg3 object (our version defined in PData.HygObj)
 * Sample parser
 * {@link https://codebox.net/pages/star-classification-parser-web-service}

 * {@link http://www.livingfuture.cz/stars.php}
 * Secrets of the Harvard classification revealed
 * {@link http://archive.seattleastro.org/webfoot/feb00/pg2.htm}
 */
var PSpectrum = (function () {

    function PSpectrum (util, pdata) {

        this.util = util;
        this.pdata = pdata;

        // create a keylist for sorted by string size (faster pattern-matching with .indexOf())
        this.dSpectrumTransKeys = Object.keys(this.dSpectrumTrans).sort((a,b) => b.length - a.length);
        this.dStarTypeKeys = Object.keys(this.dStarType).sort((a,b) => b.length - a.length);
        this.dStarLumClassKeys = Object.keys(this.dStarLumClass).sort((a,b) => b.length - a.length);
        this.dStarModKeys = Object.keys(this.dStarMods).sort((a,b) => b.length - a.length);

    };

    /**
     * Collect statistics on spectrum parsing
     */
    PSpectrum.prototype.stats = {
        total:0,
        parsed:0,
        computed:0,
        lastDitch:0,
        failedLookup:[]
    };

    /*
     * ------------------------------------------------------
     * PROPERTY TABLES SMALL, INLINE
     * ------------------------------------------------------
     */

    /**
     * many properties are expressed as (Prop)Star / (Prop)Sun
     */
    PSpectrum.prototype.SOL = {
        mass: 1,
        radius: 1,
        radiusKm: 695700,
        lumWatts: 3.828E+26,
        absmag: 4.83,
        temp: 5778, // Kelvins
        metallicity: 1.0
    };

    /**
     * exoplanet masses expressed as (Mass)Exoplanet / (Mass)Jupiter
     */
    PSpectrum.prototype.JUPITER = {
        mass: 317.646185839028 // multiple of Earth's mass
    };

    /**
     * Default stellar properties, if we can't load the larger table, or 
     * no luminosity information exists in the spectra. Same structure 
     * as longer table, values truncates to significance in 3D screen and VR simulation.
     *
     * NOTE: this table is NOT used in spectrum parsing, only property computation.
     *
     * Fields:
     * 1. mass: star/Sun
     * 2. luminosity: star/Sun
     * 3. radius: star/Sun
     * 4. temp: kelvins
     * 5. ci: b-v
     * 6. absmag: magnitude
     * 7. bolo: correction to magnitude (add to absolute magnitude)
     * 8. r, g, b: color 0-1
     * {@link http://www.isthe.com/chongo/tech/astro/HR-temp-mass-table-byhrclass.html}
     */
    PSpectrum.prototype.dStarProps = {
        'WC': {mass: 90.71, luminosity: 2.54E+06, radius: 2.56E+01, temp: 39814, ci: -0.330, absmag: -6.21, bolo: -3.879, r: 0.6035, g: 0.6847, b: 0.9929},
        'WN': {mass: 91.49, luminosity: 2.58E+06, radius: 2.59E+01, temp: 39557, ci: -0.329, absmag: -6.23, bolo: -3.862, r: 0.5985, g: 0.6834, b: 1},
        'WR': {mass: 91.1, luminosity: 2.56E+06, radius: 2.575E+01, temp: 39686, ci: -0.329, absmag: -6.22, bolo: -3.871, r: 0.6010, g: 0.6840, b: 0.9964},
        'O': {mass: 90.22, luminosity: 2.16E+06, radius: 2.51E+01, temp: 39557, ci: -0.330, absmag: -6.18, bolo: -3.862, r: 0.5985, g: 0.6834, b: 1},
        'B': {mass: 17.38, luminosity: 2.11E+05, radius: 2.78E+01, temp: 19517, ci: -0.216, absmag: -4.08, bolo: -1.918, r: 0.6792, g: 0.7581, b: 1},
        'A': {mass: 7.084, luminosity: 5.20E+04, radius: 5.70E+01, temp: 8871, ci: 0.0342, absmag: -2.29, bolo: -0.268, r: 0.7883, g: 0.8383, b: 1},
        'F': {mass: 5.47, luminosity: 6.75E+04, radius: 1.01E+02, temp: 6883, ci: 0.4201, absmag: -1.64, bolo: -0.09925, r: 0.9316, g: 0.9293, b: 0.9916},
        'G': {mass: 3.76, luminosity: 1.33E+05, radius: 3.02E+02, temp: 5031, ci: 0.9245, absmag: -1.13, bolo: -0.507, r: 1, g: 0.9261, b: 0.8324},
        'K': {mass: 4.89, luminosity: 2.37E+05, radius: 5.92E+02, temp: 4007, ci: 1.283, absmag: -0.69, bolo: -1.279, r: 1, g: 0.8382, b: 0.6328},
        'M': {mass: 5.98, luminosity: 1.54E+6, radius: 9.4E+03, temp: 2809, ci: 1.874, absmag: 0.93, bolo: -4.301, r: 1, g: 0.7559, b: 0.4242},
        'N': {mass: 5.98, luminosity: 1.54E+6, radius: 9.4E+03, temp: 2809, ci: 1.874, absmag: 0.93, bolo: -4.301, r: 1, g: 0.7557, b: 0.4218},
        'R': {mass: 6.465, luminosity: 1.78E+5, radius: 4.5E+02, temp: 4314, ci: 1.171, absmag: -0.82, bolo: -0.997, r: 0.9950, g: 0.8681, b: 0.7114},
        'C': {mass: 6.27, luminosity: 1.28E+07, radius: 7.4E+03, temp: 3498, ci: 1.562, absmag: 0.2337, bolo: -2.939, r: 1, g: 0.8280, b: 0.5776},
        'S': {mass: 5.98, luminosity: 1.53E+07, radius: 9.4E+03, temp: 2809, ci: 1.874, absmag: 0.93, bolo: -4.301, r: 1, g: 0.7556, b: 0.4218},
        'MS':{mass: 5.98, luminosity: 7.7E+06, radius: 9.4E+03, temp: 2809, ci: 1.874, absmag: 0.83, bolo: -4.301, r: 1, g: 0.6557, b: 0.4216},
        'SC':{mass: 6.12, luminosity: 7.7E+06, radius: 8.4E+03, temp: 3153, ci: 1.718, absmag:0.581, bolo: -3.62, r: 1, g: 0.7918, b:0.4997},
        'DA': {mass: 0.56, luminosity: 0.72097, radius: 0.008756, temp: 24258, ci: 0.033, absmag: 12.8, bolo: -1.839, r: 0.7988, g: 0.8188, b: 0.9384},
        'DB': {mass: 0.56, luminosity: 0.72097, radius: 0.008756, temp: 24258, ci: 0.033, absmag: 12.8, bolo: -1.839, r: 0.7988, g: 0.8349, b: 0.9843},
        'DC': {mass: 0.56, luminosity: 0.72097, radius: 0.008756, temp: 24258, ci: 0.033, absmag: 12.8, bolo: -1.839, r: 0.7988, g: 0.8349, b: 0.9843},
        'DO': {mass: 0.56, luminosity: 0.72097, radius: 0.008756, temp: 24258, ci: 0.033, absmag: 12.8, bolo: -1.839, r: 0.7988, g: 0.8349, b: 0.9843},
        'DQ': {mass: 0.5, luminosity: 0.033300, radius: 0.008727, temp: 15842, ci: 0.077, absmag: 13.09, bolo: -1.204, r: 0.7765, g: 0.8235, b: 0.9956},
        'DZ': {mass: 0.56, luminosity: 0.72097, radius: 0.008756, temp: 24258, ci: 0.033, absmag: 12.8, bolo: -1.839, r: 0.7988, g: 0.8349, b: 0.9843},
        'DX': {mass:0.550, luminosity:0.61607, radius: 0.008751, temp:22974, ci:0.040, absmag:12.84, bolo:-1.742, r:0.7954,	g:0.8332,b:0.9860}, // uncertain spectrum
        'L': {mass: 0.05, luminosity: 1E-4, radius: 0.1, temp: 2000, ci: 0, absmag: 15, bolo:-3, r:1, g:0.4235, b:0}, // red, hot brown dwarf, lithium
        'T': {mass: 0.03, luminosity: 1E-5, radius: 0.1, temp: 1200, ci: 0, absmag: 16, bolo:-1, r:1, g:0.3, b:0.1}, // warm, brownish, gas giant able to fuse duterium
        'Y': {mass: 0.01, luminosity: 1E-5, radius: 0.1, temp: 500, ci: 0, absmag: 17, bolo:0.1, r:1, g:0.3, b:0.1}, // warm, brownish, gas giant able to fuse duterium
        'P': {mass: 0.001, luminosity: 1E-6, radius:0.1, temp:150, ci:0, absmag: 19, bolo:0, r: 0.403, g: 0.27153, b: 0.1235} // brown, a gas giant
    };

    /*
     * ------------------------------------------------------
     * PROPERTY TABLES, LARGE, LOADED AT RUNTIME
     * ------------------------------------------------------
     */

    /**
     * properties are [type + range]
     * Generated from table here.
     * {@link http://www.isthe.com/chongo/tech/astro/HR-temp-mass-table-byhrclass.html}
     * Matches (not perfectly) magnitude lookup table here
     * {@link https://www.handprint.com/ASTRO/specclass.html}
     * TODO: compare to 2019 data
     * {@link http://www.pas.rochester.edu/~emamajek/EEM_dwarf_UBVIJHK_colors_Teff.txt }
     */
    PSpectrum.prototype.lumLookup = {};

    /**
     * compute colors based on blackbody temperature
     * {@link http://www.vendian.org/mncharity/dir3/blackbody/UnstableURLs/bbr_color_D58.html}
     * {@link http://www.vendian.org/mncharity/dir3/blackbody/UnstableURLs/bbr_color.html}
     */
    PSpectrum.prototype.bbColors = [];

    /**
     * [type + range + luminosity] lookup table
     * e.g. 'O1Ia0'
     * {@link http://www.isthe.com/chongo/tech/astro/HR-temp-mass-table-byhrclass.html}
     */
    PSpectrum.prototype.trlLookup = {};
    PSpectrum.prototype.trlLookupKeys = [];

    /**
     * [type + luminosity] lookup table
     * e.g. '0-III'
     * Computed from the TRL table above, used when spectra don't have a range, also white dwarfs
     * NOTE: Some types(e.g. Iab) were computed by averaging two types, e.g. AVERAGE(Ia, Ib)
     * NOTE: Some times are merged, following the encoding tables:
     * {@link https://archive.stsci.edu/spec_class/spec_class_tables.html)
     */
    PSpectrum.prototype.tlLookup = {};
    PSpectrum.prototype.tlLookupKeys = [];

    /*
     * ------------------------------------------------------
     * LOOKUP TABLES FOR DESCRIPTIONS
     * ------------------------------------------------------
     */

    /**
     * 1. replace some luminosity patterns in the spectrum string for easier parsing
     * 2. replace obsolete spectral classes with modern ones
     * 3. use the spectral mapping at:
     * {@link https://archive.stsci.edu/spec_class/spec_class_tables.html}
     * 4. NOTE: since we use .indexOf, we take the longest match
     TODO: HAVE TO MAKE THIS WORK BETTER...
     */
    PSpectrum.prototype.dSpectrumTrans = { 
        'Ia-0':'Ia0',
        'Ia+':'Ia0',
        '0-Ia':'Ia0',
        'Ia-0/Ia':'Ia',
        'Ia0-Ia':'Ia',
        'Ia/ab':'Ia-Iab',
        'Ib-IIa':'II', // cancel out
        //'IIa' 'II',
        //'IIb': 'II',
        'IIb-III':'II-III',
        'IIb-IIIa': 'II-III',
        'I-II': 'Ib',
        'I/II': 'Ib',
        'III-V':'IV',
        'III/V': 'IV',
        //'IIIa': 'III', // these are slightly brighter than III
        //'IIIb': 'III', // these are slightly dimmer than III
        'III/III-IV':'III/IV',
        'IVb': 'Iva/V',
        'IVab':'IV',
        'IVa-V':'IV/V',
        'IVa/V': 'IV/V',
        'Va':'V',
        'Va+':'V',
        'Va-':'V',
        'Va-V':'V',
        'Vab':'V',
        'Vb':'V-VI',
        'Vz':'V-VI', 
        'Vb-Vz':'V-VI',
        'esd':'VII',
        'R': 'C-R', // modern notation for obsolete classes
        'N': 'C-N',
        'DG': 'DZ', // modern notation for obsolete classes
        'DK': 'DZ',
        'DM': 'DZ',
        'DF': 'DZ',
        'DX': 'DZ'
    };

    /**
     * key array for .dSpectrumTransKeys, for rapid lookup. sorted in constructor
     */
    PSpectrum.prototype.dSpectrumTransKeys = [];

    /**
     * Yerkes prefixes in front of primary letter type, translate to standard luminosity from
     * the Mt. Wilson classes. Also includes some mappings for SIMBAD from:
     * {@link https://archive.stsci.edu/spec_class/spec_class_tables.html}
     * EXAMPLE: sdB5 -> B5VI 
     */
    PSpectrum.prototype.dLumPrefixTrans = {
        'sd': 'VI',
        'd': 'V',
        'sg': 'I',
        'g': 'III',
        'c': 'Ia'
    };

    /**
     * letter code, Primary type (based on temperature)
     * sub-types for 'W' (Wolf-Rayett), greater detail
     * {@link https://en.wikipedia.org/wiki/Wolf%E2%80%93Rayet_star}
     * white dwarf subtypes
     * {@link https://en.wikipedia.org/wiki/Stellar_classification#Extended_spectral_types}
     */
    PSpectrum.prototype.dStarType = {
        'LBV': 'Luminous blue variable, one of the brightest stars in the universe, unstable, irregular variable, nova-like outbursts',
        'W': 'Wolf-Rayet star, helium-fusing, mass loss through stellar wind, expanding atmospheric envelope',
        'WR': 'Wolf-Rayet star, young, helium-fusing, stellar wind mass loss, expanding atmospheric envelope',
        'WC': 'Wolf-Rayet star, helium-fusing, stellar wind mass loss, producing dust, strong Carbon and Helium lines, Helium absent',
        'WN': 'Wolf-Rayet star, helium-fusing, stellar wind mass loss, CNO cycle burn, strong Helium and Nitrogen lines',
        'WO': 'Wolf-Rayet star, helium-fusing, stellar wind mass loss, strong Oxygen lines, weak Carbon lines',
        'WC10': 'Wolf-Rayet star, helium-fusing, cooler, stellar wind mass loss, strong Carbon lines',
        'WC11': 'Wolf-Rayet star, helium-fusing, coolest, stellar wind mass loss, strong Carbon lines',
        'WNh' : 'Wolf-Rayet star, young and massive, helium and hydrogen fusion, stellar wind mass loss',
        'WN10': 'Wolf-Rayet star, helium-fusing, cooler, stellar wind mass loss, strong Nitrogen lines',
        'WN11': 'Wolf-Rayet star, helium-fusing, coolest, stellar wind mass loss, strong Nitrogen lines',
        'O': 'Blue star, ultra-hot supergiant, ionized He lines',
        'A': 'Blue star, 1.4-2.1 times more massive than Sun, strong H lines', // (sub)giant or dwarf
        'B': 'Blue-White star, 2-15 times more massive than Sun, neutral He lines', // (sub)giant or dwarf
        'F': 'Yellow-white star', // giant or dwarf
        'G': 'Yellow star', // giant or dwarf
        'K': 'Orange star', // giant or dwarf
        'M': 'Red star', //giant or dwarf or subdwarf
        'MS': 'Red giant, asymptotic-giant branch carbon star, younger, intermediate between M and SC',
        'S': 'Red giant, sub-carbon star, asymptotic-giant-branch, similar carbon and oxygen abundance, zirconium, titanium oxide in spectrum, obsolete class',
        'SC': 'Red giant, older sub-carbon star, asymptotic-giant branch, zirconium, titanium oxide from s-process in spectrum, intermediate with S and C-N',
        'R': 'Red giant, carbon star equivalent of late G to early K-type stars, obsolete class, reclassified as C-R',
        'C-R': 'Red giant, carbon star, equivalent of late G to early K-type stars, no enhanced Ba line',
        'N': 'Red giant, older carbon star, giant equivalent of late K to M-type stars, obsolete class, reclassified as C-N',
        'C-N': 'Red giant, carbon star, older, giant equivalent of late K to M-type stars, diffuse blue absorption,',
        'C': 'Red star, Carbon-rich dust, often long-period variable',
        'C-J': 'Red giant, cool carbon star with a high content of carbon-13, strong isotopic bands of C2 and CN',
        'C-H': 'Red giant, halo Population II equivalent of the C-R red giants, very strong CH absorption',
        'C-Hd': 'Red giant, Hydrogen-deficient, weak CH, CN absorption',
        'D': 'White dwarf',
        'DO': 'White Dwarf, very hot, helium-rich atmosphere, ionized helium, 45-120,000K, He II spectral lines',
        'DA': 'White Dwarf, hydrogen-rich atmosphere or outer layer, 30,000K, strong Balmer hydrogen spectral lines',
        'DB': 'White Dwarf, helium-rich atmosphere, 15-30,000K, neutral helium, He I, spectral lines',
        'DQ': 'White Dwarf, carbon-rich atmosphere, < 13,000K atomic or molecular carbon lines',
        'DZ': 'White Dwarf, cool, metal-rich atmosphere, < 11,000K, merges DG, DK, DM, DF types',
        'DG': 'White Dwarf, cool, metal-rich atmosphere, 6000K (old classification, now DZ)',
        'DK': 'White Dwarf, metal-rich atmosphere (old classification, now DZ)',
        'DM': 'White Dwarf, metal-rich atmosphere (old classification, now DZ)',
        'DF': 'White Dwarf, metal-rich, CaII, FeI, no H (old classification, now DZ)',
        'DC': 'White Dwarf, cool, no strong spectral lines, < 11,000K',
        'DX': 'White Dwarf, spectral lines unclear',
        'DAB':'White Dwarf, hot, hydrogen and helium-rich atmosphere, neutral helium lines, 30,000K',
        'DAO':'White Dwarf, very hot, hydrogen and helium-rich atmosphere, ionized helium lines, >30,000K',
        'DAZ':'White Dwarf, hot, hydrogen-rich atmosphere, metallic spectral lines',
        'DBZ':'White Dwarf, cool, 15-30,000K, neutral helium, He I, spectral lines, metallic spectral lines',
        'Q': 'Recurring nova, white dwarf companion to mass donating star',
        'SN': 'Supernova',
        'L': 'Hot brown dwarf, lithium in atmosphere, dust grains',
        'T': 'Cool brown dwarf, methane in atmosphere',
        'Y': 'Gas giant, warm, able to fuse deuterium',
        'P': 'Gas giant, cold, Jupiter-like',
        '': 'Unknown stellar type'
    };

    /**
     * Luminosity, Harvard classification:
     * [prefix + type code + numeric code (0-9) + luminosityClass + suffix (mods)]
     * NOTE: keys generated, sorted by length during spectral parsing
     * NOTE: numbers used in picking a sprite index in PCelestial
     * {@link https://amedleyofpotpourri.blogspot.com/2019/12/stellar-classification.html}
     * {@link https://github.com/codebox/stellar-classification-parser.git}
     */
    PSpectrum.prototype.dStarLumClass = {
        'Ia0': ' Hypergiant',
        'Ia+': ' Hypergiant',
        'Ia': ' Highly Luminous Supergiant',
        'Iab': ' Intermediate size Luminous Supergiant',
        'Ib': ' Less Luminous Supergiant',
        'I': ' Supergiant',
        'II': ' Bright Giant',
        'IIa': ' More luminous Bright Giant',
        'IIab': ' Intermediate bright Giant',
        'IIb': ' Less luminous Bright Giant',
        'III': ' Giant',
        'IIIa': ' Giant',
        'IIIab': ' Intermediate luminous Giant',
        'IIIb': ' Less luminous Giant',
        'IV': ' Sub-Giant',
        'IVa': ' More luminous Sub-Giant',
        'IVb': ' Less Luminous Sub-Giant',
        'VIab': ' Luminous dwarf',
        'V' : ' Dwarf (Main Sequence)',
        'Va' : ' Luminous Dwarf (Main Sequence)',
        'Vb' : ' Less luminous Dwarf (Main Sequence)',
        'Vab': ' Intermediate size Dwarf (Main Sequence)',
        'Vz' : ' Lower Main Sequence Dwarf',
        'VI' : ' Sub-Dwarf',
        'VIa' : ' Luminous Sub-Dwarf',
        'VIb' : ' Less Luminous Sub-Dwarf',
        'VII' : ' White-Dwarf',
        'VIIa' : ' Luminous White-Dwarf',
        'VIIb' : ' Less Luminous White-Dwarf',
        ':' : 'Uncertain luminosity',
        '' : ' Unknown luminosity'
    };

    /**
     * Suffix after prefix, letter type, luminosity
     * [prefix][letter type][numeric code 0-9][luminosity][suffix]
     * delta-del suffix:
     * {@link https://www.handprint.com/ASTRO/specclass.html}
     * {@link https://en.wikipedia.org/wiki/Wolf%E2%80%93Rayet_star}
     */
    PSpectrum.prototype.dStarMods = {
        ':' : ', blended or uncertain spectral values',
        '...' : ', undescribed spectral pecularities exist',
        '!' : ', special spectral peculiarities',
        '+': ', composite spectrum, unresolved binary',
        'b': ', broad strong spectral lines',
        'd Del': ', type A or F giant with weak calcium H and K lines, similar to prototype Delta Delphini',
        'd Sct': ', type A or F star with spectra similar to the short-period variable Delta Scuti',
        'delta del': ', chemically peculiar, hot main-sequence, sharp metallic absorption lines, contrasting broad (nebulous) neutral helium absorption lines.',
        'comp' : ', composite spectrum, unresolved binary or multiple star',
        'd': ', dust (occasionally vd, pd, or ed for variable, periodic, or episodic dust',
        'e' : ', emission lines present',
        '(e)': ', forbidden emission lines present',
        '[e]': ', forbidden emission lines present',
        'eq': ', emission lines with P Cygni profile',
        'er': ', emission lines reversed with center of emission lines weaker than edges',
        'E'  : ', white dwarf with emission lines present',
        'f' : ', N III and He II emission',
        'f*': ', N IV λ4058Å is stronger than the N III λ4634Å, λ4640Å, & λ4642Å line',
        'f+': ', Si IV λ4089Å & λ4116Å are emitted in addition to the N III line',
        '(f)' : ', N III emission, absence or weak absorption of He II',
        '((f))': ', He II and weak N III emission',
        'f?p': ', strong magnetic field',
        'h': ', WR stars with hydrogen emission lines',
        'ha': ', WR stars with hydrogen seen in both absorption and emission.',
        'He wk': ', weak Helium lines',
        'H'  : 'Magnetic white dwarf without detectable polarization',
        'k': ', spectra contains interstellar absorption features',
        'm' : ', enhanced metal features',
        'n' : ', broad ("nebulous") absorption due to spinning',
        'nn' : ', very broad absorption features (rotating fast)',
        'neb': ', a nebula spectrum is mixed in',
        'P'  : ', Magnetic white dwarf with detectable polarization',
        'PEC': ', White dwarf, peculiarities exist',
        'pec': ', White dwarf, peculiarities exist',
        'p': ', chemically peculiar star, strong metal spectral lines',
        'pq': ', peculiar, similar to nova spectrum',
        'q': ', P Cygni profile, expanding gaseous envelope',
        's': ', narrow absorption lines',
        'ss': ', very narrow absorption lines',
        'sh': ', shell star features',
        '(SB2)': ', spectroscopic binary, both stars visible in spectrum',
        '(SB1)': ', spectroscopic binary, only brighter star visible in spectrum',
        'v': ', variable spectral feature',
        'var': ', variable spectral features',
        'V'  : ', Variable white dwarf',
        'w': ', weak spectral lines',
        'wl': ', weak spectral lines',
        'wk': ', weak spectral lines',
        'Ba': ', strong Barium emission lines',
        'Ca': ', strong Calcium emission lines',
        'Cr': ', strong Chromium emission lines',
        'CN': ', cyanide radical emission lines',
        'Eu': ', strong Europium emission lines',
        'Fe': ', strong Iron emission lines',
        'He': ', strong Helium emission lines',
        'Hg': ', strong Mercury emission lines',
        'K': ', strong Potassium emission lines',
        'Mn': ', strong Manganese emission lines',
        'Si': ', strong Silicon emission lines',
        'Sr': ', strong Strontium emission lines',
        'Tc': ', strong Technetium emission lines',
        'Zr': ', strong Zirconium emission lines'
    };

    // methods

    /*
     * ------------------------------------------------------
     * PARSING
     * ------------------------------------------------------
     */

    /**
     * reconstruct the position of '-' and '/' in the original spectrum string, 
     * and assign the type of subspectrum. Compare by looping through the original 
     * spectral string, and determing what symbol preceded the splits.
     * @param {Array} spects the spectrum string, split by '/' and '-'
     * @param {String} orig the original spectrum
     */
    PSpectrum.prototype.getSubspectra = function (spects, orig) {
        let pdata = this.pdata,
        role = pdata.SPECT_ROLES,
        props = [],
        sIndex = 0,
        hit = 0,
        r = 0,
        sRole = role.PRIMARY;

        for (let i = 0; i < orig.length; i++) {
            r = orig[i];
            if (r == '/' || r == '-') {
                props.push(pdata.createPSpectrum(spects[sIndex], sRole));
                hit = i;
                if (r == '/') sRole = role.COMPOSITE;
                else if (r == '-') sRole = role.INTERMEDIATE;
                sIndex++;
            }
        }
        if (hit < orig.length) {
            if (r == '/') sRole = role.COMPOSITE;
            if (r == '-') sRole = role.INTERMEDIATE;
            props.push(pdata.createPSpectrum(spects[sIndex], sRole));
        }

        return props;
    };

    /**
     * transform spectra tokens as defined as Simbad, e.g.,
     * Ia-0 -> Ia0, Ia+ ->Ia0, Ia-0/Ia -> Ia0-Ia, Ia-ab -> Ia/Iab, IVb -> Iva/V, Vb -> V-VI, Ia/ab -> Ia-Iab
     * III/III-IV -> III/IV (small difference)
     * {@link http://simbad.u-strasbg.fr/simbad/sim-display?data=sptypes}
     * {@link https://en.wikipedia.org/wiki/Chemically_peculiar_star}
     * {@link https://heasarc.gsfc.nasa.gov/W3Browse/all/cpstars.html}
     * transform lookup defined at:
     * {@link https://archive.stsci.edu/spec_class/spec_class_tables.html}
     */
    PSpectrum.prototype.transformSpec = function (spect) {

        let s = this.dSpectrumTransKeys;

        // find the key in the sorted list (largest keys at beginning)
        for (var i = 0; i < s.length; i++) {
            if (spect.indexOf(s[i]) !== -1) {
              return spect.replace(s[i], this.dSpectrumTrans[s[i]]);
            }
        }
        return spect;
    };

    /**
     * Convert the Yerkex prefix to a Harvard luminosity value, and remove from spectrum.
     * @param {String} spect the spectrum
     * @param {Object} prop the properties output object, defined in PData
     */
    PSpectrum.prototype.transformYerkesPrefix = function (spect, prop) {
        if (spect.length) {
            for (let i in this.dLumPrefixTrans) {
                let l = spect.indexOf(i);
                if (l == 0) {
                    // don't replace if 'g' is a single letter (meant to be the type)
                    if (spect != 'g' && spect != 'g-') {
                        lum = this.dLumPrefixTrans[i];
                        prop.luminosity.key = this.dLumPrefixTrans[i]; // use to get desc
                        return spect.substring(i.length); // swap luminace to end
                    }
                }
            }
        }
        return spect;
    };

    /**
     * parse the primary (single-letter) spectrum type, branching to subtype if necessary.
     * use the sorted keylist to find the type. Having it sorted by size removed ambiguity ('DZ' vs 'D')
     * @param {String} spect the current spectrum string (may be truncated)
     * @param {Object} prop stellar property, defined in PData
     */
    PSpectrum.prototype.parseSpectrumType = function (spect, prop) {
        // TODO: handle lower-cased spectra better
        // try to catch spectra like 'a-b' or 'k-m'
        if (prop.role == this.pdata.SPECT_ROLES.PRIMARY && spect.parseNumeric() == null) {
            oldSpect = spect;
            spect = spect.toUpperCase();
        };

        // check against the size-sorted keylist of .dStarMods (created in the constructor)
        for (let i = 0; i < this.dStarTypeKeys.length; i++) {
            let k = this.dStarTypeKeys[i];
            let p = spect.indexOf(k);
            if (p == 0) { //MUST start at position zero
                prop.type.key = k;   // type, key for description
                return spect.replace(k, ''); // remove from the spectra
            }
        }
        return spect;
    };

    /**
     * parse the spectrum range (0-9) between types
     * @param {String} spect the current spectrum string (may be truncated)
     * @param {Object} prop stellar property, defined in PData
     */
    PSpectrum.prototype.parseSpectrumRange = function (spect, prop) {
        let r = spect.parseNumeric(); // pull the FIRST number encountered only
        if (r) {
            if (r > 9) r = 9; // handle extremely rare stuff like 'B10'
            prop.range.key = r.num + ''; // force key to string
            prop.range.value = r.num;
            return spect.substring(r.start2);
        }
        return spect;
    };

    /**
     * parse the luminosity classification
     * use the sorted keylist to find the type. Having it sorted by size removed ambiguity ('DZ' vs 'D')
     * @param {String} spect the current spectrum string (may be truncated)
     * @param {Object} prop stellar property, defined in PData
     */
    PSpectrum.prototype.parseSpectrumLuminosity = function (spect, prop) {
        if (spect.length) {
            // check against the size-sorted keylist of .dStarLumClassKeys (created in the constructor)
            for (let i = 0; i < this.dStarLumClassKeys.length; i++) {
                let k = this.dStarLumClassKeys[i];
                let p = spect.indexOf(k);
                if (p == 0) { // MUST start at position zero
                    prop.luminosity.key = k; // type, key for description
                    return spect.replace(k, ''); // remove from the spectra
                }
            }
        }
        return spect;
    };

    /**
     * parse modifiers for the spectrum
     * @param {String} spect the current spectrum string (may be truncated)
     * @param {Object} prop stellar property, defined in PData
     */
    PSpectrum.prototype.parseSpectrumMods = function (spect, prop) {
        if (spect.length) {
            // check against the size-sorted keylist of .dStarMods (created in the constructor)
            for (let i = 0; i < this.dStarModKeys.length; i++) {
                if (spect.indexOf(this.dStarModKeys[i]) !== -1) {
                    spect = spect.replace(this.dStarModKeys[i], ''); // remove from the spectra
                    if(prop.mods.keys.indexOf(i) == -1) { // avoid duplicates
                        prop.mods.keys.push(this.dStarModKeys[i]); // don't break so we get all the mods
                    }
                }
            }
        }
        return spect;
    };

/////////////////////////////////////////////////////
    PSpectrum.prototype.ab = []; //TEMP TO COLLECT HYG PROPERTIES NOT IN SPECTRUM PROPS

    /**
     * Use stellar spectum (Harvard/Yerkes classification) to extract stellar data
     * {@link https://en.wikipedia.org/wiki/Stellar_classification}
     * [prefix][type code] [numeric code 0-9] [Yerkes luminosity] [suffix]
     * adds properties to the supplied 'star' object in hyg3 fields
     * extended descriptions based on type and luminosity
     * @param {Object} hyg hyg3 data fields
     * @param {Object} props stellar properties object, defined in PData
     */
    PSpectrum.prototype.spectrumToStellarData = function (hyg) {

        let util = this.util;
        let pdata = this.pdata;

        let props = [];

        if (!hyg) return false;

        // get a whitespace-free copy for processing
        let spect = hyg.spect.stripWhitespace();

        this.stats.total++;

        // if we don't have a spectra, approximate from hyg3 values (needed to generate descriptions)
        if(!hyg.spect.length) {
            spect = this.computeSpectFromHyg(hyg);
        } else this.stats.parsed++;

        // if there is a spectrum, parse it
        if (spect && spect.length) {

            // replace a few patterns for easier parsing
            spect = this.transformSpec(spect);

            // split along composite ('OR', '/') or intermediate ('AND', '-')
            let spects = spect.split(/\/|-/);

            // figure out the type of the sub-spectra (primary, composite, intermediate)
            props = this.getSubspectra(spects, spect);

            // loop through the sub-spectra and extract keys for [type + range + luminosity + mods]
            for(let i = 0; i < props.length; i++) {

                let p = props[i];
                let s = p.spect;

                s = this.transformYerkesPrefix(s, p);
                s = this.parseSpectrumType(s, p);
                s = this.parseSpectrumRange(s, p);

                // TODO: kludge to capture failed luminosity for inclusion
                let bob = s; ////////////////////////////////////////////

                s = this.parseSpectrumLuminosity(s, p);

                // TODO: if unchanged (not truncated) save the hyg record
                if (bob != s) { //////////////////////////////////////
                    ///console.log('failed lum lookup')
                    let temp = 0; let radius = 0;
                    if (hyg.ci) temp = this.computeTempFromBV(hyg.ci);
                    if (temp) radius = this.computeRadius(temp, hyg.lum);
                    if(s.indexOf('K2IIb') != -1) {
                        this.ab.push(
                            hyg.spect + ',' +
                            hyg.mass + ',' +
                            hyg.lum + ',' +
                            radius + ',' +
                            temp + ',' +
                            hyg.ci + ',' +
                            hyg.absmag + ',' +
                        ''
                        );
                    }
 
                }

                s = this.parseSpectrumMods(s, p);

            } // end of loop through sub-spectra

            // lookup the [type][range][luminosity] for stellar properties
            p = this.lookupSpectrumProps(hyg, props);

        } // end of 'spect' exists
        else {
            // hyg entries with no spect string, couldn't define it based on hyg properties
            console.error('no spect for hyg:' + hyg.id)
        }

        // add properties and descrptions to the hyg object
        this.mergeHygWithProps(hyg, props);

        return hyg;

    };

    /*
     * ------------------------------------------------------
     * GENERATE SPECTRUM FROM HYG
     * ------------------------------------------------------
     */

    /**
     * if we are missing a spectra, try to compute an approximation from the 
     * absolute magnitude and color index (ci) b-v. 
     *
     * NOTE: we do this BEFORE trying to merge Hyg and our spectral parsing 
     * results. That way, we can add stellar properties and descriptions 
     * in the same pathway
     * @param {Object.PData.hyg} hyg a hyg3 database record
     * @return {String} computed spectrum
     */
    PSpectrum.prototype.computeSpectFromHyg = function (hyg) {

        let util = this.util;
        let key = '';

        // store the fact that we were computed
        hyg.computed = true;
        hyg.computedType = true;
        this.stats.computed++;

        // no spectra, no B-V color index
        if (!util.isNumber(hyg.ci, true)) return this.lastDitchProps(hyg);

        // parameters we need to compute the spectra
        let temp = Math.round(this.computeTempFromBV(hyg.ci)),
        tempRange = 1000, // degrees Kelvin, empirically determined from hyg3 dataset
        lum = hyg.lum; // luminosity

        let keys1 = [], keys1diff = [], keys2 = [], keys2diff = [];

        let lumDiff = 0.1;    // % difference
        let oldDiff = 1E10+14; // starting difference (for picking best key)

        // first scan - select all types within a temperature range
        for (let i in this.trlLookup) {
            let s = this.trlLookup[i];
            let td = Math.abs(temp - s.temp);
            if (td < tempRange) {
                keys1.push(i);
                keys1diff.push(td);
            }
        }

        if (keys1.length < 1) console.log('no temp match for:' + hyg.id + ' temp:' + temp)

        // if we found just one, return
        if (keys1.length == 1) return keys1[0];

        // second scan - differentiate by luminosity
        for (let i = 0; i < keys1.length; i++) {
            let s = this.trlLookup[keys1[i]];
            let ld = Math.abs(lum - s.luminosity);
            let max = Math.max(lum, s.luminosity);
            if (ld < oldDiff) {
                keys2.push(keys1[i]);
                keys2diff.push(ld);
                oldDiff = ld;
                key = keys1[i];
            }
        }

        return key;

    };

    /**
     * last-ditch assignment, when:
     *  1. No spectra in hyg record
     *  2. set by luminosity, when very low, set to Brown or Red Dwarf
     * {@link https://en.wikipedia.org/wiki/Red_dwarf}
     * Otherwise, set it to a G giant or G dwarf
     * @param {PData.HygObj} hyg - hyg database record
     * @param {PData.PSpectrum[]} props - properties
     * @return {String} approximate spectra
     */
    PSpectrum.prototype.lastDitchProps = function (hyg) {
        let pdata = this.pdata;

        hyg.computed = true;
        hyg.computedLastDitch = true;
        this.stats.lastDitch++;

        if (hyg.dist == pdata.HYG_CONSTANTS.max_dist) {
            if (hyg.absmag < -9.2) return 'B0Ia';
        }
        else if (hyg.absmag < -3) return 'G2II';
        else if (hyg.absmag <= 0) return 'G2III';
        else if (hyg.lum < 0.2) { // red or brown dwarf
            let l = hyg.lum;
            if (l < 0.0001) return 'T4V'; // brown dwarf
            else if (l <= 0.00015) return 'M9V'; // red dwarf
            else if (l <= 0.0003) return 'M8V';
            else if (l <= 0.0005) return 'M7V';
            else if (l <= 0.0009) return 'M6V';
            else if (l <= 0.0022) return 'M5V';
            else if (l <= 0.055) return 'M4V';
            else if (l < 0.015) return 'M3V';
            else if (l < 0.023) return 'M2V';
            else if (l < 0.035) return 'M1V';
            else if (l < 0.072) return 'M0V';
        }

        hyg.guess = true;
        return 'G5V';

    };

    /*
     * ------------------------------------------------------
     * ADJUST SPECTRUM PROPERTIES
     * ------------------------------------------------------
     */

    /**
     * Estimate luminosity class (eg. Ia0, Ia, II, III...) from type, absolute magnitude lookup table
     * 1. find type + range in .lumLookup table
     * 2. Scan the absolute magnitudes associated type type + range
     * 3. Choose the luminosity class with the closest absolute magnitude
     *
     * NOTE: mismatch of luminosity class with reported luminosity probably is a distance error
     * NOTE: doesn't work for white dwarves (no luminosity class assigned)
     *
     * @param {Object.PData.PSectrum} prop properties extracted from spectra string
     * @param {Number} absmag from hyg, absolute magnitude of the star
     * @param {Number} luminosity from hyg, of star, in Star/Sol ratio
     */
    PSpectrum.prototype.lookupLuminosityClass = function (hyg, prop) {

        let util = this.util;

        let t = prop.type.key, 
        r = prop.range.key, 
        l = prop.luminosity.key,
        absmag = hyg.absmag,
        tr, lc;

        // if we already have a luminosity class, return
        if (l.length) return true;

        // no luminosity class, so create [type + range] lookup key for luminosity ranges
        if (t.length) {

            // if this is a white dwarf, return
            if (t[0] == 'D') return true;

            prop.computed = true;
            hyg.computedLumClass = true;

            // do a luminosity lookup by [type + range]
            if (r.length && util.isNumber(r)) {

                if (prop.range.key > 9) r = 9; // clamp 'A10' to 'A9'
                else r = Math.round(prop.range.key); //clamp 'MV5.5' to 'MV5'

                tr = prop.type.key + r; 
                lc = this.lumLookup[tr];

                // We found the [type + range], luminosity class versus absolute magnitude
                if (lc) {

                    // find the closest table match to our luminosity by absolute magnitude
                    let flag = false;
                    let lumMatch = util.getKeyForClosestNumericValue(lc, absmag);
                    if (hyg.id == '74958') window.lumMatch = lumMatch;

                    // store luminosity class
                    if(lumMatch.key) {
                        prop.luminosity.key = lumMatch.key;  // from lookup table
                        prop.luminosity.value = hyg.lum;
                    }

                } else {
                    // This fails for lum classes we don't have properties for (e.g. IIIa, IIIb)
                    // TODO: generate these by averaging all properties for a [type + lum]
                    console.warn('lookupLuminosityClass id:' + hyg.id + ' found type-key (' + tr + ') but no luminosity class:')
                }

            } else { // best match by type only
            
                let lumKeys = {};
                let oldDiff = 1E+14;
                for (let i in this.lumLookup) {
                    let lum = this.lumLookup[i];
                    if (i.indexOf(t) == 0) {
                        lumKeys[i] = util.getKeyForClosestNumericValue(lum, absmag);
                        if (lumKeys[i].diff < oldDiff) {
                            oldDiff = lumKeys[i].diff;
                            prop.luminosity.key = lumKeys[i].key;
                        }
                    }
                }
                if (prop.luminosity.key == '')
                    console.log("NOVA - NO KEY, id:" + hyg.id + " TYPE:" + t + " KEY IS NOW:(" + prop.luminosity.key + ") DIFF:" + oldDiff + ' spect:' + hyg.spect + " lum:" + hyg.lum)

            }

        } // type exists

        return false;
    };

    /**
     * Use get spectrum props from lookup table using [type + range + luminosity class]
     * {@link http://www.isthe.com/chongo/tech/astro/HR-temp-mass-table-byhrclass.html}
     * @param {Object} prop stellar properties object
     */
    PSpectrum.prototype.lookupSpectrumProps = function (hyg, props) {
        let util = this.util;
        let role = this.pdata.SPECT_ROLES;

        if (props.length) {

            let t, r, l;

            let primary = props[0]; // primary spectral type

            // If we don't have a luminosity for a non-White Dwarf, estimate
            t = primary.type.key,
            l = primary.luminosity.key;
            if (!l && t[0] != 'D') { // white dwarves don't have a luminosity class, 'VII' obsolete
                hyg.computed = true;
                this.lookupLuminosityClass(hyg, primary);
                l = primary.luminosity.key;
                if (!l) console.log("FAILED TO FIND luminosity FOR id:" + hyg.id + " key:" + primary.type.key + ' lum:' + hyg.lum)
            }

            // loop through all sub-spectra
            for (let i = 0; i < props.length; i++) {
                let prop = props[i];
                let pp, lp;

                t = prop.type.key,
                r = prop.range.key,
                l = prop.luminosity.key;

                ////////////////////////////
                if (hyg.computed) prop.computed = true;
                ////////////////////////////

                /*
                 * rewrite the '8' prop in 'A7/8' as 'A7', 'A8'
                 * rewrite the 'II' prop in 'A5/8II' as 'A5II, A8II'
                 */
                switch (prop.role) {

                    case role.PRIMARY:
                        if (!r) { // secondary loop through non-primary props
                            for (let j = 1; j < props.length; j++) {
                                if (props[j].range.key.length) {
                                    primary.range.key = props[j].range.key;
                                    r = primary.range.key;
                                    break;
                                }
                            }
                        }
                        if (!l) {
                            for (let j = 1; j < props.length; j++) {
                                if (props[j].luminosity.key.length) {
                                    primary.luminosity.key = props[j].luminosity.key;
                                    l = primary.luminosity.key;
                                    break;
                                }
                            }
                        }
                    break;

                    case role.INTERMEDIATE:
                    case role.COMPOSITE:
                        // if primary is empty, fill from here (not getting A8/A9/B2 correctly)
                        if (!primary.range.key) {
                            primary.range.key = primary.range.value = prop.range.key;
                        }
                        if (!primary.luminosity.key) {
                            primary.luminosity.key = prop.luminosity.key;
                        }
                        // if empty, fill from primary
                        if (!t) prop.type.key = t = primary.type.key;
                        if (!r) prop.range.key = r = primary.range.value;
                        if (!l) prop.luminosity.key = l = primary.luminosity.key;
                    break;

                };

                lp = t;

                // regenerate the combined type - range - luminosity key
                if(util.isNumber(r)) {
                    r = Math.round(r); //convert 'MV5.5' to 'MV5'
                    lp += r; // only add range if present
                    if(l.length) {
                        lp += l; // only add luminosity if present
                    }

                    // lookup by [type + range + luminosity class], about 1100 possible types, incd white dwarfs
                    pp = this.trlLookup[lp];

                }

                // lookup by weighted averages for [type + luminosity class]
                if (!pp && t[0] != 'D') {
                    pp = this.tlLookup[t + '-' + l];

                    // TODO: would need average type + luminosity for classes like IIb
                    //if (!pp) {
                    //    console.log('id:' + hyg.id + ' lum lookup failed with t:' + t + r + ' l:' + l + ' lum:' + hyg.lum + ' class:' + prop.luminosity.key + ' absmag:' + hyg.absmag)
                    //}
                }

                // no lookup hits, assign default stellar type properties (inaccurate)
                if (!pp) {
                    pp = this.dStarProps[t];
                    ////////if (pp) this.stats.failedLookup.push(prop);
                }

                // Look for strange luminosity-class combinations
                if (hyg.lum < 0.1 && prop.type.key[0] != 'M' && prop.type.key[0] != 'D') {
                    console.log("FUNKY lum and type, id:" + hyg.id + " type:" + prop.type.key + ' absmag:' + hyg.absmag + ' and lumclass:' + prop.luminosity.key + ' and lum:' + hyg.lum)
                }

                if (pp) {
                        prop.lookupSpectra = lp; // save our final lookup spectra
                        prop.mass.value = pp.mass;
                        prop.luminosity.value = pp.luminosity;
                        prop.radius.value = pp.radius,
                        prop.temp.value = pp.temp,
                        prop.ci.value = pp.ci,
                        prop.absmag.value = pp.absmag,
                        prop.bolo.value = pp.bolo,
                        prop.color.r = pp.r,
                        prop.color.g = pp.g,
                        prop.color.b = pp.b;
                } else {
                        this.stats.nolookup++; ///////////////////////////////////////
                        console.warn('lookupSpectrumProps WARN: Lookup, no matching spectral type for:(' + prop.type.key + '), role:' + prop.role);
                }

            } // end of loop through props

        } else {
            console.warn('lookupSpectrumProps WARN: no props');
        }
        return props;
    };

    /** 
     * Add properties to the hyg object, computed from the spectra
     * 1. always use the primary type to set values
     * 3. if details, store ALL the props
     * FIELDS: we're assuming some fields in hyg3 are ALWAYS filled
     *           a) 'absmag'
     *           b) 'lum'
     *         some are only filled part of the time
     *           a) 'spect'
     *           b) 'ci'
     * TYPE: we create a new 'type' from [type + lum]
     *       type: {type: xxx, range: xxx, lumclass: xxx}
     * 
     * @param {Object} hyg the returned json object describing a star
     * @param {Array} props the array of properties taken from the stellar spectra
     * @param {Boolean} details if true, store all the props, otherwise, just store the primary prop
     */
    PSpectrum.prototype.mergeHygWithProps = function (hyg, props = []) {
        let pdata = this.pdata;
        let util = this.util;

        // add new fields to hyg so it matches our internal standard
        hyg = pdata.fixHygObj(hyg);

        // set some properties based only on primary (props[0])
        let primary = props[0];

        // use all sub-spectra to augment the hyg3 object
        for (let i = 0; i < props.length; i++) {

            let prop = props[i];
            let mods = prop.mods.keys;

            switch (prop.role) {

                case pdata.SPECT_ROLES.PRIMARY: // augment hyg3 values

                    // ci is not always present in hyg3, so add it if we got it from lookup
                    if (hyg.ci == '' && (prop.ci != pdata.EMPTY)) hyg.ci = prop.ci.value;

                    // hyg doesn't have temperature, so compute/lookup temperature, assured that we have a ci
                    if (prop.temp.value && !hyg.temp) hyg.temp = prop.temp.value;
                    else if (hyg.ci) hyg.temp = this.computeTempFromBV(hyg.ci);

                    // get radius from lookup, or absmag and temperature, or defaults
                    if (prop.radius.value) {
                        hyg.radius = prop.radius.value;
                    } else if (hyg.temp && !hyg.radius) {
                        hyg.radius = this.computeRadius(hyg.temp, hyg.lum);
                    } else {
                        hyg.radius = 1;
                    }

                    // get color from lookup (not initially in hyg3), or from temp, ci
                    let c = prop.color;
                    if (c.r + c.g + c.b > 0) {
                        hyg.r = c.r, hyg.g = c.g, hyg.b = c.b;
                    } else if (hyg.temp) {
                        let c = this.lookupColorFromBlackbody(hyg.temp);
                        hyg.r = c.r, hyg.g = c.g, hyg.b = c.b;
                    } else if (hyg.ci != '') {
                        let c = this.computeColorFromBV(hyg.ci); // approximation
                        hyg.r = c.r, hyg.g = c.g, hyg.b = c.b;
                    }

                    // for fast-rotating stars, add a rotation increment
                    let type = prop.type.key[0];
                    if(type == 'O' || type == 'A' || type == 'B' || type == 'W') 
                        hyg.rot = pdata.HYG_CONSTANTS.ROTATON_FAST;
                    if(mods.indexOf('nn') != -1) hyg.rot = pdata.HYG_CONSTANTS.ROTATION_VERY_FAST;
                    if (mods.indexOf('n') != -1) hyg.rot = pdata.HYG_CONSTANTS.ROTATION_FAST; 

                    // TODO: DO THIS EARLY, NOT LATE. ADD TO EXISTING CLASSES LIKE 'A7'
                    // TOOD: DO LUMINOSITY CLASS LOOKUP
                    // TODO: FIX BROWN DWARFS

                    // create parsed type, [type, range, luminosity class]
                    hyg.primary = {
                        type: prop.type.key,
                        range: prop.range.value,
                        luminosity: prop.luminosity.key
                    };

                    // variable star (provide a default if we don't have magnitudes or cycle length)
                    if (hyg.var_min || hyg.var_max || 
                        m.indexOf('v') != -1 || m.indexOf('var') != -1 || m.indexOf('V') != -1) hyg.var = true;
                    else hyg.var = false; // don't need the variable nomenclature

                    // dust
                    if(mods.indexOf('d') != -1) hyg.dust = true;

                    // gaseous envelope, like a planetary nebula
                       if(mods.indexOf('q') != -1) hyg.envelope = true;

                    break;

                case pdata.SPECT_ROLES.INTERMEDIATE:
                    hyg.intermediate.push({
                        type: prop.type.key,
                        range: prop.range.key,
                        luminosity: prop.luminosity.key
                    });
                    break;

                case pdata.SPECT_ROLES.COMPOSITE:
                    hyg.composite.push({
                        type: prop.type.key,
                        range: prop.range.key,
                        luminosity: prop.luminosity.key
                    });
                    break;

                default:
                    break;
            }

            // add descriptions in a loop
            hyg.description += this.getSpectraDesc(hyg, prop);

        } // end of loop through props

        return true;
    };

    /**
     * Dynamically build the stellar description when a Star is picked
     * Annoted H-R diagram at:
     * {@link https://web.njit.edu/~gary/321/Lecture6.html}
     * @param {Object.PData.PSpectrum} prop - a property object for part of the spectra string
     * @param {Object.HygObj} hyg - a hyg record
     */
    PSpectrum.prototype.getSpectraDesc = function (hyg, prop) {

        let pdata = this.pdata;
        let trl = prop.type.key + prop.range.key + prop.luminosity.key;

        let d = 'Type ' + trl + ', ' + this.dStarType[prop.type.key]; // long description
        let dd = d.substring(0, d.indexOf(' ')); // short, out to first ' ' in text

        // use luminosity class to make the description more specific
        if (prop.luminosity.key.length) d = d.replace(' star', this.dStarLumClass[prop.luminosity.key]);
        
        if (prop.type.key[0] != 'D' && this.dStarLumClass[prop.luminosity.key].indexOf('Unknown') != -1) {
            console.log('found unknown luminosity for: hyg.id:' + hyg.id + ' spect:' + hyg.spect + ' lum:' + hyg.lum);
        }

        switch (prop.role) {
            case pdata.SPECT_ROLES.PRIMARY:
                break;

            case pdata.SPECT_ROLES.INTERMEDIATE:
                // add comment, 'intermediate with' the intermediate type
                d = ', intermediate with ' + dd + ' ' + trl + this.dStarLumClass[prop.luminosity.key];
                break;

            case pdata.SPECT_ROLES.COMPOSITE:
                // if types are very different, flag as possible multiple star, if not already 'comp'
                d = ', composite with ' + dd + ' ' + trl + this.dStarLumClass[prop.luminosity.key] + ', (possible spectroscopic double or multiple star)';
                break;
        }

        // add the additional mod 'suffix' descriptions
        //for (let j = 0; j < prop.mods.keys.length; j++) {
        //    d += this.dStarMods[prop.mods.keys[j]]
        //}

        return d;

    };

    /*
     * ------------------------------------------------------
     * CONVERSION
     * ------------------------------------------------------
     */

    /**
     * compute approx temperature from blue-violet color index
     * Detailed Simulation
     * {@link https://astro.unl.edu/animationsLinks.html}
     * Discussion
     * {@link https://sites.uni.edu/morgans/astro/course/Notes/section2/spectraltemps.html}
     * @param {String} bv color index, blue-violet
     */
    PSpectrum.prototype.computeTempFromBV = function (bv) {
        return (4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62)));
    };

    /**
     * Convert b-v (colorindex) values reported to stars to RGB color
     * @param {Number} bv the b-v value for the stars
     * {@link https://stackoverflow.com/questions/21977786/star-b-v-color-index-to-apparent-rgb-color}
     * {@link https://en.it1352.com/article/cab2367e8d784310b3846a705478ace3.html}
     * {@link https://sites.uni.edu/morgans/astro/course/Notes/section2/spectraltemps.html}
     * {@link http://www.vendian.org/mncharity/dir3/blackbody/UnstableURLs/bbr_color.html}
     * {@link http://www.vendian.org/mncharity/dir3/starcolor/details.html}
     * The 2019 lookup table (more accurate for dwarfs)
     * {@link https://www.pas.rochester.edu/~emamajek/EEM_dwarf_UBVIJHK_colors_Teff.txt}
     */
    PSpectrum.prototype.computeColorFromBV = function (bv) {
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
     * temperature to blackbody color lookup table (2016 version, using CIE 1964 10 degree CMFs)
     * {@link http://www.vendian.org/mncharity/dir3/blackbody/UnstableURLs/bbr_color_D58.html}
     * @param {Number} temp - temperature in Kelvins
     * @return {Number} - {r, g, b}
     */
    PSpectrum.prototype.lookupColorFromBlackbody = function (temp) {
        /////////////////////////////////////console.log('lookup blackbody color');
        let t = Math.floor(temp / 100);
        t *= 100;
        if (t < 1000) t = 1000;
        else if (t > 40000) t = 40000;
        return this.bbColors[t];
    };

    /**
     * Compute absolute magnitude from magnitude
     * @param {Number} mag observed magnitude
     * @param {Number} dist distance in parsecs
     * {@link http://cas.sdss.org/dr3/en/proj/advanced/hr/radius1.asp}
     */
    PSpectrum.prototype.computeAbsmag = function (mag, dist) {
        return mag - (5 * (Math.log10(dist) - 1));
    };

    /**
     * Compute absolute magnitude using parallax instead of distance
     Open the query page for the main HIPPARCOS catalogue
     * Select the fields you want (defaults are ok for you)
     * Hit submit to see the results
     * You can limit the number of results and format under Preferences on the left
     * This table gives you the measured visual magnitude, i.e. the Apparent Magnitude (mV, V column). 
     * To convert that into Absolute Magnitude (MV) you need to know the distance to the star. 
     * This can be calculated using the Parallax field (Plx column).
     * {@link https://astronomy.stackexchange.com/questions/1799/absolute-magnitudes-of-stars}
     */
    PSpectrum.prototype.computeAbsmagfromParallax = function (mag, parallax) {
        // MV=mV+5∗log10(Plx/100)
        // Example: Alp1Cen (HR 5459) has vmag -0.01, and parallax 0.751 arc seconds. 
        // Therefore the distance is about 1/0.751 = 1.33 parsec. We get absolute visual magnitude
        // M=m−5⋅(log10DL−1)=−0.01−5⋅(log101.33−1)=4.37.
    };


    /**
     * Compute stellar radius, based on luminosity
     * - luminosity ratio to solar luminosity
     * - temperature ratio to solar temperature
     * {@link http://www.handprint.com/ASTRO/specclass.html}
     * R/R⊙ = √(L/L⊙)/(T/T⊙)4
     * @param {Number} temp absolute magnitude
     * @param {Number} lum luminosity
     */
     PSpectrum.prototype.computeRadius = function (temp, lum) {
        let util = this.util;
        return Math.sqrt(lum / Math.pow((temp / this.SOL.temp), 4))
     };

    /**
     * compute luminosity from radius and temperature
     * {@link http://www.handprint.com/ASTRO/specclass.html}
     * @param {Number} radius, expressed as L(Star) / L(Sun)
     * @param {Number} temp, expressed in kelvins.
     */
    PSpectrum.prototype.computeLuminosityfromRadTemp = function (radius, temp) {
        return Math.pow(radius, 2) * Math.pow(temp/this.SOL.temp, 4);
    };

    /** 
     * compute luminosity from absolute magnitude
     * {@link https://astronomy.stackexchange.com/questions/13709/relationship-between-absolute-magnitude-of-a-star-and-its-luminosity}
     */
    PSpectrum.prototype.computeLuminosityFromAbsMag = function (absmag) {
        return Math.pow(10, ((absmag - 4.77) / -2.5));
    };

    /**
     Compute absolute magnitude from luminosity
     @param {Number} luminosity the ratio of L(Star) / L(Sun)
     */
    PSpectrum.prototype.computeAbsMagFromLuminosity = function (luminosity) {
        return 4.77 - (2.5 * Math.log10(luminosity));
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
     * DATA/FILE LOADING FROM NETWORK
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
     * load hipparcos data
     * {@link https://heasarc.gsfc.nasa.gov/db-perl/W3Browse/w3table.pl?tablehead=name%3Dhipparcos&Action=More%20Options}
     */
    PSpectrum.prototype.loadDatafromHipparcos = function (query, options) {
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

        //id = 'HD48915'; // Sirius, HD query
        //id = 'HIP'
        //id = 'HIP32349';
        //id = 'HIC32349';
        //id = 'GaiaDR26423349579465419392';
        //id = 'Sirius'; // get several things back
        //id = '2MASS%20J07332733-5035032';

        // by name NAME ALTAIR

        // json query
        let url = 'https://simbad.u-strasbg.fr/simbad/sim-nameresolver?Ident='+id+'&data=I.0,J,M(U,B,V,G),S,I&output=json';

        this.util.asyncJSON(url, function(json) {

            /*
             * the result comes back as an array, with all objects matching the ID
             * for example, a query for Sirius gets two results, Sirius and its white 
             * dwarf companion
             */
            if (json) {
                if (!resFn) {
                    resFn = function (json) {
                        console.log('JSON for id:' + id + ' is:' + json);
                    };
                } else resFn(json); // execute our local processing

            } else console.warn('loadSpectrumFromSIMBAD warning: bad JSON for id:' + id);

        }, true);

    };

    /**
     * Gilese bright star catalog entry
     */
    PSpectrum.prototype.loadFromHSRC = function () {
        // Gilese brigh star catalog
        //https://heasarc.gsfc.nasa.gov/db-perl/W3Browse/w3table.pl?tablehead=name%3Dgliese2mas&Action=More+Options
    };

    /** 
     * load data from Aladin interactive system (e.g. photo of object) 
     */

    /**
     * load reverse lookup table for likely spectral luminosity class, based on 
     * [type + range + absolute magnitude]
     * @param {BABYLON.AssetsManager} assetManager 
     * @param {String} dir loaction of file
     */
    PSpectrum.prototype.loadStarLumByMagnitude = function (assetManager, dir) {

        let spectrum = this;
 
        console.log("------------------------------");
        console.log('PSpectra: loading star reverse luminosity lookup:' + dir);

        const loadLumLookup = assetManager.addTextFileTask('lumLookup', dir);

        loadLumLookup.onSuccess = async function (rLookup) {
            console.log('PSpectra: luminosity reverse-lookup table loaded, parsing data...')
            try {
                spectrum.lumLookup =  JSON.parse(rLookup.text);
            } catch (e) {
                spectrum.util.printError(e, false, 'Luminosity reverse-lookup table load:');
                spectrum.lumLookup = [];
            }
        };

        loadLumLookup.onTaskError = function (task) {
            console.log('task failed', task.errorObject.message, task.errorObject.exception);
        };

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
                spectrum.util.printError(e, false, 'Blackbody table load:');
                spectrum.bbColors = [];
            }
        };

        loadBlackbody.onTaskError = function (task) {
            console.log('task failed', task.errorObject.message, task.errorObject.exception);
        };

    };


    /**
     * load a lookup table for [type + range + luminosity]
     * used for complete spectra, e.g., 'A8III'
     * @param {BABYLON.AssetsManager} assetManager - the file loader
     * @param {String} dir - the path to the data file
     */
    PSpectrum.prototype.loadTRL = function (assetManager, dir) {

        let spectrum = this;
        let util = this.util;

        console.log("------------------------------");
        console.log('PSpectra: loading [type + range + luminosity] lookup table:' + dir);

        const loadTRL = assetManager.addTextFileTask('[t + r + l]', dir);

        loadTRL.onSuccess = async function (trl) {
            console.log('PSpectra: [t + r + l] stellar properties loaded, parsing data, length:' + trl.text.length);
            try {
                spectrum.trlLookup =  JSON.parse(trl.text);
                spectrum.trlLookupKeys = Object.keys(spectrum.trlLookup);
                console.log('PSpectra: [t + r + l] complete');
            } catch (e) {
                spectrum.util.printError(e, false, 'Stellar properties by [t + r + l] table:');
                spectrum.trlLookup = {};
                spectrum.trlLookupKeys = [];
            }
        };

        loadTRL.onTaskError = function (task) {
            console.log('PSpectrum task failed', task.errorObject.message, task.errorObject.exception);
        };

    };

    /**
     * load a lookup table for [type + luminosity]
     * used for spectra lacking a range, e.g. 'AIII'
     * @param {BABYLON.AssetsManager} assetManager - the file loader
     * @param {String} dir - the path to the data file
     */
    PSpectrum.prototype.loadTL = function (assetManager, dir) {

        let spectrum = this;
        let util = this.util;

        console.log("------------------------------");
        console.log('PSpectra: loading [type + luminosity] lookup table:' + dir);

        const loadTL = assetManager.addTextFileTask('[t + l]', dir);

        loadTL.onSuccess = async function (tl) {
            console.log('PSpectra: [t + l] stellar properties loaded, parsing data, length:' + tl.text.length);
            try {
                spectrum.tlLookup =  JSON.parse(tl.text);
                spectrum.tlLookupKeys = Object.keys(spectrum.tlLookup);
                console.log('PSpectra: [t + l] complete');
            } catch (e) {
                spectrum.util.printError(e, false, 'Stellar properties by [t + l] table:');
                spectrum.tlLookup = {};
                spectrum.tlLookupKeys = [];
            }
        };

        loadTL.onTaskError = function (task) {
            console.log('PSpectrum task failed', task.errorObject.message, task.errorObject.exception);
        };

    };


    return PSpectrum;

}());