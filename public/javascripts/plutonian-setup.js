/**
 * Setup the engine, with fallbacks if it can't run
 */
'use strict'
var PSetup = (function() {

    // constructor

    function PSetup (util, canvas) {

        this.util   = util;
        this.canvas = null;
        this.engine = null;

        // TODO: integrate with plutonian-ui.js
        this.CANVAS_ID_DEFAULT = 'primary-xr-canvas';

    };

    // functions

    /**
     * Fallback to DOM error message, if can't run
     */
    PSetup.prototype.fallbackDOM = function (fallbackMessage) {

        let msg = '';

        if(!fallbackMessage) {
            msg = 'Failed to Initialize HTML5 Canvas. The program cannot run. You need a browser that supports HTML5 Canvas, WebGL, and WebXR';
        } else {
            msg = fallbackMessage;
        }

        // write an epic fail to the HTML page.
        var body = document.getElementsByTagName('body')[0];
        var fail = document.createElement('div');
        fail.setAttribute('id', 'fail');
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

    /**
     * Get the canvas on the HTML page
     */
    PSetup.prototype.getCanvas = function (id) {

        let util = this.util;

        // check to see if canvas is already initialized
        if(this.util.isObject(this.canvas)) {
            if(this.canvas.nodeName === 'CANVAS') {
                return this.canvas;
            }
        }

        // no object, so look for expected canvas class.
        let canvas = null;
        if(!id) id = this.CANVAS_ID_DEFAULT;

        try {

            canvas = document.getElementById(id);
            if(!canvas) throw new Error('Bad canvas:' + typeof canvas + ' using ID:' + id);
            this.canvas = canvas;

        } catch (e) {

            console.warn('failed to initialize default BabylonJS Canvas:' + e);

            try {
                console.log('Trying to add an HTML5 canvas to the web page...');

                // create and attach an HTML5Canvas element
                let b = document.getElementsByTagName('body')[0];
                if(!b) throw new Error('HTML missing body element');

                let s = document.createElement('section');
                if(!s) throw new Error('cannot create HTML elements');

                // define section wrapper for fullscreen
                s.class = 'render-xr-canvas-wrapper',
                s.style.position = 'absolute',
                s.style.width = '100%',
                s.style.height = '100%',
                s.style.top = '0',
                s.style.bottom = '0'; 

                // define canvas for fullscreen
                canvas = document.createElement('canvas'),
                canvas.id = 'primary-xr-canvas',
                canvas.class = 'render-xr-canvas',
                canvas.style.width = '100%',
                canvas.style.height = '100%';

                this.canvas = canvas;

                // append to page
                s.appendChild(canvas);
                b.appendChild(s);

            } catch (e) {

                this.fallbackDOM('');

            }

        }

        return canvas;
    };

    PSetup.prototype.createDefaultEngine = function () {

        let engine = null;

        try {

            const canvas = this.getCanvas();

            // Init BabylonJS
            engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
            if(!engine) throw new ERROR('Bad engine:' + typeof engine);

            // Resize
            window.addEventListener('resize', function () {
                engine.resize();
            });

        } catch (e) {

            console.error('failed to create default BabylonJS engine:' + e);
            this.fallbackDOM('failed to create default BabylonJS engine:' + e);

        }

        return engine;
    };

    return PSetup;

}());

