/**
 * Decode stellar spectra into Star properties, without using regex, 
 * which is slow on browsers which don't cache regex (non-Firefox).
 * 
 * Parsing a spectra provides additional properties not present in the 
 * hyg3 database, which are added to hyg3 object (our version defined in PData.HygObj)
 *
 * {@link https://www.pas.rochester.edu/~emamajek/EEM_dwarf_UBVIJHK_colors_Teff.txt}
 * {@link http://www.vendian.org/mncharity/dir3/starcolor/details.html}
 * {@link https://sites.uni.edu/morgans/astro/course/Notes/section2/spectraltemps.html}
 * {@link https://en.wikipedia.org/wiki/List_of_star_systems_within_25%E2%80%9330_light-years}
 * {@link http://www.livingfuture.cz/stars.php}
 * {@link http://www.vendian.org/mncharity/dir3/blackbody/UnstableURLs/bbr_color.html}
 */
var PSpectrum = (function () {

    function PSpectrum (util, pdata) {

        this.util = util;
        this.pdata = pdata;

        // create a keylist for .dStarType, sorted by size of string (reduces pattern-matching ambiguity)
        this.dStarTypeKeys = Object.keys(this.dStarType).sort((a,b) => b.length - a.length);

        // create a luminosity keylist, sorted by size of string (reduces pattern-matching ambiguity)
        this.dStarLumClassKeys = Object.keys(this.dStarLumClass).sort((a,b) => b.length - a.length);

        // create a keylist for .dStarMods, sorted by size (reduces pattern-matching ambiguity)
        this.dStarModKeys = Object.keys(this.dStarMods).sort((a,b) => b.length - a.length);

        this.spectLookupKeys = {}; // initialized on loading, since it dependes on loaded JSON

    };

    /**
     * Collect statistics on spectrum parsing
     */
    PSpectrum.prototype.stats = {
        total:0,
        parsed:0,
        computed:0,
        lastditch:0,
        goodlookup:0,
        oklookup:0,
        badlookup:0,
        nolookup:0
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

    /**
     * Weighted values for stars which have a luminosity but not a range.
     * NOTE: luminosity varies so much that there's no point in making a weighting for missing range
     * for non-white dwarfs like A7, G5
     *
     * NOTE: this table is NOT used in spectrum parsing, only property computation.
     */
    PSpectrum.prototype.dStarWeightedProps = {
        'WN-III':{mass:70.2,luminosity:376000,radius:15.6,temp:36800,ci:-0.32,absmag:-5.5,bolo:-3.69,r:0.6078,g:0.7020,b:1},
        'WN-V':{mass:37,luminosity:260000,radius:12.9,temp:36800,ci:-0.32,absmag:-5.1,bolo:-3.69,r:0.5921,g:0.6823,b:1},
        'O-Ia0':{mass: 159.7,luminosity:2.71E+07,radius:7.88E+01,temp:47600,ci:-0.35,absmag:-9.4,bolo:-4.43,r:0.5647,g:0.6510,b:1},
        'O-Ia+':{mass: 159.7,luminosity:2.71E+07,radius:7.88E+01,temp:47600,ci:-0.35,absmag:-9.4,bolo:-4.43,r:0.5647,g:0.6510,b:1},
        'O-Ia':{mass:63.1,luminosity:731000,radius:38.5,temp:27600,ci:-0.29,absmag:-7,bolo:-2.91,r:0.6431,g:0.7255,b:1},
        'O-Iab':{mass:58.8,luminosity:525000,radius:32,temp:27600,ci:-0.29,absmag:-6.6,bolo:-2.91,r:6431,g:0.7255,b:1},
        'O-Ib':{mass:54.5,luminosity:319000,radius:25.5,temp:27600,ci:-0.29,absmag:-6.1,bolo:-2.91,r:0.6431,g:0.7255,b:1},
        'O-I':{mass:53.6,luminosity:3.13E+05,radius:1.42E+01,temp:36800,ci:-0.32,absmag:-5.3,bolo:-3.69,r:0.6118,g:0.6862,b:1},
        'O-II':{mass:50.33,luminosity:315000,radius:19.92,temp:30933,ci:-0.303,absmag:-5.75,bolo:-3.211,r:0.6405,g:0.7229,b:1},
        'O-III':{mass:41.58,luminosity:185500,radius:15.075,temp:31117,ci:-0.304,absmag:-5.16,bolo:-3.2275,r:0.6242,g:0.7251,b:1},
        'O-IV':{mass:28.6,luminosity:110000,radius:12.5,temp:30200,ci:-0.3,absmag:-4.7,bolo:-3.15,r:0.6196,g:0.6941,b:1},
        'O-V':{mass:23.73,luminosity:81571.74,radius:10.52,temp:33543,ci:-0.329,absmag:-4.53,bolo:-3.485,r:0.6594,g:0.7532,b:1},
        'O-VI':{mass:17.5,luminosity:3.02E+05,radius:1.24E+01,temp:39000,ci:-0.33,absmag:-5.1,bolo:-3.85,r:0.6078,g:0.6902,b: 1},
        'A-Ia0':{mass:15.18,luminosity:198500,radius:162.75,temp:9706.75,ci:-0.0574,absmag:-8.1,bolo:-0.39,r:0.7196,g:0.7843,b:1},
        'A-Ia+':{mass:15.18,luminosity:198500,radius:162.75,temp:9706.75,ci:-0.0574,absmag:-8.1,bolo:-0.39,r:0.7196,g:0.7843,b:1},
        'A-Ia':{mass:12.65,luminosity:129690.48,radius:138.95,temp:9495,ci:-0.0357,absmag:-7.64,bolo:-0.36,r:0.7868,g:0.842,b:1},
        'A-Iab':{mass:11.54,luminosity:71564.75,radius:91.96,temp:9450,ci:-0.0323,absmag:-6.43,bolo:-0.35,r:0.7894,g:0.844,b:1},
        'A-Ib':{mass:10.43,luminosity:13439.02,radius:44.97,temp:9405,ci:-0.029,absmag:-5.22,bolo:-0.344,r:0.7920,g:0.8453,b:1},
        'A-II':{mass:7.96,luminosity:1664.23,radius:17.22,temp:8927,ci:0.0249,absmag:-2.97,bolo:-0.27,r:0.8178,g:0.8617,b:1},
        'A-III':{mass:6,luminosity:75.73,radius:3.61,temp:8811,ci:0.044,absmag:0.48,bolo:-0.26,r:0.7545,g:0.8189,b:1},
        'A-IV':{mass:4.24,luminosity:46.47,radius:2.70,temp:8974,ci:0.0251,absmag:1.06,bolo:-0.28,r:0.76859,g:0.8218,b:1},
        'A-V':{mass:3.73,luminosity:54.62,radius:3.21,temp:11926,ci:0.00561,absmag:1.57,bolo:-0.41,r:0.64,g:0.75,b:1.3016},
        'A-Va':{mass:1.9,luminosity:1.70E+01,radius:1.89E+00,temp:8650,ci:0.05,absmag:1.9,bolo:-0.23,r:0.8314,g:0.8627,b:1},
        'A-Vb':{mass:1.7,luminosity:8.85E+00,radius:1.75E+00,temp:7650,ci:0.24,absmag:2.5,bolo:-0.12,r:0.8784,g:0.8902,b:1},
        'A-VI':{mass:1.7,luminosity:10.58,radius:1.34,temp:8900,ci:0.020,absmag:2.6,bolo:-0.27,r:0.7569,g:0.8137,b:1},
        'B-Ia0':{mass:17.7,luminosity:273000,radius:131,temp:11710,ci:-0.11,absmag:-8.1,bolo:-0.74,r:0.6941,g:0.7647,b:1},
        'B-Ia+':{mass:17.7,luminosity:273000,radius:131,temp:11710,ci:-0.11,absmag:-8.1,bolo:-0.74,r:0.6941,g:0.7647,b:1},
        'B-I':{mass:26.2,luminosity:3.38E+05,radius:4.92E+01,temp:20160,ci:-0.23,absmag:-7,bolo:-2.07,r: 0.7333,g:0.7961,b:1},
        'B-Ia':{mass:32.10,luminosity:402627.74,radius:52.08,temp:20826,ci:-0.229,absmag:-7.06,bolo:-2.106,r:0.6912,g:0.7753,b:1},
        'B-Iab':{mass:29.56,luminosity:267294.76,radius:40.45,temp:20583,ci:-0.226,absmag:-6.50,bolo:-2.070,r:0.6929,g:7771,b:1},
        'B-Ib':{mass:27.02,luminosity:131961.81,radius:28.82,temp:20340,ci:-0.223,absmag:-5.77,bolo:-2.034,r:0.6946,g:0.7788,b:1},
        'B-II':{mass:16.64,luminosity:40379.58,radius:16.56,temp:17508,ci:-0.191,absmag:-4.28,bolo:-1.615,r:0.7227,g:0.7997,b:1},
        'B-III':{mass:12.76,luminosity:11227.15,radius:6.13,temp:17144,ci:-0.186,absmag:-1.92,bolo:-1.564,r:0.6890,g:0.7714,b:1},
        'B-IV':{mass:9.45,luminosity:7653.59,radius:5.014,temp:17008,ci:-0.182,absmag:-1.43,bolo:-1.535,r:0.6680,g:0.7436,b:1},
        'B-V':{mass:9.05,luminosity:5730.48,radius:5.325,temp:22555,ci:-0.242,absmag:-1.26,bolo:-2.03,r:0.9047,g:0.95,b:1},
        'B-VI':{mass: 2.9,luminosity:6.67E+02,radius:2.47E+00,temp:18950,ci:-0.22,absmag:-0.4,bolo:-1.91,r:0.6667,g:0.7490,b:1},
        'F-Ia':{mass:9.28,luminosity:175000,radius:287.09,temp:7074,ci:0.377,absmag:-8.22,bolo:-0.11,r:0.9219,g:0.9223,b:0.9853},
        'F-Iab':{mass:8.38,luminosity:127279,radius:176.00,temp:6982,ci:0.397,absmag:-6.55,bolo:0.11,r:9355,g:0.9302,b:0.9852},
        'F-Ib':{mass:7.47,luminosity:7955.88,radius:65.21,temp:6890,ci:0.417,absmag:-4.89,bolo:-0.10,r:0.9491,g:0.9381,b:0.9851},
        'F-I':{mass:6.3,luminosity:7.82E+02,radius:1.97E+01,temp:6980,ci:0.39,absmag:-2.4,bolo: -0.08,r:0.9255,g:0.9294,b:1},
        'F-II':{mass:6.16,luminosity:807.33,radius:20.77,temp:6870,ci:0.419,absmag:-2.43,bolo:-0.09,r:0.9168,g:0.9190,b:0.9948},
        'F-III':{mass:4.80,luminosity:21.35,radius:3.24,temp:7027,ci:0.383,absmag:1.52,bolo:-0.09,r:0.8964,g:0.9122,b:1},
        'F-IV':{mass:3.04,luminosity:15.58,radius:2.85,temp:6910,ci:0.41,absmag:1.89,bolo:-0.09,r:0.9277,g:0.9312,b:0.9998},
        'F-V':{mass:2.055,luminosity:7.63,radius:2.12,temp:8259,ci:0.531,absmag:3.75,bolo:-0.11,r:0.89,g:0.90,b:1},
        'F-Va':{mass:1.4,luminosity:3.75E+00,radius:1.48E+00,temp:6700,ci:0.46,absmag:3.4,bolo:-0.08,r:0.9451,g:0.9372,b:1},
        'F-Vb':{mass:1.2,luminosity:2.41E+00,radius:1.35E+00,temp:6280,ci:0.56,absmag:3.9,bolo:-0.11,r:1,g:0.9882,b:0.9922},
        'F-VI':{mass:1.11,luminosity:1.12,radius:0.79,temp:6675,ci:0.466,absmag:4.81,bolo:-0.0945,r:0.9576,g:0.9494,b:0.9964},
        'G-Ia0':{mass:10.83,luminosity:686666.67,radius:1101.33,temp:5295,ci:0.843,absmag:-9.36,bolo:-0.40,r:1,g:0.9608,b:0.9582},
        'G-I':{mass:7.5,luminosity:1.70E+05,radius:6.49E+02,temp:5169,ci:0.903,absmag:-8.1,bolo:-0.62,r:1,g:0.9059,b:0.7569},
        'G-Ia':{mass:7.02,luminosity:150750,radius:546.625,temp:5108,ci:0.901,absmag:-7.7,bolo:-0.48,r:1,g:0.9174,b:0.7900},
        'G-Iab':{mass:4.96,luminosity:8342.42,radius:273.39,temp:5066,ci:0.9260,absmag:-5.83,bolo:-502,r:1,g:0.9132,b:7806},
        'G-Ib':{mass:2.97,luminosity:9934.83,radius:148.32,temp:4944,ci:0.9511,absmag:-4.66,bolo:-0.544,r:1,g:0.9092,b:0.7712},
        'G-II':{mass:2.72,luminosity:1690.99,radius:73.84,temp:4442,ci:1.12,absmag:-2.44,bolo:-0.843,r:1,g:0.8827,b:0.6974},
        'G-IIb':{mass:2.44,luminosity:905,radius:46,remp:4354,ci:1.14,absmag:-0,bolo:-0.87,r:1,g:0.8932,b:0.7365},
        'G-III':{mass:2.16,luminosity:120.29,radius:20.525,temp:4307,ci:1.163,absmag:0.49,bolo:-0.93,r:1,g:0.9039,b:0.7556},
        'G-IIIa':{mass:1.92,luminosity:80,radius:15,temp:4940,ci:1.12,absmag:0.85,bolo:-0.6,r:1,g:0.9102,b:0.7854},
        'G-IIIb':{mass:1.62,luminosity:20,radius:6,temp:5140,ci:0.97,absmag:2.25,bolo:-0.4,r:1,g:0.9177,b:0.8102},
        'G-IV':{mass:1.48,luminosity:6.43,radius:3.04,temp:5374,ci:0.813,absmag:3.03,bolo:-0.30,r:1,g:0.9232,b:0.8296},
        'G-IVa':{mass:1.5,luminosity:6.20E+00,radius:2.76E+00,temp:5560,ci:0.75,absmag:3,bolo:-0.23,r:1,g:0.9529,b:0.9137},
        'G-V':{mass:1.32,luminosity:2.67,radius:1.85,temp:6899,ci:0.926,absmag:5.58,bolo:-0.29,r:1,g:9253,b:0.861},
        'G-Va':{mass:0.9,luminosity:8.41E-01,radius:1.06E+00,temp:5450,ci:0.79,absmag:5.2,bolo:-0.26,r:1,g:0.9216,b:0.8353},
        'G-Vb':{mass:0.8,luminosity:5.66E-01,radius:1.03E+00,temp:5010,ci:0.92,absmag:5.8,bolo:-0.43,r:1,g:0.8980,b:0.7843},
        'G-VI':{mass:0.83,luminosity:0.3362,radius:0.616,temp:5618,ci:0.739,absmag:6.23,bolo:-0.23,r:1,g:0.9540,b:0.9302},
        'G-VII':{mass:0.50,luminosity:2.40,radius:1.57,temp:5051,ci:0.644,absmag:7.59,bolo:-2.62,r:1,g:0.8990,b:0.7325},
        'K-Ia0':{mass:15,luminosity:1680000,radius:3090,temp:3800,ci:1.365,absmag:-9.3,bolo:-1.505,r:1,g:0.8686,b:0.7392},
        'K-I':{mass:9.3,luminosity:210000.33,radius:2013.33,temp:3943,ci:1.3,absmag:-8.47,bolo:-1.39,r:1,g:0.8544,b:0.6905},
        'K-Ia':{mass:8.6,luminosity:230333.33,radius:1013.33,temp:4043,ci:1.267,absmag:-7.47,bolo:-1.19,r:1,g:0.8444,b:0.6405},
        'K-Iab':{mass:6.74,luminosity:128067.50,radius:686.73,temp:3531,ci:1.291,absmag:-6.18,bolo:-1.275,r:1,g:0.8353,b:6118},
        'K-Ib':{mass:4.48,luminosity:25802.56,radius:360.46,temp:3919,ci:1.3159,absmag:-4.88,bolo:-1.347,r:1,g:0.8262,b:0.5831},
        'K-II':{mass:3.33,luminosity:2446.99,radius:105.66,temp:4021,ci:1.274,absmag:-2.5,bolo:-1.214,r:1,g:0.8453,b:0.6321},
        'K-IIb':{mass:2.89,luminosity:1000,radius:700,temp:4010,ci:1.277,absmag:-0.5,bolo:-1.22,r:1,g:0.8566,b:0.6523},
        'K-III':{mass:2.46,luminosity:504.32,radius:200.55,temp:4003,ci:1.282,absmag:0.28,bolo:-1.24,r:1,g:0.8738,b:0.6758},
        'K-IIIa':{mass:2.03,luminosity:201.22,radius:90,temp:4129,ci:1.2,absmag:1,bolo:-1,r:1,g:0.9300,b:0.7210},
        'K-IIIb':{mass:1.83,luminosity:105,radius:17,temp:4392,ci:0.54,absmag:2,bolo:-0.8,r:1,g:0.9160,b:0.7114},
        'K-IV':{mass:1.61,luminosity:7.69,radius:4.19,temp:4782,ci:0.9973,absmag:3.10,bolo:-0.56,r:1,g:0.8780,b:0.7168},
        'K-V':{mass:1.26,luminosity:2.89,radius:2.38,temp:6121,ci:1.395,absmag:7.54,bolo:-0.91,r:1,g:0.8287,b:0.61},
        'K-VI':{mass:0.7,luminosity:0.15,radius:0.553,temp:4900,ci:0.96,absmag:7.3,bolo:-0.49,r:1,g:0.9333,b:0.8667},
        'M-Ia0':{mass:14.033,luminosity:4596666.67,radius:7243.33,temp:3193,ci:1.64,absmag:-9.23,bolo:-2.66,r:1,g:0.7791,b:0.5281},
        'M-Ia':{mass:11.95,luminosity:626916.67,radius:2615.83,temp:3257,ci:1.612,absmag:-7.09,bolo:-2.552,r:1,g:0.7598,b:0.4611},
        'M-Iab':{mass:10.69,luminosity:674372.62,raduis:2564.5,temp:3224,ci:1.634,absmag:-6.28,bolo:-2.705,r:1,g:0.7503,b:0.4650},
        'M-Ib':{mass:9.53,luminosity:721828.57,radius:2584.14,temp:3190,ci:1.656,absmag:-5.48,bolo:-2.858,r:1,g:0.7488,b:0.4189},
        'M-I':{mass:7.8,luminosity:5.86E+03,radius:2.13E+02,temp:3510,ci:1.49,absmag:-2.7,bolo:-1.97,r:1,g:0.7921,b:0.5411},
        'M-II':{mass:7.092,luminosity:27072,radius:591.125,temp:3118,ci:1.689,absmag:-2.78,bolo:-2.991,r:1,g:0.7421,b:0.4143},
        'M-IIa':{mass:6.4,luminosity:4.62E+04,radius:9.76E+02,temp:2750,ci:1.88,absmag:-2.9,bolo:-4.01,r:1,g:0.6980,b:0.3059},
        'M-IIb':{mass:6.49,luminosity:1478,radius:373,temp:3207,ci:1.624,absmag:-1.69,bolo:-2.77,r:4,g:0.7686,b:4215},
        'M-III':{mass:5.06,luminosity:2489.81,radius:156.92,temp:3296,ci:1.560,absmag:-0.61,bolo:-2.54,r:1,g:0.7951,b:0.4827},
        'M-IIIa':{mass:4.12,luminosity:1292.00,radius:94.00,temp:3273,ci:1.561,absmag:2,bolo:-2.61,r:1,g:0.7703,b:0.4884},
        'M-IIIb':{mass:3.40,luminosity:500,radius:60,temp:3266,ci:1.58,absmag:3,bolo:-2.64,r:1,g:0.7721,b:0.4910},
        'M-IV':{mass:2.85,luminosity:95.73,radius:32.78,temp:3250,ci:1.62,absmag:3.22,bolo:-2.68,r:1,g:0.7745,b:0.4941},
        'M-V':{mass:0.50,luminosity:2.40,radius:1.57,temp:3351,ci:1.644,absmag:10.59,bolo:-2.62,r:1,g:0.8490,b:0.6325},
        'M-VI':{mass:0.14,luminosity:0.0051,radius:0.26,temp:2833,ci:1.838,absmag:14.76,bolo:-3.84,r:1,g:0.7905,b:0.4829},
        'N-V':{mass:0.2,luminosity:6.24E-03,radius:3.81E-01,temp:2667,ci:1.93,absmag:14.6,bolo:-4.34,r:1,g:0.8196,b:0.6039},
        'C-Ia0':{mass:12,luminosity:8.13E+05,radius:1.42E+03,temp:4669,ci:1.03,absmag:-9.4,bolo:-0.62,r:1,g:0.7647,b:0.5450},
        'C-I':{mass:8.3,luminosity:9.77E+03,radius:1.56E+02,temp:4669,ci: 1.03,absmag:-4.6,bolo:-0.62,r:1,g:0.9059,b:0.7569},
        'C-Iab':{mass:8.1,luminosity:10.77E+03,radius:2.56E+02,temp:4269,ci:1.33,absmag:-3.6,bolo:-1.62,r:1,g:0.8059,b:0.5569},
        'C-II':{mass:7.94,luminosity:13941.28,radius:408.53,temp:3167,ci:1.6572,absmag:-2.72,bolo:-2.759,r:1,g:0.7438,b:0.3331},
        'C-III':{mass:5.5,luminosity:1.49E+03,radius:1.31E+02,temp:3180,ci:1.65,absmag:-0.5,bolo:-2.68,r:1,g:0.8274,b:0.5608},
        'C-IV':{mass:3,luminosity:2.27E+01,radius:1.28E+01,temp:3582,ci:1.46,absmag:3.2,bolo:-1.84,r: 1,g:0.9294,b:0.7412},
        'C-V':{mass: 0.5,luminosity:5.20E-03,radius: 1.93E-01,temp:3582,ci:1.46,absmag:12.3,bolo:-1.84,r:1,g:0.8745,b:0.7412},
        'C-VI':{mass: 0.1,luminosity:4.15E-03,radius:5.53E-01,temp:2000,ci:2.39,absmag:19,bolo:-8.3,r:1,g:0.7765,b:0.4235},
        'C-VII':{mass: 0.07, luminosity: 2E-03, radius: 0.2, temp: 2000, ci:3, absmag: 20, bolo:-9, r:1, g:0.4235, b:0}
    };

    /**
     * weighted averages of white dwarf properties missing a range.
     * Based on relative abundances of each type
     * better than the generic default .dStarProps
     * in the hyg3 data sample. For example. 'DA' above is 0.56, but in practice DA mass ranges 
     * 0.1 - 0.9, with most DA dwarfs smaller than 0.6
     *
     * NOTE: this table is NOT used in spectrum parsing, only property computation.
     *
     */
    PSpectrum.prototype.dWhiteDwarfWeightedProps = {
        'DA':{mass:0.3821, luminosity:0.00115, radius:0.00889, temp:8985, ci:0.1960, absmag:13.76, bolo:-0.381, r:0.8306, g:0.8651, b:0.9965},
        'DB':{mass:0.6, luminosity:0.00182, radius:0.00922, temp:12600,ci:-0.13, absmag:12.5, bolo:-0.9, r:0.702, g:0.7725, b:1},
        'DC':{mass:0.1529, luminosity:0.000106, radius:0.008948, temp:6043, ci:0.6356, absmag:15.09, bolo:-0.190, r:0.9701, g:0.9534, b:0.9735},
        'DQ':{mass:0.2823, luminosity:0.000235, radius:0.008834, temp:7303, ci:0.3618, absmag:14.35, bolo:-0.198, r:0.8902, g:0.9052, b:0.9908},
        'DZ':{mass:0.5478, luminosity:0.4321, radius:0.008939, temp:18065, ci:-0.0175, absmag:12.85, bolo:-1.266, r:0.7729, g:0.8201, b:0.9904},
    };

    /*
     * ------------------------------------------------------
     * PROPERTY TABLES, LARGE, LOADED AT RUNTIME
     * ------------------------------------------------------
     */

    /** 
     * properties are [type] + [range] + [luminosity]
     * e.g. 'O1Ia0'
     * {@link http://www.isthe.com/chongo/tech/astro/HR-temp-mass-table-byhrclass.html}
     */
    PSpectrum.prototype.spectLookup = {};

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

    //DEBUG
    PSpectrum.prototype.failedLookup = []; // TODO: DELETE

    /*
     * ------------------------------------------------------
     * LOOKUP TABLES FOR DESCRIPTIONS
     * ------------------------------------------------------
     */

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
        'K': 'Yellow-orange star', // giant or dwarf
        'M': 'Red star', //giant or dwarf or subdwarf
        'MS': 'Red giant, asymptotic-giant branch carbon star, younger, transition to SC',
        'S': 'Red giant, sub-carbon star, asymptotic-giant-branch, zirconium oxide in spectrum',
        'SC': 'Red giant, older sub-carbon star, asymptotic-giant branch, zirconium oxide in spectrum',
        'R': 'Red giant, carbon star equivalent of late G to early K-type stars, reclassified as C-R',
        'C-R': 'Red giant, carbon star, equivalent of late G to early K-type stars, no enhanced Ba line',
        'N': 'Red giant, older carbon star, giant equivalent of late K to M-type stars, reclassified as C-N',
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
     * [prefix] [letter code] [numeric code 0-9] [luminosity] [suffix]
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
        'Tc': ', strong Technetium emission lines'
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
     * Ia-0 -> Ia0, Ia-0/Ia -> Ia0-Ia, Ia-ab -> Ia/Iab, IVb -> Iva/V, Vb -> V-VI, Ia/ab -> Ia-Iab
     * III/III-IV -> III/IV (small difference)
     * {@link http://simbad.u-strasbg.fr/simbad/sim-display?data=sptypes}
     * {@link https://en.wikipedia.org/wiki/Chemically_peculiar_star}
     * {@link https://heasarc.gsfc.nasa.gov/W3Browse/all/cpstars.html}
     */
    PSpectrum.prototype.transformSpec = function (spect) {
        for (let i in this.dSpectrumTrans) {
            if(spect.indexOf(i) != -1) {
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
    PSpectrum.prototype.parseYerkesPrefix = function (spect, prop) {
        if (spect.length) {
            for (let i in this.dLumPrefixTrans) {
                let l = spect.indexOf(i);
                if (l == 0) {
                    // check if the type is lower-case 'g' or variant, reject if so
                    if (spect != 'g' && spect != 'g-') {
                        //////////////////console.log('found Yerkes prefix for:' + spect + ': ' + i)
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
        let r = spect.parseNumeric(); // pull the first number encountered
        if (r) {
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
            // check against the size-sorted keylist of .dStarMods (created in the constructor)
            for (let i = 0; i < this.dStarLumClassKeys.length; i++) {
                let k = this.dStarLumClassKeys[i];
                let p = spect.indexOf(k);
                if (p == 0) { // MUST start at position zero
                    prop.luminosity.key = k;   // type, key for description
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
                        prop.mods.keys.push(this.dStarModKeys[i]);
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

                s = this.parseYerkesPrefix(s, p);
                s = this.parseSpectrumType(s, p);
                s = this.parseSpectrumRange(s, p);
                s = this.parseSpectrumLuminosity(s, p);

                // non white dwarf, missing luminosity class, estimate
                if (p.type.key[0] != 'D' && !p.luminosity.key) {
                    this.lookupLuminosityClass(hyg, p);
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
        this.stats.computed++;

        if (!util.isNumber(hyg.ci, true)) return this.lastDitchProps(hyg);

        // parameters we need to compute the spectra
        let temp = Math.round(this.computeTempFromBV(hyg.ci)),
        tempRange = 1000, // degrees Kelvin, empirically determined from hyg3 dataset
        lum = hyg.lum; // luminosity

        let keys1 = [], keys1diff = [], keys2 = [], keys2diff = [];

        let lumDiff = 0.1;    // % difference
        let oldDiff = 1E10+14; // starting difference (for picking best key)

        // first scan - select all types within a temperature range
        for (let i in this.spectLookup) {
            let s = this.spectLookup[i];
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
            let s = this.spectLookup[keys1[i]];
            let ld = Math.abs(lum - s.luminosity);
            let max = Math.max(lum, s.luminosity);
            if (ld < oldDiff) {
                keys2.push(keys1[i]);
                keys2diff.push(ld);
                oldDiff = ld;
                key = keys1[i];
            }
        }

        if (!key) {
            console.error('No key for:' + hyg.id + ' lum:' + hyg.lum + ' absmag:' + hyg.absmag + ' ci:' + hyg.ci);
            this.failedLookup.push(hyg);
            key = 'G9V';
        }

        return key;

    };


    /**
     * last-ditch assignment, when:
     *     1. No spectra in hyg record
     * if luminosity is very low, set to Brown or Red Dwarf
     * {@link https://en.wikipedia.org/wiki/Red_dwarf}
     * Otherwise, set it to a G giant or G dwarf
     * @param {PData.HygObj} hyg - hyg database record
     * @param {PData.PSpectrum[]} props - properties
     * @return {String} approximate spectra
     */
    PSpectrum.prototype.lastDitchProps = function (hyg) {
        let pdata = this.pdata;

        hyg.computed = true;
        hyg.lastditch = true;
        this.stats.lastditch++;

        if (hyg.absmag < -9.2 && hyg.dist == pdata.HYG_CONSTANTS.max_dist) return 'B0Ia';
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

        prop.computed = true;

        // no class, so create [type + range] lookup key for luminosity ranges
        if (t.length && r.length && util.isNumber(r)) {
            tr = prop.type.key + Math.round(prop.range.key); //convert 'MV5.5' to 'MV5'
            lc = this.lumLookup[tr];

            // We found the [type + range], luminosity class versus absolute magnitude
            if (lc) {

                // find the closest table match to our luminosity by absolute magnitude
                let lumMatch = util.getKeyForClosestNumericValue(lc, absmag);

                // luminosity class doesn't match absolute magnitude
                if ((lumMatch.num < (lumMatch.min - 2)) || (lumMatch.num > lumMatch + 2)) {
                    // TODO
                }

                // store luminosity class.
                if(lumMatch.key) {

                    if (!prop.luminosity.key) {
                        prop.luminosity.key = lumMatch.key;  // from lookup table
                    }
                    // if we didn't have luminosity value, put in the lookup value (might be overriden by hyg3)
                    if (!prop.luminosity.value) {
                        prop.luminosity.value = this.computeLuminosityFromAbsMag(absmag);
                    }

                } else {
                    console.warn('lookupLuminosityClass: found type-key (' + tr + ') but no luminosity class:')
                }

            }

        }

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

            // set the primary spectra, getting tokens from other props as needed
            let primary = props[0]; // primary spectral type

            // loop through all sub-spectra
            for (let i = 0; i < props.length; i++) {
                let prop = props[i];
                let pp, lp;

                let t = prop.type.key,
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
                if(util.isNumber(r, true)) {
                    r = Math.round(r); //convert 'MV5.5' to 'MV5'
                    lp += r; // only add range if present
                    if(l.length) {
                        lp += l; // only add luminosity if present
                    }

                    // lookup by [type + range + luminosity class], about 1100 possible types, incd white dwarfs
                    pp = this.spectLookup[lp];

                    if (pp) this.stats.goodlookup++; //////////////////////////////////////
                }

                // lookup by [type] only (white dwarves)
                if (!pp && lp[0] == 'D') {
                    pp = this.dWhiteDwarfWeightedProps[lp];
                    // catch old classifications of white dwarfs, the following were merged into DZ
                    if(!pp && t == 'DG' || t == 'DK' || t == 'DM' || t == 'DF') pp = this.dWhiteDwarfWeightedProps['DZ'];
                    if (pp) this.stats.goodlookup++; ////////////////////////////////////////
                }

                // lookup by weighted averages for [type + luminosity class]
                if (!pp) {

                    // If we don't have a luminosity, estimate
                    if (!l) {
                        hyg.computed = true;
                        this.lookupLuminosityClass(hyg, primary);
                        l = primary.luminosity.key;
                    }

                    pp = this.dStarWeightedProps[t + '-' + l];
                    if (pp) this.stats.oklookup++; ///////////////////////////////////////////
                    if (!pp && l) console.log('lum lookup failed with t:' + t + ' l:' + l)
                }

                // no lookup hits, assign default stellar type properties (inaccurate)
                if (!pp) {
                    pp = this.dStarProps[t];
                    if (pp) this.stats.badlookup++; /////////////////////////////////////
                    this.failedLookup.push(prop)
                    // TODO: THIS PICKED UP VERY DIM RED DWARFS
                    // if (prop.computed) this.failedLookup.push(prop); ///////////////////////////////////////
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
                    if (prop.temp.value) hyg.temp = prop.temp.value;
                    else if (hyg.ci) hyg.temp = this.computeTempFromBV(hyg.ci);

                    // get radius from lookup, or absmag and temperature, or defaults
                    if (prop.radius.value) {
                        hyg.radius = prop.radius.value;
                    } else if (hyg.temp) {
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
     * {@link https://sites.uni.edu/morgans/astro/course/Notes/section2/spectraltemps.html}
     * @param {String} bv color index, blue-violet
     */
    PSpectrum.prototype.computeTempFromBV = function (bv) {
        return (4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62)));
    };

    /**
     * Convert b-v (colorindex) values reported to stars to RGB color
     * @param {Number} bv the b-v value for the star.s
     * {@link https://stackoverflow.com/questions/21977786/star-b-v-color-index-to-apparent-rgb-color}
     * {@link https://en.it1352.com/article/cab2367e8d784310b3846a705478ace3.html}
     * {@link http://www.vendian.org/mncharity/dir3/blackbody/UnstableURLs/bbr_color.html}
     * The 2019 lookup table (more accurate)
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

        id = 'HD48915'; // Sirius, HD query
        id = 'HIP'
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
                spectrum.spectLookupKeys = Object.keys(spectrum.spectLookup);
            } catch (e) {
                spectrum.util.printError(e, false, 'Stellar properties by spectrum table:');
                spectrum.spectLookup = [];
                spectrum.spectLookupKeys = {};
            }
        };

        loadColors.onTaskError = function (task) {
            console.log('PSpectrum task failed', task.errorObject.message, task.errorObject.exception);
        };

    };

    return PSpectrum;

}());