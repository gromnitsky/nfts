#!/usr/bin/env node

import util from 'util'
import fs from 'fs'
import {DatabaseSync} from 'node:sqlite'
import front_matter from 'front-matter'
import {marked} from 'marked'
import {parseFragment} from 'parse5'

function html_grab_text_nodes() {
    let attr = (elm, name) => elm.attrs.find(attr => attr.name === name)?.value

    let texts = []
    return function walk(kids) {
        (kids.childNodes || kids).forEach( node => {
            if (/^(head|script|style)$/.test(node.nodeName)) return
            if (node.nodeName === '#text') texts.push(node.value)
            if (node.nodeName === 'img') {
                let alt = attr(node, 'alt')
                if (alt) texts.push(`[${alt}]`)
            }
            if (node.childNodes) walk(node.childNodes)
        })
        return texts
    }
}

function html_strip(html) {
    if (!html) return ""
    let doc = parseFragment(html)
    return html_grab_text_nodes()(doc).join(' ')
}

function html2text(html) {
    if (!html) return ""
    return html_strip(html).replace(/\s+/g, ' ').trim()
}

function usage() {
    console.error(`Usage: nfts-add -o db.sqlite3
         [-s leading-prefix-to-strip-from-filenames] [--tokenizer STR] [-q]
         file1.md [file2.md ...]`)
    process.exit(1)
}

function norm(v) {
    if (Array.isArray(v)) return v.map(norm).filter( v => v.length).flat()
    if (v instanceof Date) return v.valueOf()/1000
    return /string|number/.test(typeof v) ? v.toString().trim() : ''
}
function arrarify(v) { return Array.isArray(v) ? v : norm((v ||'').split(',')) }
function array(v, def) { let a = arrarify(v); return a.length ? a : [def] }
function epoch(file) {
    let yyyy_mm_dd = file.slice(0,10).replace(/\//g, '-')
    let d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(yyyy_mm_dd) ? yyyy_mm_dd : '')
    return (isNaN(d) ? new Date(0) : d).valueOf()/1000
}

function fm_normalise(fm) {
    let maybe_date = v => {
        if (Number.isInteger(v)) return v
        let d = new Date(v); if (!isNaN(d)) return d.valueOf(d)/1000
        return 0
    }
    let a = {}
    for (let k of Object.keys(fm.attributes))
        a[k.toLowerCase()] = norm(fm.attributes[k])
    let r = {
        file: fm.file,
        subject: html2text(a.title || a.subject || 'Untitled'),
        date: maybe_date(a.date) || epoch(fm.file),
        authors: array(a.author || a.authors, 'anonymous').map(html2text),
        tags: array(a.category || a.categories || a.tags, 'untagged')
            .map( v => html2text(v).toLowerCase())
    }
    r.body = [r.subject, html2text(marked(fm.body))].join('. ')
        .replaceAll(/[\x02\x03]/g, '') // rm marker strings
    return r
}

export function md_parse(text, filename, opt = {}) {
    let fm = front_matter(text)
    fm.file = opt.s ? filename.slice(opt.s.length) : filename
    return fm_normalise(fm)
}

function errx(...args) {
    console.error('nfts-add error:', ...args)
    process.exit(1)
}

class DB {
    constructor(file, tokenizer = "unicode61 remove_diacritics 1") {
        this.db = new DatabaseSync(file)
        this.db.exec('PRAGMA synchronous = OFF')
        this.db.exec(`
CREATE VIRTUAL TABLE IF NOT EXISTS fts USING fts5(
  file UNINDEXED,
  subject UNINDEXED,
  date UNINDEXED,
  body,
  tokenize = ${this.escape(tokenizer)}
)`)
        this.db.exec(`CREATE TABLE IF NOT EXISTS metatags(file, type, name)`)
        this.db.exec(`CREATE INDEX IF NOT EXISTS metatags_indices ON metatags(file,type)`)

        this.st_append_post = this.db.prepare(`INSERT INTO fts(file,subject,date,body) VALUES (?,?,?,?)`)
        this.st_append_metatag = this.db.prepare(`INSERT INTO metatags(file,type,name) VALUES (?,?,?)`)
    }

    escape(raw) {
        let s = this.db.prepare('SELECT quote(?)')
        let r = s.get(raw)['quote(?)']
        s.close()
        return r
    }

    append_post(fm) {
        this.st_append_post.run(fm.file, fm.subject, fm.date, fm.body)
    }

    append_metatags(file, type, list) {
        list.forEach(val => this.st_append_metatag.run(file, type, val))
    }

    append(fm) {
        this.append_post(fm)
        this.append_metatags(fm.file, 'author', fm.authors)
        this.append_metatags(fm.file, 'tag', fm.tags)
    }
}

let DEBUG = process.env.DEBUG === '1'

function main() {
    let args; try {
        args = util.parseArgs({allowPositionals: true, options: {
            q: { type: 'boolean' }, tokenizer: { type: 'string' },
            o: { type: 'string' }, s: { type: 'string' },
        }})
    } catch (err) {
        console.error(err.message)
        usage()
    }

    if ( !(args.values.o && args.positionals.length)) usage()

    let db; try {
        db = new DB(args.values.o, args.values.tokenizer)
    } catch (e) {
        errx(args.values.o+":", e.message)
    }

    for (let file of args.positionals) {
        try {
            let text = fs.readFileSync(file).toString()
            let fm = md_parse(text, file, args.values)
            db.append(fm)
        } catch (e) {
            errx(file+":", DEBUG ? e : e.message)
        }
    }
}

if (import.meta.main) main()
