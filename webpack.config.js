// webpack.config.js
const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: {
        background: './background.js',
        popup: './popup.js',
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                { from: 'manifest.json', to: 'manifest.json' },
                { from: 'content.js', to: 'content.js' },
                { from: 'popup.html', to: 'popup.html' },
                { from: 'popup.css', to: 'popup.css' },
            ],
        }),
    ],
};