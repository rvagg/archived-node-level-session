var http           = require('http')
  , levelSession   = require('../')('/tmp/level_session_example.db')
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
