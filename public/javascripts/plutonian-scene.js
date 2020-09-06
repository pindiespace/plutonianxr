/**
 * Plutonian Scenes.
 * Constants are referenced relative to PLUTO
 * - 1 unit = 2370km
 */

// Initialize <canvas>, attach as rendering surface
var canvas = document.getElementsByClassName('render-xr-canvas')[0];

var PScene = (function () {

    // constructor

    function PScene() {

        this.dUSize    =   1000000;        // size of universe (not drawn beyond dVisUSize)
        this.dVisSize  =     10000;        // size of skybox
        this.dPosition =         0;        // default x, y, z coordinate
        this.dDistance =         0;        // default distance from world center
        this.dDiameter =         1;        // default = 1 unit
        this.dAlpha    =       0.2;        // default alpha values
        this.dSegments =        32;        // default sphere segmentation
        this.dRot      =     0.002;        // default rotation speed 2000 increments with 60fps
        this.dUnknown  = 'unknown';        // unknown object, key or value
        this.engine    =    engine;        // assign class variables

        this.util = new PUtil();
        this.setup = new PSetup(this.util);
        this.canvas = this.setup.getCanvas();
        this.celestial = new PCelestial(this.util);
        // attach engine here

    };

    // functions

    PScene.prototype.checkObject = function (pObj) {

        let util = this.util;

        if(!util.isObject(pObj)) {
            console.error('PObject ERROR: not a valid object');
            return false;
        }

        if(!util.isString(pObj.key)) {
            console.error('PObject ERROR: key missing');
            return false;
        }

        if(!util.isObject(pObj.data)) {
            console.error('PObject ERROR:' + obj.name + ' missing data');
            return false;
        }

        if(!util.isString(pObj.dname)) {
            console.error('PObject ERROR:' + obj.name + ' missing data directory');
            return false;
        }

        if(!util.isString(pObj.name)) {
            console.warn('Object WARNING: name missing');
        }

        return true;

    };

    /**
     Confirm the models
     */
    PScene.prototype.getActiveModel = function (models) {

        let util = this.util;
        let model = null;

        if(!util.isObject(models)) {
            console.warn('getActiveModel WARNING: no model object');
            return model;
        }

        // try to find the currently active model

        for(var i in models) {

            model = models[i];

            if(model.active) {

                return model;

            } 

        }

        // no active model returned, look for default model

        if(models.default) {

            return models.default;

        } else {

            console.error('checkModels ERROR: no default model found');

        }

        return model;

    };


    /**
     * Add a mesh to the worlds Object
     * @param{ObjectJSON} pObj
     * @param{Mesh} mesh
     */
    PScene.prototype.setMesh = function (pObj, mesh) {

        let util = this.util;

        if(!util.isObject(pObj)) {
            console.error('setMesh: invalid object');
            return false;
        }

        if(!mesh) {
            console.error('setMesh: invalid mesh');
            return false;
        }

        if(!mesh.isReady()) {
            console.error('setMesh: supplied mesh not ready to use' + mesh.name);
            return false;
        }

        if(pObj.mesh) {
            // parameters: dispose referenced materials and textures 
            pObj.mesh.dispose(false, true);
        }
        
        pObj.mesh = mesh;

        return true;

    };

    /**
     * make mesh visible and enabled, or disabled and invisible
     */
    PScene.prototype.toggleMeshActivation = function (mesh) {

        if(mesh) {

            // visibility only
            //if(m.visibility == 1) m.visibility = 0.0;
            //else m.visibility = 1;

            if(mesh.isEnabled()) {
                //mesh.isVisible = false;
                mesh.setEnabled(false);

            } else {
                //mesh.isVisible = true;
                mesh.setEnabled(true);

            }

        }

    };

    /**
     * Set scale for star systems, galaxies.
     */
    PScene.prototype.setPlanetScale = function (data, scale) {

        let util = this.util;

        let sData = {
            diameter: dDiameter,
            distance: dDistance,
            segments: dSegments
        };

        if(util.isNumber(data.diameter) && data.diameter > 0) {
            sData.diameter = data.diameter/dKmUnits;
            if(sData.diameter < 0.01) {
                console.warn('WARNNG: diameter very small (' + sData.diameter + ' units');
            }
        }

        if(util.isNumber(data.distance) && data.distance != 0) {
            sData.distance = data.distance/dKmUnits; 
        }

        if(util.isNumber(data.segments)) {
            sData.segments = data.segments;
        }

        return sData;

    };

    /**
     * Adjust 8-bit rgb values to BabylonJS 0-1 color
     * @param {Array} colorArr
     * @returns {BABYLON.Color3 | BABYLON.Color4}
     * If a color is not in the 0-1 range, adjust it.
     */
    PScene.prototype.getColor = function (colorArr) {

        var r = 0, g = 0, b = 0, a = 1, color = null;

        let util = this.util;

        if(!util.isArray(colorArr)) {

            console.error('getColor ERROR: invalid color array passed');

        } else if(!util.isNumber(colorArr[0]) || !util.isNumber(colorArr[1]) || !util.isNumber(colorArr[2])) {

            console.error('getColor ERROR: invalid numbers in color array');

        } else {

            r = colorArr[0], g = colorArr[1], b = colorArr[2];

            if((r + g + + b) > 1.0) {

                r /= 255, g /= 255, b /= 255;

                if(util.isNumber(colorArr[3])) {
                    a = colorArr[3];
                    if(a > 1.0) {
                        a /= 255;
                    }
                    color =  new BABYLON.Color4(r, g, b, a);

                } else {
                    color = new BABYLON.Color3(r, g, b);
                }

            }

        }

        return color;
    };

    PScene.prototype.setPositionByXYZ = function (data, vec, units = 1) {

        let util = this.util;

        if(!util.isObject(vec) || !util.isNumber(vec.x)) {
            console.error('setPositionByXYZ ERROR: invalid vector passed:' + vec)
            return false;
        }

        if(!util.isNumber(data.x) || !util.isNumber(data.y) || !util.isNumber(data.z)) {
            console.error('setPositionByXYZ ERROR: invalid data passed');
            return false;
        }

        vec.x = data.x * units;
        vec.y = data.y * units;
        vec.z = data.z * units;

        return true;

    };

    PScene.prototype.setPositionByRADec = function (data, vec, units = 1) {

        console.warn("UNITSSSSS ARE:" + units)

        let util = this.util;

        if(!util.isObject(vec) || !util.isNumber(vec.x)) {
            console.error('setPositionByRADec ERROR: invalid vector passed:' + vec);
            return false;
        }

        if(!util.isNumber(data.ra) || !util.isNumber(data.dec) || !util.isNumber(data.distance)) {
            console.error('setPositionByRADec ERROR: invalid ra, dec, or distance');
            return false;
        }

        let A = degToRad(parseFloat(data.ra) * 15);
        let B = degToRad(parseFloat(data.dec));

        // Note: we reverse the y and z axes to match the BabylonJS coordinate system
        vec.x = Math.cos(B) * Math.cos(A) * data.distance * units,
        vec.z = Math.cos(B) * Math.sin(A) * data.distance * units, // was y
        vec.y = Math.sin(B) * data.distance * units; // was z

        return true;

    };

    /**
     * Set the position of a planet, star, galaxy, etc. in the mesh position object.
     * Used by everything but StarDomes
     */
    PScene.prototype.setPosition = function (data, position, units = 1) {

        if(this.setPositionByXYZ(data, position, units)) {

            return true;

        } else if(this.setPositionByRADec(data, position, units)) {
            return true;

        } else {

            console.error('setPosition ERROR: could not set by XYZ or RA, Dec');

        }

        return false;

    };

    PScene.prototype.setRotationByRADec = function (data, vec) {

        // for x = x, z = y, y = z
        //data.ra = 179.2; // side to side (almost 180)
        //data.dec = 61.2; //up and down (correct galactic degrees 60.2)

        let util = this.util;

        if(!util.isObject(vec) || !util.isNumber(vec.x)) {
            console.error('setRotationByRADec ERROR: invalid vector passed:' + vec)
            return false;
        }

        if(!util.isNumber(data.ra) || !util.isNumber(data.dec)) {
            console.error('setRotationByRADec ERROR: invalid ra, dec, or distance');
            return false;
        }

        let A = degToRad(parseFloat(data.ra) * 15);
        let B = degToRad(parseFloat(data.dec));

        // Unlike positions, rotations are NOT flipped.
        vec.x = Math.cos(B) * Math.cos(A);
        vec.z = Math.sin(B); // was z
        vec.y = Math.cos(B) * Math.sin(A); // was y

        return true;

    };

    PScene.prototype.setRotationbyQuat = function (data) {

    };

    PScene.prototype.setLabel = function (pObj) {
        // Use: https://www.babylonjs-playground.com/#ZI9AK7#124
    };

    PScene.prototype.setDescription = function (pObj) {

    };

    PScene.prototype.follow = function (pObj) {

    };

    PScene.prototype.loadArtifact = function (pObj) {

    };

    PScene.prototype.loadSpaceVolume = function (pObj, dir, scene) {

        console.log("------------------------------");
        console.log('creating space volume:' + pObj.name)

        let util = this.util;
        let mesh = null;

        if(!this.checkObject(pObj)) {
            console.error('loadSkybox ERROR: invalid object passed');
            return mesh;
        }

        let data = pObj.data;

        if(!util.isObject(data)) {
            console.error('loadSkybox ERROR: no data object in:' + pObj.name);
            return mesh;
        }
        
        // create a spherical volume, using data or defaults
        mesh = BABYLON.MeshBuilder.CreateSphere(
            pObj.key || this.dUnknown, {
                diameter: data.diameter || dDiameter, 
                segments: data.segments || dSegments
                }, scene);

        /* 
         * All objects have a spaceVolume. There is no separate model for 
         * tspaceVolume - all objects have a translucent sphere, back culling off. 
         * StarSystem - only the spaceVolume mesh
         * Star - spaceVolume, Planet, and Sprite mesh possible
         */

        // position the space volume

        // TODO: fix dParsecUnits
        
        this.setPositionByRADec(data, mesh.position, dParsecUnits); 

        console.log(pObj.name + " SpaceVolume position x:" + mesh.position.x + " y:" + mesh.position.y + " z:" + mesh.position.z)

        // create material
        let mat = new BABYLON.StandardMaterial(pObj.name + '-mat', scene);

        // space volumes only have color, not a texture
        let color = this.getColor(data.color);

        if(color) {
            mat.diffuseColor = color;
        } else {
            mat.diffuseColor = BABYLON.Color3.Green();
        }

        // mesh visibility rather than alpha channel for color
        mesh.visibility = this.dAlpha;

        // soft specular highlight
        mat.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);

        // not visible when you're inside
        mat.backFaceCulling = false; // don't need to see inside

        // set the material to the mesh
        mesh.material = mat;

        return mesh;

    };

    /**
    * Infinite-distance skybox. Used to create galaxy background
        TODO: rotate galaxy stardome by 
        TODO: Galactic tilt RA = 12:52 (+192 degrees) and Dec = +26:19.
        TODO: Galactic rotation RA = 17:45 and Dec = -29:22
        TODO: http://spiff.rit.edu/classes/phys301/lectures/coords/coords.html
        // Manual adjustment of milky way cubemap
        // for x = x, z = y, y = z
        //data.ra = 179.2; // side to side (almost 180)
        //data.dec = 61.2; //up and down (correct galactic degrees 60.2)
    * @param {String} cubemap name (BabylonJS-specifics)
    * @param {String} dir 
    * @param {Scene} scene
    */
    PScene.prototype.loadSkybox = function (pObj, dir, scene) {

        console.log("------------------------------");
        console.log('creating skybox:' + pObj.name);

        let util = this.util;
        let mesh = null;

        if(!this.checkObject(pObj)) {
            console.error('loadSkybox ERROR: invalid object passed');
            return mesh;
        }

        let data = pObj.data;

        if(!util.isObject(data)) {
            console.error('loadSkybox ERROR: no data object in:' + pObj.name);
            return mesh;
        }

        let model = this.getActiveModel(data.models);

        if(!util.isObject(model)) {
            console.error('loadSkybox ERROR: no active model found');
            return mesh;
        }

        // Empirical rotations for this particular skybox
        // TODO: add to JSON file for each cubemap

        data.ra = 179.25; // side to side (almost 180)
        data.dec = 60.749; //up and down (correct galactic degrees 60.2)

        /* 
         * Create an infinite-distance skybox
         * NOTE: the box clips the drawing of the stars at its size, even though it renders at infinite
         * NOTE: you can't set to really huge amounts (e.g. 10000000) or it chokes and disappears
         * NOTE: some stars in the Hyg database are further away than 10000!
         */
        let bSize = this.dVisSize;

        if(isNumber(data.diameter) && data.diameter > 0) {
            bSize = data.diameter * dParsecUnits;
            console.log('skybox for:' + pObj.name + ' using bSize:' + bSize);
        }

        // create the mesh
        mesh = BABYLON.MeshBuilder.CreateBox(pObj.key, {size:bSize}, scene);
        mesh.infiniteDistance = true;
        mesh.freezeNormals(); // don't need to calculate

            // translate and rotate

        this.setPosition(data, mesh.position, dParsecUnits);
        this.setRotationByRADec(data, mesh.rotation);

        // create mesh lookup in pObj

        // create temporary mesh rotator

        window.addEventListener('keydown', (e) => {
            //console.log("key is:" + e.key)
            switch(e.key) {
                case 'w':
                    data.ra -= 0.02
                    break;
                case 'a':
                    data.ra += 0.02
                    break;
                case 's':
                    data.dec -= 0.05
                    break;
                case 'd':
                    data.dec += 0.05
                    break;
            }
            this.setRotationByRADec(data, mesh.rotation);
        });

        // Create material suitable for an infinite-distance skybox
        var mat = new BABYLON.StandardMaterial(pObj.key + '-cubemap', scene);
        mat.backFaceCulling = false;
        mat.diffuseColor = new BABYLON.Color3(0, 0, 0);
        mat.specularColor = new BABYLON.Color3(0, 0, 0);

        // Load a cubemap. Files in each model directory
        if(model.cubemap) {

            mat.reflectionTexture = new BABYLON.CubeTexture(dir + '/textures/' + model.cubemap + '/', 
            scene, ['_px.png', '_py.png', '_pz.png', '_nx.png', '_ny.png', '_nz.png']);

            // Skybox is always drawn at infinity
            mat.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;

        }

        mesh.material = mat;

        return mesh;
    };

    PScene.prototype.loadStarDome = function (pObj, dir, scene) {

        let util = this.util;
        let mesh = null;

        console.log("------------------------------");
        console.log("creating stardome:" + pObj.name)

        if(!this.checkObject(pObj)) {
            console.error('loadStarDome ERROR: invalid object passed');
            return mesh;
        }

        let data = pObj.data;

        if(!util.isObject(data)) {
            console.error('loadStarDome ERROR: no data object in:' + pObj.name);
            return mesh;
        }

        let model = this.getActiveModel(data.models);

        if(!util.isObject(model)) {
            console.error('loadStarDome ERROR: no active model found');
            return mesh;
        }

        let domeDir = dir + '/' + pObj.dname + '/';

        // use the AssetsManager to load the large JSON data file
        let assetManager = new BABYLON.AssetsManager(scene);

        // Specific to hyg3 stellar database models
        if(model.hyg) {

            // TODO: GUI OR PERFORMANCE SELECT
            // mod = models.sprite120; ////////////////////////////////////////

            let hyg = domeDir + model.hyg;

            let loadHYG = assetManager.addTextFileTask(hyg.substring(0, hyg.lastIndexOf(".")) + '-stardome', hyg);

            assetManager.onProgress = function(remainingCount, totalCount, lastFinishedTask) {
                console.log('Loading Hyg database files. ' + remainingCount + ' out of ' + totalCount + ' items still need to be loaded.');
            };

            assetManager.onFinish = function(tasks) {
                console.log('All done with loading Hyg database');
            };

            loadHYG.onSuccess = async function(stars) {

                loadHYG.stars = JSON.parse(stars.text);

                const spriteMgr = await computeHygSprite(loadHYG.stars, domeDir + 'sprite/textures/' + model.spritesheet, model.size, scene).then((spriteManagerStars) => {
                    console.log('Hyg stardome loaded');
                }); // TODO: attach elsewhere, or delete!

            }

            // Load stellar colors
            this.celestial.loadHygData(assetManager, model, domeDir, scene);

            assetManager.load();

        } else {
            console.error('loadStarDome ERROR: no Hyg model data');
        }

        return mesh;

    };

    PScene.prototype.loadPlanet = function (pObj, dir, scene) {

    };

    PScene.prototype.loadStar = function (pObj, dir, scene) {

    };

    PScene.prototype.loadStarSystem = function (pObj, dir, scene) {

    };

    PScene.prototype.loadGalaxy = function (pObj, dir, scene)  {

    };

    PScene.prototype.loadDarkMatter = function (pObj, dir, scene) {

    };

    PScene.prototype.loadWorld = function () {

    };

    PScene.prototype.createAssets = function () {

    };

    PScene.prototype.createScene = function () {

    };

    PScene.prototype.start = function () {

    };

   return PScene;

}());

