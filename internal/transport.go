package internal

type HandleConnFunc func(conn Conn)

type Transport interface {
	ListenAndServe() error
	OnRecvConn(handler HandleConnFunc)
	Close(conn Conn) error
}

type HandleMessageFunc func(msg []byte) error

type Conn interface {
	Send(msg []byte) error
	Push(msg []byte)
	OnRecvMsg(hander HandleMessageFunc)
	Close() error

	RemoteAddr() string
	// the user id of the connection
	UserId() int
}
