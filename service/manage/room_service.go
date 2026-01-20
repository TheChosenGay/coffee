package manage

import (
	"context"
	"fmt"

	"github.com/TheChosenGay/coffee/service"
	"github.com/TheChosenGay/coffee/service/chat"
	"github.com/TheChosenGay/coffee/service/store"
	"github.com/TheChosenGay/coffee/types"
	"github.com/sirupsen/logrus"
)

type roomService struct {
	roomStore         store.RoomStore
	userStore         store.UserStore
	idService         service.IdService
	onlineRoomService chat.OnlineRoomService
	onlineUserService chat.OnlineUserService
}

func NewRoomService(roomStore store.RoomStore, userStore store.UserStore, idService service.IdService, onlineRoomService chat.OnlineRoomService, onlineUserService chat.OnlineUserService) service.RoomService {
	return &roomService{roomStore: roomStore, userStore: userStore, idService: idService, onlineRoomService: onlineRoomService, onlineUserService: onlineUserService}
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

func (s *roomService) GetRoomUnits(ctx context.Context, roomId int) ([]types.Unit, error) {
	onlineRoom, err := s.onlineRoomService.GetOnlineRoom(ctx, roomId)
	if err != nil {
		return nil, err
	}
	return onlineRoom.GetUnits(ctx)

}

func (s *roomService) JoinRoom(ctx context.Context, roomId int, unitId int) error {
	if _, err := s.userStore.GetUser(ctx, unitId); err != nil {
		return fmt.Errorf("user not exit: %d, %w", unitId, err)
	}
	room, err := s.roomStore.GetRoom(ctx, roomId)
	if err != nil {
		logrus.WithError(err).Errorf("Room %d not found", roomId)
		return fmt.Errorf("Failed To Join Room: %w", err)
	}
	if room.State == types.RoomStateBanned {
		return fmt.Errorf("Failed To Join Room: %w", err)
	}

	if len(room.Units) >= room.MaxUnitSize {
		return fmt.Errorf("Room Is Fulled")
	}

	onlineRoom, err := s.onlineRoomService.GetOnlineRoom(ctx, roomId)
	if err != nil {
		logrus.Warnf("Room %d does not online", roomId)
		onlineRoom, err = chat.NewOnlineRoom(roomId, s.roomStore, s.userStore, s.onlineUserService)
		if err != nil {
			logrus.WithError(err).Errorf("Failed To Create Online Room: %d", roomId)
			return fmt.Errorf("Failed To Create Online Room: %w", err)
		}
		if err := s.onlineRoomService.OnlineRoom(ctx, onlineRoom); err != nil {
			logrus.WithError(err).Errorf("Failed To Online Room: %d", roomId)
			return err
		}
	}
	unit, err := s.onlineUserService.GetOnlineUser(ctx, unitId)
	if err != nil {
		return fmt.Errorf("user not online: %d, %w", unitId, err)
	}

	onlineRoom.AddUnit(ctx, unit)
	// TODO: add sync to room.Units.
	room.Units = append(room.Units, unitId)

	err = s.roomStore.UpdateRoom(ctx, room)
	if err != nil {
		return fmt.Errorf("Failed To Join Room: %w", err)
	}
	logrus.WithFields(logrus.Fields{
		"room_id": roomId,
		"unit_id": unitId,
	}).Info("joined room successfully")
	return nil
}

func (s *roomService) QuitRoom(ctx context.Context, roomId int, unitId int) error {
	if _, err := s.userStore.GetUser(ctx, unitId); err != nil {
		return fmt.Errorf("user not found")
	}

	room, err := s.roomStore.GetRoom(ctx, roomId)
	if err != nil {
		return fmt.Errorf("Failed To Quit Room: %w", err)
	}
	onlineRoom, err := s.onlineRoomService.GetOnlineRoom(ctx, roomId)
	if err != nil {
		return fmt.Errorf("Failed To Quit Room: %w", err)
	}

	onlineRoom.RemoveUnit(ctx, unitId)
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
