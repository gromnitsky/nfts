let fs = require('fs')
let fts = require('../nfts-create')

let parse = fts.parse(...process.argv.slice(2))
console.log(parse(fs.readFileSync(process.argv[2]).toString()))
