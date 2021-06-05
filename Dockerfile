# This is the Dockerfile to get you up and running when working on tiddlypouch.
# You do not need Docker, but if you have it, this should help setting things up.
# If you do not use Docker, this file should give you hints at what you need to
# install to get started.
#
# Run these commands:
# > docker build -t tiddlypouch-dev - < Dockerfile
# > docker run --name tiddlypouch-dev -v ~/.gitconfig:/home/node/.gitconfig -v $PWD:/app -p 8087:8087 -it tiddlypouch-dev bash
#
# The last command should give you a shell inside a running container. Run these commands:
# > yarn
# > yarn start.new
#
# If you need a separate shell in the same container, run
# > docker exec -it tiddlypouch-dev bash

FROM node:lts-alpine

# Install packages needed to build and run
RUN apk add build-base python
# Needed by scripts in package.json
RUN apk add git
# Install that's nice to have
RUN apk add bash curl

VOLUME ["/app"]
WORKDIR /app

USER 1000