var plutonianScene = new PScene();

///////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////

var dUSize    =   1000000;     // size of universe (not drawn beyond dVisUSize)
var dVisSize    =   10000;     // size of skybox
var dPosition =         0;     // default x, y, z coordinate
var dDistance =         0;     // default distance from world center
var dDiameter =         1;     // default = 1 unit
var dAlpha    =       0.2;
var dSegments =        32;     // default sphere segmentation
var dRot      =     0.002;     // default rotation speed 2000 increments with 60fps
var dUnknown  = 'unknown'; // unknown object, key or value

// This is inside ./assets, a route defined in ExpressJS 
var worldDir  = "worlds";

/**
 * Create the Default Scene
 */
var assetManager = null;

var glow = null;

var scene = null;
var sceneToRender = null;




/**
 * Load planetary-style models (single pherical or other 3D mesh)
 * @param {ObjectJSON} obj 
 * @param {String} dir 
 * @param {Mesh} parent 
 */
var loadPlanetModel = function (obj, dir, scene, parent) {

    console.log("------------------------------");
    console.log('creating space volume:' + obj.name)

    var mesh = null;
    var segments = dSegments;

    if(isObject(obj.data)) {

    }

    console.log("------------------------------");
    console.log("drawing planetModel:" + obj.name)

    if(obj && obj.data && obj.data.models) {

        //console.log(obj.name + ' diameter:' + obj.data.diameter + ' distance:' + obj.data.distance)

        // scale raw values to plutonian units

        //let scaled = scaleToPlutonian(obj.data);
        let scaled = plutonianScene.setPlanetScale(obj.data);

        let texDir = dir + '/textures/';
        let models = obj.data.models;

        if(isString(models.gltf)) {

        } else if(isString(models.aliasObj)) {

        } else if(isObject(models.default)) {

            let mod = models.default;

            if(isString(mod.surface)) {

                console.log(obj.name + ' texture:' + dir + '/textures/' + mod.surface)

                mesh = BABYLON.MeshBuilder.CreateSphere(obj.key, {diameter:scaled.diameter, segments: 32}, scene);
                
                // TODO: stars are set via setPosition()
                // TODO: planets are set via translation to their distance.
                // TODO: need to modify position calculations from planetary computations so they are local
                // TODO: set local coordinates

                // TODO: this gets planets orbiting stars
                // TODO: need to change!
                mesh.setPositionWithLocalVector(new BABYLON.Vector3(scaled.distance, 0, 0));
                ////////////////////setPosition(data, mesh.position, 1); 

                // material
                mesh.material = new BABYLON.StandardMaterial(obj.key + 'Mat', scene);
                let mat = mesh.material;

                // check if emissive, since Stars may use this model
                if (mod.emissive) {

                    //mesh.freezeNormals(); // TODO: may be useful

                    // add a light, centered in the mesh
                    const light = new BABYLON.PointLight(obj.name + 'Light', mesh.getAbsolutePosition(), scene);
                    light.position = new BABYLON.Vector3(0, 0, 0);
                    light.parent = mesh;

                    // add an emissive texture
                    mat.emissiveTexture = new BABYLON.Texture(texDir + mod.surface, scene, true, false);

                    // set colors
                    if(obj.data.color) {

                        var c = plutonianScene.getColor(obj.data.color);

                        if(c) {
                            mat.diffuseColor = c.clone();
                            //mat.specularColor = c.clone();

                        } else {
                            mat.diffuseColor = new BABYLON.Color3(1, 1, 1);
                        }

                    } else { // not emissive
                        mat.diffuseColor = new BABYLON.Color3(0, 0, 0);
                    }

                    // No specular for emissive objects
                    mat.specularColor = new BABYLON.Color3(0, 0, 0);

                    //https://doc.babylonjs.com/how_to/glow_layer
                    var options = { 
                        mainTextureRatio: 0.1,
                        //mainTextureFixedSize: 256,
                        blurKernelSize: 100
                    };
                    var gl = new BABYLON.GlowLayer('glow', scene, options);
                    gl.intensity = 5;
                    mat.emissiveColor = new BABYLON.Color3(0.678, 0.556, 0.423);
                    gl.addIncludedOnlyMesh(mesh);

                } else { // non-emissive

                    mat.diffuseTexture = new BABYLON.Texture(texDir + mod.surface, scene);

                    // specular value
                    if(isNumber(mod.specular)) {
                        mat.specularColor = new BABYLON.Color3(mod.specular, mod.specular, mod.specular)
                    } else {
                        mat.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5)
                    }

                }

/*
                    // highlight layer (also good for backlit atmosphere)
                    // https://doc.babylonjs.com/how_to/highlight_layer
                        var options = {
                        alphaBlendingMode: 2,  // must be two
                        blurHorizontalSize: 1, // horiz and vertical 1:1 for smooth glow
                        blurTextureSizeRatio: 0.1, // make smaller to get extended glow
                        blurVerticalSize: 1,
                        mainTextureRatio: 0.9
                    };
                    var hl = new BABYLON.HighlightLayer("hg", scene, options);
                    hl.innerGlow = false;
                    hl.addMesh(mesh, new BABYLON.Color3(.9, .9, .9))

*/

            // Axial tilt

            // Runs every frame to rotate the sphere
            scene.onBeforeRenderObservable.add(()=>{
                mesh.rotation.y += 0.0001*scene.getEngine().getDeltaTime();
                //mesh.rotation.x += 0.0001*scene.getEngine().getDeltaTime();
            });

            }
        } else {
                console.error("No model for:" + obj.name);
        }

    }

    return mesh;
};

