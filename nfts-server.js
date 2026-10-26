#!/usr/bin/env node

import http from 'http'
import util from 'util'
import { DatabaseSync } from 'node:sqlite'

class Finder {
    constructor(db) {
        this.db = db
        this.st = {
            metatags: db.prepare(`
SELECT name
FROM metatags
WHERE file = ? AND type = ?
`),
            search: db.prepare(`
SELECT file,subject,date,snippet(fts,3,char(2),char(3),'...',64) AS snippet
FROM fts
WHERE body MATCH ?
ORDER BY rank LIMIT 50
`)
        }
    }

    metatags(file, type) {
        return this.st.metatags.all(file, type).map( v => v.name)
    }

    search(query) {
        let fts; try {
            fts = this.st.search.all(query)
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

function err(res, msg, code = 400) {
    res.statusCode = code
    res.statusMessage = msg?.replaceAll(/\s+/g, ' ')
    res.end()
}

function server(opt) {
    return http.createServer(function (req, res) {
        res.setHeader('Access-Control-Allow-Origin', opt.a || '*')
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
}

let usage = 'Usage: PORT=1234 nfts-server [-a CORS_origin] db.sqlite3'
let args; try {
    args = util.parseArgs({allowPositionals: true, options: {
        a: { type: 'string' },
    }})
} catch (err) {
    console.error(err.message)
    console.error(usage)
    process.exit(1)
}

if (args.positionals.length !== 1) {
    console.error(usage)
    process.exit(1)
}

let db = new DatabaseSync(args.positionals[0], { readOnly: true })
let finder = new Finder(db)
server(args.values).listen(process.env.PORT || 3000, function() {
    let addr = this.address()
    console.error(`Listening: http://[${addr.address}]:${addr.port}`)
})
