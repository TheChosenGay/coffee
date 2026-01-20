package chat

import (
	"context"
	"errors"
	"fmt"
	"sync"

	"github.com/TheChosenGay/coffee/service/store"
)

type OnlineUserService interface {
	GetOnlineUser(ctx context.Context, userId int) (*OnlineUser, error)
	OfflineUser(ctx context.Context, userId int) error
	OnlineUser(ctx context.Context, user *OnlineUser) error
}

type defaultOnlineUserService struct {
	mx          sync.Mutex
	onlineUsers map[int]*OnlineUser
}

func NewDefaultOnlineUserService(userStore store.UserStore) OnlineUserService {
	return &defaultOnlineUserService{
		onlineUsers: make(map[int]*OnlineUser),
		mx:          sync.Mutex{},
	}
}

func (s *defaultOnlineUserService) GetOnlineUser(ctx context.Context, userId int) (*OnlineUser, error) {
	s.mx.Lock()
	defer s.mx.Unlock()
	user, ok := s.onlineUsers[userId]
	if !ok {
		return nil, errors.New("user not found")
	}
	return user, nil
}

func (s *defaultOnlineUserService) OfflineUser(ctx context.Context, userId int) error {
	defer s.mx.Unlock()
	delete(s.onlineUsers, userId)
	return nil
}

func (s *defaultOnlineUserService) OnlineUser(ctx context.Context, user *OnlineUser) error {
	s.mx.Lock()
	defer s.mx.Unlock()

	if _, ok := s.onlineUsers[user.UserId]; ok {
		s.onlineUsers[user.UserId].Conn.Close()
		return fmt.Errorf("user %d is already online", user.UserId)
	}

	s.onlineUsers[user.UserId] = user
	return nil
}
