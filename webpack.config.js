const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

const MODE = process.env.R_MODE;
const RUN_MODE = process.env.R_RUN_MODE;
console.log('실행 모드: ', MODE);
console.log('런타임 실행 환경: ', RUN_MODE);

const plugins = [
  new HtmlWebpackPlugin({
    template: path.resolve(__dirname, 'public/index.html'),
    inject: 'body',
    publicPath: '/',
  }),
  new webpack.DefinePlugin({
    'process.env': JSON.stringify(process.env),
  }),
];

const devTool = MODE === 'production' ? {} : { devtool: 'source-map' };
const result = {
  mode: MODE,
  target: 'web',
  entry: path.resolve(__dirname, 'src/index.tsx'),
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist'),
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
  },

  devServer: {
    host: 'localhost',
    port: 9000,
    historyApiFallback: true,
    open: true,
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)/,
        exclude: /node_modules/,
        use: 'ts-loader',
      },
      {
        test: /\.css$/,
        exclude: /node_modules/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|jpe?g|gif)$/i,
        exclude: /node_modules/,
        use: [
          {
            loader: 'file-loader',
          },
        ],
      },
    ],
  },
  plugins,
};

module.exports = { ...result, ...devTool };
