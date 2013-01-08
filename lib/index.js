const LevelStore     = require('./level-store')
    , genericSession = require('generic-session')

var filter = function (options) {
      var store = LevelStore(options)
      return function (req, res, next) {
        req.session = res.session = genericSession(req, res, store, options)
        next()
      }
    }

module.exports            = filter
module.exports.LevelStore = LevelStore