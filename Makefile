build:
	@go build -o bin/coffee
	@chmod +x bin/coffee

run: build
	@./bin/coffee
	
test:
	@go test -v ./...
	
clean:
	@rm -rf ./bin
	

.PHONY: build test clean