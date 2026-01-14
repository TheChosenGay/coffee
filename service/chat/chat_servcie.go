package chat

import (
	"context"
	"errors"
	"log"
	"sync"

	"github.com/TheChosenGay/coffee/p2p"
	"github.com/TheChosenGay/coffee/proto/chat_service"
	"github.com/TheChosenGay/coffee/service"
	"github.com/TheChosenGay/coffee/types"
)

type chatService struct {
	roomStore service.RoomStoreService
	userStore service.UserStoreService
	users     sync.Map
}

func NewChatService(roomStore service.RoomStoreService, userStore service.UserStoreService) service.ChatService {
	return &chatService{
		roomStore: roomStore,
		userStore: userStore,
	}
}

func (s *chatService) JoinChat(ctx context.Context, user types.User, conn p2p.Conn) error {
	chatUser := NewChatUser(user, conn, s)

	s.users.Store(chatUser.Id(), chatUser)

	return nil
}

func (s *chatService) SendMessageToRoom(ctx context.Context, roomId int, message *chat_service.Message) error {
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

func (s *chatService) SendMessageToUser(ctx context.Context, targetUserId int, message *chat_service.Message) error {
	log.Printf("sending message to user %d", targetUserId)
	_, err := s.userStore.GetUser(ctx, targetUserId)
	if err != nil {
		return err
	}
	return nil
}
