package ws

import (
	"net/http"
	"strconv"
	"sync"

	"github.com/TheChosenGay/coffee/internal"
	"github.com/TheChosenGay/coffee/types"
	"golang.org/x/net/websocket"
)

type WsTransportOpts struct {
	ListenAddr string
}

type WsTransport struct {
	opts WsTransportOpts

	mx       sync.Mutex
	connPool sync.Pool

	CloseCh chan internal.Conn

	onConnHandler internal.HandleConnFunc
}

func NewWsTransport(opts WsTransportOpts) *WsTransport {
	return &WsTransport{
		opts:     opts,
		connPool: sync.Pool{New: func() any { return &WsConn{} }},
		CloseCh:  make(chan internal.Conn),
	}
}

func (t *WsTransport) ListenAndServe() error {
	http.Handle("/ws", websocket.Handler(t.handleWs))
	return http.ListenAndServe(t.opts.ListenAddr, nil)
}

func (t *WsTransport) handleWs(ws *websocket.Conn) {
	t.mx.Lock()
	conn := t.connPool.Get().(*WsConn)
	t.mx.Unlock()

	if conn == nil {
		ws.Write([]byte("Cannot Connect to Server"))
		ws.Close()
		return
	}
	conn.conn = ws
	userId, err := t.getUserId(ws)
	if err != nil {
		ws.Write([]byte("Permission Denied."))
		ws.Close()
		return
	}
	conn.userId = userId
	conn.closeCh = make(chan struct{})
	t.onConnHandler(conn)
	select {
	case <-conn.closeCh:
		return
	}
}

func (t *WsTransport) Close(conn internal.Conn) error {
	defer t.connPool.Put(conn)
	return conn.Close()
}

func (t *WsTransport) OnRecvConn(handler internal.HandleConnFunc) {
	t.onConnHandler = handler
}

func (t *WsTransport) getUserId(ws *websocket.Conn) (int, error) {
	userIdStr := ws.Request().URL.Query().Get("user_id")
	userId, err := strconv.Atoi(userIdStr)
	if err != nil {
		return types.InvalidUserId, err
	}
	return userId, nil
}

type WsConn struct {
	conn    *websocket.Conn
	userId  int
	closeCh chan struct{}
}

func (c *WsConn) Send(msg []byte) error {
	_, err := c.conn.Write(msg)
	if err != nil {
		return err
	}
	return nil
}

func (c *WsConn) Push(msg []byte) {
	go func() {
		c.conn.Write(msg)
	}()
}

func (c *WsConn) OnRecvMsg(handler internal.HandleMessageFunc) {
	go func() {
		msg := make([]byte, 1024)
		for {
			n, err := c.conn.Read(msg)
			if err != nil {
				return
			}
			handler(msg[:n])
		}
	}()
}

func (c *WsConn) Close() error {
	c.closeCh <- struct{}{}
	return c.conn.Close()
}

func (c *WsConn) RemoteAddr() string {
	return c.conn.RemoteAddr().String()
}

func (c *WsConn) UserId() int {
	return c.userId
}
