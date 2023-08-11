$(if $(db),,$(error db= is missing))

cmd := "`pwd`/nfts-server.js" $(db)
server: kill; node $(cmd) &
kill:; -pkill -f "node $(cmd)"
