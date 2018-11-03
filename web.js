'use strict';

class NFTS_Dialog {
    constructor(conf, post_link, author_link, tag_link) {
	document.addEventListener('DOMContentLoaded', () => {
	    this.parent = document.querySelector(conf.parent_container)
	    let btn = document.querySelector(conf.dialog_toggle_btn)
	    if (!(this.parent && btn)) throw new Error('init')

	    btn.style.visibility = 'visible'
	    btn.onclick = evt => { this.toggle(); evt.preventDefault() }
	})

        this.conf = conf
	this.post_link = post_link
	this.author_link = author_link
	this.tag_link = tag_link
	this.id = 'nfts__dialog'
    }

    is_hidden() { return this.node.classList.contains('nfts__dialog--hidden') }
    focus() { if (!this.is_hidden()) this.input.focus() }

    toggle() {
        if (!this.node)
            this.init()
        else
            this.node.classList.toggle('nfts__dialog--hidden')
        this.focus()
    }

    init() {
        console.log('creating', this.id)
        this.node = document.createElement('div')
        this.node.id = this.id

        this.parent.prepend(this.node)
        this.node.innerHTML= '<input type="search" placeholder="Search..."><div></div>'
        this.input = this.node.querySelector('input')
        this.result = this.node.querySelector('div')

        this.input.oninput = debounce(this.search, this.conf.debounce || 500).bind(this)

	let style = document.createElement('style')
	style.innerHTML = `
.nfts__dialog--hidden { display: none; }
#${this.id} table td { word-wrap: break-word; }
`
	document.body.appendChild(style)
    }

    search() {
        if (/^\s*$/.test(this.input.value)) return

        this.result.innerText = 'Fetching results...'
        this.send(this.input.value)
            .then(this.print_results.bind(this))
            .catch(this.search_error.bind(this))
    }

    send(query) {
        let url = `${this.conf.server}/?q=${encodeURIComponent(query)}`
        return fetch_json(url)
    }

    search_error(e) {
        this.result.innerText = e.res && e.res.status === 412 ? 'Invalid query' : e.message
    }

    print_results(r) {
        if (!r.length) { this.result.innerText = 'No matches'; return }
        let tbl = ['<table style="table-layout: fixed; width: 100%">',
                   '<thead><tr>',
                   '<th style="width: 7em">Air Date</th>',
                   '<th>Snippet</th>',
                   '</tr></thead><tbody>']
        tbl = tbl.concat(r.map( e => this.entry_fmt(e)))
        tbl.push('</tbody></table>')
        this.result.innerHTML = tbl.join("\n") + `<p>Total: ${r.length}</p>`
    }

    entry_fmt(e) {
	let post_link = this.post_link ? this.post_link(e.file) : esc(e.file)
	let author_link = this.author_link || (v => esc(v))
	let tag_link = this.tag_link || (v => esc(v))
        return [
            '<tr><td style="vertical-align: top">',
            NFTS_Dialog.date_fmt(e.date * 1000),
            '</td><td>', [
                `<a href='${post_link}'>${esc(e.subject)}</a>`,
                e.snippet, // unescaped but must be already safe from the db
                'A: ' + e.authors.map(author_link).join(', '),
                'T: ' + e.tags.map(tag_link).join(', ')
            ].join('<br>'),
            '</td></tr>'].join('')
    }

    static date_fmt(t) {
	let d = new Date(t); if (isNaN(d)) return t
	return [d.getFullYear(), d.getMonth()+1, d.getDate()].join('/')
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

function esc(s) {
    if (s == null) return ''
    return s.toString().replace(/[<>&'"]/g, ch => {
        switch (ch) {
        case '<': return '&lt;'
        case '>': return '&gt;'
        case '&': return '&amp;'
        case '\'': return '&apos;'
        case '"': return '&quot;'
        }
    })
}


// from underscore.js 1.8.3
function debounce(func, wait, immediate) {
    var timeout, args, context, timestamp, result;

    var later = function() {
	var last = Date.now() - timestamp;

	if (last < wait && last >= 0) {
	    timeout = setTimeout(later, wait - last);
	} else {
	    timeout = null;
	    if (!immediate) {
		result = func.apply(context, args);
		if (!timeout) context = args = null;
	    }
	}
    };

    return function() {
	context = this;
	args = arguments;
	timestamp = Date.now();
	var callNow = immediate && !timeout;
	if (!timeout) timeout = setTimeout(later, wait);
	if (callNow) {
	    result = func.apply(context, args);
	    context = args = null;
	}

	return result;
    };
}
