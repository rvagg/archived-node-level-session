const genericSession = require('generic-session')
    , levelup        = require('levelup')

    , SEP_CHAR       = '|' // session key is Base64 and has a prefix 'session:' so | avoids dups

var LevelStore = {
        get: function (id, key, expire, callback) {
          this._db.get(id + SEP_CHAR + key, function (err, value) {
            this._touch(id, value, callback)
          }.bind(this))
        }

      , getAll: function (id, expire, callback) {
          var ret = {}
          this._forEach(
              id
            , function (key, value) {
                ret[key] = value
              }
            , function () {
                this._touch(id, ret, callback)
              }.bind(this)
          )
        }

      , set: function (id, key, value, expire, callback) {
          this._db.put(id + SEP_CHAR + key, value, function (err) {
            if (err) return callback(err)
            this._touch(id, null, callback)
          }.bind(this))
        }

      , extend: function (id) {
          this._touch(id)
        }

      , del: function (id, key, expire, callback) {
          this._db.del(id + SEP_CHAR + key, function (err) {
            if (err) return callback(err)
            this._touch(id, null, callback)
          }.bind(this))
        }

      , delAll: function (id, callback) {
          var batch = []
          this._forEach(
              id
            , function (key) {
                batch.push({ type: 'del', key: id + SEP_CHAR + key})
              }
            , function () {
                this._db.batch(batch, this._touch(id, null, callback))
              }.bind(this)
          )
        }

      , close: function (callback) {
          this._db.close(callback)
        }

      , _forEach: function (id, fn, callback) {
          var rs = this._db.readStream({ start: id })

          rs.on('data', function (data) {
              var lkey = data.key.split(SEP_CHAR)
              if (lkey[0] == id)
                fn(lkey[1], data.value)
              else if (lkey.length != 2 || lkey[0] > id)
                rs.destroy()
            })
            .on('end', callback)
        }


      , _touch: function (id, ret, callback) {
          this._db.put('expire:' + id, Date.now(), function (err) {
            if (err) return callback(err)
            if (ret) return callback(null, ret)
            callback()
          })
        }
    }

  , create = function (options) {
      if (typeof options == 'string')
        options = { location: options }
      if (!options || typeof options.location != 'string')
        throw new Error('You must provide a `location` option for your LevelDB store')

      var db = levelup(options.location, {
          errorIfExists   : false
        , createIfMissing : true
        , keyEncoding     : 'utf8'
        , valueEncoding   : 'json'
      })

      return Object.create(LevelStore, { _db: { value: db } })
    }

module.exports = create