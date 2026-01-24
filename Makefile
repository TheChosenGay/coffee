build:
	@go build -o bin/coffee
	@chmod +x bin/coffee

run: build
	@./bin/coffee
	
test:
	@go test -v ./...
	
clean:
	@rm -rf ./bin

docker-build:
	@docker build -t coffee:latest .
	
docker-run: docker-build
	@docker run -p 8080:8080 coffee:latest
	
proto: proto/*.proto
	@protoc --go_out=./proto --go-grpc_out=./proto --proto_path=./proto proto/*.proto
	
client-build:
	@go build -o bin/client ./client/*.go
	
client-run: client-build
	@./bin/client

# Frontend commands
front-install:
	@cd front && bun install

front-dev:
	@cd front && bun run dev

front-build:
	@cd front && bun run build

# Run both backend and frontend
dev-all:
	@echo "Starting backend and frontend..."
	@make run & make front-dev

# Clear Redis cache
clear-redis:
	@go run ./cmd/clear_redis/main.go

.PHONY: build test clean proto client-build front-install front-dev front-build dev-all clear-redis