/** 
 * set user interactions for camera (non-VR)
 * @param {Mesh} mesh
 */
var setPlanetActions = function (mesh) {
    mesh.actionManager
    .registerAction(
        new BABYLON.InterpolateValueAction(
            BABYLON.ActionManager.OnPickTrigger,
            light,
            'diffuse',
            BABYLON.Color3.Black(),
            1000
        )
    )
    .then(
        new BABYLON.SetValueAction(
            BABYLON.ActionManager.NothingTrigger,
            mesh.material,
            'wireframe',
            false
        )
    );
}

/**
 * Load human-created artifacts in space or attached to planet (might have multiple meshes)
 * @param {Object} artifact 
 * @param {Object} parent 
 */
var loadArtifact = function (artifact, dir, parent) {

    if(isObject(artifact)) {

    }

}; // end of loadArtifact

/**
 * Load a Moon of a Planet
 * @param {ObjectJSON} moon 
 * @param {String} dir  
 * @param {Mesh} parent 
 */
var loadMoon = function (moon, dir, scene, parent) {

    var mesh = null;

    if(isObject(moon)) {
        if(plutonianScene.checkObject(moon)) {
            mesh = loadPlanetModel(moon, dir + '/' + moon.dname, scene, moon);
            if(parent) {
                mesh.parent = parent;
            }

        }

        // A moon of a moon supported by type 'moon'

    }
    return mesh;

}; // end of loadMoon

