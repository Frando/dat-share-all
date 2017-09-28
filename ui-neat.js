var chalk      = require('chalk')
var pretty     = require('prettier-bytes')
var stringKey  = require('dat-encoding').toStr
var pad        = require('./util').pad
var formatPath = require('./util').formatPath

module.exports = shareAllUi

function shareAllUi(state, bus) {
  if (!state.dats) return 'Starting dat-share-all...'
  if (!state.warnings) state.warnings = []

  var status, errors, debug, totals, color
  status = errors = debug = totals = ''

  state.errors.forEach(function (error) {
    if (typeof error === 'string') {
      error = {name: '', message: error}
    }
    errors += `${chalk.red(error.name)}: ${error.message}\n`
  })
  if (errors) {
    errors += '\n'
  }

  var totalStats = {up: 0, down: 0, conns: 0}
  for (var key in state.dats) {
    if (!state.dats.hasOwnProperty(key)) continue;
    var dat = state.dats[key]
    var stats = dat.stats
    var fileStats = stats.get()
    var download = stats.network.downloadSpeed
    var upload = stats.network.uploadSpeed
    var connections = stats.peers.total || 0

    totalStats = {
      up: totalStats.up + upload,
      down: totalStats.down + download,
      conns: totalStats.conns + connections
    }

    var name = formatPath(dat.path, state.basepath, 60)

    status += chalk.bold.yellow(name)
    if (dat.title) {
      var title = dat.title
      if (title.length + name.length > 80) {
        title = title.substr(0, 80 - name.length - 4) + '..'
      }
      status += chalk.yellow(' (' + dat.title + ')')
    }
    status += '\n'
    status += indent(0, `${chalk.blue('dat://' + stringKey(dat.dat.key))}\n`)
    status += indent(0, pad(`${fileStats.files} files (${pretty(fileStats.byteLength)})`, 20))
    status += pad(`Version: ${fileStats.version}`, 16)
    color = connections ? chalk.green : chalk;
    status += color(pad(`Connections: ${connections}`, 18))
    status += `Down ${formatSpeed(download)}, Up ${formatSpeed(upload)}\n`
    if (dat.import) {
      status += chalk.cyan('[Liveimport]')
      if (dat.progress.indexSpeed) {
        status += ' (' + chalk.green(formatSpeed(dat.progress.indexSpeed)) + ')'
      }
      status += '\n'
    }
    status += '\n'
  }

  color = totalStats.conns ? chalk.green : chalk;
  totals = color('Connections: ' + totalStats.conns)
  totals += ` | Down ${formatSpeed(totalStats.down)}, Up ${formatSpeed(totalStats.up)}`
  totals += '\n\n'

  // debug breaks formatting, disabled for now.
  // state.debug = state.debug || []
  // state.debug.forEach(function(msg) {
  //   debug += chalk.yellow(msg) + '\n'
  // })

  return errors + totals + status + debug
}

function formatSpeed (speed) {
  return speed ? chalk.green(pretty(speed)) : pretty(speed)
}
function formatNum (num) {
  return num ? chalk.green(num) : num
}

function indent (len, str) {
  return ' '.repeat(len) + str
}
