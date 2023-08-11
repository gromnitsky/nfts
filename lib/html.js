import {parseFragment} from 'parse5'
import html_ent_decode from 'ent/decode.js'

export function html_grab_text_nodes() {
    let texts = []
    return function walk(kids) {
	(kids.childNodes || kids).forEach( node => {
	    if (/^(head|script|style)$/.test(node.nodeName)) return
	    if (node.nodeName === '#text') texts.push(node.value)
	    if (node.childNodes) walk(node.childNodes)
	})
	return texts
    }
}

export function html_strip(html) {
    if (!html) return ""
    let doc = parseFragment(html)
    return html_grab_text_nodes()(doc).join(' ')
}

export function html2text(html) {
    if (!html) return ""
    return html_ent_decode(html_strip(html).replace(/\s+/g, ' ').trim())
}

export function silly_escape(s) {
    let m = {
        '<': '‹',         // single left-pointing angle quotation mark
        '>': '›',         // single right-pointing ...
        '&': '\uA778'     // latin small letter um
    }
    return (s ?? '').replace(/[&<>]/g, k => m[k])
}
