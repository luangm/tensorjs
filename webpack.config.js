var webpack = require('webpack');
var path = require('path');
var UglifyJsPlugin = require('uglifyjs-webpack-plugin');
var BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const WebpackBabelExternalsPlugin = require('webpack-babel-external-helpers-2');

module.exports = {
  entry: {
    index: './src/index.js',
    dev: './dev/index.js',
  },

  output: {
    path: path.join(__dirname, '/dist'),
    filename: '[name].js',
    publicPath: '/dist/',
    libraryTarget: 'umd'
  },

  resolve: {
    extensions: ['.js', '.jsx']
  },

  module: {
    rules: [
      {
        test: /\.js|jsx$/,
        exclude: /node_modules/,
        use: ["babel-loader"]
      },
      {
        test: /\.(glsl|frag|vert)$/,
        exclude: /node_modules/,
        use: ['raw-loader', 'glslify-loader']
      }
    ]
  },

  plugins: [
    // new UglifyJsPlugin(),
    new webpack.optimize.ModuleConcatenationPlugin(),
    new WebpackBabelExternalsPlugin(),
    // new BundleAnalyzerPlugin()
  ]

  // stats: {
  //   Examine all modules
    // maxModules: Infinity,
    // Display bailout reasons
    // optimizationBailout: true
  // }
};