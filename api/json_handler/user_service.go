package json_handler

import (
	"context"
	"fmt"
	"math/rand/v2"
	"net/http"
	"strconv"

	"github.com/TheChosenGay/coffee/api"
	"github.com/TheChosenGay/coffee/service"
	"github.com/TheChosenGay/coffee/types"
)

type JsonUserServiceHandler struct {
	svc service.UserService
}

func NewJsonUserServiceHandler(svc service.UserService) api.JsonServerHandler {
	return &JsonUserServiceHandler{svc: svc}
}

func (s *JsonUserServiceHandler) MakeJsonServiceHandler() {
	http.HandleFunc("/user/register", func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		ctx = context.WithValue(ctx, "requestId", rand.Int64N(1000000))
		nickName := r.URL.Query().Get("nickname")
		sex := r.URL.Query().Get("sex")

		if nickName == "" {
			api.WriteToJson(w, http.StatusBadRequest, map[string]string{"error": "nickname is required"})
			return
		}

		sexInt, err := strconv.Atoi(sex)
		if err != nil {
			api.WriteToJson(w, http.StatusBadRequest, map[string]string{"error": "invalid sex"})
			return
		}
		userId, err := s.svc.RegisterUser(ctx, types.User{Nickname: nickName, Sex: types.Sex(sexInt)})
		if err != nil {
			api.WriteToJson(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		api.WriteToJson(w, http.StatusOK, map[string]string{"message": fmt.Sprintf("user(userId:%d) registered successfully", userId)})
	})

	// delete user
	http.HandleFunc("/user/delete", func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		ctx = context.WithValue(ctx, "requestId", rand.Int64N(1000000))
		userId := r.URL.Query().Get("user_id")
		if userId == "" {
			api.WriteToJson(w, http.StatusBadRequest, map[string]string{"error": "user id is required"})
			return
		}
		userIdInt, err := strconv.Atoi(userId)
		if err != nil {
			api.WriteToJson(w, http.StatusBadRequest, map[string]string{"error": "invalid user id"})
			return
		}
		err = s.svc.DeleteUser(ctx, userIdInt)
		if err != nil {
			api.WriteToJson(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		api.WriteToJson(w, http.StatusOK, map[string]string{"message": fmt.Sprintf("user(userId:%d) deleted successfully", userIdInt)})
	})

	// list users
	http.HandleFunc("/user/list", func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		ctx = context.WithValue(ctx, "requestId", rand.Int64N(1000000))
		users, err := s.svc.ListUser(ctx)
		if err != nil {
			api.WriteToJson(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		api.WriteToJson(w, http.StatusOK, users)
	})
}
