/**
 * Plutonian Scenes.
 * Constants are referenced relative to PLUTO
 * - 1 unit = 2370km
 */

var PWorld = (function () {

    // constructor

    function PWorld() {

        this.dUSize    =   1000000;        // size of universe (not drawn beyond dVisUSize)
        this.dVisSize  =     10000;        // size of skybox
        this.dPosition =         0;        // default x, y, z coordinate
        this.dDistance =         0;        // default distance from world center
        this.dDiameter =         1;        // default = 1 unit
        this.dAlpha    =       0.2;        // default alpha values
        this.dSegments =        32;        // default sphere segmentation
        this.dRot      =     0.002;        // default rotation speed 2000 increments with 60fps
        this.dUnknown  = 'unknown';        // unknown object, key or value
        this.engine    =      null;        // assign class variables
        this.canvas    =      null;
        this.glow      =      null;        // glow layer
        this.highLight =      null;        // highlight layer
        
        this.worldDir  =  'worlds';        // inside ExpressJS route '/assets'

        this.util = new PUtil();
        this.setup = new PSetup(this.util);
        this.celestial = new PCelestial(this.util);

        // start
        //this.init();

        // attach engine here

    };

    // functions

    PWorld.prototype.checkObject = function (pObj) {

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
            console.error('PObject ERROR:' + pObj.name + ' missing data');
            return false;
        }

        if(!util.isString(pObj.dname)) {
            console.error('PObject ERROR:' + pObj.name + ' missing data directory');
            return false;
        }

        if(!util.isString(pObj.name)) {
            console.warn('Object WARNING: name missing');
        }

        return this.checkData(pObj);

    };

    /**
     * check for required data all objects need
     */
    PWorld.prototype.checkData = function (pObj) {

        let util = this.util;
        let data = pObj.data;

        if(!util.isObject(data)) {
            console.error('checkData ERROR: no data object in:' + pObj.name);
            return false;
        }

        return true;

    };

    /**
     Confirm the models
     */
    PWorld.prototype.getActiveModel = function (models) {

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
    PWorld.prototype.setMesh = function (pObj, mesh) {

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
    PWorld.prototype.toggleMeshActivation = function (mesh) {

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
    PWorld.prototype.setPlanetScale = function (data, scale) {

        let util = this.util;

        let sData = {
            diameter: this.dDiameter,
            distance: this.dDistance,
            segments: this.dSegments
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
    PWorld.prototype.getColor = function (colorArr) {

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

    PWorld.prototype.setPositionByXYZ = function (data, vec, units = 1) {

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

    PWorld.prototype.setPositionByRADec = function (data, vec, units = 1) {

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
    PWorld.prototype.setPosition = function (data, position, units = 1) {

        if(this.setPositionByXYZ(data, position, units)) {

            return true;

        } else if(this.setPositionByRADec(data, position, units)) {
            return true;

        } else {

            console.error('setPosition ERROR: could not set by XYZ or RA, Dec');

        }

        return false;

    };

    PWorld.prototype.setRotationByRADec = function (data, vec) {

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

    PWorld.prototype.setRotationbyQuat = function (data) {

    };

    PWorld.prototype.setLabel = function (pObj) {
        // Use: https://www.babylonjs-playground.com/#ZI9AK7#124
    };

    PWorld.prototype.setDescription = function (pObj) {

    };

    PWorld.prototype.follow = function (pObj) {

    };

    PWorld.prototype.loadSpaceVolume = function (pObj, dir, scene) {

        console.log("------------------------------");
        console.log('creating space volume:' + pObj.name)

        let mesh = null;

        if(!this.checkObject(pObj)) {
            console.error('loadSkybox ERROR: invalid object passed');
            return mesh;
        }

        let util = this.util;
        let data = pObj.data;

        // all SpaceVolumes are the same, don't need a .model entry
        mesh = BABYLON.MeshBuilder.CreateSphere(
            pObj.key, {
                diameter: data.diameter || this.dDiameter, 
                segments: data.segments || this.dSegments
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
        let mat = new BABYLON.StandardMaterial(pObj.key + '-mat', scene);

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
    PWorld.prototype.loadSkybox = function (pObj, dir, scene) {

        console.log("------------------------------");
        console.log('creating skybox:' + pObj.name);

        let mesh = null;

        if(!this.checkObject(pObj)) {
            console.error('loadSkybox ERROR: invalid object passed');
            return mesh;
        }

        let data = pObj.data;
        let util = this.util;

        // get the active model
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
        mesh = BABYLON.MeshBuilder.CreateBox(
            pObj.key, {
                size:bSize}, scene);

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

    PWorld.prototype.loadStarDome = function (pObj, dir, scene) {

        console.log("------------------------------");
        console.log("creating stardome:" + pObj.name);

        let util = this.util;
        let mesh = null;

        if(!this.checkObject(pObj)) {
            console.error('loadStarDome ERROR: invalid object passed');
            return mesh;
        }

        let data = pObj.data;

        // get the active model
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

    /** 
     * load cloud model for Nebula
     */
    PWorld.prototype.loadCloudModel = function (pObj, dir, scene) {

        console.log("------------------------------");
        console.log("drawing planetModel:" + pObj.name)

        let util = this.util;
        let mesh = null;

    };

    PWorld.prototype.loadPlanetModel = function (pObj, dir, scene) {

        console.log("------------------------------");
        console.log("drawing planetModel:" + pObj.name)

        let util = this.util;
        let mesh = null;

        if(!this.checkObject(pObj)) {
            console.error('loadPlanetModel ERROR: invalid object passed');
            return mesh;
        }

        let data = pObj.data;

        // get the active model
        let model = this.getActiveModel(data.models);

        if(!util.isObject(model)) {
            console.error('loadStarDome ERROR: no active model found');
            return mesh;
        }

        // scale raw values to plutonian planetary system units (returnd diameter)

        let scaled = this.setPlanetScale(pObj.data);

        // create 'surface' model = just a sphere with 1 texture

        if(isString(model.surface)) {

            let texDir = dir + '/textures/';

            console.log(pObj.name + ' texture:' + texDir + model.surface)

            mesh = BABYLON.MeshBuilder.CreateSphere(
                pObj.key, {
                    diameter:scaled.diameter, 
                    segments: 32}, scene);

            // TODO: stars are set via setPosition()
            // TODO: planets are set via translation to their distance.
            // TODO: need to modify position calculations from planetary computations so they are local
            // TODO: set local coordinates
            // TODO: this gets planets orbiting stars, moons orbiting planets
            // TODO: need to change!
            mesh.setPositionWithLocalVector(new BABYLON.Vector3(scaled.distance, 0, 0));
                ////////////////////setPosition(data, mesh.position, 1); 

            // material
            mesh.material = new BABYLON.StandardMaterial(pObj.key + 'Mat', scene);
            let mat = mesh.material;

            // check if emissive, since Stars may use this model
            if (model.emissive) {

                //mesh.freezeNormals(); // TODO: may be useful for emissive objects

                // add a light, centered in the mesh
                const light = new BABYLON.PointLight(pObj.name + 'Light', mesh.getAbsolutePosition(), scene);
                light.position = new BABYLON.Vector3(0, 0, 0);
                light.parent = mesh;

                // add an emissive texture
                mat.emissiveTexture = new BABYLON.Texture(texDir + model.surface, scene, true, false);

                // set colors, emissive
                if(data.color) {

                    var c = this.getColor(data.color);

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

                mat.diffuseTexture = new BABYLON.Texture(texDir + model.surface, scene);

                // specular value
                if(isNumber(model.specular)) {
                    mat.specularColor = new BABYLON.Color3(model.specular, model.specular, model.specular)
                } else {
                    mat.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5)
                }

            } // end of non-emissive

        } else if(model.gltf) {
            
            //load a gltf file

        } else if(model.alias) {

            // load an .alias wavefront file

        }

        // Runs every frame to rotate the sphere
        if(mesh) {

            // TODO: Axial tilt

            // planet rotation
            scene.onBeforeRenderObservable.add(()=>{
                mesh.rotation.y += 0.0001*scene.getEngine().getDeltaTime();
                //mesh.rotation.x += 0.0001*scene.getEngine().getDeltaTime();
            });

        }

        return mesh;

    };

    /**
     * load a (natural) moon of a planet
     */
    PWorld.prototype.loadMoon = function (pObj, dir, scene, parent) {
        
        let util = this.util;
        let mesh = this.loadPlanetModel(pObj, dir + '/' + pObj.dname, scene, pObj);

        if(mesh) {

            if(parent) {
                mesh.parent = parent;
            }

            // set additional features of moons not shared by planets (e.g. planet glow on dark side)

            // load submoons
            if(util.isArray(pObj.moons)) {
                for(let i = 0; i< pObj.moons.length; i++) {
                    this.loadMoon(pObj.moons[i], dir + '/' + pObj.dname + '/moons', scene, mesh);
                }
            }

            // load artifacts
            if(util.isArray(pObj.artifacts)) {
                for(let i = 0; i< pObj.artifacts.length; i++) {
                    this.loadArtifacts(pObj.artifacts[i], dir + '/' + pObj.dname + '/artifacts', scene, mesh);
                }
            }
        }

        return mesh;

    };

    PWorld.prototype.loadPlanet = function (pObj, dir, scene, parent) {

        let util = this.util;
        
        let mesh = this.loadPlanetModel(pObj, dir + '/' + pObj.dname, scene, parent);

        if(mesh) {

            if(parent) {
                mesh.parent = parent; //only for perfectly circular orbits, or dynamic radius computation
            }

            // set additional features of planets

            // draw the moons

            if(util.isArray(pObj.moons)) {
                for(let i = 0; i< pObj.moons.length; i++) {
                    this.loadMoon(pObj.moons[i], dir + '/' + pObj.dname + '/moons', scene, mesh);
                }
            }

        }

        return mesh;

    };

    PWorld.prototype.loadStar = function (pObj, dir, scene) {

        let util = this.util;

        // draw the star (apart from planets, etc)
        let mesh = this.loadPlanetModel(pObj, dir + '/' + pObj.dname, scene);

        if(mesh) {

            // NOTE: don't set the Star parent

            // draw the planets, comets, asteroids

            if(util.isArray(pObj.planets)) {
                for(let i = 0; i< pObj.planets.length; i++) {
                    this.loadPlanet(pObj.planets[i], dir + '/' + pObj.dname +  '/planets', scene, mesh);
                }
            }

        }

        return mesh;

    };

    PWorld.prototype.loadStarSystem = function (pObj, dir, scene, parent) {

        let util = this.util;

        console.log("STAR SYSTEM DIR:" + dir)

        let mesh = this.loadSpaceVolume(pObj, dir, scene);

        if(mesh) {

            if(util.isArray(pObj.stars)) {
                for(let i = 0; i< pObj.stars.length; i++) {
                    this.loadStar(pObj.stars[i], dir + '/' + pObj.dname + '/stars', scene, mesh);
                }
            }

        }

        return mesh;

    };

    PWorld.prototype.loadNebula = function(pObj, dir, scene) {

        let util = this.util;

        // draw the star (apart from planets, etc)
        let mesh = this.loadCloudModel(pObj, dir + '/' + pObj.dname, scene);

        if(mesh) {

        }

        return mesh;


    };

    PWorld.prototype.loadGalaxy = function (pObj, dir, scene, parent) {

        console.log("------------------------------");
        console.log('creating galaxy:' + pObj.name)

        let util = this.util;

        // draw the galaxy model as an infinite cubemap
        //mesh = loadSkyBox(galaxy, dir, scene);
        let meshSky = this.loadSkybox(pObj, dir, scene);

        /*
         * 1. The mesh parent is a empty space, outside the Skybox
         * 2. The Skybox is present for each galaxy
         * 3. Not drawn, but needed for children
         * 3. Since the Skybox is projected to infinity, we need a SECOND mesh
         *    otherwise, children inherit projection to infinity
         */
        mesh = this.loadSpaceVolume(pObj, dir, scene);

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
        // hide for now

        if(mesh) {

            this.toggleMeshActivation(mesh);

            mesh.parent = parent;

            // we DO NOT set the universe as the parent for the galaxy
            // mesh.parent = parent;

            if(this.util.isArray(pObj.globular_clusters)) {
                for(let i = 0; i< pObj.globular_clusters.length; i++) {
                    this.loadStarDome(pObj.globular_clusters[i], dir + '/globular_clusters', scene, mesh);
                }
            }

            if(this.util.isArray(pObj.open_clusters)) {
                for(let i = 0; i< pObj.open_clusters.length; i++) {
                    this.loadSpaceVolume(pObj.open_clusters[i], dir + '/open_clusters', scene, mesh);
                }
            }

            if(this.util.isArray(pObj.nebula)) {
                for(let i = 0; i< pObj.nebula.length; i++) {
                    this.loadNebula(pObj.nebula[i], dir + '/nebula', scene, mesh);
                }
            }

            if(this.util.isArray(pObj.stardomes)) {
                for (let i = 0; i < pObj.stardomes.length; i++) {
                    this.loadStarDome(pObj.stardomes[i], dir + '/stardomes', scene, mesh);
                }
            }

            if(this.util.isArray(pObj.star_systems)) {
                for(let i = 0; i< pObj.star_systems.length; i++) {
                    this.loadStarSystem(pObj.star_systems[i], dir + '/star_systems', scene, mesh);
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
    * Check to see if the world can be parsed.
    * @param {Object} world 
    */
    PWorld.prototype.checkWorld = function (pObj) {
        return true;
    };

    PWorld.prototype.loadWorld = async function (pObj, scene) {

        console.log("------------------------------");
        console.log('creating world:' + pObj.name)

        let util = this.util;

        if(!this.checkWorld(pObj)) {
            console.error('loadWorld ERROR: no World object');
            return mesh;
        }

        dir = this.worldDir;

        // convert 1 unit = 1 parsec
        //////////////world.data.diameter *= dParsecUnits; //////////////////////////////////////////////////

        let mesh = this.loadSpaceVolume(pObj, dir, scene);

        // Create objects in the universe

        if(mesh) { // valid world

            // hide the universe, we only view the world from inside a galaxy
            this.toggleMeshActivation(mesh);

            if(Array.isArray(pObj.dark_matter)) {
                for(let i = 0; i < pObj.dark_matter.length; i++) {
                    this.loadDarkMatter(pObj.dark_matter[i], dir + '/' + pObj.dname, scene, mesh);
                }
            }

            if(Array.isArray(pObj.galaxies)) {
                for(let i = 0; i < pObj.galaxies.length; i++) { // loop through galaxy array
                    this.loadGalaxy(pObj.galaxies[i], dir + '/' + pObj.dname, scene, mesh);
                } // loop through galaxies
            }

        } 

    };

    PWorld.prototype.createAssets = async function (scene) {

        var loadedAssets = {};
        var pWorld = this;

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
                if(pWorld.checkWorld(loadJSON.world)) {

                    let world = pWorld.loadWorld(loadJSON.world, scene).then((mesh) => {
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

    PWorld.prototype.createScene = async function (engine, canvas) {

        // This creates a basic Babylon Scene object (non-mesh)
        var scene = new BABYLON.Scene(engine);

        // TODO: Optimizations
        // https://doc.babylonjs.com/how_to/how_to_use_sceneoptimizer

        // TODO: follow camera
        // https://doc.babylonjs.com/babylon101/cameras

        // This creates and positions a free camera (non-mesh)
        var camera = new BABYLON.FreeCamera('camera1', new BABYLON.Vector3(0, 0, 19), scene);

        camera.maxZ = this.dUSize * dParsecUnits; // constant, size of skybox for visible universe
        //camera.minZ = 0.1;

        // This targets the camera to scene origin
        camera.setTarget(BABYLON.Vector3.Zero());

        // This attaches the camera to the canvas
        camera.attachControl(canvas, true);

        // TODO: set up controllers for Desktop and VR
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

   // return the world object

   return PWorld;

}());


// create the scene object
var plutonianWorld = new PWorld();

/**
 * Fire loading
 */

try {

    // Initialize <canvas>, attach as rendering surface
    //var canvas = document.getElementsByClassName('render-xr-canvas')[0];

    let c = plutonianWorld.setup.getCanvas();

    // create rendering engine
    var engine = plutonianWorld.setup.createDefaultEngine(c);

    // initialize loader UI
    engine.loadingScreen = new customLoadingScreen('scene-loader-wrapper', 'scene-loader-dialog');

    // display Loading Screen
    engine.loadingScreen.displayLoadingUI();

    // create the scene (async)
    var s = plutonianWorld.createScene(engine, c).then(returnedScene => { 

        // keep a local copy
        plutonianWorld.scene = returnedScene;

        returnedScene.getEngine().loadingScreen.hideLoadingUI();

        // load assets into the scene
        var assets = plutonianWorld.createAssets(returnedScene).then(returnedAssets => {

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

        }); // end of createAssets()

        //sceneToRender = returnedScene;
            // set up endless render loop
        engine.runRenderLoop(function () {
            if (returnedScene) {
                returnedScene.render();
            }

        }); // end of rendering loop

    }); // end of createScene()


} catch (e) {

    console.error('failed to create scene')

}
