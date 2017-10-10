# dat-share-all

    npm install -g dat-share-all

At some folder with multiple dats inside:

    dat-share-all --import --watch

Share all dats that are below a directory. Either just share the current state, or watch for file changes and auto-import. Has a curses-style UI to list shared dats and network connections.

The official [dat-cli](https://github.com/dat/dat) shares a single dat (by default the path from where called). With `dat-share-all` you share all dats that are located below a directory.

## Installation

    npm install -g dat-share-all

## Usage

    Usage: dat-share-all [options] [--dir=<dir>]
    
    Share all dats that are located below a directory.
    
    Options:
        --import     Import file changes in writable dats (default: false).
        --watch      Watch for file changes in writable dats and import (default: false).
        --watchdir   Watch for new dats being added and share them (default: false).
        --dir=<dir>  Set the dir from which to look for dats (default: current dir).
        --port       Set port (default: 3282)
        --neat       Simple list UI (WIP, not working correctly for many dats).
    


