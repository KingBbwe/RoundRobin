const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

let localCanisters, prodCanisters, canisters;

function initCanisterIds() {
  try {
    localCanisters = require(path.resolve('.dfx', 'local', 'canister_ids.json'));
  } catch (error) {
    console.log('No local canister_ids.json found. Continuing production');
  }
  try {
    prodCanisters = require(path.resolve('canister_ids.json'));
  } catch (error) {
    console.log('No production canister_ids.json found. Continuing with local');
  }

  const network = process.env.DFX_NETWORK || 'local';
  canisters = network === 'local' ? localCanisters : prodCanisters;

  for (const canister in canisters) {
    process.env[canister.toUpperCase() + '_CANISTER_ID'] = canisters[canister][network];
  }
}

initCanisterIds();

const isDevelopment = process.env.NODE_ENV !== 'production';

module.exports = {
  target: 'web',
  mode: isDevelopment ? 'development' : 'production',
  entry: {
    index: path.join(__dirname, 'src', 'equalizing_round_robin_assets', 'src', 'index.js'),
  },
  devtool: isDevelopment ? 'source-map' : false,
  optimization: {
    minimize: !isDevelopment,
    minimizer: [new TerserPlugin()],
  },
  resolve: {
    extensions: ['.js', '.jsx'],
    fallback: {
      assert: require.resolve('assert'),
      buffer: require.resolve('buffer'),
      events: require.resolve('events'),
      stream: require.resolve('stream-browserify'),
      util: require.resolve('util'),
    },
  },
  output: {
    filename: 'index.js',
    path: path.join(__dirname, 'dist', 'equalizing_round_robin_assets'),
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react'],
          },
        },
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.join(__dirname, 'src', 'equalizing_round_robin_assets', 'src', 'index.html'),
      filename: 'index.html',
      chunks: ['index'],
    }),
    new webpack.EnvironmentPlugin({
      NODE_ENV: process.env.NODE_ENV || 'development',
      DFX_NETWORK: process.env.DFX_NETWORK || 'local',
      EQUALIZING_ROUND_ROBIN_CANISTER_ID: canisters?.equalizing_round_robin?.[process.env.DFX_NETWORK || 'local'],
    }),
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser',
    }),
  ],
  devServer: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        pathRewrite: {
          '^/api': '/api',
        },
      },
    },
    hot: true,
    static: {
      directory: path.resolve(__dirname, './src/equalizing_round_robin_assets'),
    },
    watchFiles: ['src/**/*.html'],
  },
};