/**
 * Load a Planet of a Star, Galaxy, or universe
 * @param {ObjectJSON} planet
 * @param {String} dir 
 * @param {Mesh} parent 
 */
var loadPlanet = function (planet, dir, scene, parent) {

    var mesh = null;

    if(isObject(planet)) {

        // draw the planet (apart from its moons)
        if(plutonianScene.checkObject(planet)) {
            mesh = loadPlanetModel(planet, dir + '/' + planet.dname, scene, parent);
            if(parent) {
                mesh.parent = parent; //only for perfectly circular orbits, or dynamic radius computation
            }
        }

        // draw the moons

        if(Array.isArray(planet.moons)) {
            for(let i = 0; i< planet.moons.length; i++) {
                loadMoon(planet.moons[i], dir + '/' + planet.dname + '/moons', scene, mesh);
            }
        }
    }
    return mesh;

}; // end of loadPlanet

/**
 * Load a Star of a StarSystem, Galaxy or universe
 * @param {ObjectJSON} star 
 * @param {String} dir 
 * @param {Mesh} parent 
 */
var loadStar = function (star, dir, scene, parent) {

    var mesh = null;

    if(isObject(star)) {

        // draw the star (apart from planets, etc)
        mesh = loadPlanetModel(star, dir + '/' + star.dname, scene, parent);
        if(mesh) {
            // NOTE: we don't make the parent (planetary system) a drawing parent
            // NOTE:since we will hide the planets if we hide its mesh
            //mesh.parent = parent;
            console.log("Setting parent for star:" + star.name)
        }

        // draw the planets, comets, asteroids

        if(Array.isArray(star.planets)) {
            for(let i = 0; i< star.planets.length; i++) {
                loadPlanet(star.planets[i], dir + '/' + star.dname +  '/planets', scene, mesh);
            }
        }

    }
    return mesh;

}; // end of loadStar

