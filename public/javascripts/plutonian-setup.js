/**
 * Set up Babylon and make default scene, fallback screens.
 * @param{String} fallbackMessage error message for fail.
 */

var fallbackDOM = function(fallbackMessage) {

    var msg = '';

    if(!fallbackMessage) {
        msg = 'Failed to Initialize HTML5 Canvas. The program cannot run. You need a browser that supports HTML5 Canvas, WebGL, and WebXR';
    } else {
        msg = fallbackMessage;
    }

    // write an epic fail.
    var body = document.getElementsByTagName('body')[0];
    fail = document.createElement('div');
    fail.setAttribute('id', 'fail');
    //fail.style.display = 'table-cell;';
    fail.style.position = 'absolute';
    fail.style.width = '400px';
    fail.style.height = '100px';
    fail.style.top  = ((window.innerHeight/2) - parseInt(fail.style.height)/2) + 'px';
    fail.style.left = ((window.innerWidth/2) - parseInt(fail.style.width)/2) + 'px';
    fail.style.padding = '4px 10px 10px 4px';
    fail.style.borderRadius = '4px';
    fail.style.display = 'flex';
    fail.style.margin = 'auto';
    fail.style.alignItems = 'center';
    fail.style.justifyContent = 'center';
    fail.style.textAlign = 'center';
    fail.style.border = '1px solid white';
    fail.style.zIndex = 1000;
    fail.style.backgroundColor = 'rgba(255,255,255, 0.8)';

    //put on screen
    fail.innerHTML = '<p>' + msg + '</p>';
    body.appendChild(fail);

}

// Default scene if BabylonJS fails...
var fallback2d = function(canvas, fallbackMessage) {

    var msg = '';
    if(!fallbackMessage) {
        msg = 'BabylonJS not supported in browser';
    } else {
        msg = fallbackMessage;
    }

    try {
        var scale = window.devicePixelRatio; // scale canvas drawing correctly for device
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        var ctx = canvas.getContext('2d');
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        ctx.textBaseline = 'middle';
        ctx.font = '24px sans-serif';
        ctx.fillStyle = 'white';
        textWidth = ctx.measureText(msg).width;
        ctx.fillText(msg, (canvas.width/2) - (textWidth/2), canvas.height/2);

    } catch (e) {

        console.error('failed to initialize canvas object');
        var failDOM = new fallbackDOM();

    }
    
}

// Connect Babylon to rendering canvas

var createDefaultEngine = function(canvas) { 
    var engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });

    /**
     * Init the engine and scene
     */
    try {

        // Resize
        window.addEventListener('resize', function () {
            engine.resize();
        });

    } catch (e) {

        console.error('failed to create default BabylonJS engine');
        var fallback = new fallback2d(canvas);

    }

    return engine;
};
