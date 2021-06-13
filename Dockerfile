# This is the Dockerfile to get you up and running when working on tiddlypouch.
# You do not need Docker, but if you have it, this should help setting things up.
# If you do not use Docker, this file should give you hints at what you need to
# install to get started.
#
# Run these commands:
# > docker build -t tiddlypouch-dev - < Dockerfile
# > wget https://raw.githubusercontent.com/tkp1n/chromium-ci/master/seccomp/chromium.json
# > docker run --security-opt seccomp=chromium.json --name tiddlypouch-dev -v ~/.gitconfig:/home/node/.gitconfig -v $PWD:/app -p 8087:8087 -it tiddlypouch-dev bash
#
# The last command should give you a shell inside a running container. Run these commands:
# > yarn
# > yarn start.new
#
# If you need a separate shell in the same container, run
# > docker exec -it tiddlypouch-dev bash

# The beginning of this Dockerfile was taken from
# https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md#running-puppeteer-in-docker
# Further enlightenment found on https://ndportmann.com/chrome-in-docker/
FROM node:12-slim

RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends

# Needed by scripts in package.json
RUN apt-get install -y git
# Needed to run chrome (for puppeteer)
RUN apt-get install -y libxtst6
# Install that's nice to have
RUN apt-get install -y bash curl

VOLUME ["/app"]
WORKDIR /app

USER 1000
