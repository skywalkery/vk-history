var path = require('path');
var webpack = require("webpack");
var purify = require("bird3-purifycss-webpack-plugin");
var extractor = require("extract-text-webpack-plugin");
var node_modules_dir = path.resolve(__dirname, 'node_modules');

var config = {
    entry: {
      background: path.resolve(__dirname, 'extension/js/background.js'),
      options: path.resolve(__dirname, 'extension/js/options.js'),
      popup: path.resolve(__dirname, 'extension/js/popup.js'),
      extension: path.resolve(__dirname, 'extension/extension.js'),
    },
    output: {
        path: path.join(__dirname, 'dist'),
        filename: 'js/[name].min.js'
    },
    plugins: [
      new webpack.optimize.UglifyJsPlugin({minimize: true}),
      new extractor("css/[name].min.css"),
      new purify({
            basePath: __dirname,
            paths: [
                "extension/*.html"
            ],
            purifyOptions: {
              minify: true
            }
        })
    ],
    module: {
      loaders: [{
          test: /\.js$/,
          exclude: [node_modules_dir],
          loader: 'babel-loader',
          query: {
            presets: ['es2015'],
          }
        }, {
          test: /\.css$/, loader: extractor.extract('style-loader', 'css-loader')
        }, {
          test: /\.(woff|woff2|eot|ttf|svg)$/, loader: 'url-loader?name=fonts/[name].[ext]&limit=100'
        }, {
          test: /\.png$/, loader: 'file-loader?name=ico/[name].[ext]'
        }, {
          test: /\.json$/, loader: 'file-loader?name=[name].[ext]'
        }, {
          test: /\.html$/, loader: 'file-loader?name=[name].[ext]!html-minify'
        }]
    }
};

module.exports = config;
