#!/usr/bin/env -S mocha --ui=tdd

import {strict as assert} from 'assert'
import {md_parse} from '../nfts-add.js'

suite('frontmatter parsing', function() {
    test('blank', function() {
        assert.deepEqual(md_parse('', '2000-01-01.md'), {
            authors: ['anonymous'],
            body: 'Untitled. ',
            date: 946684800,
            file: '2000-01-01.md',
            subject: 'Untitled',
            tags: ['untagged']
        })
    })

    test('w/o prefix', function() {
     assert.deepEqual(md_parse(`---
subject: '   '
author:
- ' bob   '
- alice
categories: ['  ', 'FOO1  ', null, undefined, ['bar', ['baz', 0]]]
---
`, '/foo/2000-01-01.md'), { authors: ['bob', 'alice'],
                            body: 'Untitled. ',
                            date: 0,
                            file: '/foo/2000-01-01.md',
                            subject: 'Untitled',
                            tags: ['foo1', 'undefined', 'bar', 'baz', '0']
                          })
    })

    test('w/ prefix', function() {
        assert.deepEqual(md_parse('', '/foo/2000-01-01.md', {s:'/foo/'}), {
            authors: ['anonymous'],
            body: 'Untitled. ',
            date: 946684800,
            file: '2000-01-01.md',
            subject: 'Untitled',
            tags: ['untagged']
        })
    })

    test('fm has a date', function() {
     assert.deepEqual(md_parse(`---
date: 1990-01-01
---
`, '2000-01-01.md'), {
         authors: ['anonymous'],
         body: 'Untitled. ',
         date: 631152000, // 1990-01-01
         file: '2000-01-01.md',
         subject: 'Untitled',
         tags: ['untagged']
     })
    })
})
