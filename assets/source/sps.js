///////////////////////////////////////////////////////////////////////////
// optimized and unoptimzed meshes

//UNOPTIMIZED:
import {AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {SolarSystem} from '../solar-system.service';
import {AbstractMesh, ActionManager, ExecuteCodeAction, MeshBuilder, Scene} from '@babylonjs/core';
import {PreferenceService} from '../../services/preference.service';
import {combineLatest, Subject} from 'rxjs';
import {debounceTime, takeUntil} from 'rxjs/operators';
import {AsteroidConfiguration, MeshConfiguration} from '../../models';
import {LoadingService} from '../../services/loading.service';
import {InteractionService} from '../../services/interaction.service';

const FPS = 60;

@Component({
  selector: 'app-unoptimized',
  templateUrl: './unoptimized.component.html',
})
export class UnoptimizedComponent implements AfterViewInit, OnDestroy, OnInit {
  @ViewChild('rCanvas', {static: true})
  canvasRef: ElementRef<HTMLCanvasElement>;

  // cleanup our subscriptions
  protected readonly destroy = new Subject<boolean>();
  // store configurations for easy access
  protected asteroidConfig: AsteroidConfiguration;
  protected meshConfig: MeshConfiguration;
  // store asteroids to clean up on changes
  protected readonly asteroids: AbstractMesh[] = [];

  constructor(
    protected readonly solarSystem: SolarSystem,
    protected readonly preferences: PreferenceService,
    protected readonly loading: LoadingService,
    protected readonly interaction: InteractionService,
  ) {
  }

  ngOnInit(): void {
    this.loading.message$.next('Initialising Scene ...');
    this.initScene();

    // subscribe to the preferences and handle them accordingly
    // we don't have a need to distinguish what event fires because the path afterwards is the same
    combineLatest(this.preferences.asteroidConfig, this.preferences.meshConfig).pipe(takeUntil(this.destroy), debounceTime(400))
      .subscribe(([asteroidConfig, meshConfig]) => {
        // update config
        this.asteroidConfig = asteroidConfig;
        this.meshConfig = meshConfig;
        // change / update asteroids
        this.manageAsteroids();
      });

    this.preferences.materialConfig.pipe(takeUntil(this.destroy)).subscribe(conf => conf.freeze
      ? this.solarSystem.scene.freezeMaterials()
      : this.solarSystem.scene.unfreezeMaterials());
  }

  initScene() {
    // get the scene object
    const scene = this.solarSystem.createScene(this.canvasRef);
    // by setting blockfreeActiveMeshesAndRenderingGroups we tell the engine to
    // insert all meshes without indexing and checking them
    scene.blockfreeActiveMeshesAndRenderingGroups = true;
    this.addPlanets(scene);
    // we have to set it back to its original state
    scene.blockfreeActiveMeshesAndRenderingGroups = false;

  }

  ngAfterViewInit(): void {
    // start the engine
    // be aware that we have to setup the scene before
    this.solarSystem.start(this.preferences.useNgZone.getValue());
  }

  ngOnDestroy(): void {
    // stop the engine and clean up
    this.solarSystem.stop();
    this.destroy.next(true);
  }

  manageAsteroids() {
    this.loading.message$.next('Managing Asteroids ...');
    // unfreeze, our changes shouold be mirrored to the engine.
    this.solarSystem.scene.unfreezeActiveMeshes();
    this.solarSystem.scene.unfreezeMaterials();
    // as above, by setting blockfreeActiveMeshesAndRenderingGroups we tell the engine to
    // insert all meshes without indexing and checking them
    this.solarSystem.scene.blockfreeActiveMeshesAndRenderingGroups = this.meshConfig.batch;
    // clean the "old" asteroids, it is easier for the demo to recreate them with the
    // desired configuration than to patch every single one
    this.clearAsteroids();
    this.loading.message$.next('Adding Asteroids ...');
    // due to the possible blocking calculation a timeout is needed to display the message
    setTimeout(() => {
      this.addAsteroids(this.solarSystem.scene, this.asteroidConfig.amount);

      // by freezing the meshes and materials we can skip a lot of change observations
      // basically we tell the engine those things won't change
      if (this.preferences.materialConfig.getValue().freeze) {
        this.loading.message$.next('Freezing Materials ...');
        this.solarSystem.scene.freezeMaterials();
      }
      if (this.meshConfig.freeze) {
        this.loading.message$.next('Freezing Meshes ...');
        this.solarSystem.scene.freezeActiveMeshes(); // 5-10 fps
      }

      this.solarSystem.scene.blockfreeActiveMeshesAndRenderingGroups = false;
      this.loading.message$.next(null);
    }, 30);

  }

  clearAsteroids() {
    this.loading.message$.next('Removing Asteroids ...');
    // instruct the engine to remove this object and remove our reference too
    this.asteroids.slice().forEach((asteroid) => {
      asteroid.dispose();
      this.asteroids.pop();
    });
  }

  addAsteroids(scene: Scene, amount: number) {
    for (let i = 0; i < amount; i++) {
      const s = MeshBuilder.CreateSphere(`sphere${i}`, {segments: this.asteroidConfig.segments, diameter: 1}, scene);
      this.solarSystem.addRandomMaterial(s);
      this.solarSystem.makeAsteroid(s, i);
      this.asteroids.push(s);
      s.isVisible = true;
    }
  }

  addPlanets(scene: Scene) {
    scene.beginAnimation(this.solarSystem.createPlanetInSystem('mercury', .3, 4, [.5, .5, .5]), 0, FPS, true, 0.25);
    scene.beginAnimation(this.solarSystem.createPlanetInSystem('venus', .4, 5, [.9, .9, 0]), 0, FPS, true, 0.2);
    scene.beginAnimation(this.solarSystem.createPlanetInSystem('earth', .6, 6.1, [0, 0, 1]), 0, FPS, true, 0.12);
    scene.beginAnimation(this.solarSystem.createPlanetInSystem('mars', .5, 7.3, [1, 0, 0]), 0, FPS, true, 0.1);

    const jupyter = this.solarSystem.createPlanetInSystem('jupyter', 1.3, 10.5, [.95, .95, .85]);
    jupyter.actionManager = new ActionManager(this.solarSystem.scene);
    jupyter.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPickUpTrigger,
      () => this.interaction.onJupyterClick.next())
    );
    scene.beginAnimation(jupyter, 0, FPS, true, 0.05);
  }
}

