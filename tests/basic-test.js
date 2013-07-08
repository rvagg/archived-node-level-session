const test           = require('tap').test
    , rimraf         = require('rimraf')
    , async          = require('async')
    , levelSession   = require('../')
    , genericSession = require('generic-session')

// stubs
const req   = { headers: {}, connection: { encrypted: false } }
    , res   = { getHeader: function () {}, set: true, setHeader: function () {} }

test('basic operations', function (t) {
  var store   = levelSession.LevelStore('/tmp/level_store_test.db')
    , session = genericSession(req, res, store)

  session.get('foo', function (err, value) {
    t.notOk(err, 'err should be null')
    t.same(value, undefined, 'value should be undefined')

    session.set('foo', 'bar', function (err) {
      t.notOk(err, 'err should be null')

      session.get('foo', function (err, value) {
        t.notOk(err, 'err should be null')
        t.same(value, 'bar', 'foo=bar')

        session.del('foo', function (err) {
          t.notOk(err, 'err should be null')

          session.get('foo', function (err, value) {
            t.notOk(err, 'err should be null')
            t.same(value, undefined, 'value should be undefined')

            store.close(function () {
              rimraf('/tmp/level_store_test.db', t.end.bind(t))
            })
          })
        })
      })
    })
  })
})

test('set many, getAll(), delAll()', function (t) {
  var store   = levelSession.LevelStore('/tmp/level_store_test.db')
    , session = genericSession(req, res, store)

    , queue   = async.queue(function (task, callback) {
        session.set('foo' + task, task, callback)
      }, 20)

  for (var i = 1; i <= 20; i++)
    queue.push(i)

  queue.drain = function (err) {
    t.notOk(err, 'err should be null')

    var queue = async.queue(function (task, callback) {
      session.get('foo' + task, function (err, value) {
        t.notOk(err, 'err should be null')
        t.equal(value, task, 'value should be as expected')
        callback()
      })
    }, 20)

    for (var i = 1; i <= 20; i++)
      queue.push(i)

    queue.drain = function () {
      var queue = async.queue(function (task, callback) {
        session.del('foo' + task, callback)
      }, 20)

      for (var i = 1; i <= 10; i++)
        queue.push(i)

      queue.drain = function (err) {
        t.notOk(err, 'err should be null')

        var queue = async.queue(function (task, callback) {
          session.get('foo' + task, function (err, value) {
            t.notOk(err, 'err should be null')
            if (task <= 10)
              t.same(value, undefined, 'value should be undefined, i.e. deleted')
            else
              t.equal(value, task, 'value should be as expected')
            callback()
          })
        }, 20)

        for (var i = 1; i <= 20; i++)
          queue.push(i)

        queue.drain = function () {
          store.close(function () {
            rimraf('/tmp/level_store_test.db', t.end.bind(t))
          })
        }
      }
    }
  }
})