init:
	yarn install
	yarn husky install

build:
	make lint
	yarn vite build

lint:
	yarn eslint .

lint.fix:
	yarn eslint . --fix

publish.preview:
	npm publish --dry-run

# make publish v=<patch | minor | major>
publish:
	make build
	yarn version $(v)
	npm publish --access public

publish.patch:
	make publish v=patch

publish.minor:
	make publish v=minor

publish.major:
	make publish v=major
