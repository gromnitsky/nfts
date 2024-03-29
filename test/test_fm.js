#!/usr/bin/env -S mocha --ui=tdd

import {strict as assert} from 'assert'
import * as fts from '../nfts-create.js'

suite('frontmatter parsing', function() {
    test('blank', function() {
	assert.deepEqual(fts.parse('2000-01-01.md')(''), {
	    authors: ['anonymous'],
	    body: 'Untitled ',
	    date: 946684800,
	    file: '2000-01-01.md',
	    subject: 'Untitled',
	    tags: ['untagged']
	})
    })

    test('w/o prefix', function() {
	assert.deepEqual(fts.parse('/foo/2000-01-01.md')(`---
subject: ' 	'
author:
- ' bob   '
- alice
categories: ['  ', 'FOO1  ', null, undefined, ['bar', ['baz', 0]]]
---
`), { authors: ['bob', 'alice'],
      body: 'Untitled ',
      date: 0,
      file: '/foo/2000-01-01.md',
      subject: 'Untitled',
      tags: ['foo1', 'undefined', 'bar', 'baz', '0']
    })
    })

    test('w/ prefix', function() {
	assert.deepEqual(fts.parse('/foo/2000-01-01.md', '/foo/')(), {
	    authors: ['anonymous'],
	    body: 'Untitled ',
	    date: 946684800,
	    file: '2000-01-01.md',
	    subject: 'Untitled',
	    tags: ['untagged']
	})
    })

    test('fm has a date', function() {
	assert.deepEqual(fts.parse('2000-01-01.md')(`---
date: 1990-01-01
---
`), {
	    authors: ['anonymous'],
	    body: 'Untitled ',
	    date: '631152000', // 1990-01-01
	    file: '2000-01-01.md',
	    subject: 'Untitled',
	    tags: ['untagged']
	})
    })
})