/**
 * Load a StarSystem
 * @param {ObjectJSON} starSystem 
 * @param {String} dir  
 * @param {Mesh} parent 
 */
var loadStarSystem = function (starSystem, dir, scene, parent) {

    var mesh = null;

    // draw the star system (apart from stars, planets, moons)

    if(isObject(starSystem)) {

        // draw the star system (apart from its stars)
        // default is an invisible sphere
        mesh = plutonianScene.loadSpaceVolume(starSystem, dir, scene);
        // we don't make this a render parent, otherwise, it remains stationary to the viewer
        //mesh.parent = parent;

        // draw the stars

        if(Array.isArray(starSystem.stars)) {
            for(let i = 0; i< starSystem.stars.length; i++) {
                loadStar(starSystem.stars[i], dir + '/' + starSystem.dname + '/stars', scene, mesh);
            }
        }

    }
    return mesh;

}; // end of loadStarSystem

/**
 * Load of a Galaxy or universe
 * @param {ObjectJSON} nebula 
 * @param {String} dir  
 * @param {Mesh} parent 
 */
var loadNebula = function (nebula, dir, scene, parent) {

    if(isObject(nebula)) {

        // draw the nebula

    }

}; // end of LoadNebula

/**
 * Load a Galaxy of the universe
 * @param {ObjectJSON} galaxy 
 * @param {String} dir  
 * @param {Mesh} parent 
 */
