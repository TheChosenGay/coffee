package store

import (
	"context"

	"github.com/TheChosenGay/coffee/types"
)

type CoffeeStore interface {
	ListCoffees(ctx context.Context) ([]types.Coffee, error)
	GetCoffeeById(ctx context.Context, id int) (types.Coffee, error)
}

type RoomStore interface {
	// room
	CreateRoom(ctx context.Context, room types.Room) error
	GetRoom(ctx context.Context, id int) (types.Room, error)
	DeleteRoom(ctx context.Context, id int) error
	UpdateRoom(ctx context.Context, room types.Room) error
	ListRoom(ctx context.Context) ([]*types.Room, error)
}

type UserStore interface {
	// user
	StoreUser(context.Context, types.User) error
	DeleteUser(ctx context.Context, id int) error
	GetUser(ctx context.Context, id int) (types.User, error)
	ListUser(ctx context.Context) ([]types.User, error)
}
