package main

import (
	"log"
	"reflect"

	"github.com/TheChosenGay/coffee/api"
	"github.com/TheChosenGay/coffee/api/grpc_handler"
	"github.com/TheChosenGay/coffee/api/json_handler"
	"github.com/TheChosenGay/coffee/service"
)

func main() {
	cs := service.NewLogServiceMiddleware(service.NewCoffeeService())
	// use one coffee servive for both json and grpc
	go runJsonServer(cs)
	go runGrpcServer(cs)
	select {}
}

func runJsonServer(cs service.CoffeeService) {
	csvc := json_handler.NewJsonCoffeeServiceHandler(cs)
	jsonServer := api.NewJsonServer(":8080")
	jsonServer.RegisterHandler(reflect.TypeOf(csvc).Elem().Name(), csvc)
	if err := jsonServer.Run(); err != nil {
		log.Fatalf("failed to run json server: %v", err)
	}
}

func runGrpcServer(cs service.CoffeeService) {
	csvc := grpc_handler.NewGrpcCoffeeServiceHandler(cs)
	grpcServer := api.NewGrpcServer(":50051")
	grpcServer.RegisterHandler(reflect.TypeOf(csvc).Elem().Name(), csvc)
	if err := grpcServer.Run(); err != nil {
		log.Fatalf("failed to run grpc server: %v", err)
	}
}
