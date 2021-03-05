CFLAGS := -g -std=c17 -Wall -Wextra -Wpedantic -Wformat-truncation=0
LDFLAGS := -lsqlite3 -ljansson -lm

nfts-create2:

server.cmd := ./nfts-server $(db)

server: kill; $(server.cmd) &
kill:; -pkill -f 'node $(server.cmd)'

.PHONY: server kill
