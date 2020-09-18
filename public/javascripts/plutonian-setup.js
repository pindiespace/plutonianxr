/**
 * Setup the engine, with fallbacks if it can't run
 */
'use strict'
var PSetup = (function() {

    // constructor

    function PSetup (util, canvas) {

        this.util   = util;
        this.canvas = this.getCanvas() || null;
        this.engine = null;

        // TODO: initialize engine here

    };

    // functions

    PSetup.prototype.fallbackDOM = function (fallbackMessage) {

        let msg = '';

        if(!fallbackMessage) {
            msg = 'Failed to Initialize HTML5 Canvas. The program cannot run. You need a browser that supports HTML5 Canvas, WebGL, and WebXR';
        } else {
            msg = fallbackMessage;
        }

        // write an epic fail to the HTML page.
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

    };

    PSetup.prototype.fallback2D = function (canvas, fallbackMessage) {

        return canvas;

    };

    /**
     * Get the canvas on the HTML page
     */
    PSetup.prototype.getCanvas = function () {

        // check to see if canvas is already initialized
        if(this.util.isObject(this.canvas)) {
            if(this.canvas.nodeName === 'CANVAS') {
                return this.canvas;
            }
        }

        // no object, so look for expected canvas class.
        let canvas = this.canvas;

        try {

            canvas = document.getElementsByClassName('render-xr-canvas')[0];

        } catch (e) {

            try {

                let b = document.getElementsByTagName('body')[0];
                let s = document.createElement('section');

                // define section wrapper for fullscreen
                s.class = 'render-xr-canvas-wrapper',
                s.style.position = 'absolute',
                s.style.width = '100%',
                s.style.height = '100%',
                s.style.top = '0',
                s.style.bottom = '0'; 

                // define canvas for fullscreen
                canvas = document.createElement('canvas'),
                canvas.id = 'render-canvas',
                canvas.class = 'render.xr-canvas',
                canvas.style.width = '100%',
                canvas.style.height = '100%';

                // append to page
                //s.appendChild('canvas');
                //b.appendChild(section);

            } catch (e) {

                alert('This web browser cannot run HTML5 canvas applications');

            }

        }

        return canvas;
    };

    PSetup.prototype.createDefaultEngine = function () {

        let canvas = this.canvas; // initialized in constructor
        let engine = this.engine = null;

        try {

            // Init BabylonJS
            engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });

            // Resize
            window.addEventListener('resize', function () {
                engine.resize();
            });

        } catch (e) {

            console.error('failed to create default BabylonJS engine');
            var fallback = this.fallback2d(canvas);

        }

        return engine;
    };

    return PSetup;

}());
