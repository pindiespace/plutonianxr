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

    };

    /**
     * many properties are expressed as multiples of Solar properties
     */
    PSpectrum.prototype.SOL = {
        mass: 1,
        radius: 1,
        radiusKm: 695700,
        lumWatts: 3.828E+26,
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

    /**
     * Default stellar properties, if we can't load the larger table, or 
     * no luminosity information exists in the spectra. Same structure 
     * as longer table.
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
        'WC': {mass: 90.70740741, luminosity: 2540355.556, radius: 25.60320988, temp: 39814.81481, ci: -0.329753086, absmag: -6.211111111, bolo: -3.879382716, r: 0.603485839, g: 0.684725248, b: 0.992883079},
        'WN': {mass: 91.48481013, luminosity: 2580870.886, radius: 25.91468354, temp: 39556.96203, ci: -0.329240506, absmag: -6.226582278, bolo: -3.86164557, r: 0.598461157, g: 0.683395383, b: 1},
        'O': {mass: 90.21898734, luminosity: 2.16E+06, radius: 2.51E+01, temp: 39556.96203, ci: -0.329615385, absmag: -6.17721519, bolo: -3.86164557, r: 0.598461157, g: 0.683395383, b: 1},
        'B': {mass: 17.3775, luminosity: 2.11E+05, radius: 2.78E+01, temp: 19517.5, ci: -0.216, absmag: -4.08125, bolo: -1.917875, r: 0.679166667, g: 0.758088235, b: 1},
        'A': {mass: 7.08375, luminosity: 5.20E+04, radius: 5.70E+01, temp: 8870.625, ci: 0.03425, absmag: -2.29125, bolo: -0.268, r: 0.788333333, g: 0.838333333, b: 1},
        'F': {mass: 5.46875, luminosity: 6.75E+04, radius: 1.01E+02, temp: 6883.493827, ci: 0.420125, absmag: -1.63875, bolo: -0.09925, r: 0.931617647, g: 0.929264706, b: 0.991617647},
        'G': {mass: 3.76125, luminosity: 1.33E+05, radius: 3.02E+02, temp: 5030.5, ci: 0.9245, absmag: -1.13, bolo: -0.507, r: 1, g: 0.926078431, b: 0.832401961},
        'K': {mass: 4.8925, luminosity: 2.37E+05, radius: 5.92E+02, temp: 4007.25, ci: 1.283, absmag: -0.69375, bolo: -1.2795, r: 1, g: 0.838235294, b: 0.632794118},
        'M': {mass: 5.98125, luminosity: 15389579.35, radius: 9391.250375, temp: 2809.375, ci: 1.87425, absmag: 0.93, bolo: -4.300875, r: 1, g: 0.755882353, b: 0.424166667},
        'N': {mass: 5.98125, luminosity: 15389579.35, radius: 9391.250375, temp: 2809.375, ci: 1.87425, absmag: 0.93, bolo: -4.300875, r: 1, g: 0.755686275, b: 0.421764706},
        'R': {mass: 6.465, luminosity: 178553.862, radius: 446.673825, temp: 4313.9375, ci: 1.1705, absmag: -0.82, bolo: -0.996625, r: 0.99504902, g: 0.868088235, b: 0.711421569},
        'C': {mass: 6.26875, luminosity: 12837841.15, radius: 7366.992875, temp: 3498.3125, ci: 1.561875, absmag: 0.23375, bolo: -2.939, r: 1, g: 0.828039216, b: 0.577598039},
        'S': {mass: 5.98125, luminosity: 15389579.35, radius: 9391.250375, temp: 2809.375, ci: 1.87425, absmag: 0.93, bolo: -4.300875, r: 1, g: 0.755686275, b: 0.421764706},
        'DA': {mass: 0.56, luminosity: 0.72097003, radius: 0.008756, temp: 24258, ci: 0.033, absmag: 12.8, bolo: -1.839, r: 0.798823529, g: 0.81882353, b: 0.938431373},
        'DB': {mass: 0.56, luminosity: 0.72097003, radius: 0.008756, temp: 24258, ci: 0.033, absmag: 12.8, bolo: -1.839, r: 0.798823529, g: 0.834901961, b: 0.984313726},
        'DC': {mass: 0.56, luminosity: 0.72097003, radius: 0.008756, temp: 24258, ci: 0.033, absmag: 12.8, bolo: -1.839, r: 0.798823529, g: 0.834901961, b: 0.984313726},
        'DO': {mass: 0.56, luminosity: 0.72097003, radius: 0.008756, temp: 24258, ci: 0.033, absmag: 12.8, bolo: -1.839, r: 0.798823529, g: 0.834901961, b: 0.984313726},
        'DQ': {mass: 0.5, luminosity: 0.033300033, radius: 0.008726667, temp: 15842.22222, ci: 0.077777778, absmag: 13.08888889, bolo: -1.204444444, r: 0.776470588, g: 0.823529412, b: 0.995642702},
        'DZ': {mass: 0.56, luminosity: 0.72097003, radius: 0.008756, temp: 24258, ci: 0.033, absmag: 12.8, bolo: -1.839, r: 0.798823529, g: 0.834901961, b: 0.984313726},
        'L': {mass: 0.05, luminosity: 1E-3, radius: 0.1, temp: 2000, ci: 0, absmag: 15, bolo:-3, r:1, g:0.4235294, b:0}, // red, hot brown dwarf, lithium
        'T': {mass: 0.03, luminosity: 1E-4, radius: 0.1, temp: 1200, ci: 0, absmag: 16, bolo:-3, r:1, g:0.3, b:0.1}, // warm, brownish, gas giant able to fuse duterium
        'Y': {mass: 0.01, luminosity: 1E-4, radius: 0.1, temp: 500, ci: 0, absmag: 17, bolo:-3, r:1, g:0.3, b:0.1}, // warm, brownish, gas giant able to fuse duterium
        'P': {mass: 0.001, luminosity: 1E-6, radius:0.1, temp:150, ci:0, absmag: 25, bolo:-3, r: 0.4034, g: 0.27153, b: 0.1235} // brown, a gas giant
    };

    /**
     * replace some luminosity patterns in the spectrum string for easier parsing
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
     * Yerkes prefixes in front of primary letter type, translate to standard luminosity
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
        'L': 'Hot brown dwarf, lithium in atmosphere, dust grains',
        'T': 'Cool brown dwarf, methane in atmosphere',
        'Y': 'Gas giant, cool, able to fuse deuterium',
        'P': 'Gas giant, cold, Jupiter-like',
        '': 'Unknown stellar type'
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
    PSpectrum.prototype.dStarWolfRayetCNDesc = {
        'WC10': 'Wolf-Rayet star, helium-fusing, cooler, stellar wind mass loss, strong Carbon lines',
        'WC11': 'Wolf-Rayet star, helium-fusing, coolest, stellar wind mass loss, strong Carbon lines',
        'WNh' : 'Wolf-Rayet star, young and massive, helium and hydrogen fusion, stellar wind mass loss',
        'WN10': 'Wolf-Rayet star, helium-fusing, cooler, stellar wind mass loss, strong Nitrogen lines',
        'WN11': 'Wolf-Rayet star, helium-fusing, coolest, stellar wind mass loss, strong Nitrogen lines'
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
        'DAZ':'White Dwarf, hot, hydrogen-rich atmosphere, metallic spectral lines',
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
        'VIab': ' Luminous dwarf',
        'V' : ' Dwarf (Main Sequence)',
        'Va' : ' Luminous Dwarf (Main Sequence)',
        'Vb' : ' Regular Dwarf (Main Sequence)',
        'Vz' : ' Lower main sequence Dwarf',
        'VI' : ' Sub-Dwarf',
        'VIa' : ' Luminous Sub-Dwarf',
        'VIb' : ' Less Luminous Sub-Dwarf',
        'VII' : ' White-Dwarf',
        'VIIa' : ' Luminous White-Dwarf',
        'VIIb' : ' Less Luminous White-Dwarf',
        '' : ' Unknown luminosity'
    };

    // suffix for luminosity rather than general suffix
    PSpectrum.prototype.dLumSuffix = {
        ':' :  'Uncertain luminosity'
    };


    /**
     * Suffix after prefix, letter type, luminosity
     * [prefix][letter type][numeric code 0-9][luminosity][suffix]
     * delta-del suffix:
     * {@link https://en.wikipedia.org/wiki/Wolf%E2%80%93Rayet_star}
     */
    PSpectrum.prototype.dStarMods = {
        ':' : ', uncertain spectral values',
        '...' : ', peculiar, truncated spectra',
        '!' : ', special peculiarities',
        '+': ', composite spectrum',
        'b': ', broad strong spectral lines',
        'delta del': ', chemically peculiar, hot main-sequence, sharp metallic absorption lines, contrasting broad (nebulous) neutral helium absorption lines.',
        'comp' : ', composite spectrum, unresolved multiple star',
        'd': ', dust (occasionally vd, pd, or ed for variable, periodic, or episodic dust',
        'e' : ', emission lines present',
        '(e)': ', forbidden emission lines present',
        '[e]': ', forbidden emission lines present',
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
        'PEC': ', White dwarf, Peculiarities exist',
        'p': ', chemically peculiar star',
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
        'E': 'u',
        'f': '*+)?',
        'h': 'a',
        'H': 'ae',
        'n': 'en',
        'p': 'q',
        'P': 'E',
        's': 'sh',
        'v': 'a',
        'w': 'lk'
    };

    /** 
     * properties lookup, keys are [type] + [range] + [luminosity]
     * e.g. 'O1Ia0'
     * {@link http://www.isthe.com/chongo/tech/astro/HR-temp-mass-table-byhrclass.html}
     */
    PSpectrum.prototype.spectLookup = {};

    /**
     * blackbody temperature colors table (JSON)
     * {@link http://www.vendian.org/mncharity/dir3/blackbody/UnstableURLs/bbr_color.html}
     */
    PSpectrum.prototype.bbColors = [];

    // methods

    /*
     * ------------------------------------------------------
     * PARSING
     * ------------------------------------------------------
     */

    PSpectrum.prototype.classifySubSpectrum  = function (spect, orig, flag) {

        let roles = this.pdata.SPECTROLES;

        let pos = orig.indexOf(spect);
        if (pos == 0) {
            return roles.PRIMARY;
        } else if (pos == -1) {
            if(flag) console.error('classifySubSpectrum: failed to find:' + spect + ' in:' + orig);
        } else {
            c = orig[pos - 1];
            if (c == '/') return roles.COMPOSITE;
            else if (c == '-') return roles.INTERMEDIATE;
            else if (flag) console.error('classifySubSpectrum: split incorrectly');
        }

    };

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
                // check if the type is lower-case 'g' or variant, reject if so
                if (spect != 'g' && spect != 'g-') {
                    if (flag) console.log('found Yerkes prefix for:' + spect + ': ' + i)
                    lum = this.dLumPrefixTrans[i];
                    prop.luminosity.key = this.dLumPrefixTrans[i]; // use to get desc
                    return spect.substring(i.length); // swap luminace to end
                }

            } // else if (l > 0 && flag) console.log('strange Yerkes...., l:' + l)

        }
        return spect;
    };

    /**
     * Parse a subtype, storing both key and reference to array it is found in
     * @param {String} spect the fragment of the spectral string (starting at position 0)
     * @param {Object} objArr the associative array with key-values for the subtype
     */
    PSpectrum.prototype.parseSubtype = function (spect, objArr, prop, flag) {
        for (var i in objArr) {
            let pos = spect.indexOf(i);
            if (pos !== -1) {
                prop.type.key = i;
                prop.type.arr = objArr;
                if (flag) console.log('switching type to subtype:' + i);
                if (pos != 0) {
                    if (flag) console.warn('parseSubtype: strange subtype match:' + i + ' to spect:' + spect + ' not at position zero!');
                    return null;
                } else return spect.substring(i.length);
            }
        }

        return null; // control for multiple tests
    };

    /**
     * parse the primary (single-letter) spectrum type, branching to subtype if necessary.
     * @param {String} spect the current spectrum string (may be truncated)
     * @param {Object} prop stellar property, defined in PData
     */
    PSpectrum.prototype.parseSpectrumType = function (spect, prop, flag) {

        // if the spect is at the beginning of the spectra, and everything is lowercase, push to upper-case
        if (prop.role == this.pdata.SPECTROLES.PRIMARY && spect.parseNumeric() == null) {
            spect = spect.toUpperCase();
        };

        // loop through single-letter type, trying subtypes when they are present
        for(let i in this.dStarDesc) {
            let l = spect.indexOf(i);
            if (l == 0) {
                if (flag) console.log('found stellar type for:' + spect + ': ' + i);
                    let s = null;
                    switch(i) {
                        case 'W':
                            s = this.parseSubtype(spect, this.dStarWolfRayetCNDesc, prop, flag);
                            if(s === null) s = this.parseSubtype(spect, this.dStarWolfRayetDesc, prop, flag);
                            if (s !== null) return s;
                            break;
                        case 'C':
                            s = this.parseSubtype(spect, this.dStarCarbonDesc, prop, flag);
                            if (s !== null) return s;
                            break;
                        case 'D':
                            s = this.parseSubtype(spect, this.dStarWhiteDwarfHDesc, prop, flag);
                            if (s === null ) s = this.parseSubtype(spect, this.dStarWhiteDwarfDesc, prop, flag);
                            if (s !== null) return s;
                            break;
                        case 'M':
                            s = this.parseSubtype(spect, this.dRGAysmpYoungDesc, prop, flag);
                            if (s !== null) return s;
                            break;
                        case 'S':
                            s = this.parseSubtype(spect, this.dGAsympOldDesc, prop, flag);
                            if (s !== null) return s;
                            break;
                        default:
                            //prop.type.key = i;   // type, key for description
                            //prop.type.arr = this.dStarDesc;
                            //return spect.substring(i.length);
                            break;
                    }

                    // fallthrough, for single-letter, also cases where no sub-type was detected
                    prop.type.key = i;   // type, key for description
                    prop.type.arr = this.dStarDesc;
                    return spect.substring(i.length);

            } else if (l != -1 && flag) console.log('strange Type position...., l:' + l)

        }

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
            prop.range.key = r.num + ''; // force key to string
            prop.range.value = r.num;
            return spect.substring(r.start2);
        }

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

        }
        if (flag) console.log('final luminosity:' + k)

        // get the luminosity key and magnitude
        if (k.length) {
            prop.luminosity.key = k;
            // TODO: value needs to be computed (absmag and distance)
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

            prop.mods.arr = this.dStarMods;

            for (let i in this.dStarMods) {
                p1 = spect.indexOf(i); // get position of key in suffix

                if (p1 != -1) {

                    // lots of possibilities. Check the left and right char to know what to assign
                    if (p1 > 0) p2 = spect[p1 - 1]; else p2 = ''; // left-side character
                    if (p1 < spect.length - 1) p3 = spect[p1 + 1]; else p3 = ''; // right-side character
                    // if (flag) console.log('left:' + p2 + ' i:(' + i + ') right:' + p3)

                    switch(i) {
                        case ':': 
                        case '...': 
                        case '!':
                        case '+': 
                        case 'k':
                        case 'm':
                        case 'q':
                            prop.mods.keys.push(i); // no ambiguity
                            break;
                        case 'e':
                        case 'E':
                        case 'f':
                        case 'h':
                        case 'H':
                        case 'n':
                        case 'p':
                        case 'P':
                        case 's':
                        case 'v':
                        case 'w': // resolve ambiguity
                            if (this.dStarModAmbigEnd[i])
                                if (this.dStarModAmbigEnd[i].indexOf(p3) != -1)
                                    rok = false;
                            if (this.dStarModAmbigStart[i])
                                if (this.dStarModAmbigStart[i].indexOf(p2) != -1)
                                    lok = false
                            if (lok && rok) {
                                if(flag) console.log('prop.mods.keys.indexOf(' + i + ') is:' + prop.mods.keys.indexOf(i))
                                if(prop.mods.keys.indexOf(i) != -1) { // avoid duplicates
                                    prop.mods.keys.push(i);
                                }
                                lok = rok = true; // reset (may be redundant)
                            }
                        default:
                            if (prop.mods.keys.indexOf(i) != -1) { // avoid duplicates
                                prop.mods.keys.push(i);
                            }
                            break;

                    }

                }

            }

        }

        return spect;

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
        let flag = false;

        //////////////////////////////////////////////////////////
        //if (spect.indexOf('O') != -1) flag = true;
        /////////////////////////////////////////////////////////

        if (!spect || !star) return false;
        
        if (flag) console.log('=====\nspect(raw):' + spect);

        // get a whitespace-free copy
        spect = spect.stripWhitespace();

        // replace a few patterns for easier parsing
        spect = this.transformSpec(spect);

        // split now, determine if this is a single spectrum, composite or blended later
        let spects = spect.split(/\/|-/);

        // store properties of primary and composite spectra
        let props = [];

        // find patterns and return substring missing pattern
        for(let i = 0; i < spects.length; i++) {

            // get the (sub)spectrum string
            let s = spects[i];

            // create a default spectrum data object
            let p = pdata.createPSpectrum();

            // classify the subspectrum as primary, composite, intermediate
            p.role = this.classifySubSpectrum(s, spect, flag);
            if (flag) console.log('spects['+ i + '] role:' + p.role);

            p.spect = s; // Partial spectra
            props.push(p); // save our props object in an array

            // begin parsing the spectrum
            s = this.parseYerkesPrefix(s, p, flag);
            if (flag) console.log('spects['+ i + '] Yerkes parsed:[' + s + '] remains');
            s = this.parseSpectrumType(s, p, flag);
            if (flag) console.log('spects[' + i + '] type parsed:[' + s + '] remains');
            s = this.parseSpectrumRange(s, p, flag);
            if (flag) console.log('spects[' + i + ']  range parsed:[' + s + '] remains');
            s = this.parseSpectrumLuminosity(s, p, flag);
            if (flag) console.log('spects[' + i + '] luminosity parsed:[' + s + '] remains');

            // parse the spectrum suffixes for additional information
            s = this.parseSpectrumMods(s, p, flag);
            if (p.mods.keys.length > 0) p.mods.arr = this.dStarMods;

            if (flag) console.log('spects[' + i + '] mods parsed:[' + s + ']');
            if(flag) console.log('-----')

            // lookup the [type][range][luminosity] for additional results
            p = this.lookupSpectrumProps(p, flag);

        }

        // flag empty props
        if (props.length == 0 ) {
            console.warn('spectrumToStellarData WARN: no props for specta:"' + spect);
        } else {
            if(props[0].type.key == '') { // no primary type found
                console.warn('spectrumToStellarData WARN: no type for spectra:"' + spect);
            }
        }

        // add properties and descrptions to the hyg object
        this.mergeHygWithProps(star, props);

        // NOTE: descriptions are built dynamically when a Star is selected

        return props;

    };

    /*
     * ------------------------------------------------------
     * ADJUST SPECTRUM PROPERTIES
     * ------------------------------------------------------
     */

    /**
     * Use the Star properties lookup table for the 1000 or so common stellar types
     * {@link http://www.isthe.com/chongo/tech/astro/HR-temp-mass-table-byhrclass.html}
     * @param {Object} prop stellar properties object
     */
    PSpectrum.prototype.lookupSpectrumProps = function (prop, flag) {
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
        }

        // look up the combined key = [type + range + luminosity] in our lookup table
        if(lp.length) {
            lp = this.spectLookup[t + r + l];
            if (lp) {
                if (flag) console.log('spectrumProps (' + t + r + l + ') HIT')
                prop.con = 1;
            }
            else {
                lp = this.dStarProps[t];
                if (lp) {
                    if (flag) console.log('spectrumProps (' + t + ') AVERAGED HIT')
                    prop.con = 0.5;
                }
            }

            // assign properties from lookup
            if (lp) {
                prop.mass.value = lp.mass,
                prop.luminosity.value = lp.luminosity, // replace default based on luminosity key
                prop.radius.value = lp.radius,
                prop.temp.value = lp.temp,
                prop.ci.value = lp.ci,
                prop.absmag.value = lp.absmag,
                prop.bolo.value = lp.bolo,
                prop.color.r = lp.r,
                prop.color.g = lp.g,
                prop.color.b = lp.b;
            }

        }

        return prop;

    };

    /** 
     * Add properties to the hyg object.
     * 1. always use the primary to set values
     * 2. store primary props for description lookup later
     * 3. if details, store ALL the props
     * We don't use props directly since we would have to add lots of hyg fields
     * @param {Object} hyg the returned json object describing a star
     * @param {Array} props the array of properties taken from the stellar spectra
     * @param {Boolean} details if true, store all the props, otherwise, just store the primary prop
     */
    PSpectrum.prototype.mergeHygWithProps = function (hyg, props, details = true) {

        let pdata = this.pdata;
        let roles = pdata.SPECTROLES;
        let util = this.util;

        // add new fields to hyg
        hyg = pdata.cloneHygObj(hyg);

        // composite vs. blended
        for (let i = 0; i < props.length; i++) {

            let prop = props[i],
            type = prop.type.key[0],
            color = prop.color,
            mods = prop.mods.keys;

            switch (prop.role) {

                case roles.PRIMARY: // augment hyg3 values
                    
                    // ci is not always present in hyg3, so add it
                    if (hyg.ci == '' && (prop.ci != pdata.EMPTY)) hyg.ci = prop.ci;

                    // compute or lookup temperature, assured that we have a ci
                    if (prop.temp.value != pdata.NAN) hyg.temp = prop.temp.value;
                    else if (hyg.ci) hyg.temp = this.computeTempFromCI(hyg.ci);

                    // radius, from lookup, or absmag and temperature
                    if (prop.radius.value != pdata.NAN) hyg.radius = prop.radius.value
                    else if (hyg.temp) hyg.radius = this.computeRadius(hyg.absmag, hyg.temp);

                    // compute color (not initially in Hyg3) in one of several ways
                    if (color.r + color.g + color.b > 0) {
                        hyg.r = color.r, hyg.g = color.g, hyg.b = color.b;
                    } else if (hyg.temp) {
                        let c = this.computeColorFromBlackbody(hyg.temp);
                       //if (!c) console.error('no blackbody color');
                        hyg.r = c.r, hyg.g = c.g, hyg.b = c.b;
                    }
                      else if (hyg.ci != '') {
                        let c = this.computeColorFromBV(hyg.ci);
                        hyg.r = c.r, hyg.g = c.g, hyg.b = c.b;
                    }

                    // set rotation flag. Rotation tables don't appear to exist for 
                    // hyg3 stars, so just divide into a few multiples of solar rotation = 1
                    if(type == 'O' || type == 'A' || type == 'B' || type == 'W') hyg.rot = 10;
                    if(mods.indexOf('nn') != -1) hyg.rot = 30;
                    if (mods.indexOf('n') != -1) hyg.rot = 10; 
                    //default = 1;

                    // handle cases where a luminosity class was never assigned
                    if (prop.luminosity.key == '' && prop.luminosity.value != pdata.NAN) {
                        if (prop.luminosity.value > 9000) prop.luminosity.key = 'I'; // supergiant
                        if (prop.type.key[0] == 'M' && prop.luminosity.value > 1 || 
                            prop.type.key[0] == 'K' && prop.luminosity.value > 29 || 
                            prop.type.key[0] == 'G' && prop.luminosity.value > 2) 
                                prop.luminosity.key = 'III'; // giant
                        if (prop.luminosity.key == '') prop.luminosity.key = 'V'; // main sequence (dwarf)
                    }

                    // variable star (provide a default if we don't have magnitudes or cycle length)
                    if (hyg.var_min || hyg.var_max || 
                        m.indexOf('v') != -1 || m.indexOf('var') != -1 || m.indexOf('V') != -1) hyg.var = true;
                    else hyg.var = false; // don't need the variable nomenclature

                    // dust
                    if(mods.indexOf('d')) hyg.dust = true;

                    // gaseous envelope, like a planetary nebula
                    if(mods.indexOf('q')) hyg.envelope = true;

                    break;

                case roles.INTERMEDIATE: // save sub-spectra
                    hyg.intermediate.push = prop.type.key;
                    break;

                case roles.COMPOSITE: // save sub-spectra
                    hyg.composite.push = prop.type.key;
                    break;

                default:
                    break;

            }

        }

        return true;
    };

    /**
     * Dynamically build the stellar description when a Star is picked
     * reverse lookup for 'giant' and 'supergiant' M-K spectral class by luminosity
     * {@link https://web.njit.edu/~gary/321/Lecture6.html}
     * {@link https://sites.uni.edu/morgans/astro/course/Notes/section2/spectraltemps.html}
     */
    PSpectrum.prototype.getSpectraDesc = function (props) {

        let description = '';

        for (let i = 0; i < props.length; i++) {
            switch (prop.role) {
                case roles.PRIMARY:
                    // basic description
                    description = prop.type.arr[prop.type.key];

                    // replace ' star' with luminosity string
                    description = description.replace(' star', prop.luminosity.arr[prop.luminosity.key]);
                    break;

                case roles.INTERMEDIATE:
                    // add comment, 'intermediate with' the intermediate type
                    description += ', (intermediate with:' + prop.type.arr[prop.type.key] + ')';
                    break;

                case roles.COMPOSITE:
                    // if types are very different, flag as possible multiple star, if not already 'comp'
                    description += ', (composite with:' + prop.type.arr[prop.type.key] + ', possible spectroscopic double)';
                    break;
            }
        }

        for (let i = 0; i < props.length; i++) {
            for (let j = 0; j < props.mods.keys.length; j++) {
                description += prop.mods.arr[prop.mods.keys[j]]
            }
        }

        return description;

    };

    /*
     * ------------------------------------------------------
     * CONVERSION
     * ------------------------------------------------------
     */

    /**
     * Convert a b-v color index to the approx temperature
     * @param {String} bv color index, blue-violet
     */
    PSpectrum.prototype.computeTempFromBV = function (bv) {
        return (4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62)));
    };

    /**
     * Convert b-v (colorindex) values reported to stars to RGB color
     * @param {Number} bv the b-v value for the star.s
     * {@link https://stackoverflow.com/questions/21977786/star-b-v-color-index-to-apparent-rgb-color}
     * {@link http://www.vendian.org/mncharity/dir3/blackbody/UnstableURLs/bbr_color.html}
     * {@link https://www.pas.rochester.edu/~emamajek/EEM_dwarf_UBVIJHK_colors_Teff.txt}
     * {@link https://en.wikipedia.org/wiki/Color_index}
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
     * look up a color from a blackbody to temperature lookup table
     * {@link https://stackoverflow.com/questions/21977786/star-b-v-color-index-to-apparent-rgb-color}
     * @param {Number} temp 
     */
    PSpectrum.prototype.computeColorFromBlackbody = function (temp) {
        let t = Math.floor(temp / 200);
        t = t * 200;
        if (t < 1000)  t = 1000;
        else if (t > 29800) t = 29800;
        return this.bbColors[t]; // associative lookup in object
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