OPTIMIZED:

import {Component} from '@angular/core';
import {AbstractMesh, Mesh, MeshBuilder, Scene} from '@babylonjs/core';
import {UnoptimizedComponent} from '../1_unoptimized/unoptimized.component';

@Component({
  selector: 'app-mesh-optimized',
  templateUrl: './mesh-optimized.component.html',
})
export class MeshOptimizedComponent extends UnoptimizedComponent {
  addAsteroids(scene: Scene, amount: number) {
    const baseSphere = this.getBaseSphere();

    this.loading.message$.next('Adding Asteroids ...');
    for (let i = 0; i < amount; i++) {
      const asteroid = baseSphere.clone('instance' + i);
      this.asteroids.push(asteroid);
      this.solarSystem.makeAsteroid(asteroid, i);
      asteroid.isVisible = true;
    }

    if (!this.meshConfig.merge) {
      return;
    }

    this.loading.message$.next('Grouping Asteroids ...');
    const groupSize = 300;
    const merged = [];
    for (let i = 0; i < amount; i += groupSize) {
      const upper = i + groupSize > this.asteroids.length ? this.asteroids.length : i + groupSize;
      const mergedMesh = Mesh.MergeMeshes(this.asteroids.slice(i, upper) as Mesh[], true);
      if (mergedMesh) {
        mergedMesh.parent = this.solarSystem.sun;
        this.solarSystem.addRandomMaterial(mergedMesh);
        merged.push(mergedMesh);
      }
    }
    this.loading.message$.next('Clearing "single" asteroids ...');
    this.clearAsteroids();
    this.loading.message$.next('Adding "merged" asteroids ...');
    this.asteroids.push(...merged);
  }

