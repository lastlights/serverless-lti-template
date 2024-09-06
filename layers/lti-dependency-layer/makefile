.PHONY: build-LambdaLayer

build-LambdaLayer:
	mkdir -p "$(ARTIFACTS_DIR)/nodejs/node_modules"
	cp package.json package-lock.json "$(ARTIFACTS_DIR)/nodejs/" # for runtime deps
	npm install --production --prefix "$(ARTIFACTS_DIR)/nodejs/" # for runtime deps
	cd lti-util && $(MAKE)