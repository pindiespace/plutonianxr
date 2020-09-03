/**
 * Model of the universe
 * Universe = 1,000,000 parsecs,  10,000,000 units
 * Galaxy   =    30,000 parsecs,     300,000 units (where the skybox is drawn)
 * Hyg Real =       990 parsecs,       9,900 units (stars drawn in 3D)
 * Hyg Max  =   100,000 parsecs,   1,000,000 units (no parallax for star, just a default)
 * (about 10,000 of the 119,000 stars in Hyg3 fall in this category)
 */

var dParsecUnits      =   10; // scale parsec distances to the simulation
var dKmUnits          = 2370; // 1 unit = 2370km, Pluto = 2370/2370 = 1.0
var dSpriteSize       =  128; // default size of sprite panel
var dSpriteScreenSize =    1;

/**
 * Set standar stellar colors in BabylonJS format
 * The numbers are averages of the main spectral types (about 1000 total)
 */
var setHygColors = function () {

    var colors = [];

    colors['o'] = new BABYLON.Color4(0.598529412, 0.683578431, 1, 1);
    colors['b'] = new BABYLON.Color4(0.680490196, 0.759068627, 1, 1);
    colors['a'] = new BABYLON.Color4(0.790196078, 0.839607843, 1, 1);
    colors['f'] = new BABYLON.Color4(0.933382353, 0.930392157, 0.991470588, 1);
    colors['g'] = new BABYLON.Color4(1, 0.925686274, 0.830882353, 1);
    colors['k'] = new BABYLON.Color4(1, 0.836421569, 0.629656863, 1);
    colors['m'] = new BABYLON.Color4(1, 0.755686275, 0.421764706, 1);
    colors['n'] = new BABYLON.Color4(0.987654321, 0.746356814, 0.416557734, 1);
    colors['w'] = new BABYLON.Color4(0.598529412, 0.683578431, 1,  1);
    colors['r'] = new BABYLON.Color4(1, 0.868921569, 0.705735294, 1);
    colors['c'] = new BABYLON.Color4(1, 0.828186274, 0.576078431, 1);
    colors['s'] = new BABYLON.Color4(1, 0.755686275, 0.421764706, 1);
    colors['d'] = new BABYLON.Color4(0.798823529, 0.834901961, 0.984313726, 1);

    return colors;
};

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

    let amag = star.absmag;

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

    if(!isNumber(amag)) {
        if(amag == '') {
            let s = star.spect.toLowerCase()[0];
            if(s == '') amag = 0;
            else amag = sMag[s];
        } else amag = 0;
    }

    // empirical formula
    let mag = 1 - ((20 + (amag^2))/200);

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
 * Compute points rather than shapes, direct WebGL
 * @link https://github.com/brian-hay/celestial-sphere/blob/master/main.ts
 * @param {ObjectJSON} hygData 
 * @param {Scene} scene 
 */
var computeHygPoint = function (hygData, scene) {

};


/**
 * Load star information from a Hyg file in JSON format parsed to a JS object.
 * note: spritemanager.children gets the individual sprites
 * meatball
 * https://www.babylonjs-playground.com/#N74LDU#5
 * https://www.babylonjs-playground.com/#8AH0JV#23
 * @param {Array} data
 * @param {String} spriteSheet 
 * @param {Scene} scene
 */
var computeHygSprite = function (hygData, spriteFile, size, scene) {

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
            sprite.hyid = star.id;
            sprite.amag  = setHygMag(star);

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
                    let a = 2 * sprite.amag - (dist/1200);
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