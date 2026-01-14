package service

import (
	"context"

	"github.com/TheChosenGay/coffee/types"
)

type RoomStoreService interface {
	CreateRoom(ctx context.Context, users []types.Unit) (int, error)
	GetRoom(ctx context.Context, id int) (types.Room, error)
	DeleteRoom(ctx context.Context, id int) error
}
