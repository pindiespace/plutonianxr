/**
 * Plutonian Scenes.
 * Constants are referenced relative to PLUTO
 * - 1 unit = 2370km
 */
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

var loadedAssets = {};


/**
 * Check if an object has valid properties
 * @param {Object} obj 
 */
var checkObject = function (obj) {

    if(!isString(obj.key)) {
        console.error('Object ERROR:' + obj.name + ' missing key');
        return false;
    }

    if(!isString(obj.dname)) {
        console.error('Object ERROR:' + obj.name + ' missing dname');
        return false;
    }

    // description is optional

    if(!isObject(obj.data)) {
        console.error('Object ERROR:' + obj.name + ' missing data');
        return false;
    }

    let data = obj.data;

    if(!isString(data.type)) {
        console.error('Object ERROR:' + obj.name + ' missing detailed type');
        return false;
    }

    if(!isNumber(data.diameter) || !isNumber(data.distance)) {
        console.error('Object ERROR:' + obj.name + ' missing diameter or distance');
        return false;
    }

    if(!isNumber(data.rotation) || !isNumber(data.tilt)) {
        console.warn('Object Warning ' + obj.name + ' missing rotation or axial tilt');
    }

    if(!isObject(data.models) || Object.keys(data.models).length < 1) {
        console.warn('Object Warning:' + obj.name + ' missing models');
        return false;
    }

   return true;

};

/** 
 * Convert units to plutonian units
 * @param {Object} data
 */
var scaleToPlutonian = function (data) {

    var diameter = dDiameter, distance = dDistance, 
        kmUnits = dKmUnits, segments = dSegments;   // default = 1 unit

    if(isNumber(data.diameter) && data.diameter > 0) diameter = data.diameter/dKmUnits;
    if(isNumber(data.distance) && data.distance != 0) distance = data.distance/dKmUnits; 
    if(isNumber(data.segments)) segments = data.segments;
    if(diameter < 0.01) console.warn('WARNNG: diameter very small (' + diameter + ' units');

    return {
        diameter: diameter,
        distance: distance,
        segments: segments
    }

};

/**
 * toggle Mesh presence in the drawing chain
 * @param {Mesh}
 */
var toggleMeshActivation = function (mesh) {

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

};

var setLabel = function (mesh) {
    // Use: https://www.babylonjs-playground.com/#ZI9AK7#124
};

/**
 * Adjust 8-bit rgb values to BabylonJS 0-1 color
 * @param {Array} colorArr
 * @returns {BABYLON.Color3 | BABYLON.Color4}
 * If a color is not in the 0-1 range, adjust it.
 */
