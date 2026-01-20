package service

import (
	"context"
	"fmt"

	"github.com/TheChosenGay/coffee/service/store"
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
}

type roomService struct {
	roomStore store.RoomStore
	idService IdService
}

func NewRoomService(roomStore store.RoomStore, idService IdService) RoomService {
	return &roomService{roomStore: roomStore, idService: idService}
}

func (s *roomService) DeleteRoom(ctx context.Context, roomId int) error {
	// room, err := s.roomStore.GetRoom(ctx, roomId)
	// if err != nil {
	// 	return err
	// }

	// // msg := types.NewSignalMessage(types.SignalTypeRoomDeleted, roomId, 0, []*chat_service.Content{})
	// // for _, unit := range room.Units {
	// // 	go unit.SendMsg(msg)
	// // }

	// return s.roomStore.DeleteRoom(ctx, roomId)
	return nil
}

func (s *roomService) BanRoom(ctx context.Context, roomId int) error {
	room, err := s.roomStore.GetRoom(ctx, roomId)
	if err != nil {
		return err
	}
	room.State = types.RoomStateBanned
	return s.roomStore.UpdateRoom(ctx, room)
}

func (s *roomService) UnBanRoom(ctx context.Context, roomId int) error {
	room, err := s.roomStore.GetRoom(ctx, roomId)
	if err != nil {
		return err
	}
	room.State = types.RoomStateNormal
	return s.roomStore.UpdateRoom(ctx, room)
}

func (s *roomService) CreateRoomBySize(ctx context.Context, maxUnitSize int) (int, error) {
	roomId := s.idService.GenerateId()
	room := types.Room{
		RoomId:      roomId,
		State:       types.RoomStateNormal,
		MaxUnitSize: maxUnitSize,
		Units:       []int{},
	}
	err := s.roomStore.CreateRoom(ctx, room)
	if err != nil {
		return types.InvalidRoomId, err
	}
	return roomId, nil
}

func (s *roomService) ListRoom(ctx context.Context) ([]*types.Room, error) {
	return s.roomStore.ListRoom(ctx)
}

func (s *roomService) JoinRoom(ctx context.Context, roomId int, unitId int) error {
	room, err := s.roomStore.GetRoom(ctx, roomId)
	if err != nil {
		return fmt.Errorf("Failed To Join Room: %w", err)
	}
	if room.State == types.RoomStateBanned {
		return fmt.Errorf("Failed To Join Room: %w", err)
	}

	if len(room.Units) >= room.MaxUnitSize {
		return fmt.Errorf("Room Is Fulled")
	}

	room.Units = append(room.Units, unitId)

	err = s.roomStore.UpdateRoom(ctx, room)
	if err != nil {
		return fmt.Errorf("Failed To Join Room: %w", err)
	}
	return nil
}

func (s *roomService) QuitRoom(ctx context.Context, roomId int, unitId int) error {
	room, err := s.roomStore.GetRoom(ctx, roomId)
	if err != nil {
		return fmt.Errorf("Failed To Quit Room: %w", err)
	}
	room.Units = s.removeUnit(room.Units, unitId)
	err = s.roomStore.UpdateRoom(ctx, room)
	if err != nil {
		return fmt.Errorf("Failed To Quit Room: %w", err)
	}
	return nil
}

func (r *roomService) removeUnit(units []int, unitId int) []int {
	var res []int
	for _, id := range units {
		if id != unitId {
			res = append(res, id)
		}
	}
	return res
}
