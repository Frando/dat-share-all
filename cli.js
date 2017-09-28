#!/usr/bin/env node

var path      = require('path')
var fs        = require('fs')
var args      = require('minimist')(process.argv.slice(2))
var neatlog   = require('neat-log')
var Dat       = require('dat-node')
var stringKey = require('dat-encoding').toStr
var xtend     = require('xtend')
var glob      = require('glob')

if (args.help) {
  var help = `Usage: dat-share-all [options] [--dir=<dir>]

Share all dats that are located below a directory.

Options:
    --import     Import file changes in writable dats (default: false).
    --watch      Watch for file changes in writable dats and import (default: false).
    --watchdir   Watch for new dats being added and share them (default: false).
    --dir=<dir>  Set the dir from which to look for dats (default: current dir).
    --port       Set port (default: 3282)
    --neat       Simple list UI (WIP, not working correctly for many dats).
`
  console.log(help)
  process.exit(0)
}

var defaultOpts = {
  showKey: true,
  createIfMissing: false,
  exit: false,
  port: args.port || 3282,
  utp: true,
  quiet: false,
  watch: !!args.watch,
  import: !!args.import
}

var ui, neat
if (args.neat) {
  ui = require('./ui-neat')
  neat = neatlog(ui, {})
}
else {
  ui = require('./ui-blessed')
  neat = neatlog(ui, {})
}

neat.use(init)
neat.use(archive)
neat.use(wait)

if (args.watchdir) {
  var chokidar  = require('chokidar')
  setInterval(function() {
    neat.use(watchdir)
  }, 5000)
}

neat.render()

function init(state, bus) {
  state.dats = {}
  state.errors = []
  state.debug = []
  state.exit = false
  state.paths = []
  state.basepath = path.resolve(args.dir || process.cwd())

  var globOpts = {absolute: true, cwd: state.basepath, strict: false, silent: true}
  try {
    glob("**/.dat", globOpts, function(err, paths) {
      if (err || !paths) return
      paths.forEach(function(datpath) {
        var parent = path.dirname(datpath)
        if (state.paths.indexOf(datpath) === -1 && fs.lstatSync(datpath).isDirectory()) {
          state.paths.push(datpath)
          bus.emit('datpath', parent)
        }
      })
    })
  }
  catch(e) {
    // Todo: Error handling.
  }

  bus.on('datpath', function(datpath) {
    var name = path.basename(datpath)
    var opts = xtend(defaultOpts, {dir: datpath})
    Dat(opts.dir, opts, function (err, dat) {
      if (err && err.name === 'MissingError') {
        state.errors.push({name: name, message: 'Not a dat.'})
      }
      else if (err) {
        state.errors.push({name: name, message: err.message, err: err})
      }
      else {
        dat.archive.on('update', function () {
          bus.render()
        })
        var stats = dat.trackStats()
        stats.on('update', function () {
          bus.render()
        })

        // import?
        var progress = false
        var doImport = false
        if (opts.import && dat.writable) {
          doImport = true
          progress = dat.importFiles(opts, function (err) {
          })
        }

        var datState = {name: name, path: datpath, dat: dat, stats: stats, opts: opts, key: stringKey(dat.key), import: doImport, progress: progress}
        state.dats[datState.key] = datState
        bus.emit('dat', datState)

      }
      bus.render()
    })
  })
}

function watchdir(state, bus) {
  var watcher = chokidar.watch(state.basepath + '/**/.dat')
  watcher.on('addDir', function(datpath) {
    if (state.paths.indexOf(datpath) === -1 && fs.lstatSync(datpath).isDirectory()) {
      state.debug.push('Add path: ' + datpath)
      state.paths.push(datpath)
      bus.emit('datpath', path.dirname(datpath))
    }
  })
}

function wait (state, bus) {
  // Ensure no exit and rerender every second.
  setInterval(function () {
    if (!state.exit) {
      bus.render()
    }
  }, 1000)
}

function archive (state, bus) {
  function setTitle(key) {
    fs.readFile(path.join(state.dats[key].path, 'dat.json'), function (err, data) {
      if (err) state.dats[key].title = ''
      try {
        var datJson = JSON.parse(data)
        if (datJson.title) {
          state.dats[key].title = datJson.title
        }
      }
      catch (e) {}
    })
  }
  bus.on('dat', function (datState) {
    var dat = datState.dat
    var key = datState.key
    setTitle(key)
    var network = dat.joinNetwork(datState.opts, function () {

    })
    state.dats[key].sources = state.dats[key].sources || {}
    bus.render()
    network.on('connection', function (conn, info) {
      // todo: connection details.
    })
    dat.archive.on('update', function() {
      state.dats[key].updated = true
      setTitle(key)
      bus.render()
    })
  })
}

