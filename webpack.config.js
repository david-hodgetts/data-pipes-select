module.exports = {
  entry: './src/main.js',
  output: {
      filename: './dist/bundle.js'
  },
  watch: true,
  devtool: 'source-map',
  devServer: {
    contentBase: './'
  },
  module: {
      rules: [
          {
              test: /\.js$/,
              exclude: /node_modules/
          }
      ]
  }
};