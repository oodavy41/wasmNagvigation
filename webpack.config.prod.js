const path = require("path");
const fs = require("fs");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const CompressionPlugin = require("compression-webpack-plugin");

const appDirectory = fs.realpathSync(process.cwd());
const resolveApp = (relativePath) => path.resolve(appDirectory, relativePath);

const DEFAULT_PORT = parseInt(process.env.PORT, 10) || 7000;
const HOST = process.env.HOST || "localhost";

module.exports = {
  entry: "./src/index.js",
  mode: "development",
  output: {
    path: path.resolve(__dirname, "docs"),
    filename: `[name].js`,
    // chunkFilename: "[name].min.js"
  },
  externals: {
    react: "React",
    "react-dom": "ReactDOM",
    Recast: "Recast",
  },
  stats: {
    children: false,
  },
  module: {
    rules: [
      {
        test: [/\.jsx$/, /\.js$/],
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/react"],
          },
        },
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: "style-loader",
          },
          {
            loader: "css-loader",
          },
        ],
      },
      {
        test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/, /\.wasm$/, /\.obj$/],
        use: [
          {
            loader: "file-loader",
            options: {
              name: `[name].[ext]`,
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new CompressionPlugin({
      test: /\.jsx?$|\.wasm$|\.obj$/,
      minRatio: 0.8,
      threshold: 10240,
      deleteOriginalAssets: false,
    }),
    new CopyPlugin({ patterns: [{ from: "static", to: "." }] }),
    new HtmlWebpackPlugin({
      title: "production",
      filename: "index.html",
      template: resolveApp("src/index.html"),
      inject: true,
    }),
  ],
};
