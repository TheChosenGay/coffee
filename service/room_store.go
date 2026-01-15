package service

import (
	"context"

	"github.com/TheChosenGay/coffee/types"
)

type RoomStoreService interface {
	CreateRoom(ctx context.Context, room types.Room) error
	GetRoom(ctx context.Context, id int) (types.Room, error)
	DeleteRoom(ctx context.Context, id int) error
	UpdateRoom(ctx context.Context, room types.Room) error
	ListRoom(ctx context.Context) ([]*types.Room, error)
}
