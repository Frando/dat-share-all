# dat-share-all

> npm install -g dat-share-all

Share all dats that are below a directory. Useful if developing with multiple dats.

The official [dat-cli](https://github.com/dat/dat) shares a single dat (by default the path from where called). With `dat-share-all` you share all dats that are located below a directory.

## Installation

> npm install -g dat-share-all

## Usage

From a folder that has dats below it:

> dat-share-all

Options:

* `--watch`: Watch for new dats being created and automatically share them too (default: false)
* `--import`: Watch for file changes and import and share them (default: false)
* `--dir`: Set basedir from where to look for dats (default: current dir)
* `--curses`: Use a curses-style UI (based on [blessed](https://github.com/chjj/blessed))
