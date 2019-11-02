# Naif Full Text Search

An FTS server for static blogs; uses sqlite under the hood.

    # npm -g i nfts

## Jekyll Integration

To show how a real static blog can be augmented w/ FTS, we are going
to use the repo for the RoR blog:

~~~
$ git clone https://github.com/rails/weblog.git
$ cd weblog
$ bundle install
$ jekyll s --no-watch
~~~

Open http://127.0.0.1:4000 to browse the blog.

From a diff terminal:

~~~
$ cd weblog
$ nfts-create -o db.sqlite3 -p _posts/ _posts/*
$ nfts-server db.sqlite3
~~~

To test the server:

    $ curl 'http://localhost:3000/?q=omg'

This should return an array of snippets.

Now

1. Edit `_includes/navigation.html` to add a link that is going to
   invoke a search dialog:

        <li><a id="nfts__dialog_toggle" href="#">Search</a></li>

2. Copy `web.js` file from the nfts installation dir to `weblog` dir &
   rename it to `nfts.js`. It's an es6 UMD w/ 0 dependencies.

3. Add to `_config.yml`:

    ~~~
    nfts:
      dialog_toggle_btn: '#nfts__dialog_toggle'
      parent_container: 'main > article'
      server: http://localhost:3000
      debounce: 200
    ~~~

4. Add the nfts initialisation to `_includes/navigation.html`:

    ~~~
    <script src="/nfts.js"></script>
    <script>
    document.addEventListener('DOMContentLoaded', () => {
      new NftsDialog(JSON.parse('{{site.nfts | jsonify }}'),
                    file => { // post
                      let prefix = NftsDialog.date_fmt(file.slice(0,10))
                      let basename = file.slice(10+1).replace(/\.[^.]+$/, '')
                      return '{{site.url}}' + '/' + prefix + '/' + basename
                    })
    })
    </script>
    ~~~

nfts integration is complete. Restart Jekyll, make sure it has
completed the site regeneration & refresh the blog page in the
browser, click "Search" & type "omg" (you don't need to press Enter).

## API

TODO.

## License

MIT
