#!/usr/bin/env node

var path      = require('path')
var fs        = require('fs')
var args      = require('minimist')(process.argv.slice(2))
var neatlog   = require('neat-log')
var output    = require('neat-log/output')
var Dat       = require('dat-node')
var stringKey = require('dat-encoding').toStr
var xtend     = require('xtend')
var chokidar  = require('chokidar')
var glob      = require('glob')

var defaultOpts = {
  showKey: true,
  createIfMissing: false,
  exit: false,
  port: 3282,
  utp: true,
  quiet: false,
  watch: !!args.watch,
  import: false
}

if (args.curses) {
  var ui = require('./ui-blessed')
  var neat = neatlog(ui.ui, {})
  neat.use(ui.handler)
}
else {
  var ui = require('./ui')
  var neat = neatlog(ui, {})
}

if (args.help) {
  var help = `Usage: dat-share-all [--watch] [--import] [--dir=<dir>]

Share all dats that are located below a directory.

Options:
    --watch     Watch for new dats being added and share them(default: false).
    --import    Watch for file changes in dats and import them (default: false).
    --dir=<dir> Set the dir from which to look for dats (default: current dir).
    --curses    Curses-style UI (WIP)
`
  console.log(help)
  process.exit(0)
}

if (args.import) {
  defaultOpts.import = true
}

neat.use(init)
neat.use(archive)
neat.use(wait)
neat.render()

if (args.watch) {
  defaultOpts.watch = true
  setInterval(function() {
    neat.use(watch)
  }, 5000)
}

function init(state, bus) {
  state.dats = {}
  state.errors = []
  state.debug = []
  state.exit = false
  state.paths = []
  state.basepath = path.resolve(args.dir || process.cwd())

  var globOpts = {absolute: true, cwd: state.basepath}
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

function watch(state, bus) {
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
  bus.on('dat', function (datState) {
    fs.readFile(path.join(datState.path, 'dat.json'), function (err, data) {
      if (err) datState.title = false
      try {
        var datJson = JSON.parse(data)
        if (datJson.title) {
          datState.title = datJson.title
          bus.render()
        }
      }
      catch (e) {}
    })

    var dat = datState.dat
    var key = datState.key
    var network = dat.joinNetwork(datState.opts, function () {

    })
    state.dats[key].sources = state.dats[key].sources || {}
    network.on('connection', function (conn, info) {
      // todo: connection details.
    })
  })
}

