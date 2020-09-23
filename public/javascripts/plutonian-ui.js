
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
            if(e.srcElement.classList.contains('loader-text-fadein')) {
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
    if(loader) {

        loader.classList.add('loader-fadeout'); // must be done in this function
        loader.addEventListener('animationend', (e) => {
            if(e.srcElement.classList.contains('loader-fadeout')) {
                e.srcElement.style.display = 'none';
                e.srcElement.classList.remove('loader-fadeout');
            }
        });

    }

    // otherwise, the generated this._loadingDiv is hidden

    console.log("closing loading UI");
};
