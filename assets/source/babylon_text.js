
    // THIS WORKS WITH EDGE AND DEFAULT CONTROLLERS
    // WebXR
    const xrDefault = await scene.createDefaultXRExperienceAsync() // WebXRDefaultExperience
    const xrHelper = xrDefault.baseExperience
    
    // *** Interactions ***
    const selectedMeshes = {}

    // POINTERDOWN
    scene.onPointerObservable.add((pointerInfo) => {
        const { pickInfo } = pointerInfo
        const { hit } = pickInfo
        const { pickedMesh } = pickInfo
        if (!hit) return
        if (!pickedMesh) return
        if (!pickedMesh.startInteraction) return
        selectedMeshes[pointerInfo.event.pointerId] = pickedMesh
        if (xrHelper && xrHelper.state === BABYLON.WebXRState.IN_XR) { // XR Mode
            const xrInput = xrDefault.pointerSelection.getXRControllerByPointerId(pointerInfo.event.pointerId)
            if (!xrInput) return
            const motionController = xrInput.motionController
            if (!motionController) return
            pickedMesh.startInteraction(pointerInfo, motionController.rootMesh)
        } else {
            pickedMesh.startInteraction(pointerInfo, scene.activeCamera)
        }
    }, BABYLON.PointerEventTypes.POINTERDOWN)

    // POINTERMOVE
    scene.onPointerObservable.add((pointerInfo) => {
        const pickedMesh = selectedMeshes[pointerInfo.event.pointerId]
        if (pickedMesh && pickedMesh.moveInteraction) {
            pickedMesh.moveInteraction(pointerInfo)
        }
    }, BABYLON.PointerEventTypes.POINTERMOVE)

    // POINTERUP
    scene.onPointerObservable.add((pointerInfo) => {
        const pickedMesh = selectedMeshes[pointerInfo.event.pointerId]
        if (pickedMesh) {
            if (pickedMesh.endInteraction) {
                pickedMesh.endInteraction(pointerInfo)
            }
            delete selectedMeshes[pointerInfo.event.pointerId]
        }
    }, BABYLON.PointerEventTypes.POINTERUP)




/////////////////////////////////////////////////////////////////
class Playground { 
    public static CreateScene(engine: BABYLON.Engine, canvas: HTMLCanvasElement): BABYLON.Scene {
        // This creates a basic Babylon Scene object (non-mesh)
        var scene = new BABYLON.Scene(engine);

        // This creates and positions a free camera (non-mesh)
        var camera = new BABYLON.FreeCamera("camera1", new BABYLON.Vector3(0, 5, -10), scene);

        // This targets the camera to scene origin
        camera.setTarget(BABYLON.Vector3.Zero());

        // This attaches the camera to the canvas
        camera.attachControl(canvas, true);

        // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
        var light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, 1, 0), scene);

        // Default intensity is 1. Let's dim the light a small amount
        light.intensity = 0.7;

        // GUI
        var advancedTexture:BABYLON.GUI.AdvancedDynamicTexture  = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

        var text1: MixedTextBlock = new MixedTextBlock();
      
        text1.multiTextArgs = [
            {text: "I’m sorry, ", fillStyle: "white", font: "italic 20px Helvetica"},
            {text: "\nDave. ", fillStyle: "red", font: "italic 20px Helvetica"},
            { text: '\nI’m ' },
            { text: '\nafraid ', font: 'italic 20px Helvetica' },
            { text: '\nI can’t do that.' }
            ];


        text1.fontSize = 24;
        advancedTexture.addControl(text1);    


        return scene;
    }

}

class MixedTextBlock extends BABYLON.GUI.TextBlock {

     private _multiTextArgs: [{text?: string, fillStyle?: string, font?: string}];
      set multiTextArgs(value: [{text?: string, fillStyle?: string, font?: string}]) {
        this._multiTextArgs = value;
    }


