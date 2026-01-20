package chat

import (
	"context"
	"fmt"

	"github.com/TheChosenGay/coffee/proto/chat_service"
)

type ChatService interface {
	SendMsgToUser(ctx context.Context, userId int, msg *chat_service.ChatMessage) error
	SendMsgToRoom(ctx context.Context, roomId int, msg *chat_service.ChatMessage) error
}

type defaultChatService struct {
	onlineUserService OnlineUserService
}

func NewDefaultChatService(onlineUserService OnlineUserService) ChatService {
	return &defaultChatService{onlineUserService: onlineUserService}
}

func (s *defaultChatService) SendMsgToUser(ctx context.Context, userId int, msg *chat_service.ChatMessage) error {
	onlineUser, err := s.onlineUserService.GetOnlineUser(ctx, userId)
	if err != nil {
		return fmt.Errorf("failed to get online user:%d, error: %w", userId, err)
	}
	return onlineUser.SendMsg(msg)
}

func (s *defaultChatService) SendMsgToRoom(ctx context.Context, roomId int, msg *chat_service.ChatMessage) error {

	return nil
}
