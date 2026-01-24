package json_handler

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math/rand/v2"
	"net/http"
	"strconv"

	"github.com/TheChosenGay/coffee/api"
	"github.com/TheChosenGay/coffee/middleware/auth"
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
	http.HandleFunc("/user/register", WithLogTime(s.registerUser))

	// login
	http.HandleFunc("/user/login", WithLogTime(s.log))

	// delete user
	http.HandleFunc("/user/delete", WithLogTime(s.deleteUser))

	// list users
	http.HandleFunc("/user/list", WithLogTime(s.listUsers))

	// get user by id
	http.HandleFunc("/user/get", WithLogTime(s.getUserById))
}

func (s *JsonUserServiceHandler) registerUser(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	ctx = context.WithValue(ctx, "requestId", rand.Int64N(1000000))
	registerInfo := types.RegisterInfo{}
	if err := json.NewDecoder(r.Body).Decode(&registerInfo); err != nil {
		api.WriteToJson(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	nickname := registerInfo.Nickname
	sex := registerInfo.Sex
	password := registerInfo.Password

	if nickname == "" {
		api.WriteToJson(w, http.StatusBadRequest, map[string]string{"error": "nickname is required"})
		return
	}

	userId, err := s.svc.RegisterUser(ctx, types.User{Nickname: nickname, Sex: types.Sex(sex), Password: password})
	if err != nil {
		api.WriteToJson(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	loginResponse, err := s.makeLoginResponse(userId)
	if err != nil {
		api.WriteToJson(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	api.WriteToJson(w, http.StatusOK, loginResponse)
}

func (s *JsonUserServiceHandler) deleteUser(w http.ResponseWriter, r *http.Request) {
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
}

func (s *JsonUserServiceHandler) listUsers(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	ctx = context.WithValue(ctx, "requestId", rand.Int64N(1000000))
	users, err := s.svc.ListUser(ctx)
	if err != nil {
		log.Println("list users error:", err)
		api.WriteToJson(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	api.WriteToJson(w, http.StatusOK, users)
}

func (s *JsonUserServiceHandler) getUserById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userIdStr := r.URL.Query().Get("id")
	userIdInt, err := strconv.Atoi(userIdStr)
	if err != nil {
		api.WriteToJson(w, http.StatusBadRequest, map[string]string{"error": "invalid user id"})
		return
	}
	user, err := s.svc.GetUser(ctx, userIdInt)
	if err != nil {
		api.WriteToJson(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	api.WriteToJson(w, http.StatusOK, user)
}

func (s *JsonUserServiceHandler) login(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	logInfo := types.LoginInfo{}
	if err := json.NewDecoder(r.Body).Decode(&logInfo); err != nil {
		api.WriteToJson(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	user, err := s.svc.Login(ctx, logInfo)
	if err != nil {
		api.WriteToJson(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	loginResponse, err := s.makeLoginResponse(user.UserId)
	if err != nil {
		api.WriteToJson(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	api.WriteToJson(w, http.StatusOK, loginResponse)
}

func (s *JsonUserServiceHandler) makeLoginResponse(userId int) (*types.LoginResponse, error) {

	token, err := auth.CreateToken(userId)
	if err != nil {
		return nil, err
	}
	loginResponse := types.NewLoginResponse(userId, token)
	return &loginResponse, nil
}
