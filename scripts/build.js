// Do this as the first thing so that any code reading it knows the right env.
process.env.NODE_ENV = 'production'
process.env.ASSET_PATH = '/'

const shell = require('shelljs')
const webpack = require('webpack')
const config = require('../webpack.config')

config.mode = 'production'

shell.rm('-rf', 'build')
webpack(config, function (err) {
  if (err) throw err
})
