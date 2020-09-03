/**
 * Configuration file
 * Set environment and other variables.
 * Toggle useSSL to turn HTTPS on and off.
 * Note that useSSL requires valid cert and key in the app's ./certs directory.
 * Cookie is to send sameSite attribute in modern browsers.
 */

const config = {
    port: 3000,
    useSSL: false,
    portSecure: 443,
    appName: 'Plutonian XR',
    appTagline: 'A WebXR experience built with BabylonJS',
    appSessionName: 'plutonianXR'
}

module.exports = {'config': config }