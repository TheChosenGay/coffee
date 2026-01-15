package types

import "github.com/TheChosenGay/coffee/proto/chat_service"

type MessageType int

const (
	MessageTypeNormal MessageType = iota
	MessageTypeSignal             // for notify the unit without message
)

type SignalType int

const (
	SignalTypeKickOut SignalType = iota
	SignalTypeRoomFulled
	SignalTypeRoomBanned
	SignalTypeRoomDeleted
	SignalTypeRoomJoined
)

type Message struct {
	MsgType    MessageType // the type of the message
	SignalType SignalType  // the type of the signal when msg type is MessageTypeSignal
	TargetId   int
	SenderId   int
	Broadcast  bool // whether the message is broadcast to all units in the room
	Contents   []*chat_service.Content
}

func NewMessage(msgType MessageType, targetId int, senderId int, contents []*chat_service.Content) *Message {
	return &Message{
		MsgType:  msgType,
		TargetId: targetId,
		SenderId: senderId,
		Contents: contents,
	}
}

func NewSignalMessage(signalType SignalType, targetId int, senderId int, contents []*chat_service.Content) *Message {
	return &Message{
		MsgType:    MessageTypeSignal,
		SignalType: signalType,
		TargetId:   targetId,
		SenderId:   senderId,
		Contents:   contents,
	}
}
