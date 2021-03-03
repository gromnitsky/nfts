'use strict';
let minimist = require('minimist')
let shellparse = require('shell-quote').parse

class Finder {
    constructor(db) { this.db = db }
    metatags() {
	if (this._metatags) return this._metatags
	return this._metatags = this.db.prepare('SELECT * FROM metatags').all()
    }
    static argv_parse(argv) {
	return minimist(argv, {
	    string: ['d', 'a', 't', 'A', 'T', 'db' /* cli only */]
	})
    }
    static query_parse(str) { return Finder.argv_parse(split_like_shell(str)) }

    // FIXME: add -d, -t, -T, -a, -A support
    find(query) {
	let argv = Finder.query_parse(query)
        let fts = this.db.prepare(`SELECT file,subject,date,snippet(fts,3,'<b>','</b>','...',64) AS snippet from fts WHERE fts.body MATCH ? ORDER BY rank LIMIT 100`)
	return fts.all(argv._.join(' ')).map( post => {
	    let mt = this.metatags().filter( v => v.file === post.file)
	    post.authors = mt.filter( v => v.type === 'author').map(v => v.name)
	    post.tags = mt.filter( v => v.type === 'tag').map( v => v.name)
	    return post
	})
    }
}
Finder.help = `QUERY: [-d from-to] [-a author] [-A author] [-t tag] [-T tag] phrase`

module.exports = Finder

function split_like_shell(s) {
    if (!s) return []
    return shellparse(s)
	.map( v => is_obj(v) && v.op === 'glob' ? v.pattern : v)
	.filter( v => !is_obj(v))
}

function is_obj(o) { return o === Object(o) }
