
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

function customLoadingScreen(wrapperClass, dialogClass) {
    console.log('customLoadingScreen creation')
    this.sceneLoaderWrapper = window.document.getElementsByClassName(wrapperClass)[0];
    this.sceneLoaderDialog = window.document.getElementsByClassName(dialogClass)[0];
};

customLoadingScreen.prototype.displayLoadingUI = function (msg) {

    if(!msg) {
        msg = 'loading...';
    }

    console.log('customLoadingScreen loading')
    this.sceneLoaderDialog.innerHTML = msg;
};

customLoadingScreen.prototype.hideLoadingUI = function () {
    console.log('customLoadingScreen loaded')
    this.sceneLoaderWrapper.style.display = 'none';
};


