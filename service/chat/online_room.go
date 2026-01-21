package chat

import (
	"context"
	"errors"
	"sync"
	"time"

	"github.com/TheChosenGay/coffee/proto/chat_service"
	"github.com/TheChosenGay/coffee/service/store"
	"github.com/TheChosenGay/coffee/types"
	"github.com/sirupsen/logrus"
)

type OnlineRoom struct {
	RoomId      int
	RoomName    string
	broadcastCh chan *chat_service.ChatMessage

	roomStore         store.RoomStore
	userStore         store.UserStore
	onlineUserService OnlineUserService

	mx          sync.Mutex
	onlineUnits map[int]types.Unit
}

func NewOnlineRoom(roomId int, roomStore store.RoomStore, userStore store.UserStore, onlineUserService OnlineUserService) (*OnlineRoom, error) {
	r := &OnlineRoom{
		RoomId:            roomId,
		onlineUnits:       make(map[int]types.Unit),
		broadcastCh:       make(chan *chat_service.ChatMessage),
		roomStore:         roomStore,
		userStore:         userStore,
		onlineUserService: onlineUserService,
	}
	go r.broadcastLoop()
	start := time.Now()
	if err := r.fetchUnits(); err != nil {
		close(r.broadcastCh)
		return nil, err
	}
	logrus.WithFields(logrus.Fields{
		"room_id": r.RoomId,
		"time":    time.Since(start).Milliseconds(),
	}).Info("fetching units")
	return r, nil
}

func (r *OnlineRoom) AddUnit(ctx context.Context, unit types.Unit) error {
	r.mx.Lock()
	defer r.mx.Unlock()
	if _, ok := r.onlineUnits[unit.Id()]; ok {
		return errors.New("unit already in the room")
	}
	r.onlineUnits[unit.Id()] = unit
	return nil
}

func (r *OnlineRoom) RemoveUnit(ctx context.Context, unitId int) error {
	r.mx.Lock()
	defer r.mx.Unlock()
	if _, ok := r.onlineUnits[unitId]; !ok {
		return errors.New("unit not in the room")
	}
	delete(r.onlineUnits, unitId)
	return nil
}

func (r *OnlineRoom) GetUnits(ctx context.Context) ([]types.Unit, error) {
	r.mx.Lock()
	defer r.mx.Unlock()
	res := []types.Unit{}
	for _, unit := range r.onlineUnits {
		res = append(res, unit)
	}
	return res, nil
}

func (r *OnlineRoom) fetchUnits() error {
	room, err := r.roomStore.GetRoom(context.Background(), r.RoomId)
	if err != nil {
		return err
	}

	wg := sync.WaitGroup{}
	for _, unitId := range room.Units {
		wg.Add(1)
		go func(unitId int) {
			defer wg.Done()
			user, err := r.userStore.GetUser(context.Background(), unitId)
			if err != nil {
				return
			}
			if !user.IsValid() {
				logrus.Errorf("user %d is not valid", unitId)
				return
			}
			onlineUser, err := r.onlineUserService.GetOnlineUser(context.Background(), unitId)
			if err != nil || onlineUser == nil {
				return
			}
			r.mx.Lock()
			r.onlineUnits[unitId] = onlineUser
			r.mx.Unlock()
		}(unitId)
	}
	wg.Wait()

	return nil
}

func (r *OnlineRoom) BroadcastMsg(msg *chat_service.ChatMessage) error {
	r.broadcastCh <- msg
	return nil
}

func (r *OnlineRoom) broadcastLoop() {
	for msg := range r.broadcastCh {
		for _, unit := range r.onlineUnits {
			go unit.SendMsg(msg)
		}
	}
}
