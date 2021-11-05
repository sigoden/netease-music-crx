// Do this as the first thing so that any code reading it knows the right env.
process.env.NODE_ENV = 'development'
process.env.ASSET_PATH = '/'

const WebpackDevServer = require('webpack-dev-server')
const webpack = require('webpack')
const config = require('../webpack.config')
const path = require('path')

const PORT = process.env.PORT || 3000

for (const entryName in config.entry) {
  if (['popup', 'background'].indexOf(entryName) > -1) {
    config.entry[entryName] = [
      'webpack/hot/dev-server',
      `webpack-dev-server/client?hot=true&hostname=localhost&port=${PORT}`,
    ].concat(config.entry[entryName])
  }
}

config.plugins = [new webpack.HotModuleReplacementPlugin(), ...(config.plugins || [])]

const compiler = webpack(config)

const server = new WebpackDevServer(
  {
    https: false,
    hot: false,
    client: false,
    host: 'localhost',
    port: PORT,
    static: {
      directory: path.join(__dirname, '../build'),
    },
    devMiddleware: {
      publicPath: `http://localhost:${PORT}/`,
      writeToDisk: true,
    },
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    allowedHosts: 'all',
  },
  compiler,
)

if (process.env.NODE_ENV === 'development' && module.hot) {
  module.hot.accept()
}

(async () => {
  await server.start()
})()
