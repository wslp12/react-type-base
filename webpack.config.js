/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-var */
var path = require('path');
var HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  mode: 'development',
  target: 'es5',
  entry: path.resolve(__dirname, 'src/index.tsx'),
  output: {
    // filename: '[name].js', // NOTE [name] webpack 자동생성
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist'),
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
  },
  devtool: 'source-map',
  devServer: {
    // external 0.0.0.0
    host: 'localhost',
    allowedHosts: ['.lululala.co.kr'],
    port: 9000,
    historyApiFallback: true,
  },
  module: {
    rules: [
      {
        include: path.resolve(__dirname, 'src'),
        test: /\.(ts|tsx)/,
        exclude: /node_modules/,
        use: 'ts-loader',
      },
      {
        include: [path.resolve(__dirname, 'src')],
        test: /\.css$/,
        exclude: /node_modules/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|jpe?g|gif)$/i,
        use: [
          {
            loader: 'file-loader',
          },
        ],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'public/index.html'),
      inject: 'body',
    }),
    new webpack.DefinePlugin({
      'process.env': JSON.stringify(process.env),
    }),
  ],
};
