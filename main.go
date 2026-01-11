package main

import (
	"log"
	"reflect"

	"github.com/TheChosenGay/coffee/api"
	"github.com/TheChosenGay/coffee/api/json_handler"
	"github.com/TheChosenGay/coffee/service"
)

func main() {
	csvc := json_handler.NewJsonCoffeeServiceHandler(service.NewCoffeeService())
	jsonServer := api.NewJsonServer()
	jsonServer.RegisterHandler(reflect.TypeOf(csvc).Elem().Name(), csvc)
	if err := jsonServer.Run(); err != nil {
		log.Fatalf("failed to run json server: %v", err)
	}
}
