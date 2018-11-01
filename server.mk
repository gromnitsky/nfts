.PHONY: server
server: kill
	./fts-server $(db) &

.PHONY: kill
kill:
	-pkill -f 'node ./fts-server $(db)'
