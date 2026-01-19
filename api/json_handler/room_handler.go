package json_handler

import (
	"context"
	"encoding/json"
	"fmt"
	"math/rand/v2"
	"net/http"
	"strconv"

	"github.com/TheChosenGay/coffee/api"
	"github.com/TheChosenGay/coffee/service"
)

type JsonRoomServiceHandler struct {
	svc service.RoomService
}

func NewJsonRoomServiceHandler(svc service.RoomService) api.JsonServerHandler {
	return &JsonRoomServiceHandler{svc: svc}
}

func (s *JsonRoomServiceHandler) MakeJsonServiceHandler() {
	// create room with max unit size
	http.HandleFunc("/room/create", WithLogTime(s.createRoom))

	// delete room
	http.HandleFunc("/room/delete", WithLogTime(s.deleteRoom))

	// list rooms
	http.HandleFunc("/room/list", WithLogTime(s.listRooms))

}

func (s *JsonRoomServiceHandler) createRoom(w http.ResponseWriter, r *http.Request) {
	maxUnitSize := r.URL.Query().Get("max_unit_size")
	maxUnitSizeInt, err := strconv.Atoi(maxUnitSize)
	if err != nil {
		api.WriteToJson(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	ctx := context.WithValue(r.Context(), "requestId", rand.Int64N(1000000))
	roomId, err := s.svc.CreateRoomBySize(ctx, maxUnitSizeInt)
	if err != nil {
		api.WriteToJson(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	api.WriteToJson(w, http.StatusOK, map[string]int{"room_id": roomId})
}

func (s *JsonRoomServiceHandler) deleteRoom(w http.ResponseWriter, r *http.Request) {
	roomId := r.URL.Query().Get("room_id")
	roomIdInt, err := strconv.Atoi(roomId)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
	}
	ctx := context.WithValue(r.Context(), "requestId", rand.Int64N(1000000))
	err = s.svc.DeleteRoom(ctx, roomIdInt)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	api.WriteToJson(w, http.StatusOK, map[string]string{"message": fmt.Sprintf("room %d deleted successfully", roomIdInt)})
}

func (s *JsonRoomServiceHandler) listRooms(w http.ResponseWriter, r *http.Request) {
	ctx := context.WithValue(r.Context(), "requestId", rand.Int64N(1000000))
	rooms, err := s.svc.ListRoom(ctx)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(rooms)
}
