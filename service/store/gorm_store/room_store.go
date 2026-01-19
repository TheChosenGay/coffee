package gorm_store

import (
	"context"

	"github.com/TheChosenGay/coffee/service"
	"github.com/TheChosenGay/coffee/types"
	"gorm.io/gorm"
)

type RoomModel struct {
	gorm.Model
	types.Room
}

type gormRoomStore struct {
	db        *gorm.DB
	idService service.IdService
}

func NewGormRoomStore(db *gorm.DB) *gormRoomStore {
	return &gormRoomStore{db: db}
}

func (s *gormRoomStore) CreateRoom(ctx context.Context, room types.Room) error {

	roomModel := RoomModel{
		Room: room,
	}
	result := s.db.Create(&roomModel)
	if result.Error != nil {
		return result.Error
	}
	return nil
}

func (s *gormRoomStore) GetRoom(ctx context.Context, id int) (types.Room, error) {
	var room RoomModel
	result := s.db.Where("room_id = ?", id).First(&room)
	if result.Error != nil {
		return types.Room{}, result.Error
	}
	return room.Room, nil
}

func (s *gormRoomStore) DeleteRoom(ctx context.Context, id int) error {
	result := s.db.Where("room_id = ?", id).Delete(&RoomModel{})
	if result.Error != nil {
		return result.Error
	}
	return nil
}

func (s *gormRoomStore) UpdateRoom(ctx context.Context, room types.Room) error {
	roomModel := RoomModel{
		Room: room,
	}
	result := s.db.Model(&RoomModel{}).Where("room_id = ?", room.RoomId).Updates(roomModel)
	if result.Error != nil {
		return result.Error
	}
	return nil
}

func (s *gormRoomStore) ListRoom(ctx context.Context) ([]*types.Room, error) {
	var rooms []RoomModel
	result := s.db.Find(&rooms)

	if result.Error != nil {
		return []*types.Room{}, result.Error
	}
	retRooms := make([]*types.Room, len(rooms))
	for i, room := range rooms {
		retRooms[i] = &room.Room
	}
	return retRooms, nil
}
