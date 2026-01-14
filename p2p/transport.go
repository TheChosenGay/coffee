package p2p

type HandleMessageFunc func(msg *Message) error
type HandleConnFunc func(conn Conn)

type Conn interface {
	// sync send message to the remote peer
	Send(msg []byte) error
	// async push message to the remote peer
	Push(msg []byte)
	// Close the connection
	Close() error
	// Receive message callback
	OnRecvMsg(handler HandleMessageFunc)
}

// Transport is the interface for persistent connection between client and server.
type Transport interface {
	ListenAndServe() error
	Close() error
	OnConn(HandleConnFunc)
}
