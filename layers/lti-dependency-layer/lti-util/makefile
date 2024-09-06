.PHONY: build-Util

build-Util:
	npm install
	mkdir -p "$(ARTIFACTS_DIR)/nodejs/node_modules/$(shell basename $(CURDIR))"
	cp package.json "$(ARTIFACTS_DIR)/nodejs/node_modules/$(shell basename $(CURDIR))"
	npm run build -- --outdir="$(ARTIFACTS_DIR)/nodejs/node_modules/$(shell basename $(CURDIR))"