var loadGalaxy = function (galaxy, dir, scene, parent) {

    console.log("------------------------------");
    console.log('creating galaxy:' + galaxy.name)

    var mesh = null;

    if(isObject(galaxy)) {

       // TODO: WARN ON WRONG UNIVERSE SIZE

        if(parent && parent.data && parent.data.diameter <= galaxy.data.diameter) {
                console.warn('WARNING: universe smaller than galaxy');
        }

        // draw the galaxy model as an infinite cubemap
        //mesh = loadSkyBox(galaxy, dir, scene);
        mesh = plutonianScene.loadSkybox(galaxy, dir, scene);

        /*
        if(mesh) {
            let d  = mesh.getBoundingInfo().boundingSphere.radius;
            let pd = parent.getBoundingInfo().boundingSphere.radius;
            if(d > pd) {
                parent.scaling.x *= 2;
                parent.scaling.y *= 2;
                parent.scaling.z *= 2;
            }
        }
        */

        /*
         * 1. The mesh parent is a empty space, not drawn
         * 2. The skybox is present for each galaxy
         * 3. Since this is projected to infinity, we need a SECOND mesh
         *    otherwise, children inherit projection to infinity
         */
        mesh = plutonianScene.loadSpaceVolume(galaxy, dir, scene);

        // hide for now

        if(mesh) {
            plutonianScene.toggleMeshActivation(mesh);
            //console.log("galaxy " + galaxy.name + " position:" + mesh.position.x + " y:" + mesh.position.y + " z:" + mesh.position.z);
            mesh.parent = parent;
        }

        //toggleMesh(mesh)

        // we DO NOT set the universe as the parent for the galaxy
        // mesh.parent = parent;

        if(Array.isArray(galaxy.globular_clusters)) {
        }

        if(Array.isArray(galaxy.open_clusters)) {
        }

        if(Array.isArray(galaxy.nebula)) {
            for(let i = 0; i< galaxy.nebula.length; i++) {
                loadNebula(galaxy.nebula[i], dir + '/nebula', scene, mesh);
            }
        }

        if(Array.isArray(galaxy.stardomes)) {
            for (let i = 0; i < galaxy.stardomes.length; i++) {
                plutonianScene.loadStarDome(galaxy.stardomes[i], dir + '/stardomes', scene, mesh);
            }
        }

        if(Array.isArray(galaxy.star_systems)) {
            for(let i = 0; i< galaxy.star_systems.length; i++) {
                loadStarSystem(galaxy.star_systems[i], dir + '/star_systems', scene, mesh);
            }
        }

    }
    return mesh;

}; // end of loadGalaxy

