const path = require("path");
const fs = require("fs");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");

const appDirectory = fs.realpathSync(process.cwd());
const resolveApp = (relativePath) => path.resolve(appDirectory, relativePath);

const DEFAULT_PORT = parseInt(process.env.PORT, 10) || 7000;
const HOST = process.env.HOST || "localhost";

module.exports = {
  entry: "./src/index.js",
  mode: "development",
  output: {
    path: path.resolve(__dirname, "dist"),
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
  devServer: {
    contentBase: "./",
    host: HOST,
    port: DEFAULT_PORT,
    hot: true,
    inline: true, //实时刷新
    compress: true,
    open: true,
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
        test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/, /\.wasm$/],
        use: [
          {
            loader: "file-loader",
            options: {
              name: `[name].[hash:8].[ext]`,
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new CopyPlugin([{ from: "static", to: "." }]),
    new HtmlWebpackPlugin({
      title: "Development",
      filename: "index.html",
      template: resolveApp("src/index.html"),
      inject: true,
    }),
  ],
};
