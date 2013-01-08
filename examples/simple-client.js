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