  getBaseSphere(suffix = ''): Mesh {
    const baseSphere = MeshBuilder.CreateSphere('BaseSphere' + suffix, {
      segments: this.asteroidConfig.segments,
      diameter: 1
    }, this.solarSystem.scene);
    if (this.meshConfig.index) {
      baseSphere.convertToUnIndexedMesh();
    } // TEUER BEI VIELEN MESHES - 1-3fps
    if (this.meshConfig.flat) {
      baseSphere.convertToFlatShadedMesh();
    } // TEUER BEI VIELEN MESHES - 1-3fps
    baseSphere.cullingStrategy = AbstractMesh.CULLINGSTRATEGY_OPTIMISTIC_INCLUSION_THEN_BSPHERE_ONLY;
    baseSphere.isVisible = false;
    if (this.meshConfig.normals) {
      baseSphere.freezeNormals();
    }
    if (this.meshConfig.edge) {
      baseSphere.disableEdgesRendering();
    }
    if (this.meshConfig.boundings) {
      baseSphere.doNotSyncBoundingInfo = true;
    } // 5-10 fps;
    this.solarSystem.addRandomMaterial(baseSphere);
    return baseSphere;
  }
}

///////////////////////////////////////////////////////////////////

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



/**
 * compute stars as a solid particle system
 * https://www.babylonjs-playground.com/#HT9E3B#5
 * @param {ObjectJSON} hygData 
 * @param {String} texturePath
 * @param {Scene} scene 
 */
