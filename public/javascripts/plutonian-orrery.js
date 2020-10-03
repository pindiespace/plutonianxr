/**
 * Contains computations for solar system planetary positions
 */
var POrrery = (function () {

    function POrrery () {

        this.alpha = Math.PI;

    };

    /**
     * begins here
     * https://www.babylonjs-playground.com/#1UGDQC#5
     */
    POrrery.prototype.computeOrbit = function (pObj) {
        let planet = pObj.mesh;
        if (pObj.dist != 0) {

            mesh.setPositionWithLocalVector(new BABYLON.Vector3(scaled.dist, 0, 0));

            planet.position = new BABYLON.Vector3(
            pObj.data.dist * Math.sin(this.alpha), // multiply sin or cos for ellipse
            planet.parent.position.y, 
            pObj.data.dist * Math.cos(this.alpha));
            this.alpha += 0.005;
            //console.log('positioning:' + planet.position.x)
        }

    };

    return POrrery;

}());
