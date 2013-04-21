const LevelStore     = require('./level-store')
    , genericSession = require('generic-session')

var filter = function (options) {
      var store = LevelStore(options)
        , f = function (req, res, next) {
            req.session = res.session = genericSession(req, res, store, options)
            next()
          }
      f.close = store.close.bind(store)
      return f
    }

module.exports            = filter
module.exports.LevelStore = LevelStore