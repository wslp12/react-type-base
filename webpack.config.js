const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

const mode = process.env.mode;
console.log('실행 모드: ', mode);
const target = process.env.target;

const entry =
  process.env.target === 'web'
    ? path.resolve(__dirname, `src/renderer/index.tsx`)
    : path.resolve(__dirname, `src/main/index.ts`);

const plugins = [
  new webpack.DefinePlugin({
    'process.env.react_base': JSON.stringify({
      mode,
    }),
  }),
  new HtmlWebpackPlugin({
    template: path.resolve(__dirname, 'public/index.html'),
    inject: 'body',
  }),
  new webpack.DefinePlugin({
    'process.env': JSON.stringify(process.env),
  }),
];

const devTool = mode === 'production' ? {} : { devtool: 'source-map' };
const result = {
  mode,
  target,
  entry,
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, `dist-${target}`),
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
  plugins,
};

module.exports = { ...result, ...devTool };
