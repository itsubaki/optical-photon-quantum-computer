SHELL := /bin/bash
PORT ?= 3001

.PHONY: run test
run:
	python3 -m http.server $(PORT) --bind 127.0.0.1 --directory public

test:
	npm test
