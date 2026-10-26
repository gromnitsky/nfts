const CN = 'nfts__frame'

export class Frame {
    constructor(conf, fn_post_href, fn_author_href, fn_tag_href) {
        this.object_id = CN + ++Frame.#counter
        this.parent = document.querySelector(conf.container)
        let btn = document.querySelector(conf.toggle_button)
        if (!(this.parent && btn))
            throw new Error('no container or toggle_button specified')

        btn.onclick = evt => { this.toggle(); evt.preventDefault() }

        this.conf = conf
        Object.assign(this, {fn_post_href, fn_author_href, fn_tag_href})
    }

    static #counter = 0

    is_hidden() { return this.node.classList.contains(`${this.object_id}--hidden`) }
    focus() { if (!this.is_hidden()) this.input.focus() }

    toggle() {
        if (!this.node)
            this.inject()
        else
            this.node.classList.toggle(`${this.object_id}--hidden`)
        this.focus()
    }

    inject() {
        console.log(`${this.object_id}: inject`)
        this.node = document.createElement('div')
        this.node.id = this.object_id
        this.node.classList.add(CN)

        this.parent.prepend(this.node) // FIXME
        this.node.innerHTML= '<input type="search" placeholder="Search..." spellcheck="false"><div></div>'
        this.input = this.node.querySelector('input')
        this.output = this.node.querySelector('div')

        this.input.oninput = debounce(this.search, this.conf.debounce || 500).bind(this)

        let style = document.createElement('style')
        style.innerHTML = `
.${this.object_id}--hidden { display: none; }
#${this.object_id} > div { margin-top: 1em; }
#${this.object_id} table td { word-wrap: break-word; }
#${this.object_id} table td p { margin: 0; }
`
        document.body.appendChild(style)
    }

    search() {
        let q = this.input.value.trim()
        if (q === this.prev_query || q.length < 3) return
        this.prev_query = q
        this.output.innerText = 'Fetching results...'
        this.send(q)
            .then(this.draw_results.bind(this))
            .catch(this.search_error.bind(this))
    }

    send(query) {
        let url = `${this.conf.server}/?q=${encodeURIComponent(query)}`
        return fetch_json(url)
    }

    search_error(e) {
        this.output.innerText = e?.res?.status === 400 ? 'Invalid query' : e.message
    }

    draw_results(r) {
        if (!r.length) { this.output.innerText = 'No matches'; return }
        let tbl = ['<table style="table-layout: fixed; width: 100%">',
                   '<thead><tr>',
                   '<th style="width: 7em">Air Date</th>',
                   '<th>Snippet</th>',
                   '</tr></thead><tbody></tbody></table>']
        this.output.innerHTML = tbl.join("\n") + `<p>Total: ${r.length}</p>`

        document.querySelector(`#${this.object_id} table`)
            .append(...r.map( e => this.row(e)))
    }

    row(e) {
        let link = (href, text) => {
            if (href === text) return document.createTextNode(text)
            let a = document.createElement('a')
            a.href = href
            a.textContent = text
            return a
        }
        let post_href = this.fn_post_href || (v => v)
        let author_href = this.fn_author_href || (v => v)
        let tag_href = this.fn_tag_href || (v => v)

        let tr = document.createElement('tr')

        let td1 = document.createElement('td')
        td1.style.verticalAlign = 'top'
        td1.textContent = date_fmt(e.date * 1000)
        tr.appendChild(td1)

        let td2 = document.createElement('td')
        let p = document.createElement('p')
        render_snippet_into(p, e.snippet)
        td2.append(
            link(post_href(e), e.subject),
            p,
            document.createTextNode('A: '),
            ...commaify(e.authors.map( v => link(author_href(v), v))),
            document.createElement('br'),
            document.createTextNode('T: '),
            ...commaify(e.tags.map( v => link(tag_href(v), v))),
        )
        tr.appendChild(td2)
        return tr
    }

}

function fetch_json(url, opt) {
    let err = r => {
        if (r.ok) return r
        let e = new Error(r.statusText); e.res = r
        throw e
    }
    return fetch(url, opt).then(err).then( r => r.json())
}

function commaify(elements) {
    let c = document.createTextNode(', ')
    return elements.flatMap( (v, idx) => idx < elements.length-1 ? [v,c] : [v])
}

export function date_fmt(t) {
    let d = new Date(t); if (isNaN(d)) d = new Date(0)
    return [d.getFullYear(), d.getMonth()+1, d.getDate()].join('/')
}

function render_snippet_into(container, snippet) {
    container.replaceChildren() // remove all children
    let bold
    for (let part of snippet.split(/(\u0002|\u0003)/)) {
        if (part === '') continue
        if (part === '\u0002') {
            bold = container.appendChild(document.createElement('b'))
            continue
        }
        if (part === '\u0003') {
            bold = null
            continue
        }
        (bold ?? container).appendChild(document.createTextNode(part))
    }
}

function debounce(fn, ms = 100) {
    let timeout_id
    return function(...args) {
        clearTimeout(timeout_id)
        timeout_id = setTimeout(() => fn.apply(this, args), ms)
    }
}
