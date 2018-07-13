import * as path from 'path'
import {DefinePlugin} from 'webpack';
import * as autoprefixer from 'autoprefixer';
import * as CopyWebpackPlugin from 'copy-webpack-plugin';
import * as HtmlWebpackPlugin from 'html-webpack-plugin';
import * as ExtractTextPlugin from 'extract-text-webpack-plugin';
import * as ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
import * as HappyPack from 'happypack';

const happyThreadPool = HappyPack.ThreadPool({size: 5});
const postCssOptions = [
  autoprefixer({
    browsers: ['last 2 version']
  })
];
const tsLoaderOptions = {
  transpileOnly: true,
  happyPackMode: true
};
const root = (...args) => {
  return path.join(__dirname, '..', args.join('/'));
};

const ENV = process.env.NODE_ENV; // production/development/test
const isProd = ENV === 'production';
const isTest = ENV === 'test';

export const config = {
  mode: isProd ? 'production' : 'development',
  devtool: isProd ? 'source-map' : isTest ? 'inline-source-map' : 'cheap-module-eval-source-map',
  entry: isTest ? undefined : {
    vendors: ['./src/polyfills.ts', './src/vendors.ts'],
    app: './src/index.ts'
  },
  output: isTest ? {} : {
    path: root('dist'),
    filename: isProd ? 'js/[name].[hash].js' : 'js/[name].js',
    chunkFilename: isProd ? 'js/[id].[hash].chunk.js' : 'js/[id].chunk.js'
  },
  devServer: {
    contentBase: './src/public',
    historyApiFallback: true,
    proxy: undefined,
    host: '0.0.0.0',
    quiet: true,
    stats: 'minimal' // none (or false), errors-only, minimal, normal (or true) and verbose
  },
  optimization: {
    runtimeChunk: 'single',
  },
  resolve: {
    extensions: ['.js', '.ts', '.html', '.css', '.scss']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: [isTest ? /\.(e2e)\.ts$/ : /\.(spec|e2e)\.ts$/, /node_modules/],
        use: 'happypack/loader?id=ts'
      },
      {
        test: /\.(png|jpe?g|gif|svg|ico)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
        use: isTest ? 'null-loader' : {
          loader: 'file-loader',
          options: {
            name: 'img/[name].[ext]'
          }
        }
      },
      {
        test: /\.(woff|woff2|ttf|eot|otf)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
        use: isTest ? 'null-loader' : {
          loader: 'file-loader',
          options: {
            name: 'font/[name].[ext]'
          }
        }
      },
      {
        test: /\.html$/,
        exclude: /index.html$/i,
        use: isTest ? 'null-loader' : 'happypack/loader?id=raw'
      },
      {
        test: /\.(scss|sass)$/,
        exclude: [root('src', 'app')],
        loader: isTest ? 'null-loader' : ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: 'happypack/loader?id=sass'
        })
      },
      {
        test: /\.(scss|sass)$/,
        exclude: root('src', 'style'),
        use: isTest ? 'null-loader' : 'happypack/loader?id=raw-sass'
      }
    ]
  },
  plugins: [
    new HappyPack({
      id: 'ts',
      threadPool: happyThreadPool,
      loaders: [
        {
          loader: 'ts-loader',
          options: tsLoaderOptions
        }, {
          loader: 'angular2-template-loader'
        }
      ]
    }),
    new HappyPack({
      id: 'raw',
      threadPool: happyThreadPool,
      loaders: [
        {
          loader: 'raw-loader'
        }
      ]
    }),
    new HappyPack({
      id: 'sass',
      threadPool: happyThreadPool,
      loaders: [
        {
          loader: 'css-loader'
        },
        {
          loader: 'postcss-loader',
          options: postCssOptions
        },
        {
          loader: 'sass-loader'
        }]
    }),
    new HappyPack({
      id: 'raw-sass',
      threadPool: happyThreadPool,
      loaders: [
        {
          loader: 'raw-loader'
        },
        {
          loader: 'postcss-loader',
          options: postCssOptions
        },
        {
          loader: 'sass-loader'
        }
      ]
    }),
    new DefinePlugin({
      PRODUCTION: JSON.stringify(isProd),
      BUILDTIMESTAMP: JSON.stringify(Date.now()),
    }),
    new ForkTsCheckerWebpackPlugin(isTest ? {} : {
      checkSyntacticErrors: true,
      tslint: true
    }),
    new ExtractTextPlugin({
      filename: '[hash].css',
      disable: !isProd
    }),
    new CopyWebpackPlugin(isProd ? [{
      from: './src/public'
    }] : [])
  ],
};

if (!isTest) {
  config.plugins.push(new HtmlWebpackPlugin({
    template: './src/public/index.html',
    chunksSortMode: 'dependency'
  }))
}
