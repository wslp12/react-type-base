var path = require("path");
var HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  mode: "development",
  target: "es5",
  entry: path.resolve(__dirname, "src/index.tsx"),
  output: {
    path: path.resolve(__dirname, "dist"),
  },
  resolve: {
    extensions: [".js", ".ts", ".tsx"],
  },
  devtool: "source-map",
  devServer: {
    port: 9000,
  },
  module: {
    rules: [
      {
        include: path.resolve(__dirname, "src"),
        test: /\.(ts|tsx)/,
        exclude: /node_modules/,
        use: "ts-loader",
      },
      {
        include: [
          path.resolve(__dirname, "src"),
          path.resolve(__dirname, "playground"),
        ],
        test: /\.css$/,
        exclude: /node_modules/,
        use: "css-loader",
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, "public/index.html"),
    }),
  ],
};
