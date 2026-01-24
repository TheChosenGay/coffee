# Coffee

## Introduction

Coffee is a micro-service implemented by go for coffee trade. 


## Feature

+ json over http 
+ grpc 
+ websocket for chat
+ container by docker
+ JWT Auth


## usage

### 1. start server

Run coffee server is easy.
```shell
make run # start coffee server
```


### 2. start client
For now, coffee client only supports list all coffees by grpc.

```shell
make client-run
```

### 3. docker

Coffee supports docker container using cmd, you can build docker image with:

```shell
make docker-build
```


## Author

rick