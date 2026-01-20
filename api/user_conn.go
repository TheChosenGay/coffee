package api

import (
	"context"
	"errors"
	"log"
	"sync"

	"github.com/TheChosenGay/coffee/internal"
	"github.com/TheChosenGay/coffee/internal/ws"
	"github.com/TheChosenGay/coffee/service/chat"
	"github.com/TheChosenGay/coffee/service/store"
	"github.com/sirupsen/logrus"
)

type WsServerOpts struct {
	ListenAddr string
	UserStore  store.UserStore
}

type UserConnServer struct {
	opts      WsServerOpts
	transport internal.Transport
	close     chan chat.OnlineUser

	userStore   store.UserStore
	chatService chat.ChatService

	onlineUsers map[string]*chat.OnlineUser

	mx               sync.Mutex
	onlineUsersIdMap map[int]*chat.OnlineUser
}

func NewUserConnServer(opts WsServerOpts) *UserConnServer {
	s := &UserConnServer{
		opts: opts,
		transport: ws.NewWsTransport(ws.WsTransportOpts{
			ListenAddr: opts.ListenAddr,
		}),
		userStore:        opts.UserStore,
		onlineUsers:      make(map[string]*chat.OnlineUser),
		onlineUsersIdMap: make(map[int]*chat.OnlineUser),
	}

	chatService := chat.NewDefaultChatService(s)
	s.chatService = chatService

	s.transport.OnRecvConn(func(conn internal.Conn) {
		user, err := s.userStore.GetUser(context.Background(), conn.UserId())
		if err != nil || !user.IsValid() {
			conn.Send([]byte("User not found"))
			conn.Close()
			return
		}

		onlineUser := chat.OnlineUser{
			Conn:     conn,
			UserId:   conn.UserId(),
			UserName: user.Nickname,
			ChatSrv:  s.chatService,
		}
		conn.OnRecvMsg(onlineUser.ReceiveMsg)

		s.onlineUsers[conn.RemoteAddr()] = &onlineUser
		s.onlineUsersIdMap[conn.UserId()] = &onlineUser

		logrus.WithFields(logrus.Fields{
			"user_name": user.Nickname,
			"user_id":   conn.UserId(),
		}).Info("user connected")
	})

	s.transport.OnCloseConn(s.clearClosedConn)
	return s
}

func (s *UserConnServer) Run() error {
	log.Println("starting user conn server on port %s", s.opts.ListenAddr)
	return s.transport.ListenAndServe()
}

func (s *UserConnServer) clearClosedConn(conn internal.Conn) {
	userId := conn.UserId()
	delete(s.onlineUsers, conn.RemoteAddr())
	s.mx.Lock()
	delete(s.onlineUsersIdMap, userId)
	s.mx.Unlock()
	logrus.WithFields(logrus.Fields{
		"user_id": userId,
	}).Info("user disconnected")
}

func (s *UserConnServer) Close() error {
	for _, user := range s.onlineUsers {
		user.Conn.Close()
	}
	return nil
}

func (s *UserConnServer) GetOnlineUser(ctx context.Context, userId int) (*chat.OnlineUser, error) {
	return s.getOnlineUser(userId)
}

func (s *UserConnServer) getOnlineUser(userId int) (*chat.OnlineUser, error) {
	s.mx.Lock()
	defer s.mx.Unlock()
	user, ok := s.onlineUsersIdMap[userId]
	if !ok {
		return nil, errors.New("user not found")
	}
	return user, nil
}
