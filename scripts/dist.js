const fs = require('fs')
const path = require('path')
const paths = require('../config/paths')
const recursive = require('recursive-readdir')
const yazl = require('yazl')

const manifest = require(path.join(paths.appBuild, 'manifest.json'))
const outputFilePath = path.join(paths.appDist, `netease-music-crx_v${manifest.version}.zip`)

let zipfile = new yazl.ZipFile()
recursive(paths.appBuild, function (err, files) {
  if (err) throw err
  function toRelative(file)  {
    return file.substr(paths.appBuild.length + 1)
  }
  console.log('Contents:')
  files.forEach(file => {
    let relativeFilePath = toRelative(file)
    console.log('  ' + relativeFilePath)
    zipfile.addFile(file, relativeFilePath)
  })
  
  zipfile.outputStream
    .pipe(fs.createWriteStream(outputFilePath))
    .on('close', function() {
      console.log(`Generate:\n  ${outputFilePath}`)
    })

  zipfile.end()
})

