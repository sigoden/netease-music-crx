const path = require('path')
const shell = require('shelljs')
const pkg = require('../package')

shell.cd(path.resolve(__dirname, '..'))
shell.exec('yarn build')
shell.exec(`yarn crx pack build -o ${pkg.name}-v${pkg.version}.crx -p build.pem`)
shell.exec(`yarn crx pack build --zip-output ${pkg.name}-v${pkg.version}.zip -p build.pem`)
