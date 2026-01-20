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
		if err != nil {
			conn.Send([]byte("User not found"))
			conn.Close()
			return
		}

		onlineUser := chat.OnlineUser{
			Conn:     conn,
			UserId:   conn.UserId(),
			UserName: user.Nickname,
		}
		conn.OnRecvMsg(onlineUser.ReceiveMsg)

		s.onlineUsers[conn.RemoteAddr()] = &onlineUser
		s.onlineUsersIdMap[conn.UserId()] = &onlineUser
	})
	return s
}

func (s *UserConnServer) Run() error {
	log.Println("starting user conn server on port %s", s.opts.ListenAddr)
	go s.closeLoop()
	return s.transport.ListenAndServe()
}

func (s *UserConnServer) closeLoop() {
	for {
		select {
		case user := <-s.close:
			delete(s.onlineUsers, user.Conn.RemoteAddr())

			s.mx.Lock()
			delete(s.onlineUsersIdMap, user.UserId)
			defer s.mx.Unlock()

			s.transport.Close(user.Conn)
		}
	}
}

func (s *UserConnServer) Close() error {
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