var loadDarkMatter = function (darkMatter, dir, scene, parent) {

}; // end of loadDarkMatter

/**
 * Load the world description from a JSON object
 * @param {Object JSON} world
 */
var loadWorld = async function(world, scene) {

    console.log("------------------------------");
    console.log('creating world:' + world.name)

    dir = worldDir;

    // convert 1 unit = 1 parset
    world.data.diameter *= dParsecUnits;

    var mesh = plutonianScene.loadSpaceVolume(world, dir, scene);

    // hide the universe, we only view from inside a galaxy
    plutonianScene.toggleMeshActivation(mesh);

    // Create objects in the universe

    if(world) { // valid world

        if(world.dark_matter) {
            if(Array.isArray(world.dark_matter)) {
                for(let i = 0; i < world.dark_matter.length; i++) {
                    loadDarkMatter(world.dark_matter[i], dir + '/' + world.dname, scene, mesh);
                }
            }
        } //obj.dark_matter

        if(world.galaxies) {
            if(Array.isArray(world.galaxies)) {
                for(let i = 0; i < world.galaxies.length; i++) { // loop through galaxy array
                    loadGalaxy(world.galaxies[i], dir + '/' + world.dname, scene, mesh);
                } // loop through galaxies
            } 
        } // obj.galaxies

    } else {
        console.error("Failed to load world information")
    }

    return mesh;
};

/**
 * Check to see if the world can be parsed.
 * @param {Object} world 
 */
var isValidWorld = function (world) {
    return true;
};

/**
 * Create the scene with all objects from the top-level JSON file.
 * Initialize WebXR.
 * @param {Engine} engine 
 * @param {HTMLCanvasElement} canvas 
 */
var createScene = async function (engine, canvas) {

    // This creates a basic Babylon Scene object (non-mesh)
    var scene = new BABYLON.Scene(engine);

    // TODO: Optimizations
    // https://doc.babylonjs.com/how_to/how_to_use_sceneoptimizer

    // TODO: follow camera
    // https://doc.babylonjs.com/babylon101/cameras

    // This creates and positions a free camera (non-mesh)
    var camera = new BABYLON.FreeCamera('camera1', new BABYLON.Vector3(0, 0, 19), scene);

    camera.maxZ = dUSize * dParsecUnits; // constant, size of skybox for visible universe
    //camera.minZ = 0.1;

    // This targets the camera to scene origin
    camera.setTarget(BABYLON.Vector3.Zero());

    // This attaches the camera to the canvas
    camera.attachControl(canvas, true);

    // TODO: set up controllers
    // https://doc.babylonjs.com/how_to/webxr_controllers_support

    /*
     * Set up VR support
     * Also see https://doc.babylonjs.com/playground/?code=customButtons
     */


    // TODO: not used yet. Check when API exposes it.
    var HMDXRButton = document.getElementsByClassName('xr-toggle.button')[0];

    var xrHelperOptions = {
        //floorMeshes: [environment.ground],
        //disableDefaultUI : true
        createDeviceOrientationCamera: false
    };

    // XR
    var xrHelper = await scene.createDefaultXRExperienceAsync(xrHelperOptions).then(helper => {

            helper.baseExperience.onStateChangedObservable.add((state) => {
                switch(state) {
                    case BABYLON.WebXRState.ENTERING_XR:
                        console.log("Entering XR:" + state)
                        // xr is being initialized, enter XR request was made
                        break;
                    case BABYLON.WebXRState.IN_XR:
                        // XR is initialized and already submitted one frame
                        console.log("In XR:" + state)
                        break;
                    case BABYLON.WebXRState.EXITING_XR:
                        console.log("Exiting XR:" + state)
                        // xr exit request was made. not yet done.
                        break;
                    case BABYLON.WebXRState.NOT_IN_XR:
                        console.log("Not in XR:" + state)
                        // self explanatory - either our or not yet in XR
                        break;
                    }

            });

        });

    return scene;
};

