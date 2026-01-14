package types

import "github.com/TheChosenGay/coffee/proto/chat_service"

type Unit interface {
	Id() int
	NickName() string
	// The callback function when the unit receives a message
	ReceiveMsg(msg *chat_service.Message) error
	SetBroadcastCh(roomId int, ch chan Message)
	Role(roomId int) (RoleType, error) // The Role of the unit in the room
	SetRole(roomId int, role RoleType) error
}

type RoomState int

const (
	RoomStateNormal RoomState = iota
	RoomStateBanned
	RoomStateFulled
)

type Room struct {
	RoomId      int
	MaxUnitSize int // The Max Number of units in room
	State       RoomState
	Units       []Unit // all units of the room
}
