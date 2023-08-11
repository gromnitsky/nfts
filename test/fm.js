#!/usr/bin/env node

// test/fm.js ~/lib/writing/blog/en/_fts/src/2023/08/09/xfvwV6.md /home/alex/lib/writing/blog/en/_fts/src/

import fs from 'fs'
import * as fts from '../nfts-create.js'

let parse = fts.parse(...process.argv.slice(2))
console.log(parse(fs.readFileSync(process.argv[2]).toString()))
