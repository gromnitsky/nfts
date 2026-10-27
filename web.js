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
        this.post_href = fn_post_href || (v => v)
        this.author_href = fn_author_href || (v => v)
        this.tag_href = fn_tag_href || (v => v)
    }

    static #counter = 0

    is_hidden() {
        return this.node.classList.contains(`${this.object_id}--hidden`)
    }

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
        this.node.innerHTML= `
<input type="search" placeholder="Search..." spellcheck="false">
<div></div>
<style>
  .${this.object_id}--hidden { display: none; }
  #${this.object_id} > div { margin-top: 1em; }
  #${this.object_id} table { table-layout: fixed; width: 100%; }
  #${this.object_id} table th:first-child { width: 7em; }
  #${this.object_id} table td { word-wrap: break-word; }
  #${this.object_id} table td p { margin: 0; }
</style>
`
        this.input = this.node.querySelector('input')
        this.input.oninput = debounce(this.search, this.conf.debounce || 500).bind(this)
        this.output = this.node.querySelector('div')
    }

    search() {
        let q = this.input.value.trim()
        if (q === this.prev_query || q.length < 3) return

        this.abort_controller?.abort()
        this.abort_controller = new AbortController()

        this.prev_query = q
        this.output.innerText = 'Fetching results...'
        this.send(q, this.abort_controller.signal)
            .then(this.draw_results.bind(this))
            .catch(this.search_error.bind(this))
    }

    send(query, signal) {
        let url = `${this.conf.server}/?q=${encodeURIComponent(query)}`
        return fetch_json(url, { signal })
    }

    search_error(e) {
        if (e?.name === 'AbortError') return
        this.prev_query = null
        this.output.innerText = e?.res?.status === 400 ? 'Invalid query' : e.message
    }

    draw_results(r) {
        if (!r.length) { this.output.innerText = 'No matches'; return }
        let tbl = ['<table>',
                   '<thead><tr>',
                   '<th>Air Date</th>',
                   '<th>Snippet</th>',
                   '</tr></thead><tbody></tbody></table>']
        this.output.innerHTML = tbl.join("\n") + `<p>Total: ${r.length}</p>`

        this.output.querySelector('table tbody')
            .append(...r.map( e => this.row(e)))
    }

    row(e) {
        let tr = document.createElement('tr')

        let td1 = document.createElement('td')
        td1.style.verticalAlign = 'top'
        td1.textContent = date_fmt(e.date * 1000)
        tr.appendChild(td1)

        let td2 = document.createElement('td')
        let p = document.createElement('p')
        render_snippet_into(p, e.snippet)
        td2.append(
            link(this.post_href(e), e.subject),
            p,
            'A: ',
            ...commaify(e.authors.map( v => link(this.author_href(v), v))),
            document.createElement('br'),
            'T: ',
            ...commaify(e.tags.map( v => link(this.tag_href(v), v))),
        )
        tr.appendChild(td2)
        return tr
    }
}

function link(href, text) {
    if (href === text) return document.createTextNode(text)
    let a = document.createElement('a')
    a.href = href
    a.textContent = text
    return a
}

function fetch_json(url, opt) {
    let validate = r => {
        if (r.ok) return r
        let e = new Error(r.statusText); e.res = r
        throw e
    }
    return fetch(url, opt).then(validate).then( r => r.json())
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
            bold = container.appendChild(document.createElement('mark'))
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
