package api

import (
	"context"
	"log"

	"github.com/TheChosenGay/coffee/internal"
	"github.com/TheChosenGay/coffee/internal/ws"
	"github.com/TheChosenGay/coffee/service/chat"
	"github.com/TheChosenGay/coffee/service/store"
	"github.com/sirupsen/logrus"
)

type WsServerOpts struct {
	ListenAddr    string
	UserStore     store.UserStore
	OnlineUserSrv chat.OnlineUserService
}

type UserConnServer struct {
	opts      WsServerOpts
	transport internal.Transport
	close     chan chat.OnlineUser

	userStore     store.UserStore
	chatService   chat.ChatService
	onlineUserSrv chat.OnlineUserService
}

func NewUserConnServer(opts WsServerOpts) *UserConnServer {
	s := &UserConnServer{
		opts: opts,
		transport: ws.NewWsTransport(ws.WsTransportOpts{
			ListenAddr: opts.ListenAddr,
		}),
		userStore:     opts.UserStore,
		onlineUserSrv: opts.OnlineUserSrv,
	}

	chatService := chat.NewDefaultChatService(s.onlineUserSrv)
	s.chatService = chatService
	s.transport.OnRecvConn(s.onRecvConn)
	s.transport.OnCloseConn(s.clearClosedConn)
	return s
}

func (s *UserConnServer) Run() error {
	log.Println("starting user conn server on port %s", s.opts.ListenAddr)
	return s.transport.ListenAndServe()
}

func (s *UserConnServer) Close() error {
	for _, user := range s.onlineUserSrv.GetOnlineUsers() {
		user.Conn.Close()
	}
	return nil
}

func (s *UserConnServer) onRecvConn(conn internal.Conn) {
	if user, err := s.onlineUserSrv.GetOnlineUser(context.Background(), conn.UserId()); err != nil {
		if user != nil && user.Conn.RemoteAddr() == conn.RemoteAddr() {
			logrus.Warnf("user %d is already online, closing old connection", conn.UserId())
			conn.Close()
			return
		} else {
			s.onlineUserSrv.OfflineUser(context.Background(), conn.UserId())
		}
	}

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
	if err := s.onlineUserSrv.OnlineUser(context.Background(), &onlineUser); err != nil {
		conn.Send([]byte(err.Error()))
		conn.Close()
		return
	}
	logrus.WithFields(logrus.Fields{
		"user_name": user.Nickname,
		"user_id":   conn.UserId(),
	}).Info("user connected")
}

func (s *UserConnServer) clearClosedConn(conn internal.Conn) {
	userId := conn.UserId()
	// must be closed.
	defer conn.Close()

	if err := s.onlineUserSrv.OfflineUser(context.Background(), userId); err != nil {
		logrus.WithError(err).Error("offline user error")
	}
	logrus.WithFields(logrus.Fields{
		"user_id": userId,
	}).Info("user disconnected")
}
