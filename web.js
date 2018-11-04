(function(root, factory) { /* global define */
    if (typeof define === 'function' && define.amd) {
	define([], factory)
    } else if (typeof module === 'object' && module.exports) {
	module.exports = factory()
    } else
	root.NftsDialog = factory()
}(typeof self !== 'undefined' ? self : this, function() {
    'use strict';
    class Dialog {
	constructor(conf, post_href, author_href, tag_href) {
	    document.addEventListener('DOMContentLoaded', () => {
		this.parent = document.querySelector(conf.parent_container)
		let btn = document.querySelector(conf.dialog_toggle_btn)
		if (!(this.parent && btn)) throw new Error('init')

		btn.style.visibility = 'visible'
		btn.onclick = evt => { this.toggle(); evt.preventDefault() }
	    })

	    this.conf = conf
	    this.id = 'nfts__dialog'
	    Object.assign(this, {post_href, author_href, tag_href})
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
	    let link = (href, name) => href === name ? esc(name) : `<a href='${esc(href)}'>${esc(name)}</a>`
	    let post_href = this.post_href || (v => v)
	    let author_href = this.author_href || (v => v)
	    let tag_href = this.tag_href || (v => v)
	    return [
		'<tr><td style="vertical-align: top">',
		Dialog.date_fmt(e.date * 1000),
		'</td><td>', [
		    link(post_href(e.file), e.subject),
		    e.snippet, // unescaped but must be already safe from the db
		    'A: ' + e.authors.map( v => link(author_href(v), v)).join(', '),
		    'T: ' + e.tags.map( v => link(tag_href(v), v)).join(', '),
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

    return Dialog
}));
