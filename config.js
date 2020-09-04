/**
 * Configuration file
 * Set environment and other variables.
 * Toggle useSSL to turn HTTPS on and off.
 * Note that useSSL requires valid cert and key in the app's ./certs directory.
 * Cookie is to send sameSite attribute in modern browsers.
 *
 * NOTE: for Heroku, turn OFF cookie and useSSL: false
 */

const config = {
    port: 3000,
    useSSL: true,
    portSecure: 443,
    appName: 'Plutonian XR',
    appTagline: 'A WebXR experience built with BabylonJS',
    appSessionName: 'plutonianXR'
}

module.exports = {'config': config }