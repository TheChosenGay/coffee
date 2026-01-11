package types

type Unit interface {
	Id() int
	NickName() string
	OnReceiveMsg(Message)
	Role() RoleType
}

type Room struct {
	Id          int
	MaxUnitSize int          // The Max Number of units in room
	Units       []Unit       // all units of the room
	BroadcastCh chan Message // braodcast channel of the room.
}
