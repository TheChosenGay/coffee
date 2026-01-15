package service

import (
	"context"
	"errors"

	"github.com/TheChosenGay/coffee/proto/chat_service"
	"github.com/TheChosenGay/coffee/types"
)

type RoomService interface {
	CreateRoomBySize(ctx context.Context, maxUnitSize int) (int, error)
	CreateRoom(ctx context.Context, users []types.Unit) error
	ListRoom(ctx context.Context) ([]*types.Room, error)
	DeleteRoom(ctx context.Context, roomId int) error

	BanRoom(ctx context.Context, roomId int) error
	UnBanRoom(ctx context.Context, roomId int) error

	JoinRoom(ctx context.Context, unit types.Unit, roomId int) error
	QuitRoom(ctx context.Context, unit types.Unit, roomId int) error
}

type roomService struct {
	roomStore RoomStoreService
	idService IdService
}

func NewRoomService(roomStore RoomStoreService, idService IdService) RoomService {
	return &roomService{roomStore: roomStore, idService: idService}
}

func (s *roomService) CreateRoom(ctx context.Context, users []types.Unit) error {
	if len(users) > 100 {
		return errors.New("room size is too large")
	}
	roomId := s.idService.GenerateId()
	room := types.Room{
		RoomId:      roomId,
		State:       types.RoomStateNormal,
		MaxUnitSize: 100,
		Units:       users,
	}
	err := s.roomStore.CreateRoom(ctx, room)
	if err != nil {
		return err
	}
	return nil
}

func (s *roomService) DeleteRoom(ctx context.Context, roomId int) error {
	room, err := s.roomStore.GetRoom(ctx, roomId)
	if err != nil {
		return err
	}

	msg := types.NewSignalMessage(types.SignalTypeRoomDeleted, roomId, 0, []*chat_service.Content{})
	for _, unit := range room.Units {
		go unit.ReceiveMsg(msg)
	}

	return s.roomStore.DeleteRoom(ctx, roomId)
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

func (s *roomService) JoinRoom(ctx context.Context, unit types.Unit, roomId int) error {
	room, err := s.roomStore.GetRoom(ctx, roomId)
	if err != nil {
		return err
	}
	room.Units = append(room.Units, unit)
	unit.SetRole(roomId, types.Member)
	unit.ReceiveMsg(types.NewSignalMessage(types.SignalTypeRoomJoined, roomId, unit.Id(), []*chat_service.Content{}))

	return s.roomStore.UpdateRoom(ctx, room)
}

func (s *roomService) QuitRoom(ctx context.Context, unit types.Unit, roomId int) error {
	return nil
}

func (s *roomService) CreateRoomBySize(ctx context.Context, maxUnitSize int) (int, error) {
	roomId := s.idService.GenerateId()
	room := types.Room{
		RoomId:      roomId,
		State:       types.RoomStateNormal,
		MaxUnitSize: maxUnitSize,
		Units:       []types.Unit{},
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