      private _drawText(itemNumber: number, textWidth: number, y: number, context: CanvasRenderingContext2D): void {
        var width = this._currentMeasure.width;
        var x = 0;
        switch (this._textHorizontalAlignment) {
            case BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT:
                x = 0;
                break;
            case BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT:
                x = width - textWidth;
                break;
            case BABYLON.GUI. Control.HORIZONTAL_ALIGNMENT_CENTER:
                x = (width - textWidth) / 2;
                break;
        }

        if (this.shadowBlur || this.shadowOffsetX || this.shadowOffsetY) {
            context.shadowColor = this.shadowColor;
            context.shadowBlur = this.shadowBlur;
            context.shadowOffsetX = this.shadowOffsetX;
            context.shadowOffsetY = this.shadowOffsetY;
        }

        if (this.outlineWidth) {
            context.strokeText(text, this._currentMeasure.left + x, y);
        }

        //the old FillText that we replaced with the new method
        //context.fillText(text, this._currentMeasure.left + x, y);

        //draw a single text linke with text,fillstyle and fon -> itemNumber comes from the "_renderLines"-method !
        this._fillMixedTextLine(context, this._multiTextArgs[itemNumber] ,this._currentMeasure.left + x, y );
        
    }

    /**
     * HTML5 Canvas: Fill Mixed Text
     * context: CanvasRenderingContext2D
     * args: { text: string, fillStyle?: string, font?: string }
     * x: number
     * y: number
     */
    private _fillMixedTextLine(context: CanvasRenderingContext2D, args: {text?: string, fillStyle?: string, font?: string}, x: number, y: number): void {

        let defaultFillStyle = context.fillStyle;
        let defaultFont = context.font;

        context.save();

        context.fillStyle = args.fillStyle || defaultFillStyle;
        context.font = args.font || defaultFont;
        context.fillText(args.text, x, y);
        x += context.measureText(args.text).width;

        context.restore();

    }


    protected _breakLines(refWidth: number, context: CanvasRenderingContext2D): object[] {
        var lines = [];

        //we concat the whole text 
        var concatedText: string = "";
        this._multiTextArgs.forEach(({ text, fillStyle, font }) => {
                concatedText = concatedText.concat(text);
            });

        //via split we separate the text in multiple lines
        var _lines = concatedText.split("\n");
       

        if (this._textWrapping === BABYLON.GUI.TextWrapping.Ellipsis) {
            for (var _line of _lines) {
                lines.push(this._parseLineEllipsis(_line, refWidth, context));
            }
        } else if (this._textWrapping === BABYLON.GUI.TextWrapping.WordWrap) {
            for (var _line of _lines) {
                lines.push(...this._parseLineWordWrap(_line, refWidth, context));
            }
        } else {
            for (var _line of _lines) {
                lines.push(this._parseLine(_line, context));
            }
        }

        return lines;

    }

 protected _renderLines(context: CanvasRenderingContext2D): void {
        var height = this._currentMeasure.height;
        var rootY = 0;
        switch (this._textVerticalAlignment) {
            case  BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP:
                rootY = this._fontOffset.ascent;
                break;
            case  BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM:
                rootY = height - this._fontOffset.height * (this._lines.length - 1) - this._fontOffset.descent;
                break;
            case  BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER:
                rootY = this._fontOffset.ascent + (height - this._fontOffset.height * this._lines.length) / 2;
                break;
        }

        rootY += this._currentMeasure.top;

        for (let i = 0; i < this._lines.length; i++) {
            const line = this._lines[i];

            if (i !== 0 && this._lineSpacing.internalValue !== 0) {

                if (this._lineSpacing.isPixel) {
                    rootY += this._lineSpacing.getValue(this._host);
                } else {
                    rootY = rootY + (this._lineSpacing.getValue(this._host) * this._height.getValueInPixel(this._host, this._cachedParentMeasure.height));
                }
            }


           // this._drawText(line.text, line.width, rootY, context);

            // counter variable "i" represents a line -> one itemfield in our " this._multiTextArgs"
            this._drawText(i, line.width, rootY, context);
  
            rootY += this._fontOffset.height;
        }
    }

}//end MixedTextBlock-class



