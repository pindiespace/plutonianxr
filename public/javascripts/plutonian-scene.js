/**
 * Plutonian Worlds.
 * Constants are referenced relative to PLUTO
 * - 1 unit = 2370km
 */
'use strict'
var PWorld = (function () {

    // static class functions and variables here. Note they are a bit slower to access

    // constructor

    function PWorld() {

        // debugging layer TODO: remove later
        this.DEBUG = true; // for scene inspector
        if (this.DEBUG) this.initDebug();

        // visual elements
        this.glow                      = null;        // glow layer
        this.godLight                  = null;       // directional Light for SpaceVolume only

        this.SEGMENTS_DEFAULT          = 32;
        this.DEFAULT_ALPHA             = 0.2;

        this.UNIVERSE_DEFAULT_SIZE     = 1000000; // size of universe in units (not drawn beyond dVisUSize)
        this.DIAMETER_DEFAULT          = 1;
        this.SPACEVOLUME_DEFAULT_SCALE = 8;
        this.VR_DEFAULT_SIZE           = 900;       // VR skybox must be < 1000 units
        this.DESKTOP_DEFAULT_SIZE      = 100000;

        this.NO_VR                     = false;       // flags for VR adjustments
        this.USE_VR                    = true;

        this.GLOBAL_ROTATION           = Math.PI; // global rotation counter, local rotations must be added/subtracted
        this.WORLD_DIRECTORY           = 'worlds';
        this.WORLD_FILE_DEFALLT        = 'worlds.json';

        this.util = new PUtil();

        // set up engine
        this.setup = new PSetup(this.util);

        // data model for PObj and hyg3 datatypes
        this.pdata = new PData(this.util);
        this.PCTYPES = this.pdata.PCTYPES;

        // create assetLists
        this.JSONManager = null;
        this.cubeMapManager = null;

        // user interface
        this.ui = new PUI(this.util);

        // celestial calculations
        this.celestial = new PCelestial(this.util, this.pdata);

        // fire the program;
        this.init();

    };

    /**
     Confirm the models
     */
    PWorld.prototype.getActiveModel = function (models) {

        let util = this.util;
        let model = null;

        if (!util.isObject(models)) {
            console.warn('getActiveModel WARNING: no model object');
            return model;
        }

        // try to find the currently active model

        for(var i in models) {
            model = models[i];
            if (model.active) {
                return model;
            } 
        }

        // no active model returned, look for default model

        if (models.default) {
            return models.default;
        } else {
            console.error('checkModels ERROR: no default model found');

        }

        return model;

    };

    /**
     * Search for the active Skybox. We don't use a general search function 
     * to avoid recursion. We know that an infinite-distance Skybox is only found 
     * for a Galaxy (we use a skydome for planet surfaces)
     */
    PWorld.prototype.getActiveGalaxy = function () {

        let util = this.util;

        let a = []; // accumulate active galaxies
        let w = this.world; // world pObj tree

        if (!util.isObject(w)) {
            console.error('getActiveSkybox ERROR: missing world');
            return null;
        }

        // the current galaxy will have an active SkyBox (cubemap) model
        if (util.isArray(w.galaxies)) {
            for(let i = 0; i < w.galaxies.length; i++) {
                let galaxy = w.galaxies[i];
                if (util.isObject(galaxy.data) && util.isObject(galaxy.data.models)) {
                    let models = galaxy.data.models;
                    for(let j in models) {
                        let model = models[j];
                        if (util.isBoolean(model.active) && model.active == true) {
                            a.push({galaxy:galaxy, skybox: model});
                        }
                    }
                }
            }
        }

        if (a.length > 1) {
            console.warn('getActiveSkybox WARNING: multiple active galaxies')
        }

        return a;

    };

    /**
     * 
     */
    PWorld.prototype.setActiveGalaxy = function () {

    };

    /**
     * Toggle the skybox to fit in the 1000 unit VR scene
     * TODO: scaling doesn't work, so try shifting models
     * TODO: make 2 cubes, each sharing the same cubemap
     * TODO: toggle the cubes
     */
    PWorld.prototype.toggleVRSkybox = function (vr = false) {

        // this returns the active galaxy and its skybox {galaxy:xx, skybox:xx}
        let galaxies = this.getActiveGalaxy();

        console.log("galaxy is a:" + galaxies + " with length:" + galaxies.length)

        if (galaxies.length > 0) {

            let g = galaxies[0].galaxy;
            //let d = g.data.diameter;

            // toggle large and small skybox based on supplied 'vr' variable
            if (vr == true) {
                g.meshSkyVR.setEnabled(true);
                g.meshSky.setEnabled(false);
            } else {
                g.meshSkyVR.setEnabled(false);
                g.meshSky.setEnabled(true);
            }

        }

    };

    /**
     * make mesh visible and enabled, or disabled and invisible
     */
    PWorld.prototype.toggleMeshActivation = function (mesh) {

        if (mesh) {

            // visibility only
            //if (m.visibility == 1) m.visibility = 0.0;
            //else m.visibility = 1;

            if (mesh.isEnabled()) {
                console.log('toggleMeshActivation: enabling mesh:' + mesh)
                mesh.isVisible = false;
                mesh.setEnabled(false);

            } else {
                console.log('toggleMeshActivation: disabling mesh:' + mesh)
                mesh.isVisible = true;
                mesh.setEnabled(true);
            }

        }

    };

    /**
     * Set an pObj position using x, y, z in the JSON file
     */
    PWorld.prototype.setPositionByXYZ = function (x, y, z, units = 1) {

        let util = this.util;

        if (!util.isObject(vec) || !util.isNumber(vec.x)) {
            console.error('setPositionByXYZ ERROR: invalid vector passed:' + vec)
            return false;
        }

        if (!util.isNumber(data.x) || !util.isNumber(data.y) || !util.isNumber(data.z)) {
            console.error('setPositionByXYZ ERROR: invalid data passed');
            return false;
        }

        // Note: we reverse the y and z axes to match the BabylonJS coordinate system
        return new BABYLON.Vector3(
            x * units,
            y * units,
            z * units
            );

    };

    /**
     * Set position of a pObj, using polar coordinates
     */
    PWorld.prototype.getPosByRADecDist = function (ra, dec, dist, units = 1) {

        let util = this.util;
        let celestial = this.celestial;

        if (!util.isNumber(ra) || !util.isNumber(dec) || !util.isNumber(dist)) {
            console.error('setPositionByRADec ERROR: invalid ra:' + ra + ', dec:' + dec + ', dist:' + dist);
            return null;
        }

        let A = celestial.degToRad(parseFloat(ra) * 15);
        let B = celestial.degToRad(parseFloat(dec));

        // Note: we reverse the y and z axes to match the BabylonJS coordinate system
        return new BABYLON.Vector3(
            Math.cos(B) * Math.cos(A) * dist * units,
            Math.sin(B) * dist * units, // was z
            Math.cos(B) * Math.sin(A) * dist * units // was y
        );

    };
 
    /**
     * Get the rotation, adjusting for BabylonJS coordinates versus 
     * astronomical coordinates
     * for x = x, z = y, y = z
     * data.ra = 179.2; // side to side (almost 180)
     * data.dec = 61.2; //up and down (correct galactic degrees 60.2)
     */
    PWorld.prototype.getRotationByRADec = function (data) {


        let util = this.util;
        let celestial = this.celestial;

        if (!util.isNumber(data.ra) || !util.isNumber(data.dec)) {
            console.error('setRotationByRADec ERROR: invalid ra, dec, or distance');
            return false;
        }

        let A = celestial.degToRad(parseFloat(data.ra) * 15);
        let B = celestial.degToRad(parseFloat(data.dec));

        // Unlike positions, rotations are NOT flipped.
        return new BABYLON.Vector3(
            Math.cos(B) * Math.cos(A),
            Math.cos(B) * Math.sin(A), // was y
            Math.sin(B) // was z
        );

    };



    /**
     * load a spherical volume around a star system, planet, moon
     * The only object that reacts to this.godLight
     */
    PWorld.prototype.loadSpaceVolume = function (pObj, dir, scene) {

        console.log("------------------------------");
        console.log('creating SpaceVolume:' + pObj.name)

        let util = this.util;
        let celestial = this.celestial;
        let pdata = this.pdata;

        let mesh = null;

        // we don't use a specified model object for SpaceVolumes
        if (!pdata.checkPObj(pObj, true, false)) {
            console.error('loadSpaceVolume ERROR:' + pObj.name +' invalid object passed');
            return mesh;
        }

        let data = pObj.data;

        // scale the distance
        let scaled = celestial.scale(data);

        // adjust values based on object type
        let t = this.PCTYPES;
        switch(pObj.data.type) {

            case t.WORLD:
            case t.GALAXY:
                //scaled.diameter *= this.SPACEVOLUME_DEFAULT_SCALE;
                break;
            case t.STAR:
            case t.BROWN_DWARF:
            case t.EXOPLANET:
            case t.PLANET:
            case t.MOON:
            case t.EXOMOON:
                break;

            case t.ROGUE_PLANET:
                scaled.diameter *= this.SPACEVOLUME_DEFAULT_SCALE;
                break;

            case t.STARDOME:
            case t.STAR_SYSTEM:
            // parent may be sub-object
            case t.ARTIFACT:
                break;

        }

        // all SpaceVolumes are the same, don't need a .model entry
        mesh = BABYLON.MeshBuilder.CreateSphere(
            pObj.key, {
                diameter: scaled.diameter || (this.DIAMETER_DEFAULT),
                segments: data.segments || this.SEGMENTS_DEFAULT
                }, scene);

        //mesh.needDepthPrePass = true;

        /* 
         * All objects have a SpaceVolume. There is no separate material for 
         * SpaceVolume - all objects have a translucent sphere, back culling off. 
         * StarSystem - only the spaceVolume mesh
         * Star - spaceVolume, Planet, and Sprite mesh possible
         */

        mesh.position = this.getPosByRADecDist(data.ra, data.dec, scaled.dist, 1);

        console.log(pObj.name + ' loadSpaceVolume diameter:' + scaled.diameter + ' position x:' + mesh.position.x + ' y:' + mesh.position.y + ' z:' + mesh.position.z)

        // create material
        let mat = new BABYLON.StandardMaterial(pObj.key + '-mat', scene);

        // TODO: do this when SpaceVolume is set to transparent when Camera is inside it
        //mat.backFaceCulling = true;

        // space volumes only have color, no texture
        let clr = pdata.getColor(data.color);

        if (!clr) clr = new BABYLON.Color3.Green();
 
        mat.diffuseColor = clr;
 
        // soft specular highlight
        mat.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);

        // Adjust visibility, making the alpha independent of overall color

        mesh.visibility = clr.a || this.DEFAULT_ALPHA;

        // not visible when you're inside
        mat.backFaceCulling = true; // don't need to see inside

        // set the material to the mesh
        mesh.material = mat;

        return mesh;

    };

    /**
     * load cubemap texture for a skybox
     * @param {String} dir 
     * @param {BABYLON.Scene} scene 
     */
    PWorld.prototype.setCubeMapMaterial = function (pObj, dir, scene, loadTexture = true) {

        // Create material suitable for an infinite-distance skybox
        let mat = new BABYLON.StandardMaterial(pObj.key + '-cubemap', scene);
        mat.backFaceCulling = false;
        mat.diffuseColor = new BABYLON.Color3(0, 0, 0);
        mat.specularColor = new BABYLON.Color3(0, 0, 0);

        // Load a cubemap. Files in each model directory
        if (dir && loadTexture) {

           mat.reflectionTexture = new BABYLON.CubeTexture(dir, 
                scene, ['_px.png', '_py.png', '_pz.png', '_nx.png', '_ny.png', '_nz.png']);

            // Skybox is always drawn at infinity
            mat.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;

        }

        // performance enhancements - https://doc.babylonjs.com/how_to/optimizing_your_scene
        // freeze the material, unfreeze if we have to update properties
        mat.freeze();

        return mat;

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
    * @param {Boolean} useVR
    * @param {Boolean} loadMaterial flag to load the material immediately, or later, as 
    * is done by .loadGalaxy for VR and non-VR skyboxes. This allows them to
    * share the same material.
    */
    PWorld.prototype.loadSkybox = function (pObj, dir, scene, useVR = false, loadMaterial = true) {

        console.log("------------------------------");
        console.log('creating skybox:' + pObj.name);
        console.log('useVR is:' + useVR)

        let util = this.util;
        let pdata = this.pdata;
        let celestial = this.celestial;
        let pWorld = this;

        let mesh = null;

        // we don't use a specified model object for SpaceVolumes
        if (!pdata.checkPObj(pObj, true, true)) {
            console.error('loadSkybox ERROR: invalid object passed');
            return mesh;
        }

        let data = pObj.data;

        // get the active model
        let model = this.getActiveModel(data.models);

        if (!util.isObject(model)) {
            console.error('loadSkybox ERROR: no active model found');
            return mesh;
        }

        /*
         * default size
         * NOTE: the box clips the drawing of the stars at its size, even though it renders at infinite
         * NOTE: you can't set to really huge amounts (e.g. 10000000) or it chokes and disappears
         */
        let bSize = this.dVisSize;

        /* 
         * NOTE: VR skybox must be < 1000 units, so we make a desktop AND VR skybox
         * NOTE: some stars in the Hyg database are further away than 10000!
         */
        if (useVR) {
            bSize = this.VR_DEFAULT_SIZE;
        } else if (util.isNumber(data.diameter) && data.diameter > 0) {
            bSize = data.diameter * celestial.dParsecUnits;
            console.log('loadSkybox VR for:' + pObj.name + ' using bSize:' + bSize);
        }

        console.log('loadSkybox: box size and camera maxZ is currently:' + bSize)

        // create the mesh, infinite distance skybox
        mesh = BABYLON.MeshBuilder.CreateBox(
            pObj.key, {
                size:bSize}, scene);

        this.godLight.excludedMeshes.push(mesh); // not lit
        mesh.infiniteDistance = true;
        //////mesh.freezeNormals(); // don't need to calculate
        //////mesh.convertToUnIndexedMesh(); // too few vertices to need indexing

        console.log(pObj.name + ' loadSkyBox diameter:' + bSize + ' position x:' + mesh.position.x + ' y:' + mesh.position.y + ' z:' + mesh.position.z)


        // set the position

        mesh.position = this.getPosByRADecDist(data.ra, data.dec, data.dist, 1);

        // Empirical rotations for this particular skybox
        // For the Milky Way should be RA: 180 and Dec: 60.2
        // but need to 'shim' for different skyboxes
        // for eso:
        //data.ra = 179.25; // TODO: side to side (almost 180)
        //data.dec = 60.749; //TODO: up and down (correct galactic degrees 60.2)

        if (util.isNumber(model.ra) && util.isNumber(model.dec)) {
            data.ra = model.ra;
            data.dec = model.dec;
        }

        // set the adjusted rotation
        //this.setRotationByRADec(data, mesh.rotation);
        mesh.rotation = this.getRotationByRADec(data);

        /*
        // TODO: temporary
        // TODO: mesh rotator for debug only
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
            mesh.rotation = this.getRotationByRADec(data);
        });
        */

        // if specified, load the cubemap material WITH the texture
        if (loadMaterial) {
            mesh.material = this.setCubeMapMaterial(pObj, dir + '/textures/' + model.cubemap + '/', scene, true);
        }

        // no rotations of the skybox after creation, so don't evaluate its matrix
        mesh.freezeWorldMatrix();

        return mesh;
    };

    PWorld.prototype.loadStarDome = function (pObj, dir, scene) {

        console.log("------------------------------");
        console.log("creating stardome:" + pObj.name);

        let util = this.util;
        let pdata = this.pdata;
        let pWorld = this;
        let mesh = null;

        // check data but NOT model
        if (!pdata.checkPObj(pObj, true, false)) {
            console.error('loadStarDome ERROR: invalid object passed');
            return mesh;
        }

        let data = pObj.data;

        // get the active model
        let model = this.getActiveModel(data.models);

        if (!util.isObject(model)) {
            console.error('loadStarDome ERROR: no active model found');
            return mesh;
        }

        let domeDir = dir + '/' + pObj.dname + '/'; 

////////////////////
        let old = false;
        // TO REVERT< CHANGE WORLDS.JSON
        // TO REVERT< CHANGE TO GLOBAL
        // MOST SPRITES ARE NOT BEING DRAWN
///////////////////

        // Specific to hyg3 stellar database models
        if (model.hyg) {

            if (old) {
            // use the AssetsManager to load the large JSON data file
            let assetManager = new BABYLON.AssetsManager(scene);
            // TODO: GUI OR PERFORMANCE SELECT
            // mod = models.sprite120; ////////////////////////////////////////

            let hyg = domeDir + model.hyg;

            let loadHYG = assetManager.addTextFileTask(hyg.substring(0, hyg.lastIndexOf(".")) + '-stardome', hyg);

            loadHYG.onSuccess = async function(stars) {

                loadHYG.stars = JSON.parse(stars.text);

                const spriteMgr = await computeHygSprite(loadHYG.stars, domeDir + 'sprite/textures/' + model.spritesheet, model.size, scene).then((spriteManagerStars) => {
                    console.log('GLOBAL Hyg stardome loaded');

                    // TODO: activate stardome interaction here

                }); // TODO: attach elsewhere, or delete!

            };

            assetManager.onProgress = function(remainingCount, totalCount, lastFinishedTask) {
                console.log('Loading GLOBAL Hyg database files. ' + remainingCount + ' out of ' + totalCount + ' items still need to be loaded.');
            };

            assetManager.onFinish = function(tasks) {
                console.log('All done with loading GLOBAL Hyg database');
            };

            assetManager.load();
        } else {
            // Load Hyg and color data
            console.log('loading PCelestial Hyg data...')
            this.celestial.loadHygData(model, domeDir, scene);
        }


        } else {
            console.error('loadStarDome ERROR: no Hyg model data');
        }

        return mesh;

    };

    /** 
     * load cloud model for Nebula
     * @param {ObjectJSON} pObj parent of nebula (galaxy)
     * @param {String} dir directory for nebula data in assets
     * @param {BABYLON.Scene} current scene being rendered to
     */
    PWorld.prototype.loadCloudModel = function (pObj, dir, scene, parent) {

        console.log("------------------------------");
        console.log("drawing CloudModel:" + pObj.name)

        let util = this.util;
        let pdata = this.pdata;
        let mesh = null;

        if (!pdata.checkPObj(pObj)) {
            console.error('loadCloudModel ERROR: invalid object passed');
        }

        let data = pObj.data;

        let model = this.getActiveModel(data.models) 

        if (!util.isObject(model)) {

        }

        return mesh;

    };


    /**
     * If there is no Parent, add one
     */
    PWorld.prototype.setParent = function (pObj, dir, scene, parent) {

        let celestial = this.celestial;
        let t = this.PCTYPES;
        let pdata = this.pdata;

        let mesh = pObj.mesh;

        if (mesh) {

        //////console.log('%%%%%%%%%%%setting parent for:' + pObj.name)
        //////console.log('%%%%%%%%%%%Mesh   is:' + mesh)
        //////console.log('%%%%%%%%%%%Parent is:' + parent)

        switch(pObj.data.type) {

            // these all get parents
            case t.GALAXY:
            case t.STAR:
            case t.BROWN_DWARF:
            case t.EXOPLANET:
            case t.PLANET:
            case t.MOON:
            case t.EXOMOON:
                if (pObj.mesh && parent) {
                    //console.log("%%%%%%%% ready to set parent...")
                    //console.log('%%%%%%%%%%%Mesh   is:' + mesh)
                    //console.log('%%%%%%%%%%%Parent is:' + parent)
                    mesh.parent = parent;
                }
                break;

            // creates a unparented SpaceVolume around rogue planet
            // (with no parent of its own, like STAR_SYSTEM)
            case t.ROGUE_PLANET:
                console.log('%%%%%%%SETTING ROGUE PLANET SPACE VOLUME')
                let ppObj = pdata.clonePObj(pObj);
                parent = this.loadSpaceVolume(ppObj, dir, scene);
                parent.pObj = ppObj;
                break;

            // does NOT get a parent
            case t.STARDOME:
            case t.STAR_SYSTEM:
                break;

            // parent may be sub-object
            case t.ARTIFACT:
                break;

        }

        }

        return parent;

    };

    /**
     * add a glow around an emissive object
     * @link https://doc.babylonjs.com/how_to/glow_layer
     */
    PWorld.prototype.setGlow = function(mesh, scene) {

        // TODO: explore emissive color for glow.

        if (!mesh) {
            console.error('setGlow ERROR:bad mesh');
        }

        if (!this.glow) {
            console.error('setGlow ERROR: glow never initialized');
        }

        this.glow.addIncludedOnlyMesh(mesh);

    };

    /* 
     * If an object emits light, add a Light at its center
     */
    PWorld.prototype.setEmissiveLight = function (pObj, range, scene) {

        let mesh = pObj.mesh;
        let celestial = this.celestial;

        const light = new BABYLON.PointLight(pObj.name + 'Light', mesh.getAbsolutePosition(), scene);

        //light.position = new BABYLON.Vector3(0, 0, 0);

        // light range, adjust to StarSystem SpaceVolume
        if (range) {
            // TODO: RANGE FROM PARENT
            light.range = range;
        } else {
            light.range = 4 * celestial.dParsecUnits; // emissive is always a star scales
        }
        // set the parent of the Light to star or brown dwarf
        light.parent = mesh;

    };

    PWorld.prototype.setMaterial = function (pObj, model, dir, scene) {

        const util = this.util;
        const pdata = this.pdata;
        const celestial = this.celestial;

        let data = pObj.data;
        let mesh = pObj.mesh;
        let texDir = dir + '/' + pObj.dname + '/textures/';

        // make sure we have a mesh
        if (!mesh) {
            console.error('setMaterial ERROR: no mesh for:' + pObj.name);
            return null;
        }

        if (!model) {
            console.error('setMaterial ERROR: no model for:' + pObj.name);
            return null;
        }

        // color
        let clr = pdata.getColor(data.color);

        if (!clr) {
            console.error('setMaterial Warning: no pObj:' + pObj.name + ' color specified, setting GREY');
            clr = [0.5, 0.5, 0.5];
        }

        // material
        mesh.material = new BABYLON.StandardMaterial(pObj.key + '-mat', scene);

        const mat = mesh.material;

        if (model.surface) {
        
            //console.log('%%%%%%setting surface for:' + pObj.name)

            if (model.emissive) {
                mesh.freezeNormals();
                //console.log('%%%%%%setting emissive for:' + pObj.name)
                mat.specularColor = new BABYLON.Color3(0, 0, 0);
                mat.disableLighting = true;
                // TODO: load different emissive texture
                mat.emissiveTexture = new BABYLON.Texture(texDir + model.surface, scene, true);
                mat.emissiveColor = clr;
                this.setEmissiveLight(pObj, 20, scene);
                if (model.glow) {
                    this.setGlow(mesh, scene);
                }

            } else {
                // create texture 
                //material.freeze();
                //material.unfreeze(); // IF THERE IS NO SHADER
                mat.diffuseTexture = new BABYLON.Texture(texDir + model.surface, scene, true);
                // this create the equivalen of ambient light on the 'backside' of planets
                mat.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.1);
                if (util.isNumber(model.specular)) {
                    mat.specularColor = new BABYLON.Color3(model.specular, model.specular, model.specular);
                } else {
                    mat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
                }
            }

        } else if (model.cubemap) {
            //mat.reflectionTexture = new BABYLON.CubeTexture(dir + '/textures/' + model.cubemap + '/', 
            //scene, ['_px.png', '_py.png', '_pz.png', '_nx.png', '_ny.png', '_nz.png']);
            // Skybox and similar is always drawn at infinity
            //mat.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
        } else {
            mat.diffuseColor = clr;
        }

        return mat;

    };

    PWorld.prototype.setSize = function (pObj, scaled) {

    };

    PWorld.prototype.setPos = function (pObj, scaled) {

        let celestial = this.celestial;
        let t = this.PCTYPES;

        let data = pObj.data;
        let mesh = pObj.mesh;

        if (!mesh) {
            console.error('setPos ERROR: no mesh');
            return false;
        }
        let parent = pObj.mesh.parent;

        if (!parent) {
            console.error('setPosition ERROR: no parent');
            return false;
        }

        switch(data.type) {

            // same position as universe (0,0,0)
            case t.GALAXY:
                break;

            // set relative to parent
            case t.STAR:
            case t.BROWN_DWARF:
            case t.EXOPLANET:
            case t.PLANET:
            case t.MOON:
            case t.EXOMOON:
                console.log('%%%%%%%%SETTING RELATIVE POSITION for:' + pObj.name + " ra:" + data.ra + " dec:" + data.dec + " dist:" + scaled.dist)
                mesh.position = this.getPosByRADecDist(data.ra, data.dec, scaled.dist);
                break;

            // gets a unparented SpaceVolume (with no parent of its own, like STAR_SYSTEM)
            case t.ROGUE_PLANET:
                break;

            // no children
            case t.STARDOME:
                break;

            // children are set relative to parent
            case t.STAR_SYSTEM:
                break;
        }

        return true;

    };

    /**
     * Set orbits and other motions
     */
    PWorld.prototype.setMotion = function (pObj, scaled, scene) {
        // TODO: Everyone needs an independent rot

        let mesh = pObj.mesh;
        scene.onBeforeRenderObservable.add(()=>{
                // update stars
                // DOESN'T WORK, WHY? 
                if (pObj.key == 'luhman_16_a' || pObj.key == 'luhman_16_b') {
                //this.celestial.orrey.computeOrbit(pObj);
                // try making orbit manually here
                // NOTE: scaled.dist is being SAVED from creation of these objects!
                // TODO: eliminate required saving
                // TODO: not sign, but rotation
                //console.log("SCALED DISTANCE:" + scaled.dist)
                mesh.position.x = scaled.dist * Math.sin(this.GLOBAL_ROTATION);
                mesh.position.z = scaled.dist * Math.cos(this.GLOBAL_ROTATION);
                //mesh.position.x = Math.sin(this.rot);
                //mesh.position.z = Math.cos(this.rot);
                this.GLOBAL_ROTATION += 0.0002*scene.getEngine().getDeltaTime();;
            }

            // baked in rotations for parents and children
            mesh.rotation.y += 0.0001*scene.getEngine().getDeltaTime();
            //mesh.rotation.x += 0.0001*scene.getEngine().getDeltaTime();

        });

    };

    /**
     * Set user interactions
     */
    PWorld.prototype.setMeshMetaData = function (pObj, scene) {

        let util = this.util;

        console.log('setMeshInteractions for:' + pObj.name)

        let mesh = pObj.mesh;
        window[pObj.key] = pObj.mesh;

        // Set metadata for the mesh
        mesh.metadata = {

        };

        // look at an object with the camera
        mesh.pLook = function () {
            // let scene = cam.getScene();
            ////////let cam = scene.activeCameras[0];
            let cam = scene.activeCamera;
            // TODO:
            // since we're locating planets with their parent, need absolute position
            //https://doc.babylonjs.com/resources/frame_of_references
            //var localPosition = mesh.getPositionExpressedInLocalSpace();
            var matrix = mesh.computeWorldMatrix(true); //true forces a recalculation rather than using cache version
            var globalPos = BABYLON.Vector3.TransformCoordinates(this.position, matrix);
            cam.setTarget(globalPos);
            let dx = cam.position.x - mesh.position.x,
            dy = cam.position.y - mesh.position.y,
            dz = cam.position.z - mesh.position.z;
            let dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
            console.log("position:" + mesh.position + " distance:" + dist);
        };

        mesh.pJump = function () {
            let cam = scene.activeCamera;
            // let s = cam.getScene();
            // TODO:
            // since we're rotating planets with their parent, need to get global position
            var matrix = mesh.computeWorldMatrix(true); //true forces a recalculation rather than using cache version
            var globalPos = BABYLON.Vector3.TransformCoordinates(this.position, matrix);
            cam.setTarget(globalPos);
            // create a unit vector for the camera
            let u = new BABYLON.Vector3(cam.position.x, cam.position.y, cam.position.z);
            u.normalize();
            // TODO: NOT RIGHT!!!!!!!
            // get the mesh position, subtract the camera 'standoff' 1 unit
            let v = globalPos.subtract(u);
            cam.position.x = v.x;
            cam.position.y = v.y;
            cam.position.z = v.z;
            this.pLook();

        };

        // follow an object with the camera
        mesh.follow = function () {

        };

    };

    /**
     * load a free-floating planet not attached to a star system
     * @param {PObj} pObj the data object for the planet
     * @param {String} dir the directory where textures, models are stored
     * @param {PObj} parent the parent object (not the mesh itself)
     * @param {Boolean} loadMaterial load material immediately, or wait, e.g. so 
     * a StarSystem can load its textures all at once
     */
    PWorld.prototype.loadPlanetModel = function (pObj, dir, scene, parent, loadMaterial = true) {

        let util = this.util;
        let celestial = this.celestial;
        let pdata = this.pdata;

        console.log('---------------------------');
        console.log('loading star, planet, or moon:' + pObj.name)

        // check the data object for validity
        if (!pdata.checkPObj(pObj)) {
            console.error('loadPlanetModel Error: invalid pObj for:' + pObj.name);
            return null;
        }

        // data should be OK
        let data = pObj.data;

        ///console.log('%%%%% DATA DIAMETER FOR:' + pObj.name + ' is:' + pObj.data.diameter)

        // scale the distance. Planets and stards use a differen conversion of real distance to units
        let scaled = celestial.scale(pObj.data);

        // create the mesh
        let mesh = BABYLON.MeshBuilder.CreateSphere(
                pObj.key, {
                    diameter:scaled.diameter, 
                    segments: 32
                    }, scene);

        if (!mesh) {
            console.error('loadPlanet ERROR: failed to create mesh for:' + pObj.name);
            return null;
        }

        // exclude meshes from 'godLight' (pnly illuminates the SpaceVolumes)
        this.godLight.excludedMeshes.push(mesh);

        pObj.mesh = mesh;
        mesh.pObj = pObj;

        // TODO: GET SUN TEXTURE SHOWING!!!!!!!!

        // Use the existing parent, or set a SpaceVolume as Parent
        mesh.parent = this.setParent(pObj, dir, scene, parent);

        // set the position based on type
        this.setPos(pObj, scaled);

        // get the active model
        let model = this.getActiveModel(data.models);

        // set how it looks
        this.setMaterial(pObj, model, dir, scene);

        // set orbits and other motions
        this.setMotion(pObj, scaled, scene);

        // set user interactions
        this.setMeshMetaData(pObj, scene);

        // TODO: create 2D GUI label
//////////////////////////////////////////////
            //let pScene = this;
            //let imgsrc = dir + pObj.dname + '/textures/' + pObj.descimg;
            //if (pObj.descimg) {
            //    pObj.plutoLabel = pScene.ui.createGUILabel(pObj, imgsrc, scene, false, true); // 2D ONLY
            //}
///////////////////////////////////////////////

        return mesh;

    };

    /*
     * Loading for individual celestial objects 
     */

    /**
     * load a (natural) moon of a planet
     */
    PWorld.prototype.loadMoon = function (pObj, dir, scene, parent) {
        
        let util = this.util;

        let mesh = this.loadPlanetModel(pObj, dir + '/', scene, parent);

        if (mesh) {

            ////////////////////////this.ui.createLabel(pObj, scene, true, true);

            // draw the moons

            if (util.isArray(pObj.moons)) {
                for(let i = 0; i< pObj.moons.length; i++) {
                    this.loadMoon(pObj.moons[i], dir + '/' + pObj.dname + '/moons', scene, mesh);
                }
            }

        }

        return mesh;

    };

    /**
     * Load a planet or a star
     */
    PWorld.prototype.loadPlanet = function (pObj, dir, scene, parent) {

        let util = this.util;

        ////////////console.log('loadPlanet for:' + pObj.name + ' parent is:' + parent)

        let mesh = this.loadPlanetModel(pObj, dir + '/', scene, parent);

        if (mesh) {

            // draw the moons

            if (util.isArray(pObj.moons)) {
                for(let i = 0; i< pObj.moons.length; i++) {
                    this.loadMoon(pObj.moons[i], dir + '/' + pObj.dname + '/moons', scene, mesh);
                }
            }

        }

        return mesh;

    };

    PWorld.prototype.loadStar = function (pObj, dir, scene, parent) {

        let util = this.util;

        let mesh = this.loadPlanetModel(pObj, dir + '/', scene, parent);

       //////////////console.log("in LoadStar for:" + pObj.name + ' mesh is:' + mesh + ' and parent:' + parent)

        // additional configuration of Stars

        if (mesh) {

            ///////////////////////this.ui.createLabel(pObj, scene);

            // Load planets
            if (util.isArray(pObj.planets)) {
                for(let i = 0; i< pObj.planets.length; i++) {
                    this.loadPlanet(pObj.planets[i], dir + '/' + pObj.dname +  '/planets', scene, mesh);
                }
            }
        }

        return mesh;

    };

    /**
     * Load a star system, which may have more than one Star.
     * Many stars listed in Hyg are actually multiple
     * Super-close stars:
     * @link {http://www.livingfuture.cz/stars.php}
     */
    PWorld.prototype.loadStarSystem = function (pObj, dir, scene) {

        let util = this.util;

        let mesh = this.loadSpaceVolume(pObj, dir, scene);

        if (mesh) {

            // StarSystems are NOT children to their Galaxy - they would inherit
            // The Skybox 'infinite distance' properties. Rogue Planets don't 
            // have a StarSystem, so they have a dynamically-generated SpaceVolume
            // equivalent
            //mesh.parent = parent;

            // reciprocally link
            mesh.pObj = pObj;
            pObj.mesh = mesh;

            // TODO: delay texture loading for a StarSystem, do it all at once
            // after everything in the StarSystem is loaded

            // TODO:
            // TODO:
            // TODO:
            // TODO:
            // https://doc.babylonjs.com/how_to/transformnode
            // Create a transformNode to use for rotation of children
            //pObj.tMesh = new BABYLON.TransformNode("root"); 

            // add 2 'false' to turn off visibility and pickability

            // create labels
            // image for description

//////////////////////////////////////
/*
            let pScene = this;
            if (pObj.descimg) {
                let imgsrc = dir + '/' + pObj.dname + '/' + '/stars/sol/textures/' + pObj.descimg;
                console.log("DESCIMG::::::::::::::::" + imgsrc);
                pScene.ui.createGUILabel(pObj, imgsrc, scene); // 2D ONLY
            }
*/
///////////////////////////////////////

            //this.ui.createMeshLabel(pObj, scene);

            if (util.isArray(pObj.stars)) {
                for(let i = 0; i < pObj.stars.length; i++) {
                    this.loadStar(pObj.stars[i], dir + '/' + pObj.dname + '/stars', scene, mesh);
                }
            }

        }

        return mesh;

    };

    /**
     * load a free-floating planet not attached to any star
     */
    PWorld.prototype.loadRoguePlanet = function (pObj, dir, scene, parent) {

        let util = this.util;

        let mesh = this.loadPlanetModel(pObj, dir + '/', scene, parent);

        if (mesh) {

            // additional features

            this.ui.createLabel(pObj, scene);

            if (util.isArray(pObj.moons)) {
                for(let i = 0; i < pObj.moons.length; i++) {
                    this.loadMoon(pObj.moons[i], dir + '/' + pObj.dname + '/moons', scene, mesh);
                }
            }

        }

        return mesh;

    };

    PWorld.prototype.loadGlobularCluster = function (pObj, dir, scene, parent) {
        // TODO:
        console.log('loadGlobularCluster TODO:');
    };

    PWorld.prototype.loadOpenCluster = function (pObj, dir, scene, parent) {

        //TODO:
        console.log('loadOpenCluster TODO:');

    };

    PWorld.prototype.loadNebula = function (pObj, dir, scene, parent) {

        let util = this.util;

        // draw the star (apart from planets, etc)
        let mesh = this.loadCloudModel(pObj, dir + '/' + pObj.dname, scene);

        if (mesh) {

        }

        return mesh;

    };

    /**
     * Load a galaxy
     */
    PWorld.prototype.loadGalaxy = function (pObj, dir, scene, parent) {

        console.log("------------------------------");
        console.log('creating galaxy:' + pObj.name)

        let util = this.util;
        let pWorld = this;

        /*
         * Draw the galaxy mode as an infinite cubemap skybox
         *
         * We have two meshes of different size (meshSky and meshSkyVR) which 
         * share the same cubemap.
         * - load the meshes without the materials, 
         * - then use this.cubeMapManager (BABYLON.AssetsManager) to load the cubemap
         * - then apply the same material to BOTH meshes.
         */
        let meshSky = this.loadSkybox(pObj, dir, scene, this.NO_VR, false);

        if (meshSky) {
            // nothing to do
        }

        // load a small skybox for VR, which needs under 1000 units in size
        // DON'T load the cubemap texture yet (shared with meshSkyVR)
        let meshSkyVR = this.loadSkybox(pObj, dir, scene, this.USE_VR, false);

        // disable VR on initial creation (defaults to 2D desktop view)
        if (meshSkyVR) {
            meshSkyVR.setEnabled(false);
        }

        /*
         * 1. The mesh parent (the universe or 'local_group') is a empty space, outside the Skybox
         * 2. The Skybox is present for each galaxy
         * 3. Not drawn, but needed for children
         * 3. Since the Skybox is projected to infinity, we need a SECOND mesh
         *    otherwise, children inherit projection to infinity
         */
        let mesh = this.loadSpaceVolume(pObj, dir, scene);

        // hide the SpaceVolume

        if (mesh) {

            // spaceVolume should be invisible
            mesh.setEnabled(false);
            this.godLight.excludedMeshes.push(mesh);

            // attach to parent (universe)
            if (parent) {
                mesh.parent = parent;
            }

            // attach to pObj;
            pObj.mesh = mesh;
            mesh.pObj = pObj;

            if (meshSky) {
                meshSky.name += '-skybox';
                pObj.meshSky = meshSky;
                meshSky.pObj = pObj;
            }

            if (meshSkyVR) {
                meshSkyVR.name += '-skybox-VR';
                pObj.meshSkyVR = meshSkyVR;
                meshSkyVR.pObj = pObj;
            }

            // load the cubemap texture, apply to BOTH meshes

            let model = this.getActiveModel(pObj.data.models);
        
            let sbTask = this.cubeMapManager.addCubeTextureTask(
               'skybox-' + pObj.name,
               dir + '/textures/' + model.cubemap + '/',
               ['_px.png', '_py.png', '_pz.png', '_nx.png', '_ny.png', '_nz.png']
            );

           sbTask.onSuccess = function (task) {
                console.log('cubemap for:' + pObj.name + ' loaded');
                window.task = task;
                // create the material, but do not load the texture
                meshSky.material = pWorld.setCubeMapMaterial(pObj, dir + '/textures/' + model.cubemap + '/', scene, false);
                meshSky.material.reflectionTexture = task.texture;
                meshSky.material.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
                meshSkyVR.material = meshSky.material;
           };

           sbTask.onError = function (task, message, exception) {
                console.log('cubemap ERROR:' + message + ', ' + exception);
           };

            // actually load the texture
            this.cubeMapManager.load();

            // Make the camera's view slightly larger than the Skybox dimensions
            scene.activeCamera.maxZ = mesh.getBoundingInfo().boundingSphere.radius * 1.2;

            /////////this.ui.createLabel(pObj, scene);

            // create child objects

            if (this.util.isArray(pObj.globular_clusters)) {
                for(let i = 0; i< pObj.globular_clusters.length; i++) {
                    this.loadGlobularCluster(pObj.globular_clusters[i], dir + '/globular_clusters', scene, mesh);
                }
            }

            if (this.util.isArray(pObj.open_clusters)) {
                for(let i = 0; i< pObj.open_clusters.length; i++) {
                    this.loadOpenCluster(pObj.open_clusters[i], dir + '/open_clusters', scene, mesh);
                }
            }

            if (this.util.isArray(pObj.nebula)) {
                for(let i = 0; i< pObj.nebula.length; i++) {
                    this.loadNebula(pObj.nebula[i], dir + '/nebula', scene, mesh);
                }
            }

            // this drops us to 30 FPS!!!!
            if (this.util.isArray(pObj.stardomes)) {
                for (let i = 0; i < pObj.stardomes.length; i++) {
                    this.loadStarDome(pObj.stardomes[i], dir + '/stardomes', scene, mesh);
                }
            }

            if (this.util.isArray(pObj.star_systems)) {
                for(let i = 0; i< pObj.star_systems.length; i++) {
                    this.loadStarSystem(pObj.star_systems[i], dir + '/star_systems', scene);
                }
            }

            // free-floating planets, not attached to any star
            if (this.util.isArray(pObj.rogue_planets)) {
                for(let i = 0; i< pObj.rogue_planets.length; i++) {
                    this.loadPlanetModel(pObj.rogue_planets[i], dir + '/rogue_planets', scene);
                }
            }

        }

        return mesh;

    };

    PWorld.prototype.loadDarkMatter = function (pObj, dir, scene) {

    };

    PWorld.prototype.loadArtifact = function (pObj) {

    };

    /**
     * load the world
     */
    PWorld.prototype.loadWorld = async function (pObj, scene) {

        console.log("------------------------------");
        console.log('creating world:' + pObj.name)

        let util = this.util;
        let mesh = null;

        //let dir = this.worldDir;
        let dir = this.WORLD_DIRECTORY;

        mesh = this.loadSpaceVolume(pObj, dir, scene);
        this.godLight.excludedMeshes.push(mesh);

        // create World elements

        if (mesh) { // valid world

            this.world = pObj;

            mesh.setEnabled(false);

            // hide the universe, we only view the world from inside a galaxy
            this.toggleMeshActivation(mesh);

            if (Array.isArray(pObj.dark_matter)) {
                for(let i = 0; i < pObj.dark_matter.length; i++) {
                    this.loadDarkMatter(pObj.dark_matter[i], dir + '/' + pObj.dname + '/' + pObj.dark_matter[i].dname, scene, mesh);
                }
            }

            if (Array.isArray(pObj.galaxies)) {
                for(let i = 0; i < pObj.galaxies.length; i++) { // loop through galaxy array
                    this.loadGalaxy(pObj.galaxies[i], dir + '/' + pObj.dname + '/' + pObj.galaxies[i].dname, scene, mesh);
                } // loop through galaxies
            }

        }

        // set pickerInteractions, we can only use .onPointerDown ONCE
        /////////////////////////////////////////////////////
        let pWorld = this; ///////////////////////////////////////////////////////////
        ////////////////////////////////////////////////////
        scene.onPointerDown = function (evt) {

            let cam = this.activeCamera;

            // .activeCamera may not be defined during initial loading yet
            if (!cam) {
                return;
            }

            // picker for Sprites
            let pickResult = this.pickSprite(this.pointerX, this.pointerY);

            if (pickResult.hit) {

                if (pickResult.pickedSprite) {
                    let s = pickResult.pickedSprite;
                    let hyg = s.hyg;
                    console.log('^^^^^^^^^^^^^^^^^^^^^^');
                    console.log('Picked SPRITE is:' + s.name + ' hygid:' + hyg.id + ' spect:' + hyg.spect + ' computed:' + hyg.computed + ' lastditch:' + hyg.lastditch + ' lum:' + hyg.lum + ' radius:' + hyg.radius + ' size:' + pickResult.pickedSprite.size);
                    console.log('DESCRIPTION:' + hyg.description);
                    // NOTE: default camera was pushed into array when the camera was created
                    /////////////let dist = BABYLON.Vector3.Distance(cam.position, s.position);
                    ///////////console.log('Distance:' + dist + ' width:' + s.width + ' height:' + s.height);
                    ////////console.log('Camera at:' + cam.position);
                    window.sprite = s; // TODO: remove
                }

            } // end of picksprite

            // Picker for non-Sprite meshes
            let pickMesh = this.pick(this.pointerX, this.pointerY);

                if (pickMesh.hit) {

                    if (pickMesh.pickedMesh) {
                        let m = pickMesh.pickedMesh;
                        console.log('^^^^^^^^^^^^^^^^^^^^^^');
                        console.log('Picked MESH is:' + m.name + ' pObj:' + m.pObj.name);
                        let dist = BABYLON.Vector3.Distance(cam.position, m.position);

                        ///////////////////////////////////////
                        ///////////////////////////////////////
                        // TODO: temporary, experiment with Pluto UI
                        if (m.name == 'pluto') {
                            let l = m.pObj.plutoLabel;
                            if (l) {
                            console.log("plutolabel is:" + l )
                                if (l.rect.isVisible) {
                                    l.rect.isVisible = false;
                                    l.line.isVisible = false;
                                } else {
                                    l.rect.isVisible = true;
                                    l.line.isVisible = true;
                                }
                            }
                        }
                        ///////////////////////////////////////
                        ///////////////////////////////////////

                        //console.log('Distance:' + util.computeDistance3(cam.position, m.position));
                        ///////let w = m.getBoundingInfo().boundingBox.maximum;
                        ///////let h = m.getBoundingInfo().boundingBox.minimum;
                        ///////console.log('Distance:' + dist + ' max:' + w + ' min:' + h);
                        /////////console.log('Camera at:' + cam.position);
                        window.mesh = m;
                        // skybox is at m.infiniteDistance
                    }

                } // end of pickmesh

            // throw a ray from the camera
            // https://doc.babylonjs.com/babylon101/raycasts
            let ray = this.createPickingRay(scene.pointerX, scene.pointerY, BABYLON.Matrix.Identity(), cam);	

                let hit = this.pickWithRay(ray);

                if (hit.pickedMesh) { // && hit.pickedMesh.metadata == "cannon"){
                    let m = hit.pickedMesh;
                    console.log('^^^^^^^^^^^^^^^^^^^^^^');
                    console.log('Picked RAY MESH:' + m.name + ' pObj:' + m.pObj.name);
                    let dist = BABYLON.Vector3.Distance(cam.position, m.position);
                    //console.log('Distance:' + util.computeDistance3(cam.position, m.position));
                    //////let w = m.getBoundingInfo().boundingBox.maximum;
                    //////let h = m.getBoundingInfo().boundingBox.minimum;
                    //////console.log('Distance:' + dist + ' max:' + w + ' min:' + h);
                    //////console.log('Camera at:' + cam.position);
                    //createGUIButton();

                    // NOTE: TODO: disable "local_group" and "skybox" for picking after debug
                    console.log('^^^^^^^^^^^^^^^^^^^^^^');
                    console.log('MULTI-PICK INSIDE MESH:' + m.name + ' pObj:' + m.pObj.name);
                    // TODO: 'origin' may need to be the point of intersection of the ray, not the
                    // TODO: mesh position
                    var origin = m.position;
                    var forward = new BABYLON.Vector3(0,0,1);
                    //forward = vecToLocal(forward, box);
                    var wm = mesh.getWorldMatrix();
                    var forward = BABYLON.Vector3.TransformCoordinates(forward, wm);
                
                    var direction = forward.subtract(origin);
                    direction = BABYLON.Vector3.Normalize(direction);

                    let ray2 = new BABYLON.Ray(
                        origin,
                        direction,
                        m.getBoundingInfo().boundingSphere.radius * 2
                    );
                    console.log('ray cast start:' + origin + ' for:' + m.getBoundingInfo().boundingSphere.radius * 2 + ' units');
                    var hits = scene.multiPickWithRay(ray);

                    if (hits){
                        for (var i = 0; i < hits.length; i++){
                            console.log('multiPick:' + hits[i].pickedMesh.name);
                        }
                    }

                } // end of picking with ray


        }; // end of onPointerDown callback function

        //return mesh;

    };

    /** 
     * Create an asset manager for a media type
     */
    PWorld.prototype.createAssetManager = function (scene) {

        let mgr = new BABYLON.AssetsManager(scene);

        // load JSON data files
        mgr = new BABYLON.AssetsManager(scene);

        mgr.onTasksDoneObservable.add(function(tasks) {
            console.log('assetManager: onTasksDoneObservable DONE');
            var errors = tasks.filter(function(task) {return task.taskState === BABYLON.AssetTaskState.ERROR});
            var successes = tasks.filter(function(task) {return task.taskState !== BABYLON.AssetTaskState.ERROR});
        });

        mgr.onTaskErrorObservable.add((task) => {
            console.log("assetManager: onTaskErrorObservable ERROR:" + task.errorObject.message);
        });

        mgr.onFinish = function(tasks) {
            console.log('assetManager: onFinish DONE')
        };

        return mgr;

        // keep the same cubemaps for desktop and VR views (different meshes)
        this.cubeMapManager = new BABYLON.AssetsManager(scene);

        this.cubeMapManager.onTasksDoneObservable.add(function(tasks) {
            console.log('cubeMapManager: onTasksDoneObservable DONE');
            var errors = tasks.filter(function(task) {return task.taskState === BABYLON.AssetTaskState.ERROR});
            var successes = tasks.filter(function(task) {return task.taskState !== BABYLON.AssetTaskState.ERROR});
        });

        this.cubeMapManager.onTaskErrorObservable.add((task) => {
            console.log("cubeMapManager: onTaskErrorObservable ERROR:" + task.errorObject.message);
        });

        this.cubeMapManager.onFinish = function(tasks) {
            console.log('cubeMapManager: onFinish DONE')
        };

    };

    PWorld.prototype.createAssets = async function (scene) {

        var pWorld = this;
        let util = this.util;
        let pdata = this.pdata;
        let assets = {};

        console.log("------------------------------");
        console.log('loading world file...');

        let assetManager = this.JSONManager;

        // Load the JSON 'world' file describing the world

        var loadJSON = assetManager.addTextFileTask('worlds', this.WORLD_DIRECTORY + '/' + this.WORLD_FILE_DEFALLT);

        loadJSON.onSuccess = function(world) {

            console.log("------------------------------");
            console.log('World file loaded, validating...');

            try {

                // try to parse the world data
                let w = JSON.parse(world.text);

                // check the world, then begin loading assets
                if (pdata.checkWorld(w)) {

                    assets.world = w;

                    console.log('Loading world file objects...');

                    // TODO: loadWorld could just load everything into the assetManager

                    assets.mesh = pWorld.loadWorld(w, scene).then((mesh) => {

                        console.log('World is loaded');

                    });
                
                }

            } catch (e) {

                if (e instanceof SyntaxError) {
                    util.printError(e, true);
                } else {
                    util.printError(e, false);
                }

            }

        } // end of assetManager callback

        assetManager.load();
        
        return assets;

    };

    /** 
     * Create a BabylonJS scene
     */
    PWorld.prototype.createScene = async function (engine) {

        let celestial = this.celestial;
        let pWorld = this; // for VR state changes

        let canvas = engine.getRenderingCanvas();

        // This creates a basic Babylon Scene object (non-mesh)
        var scene = new BABYLON.Scene(engine);

        // create our AssetManagers
        this.JSONManager =  this.createAssetManager(scene);
        this.cubeMapManager = this.createAssetManager(scene);

        // fade to black
        scene.clearColor = new BABYLON.Color3(0, 0, 0);

        // This creates and positions a free camera (non-mesh)
        let camera = new BABYLON.UniversalCamera('desktopcamera', new BABYLON.Vector3(0, 0, 19), scene);

        // This targets the camera to scene origin
        camera.setTarget(BABYLON.Vector3.Zero());

        // set the camera maxZ a little bit larger once we create a skybox
        camera.maxZ = this.DESKTOP_DEFAULT_SIZE * celestial.dParsecUnits; // constant, size of skybox for visible universe
        camera.minZ = 1;
  
        console.log('camera initial size is:' + camera.minZ + ', ' + camera.maxZ)

        // This attaches the camera to the canvas
        camera.attachControl(canvas, true);

        // IMPORTANT: you CANNOT add a camera to scene.activeCameras

        // create lighting (dim with light.intensity)
        let light = new BABYLON.DirectionalLight("godLight", new BABYLON.Vector3(-6, -6, 0), scene);
        this.godLight = light;

        // glow Layer
        var gl = new BABYLON.GlowLayer('glow', scene, {
                mainTextureRatio: 0.1,
                //mainTextureFixedSize: 256,
                blurKernelSize: 100
            });
    
        gl.intensity = 5;
        this.glow = gl;

        // test sphere for environment.
        //var sphere = BABYLON.MeshBuilder.CreateSphere("sphere", {diameter: 2, segments: 32}, scene);
        //sphere.position.y = 1;

        // TODO: not used yet. Check when API exposes it.
        const HMDXRButton = document.getElementsByClassName('xr-toggle.button')[0];

        // DOUBLES rendering speed if present in browser, kills highlight Layer
        let multiView = true;

        // XR
        const xrHelper = await scene.createDefaultXRExperienceAsync({
            //floorMeshes: [environment.ground],
            //disableDefaultUI : true,
            useMultiview: multiView, 
            createDeviceOrientationCamera: false
        }).then(helper => {

                window.helper = helper;

                // helper.baseExperience.camera

                ////helper.enableInteractions();

                // add features (physics, teleportation)
                const fm = helper.baseExperience.featuresManager;

                /*
                use 'stable' or 'latest'
                const xrTeleportation = fm.enableFeature(BABYLON.WebXRFeatureName.TELEPORTATION, 'stable', {
                    xrInput: xrHelper.input,
                    floorMeshes: [ground],
                    defaultTargetMeshOptions: {
                        torusArrowMaterial: teleportMaterial,
                        teleportationFillColor: '#035bff',
                        teleportationBorderColor: 'red'
                    }
                });

                const xrPhysics = fm.enableFeature(BABYLON.WebXRFeatureName.PHYSICS_CONTROLLERS, "latest", {
                    xrInput: xrHelper.input,
                    physicsProperties: {
                        restitution: 0.5,
                        impostorSize: 0.1,
                        impostorType: BABYLON.PhysicsImpostor.BoxImpostor
                    },
                    enableHeadsetImpostor: true
                });

                */

                // gaze controller mode
                helper.pointerSelection = fm.enableFeature(BABYLON.WebXRControllerPointerSelection, 'latest', {
                    forceGazeMode: true,
                    xrInput: helper.input
                });

                // capture entry into and exit from VR
                helper.baseExperience.onStateChangedObservable.add((state) => {

                switch(state) {

                    case BABYLON.WebXRState.ENTERING_XR:
                        console.log("Entering XR:" + state)
                        pWorld.toggleVRSkybox(true); // shrunken below 1000 unit size
                        break;

                    case BABYLON.WebXRState.IN_XR:
                        // XR is initialized and already submitted one frame
                        console.log("In XR:" + state)
                        break;

                    case BABYLON.WebXRState.EXITING_XR:
                        console.log("Exiting XR:" + state)
                        pWorld.toggleVRSkybox(false); // original size
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

    PWorld.prototype.init = async function() {

        let pWorld = this;
        let util = this.util;

        let engine = this.setup.createDefaultEngine();

        if (engine && engine.getRenderingCanvas()) {

            // DefaultLoadingScreen.prototype.displayLoadingUI in plutonian-ui.js
            engine.displayLoadingUI();
 
            await util.sleep(1000); ///////////////////////////////

            let sc = this.createScene(engine).then(returnedScene => {

                //window.scene = returnedScene;
                pWorld.scene = returnedScene;

                let as = pWorld.createAssets(returnedScene).then(returnedAssets => {

                    console.log("Past loading assets...");

                    // DefaultLoadingScreen self-hides

                });

                engine.runRenderLoop( function () {

                    if (returnedScene) {
                        returnedScene.render();
                    }

                });

                // Resize
                window.addEventListener("resize", function () {
                    engine.resize();
                });

            });
    
        } // valid engine
    };

    ////////////////////////////////////////////////////////////////////////////
    /**
     * initialize debug layer
     * @param {BABYLON.Scene} scene 
     */
    PWorld.prototype.initDebug = function (scene) {

        let pWorld = this;

        // add keydowns
        window.addEventListener('keydown', (e) => {
            //console.log("key is:" + e.key)
            switch(e.key) {
                case 'F2':
                    pWorld.toggleDebug(this.scene);
                    break;
            }
        });

        this.DEBUG = false; //matches toggle

    };

    /**
     * Turn debugging tools on and off
     * https://doc.babylonjs.com/how_to/debug_layer
     * Must load this first:
     * https://preview.babylonjs.com/inspector/babylon.inspector.bundle.js
     * @param{BABYLON.Scene} scene
     * @param{Boolean} forceTrue 
     */
    PWorld.prototype.toggleDebug = function (scene) {

        const config = {
            overlay: false,
            globalRoot:document.getElementsByTagName('body')[0]
        };

        let floatingHeader = document.getElementsByClassName('floating-header')[0];
        let floatingFooter = document.getElementsByClassName('floating-footer')[0];

         if (this.DEBUG === false) {

            floatingHeader.style.display = 'none';
            floatingFooter.style.display = 'none';

            scene.debugLayer.show(config).then((layer) => {
                // force-select a specific entity and highlight a specific portion of its property grid:
                //layer.select(pbrmaterial, "ANISOTROPIC");
            });
            this.DEBUG = true;

        } else {

            floatingHeader.style.disply = 'block';
            floatingFooter.style.display = 'block';
            scene.debugLayer.hide();
            this.DEBUG = false;

        }

    };
    ////////////////////////////////////////////////////////////////////////////

    // return the world object

    return PWorld;

}());


// create the scene object
var plutonianWorld = new PWorld();
