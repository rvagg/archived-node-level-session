# Level Session [![Build Status](https://secure.travis-ci.org/rvagg/node-level-session.png)](http://travis-ci.org/rvagg/node-level-session)

![LevelDB Logo](https://twimg0-a.akamaihd.net/profile_images/3360574989/92fc472928b444980408147e5e5db2fa_bigger.png)

A framework-agnostic, LevelDB-backed session manager for Node.js web servers. Provides very fast session data storage that persists across server restarts.

**Compatible with Connect / Express middleware.**

Backed by [Generic Session](https://github.com/rvagg/node-generic-session), the flexible session manager, Level Session gives you simple and speedy entry-level session management that allows you to scale when ready by switching the storage back-end of Generic Session to a more appropriate solution such as Redis.

A LevelDB store can only be accessed by one process at a time so Level Session is not ideal for multi-process deployments unless you're passing in a [multilevel](https://github.com/juliangruber/multilevel) instance as your `'db'`.

Level Session uses [LevelUP](https://github.com/rvagg/node-levelup) for LevelDB access in Node.js, you must either install **levelup** or **level** from npm for Level Session to work; it is not loaded as a dependency.

## Example

```js
// server.js
var http           = require('http')
  , levelSession   = require('level-session')('/tmp/level_session_example.db')
  , port           = 8080

http.createServer(function (req, res) {
  levelSession(req, res, function () {
    var m

    res.writeHead(200)

    if (m = req.url.match(/^\/get\/(.+)/)) {
      return req.session.get(m[1], function (err, data) {
        res.end(JSON.stringify(data))
      })
    } else if (m = req.url.match(/^\/set\/([^\/]+)\/(.+)/)) {
      return req.session.set(m[1], m[2], function () {
        res.end(JSON.stringify(m[2]))
      })
    }

    res.end('ERROR')
  })
}).listen(port)
```

```js
// client.js
var request = require('request')
  , jar     = request.jar()
  , port    = 8080

  , req     = function(url, cb) {
      request({
          url: 'http://localhost:' + port + '/' + url
        , jar: jar
        , json: true
      }, cb)
    }

req('set/foo/bar', function () {
  console.log('Set foo = bar')
  req('get/foo', function (e, res, body) {
    console.log('Fetched foo =', body)
  })
})
```

Running the two processes, we'll get:

```sh
$ node server.js &
$ node client.js
Set foo = bar
Fetched foo = bar
```

This example is available in the *examples/* directory.

## API

### levelSession(options | location)

Will create a new `LevelSession` instance, including an open LevelDB instance. You must provide a location for the LevelDB store, either as a `String` or on an `options` object with the property `'location'`. Alternatively you can provide an existing (open), LevelUP instance with the `'db'` property. Level Session can coexist with other uses of the same LevelUP by using [level-sublevel](https://github.com/dominictarr/level-sublevel) to operate in a *"session"* namespace.

The returned object can be used as a stand-alone filter or as a Connect / Express middleware.

Any additional options you provide on an `options` object will be passed on to [Generic Session](https://github.com/rvagg/node-generic-session), these options include:

#### Options:

 * `keys` (optional): either an `Array` of strings constituting your signing secret keys to be passed to a new instance of *Keygrip*, or you can pass in an instance of **Keygrip directly. If you pass in a `keys` instance, Keygrip must be installed.
 * `cookies` (optional): provide an instance of Cookies or a compatible cookie manager to use to manage cookies.
 * `expire` (optional, default: 2 weeks): number of seconds to set for the session cookie expiry.
 * `cookieName` (optional, default: `'s'`): the name of the session cookie.

A `LevelSession` instance can be used as a filter / middleware in a Node.js server, invoke it as a function with the arguments: HTTP server `request`, HTTP server `response` and a `next` callback function to be called when LevelSession is finished. You will get a `session` object attached both `request` and `response`.

#### close()

Each `LevelSession` instance has a `close()` method that can be used to finalise and close all resources.

-------------------------

### levelSession.LevelStore(options | location)

Use this to create a `LevelStore` instance that can be used directly with [Generic Session](https://github.com/rvagg/node-generic-session) as the `store` property. This provides the flexibility to invoke the session manager in the most appropriate way for your application.

## Session API

### session.get(key[, callback])
Get the object stored as `key` for the current session in the session store. Automatically updates the expires time for this session.

If the `callback` is not provided then it will simply perform an expiry time update. If you just provide a `callback` and no `key` then it operates as an alias for `getAll()`.

-------------------------

### session.getAll(callback)
Get all objects stored for the current session in the session store. Automatically updates the expires time for this session.

If the `callback` is not provided then it will simply perform an expiry time update.

-------------------------

### session.set(key[, value][, callback])
Sets `value` as `key` for the current session in the session store. Automatically updates the expires time for this session.

If `value` is omitted then `key` will be set to `null`. `callback` may be omitted and the operation will still be performed.

-------------------------

### session.del(key[, callback])
Deletes the property `key` from the current session in the session store. Automatically updates the expires time for this session.

If `key` is omitted then it operates as an alias for `delAll()` (beware!). `callback` may be omitted and the operation will still be performed.

-------------------------

### session.delAll([callback])
Deletes all data for the current session in the session store.

`callback` may be omitted and the operation will still be performed.

-------------------------

### session.destroy([callback])
Deletes all data for the current session in the session store and will also remove the session cookie from the client.

`callback` may be omitted and the operation will still be performed.

-------------------------

## Licence

Level Session is Copyright (c) 2012 Rod Vagg [@rvagg](https://twitter.com/rvagg) and licenced under the MIT licence. All rights not explicitly granted in the MIT license are reserved. See the included LICENSE file for more details.
