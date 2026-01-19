package chat

import (
	"context"
	"errors"
	"log"
	"sync"

	"github.com/TheChosenGay/coffee/p2p"
	"github.com/TheChosenGay/coffee/service/store"
	"github.com/TheChosenGay/coffee/types"
)

type MessageService interface {
	JoinChat(ctx context.Context, user types.User, conn p2p.Conn) error
	SendMessageToRoom(ctx context.Context, roomId int, message *types.Message) error
	SendMessageToUser(ctx context.Context, targetUserId int, message *types.Message) error
}

type messageService struct {
	roomStore store.RoomStore
	userStore store.UserStore
	users     sync.Map
}

func NewMessageService(roomStore store.RoomStore, userStore store.UserStore) MessageService {
	return &messageService{
		roomStore: roomStore,
		userStore: userStore,
	}
}

func (s *messageService) JoinChat(ctx context.Context, user types.User, conn p2p.Conn) error {
	chatUser := NewChatUser(user, conn, s)

	s.users.Store(chatUser.Id(), chatUser)

	return nil
}

func (s *messageService) SendMessageToRoom(ctx context.Context, roomId int, message *types.Message) error {
	log.Printf("user %d sending message to room %d", message.SenderId, roomId)
	room, err := s.roomStore.GetRoom(ctx, roomId)
	if err != nil {
		return err
	}
	if room.State == types.RoomStateBanned {
		return errors.New("room is banned")
	}
	if room.State == types.RoomStateFulled {
		return errors.New("room is fulled")
	}
	for _, unit := range room.Units {
		if unit.Id() == int(message.SenderId) {
			continue
		}
		go unit.ReceiveMsg(message)
	}
	return nil
}

func (s *messageService) SendMessageToUser(ctx context.Context, targetUserId int, message *types.Message) error {
	log.Printf("sending message to user %d", targetUserId)
	_, err := s.userStore.GetUser(ctx, targetUserId)
	if err != nil {
		return err
	}
	return nil
}
