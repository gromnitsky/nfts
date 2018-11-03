srv := ./nfts-server $(db)

server: kill; $(srv) &
kill:; -pkill -f 'node $(srv)'

.PHONY: server kill
