package chat

import (
	"context"

	"github.com/TheChosenGay/coffee/internal"
	"github.com/TheChosenGay/coffee/proto/chat_service"
	"github.com/sirupsen/logrus"
	"google.golang.org/protobuf/proto"
)

type OnlineUser struct {
	UserId   int
	UserName string
	Conn     internal.Conn
	ChatSrv  ChatService
}

func (u *OnlineUser) ReceiveMsg(msg []byte) error {
	chatMsg, err := u.UnmarshalMsg(msg)
	if err != nil {
		return err
	}

	logrus.WithFields(logrus.Fields{
		"user_id":   u.UserId,
		"user_name": u.UserName,
		"target_id": chatMsg.TargetId,
		"contents":  chatMsg.Contents,
		"is_user":   chatMsg.IsUser,
	}).Info("received message")

	if chatMsg.IsUser {
		err = u.ChatSrv.SendMsgToUser(context.Background(), int(chatMsg.TargetId), chatMsg)
	} else {
		err = u.ChatSrv.SendMsgToRoom(context.Background(), int(chatMsg.TargetId), chatMsg)
	}
	if err != nil {
		return err
	}

	return nil
}

func (u *OnlineUser) SendMsg(msg *chat_service.ChatMessage) error {
	marshaledMsg, err := proto.Marshal(msg)
	if err != nil {
		return err
	}
	if err := u.Conn.Send(marshaledMsg); err != nil {
		return err
	}
	logrus.WithFields(logrus.Fields{
		"user_id":   u.UserId,
		"user_name": u.UserName,
		"target_id": msg.TargetId,
		"contents":  msg.Contents,
		"is_user":   msg.IsUser,
	}).Info("sent message")
	return nil
}

func (u *OnlineUser) PushMsg(msg *chat_service.ChatMessage) error {
	marshaledMsg, err := proto.Marshal(msg)
	if err != nil {
		return err
	}
	u.Conn.Push(marshaledMsg)
	return nil
}

func (u *OnlineUser) UnmarshalMsg(msg []byte) (*chat_service.ChatMessage, error) {
	chatMessage := &chat_service.ChatMessage{}
	if err := proto.Unmarshal(msg, chatMessage); err != nil {
		return nil, err
	}
	return chatMessage, nil
}
