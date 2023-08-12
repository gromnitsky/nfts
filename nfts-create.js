#!/usr/bin/env node

import util from 'util'
import fs from 'fs'
import {readFile} from 'fs/promises'
import front_matter from 'front-matter'
import Database from 'better-sqlite3'
import ProgressBar from 'progress'
import {marked} from 'marked'
import * as html from'./lib/html.js'

if (import.meta.url.endsWith(process.argv[1])) {
    let args
    try {
        args = util.parseArgs({allowPositionals: true, options: {
            q: { type: 'boolean' }, tokenizer: { type: 'string' },
            o: { type: 'string' }, p: { type: 'string' },
        }})
    } catch (err) {
        console.error(err.message)
        usage()
    }

    if ( !(args.values.o && args.positionals.length)) usage()

    let db = db_open(args.values.o, args.values.tokenizer)
    db.pragma('synchronous = OFF')
    let bar = progress_bar(args.positionals.length, args.values.q)
    args.positionals.forEach( file => {
	add(db, file, args.values.p).catch( e => {
	    console.error(`${file}: ${e.message}`)
	    process.exitCode = 2
	}).finally(bar.tick.bind(bar))
    })
}

function db_open(file, tokenizer = "unicode61 remove_diacritics 1") {
    try { fs.unlinkSync(file) } catch { /* ignore */ }
    let db = new Database(file)
    let escape = raw => db.prepare('SELECT quote(?)').pluck().get(raw)
    db.prepare(`
CREATE VIRTUAL TABLE fts USING fts5(
  file UNINDEXED,
  subject UNINDEXED,
  date UNINDEXED,
  body,
  tokenize = ${escape(tokenizer)}
)`).run()
    db.prepare(`CREATE TABLE metatags(file, type, name)`).run()
    db.prepare(`CREATE INDEX metatags_indices ON metatags(file,type)`).run()
    return db
}

function add(db, file, row_file_prefix_cutoff) {
    return readFile(file, {encoding: 'utf8'})
	.then(parse(file, row_file_prefix_cutoff))
	.then(db_append(db))
}

export function parse(file, prefix) {
    return text => {
	let fm = front_matter(text)
	fm.file = prefix ? file.slice(prefix.length) : file
	return fm_normalise(fm)
    }
}

function fm_normalise(fm) {
    let a = {}
    for (let k of Object.keys(fm.attributes))
	a[k.toLowerCase()] = norm(fm.attributes[k])
    let r = {
	file: fm.file,
	subject: a.title || a.subject || 'Untitled',
	date: a.date || epoch(fm.file),
	authors: array(a.author || a.authors, 'anonymous'),
	tags: array(a.category || a.categories || a.tags, 'untagged')
	    .map( v => v.toLowerCase())
    }
    r.body = [r.subject, marked(fm.body, {
        mangle: false,
        headerIds: false
    })].map(html.html2text)
	.map(html.silly_escape).join(' ')
    return r
}

function db_append(db) {
    return fm => {
	db_append_post(db, fm)
	db_append_metatags(db, fm.file, 'author', fm.authors)
	db_append_metatags(db, fm.file, 'tag', fm.tags)
    }
}

function db_append_post(db, fm) {
    db.prepare(`INSERT INTO fts(file,subject,date,body) VALUES (?,?,?,?)`)
	.run(fm.file, fm.subject, fm.date, fm.body)
}

function db_append_metatags(db, file, type, list) {
    let ins = db.prepare(`INSERT INTO metatags(file,type,name) VALUES (?,?,?)`)
    list.forEach( val => ins.run(file, type, val))
}

// Utils
function norm(v) {
    if (Array.isArray(v)) return v.map(norm).filter( v => v.length).flat()
    if (v instanceof Date) return (v.valueOf()/1000).toString()
    return /string|number/.test(typeof v) ? v.toString().trim() : ''
}
function arrarify(v) { return Array.isArray(v) ? v : norm((v ||'').split(',')) }
function array(v, def) { let a = arrarify(v); return a.length ? a : [def] }
function epoch(file) {
    let yyyy_mm_dd = file.slice(0,10).replace(/\//g, '-')
    let d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(yyyy_mm_dd) ? yyyy_mm_dd : '')
    return (isNaN(d) ? new Date(0) : d).valueOf()/1000
}
function usage() {
    console.error(`Usage: nfts-create -o file.sqlite3
                   [-p row-file-prefix-cutoff] [--tokenizer NAME] [-q]
                   file1.md [file2.md ...]`)
    process.exit(1)
}
function progress_bar(total, quiet) {
    if (quiet) return {tick: () => {}}
    return new ProgressBar('[:bar] :current/:total :rate/fps :percent :elapseds :etas ', { total: total, incomplete: ' ', renderThrottle: 100 })
}
