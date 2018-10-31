let parse5 = require('parse5')
let html_ent_decode = require('ent/decode')

let html_grab_text_nodes = function() {
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

let html_strip = function(html) {
    if (!html) return ""
    let doc = parse5.parseFragment(html)
    return html_grab_text_nodes()(doc).join(' ')
}

exports.html2text = function(html) {
    if (!html) return ""
    return html_ent_decode(html_strip(html).replace(/\s+/g, ' ').trim())
}

exports.silly_escape = function(s) {
    if (s == null) return ''
    return s.toString().replace(/[<>&]/g, ch => {
        switch (ch) {
        case '<': return '‹' // single left-pointing angle quotation mark
        case '>': return '›' // single right-pointing ...
        case '&': return 'ε' // Greek small letter epsilon
        }
    })
}
