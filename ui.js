var chalk     = require('chalk')
var pretty    = require('prettier-bytes')
var stringKey = require('dat-encoding').toStr

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

    var name = formatName(dat.path, state.basepath, 60)

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

  state.debug = state.debug || []
  state.debug.forEach(function(msg) {
    debug += chalk.yellow(msg) + '\n'
  })

  return errors + totals + status + debug
}

function formatSpeed (speed) {
  return speed ? chalk.green(pretty(speed)) : pretty(speed)
}
function formatNum (num) {
  return num ? chalk.green(num) : num
}

function formatName(path, base, len) {
  var newpath = ''
  if (path.indexOf(base) === 0) {
    newpath = path.substr(base.length + 1);
  }
  if (newpath.length > len) {
    var els = newpath.split('/')
    var elLen = Math.floor(len / els.length) - 1
    newpath = ''
    els.forEach(function(el) {
      if (el.length <= elLen) {
        newpath += el
      }
      else if (elLen > 4) {
        var end = 3;
        if (elLen-end < 3) {
          end = 1
        }
        newpath += el.substr(0, elLen - end - 1) + '..' + el.slice(-end)
      }
      else {
        newpath += el.substr(0, elLen - 2) + '..'
      }
      newpath += '/'
    })
    newpath = newpath.substr(0, newpath.length - 1)
  }
  return './' + newpath
}

function pad (str, len, dir, char) {
  dir = dir || 'right'
  char = char || ' '
  var padLen = len - str.length || 0
  if (padLen > 0) {
    if (dir === 'left') {
      return char.repeat(padLen) + str
    }
    return str + char.repeat(padLen)
  }
  return str
}

function indent (len, str) {
  return ' '.repeat(len) + str
}
