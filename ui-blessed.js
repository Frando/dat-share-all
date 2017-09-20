var blessed   = require('blessed')
var chalk     = require('chalk')
var pretty    = require('prettier-bytes')
var stringKey = require('dat-encoding').toStr
var deepequal = require('deep-equal')

module.exports =  {ui: blessedUI, handler: blessedHandler}

function blessedHandler(state, bus) {
  bus.once('initBlessedUi', initBlessedUi)
  bus.emit('initBlessedUi', state, bus)
}

function initBlessedUi(state, bus) {
  var screen = blessed.screen({
    smartCSR: true,
    warnings: true,
    useBCE: true,

    mouse: false,
    log: './log',
    debug: true

  });

  screen.key(['q','C-q'], function() {
    return process.exit(0);
  });

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
    // border:
    hidden: true,
    // style: {
    //   fg: 'blue',
    //   bg: 'yellow'
    // }
  });

  var header = blessed.box({
    parent: screen,
    top: 0,
    left: 0,
    width: '100%',
    height: 1,
    style: {
      bg: '#111',
      fg: '#ffff00'
    },
    content: ''
  })

// Create a table
  var table = blessed.listtable({
    parent: screen,
    name:'table',
    left: 0,
    top: 1,
    bottom: 5,
    width: '100%',
    data: [],

    search: function(callback) {
      prompt.setFront()
      prompt.input('Search:', '', function(err, value) {
        if (err) return;
        return callback(null, value);
      });
    },

    align: 'left',
    style: {
      bg: '#111111',
      fg: 'white',
      header: {
        bg: 'green',
        fg: '#111111'
      },
      cell: {
        bg: '#111111',
        fg: 'white',
        selected: {
          bg: '#00ffff',
          fg: '#111111'
        },
      },
      scrollbar: {
        bg: 'blue',
        fg: 'yellow'
      }
    },

    noCellBorders: true,
    invertSelected: false,
    // border: 'line',

    keys: true,
    vi: true,
    interactive: true,
    scrollable: true,
    alwaysScroll: true,
    // mouse: true

    // scrollbar: {
    //   style: {
    //     bg: 'yellow'
    //   }
    // }


  });


  var border1 = blessed.box({
    parent: screen,
    bottom: 3,
    left: 0,
    width: '100%',
    height: 1,
    // border: {
    //   type: 'bg',
    //   fg: '#777',
    //   ch: '-'
    // },
    style: {
      bg: 'green',
      fg: '#111'
    },
    content: ''
  })

  var details = blessed.box({
    parent: screen,
    bottom: 0,
    left: 0,
    width: '100%',
    height: 3 ,
    align: 'left',
    content: '',
    // border: {
    //   type: 'line',
    //   fg: 'cyan'
    // },
    style: {
      bg: '#111',
      fg: '#ffff00'
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
    var content = ''
    if (state.tableindex[selected]) {
      var key = state.tableindex[selected]
      content += state.dats[key].name
      if (state.dats[key].title) {
        content += chalk.bold.yellow(' (' + state.dats[key].title + ')')
      }
      content += '\n'
      content += 'Link: ' + chalk.blue('dat://' + stringKey(state.dats[key].key)) + '\n'
      content += 'Path: ' + chalk.blue(state.dats[key].path)
    }
    details.setContent(content)
    screen.render()
  })

  screen.log('start')


}



function blessedUI(state, bus) {
  var data = []
  var tableindex = []
  data.push([
    'name',
    'key',
    'peers',
    'down',
    'up'
  ])
  tableindex.push(false)
  var totalStats = {up: 0, down: 0, conns: 0}
  for (var key in state.dats) {
    if (!state.dats.hasOwnProperty(key)) continue;
    var dat = state.dats[key]
    var stats = dat.stats
    totalStats = {
      up: totalStats.up + stats.network.downloadSpeed,
      down: totalStats.down + stats.network.uploadSpeed,
      conns: totalStats.conns + stats.peers.total
    }
    var row = [
      dat.name,
      formatKey(dat.dat.key),
      stats.peers.total.toString(),
      pretty(stats.network.downloadSpeed),
      pretty(stats.network.uploadSpeed)
    ]
    data.push(row)
    tableindex.push(key)
  }

  var header = ''
  header += 'Connections: ' + totalStats.conns.toString() + '  |  ' + 'Upload: ' + pretty(totalStats.up) + '  |  ' + 'Download: ' + pretty(totalStats.down)

  if (state.ui && (!state.tabledata || !deepequal(state.tabledata, data))) {
    state.ui.table.setData(data)
    state.ui.header.setContent(header)
    state.ui.table.scrollTo(0)
    // table.focus()
    state.ui.screen.render()
  }
  state.tabledata = data
  state.tableindex = tableindex

}

function formatKey(key) {
  key = stringKey(key)
  return key.substr(0, 6) + '..' + key.slice(-2)
}