
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
 * CustomLoadingScreen
 */
/*
var CustomLoadingScreen = (function() {

    let wrapperClass = 'scene-loader-wrapper';
    let dialogClass = 'scene-loader-dialog';

    function CustomLoadingScreen(wClass, dClass) {
        console.log('customLoadingScreen creation')
        this.initDOM();
    };

    CustomLoadingScreen.prototype.initDOM = function () {

        //NOTE: we have to set the DOMElement .style here, or it isn't there in time

        this.sceneLoaderWrapper = document.getElementsByClassName(wrapperClass)[0];
        this.sceneLoaderWrapper.style.display = 'none';

        this.sceneLoaderDialog = document.getElementsByClassName(dialogClass)[0];
        this.sceneLoaderDialog.style.display = 'block';

    };

    CustomLoadingScreen.prototype.displayLoadingUI = function (msg) {

        if(!msg) {
            msg = 'loading...';
        }

        console.log('customLoadingScreen loading')
        this.sceneLoaderDialog.innerHTML = msg;
       // this.sceneLoaderDialog.style.display = 'block';
        this.sceneLoaderWrapper.style.display = 'block';
        alert("bob")
    };

    CustomLoadingScreen.prototype.hideLoadingUI = function () {
        console.log('customLoadingScreen loaded')

        this.sceneLoaderWrapper.style.display = 'none';
        //this.sceneLoaderDialog.style.display = 'none';
    };

    return CustomLoadingScreen;

}());
*/

BABYLON.DefaultLoadingScreen.prototype.displayLoadingUI = function (msg = 'loading') {

    if (document.getElementById('primary-scene-loader-dialog')) {
        // Do not add a loading screen if there is already one
        document.getElementById('primary-scene-loader-dialog').style.display = "block";
        document.getElementById('primary-scene-loader-dialog').innerHTML = msg;
        return;
    }

    this._loadingDiv = document.createElement('div');
    this._loadingDiv.id = 'primary-scene-loader-dialog';
    this._loadingDiv.innerHTML = "<p>scene is currently loading</p>";
    this._loadingDiv.style.color = 'red';

    this._resizeLoadingUI();
    window.addEventListener("resize", this._resizeLoadingUI);
    document.body.appendChild(this._loadingDiv);

};

BABYLON.DefaultLoadingScreen.prototype.hideLoadingUI = function(){
    document.getElementById('primary-scene-loader').style.display = "none";
    document.getElementById('primary-scene-loader-dialog').style.display = 'none';
    console.log("scene is now loaded");
}
