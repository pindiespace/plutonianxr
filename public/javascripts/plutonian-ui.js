
/**
 * Custom Loader UI
 * https://doc.babylonjs.com/how_to/creating_a_custom_loading_screen
 */
'use strict'
var PUI = (function() {

    // constructor

    function PUI (util) {

        this.util = util;

    };

    /**
     * Create a label for the object
     */
    PUI.prototype.createLabel = function (pObj, scene, isVisible = true, isPickable = true) {

        return;
        /////////////////////////
        console.log("POBJ.mesh is:" + pObj.mesh)
        console.log("POSITION IS:" + mesh.position)
        var rect = new BABYLON.GUI.Rectangle();
        if(!isVisible) rect.isVisible = false;
        if(!isPickable) rect.isHitTestVisible = false;

        // .isVisible true, false
        // .isFocusInvisible
        // .isHitTestVisible (toggle mesh picking)
        rect.width = "150px";
        rect.height = "40px";
        rect.color = "rgba(255,255,255,0.37)";
        rect.thickness = 0;
        rect.background = "transparent";
        scene.gui.addControl(rect);
        var label = new BABYLON.GUI.TextBlock();
        label.text = pObj.name;
        rect.addControl(label);
        rect.linkWithMesh(pObj.mesh);
        rect.linkOffsetY = -80;
    };

    return PUI;

}());

/**
 * Replace the default BabylonJS loading screen with a custom one.
 * Animate background fade with:
 * https://codepen.io/SemperLabs/pen/XOeQNm
 * Animated loader dialog circular
 * https://codepen.io/Kumaheika/pen/VpEVNW
 */

BABYLON.DefaultLoadingScreen.prototype.displayLoadingUI = function (msg = 'loading') {

    console.log('loading ui started');

    let loaderMsg = document.getElementById('primary-scene-loader-msg');
    if (loaderMsg) {
        // Do not add a loading screen if there is already one
        loaderMsg.style.display = "block";
        loaderMsg.innerHTML = msg;
        return;
    }

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

BABYLON.DefaultLoadingScreen.prototype.hideLoadingUI = function(){

    let loader = document.getElementById('primary-scene-loader');

    loader.classList.add('loader-fadeout');

    window.loader = loader;

    // NOTE: This has to be done here, not in the showLoadingUI function!!

    loader.addEventListener('animationend', () => {
        loader.style.display = 'none';
        loader.classList.remove('loader-fadeout');
    });

    console.log("closing loading UI");
};
