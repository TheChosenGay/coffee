package chat

import (
	"context"
	"errors"
	"sync"

	"github.com/TheChosenGay/coffee/service/store"
)

type OnlineRoomService interface {
	GetOnlineRoom(ctx context.Context, roomId int) (*OnlineRoom, error)
	OnlineRoom(ctx context.Context, room *OnlineRoom) error
	OfflineRoom(ctx context.Context, roomId int) error
}

type defaultOnlineRoomService struct {
	roomStore store.RoomStore

	mx          sync.Mutex
	onlineRooms map[int]*OnlineRoom
}

func NewDefaultOnlineRoomService(roomStore store.RoomStore) OnlineRoomService {
	return &defaultOnlineRoomService{
		onlineRooms: make(map[int]*OnlineRoom),
		mx:          sync.Mutex{},
		roomStore:   roomStore,
	}
}

func (s *defaultOnlineRoomService) GetOnlineRoom(ctx context.Context, roomId int) (*OnlineRoom, error) {
	s.mx.Lock()
	defer s.mx.Unlock()
	room, ok := s.onlineRooms[roomId]
	if !ok {
		return nil, errors.New("room not found")
	}
	return room, nil
}

func (s *defaultOnlineRoomService) OnlineRoom(ctx context.Context, room *OnlineRoom) error {
	s.mx.Lock()
	defer s.mx.Unlock()
	s.onlineRooms[room.RoomId] = room
	return nil
}

func (s *defaultOnlineRoomService) OfflineRoom(ctx context.Context, roomId int) error {
	s.mx.Lock()
	defer s.mx.Unlock()
	delete(s.onlineRooms, roomId)
	return nil
}
