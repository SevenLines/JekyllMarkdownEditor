module.exports = {
    pluginOptions: {
        electronBuilder: {
            nodeIntegration: true,
            enableRemoteModule: true,
            preload: 'src/preload.js',
        }
    }
}