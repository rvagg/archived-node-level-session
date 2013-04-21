const genericSession = require('generic-session')
    , levelup        = require('levelup')
    , ttl            = require('level-ttl')
    , xtend          = require('xtend')

    , SEP_CHAR       = '|' // session key is Base64 and has a prefix 'session:' so | avoids dups
    , LUP_OPTIONS    = { keyEncoding: 'utf8', valueEncoding: 'utf8' }

  , dbkey      = function (id, key) {
      return id + SEP_CHAR + key
    }

var LevelStore = {
        get: function (id, key, expire, callback) {
          // brutish but it updates ttl on all entries
          this.getAll(id, expire, function (err, data) {
            if (err) return callback(err)
            callback(null, data[key])
          })
        }

      , getAll: function (id, expire, callback) {
          var ret   = {}
            , batch = []

          this._forEach(
              id
            , function (key, value) {
                ret[key] = JSON.parse(value)
                batch.push({ type: 'put', key: dbkey(id, key), value: value })
              }
            , function () {
                // put them back for the ttl update
                this._db.batch(
                    batch
                  , xtend(LUP_OPTIONS, { ttl: expire })
                  , function (err) {
                      if (err) return callback(err)
                      callback(null, ret)
                    }
                )
              }.bind(this)
          )
        }

      , set: function (id, key, value, expire, callback) {
          this.extend(id, expire)
          this._db.put(
              dbkey(id, key)
            , JSON.stringify(value)
            , xtend(LUP_OPTIONS, { ttl: expire })
            , callback
          )
        }

      , extend: function (id, expire) {
          this.getAll(id, expire, function () {})
        }

      , del: function (id, key, expire, callback) {
          this.extend(id, expire)
          this._db.del(
              dbkey(id, key)
            , LUP_OPTIONS
            , function (err) {
                if (err) return callback(err)
                this.extend(id, expire)
                callback()
              }.bind(this)
          )
        }

      , delAll: function (id, callback) {
          var batch = []
          this._forEach(
              id
            , function (key) {
                batch.push({ type: 'del', key: dbkey(id, key) })
              }
            , function () {
                this._db.batch(batch, LUP_OPTIONS, callback)
              }.bind(this)
          )
        }

      , close: function (callback) {
          this._db.close(callback)
        }

      , _forEach: function (id, fn, callback) {
          var rs = this._db.readStream(xtend(LUP_OPTIONS, { start: id }))

          rs.on('data', function (data) {
              var lkey = data.key.split(SEP_CHAR)
              if (lkey[0] == id)
                fn(lkey[1], data.value)
              else if (lkey.length != 2 || lkey[0] > id)
                rs.destroy()
            })
            .on('end', callback)
        }
    }

  , create = function (options) {
      if (typeof options == 'string')
        options = { location: options }

      if (!options || (typeof options.location != 'string' && typeof options.db != 'object'))
        throw new Error('You must provide a `location` option for your LevelDB store or a LevelUP `db` instance')

      var db = options.db || levelup(options.location, {
              errorIfExists   : false
            , createIfMissing : true
            , keyEncoding     : 'utf8'
            , valueEncoding   : 'utf8'
          })
        , close

      db = ttl(db)
      close = db.close.bind(db)
      db = db.sublevel('session')
      db.close = close // close() unimplemented in level-sublevel

      return Object.create(LevelStore, { _db: { value: db } })
    }

module.exports = create