var setColor = function (colorArr) {
    var r = 0, g = 0, b = 0, a = 1, color;

    if(Array.isArray(colorArr)) {

        if(isNumber(colorArr[0]) && isNumber(colorArr[1]) && isNumber(colorArr[2])) {

            r = colorArr[0], g = colorArr[1], b = colorArr[2];

            if((r + g + + b) > 1.0) {

                r /= 255, g /= 255, b /= 255;

                if(isNumber(colorArr[3])) {
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
    } else {
        console.error('color got invalid Array');
    }

    return color;

    //console.error('failed to load color, adding default white')
    //return new BABYLON.Color3(1, 1, 1); // failed to load
};

/** 
 * Position using Plutonian JSON format, slightly different from HYG.
 * Units may vary, since the simulation is scaled relative to real distances (which are huge)
 */
var setPosition = function (data, position, units) {

    if(isObject(data) && isObject(position) && isNumber(units)) {

        ////////////console.log(">>>>>>>>>>>POSITIONING.......")
        //mesh.setPositionWithLocalVector(
        //    new BABYLON.Vector3(Math.cos(B) * Math.cos(A) * dParsecUnits, 
        //        Math.cos(B) * Math.sin(A) * dParsecUnits, 
        //        Math.sin(B) * dParsecUnits
        //    ));

        // TODO: rotate galaxy stardome by 
        // TODO: Galactic tilt RA = 12:52 and Dec = +26:19.
        // TODO: Galactic rotation RA = 17:45 and Dec = -29:22
        // TODO: http://spiff.rit.edu/classes/phys301/lectures/coords/coords.html

        if (isNumber(data.x) && isNumber(data.y) && isNumber(data.z)) {
            /////////////////console.log(">>>>>>>>>>>POSITIONIN XYZ..........")
            position.x = data.x * dParsecUnits;
            position.y = data.y * dParsecUnits;
            position.z = data.z * dParsecUnits;
            return true;

        }  else if (isNumber(data.ra) && isNumber(data.dec) && isNumber(data.distance)) {
            ////////////////console.log(">>>>>>>>>>>POSITIONING RA DEC............")
            /*
             * Note: we reverse the y and z axes to match the BabylonJS coordinate system
             */
            let A = degToRad(parseFloat(data.ra) * 15);
            let B = degToRad(parseFloat(data.dec));
            position.x = Math.cos(B) * Math.cos(A) * data.distance * units;
            position.z = Math.cos(B) * Math.sin(A) * data.distance * units; // was y
            position.y = Math.sin(B) * data.distance * units; // was z
            return true;

        } else {
            console.error('setObject: invalid position data, no XYZ or RA Dec Distance presents');

        }

    } else {
        console.error('setObject: invalid parameters: data:' + data + ' position:' + position + ' units:' + units);
    }

    return false;
};

var setRotation = function (data, rotation) {

    if(isObject(data) && isObject(rotation)) {

        // for x = x, z = y, y = z
        //data.ra = 179.2; // side to side (almost 180)
        //data.dec = 61.2; //up and down (correct galactic degrees 60.2)

        // for x = x, y = y, z = z

        let A = degToRad(parseFloat(data.ra) * 15);
        let B = degToRad(parseFloat(data.dec));


        let x = Math.cos(B) * Math.cos(A);
        let z = Math.cos(B) * Math.sin(A); // was y
        let y = Math.sin(B); // was z

        rotation.x = x
        rotation.z = y
        rotation.y = z

        //console.log("+++++++++RA:" + data.ra + " Dec:" + data.dec)
        //console.log("++++++++++x:" + x + " y:"  + y + " z:" + z)

        return true;

    }

    return false;
};

var setRotationbyQuat = function (data) {

};

/**
 * Infinite-distance skybox. Used to create galaxy background
 * @param {String} cubemap name (BabylonJS-specifics)
 * @param {String} dir 
 * @param {Scene} scene
 */
var loadSkyBox = function (obj, dir, scene) {

    console.log("------------------------------");
    console.log('creating skybox:' + obj.name);

    var mesh = null;

    if (isObject(obj.data)) {

        let data = obj.data;

        if (isObject(data.models)) { //REDUNDANT, REMOVE

            let models = data.models;

            if(models.default) {

                let mod = models.default;
                let cubeMapName = obj.name + '-cubemap';

                // TODO: box should be positioned, even though that doesn't affect drawing.
                // TODO: box needs to be rotated to match azimuth of galaxy relative to solar system
                // TODO: process galaxy image to remove bright stars

                /* 
                * Create an infinite-distance skybox
                * NOTE: the box clips the drawing of the stars at its size, even though it renders at infinite
                * NOTE: you can't set to really huge amounts (e.g. 10000000) or it chokes and disappears
                * NOTE: some stars in the Hyg database are further away than 10000!
                */
                let bSize = dVisSize;

                if(isNumber(data.diameter) && data.diameter > 0) {
                    bSize = data.diameter * dParsecUnits;
                    console.log('skybox for:' + obj.name + ' using bSize:' + bSize);
                }

                // create the mesh
                mesh = BABYLON.MeshBuilder.CreateBox(cubeMapName, {size:bSize}, scene);
                mesh.infiniteDistance = true;
                mesh.freezeNormals(); // don't need to calculate

                window.skymesh = mesh;

                // TEMPORARY
                data.ra = 179.25; // side to side (almost 180)
                data.dec = 60.749; //up and down (correct galactic degrees 60.2)

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
                    setRotation(data, mesh.rotation);
                });

                // translate and rotate

                setPosition(data, mesh.position, dParsecUnits);

                setRotation(data, mesh.rotation);

                // Create material suitable for an infinite-distance skybox
                var mat = new BABYLON.StandardMaterial(cubeMapName, scene);
                mat.backFaceCulling = false;
                mat.diffuseColor = new BABYLON.Color3( 0, 0, 0 );
                mat.specularColor = new BABYLON.Color3( 0, 0, 0 );

                // Load a cubemap. Files in each model directory
                mat.reflectionTexture = new BABYLON.CubeTexture(dir + '/textures/' + mod.cubemap + '/', 
                scene, ['_px.png', '_py.png', '_pz.png', '_nx.png', '_ny.png', '_nz.png']);

                // Skybox is always drawn at infinity
                mat.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
                mat.diffuseColor = new BABYLON.Color3(0, 0, 0);
                mat.specularColor = new BABYLON.Color3(0, 0, 0);
                mesh.material = mat;
            }

        } else {
            console.warn('WARNING: loadSkybox: no models');
        }

    } else {
        console.error('loadSkybox: non-object passed');
    }

    return mesh;
};

/**
 * load a mesh volume without a texture. translucent 'bubble' surrounding systems.
 * Use boundaries, influence, e.g. solar influence, thermoclines, etc.
 * Empty space has an invisible mesh volume, so it can act as a parent to the 
 * objects within.
 * @param {String}
 */
 var loadSpaceVolume = function (obj, dir, scene, parent) {

    console.log("------------------------------");
    console.log('creating space volume:' + obj.name)

    var mesh = null;

    if(isObject(obj.data)) {

        let data = obj.data;

        // create a spherical volume, using data or defaults
        mesh = BABYLON.MeshBuilder.CreateSphere(
            obj.key || dUnknown, {
                diameter: data.diameter || dDiameter, 
                segments: data.segments || dSegments
                }, scene);

        // there is only one model for spaceVolume - a translucent sphere, back culling off

        // position and rotate the skybox
        if(isNumber(data.ra) && isNumber(data.dec)) {

            setPosition(data, mesh.position, dParsecUnits); 

            console.log(obj.name + " SpaceVolume position x:" + mesh.position.x + " y:" + mesh.position.y + " z:" + mesh.position.z)
            //console.log("PARENT:"  + mesh.position.x + " y:" + mesh.position.y + " z:" + mesh.position.z)


            // create material
            var mat = new BABYLON.StandardMaterial(obj.name + '-mat', scene);

            // space volumes only have color, not a texture
            if(Array.isArray(data.color)) {
                mat.diffuseColor = setColor(data.color);
            } else {
                mat.diffuseColor = BABYLON.Color3.Green();
            }

            //soft specular highlight
            mat.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3); 

            //NOTE: mat.alpha = 1; would work, but this function is mesh-level, not material-level

            // set visibility, with a default to translucent
            if(isNumber(data.color[3])) {
                let c = data.color[3];
                if(c > 1 ) c /= 255;
                mesh.visibility = c; 
            } else {
                mesh.visibility = dAlpha; // default alpha value = 1
            }

            mat.backFaceCulling = false; // don't need to see inside

            // set the material to the mesh
            mesh.material = mat;

        } else {
            console.warn('WARNING: No RA, Dec for SpaceVolume ' + obj.name);
            mesh.setPositionWithLocalVector(new BABYLON.Vector3(dPosition, dPosition, dPosition));
        }

    } else {
        console.error('loadSpaceVolume: non-object passed');
    }

    return mesh;

 }; // end of load space volume

