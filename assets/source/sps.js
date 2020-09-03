
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