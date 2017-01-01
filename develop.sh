#!/bin/sh
#
# develop [<username>] [<password>]
#
# Serves development TW5 over HTTP at localhost:8080
#
TIDDLYWIKI_PLUGIN_PATH=src/plugins \
tiddlywiki \
	./*wiki \
	--verbose \
	--server 8087 $:/core/save/all text/plain text/html '' '' 0.0.0.0

