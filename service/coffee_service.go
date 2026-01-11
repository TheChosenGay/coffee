package service

import (
	"context"
	"errors"

	"github.com/TheChosenGay/coffee/types"
)

type CoffeeService interface {
	ListCoffees(ctx context.Context) ([]types.Coffee, error)
	GetCoffeeById(ctx context.Context, id int) (types.Coffee, error)
	GetCoffeeByName(ctx context.Context, name string) (types.Coffee, error)
}

// MOCK: Coffee
var coffees = []types.Coffee{
	{Id: 1, Name: "Coffee 1", CoverUrl: "https://example.com/coffee1.jpg", Category: "Coffee"},
	{Id: 2, Name: "Coffee 2", CoverUrl: "https://example.com/coffee2.jpg", Category: "Coffee"},
	{Id: 3, Name: "Coffee 3", CoverUrl: "https://example.com/coffee3.jpg", Category: "Coffee"},
}

type coffeeService struct {
}

func NewCoffeeService() CoffeeService {
	return &coffeeService{}
}

func (s *coffeeService) ListCoffees(ctx context.Context) ([]types.Coffee, error) {
	return coffees, nil
}

func (s *coffeeService) GetCoffeeById(ctx context.Context, id int) (types.Coffee, error) {
	var retCoffee *types.Coffee = nil
	for _, coffee := range coffees {
		if coffee.Id == id {
			retCoffee = &coffee
			break
		}
	}
	if retCoffee == nil {
		return types.Coffee{}, errors.New("coffee not found")
	}
	return *retCoffee, nil
}

func (s *coffeeService) GetCoffeeByName(ctx context.Context, name string) (types.Coffee, error) {
	var retCoffee *types.Coffee = nil
	for _, coffee := range coffees {
		if coffee.Name == name {
			retCoffee = &coffee
			break
		}
	}
	if retCoffee == nil {
		return types.Coffee{}, errors.New("coffee not found")
	}
	return *retCoffee, nil
}
