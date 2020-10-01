
        let done = false; // flag for complete parsing
    
        let prefix = '', body = '', type = '', lum = '', suffix = '';
        let descType = '', descLum = '', descSuf = '';

        //////////////
        // conditional to print out only some
        /////////////

        let flag = false;
        if(spect.indexOf('O') != -1) flag = true;
        //if(spect == 'k-m') flag = true;

        if(flag) console.log('========')
        if(flag) console.log('spect:' + spect)

        // find the position of the first number (range) without using a regex
        let len = spect.length;
        let p1 = spect.indexOfFirstNumber(), p2, p3; // placeholders and counters
        range = spect[p1];

        if(p1 == 0) {
            if (flag) console.warn(nm + ' invaid, only a single number, no spectral type');
        } 
        else if(p1 == -1) { // number not found
            prefix = spect.substring(0, len);
            range = -1;
        } 
        else { // number found, put into range
            prefix = spect.substring(0, p1);
            range = spect[p1];
            // get longer numbers, e.g. 5.5, avoiding regex, since only numbers and decimals present
            p2 = p1 + 1; // find the end
            while(p2 < len && (spect[p2] == '.') || util.isNumber(spect[p2], true)) {
                range += spect[p2++] + ''; // force as string addition
            }
            if(flag) console.log('found range:' + range)
            body = spect.substring(p2, len); // suffix not defined yet

        }

        // split away a Yerkes luminance before the type
        for (let i in this.dLumPrefixTrans) {
            let l = prefix.indexOf(i);
            if(l != -1) {
                if(flag) console.log('found luminance prefix for:' + spect + ', ' + i)
                lum = this.dLumPrefixTrans[i]; // swap the key
                if(flag) console.log('prefix was:' + prefix)
                prefix = prefix.substring(l + i.length, prefix.length)
                if(flag) console.log('prefix is now:' + prefix + ' range:' + range)
                break;
            }
        }

        // look for the type in the prefix, and strip
        for (let i in this.dStarDesc) {

            if(prefix.indexOf(i) == 0) { // found a type
                type = i;
                descType = this.dStarDesc[i]; 
                if(flag) console.log('found TYPE ' + i + ' in:' + spect)

                // sub-types for white dwarfs
                if (type == 'D') {
                    if(flag) console.log('starting descTpe:' + descType)
                    for (let j in this.dStarWhiteDwarfDesc) {
                        if(prefix.indexOf(j) == 0) {
                            if(flag) console.log('found SUBTYPE ' + j + 'in:' + prefix);
                            type = j;
                            descType = descType + this.dStarWhiteDwarfDesc[j];
                            // for white dwarfs, range is surface temperature
                            range = Math.round(50400 / range);
                            /////prefix = prefix.substring(j.length, prefix.length);
                            body = prefix.substring(j.length)
                            break;
                        }
                    }
                
                } // sub-types for Wolf-Rayet
                else if (type == 'W') {
                    for (let j in this.dStarWolfRayetDesc) {
                        if(prefix.indexOf(j) == 0) {
                            if(flag) console.log('found SUBTYPE ' + j + ' in:' + prefix)
                            type = j;
                            descType += this.dStarWolfRayetDesc[j];
                            //////prefix = prefix.substring(j.length, prefix.length);
                            body = prefix.substring(j.length);
                            break;
                        }

                    }

                } else {
                    prefix = prefix.substring(i.length, prefix.length);
                    if(flag) console.log('assignng prefix substring:' + i.length, "," + prefix.length)
                    ///////body = prefix.substring(i.length, prefix.length)
                }

                break;
            }
        }

        //if(flag) console.log('body after type strip is now:' + body);

        // look for a luminosity in the body, and strip
        if(flag) console.log('starting luminance, prefix:' + prefix + ' body:' + body)

        for (let i in this.dStarLumDesc) {
            if(body.indexOf(i) == 0) {
                if(flag) console.log('found LUM ' + i + ' in:' + spect)
                lum = i;
                descLum = this.dStarLumDesc[i];
                body = body.substring(0, body.length);
                break;
            }
        }

        if(flag) console.log('after lum strip, prefix:' + prefix + ' body:' + body)

        // extract suffix from body up to '-' or '/'
        p1 = 0; p2 = 0; len = body.length;
        while(p1 < len && (body[p1] != '-') && body[p1] != '/') {
            if(body[p1] != ' ') suffix += body[p1] + ''; // force as string addition
            p1++;
        }

        if (flag) console.log('after suffix extract, prefix:' + prefix + ' body:' + body + ' suffix:' + suffix)

        // disambiguate. A RegExp would be easier, but MUCH slower
        let sufArr = [];
        // parse the suffix (may be several)
        if(suffix.length > 0) {
            for (let i in this.dGlobalSuffix) {
                p1 = suffix.indexOf(i); // get position of key in suffix
                if(p1 != -1) { // key found in suffix
                    if(flag) console.log('key:' + i  + ' found at:' + p1)

                    if(i.length == 1) {

                        if (p1 > 0) p2 = suffix[p1 - 1]; else p2 = ''; // left-side character
                        if (p1 < suffix.length - 1) p3 = suffix[p1 + 1]; else p3 = ''; // right-side character

                        if(flag) console.log('left:' + p2 + ' i:' + i + 'right:' + p3)

                        switch(i) { // switch on current character
                            case ':': 
                            case '...': 
                            case '!':
                            case '+': 
                            case 'k':
                            case 'm':
                            case 'q':
                                sufArr.push(i)
                                break;
                            case 'e':
                                if(p3 != ')' && p3 != ']' && p3 != 'r' && p3 != 'q') sufArr.push(i);
                                break;
                            case 'f':
                                if(p3 != '*' && p3 != '+' && p3 != ')' && p3 != '?') sufArr.push(i);
                                break;
                            case 'h':
                                if(p3 != 'a') sufArr.push(i);
                                break;
                            case 'n': // current character 
                                if(p3 != 'n') sufArr.push(i)
                                break;
                            case 'p':
                                if(p3 != '?' && p3 != 'q') sufArr.push(i);
                                break;
                            case 's':
                                if(p3 != 's' && p3 != 'h') sufArr.push(i);
                                break;
                            case 'v':
                                if(p3 != 'a') sufArr.push(i);
                                break;
                            case 'w':
                                if(p3 != 'l' && p3 != 'k') sufArr.push(i);
                                break;
                        }

                    } else {
                        sufArr.push(i);
                    }

                }

            }

        }

        //if(flag) console.log('suffix array:[' + sufArr + ']')
        for (let i = 0; i < sufArr.length; i++) {
            descSuf += this.dGlobalSuffix[sufArr[i]];
        }

        /////////////////////
        // handle hypens

        // look for a '/' or a '-'
        //if(flag) console.log('body is:' + body + ' p2 is:' + p2 + ' char:' + prefix.charAt(p2));
        // should also be first character in body, if a range number was present
        if(!body.length && prefix.indexOf('-') == 1) {
            if(flag) console.log('detected hyphenated ' + spect + ' at:' + prefix.indexOf('-'))
            type = prefix[0].toUpperCase();
            descType = this.dStarDesc[type];
            range = 5; // halfway between

        }
        ////////////////////

        if(flag) console.log('type:' + type + ' range:' + range + ' lum:' + lum);
        // if(flag) console.log('p:' + prefix  + ' b:' + body + ' s:' + suffix);
        if(flag) console.log('suffix array:[' + sufArr + ']')
        //if(flag) console.log('descType:' + descType); // won't work for white dwarf, wolf-rayet
        //if(flag) console.log('descLum:' + descLum);
        //if(flag) console.log('descSuf:' + descSuf)
        
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
// resolve ambiguity for suffix 'nn' versus 'n' or 's' vers 'ss' versus 'sh'

