/**
 * TEST RUNNER
 * The suggested AVA + Got seems to work best
 * AVA and Got
 * https://www.npmjs.com/package/got
 * Snippets
 * https://www.codota.com/code/javascript/modules/got
 */

// http server
const http = require('http');
const app = require('../bin/www');

// headless client
const got = require('got');
const listen = require('test-listen');

// test runner
const test = require('ava');

// Test server endpoints

// get the server and its port number in prefixURL
test.before(async t => {
	t.context.server = http.createServer(app);
	t.context.prefixUrl = await listen(t.context.server);
	console.log("Test Server URL (t.context.prefixURL) at:" + t.context.prefixUrl);
});


// close the server
test.after.always(t => {
	t.context.server.close();
});


test.serial('get /message', async t => {
try {

        //local server default page
        const response = await got('', {prefixUrl: t.context.prefixUrl});

        // JSON example
        //const response = await got('message', {prefixUrl: t.context.prefixUrl});

        // Remote server
        //const response = await got('https://sindresorhus.com');
        
        var len = response.body.length;
        console.log("PREFIXURL:" + t.context.prefixUrl )
        console.log("RESPONSE:" + response);
        console.log("RESPONSE STATUS CODE:" + response.statusCode);
        console.log("RESPONSE URL:" + response.url)
        console.log("RESPONSE BODY LENGTH IS:" + len)
        console.log("RESPONSE BODY IS:" + response.body)

        //t.true(len > 0);
        //t.true(response.statusCode == 200);
        t.is(response.statusCode, 200);

/*
        try {
        	JSON.parse(response.body);
        	t.pass();
        } catch(error) {
        	t.fail();
        }
*/

        // head
        //console.log("RESPONSE HEAD:" + response.headers)
        //for (var i in response.headers)
        //console.log("header " + i + " val:" + response.headers[i])

        //t.pass();
        //=> '<!doctype html> ...'
    } catch (error) {
        console.log("ERROR STRING:" + error.response.body);
        t.fail();
        //=> 'Internal server error ...'
    }
});




test('foo', t => {
	t.pass();
});

test('bar', async t => {
	const bar = Promise.resolve('bar');
	t.is(await bar, 'bar');
});