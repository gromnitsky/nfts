CFLAGS := -std=c17 -Wall -Wextra -Wpedantic -g
LDFLAGS := -lsqlite3 -ljansson

nfts-create2:

server.cmd := ./nfts-server $(db)

server: kill; $(server.cmd) &
kill:; -pkill -f 'node $(server.cmd)'

.PHONY: server kill
