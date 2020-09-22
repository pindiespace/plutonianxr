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
    portSecure: 443,
    useSSL: true, // off for heroku
    useCookie: true,  // off for heroku
    appName: 'Plutonian XR',
    appTagline: 'A WebXR experience built with BabylonJS',
    appSessionName: 'plutonianXR'
}

module.exports = {'config': config }