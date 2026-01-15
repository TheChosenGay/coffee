package service

import (
	"context"
	"errors"
	"log"

	"github.com/TheChosenGay/coffee/types"
)

type LogginService interface {
	Login(ctx context.Context, userId int) (types.User, error)
	Logout(ctx context.Context, userId int) error
}

type loggingService struct {
	userService UserService
}

func NewLoggingService(userService UserService) LogginService {
	return &loggingService{userService: userService}
}

func (s *loggingService) Login(ctx context.Context, userId int) (types.User, error) {
	if userId == types.InvalidUserId {
		return types.User{}, errors.New("invalid user id")
	}
	user, err := s.userService.GetUser(ctx, userId)
	if err != nil {
		return types.User{UserId: types.InvalidUserId}, err
	}
	log.Printf("user(id:%d, nickname:%s) logged in: \n", userId, user.Nickname)
	return user, nil
}

func (s *loggingService) Logout(ctx context.Context, userId int) error {
	if userId == types.InvalidUserId {
		return errors.New("invalid user id")
	}

	user, err := s.userService.GetUser(ctx, userId)
	if err != nil {
		return err
	}
	reqId := ctx.Value("requestId")

	log.Printf("requestId: %d, user(id:%d, nickname:%s) logged out: \n", reqId, userId, user.Nickname)
	return nil
}
