
/**
 * Custom Loader UI
 * https://doc.babylonjs.com/how_to/creating_a_custom_loading_screen
 */
'use strict'
var PUI = (function() {

    // constructor

    function PUI (util) {

        this.util = util;
        this.labels = []; // array of objects

    };

    PUI.prototype.wrapText = function(context, text, x, y, maxWidth, lineHeight) {
        var words = text.split(' ');
        var line = '';
        var numberOfLines = 0;
    
        for (var n = 0; n < words.length; n++) {
            var testLine = line + words[n] + ' ';
            var metrics = context.measureText(testLine);
            var testWidth = metrics.width;
    
            if (testWidth > maxWidth && n > 0) {
                context.fillText(line, x, y);
                line = words[n] + ' ';
                y += lineHeight;
                numberOfLines++;
            }
            else {
                line = testLine;
            }
        }
        context.fillText(line, x, y);
    
        return numberOfLines;
    };

    /**
     * 
     * @param {PObj} pObj labels
     * https://www.babylonjs-playground.com/#7PLYSR#2
     * https://www.babylonjs-playground.com/#UJEIL#2
     * @param {BABYLON.Scene} scene 
     * @param {Boolean} isVisible 
     * @param {Boolean} isPickable 
     */
    PUI.prototype.createMeshLabel = function (pObj, scene, isVisible = true, isPickable = true) {

        // create a dynamic texture, write text to it
        var dynamicTexture = new BABYLON.DynamicTexture('meshLabel', 512, scene, true);
            dynamicTexture.hasAlpha = true;

            var textureContext = dynamicTexture.getContext();
            textureContext.save();
            textureContext.textAlign = "center";
            textureContext.font = "18px Calibri";
        
            var lineHeight = 144;
            var lineWidth = 1000;
            var fontHeight = 72;
            var offset = 5;
        
            var numberOfLines = 1; 
            var textHeight = fontHeight + offset;
            var labelHeight = numberOfLines * lineHeight + (2 * offset);
            textureContext.fillStyle = "white";
            textureContext.fillRect(0, 0, dynamicTexture.getSize().width, labelHeight);
            textureContext.fillStyle = "green";
            textureContext.fillRect(0, labelHeight, dynamicTexture.getSize().width, dynamicTexture.getSize().height);
            textureContext.fillStyle = "black";

            let text = pObj.name;

            this.wrapText(textureContext, text, dynamicTexture.getSize().width / 2, textHeight, lineWidth, lineHeight);
            textureContext.restore();
        
            dynamicTexture.update(false);

            let offsetVector = new BABYLON.Vector3(2, 2, 0);

            // make the mesh
            var label = BABYLON.Mesh.CreatePlane('', 2, scene);
            label.parent = pObj.mesh;
            label.position.x = offsetVector.x;
            label.position.y = offsetVector.y;
            label.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;

            label.material = new BABYLON.StandardMaterial('', scene)
            label.material.emissiveTexture = dynamicTexture;
            label.material.diffuseColor = BABYLON.Color3.Green()


            // draw the lines to the PObj
            var myLines = BABYLON.Mesh.CreateLines(pObj.name + '-label-line', [
                label.position,
                pObj.mesh.position
            ], scene);
            myLines.color = new BABYLON.Color3(1, 0, 0);


    };

    /**
     * Create a label for the object
     */
    PUI.prototype.createGUILabel = function (pObj, scene, isVisible = true, isPickable = true) {

        // GUI
        var advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

        var rect1 = new BABYLON.GUI.Rectangle();
        rect1.width = 0.2;
        rect1.height = "40px";
        rect1.cornerRadius = 20;
        rect1.color = "Orange";
        rect1.thickness = 4;
        rect1.background = "green";
        advancedTexture.addControl(rect1);
        rect1.linkWithMesh(pObj.mesh);   
        rect1.linkOffsetY = -150;

        var label = new BABYLON.GUI.TextBlock();
        label.text = pObj.name;
        rect1.addControl(label);

        var target = new BABYLON.GUI.Ellipse();
        target.width = "20px";
        target.height = "20px";
        target.color = "Orange";
        target.thickness = 4;
        target.background = "green";
        advancedTexture.addControl(target);
        target.linkWithMesh(pObj.mesh);   

        var line = new BABYLON.GUI.Line();
        line.lineWidth = 4;
        line.color = "Orange";
        line.y2 = 20;
        line.linkOffsetY = -10;
        advancedTexture.addControl(line);
        line.linkWithMesh(pObj.mesh); 
        line.connectedControl = rect1; 
    };

    return PUI;

}());

/**
 * Replace the default BabylonJS loading screen with a custom one.
 * Animated loader dialog inspired by:
 * https://codepen.io/Kumaheika/pen/VpEVNW
 */
BABYLON.DefaultLoadingScreen.prototype.displayLoadingUI = function (msg = 'loading') {

    console.log('loading ui started');

    let loaderMsg = document.getElementById('primary-scene-loader-msg');
    if (loaderMsg) {
        let loaderStatus = document.getElementById('primary-scene-loader-status');
        loaderMsg.style.display = "block";
        //loaderMsg.innerHTML = msg;
        loaderStatus.innerHTML = msg;
        loaderMsg.addEventListener('animationend', (e) => {
            if (e.srcElement.classList.contains('loader-text-fadein')) {
                e.srcElement.style.opacity = '1';
            }
        });

        return;
    }

    // if there's no loading screen, make one
    let loader = document.getElementById('primary-scene-loader');

    // fallback
    this._loadingDiv = document.createElement('div');
    this._loadingDiv.id = id;
    this._loadingDiv.innerHTML = "<p>scene is currently loading</p>";
    this._loadingDiv.style.color = 'red';

    this._resizeLoadingUI();
    window.addEventListener("resize", this._resizeLoadingUI);
    document.body.appendChild(this._loadingDiv);

};

/**
 * Hide the loading UI
*/
BABYLON.DefaultLoadingScreen.prototype.hideLoadingUI = function(){

    let loader = document.getElementById('primary-scene-loader');
    if (loader) {

        loader.classList.add('loader-fadeout'); // must be done in this function
        loader.addEventListener('animationend', (e) => {
            if (e.srcElement.classList.contains('loader-fadeout')) {
                e.srcElement.style.display = 'none';
                e.srcElement.classList.remove('loader-fadeout');
            }
        });

    }

    // otherwise, the generated this._loadingDiv is hidden

    console.log("closing loading UI");
};
