#!/usr/bin/env node

require('crx')

const fs = require('fs')
const PEM_FILE = process.env.PEM_FILE || './build.pem'
const path = require('path')
const paths = require('../config/paths')
const manifest = require(path.join(paths.appBuild, 'manifest.json'))
const outputFile = path.join(paths.appDist, `netease-music-crx_v${manifest.version}`)
const cp = require('child_process');

if (!fs.existsSync(PEM_FILE)) {
  console.error(`Invalid pem files: ${PEM_FILE}`)
  process.exit(1)
}

const cmd = `npx crx pack ${paths.appBuild} -o ${outputFile}.crx --zip-output ${outputFile}.zip -p ${PEM_FILE}`
cp.exec(cmd, function(err, stdout, stderr) {
  if (err) throw err
  if (stderr) {
    console.error(stdout);
  }
  if (stdout) {
    console.log(stdout);
  }
})
