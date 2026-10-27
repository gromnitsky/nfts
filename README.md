# Naif Full Text Search

An FTS server for static blogs; uses SQLite under the hood.

Use this if

* your blog gets generated from markdown files that contain [front
  matter](https://jekyllrb.com/docs/front-matter/);
* you can run a very small Node.js server somewhere (with 0 npm
  dependencies).

## Installation

Node 24+.

    $ npm -g i nfts

## Creating a database

    $ nfts-add -o db.sqlite3 file1.md file2.md ...

The front matter in .md files is paramount: w/o it `nfts-add` won't
find a subject for a blog post, its authors, &c.

`nfts-add` appends data to the DB, so you can update it incrementally,
but usually it's easier to remove the DB file before running
`nfts-add`, & regenerate the DB every time you write a new blog post.

## Serving & querying the index

    $ nfts-server db.sqlite3

It'll print host+port values. The server only reads `q` search
parameter, & returns an array of JSON objects:

~~~
$ curl -s http://localhost:3000/?q=omg | jq
[
  {
    "file": "2019/10/06/YkrSmi.md",
    "subject": "Being early is on-time",
    "date": 1570320000,
    "snippet": "...One of the genius programmers on the database side claimed that \"\u0002OMG\u0003, Linux causes data loss...",
    "tags": [ "quote", "ойті" ],
    "authors": [ "ag" ]
  },
  {
    "file": "2017/09/12/indent-region-in-the-emacs-batch-mode.md",
    "subject": "'indent-region' in the Emacs batch mode",
    "date": 1505174400,
    "snippet": "...",
    "tags": [ "ойті" ],
    "authors": [ "ag" ]
  }
]
~~~

## Rendering search results in a browser

The package includes `web.js` module that hooks to some button on a
page, & draws an input field when a user clicks on the button.

~~~
import * as nfts from './web.js'

let conf = {
    "toggle_button": "#my-button",
    "container": "#my-div",
    "server": "http://localhost:3000",
    "debounce": 200
}

new nfts.Frame(conf)
</script>
~~~

`Frame` constructor supports additional 3 argument, each of which is a
function for calculating an href for

1. blog posts

        function post_href(entry)

    where `entry` is an object returned by `nfts-server`.

2. author pages

        function author_href(name)

    where `name` is an author name.

3. tag pages

        function tag_href(name)

    where `name` is a tag name.

You can omit all 3, but then `web.js` won't render links to whan
`nfts-server` has returned.


## Jekyll integration example

To show how a real static blog can be augmented w/ FTS, we'll use a
repo for the old RoR blog:

~~~
$ git clone https://github.com/rails/weblog.git
$ cd weblog
# use Ruby 3.1.x to run the following 2 commands,
# possibly removing Gemfile.lock first
$ bundle install
$ jekyll s --no-watch
~~~

Open http://127.0.0.1:4000 to browse the blog.

From another terminal:

~~~
$ cd weblog
$ nfts-add -o db.sqlite3 -s _posts/ _posts/*
$ nfts-server db.sqlite3
~~~

To test the server:

    $ curl 'http://localhost:3000/?q=omg'

This should return an array of snippets.

Now

1. Edit `_includes/navigation.html` to add a link for invoking a
   search dialog:

        <li><a id="my-search" href="#">Search</a></li>

2. Copy `web.js` file from the package to `weblog` dir, & rename it to
   `nfts.js`.

3. Add to `_config.yml`:

    ~~~
    nfts:
      toggle_button: '#my-search'
      container: 'main > article'
      server: http://localhost:3000
    ~~~

4. Add to `_includes/navigation.html`:

    ~~~
    import * as nfts from '/nfts.js'
    new nfts.Frame(JSON.parse('{{site.nfts | jsonify }}'),
        entry => { // post
            let date = entry.date ? entry.date*1000 : null
            let prefix = nfts.date_fmt(date || entry.file.slice(0,10))
            let basename = entry.file.slice(10+1).replace(/\.[^.]+$/, '')
            return '{{site.url}}' + '/' + prefix + '/' + basename
        },
        null,
        null)
    ~~~

The nfts integration is complete. Restart Jekyll, make sure it has
completed the site regeneration, & refresh the blog page in the
browser, then click "Search" & type "omg" (you don't need to press
Enter).

## License

MIT
