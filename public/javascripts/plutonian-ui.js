
/**
 * Custom Loader UI
 * https://doc.babylonjs.com/how_to/creating_a_custom_loading_screen
 */

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


