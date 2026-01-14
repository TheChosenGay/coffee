package websocket

import (
	"errors"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"strings"
	"sync"

	"github.com/TheChosenGay/coffee/p2p"
	"golang.org/x/net/websocket"
)

type WsConn struct {
	Conn    *websocket.Conn
	closeCh chan struct{}
}

func NewWsConn(conn *websocket.Conn) *WsConn {
	return &WsConn{Conn: conn, closeCh: make(chan struct{})}
}

func (w *WsConn) Send(msg []byte) error {
	_, err := w.Conn.Write(msg)
	if err != nil {
		return err
	}
	return nil
}

func (w *WsConn) Push(msg []byte) {
	go func(msg []byte) {
		if _, err := w.Conn.Write(msg); err != nil {
			fmt.Printf("failed to push message: %v", err)
		}
	}(msg)
}

func (w *WsConn) Close() error {
	close(w.closeCh)
	return w.Conn.Close()
}

func (w *WsConn) OnRecvMsg(handler p2p.HandleMessageFunc) {
	go func() {
		msg := make([]byte, 1024*1024)
		for {
			n, err := w.Conn.Read(msg)
			if err != nil {
				if w.isConnClosed(err) {
					fmt.Printf("connection from remote peer %s closed", w.Conn.RemoteAddr().String())
					return
				} else {
					fmt.Printf("failed to read message: %v\n", err)
					continue
				}
			}

			handler(p2p.NewMessage(msg[:n]))
		}
	}()
}

func (w *WsConn) isConnClosed(err error) bool {
	if err == nil {
		return false
	}

	// normal close
	if errors.Is(err, io.EOF) {
		return true
	}

	// network close
	if errors.Is(err, net.ErrClosed) {
		return true
	}

	errMsg := err.Error()

	return strings.Contains(errMsg, "use of closed network connection") ||
		strings.Contains(errMsg, "connection reset by peer") ||
		strings.Contains(errMsg, "broken pipe")

}

type WsTransport struct {
	listenAddr string
	// handler for new recieved connection
	onConnHandler p2p.HandleConnFunc

	// for performance, reuse the connection
	conns sync.Pool

	connsMap sync.Map
}

func NewWsTransport(listenAddr string) *WsTransport {
	return &WsTransport{
		listenAddr: listenAddr,
		conns:      sync.Pool{New: func() any { return &WsConn{} }},
	}
}

func (s *WsTransport) ListenAndServe() error {
	log.Printf("starting ws server on port %s", s.listenAddr)
	http.Handle("/ws", websocket.Handler(s.handleWs))
	return http.ListenAndServe(s.listenAddr, nil)
}

func (s *WsTransport) Close() error {
	return nil
}

func (s *WsTransport) OnConn(handler p2p.HandleConnFunc) {
	s.onConnHandler = handler
}

func (s *WsTransport) handleWs(ws *websocket.Conn) {

	wsConn := s.conns.Get().(*WsConn)
	if wsConn == nil {
		log.Println("failed to get ws conn from pool")
		return
	}
	wsConn.Conn = ws
	wsConn.closeCh = make(chan struct{})
	s.connsMap.Store(ws.RemoteAddr().String(), wsConn)
	defer s.connsMap.Delete(ws.RemoteAddr().String())

	if s.onConnHandler != nil {
		s.onConnHandler(wsConn)
		<-wsConn.closeCh
	} else {
		fmt.Println("no onConnHandler set")
		wsConn.Send([]byte("no onConnHandler set"))
		wsConn.Close()
	}
}
