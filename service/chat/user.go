package chat

import (
	"context"
	"errors"
	"fmt"
	"log"

	"github.com/TheChosenGay/coffee/p2p"
	"github.com/TheChosenGay/coffee/proto/chat_service"
	"github.com/TheChosenGay/coffee/service"
	"github.com/TheChosenGay/coffee/types"
	"google.golang.org/protobuf/proto"
)

type UserRoomInfo struct {
	RoomId int
	Role   types.RoleType
	ch     chan types.Message
}

type ChatUser struct {
	types.User
	// userRoles reprensents the roles of the user in the room.
	// key is the room id, value is the role of the user in the room.
	userRoles map[int]*UserRoomInfo

	// store messages
	userStore service.UserStoreService
	// underling transport
	conn p2p.Conn

	messageService MessageService
}

func NewChatUser(user types.User, conn p2p.Conn, messageService MessageService) *ChatUser {
	chatUser := &ChatUser{
		User:           user,
		conn:           conn,
		messageService: messageService,
	}

	conn.OnRecvMsg(func(msg *p2p.Message) (err error) {
		defer func() {
			if err != nil {
				log.Printf("failed to receive message: %v", err)
				chatUser.conn.Send([]byte(fmt.Sprintf("failed to receive message: %v", err)))
				chatUser.conn.Close()
				return
			}
		}()
		chatMsg := &chat_service.Message{}
		if err := proto.Unmarshal(msg.Payload, chatMsg); err != nil {
			return err
		}
		userMsg := types.NewMessage(types.MessageTypeNormal, int(chatMsg.RoomId), int(chatMsg.SenderId), chatMsg.Contents)
		return chatUser.SendMessage(context.Background(), userMsg)
	})

	return chatUser
}

func (u *ChatUser) Id() int {
	return u.UserId
}

func (u *ChatUser) NickName() string {
	return u.Nickname
}

func (u *ChatUser) ReceiveMsg(msg *types.Message) error {
	if int(msg.SenderId) == u.UserId {
		return errors.New("cannot receive message from yourself")
	}

	if msg.MsgType == types.MessageTypeSignal {
		if msg.SignalType == types.SignalTypeRoomDeleted {
			u.conn.Send([]byte(fmt.Sprintf("room %d is deleted", msg.TargetId)))
			u.conn.Close()
			return nil
		} else if msg.SignalType == types.SignalTypeRoomJoined {
			log.Printf("user %d joined room %d", u.UserId, msg.TargetId)
			u.userRoles[int(msg.TargetId)] = &UserRoomInfo{
				RoomId: int(msg.TargetId),
			}
			return nil
		}
	}

	chatMsg := &chat_service.Message{
		RoomId:   int32(msg.TargetId),
		SenderId: int32(msg.SenderId),
		Contents: msg.Contents,
	}
	marshaledMsg, err := proto.Marshal(chatMsg)
	if err != nil {
		return err
	}
	u.conn.Send(marshaledMsg)
	return nil
}

func (u *ChatUser) SendMessage(ctx context.Context, msg *types.Message) error {
	if msg.Broadcast {
		if _, ok := u.userRoles[int(msg.TargetId)]; !ok {
			fmt.Printf("user %d is not a member of room %d", u.UserId, msg.TargetId)
			return errors.New("user is not a member of room")
		}
		msg.SenderId = int(u.User.UserId)

		types.NewMessage(types.MessageTypeNormal, int(msg.TargetId), int(msg.SenderId), msg.Contents)
		return u.messageService.SendMessageToRoom(context.Background(), int(msg.TargetId), types.NewMessage(types.MessageTypeNormal, int(msg.TargetId), int(msg.SenderId), msg.Contents))
	}
	return nil
}

func (u *ChatUser) SetBroadcastCh(roomId int, ch chan types.Message) {
	if _, ok := u.userRoles[roomId]; !ok {
		u.userRoles[roomId] = &UserRoomInfo{
			RoomId: roomId,
			ch:     ch,
		}
		return
	}
	u.userRoles[roomId].ch = ch
}

func (u *ChatUser) Role(roomId int) (types.RoleType, error) {
	if _, ok := u.userRoles[roomId]; !ok {
		return types.InvalidRole, errors.New("user is not a member of room")
	}
	return u.userRoles[roomId].Role, nil
}

func (u *ChatUser) SetRole(roomId int, role types.RoleType) error {
	if _, ok := u.userRoles[roomId]; !ok {
		u.userRoles[roomId] = &UserRoomInfo{
			RoomId: roomId,
			Role:   role,
		}
		return nil
	}

	u.userRoles[roomId].Role = role
	return nil
}
