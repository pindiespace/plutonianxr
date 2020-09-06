/**
 * Model of the universe
 * Universe = 1,000,000 parsecs,  10,000,000 units
 * Galaxy   =    30,000 parsecs,     300,000 units (where the skybox is drawn)
 * Hyg Real =       990 parsecs,       9,900 units (stars drawn in 3D)
 * Hyg Max  =   100,000 parsecs,   1,000,000 units (no parallax for star, just a default)
 * (about 10,000 of the 119,000 stars in Hyg3 fall in this category)
 */

/**
 * Contains computations for planetary positions
 */
var POrrey = (function () {

    function POrrey () {

    };

    return POrrey;

}());

var PCelestial = (function () {

    // constructor

    function PCelestial (util) {

        this.util                = util; // PUtil object, instantated in plutonian-scene.js

        this.dParsecUnits      =     10; // scale parsec distances to the simulation
        this.dKmUnits          =   2370; // 1 unit = 2370km, Pluto = 2370/2370 = 1.0
        this.dSpriteSize       =    128; // default size of sprite panel
        this.dSpriteScreenSize =      1; // default size of Star sprites
        this.dMaxHygDist       = 100000;

        // Hyg data (JSON)
        this.hygData           =     [];
        this.spriteManager     =   null;

        // Stellar colors (JSON)
        this.hygColors         = []; // full set, in JSON file
        this.dHygColors        = [];  // one-letter
        this.setDefaultStarColors();

        this.dHygSpriteIndex   = []; //index for sprite image
        this.setDefaultStarColors();

        // computations of planetary positions over time
        this.orrey = new POrrey();

    };

    // functions

    /**
     * Set default stellar single-letter colors, averaged from database
     */
    PCelestial.prototype.setDefaultStarColors = function () {

        let c = this.dHygColors;

        c['o'] = {r:0.598529412, g: 0.683578431, b: 1},
        c['b'] = {r:0.680490196, g: 0.759068627, b: 1},
        c['a'] = {r:0.790196078, g: 0.839607843, b: 1},
        c['f'] = {r:0.933382353, g: 0.930392157, b: 0.991470588},
        c['g'] = {r:1, g: 0.925686274, b: 0.830882353},
        c['k'] = {r:1, g: 0.836421569, b: 0.629656863},
        c['m'] = {r:1, g: 0.755686275, b: 0.421764706},
        c['n'] = {r:0.987654321, g: 0.746356814, b: 0.416557734},
        c['w'] = {r:0.598529412, g: 0.683578431, b: 1},
        c['r'] = {r:1, g: 0.868921569, b: 0.705735294},
        c['c'] = {r:1, g: 0.828186274, b: 0.576078431},
        c['s'] = {r:1, g: 0.755686275, b: 0.421764706},
        c['d'] = {r:0.798823529, g: 0.834901961, b: 0.984313726};

    };

    PCelestial.prototype.setDefaultSpriteIndex = function () {

        let si = this.dHygSpriteIndex;
        si['o'] = 6, //standard
        si['b'] = 5,
        si['a'] = 4,
        si['f'] = 3,
        si['g'] = 2,
        si['k'] = 1,
        si['m'] = 0,
        si['n'] = 0, //less common
        si['s'] = 0,
        si['r'] = 1,
        si['c'] = 1,
        si['d'] = 4,
        si['w'] = 6;

    };

    /**
     * Load stellar colors for all stellar types
     */
    PCelestial.prototype.setAllStarColors = function (assetManager, model, dir) {

        let colors = dir + model.colors;

        console.log("------------------------------");
        console.log('loading colors for all stellar types:' + colors)

        const loadColors = assetManager.addTextFileTask(colors.substring(0, colors.lastIndexOf(".")) + '-starcolors', colors);

        loadColors.onSuccess = async function (colors) {
            console.log('PCELESTIAL Stellar colors loaded, parsing data...')
            celestial.setAllStarColors(colors.text);
        };

        loadColors.onTaskError = function (task) {
            console.log('task failed', task.errorObject.message, task.errorObject.exception);
        };

    };

    /**
     * Get the colors by loading a JSON file */
    PCelestial.prototype.getStarColorsByStellarType = function (star, name = 'unknown') {

        let c = null;
        let s = star.spect;

        // look for an exact match
        c = this.hygColors[s];
        if(c) return colors;

        // if an exact match doesn't exist, truncate, e.g. 'M5Ve'...'M5V'...'M5'
        for (i = s.length - 2; i > 2; i--) {
            let t = s.substring(0, i);
            c = this.hygColors[s];
            if(c) return c;
        }

        // one-letter average default, part of this class

        console.warn('no stellar type found for:' + name);
        return this.dHygColors[s.substring(0,1)];

    };

    PCelestial.prototype.setHygPosition = function () {

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

    PCelestial.prototype.setHygMag = function () {

    };

    PCelestial.prototype.setHygName = function () {

    };

    /**
     * Load Hyg3 database as a JSON file, optionally using stellar type 
     * colors.
     * @param {BABYLON.AssetManager} assetManager
     * @param {ObjectJSON} model model parameters and asset files
     * @param {String} dir the directory for model files
     */
    PCelestial.prototype.loadHygData = function (assetManager, model, dir, scene) {

        let celestial = this; // references for callbacks
        let util = this.util; // utilities

        if(!model.hyg) {
            console.error('loadHygData ERROR: invalid hyg data, dir:' + dir + ' file:' + model.hyg);
        }

        // load the Hyg3 database
        let hyg = dir + model.hyg;
        let loadHYG = assetManager.addTextFileTask(hyg.substring(0, hyg.lastIndexOf(".")) + '-stardome', hyg);

        loadHYG.onSuccess = async function (stars) {
            //loadHYG.stars = JSON.parse(stars.text);

            util.asyncJSON(hyg, async function (stars) {
                console.log('@@@@@@@@@@building stars')
                this.spriteMgr = await celestial.computeHygSprite(stars, dir + 'sprite/textures/' + model.spritesheet, model.size, scene).then((spriteManagerStars) => {
                    console.log('@@@@@@@@@@@@Hyg stardome loaded');
                });
            });

        };

        loadHYG.onTaskError = function (task) {
            console.log('task failed', task.errorObject.message, task.errorObject.exception);
        };

    };

    /** 
     * use Hyg3 data to create a 3D galaxy of Star sprites.
     * @param {Object} hygData an array of objects with Hyg3 stellar data
     * @param {String} spriteSheetFile the image file to use for Sprite images
     * @param {Number} size the height in pixels of the spriteSheet image. Generally several images horizontally
     * @param {BABYLON.Scene} scene
     */
    PCelestial.prototype.computeHygSprite = async function (hygData, spriteSheetFile, size, scene) {

        let util = this.util;

        if(! hygData || !util.isArray(hygData) || !hygData.length) {
            console.error('computeHygSprite ERROR: invalid Hyg data (not an array)');
            return false;
        }

        let numStars    = hygData.length; // an array of star data objects
        let spriteSize  = size || this.dSpriteScreenSize; // set for existing scene, environment
        let maxDist     = this.dMaxHygDist / this.dParsecUnits;
        let oDist       = maxDist / 2; // cutoff for very distant stars in Hyg
        let spriteIndex = 0;

        // load a SpriteManager for the Stars

        let spriteManagerStars = new BABYLON.SpriteManager('starsManager', spriteSheetFile, numStars, size, scene);
        spriteManagerStars.isPickable = true;

        console.log("@@@@@COMPUTING HygSprite")

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

        for(let i = 0; i < 100; i++)
        asyncLoop.executeNext(i);




    };

    return PCelestial;

}());


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
            sprite.hyId = star.id;
            sprite.aMag  = setHygMag(star);

            let baseDist = 100; ///////////////////////////////////
            let baseScale = 0.2 ///////////////////////////////////

            if(star.id == "11734") { // Polaris
                window.polaris = sprite;
                sprite.size *= 100;
                sprite.lookAt = function (camera) { camera.target = this.position}
            }

            if(star.id == "7574") { // Achernar
                window.achernar = sprite;
                sprite.size *= 3;
                sprite.lookAt = function (camera) { camera.target = this.position}
            }

            if(star.id == "118441") { // star behind sirius
                sprite.size = 0.001
            }

            if(star.id == "32263") { // Sirius
                window.sirius = sprite;
                sprite.size /= 2;
                sprite.lookAt = function (camera) {camera.target = this.position}
            }

            if(star.id == "27919") {  // Betelgeuse
                window.betelgeuse = sprite;
                sprite.size *= baseDist * 0.5 * baseScale;
                sprite.lookAt = function (camera) { camera.target = this.position}
            }

            if(star.id == "24378") { // Rigel
                window.rigel = sprite;
                sprite.size *= baseDist * 0.75 * baseScale;
                sprite.lookAt = function (camera) { camera.target = this.position}
            }

             // Bellatrix
            if(star.id == "25273") { // Bellatrix
                window.bellatrix = sprite;
                sprite.size *= baseDist * 0.2 * baseScale;
                sprite.lookAt = function (camera) { camera.target = this.position}
            }

             // saiph
            if(star.id == "27298") { // Saiph
                window.saiph = sprite;
                sprite.size *= baseDist * 0.5 * baseScale;
                sprite.lookAt = function (camera) { camera.target = this.position}
            }

            if(star.id == "26662") { // Alnitak, orion belt, left
                window.alnitak = sprite;
                sprite.size *= baseDist * 0.7 * baseScale;
                sprite.lookAt = function (camera) { camera.target = this.position}
                //camera.target = sprite.position;
            }
            if(star.id == "26246") { // Alnilam, orion belt, middle
                window.alnilam = sprite;
                sprite.size *= baseDist * 1.6 * baseScale;
                sprite.lookAt = function (camera) { camera.target = this.position}

            }
            if(star.id == "25865") { // Mintaka, right
                sprite.size *= baseDist * 0.7 * baseScale;
                window.mintaka = sprite;
                sprite.lookAt = function (camera) { camera.target = this.position}
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
                    spriteManagerStars.disableDepthWrite = false;
                    sprite.width = sprite.height = dSpriteScreenSize;
                    sprite.color.a = 1;
                    // TODO: alpha based on absolute magnitude
                } else if (dist >= oDist) { // distance not resolved in Hyg, pre-set above
                    // about 30% of Hyg3 entries are at 100000, all others are 1000 or less
                    // these don't need to be recomputed to the Hyg limit (~1000 parsecs)
                }
                else {
                    // this greatly reduces 'flicker' for overlapping distant stars
                    spriteManagerStars.disableDepthWrite = true;
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
        scene.registerBeforeRender(() => {
            let dx = pos.x - oPos.x,
            dy = pos.y - oPos.y,
            dz = pos.z - oPos.z;
            if((dx + dy + dz) != 0) {
                for(let i = 0; i < hygData.length; i++) {
                    update(spriteManagerStars.children[i], camera);
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