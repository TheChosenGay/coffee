package types

import "github.com/TheChosenGay/coffee/proto/chat_service"

type Unit interface {
	Id() int
	NickName() string
	// The callback function when the unit receives a message
	Role(roomId int) (RoleType, error) // The Role of the unit in the room
	SetRole(roomId int, role RoleType) error

	// chat
	SendMsg(msg *chat_service.ChatMessage) error
}

type RoomState int

const (
	RoomStateNormal RoomState = iota
	RoomStateBanned
	RoomStateFulled
)

type Room struct {
	RoomId      int       `json:"room_id"`
	MaxUnitSize int       `json:"max_unit_size"`
	State       RoomState `json:"state"`
	Units       []int     `json:"-" gorm:"serializer:json"` // all units of the room
}