/**
 * Load bright nearby stars from a database.
 * @param {Object} obj
 * @param {String} dir
 * @param {Scene} scene
 * @param {Mesh} parent
 */
var loadStarDome = function (obj, dir, scene, parent) {

    var mesh = null;

    console.log("------------------------------");
    console.log("creating stardome:" + obj.name)
    
    let domeDir = dir + '/' + obj.dname + '/';

    var assetManager = new BABYLON.AssetsManager(scene);

    if(obj.data.models) {

        let models = obj.data.models;

        let hyg, spritesheet;

        if(models.sprite20) {
            mod = models.sprite20;

        } else if (models.sprite120) {
            mod = models.sprite120;
        }

        // TODO: GUI OR PERFORMANCE SELECT
        mod = models.sprite120; ////////////////////////////////////////

        if(mod) {
            let hyg = domeDir + mod.hyg;
            let loadJSON = assetManager.addTextFileTask(hyg.substring(0, hyg.lastIndexOf(".")) + '-stardome', hyg);
            loadJSON.onSuccess = function(dome) {
                loadJSON.stars = JSON.parse(dome.text);
                const spriteManager = computeHygSprite(loadJSON.stars, domeDir + '/sprite/textures/' + mod.spritesheet, mod.size, scene); // TODO: attach elsewhere, or delete!
            }
            assetManager.load();
        }

    } // models exist

    return mesh;
};

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
        let scaled = scaleToPlutonian(obj.data);
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

                        var c = setColor(obj.data.color);

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
        if(checkObject(moon)) {
            mesh = loadPlanetModel(moon, dir + '/' + moon.dname, scene, moon);
            mesh.parent = parent;
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
        if(checkObject(planet)) {
            mesh = loadPlanetModel(planet, dir + '/' + planet.dname, scene, parent);
            mesh.parent = parent; //only for perfectly circular orbits, or dynamic radius computation
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
        mesh = loadSpaceVolume(starSystem, dir, scene);
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
        mesh = loadSkyBox(galaxy, dir, scene);

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
        mesh = loadSpaceVolume(galaxy, dir, scene);

        // hide for now
        toggleMeshActivation(mesh);

        //console.log("galaxy " + galaxy.name + " position:" + mesh.position.x + " y:" + mesh.position.y + " z:" + mesh.position.z);

        mesh.parent = parent;
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
                loadStarDome(galaxy.stardomes[i], dir + '/stardomes', scene, mesh);
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

    var mesh = loadSpaceVolume(world, dir, scene);

    // hide for now
    toggleMeshActivation(mesh);

    // Create an infinite skybox for the universe
    ////////////var mesh = loadSkyBox(world, dir, scene);
    ///toggleMesh(mesh); // make it invisible

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
}

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

    // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
    //var light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
    //var light = new BABYLON.DirectionalLight('light', new BABYLON.Vector3(5, -0.5, 1.0), scene);
    //var light = new BABYLON.PointLight('light', new BABYLON.Vector3(-5, -0.5, 0), scene);
    //light.position = new BABYLON.Vector3(1, 0, -1);
        
    // Default intensity is 1. Let's dim the light a small amount
    //light.intensity = 0.7;

    // Shadows
    //var shadowGenerator = new BABYLON.ShadowGenerator(1024, light);
    //shadowGenerator.useBlurExponentialShadowMap = true;
    //shadowGenerator.blurKernel = 32;
    //shadowGenerator.addShadowCaster(sphere, true);

    // Our built-in 'sphere' shape.
    //var sphere = BABYLON.MeshBuilder.CreateSphere('pluto', {diameter: 1.4, segments: 32}, scene);    
    //sphere.position.y = 1;
    //sphere.material = new BABYLON.StandardMaterial('plutoMat', scene);
    //sphere.material.diffuseTexture = new BABYLON.Texture('worlds/milky_way/solar_system/sol/pluto/charon/charon.png', scene );
    //sphere.material.specularColor = new BABYLON.Color3( 0.2, 0.2, 0.2 ); //gets rid of highlight

    //const environment = scene.createDefaultEnvironment();

    // Also see https://doc.babylonjs.com/playground/?code=customButtons
    // TODO: not used yet. Check when API exposes it.
    var HMDXRButton = document.getElementsByClassName('xr-toggle.button')[0];

    var vrHelperOptions = {};
    vrHelperOptions.createDeviceOrientationCamera = false;

    // XR
    const xrHelper = await scene.createDefaultXRExperienceAsync(vrHelperOptions);
        //floorMeshes: [environment.ground],
        //disableDefaultUI : true
    //});

    // doesn't work
    //xrHelper.enterExitUI._buttons[0].element = HMDButton;

    /////////////////////window.xrHelper = xrHelper;

    return scene;
};

