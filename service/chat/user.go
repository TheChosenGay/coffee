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
	msgStore service.UserStoreService
	// underling transport
	conn p2p.Conn

	chatService service.ChatService
}

func NewChatUser(user types.User, conn p2p.Conn, chatService service.ChatService) *ChatUser {
	chatUser := &ChatUser{
		User:        user,
		conn:        conn,
		chatService: chatService,
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
		return chatUser.SendMessage(context.Background(), chatMsg)
	})

	return chatUser
}

func (u *ChatUser) Id() int {
	return u.UserId
}

func (u *ChatUser) NickName() string {
	return u.Nickname
}

func (u *ChatUser) ReceiveMsg(msg *chat_service.Message) error {
	if int(msg.SenderId) == u.UserId {
		return errors.New("cannot receive message from yourself")
	}
	marshaledMsg, err := proto.Marshal(msg)
	if err != nil {
		return err
	}
	u.conn.Send(marshaledMsg)
	return nil
}

func (u *ChatUser) SendMessage(ctx context.Context, msg *chat_service.Message) error {
	if _, ok := u.userRoles[int(msg.RoomId)]; !ok {
		fmt.Printf("user %d is not a member of room %d", u.UserId, msg.RoomId)
		return errors.New("user is not a member of room")
	}
	msg.SenderId = int32(u.UserId)

	return u.chatService.SendMessageToRoom(context.Background(), int(msg.RoomId), msg)
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