/**
 * Load world assets asynchronously from ./assets directory
 * @param {Scene} scene 
 */
var createAssets = async function (scene) {

    var loadedAssets = {};

    // Begin loading assets
    var assetManager = new BABYLON.AssetsManager(scene);

    var loadJSON = assetManager.addTextFileTask('planets', 'worlds/worlds.json');

    loadJSON.onSuccess = function(world) {

        console.log('World file loaded, validating...');

        try {

            // try to parse the world data
            loadJSON.world = JSON.parse(world.text);

            // if parsed successfully, return JSON object describing the world
            loadedAssets.world = loadJSON.world;

            // check if world can actually be loaded
            if(isValidWorld(loadJSON.world)) {

                let world = loadWorld(loadJSON.world, scene).then((mesh) => {
                    console.log("Worlds are loaded...")
                });

            } // isValidWorld check

        } catch (e) {

            if (e instanceof SyntaxError) {

                printError(e, true);

            } else {

                printError(e, false);

            }
        }

    }; // on success loading world

    // called when all tasks are done
    assetManager.onTasksDoneObservable.add(function(tasks) {
        console.log('onTasksDoneObservable DONE');
        var errors = tasks.filter(function(task) {return task.taskState === BABYLON.AssetTaskState.ERROR});
        var successes = tasks.filter(function(task) {return task.taskState !== BABYLON.AssetTaskState.ERROR});
    });

    // called when error is done
    assetManager.onTaskErrorObservable.add((task) => {
        console.log("onTaskErrorObservable ERROR:" + task.errorObject.message);
    });

    // TODO: shift rendering here?????????????????????????????
    assetManager.onFinish = function(tasks) {
        console.log('onFinish DONE')
        //engine.runRenderLoop(function() {
        //    scene.render();
       // });
    };

    assetManager.load();

    return loadedAssets;
};

/**
 * Fire loading
 */

try {

    // create rendering engine
    var engine = createDefaultEngine(canvas);

    // initialize loader UI
    engine.loadingScreen = new customLoadingScreen('scene-loader-wrapper', 'scene-loader-dialog');

    // display Loading Screen
    engine.loadingScreen.displayLoadingUI();

    // create the scene (async)
    scene = createScene(engine, canvas).then(returnedScene => { 

        returnedScene.getEngine().loadingScreen.hideLoadingUI();

        // load assets into the scene
        var assets = createAssets(returnedScene).then(returnedAssets => {

            console.log('in .then for createAssets()');


            // Make some items pickable
            returnedScene.onPointerDown = function (evt) {

                let pickResult = this.pickSprite(this.pointerX, this.pointerY);

                if (pickResult.hit) {
                    if(pickResult.pickedSprite) {
                        console.log("Picked sprite is:" + pickResult.pickedSprite.name + " id:" + pickResult.pickedSprite.hyid)
                        window.sprite = pickResult.pickedSprite; // TODO: remove
                        //pickResult.pickedSprite.size *= 4;
                        let cam = this.cameras[0]
                        let dx = cam.position.x - sprite.position.x,
                        dy = cam.position.y - sprite.position.y,
                        dz = cam.position.z - sprite.position.z;
                        let dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
                        console.log("distance:" + dist + " sizeX:" + pickResult.pickedSprite.width + " odist:" + pickResult.pickedSprite.odist)
                    }
                }

                let pickMesh = this.pick(this.pointerX, this.pointerY);
                if(pickMesh.hit) {
                    let m = pickMesh.pickedMesh;
                    console.log("Picked mesh is:" + m.name);
                    //if(!m.infiniteDistance) {
                    //    console.log("Changing mesh::::")
                    //    toggleMeshActivation(m)
                    //};
                }

            };

        });

        sceneToRender = returnedScene; 

    });

    // set up endless render loop
    engine.runRenderLoop(function () {
        if (sceneToRender) {
            sceneToRender.render();
        }
    });

} catch (e) {

    console.error('failed to create scene')

}
