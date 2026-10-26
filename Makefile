$(if $(db),,$(error db= is missing))

cmd := "`pwd`/nfts-server.js" $(db)
server: kill; node $(cmd) &
kill:; -pkill -f "node $(cmd)"

md := test/data/
add:
	find $(md) -type f | xargs -r ./nfts-add.js -o $(db) -s $(md)