var computeHygSPS = function (hygData, texturePath, scene) {

    console.log("^^^^^^^^^ENTERING COMPUTEHYGSPS")

    console.log("^^^^^^^^^TEXURE PATH:" + texturePath)

    if(Array.isArray(hygData)) {

        var numStars = hygData.length; // an array of objects

        let camera = scene.cameras[0]
        let colors = setHygColors();

  // texture and material
        //var url = "http://upload.wikimedia.org/wikipedia/en/8/86/Einstein_tongue.jpg";
        var mat = new BABYLON.StandardMaterial("mat1", scene);
        //mat.backFaceCulling = false;
        var texture = new BABYLON.Texture(texturePath, scene);
        //texture.uScale = 10;    texture.vScale = 10;  
        //var texture = new BABYLON.Texture(url, scene);
        mat.diffuseTexture = texture;
        mat.emissiveTexture = texture;
        mat.specularColor = new BABYLON.Color3(0, 0, 0);

        // SPS creation
        ////var plane = BABYLON.Mesh.CreatePlane("plane", 1, scene);
        var plane = BABYLON.MeshBuilder.CreateDisc("sun", {radius: 5, arc: 1, tessellation: 64, sideOrientation: BABYLON.Mesh.DOUBLESIDE}, scene);

        var SPS = new BABYLON.SolidParticleSystem('SPS', scene);
        SPS.addShape(plane, 10000);

        var mesh = SPS.buildMesh();

        mesh.material = mat;

        plane.dispose();  // free memory

        // init
        SPS.initParticles = function() {
            for (var p = 0; p < this.nbParticles; p++) {
                // add a property linking this to Hyg
                this.particles[p].hIdx = p;
                this.positionParticle(this.particles[p]);
            }
        };

        SPS.positionParticle = function (particle) {
                particle.isVisible = true;
                // use the index assigned in SPS.initParticles to grab a Hyg entry
                let star = hygData[particle.hIdx];
                let name = star.ProperName || star.StarID;
                let spect = star.Spectrum.toLowerCase()[0];
                let c = colors[spect];

                // if color is defined, use it
                if(c) {
                    particle.color = new BABYLON.Color4(c.r, c.g, c.b, c.a)
                }

                setHygPosition(star, particle.position);

        };

        // recycle
        SPS.recycleParticle = function(particle) {
        };

        // update : will be called by setParticles()
        SPS.updateParticle = function(particle) {

            // this.recycleParticle(particle);

            let dx = camera.position.x - particle.position.x,
            dy = camera.position.y - particle.position.y,
            dz = camera.position.z - particle.position.z;

            //dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            dist = dx + dy + dz / 3; //rough;
            //if(dist > 100) particle.scale.x = 10;
            //else particle.scale.x = 1;

        };

        // Tuning : plane particles facing, so billboard and no rotation computation
        // colors not changing then, neither textures
        SPS.billboard = true;
        SPS.computeParticleRotation = false;
        SPS.computeParticleColor = true;
        SPS.computeParticleTexture = true;
        SPS.mesh.alwaysSelectAsActiveMesh = true;
        //SPS.mesh.freezeWorldMatrix(); // prevents from re-computing the World Matrix each frame
        //SPS.mesh.freezeNormals(); // prevents from re-computing the normals each frame

        // init all particle values and set them once to apply textures, colors, etc
        SPS.initParticles();
        SPS.setParticles();

        // update particle properties based on distance from the camera
        scene.registerBeforeRender(function() {
        SPS.setParticles();
        });

    } // valid Hygdata

};



   /*
            if(star.x) {
                sprite.position.x = star.x * dParsecUnits;
                sprite.position.z = star.y * dParsecUnits; // was y
                sprite.position.y = star.z * dParsecUnits; // wax z
            } else {
                let A = degToRad(parseFloat(star.RA) * 15);
                let B = degToRad(parseFloat(star.Dec));
                sprite.position.x = Math.cos(B) * Math.cos(A) * star.Distance * dParsecUnits;
                sprite.position.z = Math.cos(B) * Math.sin(A) * star.Distance * dParsecUnits; // was y
                sprite.position.y = Math.sin(B) * star.Distance * dParsecUnits; // was z
            }
            */




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
        let spriteIndex = 0;
        let sIndex = [];
        sIndex['o'] = 6,
        sIndex['b'] = 5,
        sIndex['a'] = 4,
        sIndex['f'] = 3,
        sIndex['g'] = 2,
        sIndex['k'] = 1,
        sIndex['m'] = 0;

        var spriteManagerStars = new BABYLON.SpriteManager('starsManager', spriteFile, numStars, spriteSize, scene);
        spriteManagerStars.isPickable = true;

        spriteManagerStars.disableDepthWrite = true; // TODO: IS THIS VALUABLE????

        window.camera = scene.cameras[0]; ///////////////////////////TODO TODO

        // TODO: await function here!!!

        // Get the HYG data
        for (let i = 0; i < hygData.length; i++) {

            let star = hygData[i];
            let name = star.ProperName || star.StarID;

            // colors
            spect = star.Spectrum.toLowerCase()[0];
        
            spriteIndex = sIndex[spect];

            ///////////////////////////////////////////////////////////////////////
            //
            // SCALING THREAAD
            //https://forum.babylonjs.com/t/disable-camera-depending-scaling-on-a-sprite/9252

            // compute position. If xyz is present, use it, otherwise RA/Dec
            // TODO: if the star is listed at 100,000 in Hyg, distance is unknown
            // TODO: currently NOT being shown
            // TODO: make it a bit less distant than the skybox
            // TODO: set them to 30,000 units so they are drawn
            // TODO: alternatively, set skybox 10x bigger than galaxy, universe even bigger
            // TODO: Andromena at 770,000 parsecs
            
            if(star.Distance == 100000) { // 100,000 parsecs, 1,000,000 units
                star.x /= dParsecUnits; // galaxy is 300,000 units
                star.y /= dParsecUnits;
                star.z /= dParsecUnits;
            }

            // create the Sprite
            let sprite = new BABYLON.Sprite(name, spriteManagerStars);
            sprite.width = sprite.height = dSpriteScreenSize;

            // set the star position
           setHygPosition(star, sprite.position);

           //if(star.Distance * dParsecUnits < 500) sprite.isVisible = false;

            // make the sprite static
            sprite.stopAnimation();

            // set which area of sprite image to use
            sprite.cellIndex = spriteIndex;

            // make sprite pickable
            sprite.isPickable = true;

            // add some additional properties to the Sprite
            sprite.odist = star.Distance;

            let baseDist = 100; ///////////////////////////////////
            let baseScale = 0.2 ///////////////////////////////////

            if(star.StarID == "11734") { // Polaris
                window.polaris = sprite;
                sprite.size *= 100;
                sprite.lookAt = function (camera) { camera.target = this.position}
            }

            if(star.StarID == "7574") { // Achernar
                window.achernar = sprite;
                sprite.size *= 3;
                sprite.lookAt = function (camera) { camera.target = this.position}
            }

            if(star.StarID == "118441") { // star behind sirius
                sprite.size = 0.001
            }

            if(star.StarID == "32263") { // Sirius
                window.sirius = sprite;
                sprite.size /= 2;
                sprite.lookAt = function (camera) {camera.target = this.position}
            }

            if(star.StarID == "27919") {  // Betelgeuse
                window.betelgeuse = sprite;
                sprite.size *= baseDist * 0.5 * baseScale;
                sprite.lookAt = function (camera) { camera.target = this.position}
            }

            if(star.StarID == "24378") { // Rigel
                window.rigel = sprite;
                sprite.size *= baseDist * 0.75 * baseScale;
                sprite.lookAt = function (camera) { camera.target = this.position}
            }

             // Bellatrix
            if(star.StarID == "25273") { // Bellatrix
                window.bellatrix = sprite;
                sprite.size *= baseDist * 0.2 * baseScale;
                sprite.lookAt = function (camera) { camera.target = this.position}
            }

             // saiph
            if(star.StarID == "27298") { // Saiph
                window.saiph = sprite;
                sprite.size *= baseDist * 0.5 * baseScale;
                sprite.lookAt = function (camera) { camera.target = this.position}
            }

            if(star.StarID == "26662") { // Alnitak, orion belt, left
                window.alnitak = sprite;
                sprite.size *= baseDist * 0.7 * baseScale;
                sprite.lookAt = function (camera) { camera.target = this.position}
                //camera.target = sprite.position;
            }
            if(star.StarID == "26246") { // Alnilam, orion belt, middle
                window.alnilam = sprite;
                sprite.size *= baseDist * 1.6 * baseScale;
                sprite.lookAt = function (camera) { camera.target = this.position}

            }
            if(star.StarID == "25865") { // Mintaka, right
                sprite.size *= baseDist * 0.7 * baseScale;
                window.mintaka = sprite;
                sprite.lookAt = function (camera) { camera.target = this.position}
            }

            if(star.StarID == "5154") { // very distant star, > 30,000 parsecs
                sprite.size *= baseDist * 1;
                window.dc = sprite;
                dc.lookAt = function (camera) { camera.target = this.position}
            }

            //if(star.StarID == "71456") { // alpha centauri
            //if(star.StarID == "57194") {
            //if(star.StarID == '70666') {
            //    console.log("FOUND ALPHA CENTAURI SPRITE, x:"+ sprite.position.x + " y:" + sprite.position.y + " z:" + sprite.position.z)
            //    sprite.size *= 2;
            //    window.sprite =sprite
            //}

            //sprite.setScale( width, height);

        }

        let pos = camera.position;
        let oPos = { x: camera.position.x, y: camera.position.y, z:camera.position.z};

        function update(sprite, cam) {
            let dx = cam.position.x - sprite.position.x,
            dy = cam.position.y - sprite.position.y,
            dz = cam.position.z - sprite.position.z;
            let dist = Math.sqrt(dx*dx + dy*dy + dz*dz);

            // Shim Sprite size at long distances, reduce 1-pixel flickering
            // TODO: this may be screen resolution-dependent!

            if(dist < 10) {
                sprite.width = sprite.height = dSpriteScreenSize;
                // TODO: alpha based on absolute magnitude
            } else {
                sprite.width = sprite.height = dSpriteScreenSize + (dist/600);
                // TODO: alpha based on absolute magnitude
            }

        }

        // update function for sprites
        scene.registerBeforeRender(() => {
            let dx = pos.x - oPos.x,
            dy = pos.y - oPos.y,
            dz = pos.z - oPos.z;
            if((dx + dy + dz) != 0) {
                for(let i = 0; i < 100000; i++) {
                    update(spriteManagerStars.children[i], camera);
                }
            }

        });

    }

    return spriteManagerStars;

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

        // position the space volume
        if(isNumber(data.ra) && isNumber(data.dec)) {

            plutonianScene.setPosition(data, mesh.position, dParsecUnits); 

            console.log(obj.name + " SpaceVolume position x:" + mesh.position.x + " y:" + mesh.position.y + " z:" + mesh.position.z)
            //console.log("PARENT:"  + mesh.position.x + " y:" + mesh.position.y + " z:" + mesh.position.z)

            // create material
            var mat = new BABYLON.StandardMaterial(obj.name + '-mat', scene);

            // space volumes only have color, not a texture
            var color = plutonianScene.getColor(data.color);

            if(color) {
                mat.diffuseColor = color;
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

        ////////////console.log(">>>>>>>>>>>POSITIONING.......")
        //mesh.setPositionWithLocalVector(
        //    new BABYLON.Vector3(Math.cos(B) * Math.cos(A) * dParsecUnits, 
        //        Math.cos(B) * Math.sin(A) * dParsecUnits, 
        //        Math.sin(B) * dParsecUnits
        //    ));


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


/*
    PWorld.prototype.loadPlanetModel = function (pObj, dir, scene, systemDiameter) {

        console.log("------------------------------");
        console.log("drawing planetModel:" + pObj.name)

        let util = this.util;
        let celestial = this.celestial;
        let t = celestial.PCTYPES;
        let mesh = null;

        if(!this.checkObject(pObj)) {
            console.error('loadPlanetModel ERROR: invalid object passed');
            return mesh;
        }

        let data = pObj.data;

        // get the active model
        let model = this.getActiveModel(data.models);

        if(!util.isObject(model)) {
            console.error('loadPlanetModel ERROR: no active model found');
            return mesh;
        }

        // scale raw values to plutonian planetary system units (returnd diameter)

        let scaled = this.celestial.scale(pObj.data);

        // create 'surface' model = just a sphere with 1 texture

        if(util.isString(model.surface)) {

            let texDir = dir + '/textures/';

            console.log(pObj.name + ' texture:' + texDir + model.surface)

            // create the mesh

            mesh = BABYLON.MeshBuilder.CreateSphere(
                pObj.key, {
                    diameter:scaled.diameter, 
                    segments: 32}, scene);

            // exclude from the .godLight (only SpaceVolume)

            this.godLight.excludedMeshes.push(mesh);

            // material

            mesh.material = new BABYLON.StandardMaterial(pObj.key + 'Mat', scene);
            let mat = mesh.material;

            // color
            //const clr = this.getColor(data.color);
            const clr = celestial.color(data);

            // adjust mesh based on object type

            switch(data.type) {

                case t.STAR:
                case t.BROWN_DWARF:
                    //if(parent) data.dist = 0;
                    // TODO: USE BABYLON VECTOR RATHER THAN CUSTOM 'vec'
                    // TODO: objects should rotate around their barycenter, which is
                    // TODO: the center of the SpaceVolume for each StarSystem
                    //this.setPositionByRADec(data, mesh.position, dParsecUnits);


                    if(pObj.key == 'luhman_16_b' || pObj.key == 'luhman_16_a') {
                        console.log("LUHMAN SCALED DISTANCE:" + pObj.name + scaled.dist)
                        mesh.bakeCurrentTransformIntoVertices();
                    }

                    // normals not needed for emissive objects (no shadows)
                    mesh.freezeNormals();

                    // set lighting, texture, color
                    if(model.emissive) {
                        const light = new BABYLON.PointLight(pObj.name + 'Light', mesh.getAbsolutePosition(), scene);
                        light.position = new BABYLON.Vector3(0, 0, 0);
                        // light range, adjust to StarSystem SpaceVolume
                        if(systemDiameter) {
                            console.log('+++++++have systemDiameter:' + systemDiameter)
                            light.range = (systemDiameter * dParsecUnits);
                        } else {
                            console.log('++++++no systemDiameter');
                            light.range = 4 * dParsecUnits; // emissive is always a star scales
                        }
                        // set the parent of the Light to star or brown dwarf
                        light.parent = mesh;
                        // properties for emissive texture
                        mat.emissiveTexture = new BABYLON.Texture(texDir + model.surface, scene, true, false);
                        if(clr) {
                            mat.diffuseColor = clr.clone();
                        } else {
                            mat.diffuseColor = new BABYLON.Color3(1, 1, 1);
                        }
                        mat.specularColor = new BABYLON.Color3(0, 0, 0);

                        //https://doc.babylonjs.com/how_to/glow_layer
                        var options = { 
                            mainTextureRatio: 0.1,
                            //mainTextureFixedSize: 256,
                            blurKernelSize: 100
                        };
                        mat.disableLighting = true;

                        // glow
                        var gl = new BABYLON.GlowLayer('glow', scene, options);
                        gl.intensity = 5;
                        mat.emissiveColor = new BABYLON.Color3(0.678, 0.556, 0.423);
                        // TODO: explore emissive color for glow.
                        //////////////mat.emissiveColor = clr.clone();
                        gl.addIncludedOnlyMesh(mesh);
                    }
                    break;
                case t.EXOPLANET:
                case t.PLANET:
                    // position
                    mesh.setPositionWithLocalVector(new BABYLON.Vector3(scaled.dist, 0, 0));

                    // appearance
                    mat.diffuseTexture = new BABYLON.Texture(texDir + model.surface, scene);
                    mat.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.1);

                    if(util.isNumber(model.specular)) {
                        mat.specularColor = new BABYLON.Color3(model.specular, model.specular, model.specular)
                    } else {
                        mat.specularColor = new BABYLON.Color3(0, 0, 0)
                    }
                    break;

            }

        } else if(model.gltf) {
            
            //load a gltf file

        } else if(model.alias) {

            // load an .alias wavefront file

        }

        // Runs every frame to rotate the sphere
        if(mesh) {

            // BAKING

            // TODO: Axial tilt

            // camera

            // planet rotation
            scene.onBeforeRenderObservable.add(()=>{

                // update stars
                // DOESN'T WORK, WHY? 
                if(pObj.key == 'luhman_16_a' || pObj.key == 'luhman_16_b') {
                    //this.celestial.orrey.computeOrbit(pObj);
                    // try making orbit manually here
                    // NOTE: scaled.dist is being SAVED from creation of these objects!
                    // TODO: eliminate required saving
                    // TODO: not sign, but rotation
                    //console.log("SCALED DISTANCE:" + scaled.dist)
                    mesh.position.x = scaled.dist * Math.sin(this.rot);
                    mesh.position.z = scaled.dist * Math.cos(this.rot);
                    //mesh.position.x = Math.sin(this.rot);
                    //mesh.position.z = Math.cos(this.rot);
                    this.rot += 0.0002*scene.getEngine().getDeltaTime();;

                }

                // baked in rotations for parents and children
                mesh.rotation.y += 0.0001*scene.getEngine().getDeltaTime();
                //mesh.rotation.x += 0.0001*scene.getEngine().getDeltaTime();


            });

        }

        return mesh;

    };
    */

    
    /**
     * Load a Star
     */
    /*
    PWorld.prototype.loadStar = function (pObj, dir, scene, parent, systemDiameter) {

        let util = this.util;

        // draw the star (apart from planets, etc), pass parent (StarSystem) for lighting
        let mesh = this.loadPlanetModel(pObj, dir + '/' + pObj.dname, scene, systemDiameter);

///////////////////////////////////////////////////////////////
        if(pObj.key == 'luhman_16_a') {
                window.luhman_a = mesh;
        }
        if(pObj.key == 'luhman_16_b') {
                window.luhman_b = mesh;
        }
///////////////////////////////////////////////////////////////

        if(mesh) {

            //
            mesh.lookAt = function (camera) { camera.target = this.position}

            // Stars are children to their SpaceVolume

            if(parent) {
                mesh.parent = parent;
            }

            mesh.pObj = pObj;
            pObj.mesh = mesh;

            // create 2D GUI label
            this.ui.createLabel(pObj, scene, false, false);

            // draw the planets, comets, asteroids

            if(util.isArray(pObj.planets)) {
                for(let i = 0; i< pObj.planets.length; i++) {
                    this.loadPlanet(pObj.planets[i], dir + '/' + pObj.dname +  '/planets', scene, mesh);
                }
            }

        }

        return mesh;

    };
    */