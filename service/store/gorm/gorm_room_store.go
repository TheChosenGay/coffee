package store

import (
	"context"
	"errors"

	"github.com/TheChosenGay/coffee/service"
	"github.com/TheChosenGay/coffee/types"
	"gorm.io/gorm"
)

type gormRoomStore struct {
	db        *gorm.DB
	idService service.IdService
}

func NewGormRoomStore(db *gorm.DB) *gormRoomStore {
	return &gormRoomStore{db: db}
}

func (s *gormRoomStore) CreateRoom(ctx context.Context, users []types.Unit) (int, error) {
	if len(users) > 100 {
		return 0, errors.New("room size is too large")
	}
	roomId := s.idService.GenerateRoomId()
	room := types.Room{
		RoomId:      roomId,
		State:       types.RoomStateNormal,
		MaxUnitSize: 100,
		Units:       users,
	}
	result := s.db.Create(&room)
	if result.Error != nil {
		return 0, result.Error
	}
	return roomId, nil
}

func (s *gormRoomStore) GetRoom(ctx context.Context, id int) (types.Room, error) {
	var room types.Room
	result := s.db.Where("room_id = ?", id).First(&room)
	if result.Error != nil {
		return types.Room{}, result.Error
	}
	return room, nil
}

func (s *gormRoomStore) DeleteRoom(ctx context.Context, id int) error {
	result := s.db.Where("room_id = ?", id).Delete(&types.Room{})
	if result.Error != nil {
		return result.Error
	}
	return nil
}
