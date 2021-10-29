const webpack = require('webpack')
const path = require('path')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const TerserPlugin = require('terser-webpack-plugin')

const ASSET_PATH = process.env.ASSET_PATH || '/'

const fileExtensions = ['jpg', 'jpeg', 'png', 'gif', 'eot', 'otf', 'svg', 'ttf', 'woff', 'woff2']

const options = {
  mode: process.env.NODE_ENV || 'development',
  entry: {
    popup: path.join(__dirname, 'src/popup.js'),
    background: path.join(__dirname, 'src/background.js')
  },
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: '[name].bundle.js',
    clean: true,
    publicPath: ASSET_PATH
  },
  chromeExtensionBoilerplate: {
    notHotReload: ['contentScript', 'devtools']
  },
  module: {
    rules: [
      {
        // look for .css or .scss files
        test: /\.(css|scss)$/,
        // in the `src` directory
        use: [
          {
            loader: 'style-loader'
          },
          {
            loader: 'css-loader'
          }
        ]
      },
      {
        test: new RegExp('.(' + fileExtensions.join('|') + ')$'),
        loader: 'file-loader',
        options: {
          name: '[name].[ext]'
        },
        exclude: /node_modules/
      },
      {
        test: /\.(js|jsx)$/,
        use: [
          {
            loader: 'source-map-loader'
          },
          {
            loader: 'babel-loader'
          }
        ],
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    alias: {
      'react-dom': '@hot-loader/react-dom',
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify')
    },
    extensions: fileExtensions
      .map((extension) => '.' + extension)
      .concat(['.js', '.jsx', '.css'])
  },
  plugins: [
    new webpack.ProgressPlugin(),
    new webpack.EnvironmentPlugin(['NODE_ENV']),
    new webpack.ProvidePlugin({
      Buffer: [require.resolve('buffer/'), 'Buffer']
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'src/manifest.json',
          to: path.join(__dirname, 'build'),
          force: true,
          transform: function (content, path) {
            // generates the manifest file using the package.json informations
            return Buffer.from(
              JSON.stringify({
                description: process.env.npm_package_description,
                version: process.env.npm_package_version,
                ...JSON.parse(content.toString())
              })
            )
          }
        }
      ]
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'src/assets/img/icon-34.png',
          to: path.join(__dirname, 'build'),
          force: true
        },
        {
          from: 'src/assets/img/icon-128.png',
          to: path.join(__dirname, 'build'),
          force: true
        },
        {
          from: 'src/assets/css',
          to: path.join(__dirname, 'build'),
          force: true
        }
      ]
    }),
    new HtmlWebpackPlugin({
      template: path.join(__dirname, 'src/popup.html'),
      filename: 'popup.html',
      chunks: ['popup'],
      cache: false
    }),
    new HtmlWebpackPlugin({
      template: path.join(__dirname, 'src/background.html'),
      filename: 'background.html',
      chunks: ['background'],
      cache: false
    })
  ],
  infrastructureLogging: {
    level: 'info'
  }
}

if (process.env.NODE_ENV === 'development') {
  options.devtool = 'inline-source-map'
} else {
  options.optimization = {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        extractComments: false
      })
    ]
  }
}

module.exports = options
