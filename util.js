module.exports = {
  'pad': pad,
  'formatPath': formatPath
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

function formatPath(path, base, len) {
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
