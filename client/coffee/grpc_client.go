package coffee

import (
	"context"
	"log"

	"github.com/TheChosenGay/coffee/proto/coffee_service"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

type CoffeeServiceClient struct {
	client coffee_service.CoffeeServiceClient
}

func NewCoffeeServiceClient(end string) *CoffeeServiceClient {
	conn, err := grpc.NewClient(end, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatalf("failed to connect to grpc server: %v", err)
	}
	client := coffee_service.NewCoffeeServiceClient(conn)
	return &CoffeeServiceClient{client: client}
}

func (c *CoffeeServiceClient) GetCoffees() ([]*coffee_service.Coffee, error) {
	ctx := context.Background()
	resp, err := c.client.ListCoffees(ctx, &coffee_service.ListCoffeesRequest{})
	if err != nil {
		return nil, err
	}
	return resp.Coffee, nil
}
