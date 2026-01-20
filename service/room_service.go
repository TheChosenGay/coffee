package service

import (
	"context"

	"github.com/TheChosenGay/coffee/types"
)

type RoomService interface {
	CreateRoomBySize(ctx context.Context, maxUnitSize int) (int, error)
	ListRoom(ctx context.Context) ([]*types.Room, error)
	DeleteRoom(ctx context.Context, roomId int) error

	BanRoom(ctx context.Context, roomId int) error
	UnBanRoom(ctx context.Context, roomId int) error

	JoinRoom(ctx context.Context, roomId int, unitId int) error
	QuitRoom(ctx context.Context, roomId int, unitId int) error

	GetRoomUnits(ctx context.Context, roomId int) ([]types.Unit, error)
}
