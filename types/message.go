package types

type Content struct {
	Content string
}

type Message struct {
	RoomId   int
	SenderId int
	Contents []Content
}

func NewMessage(roomId int, senderId int, contents []Content) *Message {
	return &Message{
		RoomId:   roomId,
		SenderId: senderId,
		Contents: contents,
	}
}