if(suffix.length > p1) {
    p2 = suffix[p1]; // next character to the right, if present
    let ne =')]rq', nf = '*+))?', nh ='a', nn = 'ne', np = 'q', ns = 'sh', 
    nv = 'a', nw = 'lk';
    switch(i) {
        case 'e':
            if(ne.indexOf(p2) == -1) sufArr.push(this.dGlobalSuffix[i]);
            break;
        case 'f':
            if(nf.indexOf(p2) == -1) sufArr.push(this.dGlobalSuffix[i]);
            break;
        case 'h':
            if(nh.indexOf(p2) == -1) sufArr.push(this.dGlobalSuffix[i]);
            break;
        case 'n':
            if(nn.indexOf(p2) == -1) sufArr.push(this.dGlobalSuffix[i]);
            break;
        case 'p':
            if(np.indexOf(p2) == -1) sufArr.push(this.dGlobalSuffix[i]);
            break;
        case 's':
            if(ns.indexOf(p2) == -1) sufArr.push(this.dGlobalSuffix[i]);
            break;
        case 'v':
            if(nv.indexOf(p2) == -1) sufArr.push(this.dGlobalSuffix[i]);
            break;
        case 'w':
            if(nw.indexOf(p2) == -1) sufArr.push(this.dGlobalSuffix[i]);
            break;
        default:
            sufArr.push(this.dGlobalSuffix[i]);
    }


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



