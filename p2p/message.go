package p2p

// Message is the message sent between peers.
type Message struct {
	Payload []byte
}

func NewMessage(payload []byte) *Message {
	return &Message{Payload: append([]byte(nil), payload...)}
}
