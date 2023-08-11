#!/usr/bin/env node

import http from 'http'
import Database from 'better-sqlite3'

class Finder {
    constructor(db) { this.db = db }

    metatags(file, type) {
        return this.db.prepare(`
SELECT name
FROM metatags
WHERE metatags.file = ? AND metatags.type = ?
`).all(file, type).map( v => v.name)
    }

    search(query) {
        let fts; try {
            fts = this.db.prepare(`
SELECT file,subject,date,snippet(fts,3,'<b>','</b>','...',64) AS snippet
FROM fts
WHERE fts.body MATCH ?
ORDER BY rank LIMIT 50
`).all(query)
        } catch (err) {
            return err
        }

        return fts.map( v => {
            v.tags = this.metatags(v.file, 'tag')
            v.authors = this.metatags(v.file, 'author')
            return v
        })
    }
}

let server = http.createServer(function (req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    if (req.method !== "GET") { return err(res, "not implemented") }

    let url; try {
        url = new URL(req.url, `http://${req.headers.host}`)
    } catch {
        return err(res, 'Usage: /?q=query')
    }

    let q = url.searchParams.get('q')
    if (!q) return err(res, 'Usage: /?q=query')

    let r = finder.search(q)
    if (r instanceof Error) return err(res, r.message)

    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(r))
})

if (process.argv.length < 3) {
    console.error('Usage: PORT=1234 nfts-server db.sqlite3')
    process.exit(1)
}

let finder = new Finder(new Database(process.argv[2]))

server.listen(process.env.PORT || 3000, function() {
    console.error(`Listening: http://[${this.address().address}]:${this.address().port}`)
})

function err(res, msg, code = 400) {
    res.statusCode = code
    res.statusMessage = msg
    res.end()
}
