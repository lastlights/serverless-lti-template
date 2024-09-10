.PHONY:	build-LambdaLayer

build-LambdaLayer:
	mkdir -p "$(ARTIFACTS_DIR)/nodejs/node_modules"
	cp package.json package-lock.json "$(ARTIFACTS_DIR)/nodejs/"
	npm install --production --prefix "$(ARTIFACTS_DIR)/nodejs/"
	# iterate over all directories in the current directory and build them
	for f in */; do \
		if [ "$$f" != "node_modules/" ]; then \
			$(MAKE) -C "$$f"; \
		fi; \
	done