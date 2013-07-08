const genericSession = require('generic-session')
    , ttl            = require('level-ttl')
    , sublevel       = require('level-sublevel')
    , xtend          = require('xtend')

    , SEP_CHAR       = '|' // session key is Base64 and has a prefix 'session:' so | avoids dups
    , LUP_OPTIONS    = { keyEncoding: 'utf8', valueEncoding: 'utf8' }


function loadLevel() {
  try {
    return require('level')
  } catch (e) {
    try {
      return require('levelup')
    } catch (e) {
      throw new Error('You must install either `level` or `levelup`')
    }
  }
}

function dbkey (id, key) {
  return id + SEP_CHAR + key
}

function LevelStore (options) {
  if (!(this instanceof LevelStore))
    return new LevelStore(options)

  if (typeof options == 'string')
    options = { location: options }

  if (!options || (typeof options.location != 'string' && typeof options.db != 'object'))
    throw new Error('You must provide a `location` option for your LevelDB store or a LevelUP `db` instance')

  this._db = options.db || loadLevel()(options.location, {
      errorIfExists   : false
    , createIfMissing : true
    , keyEncoding     : 'utf8'
    , valueEncoding   : 'utf8'
  })

  this._db = sublevel(this._db)
  this._db = ttl(this._db)
  this._sessionDb = this._db.sublevel('session')
}

LevelStore.prototype.get = function (id, key, expire, callback) {
  // brutish but it updates ttl on all entries
  this.getAll(id, expire, function (err, data) {
    if (err) return callback(err)
    callback(null, data[key])
  })
}

LevelStore.prototype.getAll = function (id, expire, callback) {
  var ret   = {}
    , keys = []

  this._forEach(
      id
    , function (key, value) {
        ret[key] = JSON.parse(value)
        keys.push(dbkey(id, key))
      }
    , function () {
        // update the ttl value for each key
        this._db.ttl(
            keys
          , expire
          , function (err) {
              if (err) return callback(err)
              callback(null, ret)
            }
        )
      }.bind(this)
  )
}

LevelStore.prototype.set = function (id, key, value, expire, callback) {
  this.extend(id, expire, function () {
    this._sessionDb.put(
        dbkey(id, key)
      , JSON.stringify(value)
      , xtend(LUP_OPTIONS, { ttl: expire })
      , callback
    )
  }.bind(this))
}

LevelStore.prototype.extend = function (id, expire, callback) {
  this.getAll(id, expire, function (err) { callback && callback(err) })
}

LevelStore.prototype.del = function (id, key, expire, callback) {
  this.extend(id, expire, function () {
    this._sessionDb.del(
        dbkey(id, key)
      , LUP_OPTIONS
      , function (err) {
          if (err) return callback(err)
          this.extend(id, expire, callback)
        }.bind(this)
    )
  }.bind(this))
}

LevelStore.prototype.delAll = function (id, callback) {
  var batch = []
  this._forEach(
      id
    , function (key) {
        batch.push({ type: 'del', key: dbkey(id, key) })
      }
    , function () {
        this._sessionDb.batch(batch, LUP_OPTIONS, callback)
      }.bind(this)
  )
}

LevelStore.prototype.close = function (callback) {
  this._db.close(callback)
}

LevelStore.prototype._forEach = function (id, fn, callback) {
  var rs = this._sessionDb.readStream(xtend(LUP_OPTIONS, { start: id }))

  rs.on('data', function (data) {
      var lkey = data.key.split(SEP_CHAR)
      if (lkey[0] == id)
        fn(lkey[1], data.value)
      else if (lkey.length != 2 || lkey[0] > id)
        rs.destroy()
    })
    .on('end', callback)
}

module.exports = LevelStore