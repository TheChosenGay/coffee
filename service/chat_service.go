package service

import (
	"context"

	"github.com/TheChosenGay/coffee/p2p"
	"github.com/TheChosenGay/coffee/proto/chat_service"
	"github.com/TheChosenGay/coffee/types"
)

type ChatService interface {
	JoinChat(ctx context.Context, user types.User, conn p2p.Conn) error
	SendMessageToRoom(ctx context.Context, roomId int, message *chat_service.Message) error
	SendMessageToUser(ctx context.Context, targetUserId int, message *chat_service.Message) error
}
