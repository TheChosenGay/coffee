package api

import (
	"context"
	"fmt"
	"log"
	"strconv"

	"github.com/TheChosenGay/coffee/p2p"
	"github.com/TheChosenGay/coffee/p2p/websocket"
	"github.com/TheChosenGay/coffee/service"
	"github.com/TheChosenGay/coffee/service/chat"
	"github.com/TheChosenGay/coffee/types"
)

type WsServer struct {
	transport      p2p.Transport
	logginService  service.LogginService
	messageService chat.MessageService
}

func NewWsServer(listenAddr string, logginService service.LogginService, messageService chat.MessageService) *WsServer {
	transport := websocket.NewWsTransport(listenAddr)
	wsServer := &WsServer{
		transport:      transport,
		logginService:  logginService,
		messageService: messageService,
	}

	transport.OnConn(func(conn p2p.Conn) {
		wsServer.handleConn(conn)
	})

	return wsServer
}

func (s *WsServer) Run() error {
	return s.transport.ListenAndServe()
}

func (s *WsServer) handleConn(conn p2p.Conn) {
	wsConn := conn.(*websocket.WsConn)
	userId := wsConn.Conn.Request().URL.Query().Get("user_id")
	userIdInt, err := strconv.Atoi(userId)

	if err != nil {
		log.Printf("failed to convert user id to int: %v", err)
		conn.Send([]byte(fmt.Sprintf("handle connection error: %+v, userId: %s\n", err, userId)))
		conn.Close()
		return
	}

	if userIdInt == types.InvalidUserId {
		conn.Send([]byte(fmt.Sprintf("invalid userId: %s\n", userId)))
		conn.Close()
		return
	}

	user, err := s.logginService.Login(context.Background(), userIdInt)

	if user.UserId == types.InvalidUserId {
		conn.Send([]byte(fmt.Sprintf("invalid userId: %s\n", userId)))
		conn.Close()
		return
	}

	if err := s.messageService.JoinChat(context.Background(), user, conn); err != nil {
		conn.Send([]byte(fmt.Sprintf("failed to join chat room: %+v\n", err)))
		conn.Close()
		return
	}
	log.Printf("user %d joined chat", user.UserId)
	s.messageService.JoinChat(context.Background(), user, conn)
}
