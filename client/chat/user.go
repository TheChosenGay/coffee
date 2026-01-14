package chat

import (
	"bufio"
	"fmt"
	"log"
	"os"

	"github.com/TheChosenGay/coffee/proto/chat_service"
	"golang.org/x/net/websocket"
	"google.golang.org/protobuf/proto"
)

func RunWsUserClient() {
	wsConn, err := websocket.Dial("ws://localhost:8081/ws?user_id=123", "", "http://localhost")
	if err != nil {
		log.Fatal("websocket client dial error: ", err)
	}

	go func() {
		for {
			msg := make([]byte, 1024)
			_, err := wsConn.Read(msg)
			if err != nil {
				log.Fatal("websocket client read error: ", err)
			}
			fmt.Println(string(msg))
		}
	}()

	scanner := bufio.NewScanner(os.Stdin)
	for {
		if scanner.Scan() {
			input := scanner.Text()
			msg := &chat_service.Message{
				RoomId: 1,
				Contents: []*chat_service.Content{
					{
						Content: input,
					},
				},
			}
			marshaledMsg, err := proto.Marshal(msg)
			if err != nil {
				log.Fatal("failed to marshal message: ", err)
			}
			wsConn.Write(marshaledMsg)
		}
	}

}