/**
 * Load world assets asynchronously from ./assets directory
 * @param {Scene} scene 
 */
var createAssets = async function (scene) {

    // Make some items pickable
    scene.onPointerDown = function (evt) {

        let pickResult = scene.pickSprite(this.pointerX, this.pointerY);
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

        let pickMesh = scene.pick(this.pointerX, this.pointerY);
        if(pickMesh.hit) {
            let m = pickMesh.pickedMesh;
            console.log("Picked mesh is:" + m.name);
            //if(!m.infiniteDistance) {
            //    console.log("Changing mesh::::")
            //    toggleMeshActivation(m)
            //};
        }

    };

    // Begin loading assets
    var assetManager = new BABYLON.AssetsManager(scene);

    var loadJSON = assetManager.addTextFileTask('worlds', 'worlds/worlds.json');

    loadJSON.onSuccess = function(world) {

        // read the world file
        loadJSON.world = JSON.parse(world.text);

        if(isValidWorld(loadJSON.world)) {
            var scene1 = loadWorld(loadJSON.world, scene);
            scene1.then(() => {
                console.log("Loaded World File...")
            });
        } // valid JSON check

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

// Initialize <canvas>, attach as rendering surface
var canvas = document.getElementsByClassName('render-xr-canvas')[0];

try {

    // create rendering engine
    var engine = createDefaultEngine(canvas);

    // initialize loader UI
    engine.loadingScreen = new customLoadingScreen('scene-loader-wrapper', 'scene-loader-dialog');

    // display Loading Screen
    engine.loadingScreen.displayLoadingUI();

    // create the scene (async)
    scene = createScene(engine, canvas);

    // when scene is built, load assets
    scene.then(returnedScene => { 

        returnedScene.getEngine().loadingScreen.hideLoadingUI();

        // TODO: remove
        window.scene = returnedScene;

        // load assets into the scene
        var assets = createAssets(returnedScene);

        // After loading, render
        assets.then(returnedAssets => {
            console.log('in .then for returned assets')
            console.log("WORLD IS A:" + returnedAssets)

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
