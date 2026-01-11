package main

import (
	"fmt"
	"log"
	"time"

	"github.com/TheChosenGay/coffee/client/coffee"
)

func main() {
	coffeeClient := coffee.NewCoffeeServiceClient(":50051")
	for {
		time.Sleep(3 * time.Second)
		coffees, err := coffeeClient.GetCoffees()
		if err != nil {
			log.Fatalf("failed to get coffees: %v", err)
			return
		}
		fmt.Println(coffees)
	}
}
