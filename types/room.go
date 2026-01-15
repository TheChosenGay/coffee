package types

type Unit interface {
	Id() int
	NickName() string
	// The callback function when the unit receives a message
	ReceiveMsg(msg *Message) error
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
	RoomId      int       `json:"room_id"`
	MaxUnitSize int       `json:"max_unit_size"`
	State       RoomState `json:"state"`
	Units       []Unit    `json:"-" gorm:"-"` // all units of the room
}
