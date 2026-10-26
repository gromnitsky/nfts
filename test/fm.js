#!/usr/bin/env node

// test/fm.js test/data/2010/11/23/wharton.md test/data/

import fs from 'fs'
import {md_parse} from '../nfts-add.js'

let file = process.argv[2]
let text = fs.readFileSync(file).toString()
console.log(md_parse(text, file, {s: process.argv[3]}))
