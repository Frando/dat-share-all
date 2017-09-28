var blessed    = require('blessed')
var pretty     = require('prettier-bytes')
var stringKey  = require('dat-encoding').toStr
var deepequal  = require('deep-equal')
var pad        = require('./util').pad
var formatPath = require('./util').formatPath

module.exports = blessedUI

function initBlessedUi(state, bus) {
  var screen = blessed.screen({
    smartCSR: true,
    warnings: true,
    useBCE: true,

    tags: true,
    mouse: false,
    log: './log',
    debug: true
  });

  screen.key(['q','C-q'], function() {
    return process.exit(0);
  });

  screen.debugLog.height = 10;
  screen.debugLog.width = 50;
  screen.key('f10', screen.debugLog.toggle);

  var defaultBg = '#282828'

  var prompt = blessed.prompt({
    parent: screen,
    name: 'prompt',
    top: 'center',
    left: 'center',
    height: 'shrink',
    width: 'shrink',
    keys: true,
    vi: true,
    tags: true,
    hidden: true,
  });

  var header = blessed.box({
    parent: screen,
    top: 0,
    left: 0,
    width: '100%',
    tags: true,
    height: 1,
    style: {
      bg: defaultBg,
      fg: 'cyan'
    },
    content: ''
  })

  var table = blessed.listtable({
    parent: screen,
    name:'table',
    left: 0,
    top: 1,
    bottom: 4,
    width: '100%',
    tags: true,
    data: [],

    align: 'left',
    style: {
      bg: defaultBg,
      fg: 'white',
      header: {
        bg: 'green',
        fg: defaultBg
      },
      cell: {
        bg: defaultBg,
        fg: 'white',
        selected: {
          bg: '#00ffff',
          fg: defaultBg
        },
      },
    },
    noCellBorders: true,
    invertSelected: false,

    keys: true,
    vi: true,
    interactive: true,
    scrollable: true,
    alwaysScroll: true,
    mouse: true,

    scrollbar: {
      ch: ' ',
      track: {
        bg: '#444',
        fg: '#fff'
      },
      style: {
        inverse: true
      }
    },

    search: function(callback) {
      prompt.setFront()
      prompt.input('Search:', '', function(err, value) {
        if (err) return;
        return callback(null, value);
      });
    },
  });

  var detailsTitle = blessed.box({
    parent: screen,
    bottom: 3,
    left: 0,
    width: '100%',
    height: 1,
    tags: true,
    style: {
      bg: '#333333',
      fg: 'yellow'
    },
    content: ''
  })

  var details = blessed.box({
    parent: screen,
    bottom: 0,
    left: 0,
    right: 0,
    height: 3 ,
    align: 'left',
    content: '',
    tags: true,
    style: {
      bg: defaultBg,
      fg: '#ffffff'
    }
  });

  var details2 = blessed.box({
    parent: screen,
    bottom: 0,
    right: 0,
    width: 20,
    height: 2 ,
    align: 'left',
    tags: true,
    content: '',
    style: {
      bg: defaultBg,
      fg: '#ffffff'
    }
  });

  table.focus()
  screen.render()

  state.ui = {
    screen: screen,
    header: header,
    table: table,
    details: details
  }

  table.on('selectrow', function(item, selected) {
    if (state.tableindex[selected]) {
      var content, title, files, version
      var key = state.tableindex[selected]
      var dat = state.dats[key]
      var stats = dat.stats
      var fileStats = stats.get()

      content  = `  Link: {blue-fg}dat://${stringKey(dat.key)}{/}\n`
      content += `  Path: {blue-fg}${formatPath(dat.path, state.basepath, 70)}{/}`

      title = '{yellow-fg}dat.name'
      if (dat.title) {
        title += ' {bold}(' + dat.title + ')'
      }
      title += '{/}'

      files = `${fileStats.files} files, ${pretty(fileStats.byteLength)}\n`
      version = `Version: ${fileStats.version}`
      if (dat.updated) {
        version = '{magenta-fg}' + version + '{/}'
      }

      detailsTitle.setContent('> ' + title)
      details.setContent(content)
      details2.setContent(files + version)
      screen.render()
    }
  })

  // screen.log('start')
}

function blessedUI(state, bus) {
  if (!state.ui) {
    initBlessedUi(state, bus)
  }

  var data = []
  var tableindex = []
  data.push([
    'TITLE',
    'DIR',
    'KEY',
    'PEERS',
    '  DOWN',
    '    UP',
    'W?'
  ])
  tableindex.push(false)

  // Save previous selected item.
  var selected = 0
  if (state.tableindex && state.tableindex[state.ui.table.selected]) {
    selected = state.tableindex[state.ui.table.selected]
  }

  // Update table data.
  var totalStats = {up: 0, down: 0, conns: 0, dats: 0}
  for (var key in state.dats) {
    if (!state.dats.hasOwnProperty(key)) continue;
    var dat = state.dats[key]
    var stats = dat.stats
    totalStats = {
      up: totalStats.up + stats.network.uploadSpeed,
      down: totalStats.down + stats.network.downloadSpeed,
      conns: totalStats.conns + stats.peers.total,
      dats: totalStats.dats + 1
    }
    var writable = dat.dat.writable ? '*' : ''
    if (writable && dat.updated) {
      writable = '{magenta-fg}' + writable + '{/}'
    }
    var title = ''
    if (dat.title) {
      title = dat.title
    }
    var down = pad(pretty(stats.network.downloadSpeed), 6, 'left');
    var up = pad(pretty(stats.network.uploadSpeed), 6, 'left');

    if (stats.network.downloadSpeed) {
      down = '{yellow-fg}' + down + '{/}'
    }
    if (stats.network.uploadSpeed) {
      up = '{yellow-fg}' + up + '{/}'
    }

    var row = [
      title.length > 20 ? title.substr(0, 20) + '..' : title,
      formatPath(dat.path, state.basepath, 20),
      formatKey(dat.dat.key),
      stats.peers.total.toString(),
      down,
      up,
      writable
    ]
    data.push(row)
    tableindex.push(key)
  }

  // Rerender only if data changed.
  if (state.ui && (!state.tabledata || !deepequal(state.tabledata, data))) {
    // Update table data.
    state.ui.table.setData(data)

    // Update header.
    var header = ''
    header += 'Dats: {bold}' + totalStats.dats + '{/}   '
    header += 'Connections: {bold}' + totalStats.conns.toString() + '{/}   '
    header += 'Download: {bold}' + pretty(totalStats.down) + '{/}   '
    header += 'Upload: {bold}' + pretty(totalStats.up) + '{/}'
    state.ui.header.setContent(header)

    // Store scrollpos.
    var scrollpos = state.ui.table.getScroll()

    // Rerender.
    state.ui.table.focus()
    state.ui.screen.render()

    // Restore scroll and select.
    if (selected && tableindex.indexOf(selected) !== 0) {
      state.ui.table.select(tableindex.indexOf(selected))
    }
    state.ui.table.scrollTo(scrollpos)

    state.tabledata = data
    state.tableindex = tableindex
  }
}

function formatKey(key) {
  key = stringKey(key)
  return key.substr(0, 6) + '..' + key.slice(-2)
}
