package service

import (
	"context"
	"errors"
	"log"

	"github.com/TheChosenGay/coffee/types"
)

type LogginService interface {
	Login(ctx context.Context, userId int) (types.User, error)
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
		if err := s.userService.RegisterUser(ctx, types.User{UserId: userId, Nickname: "guest"}); err != nil {
			return types.User{}, err
		} else {
			user, err := s.userService.GetUser(ctx, userId)
			if err != nil {
				return types.User{}, err
			}
			return user, nil
		}
	}
	log.Printf("user(id:%d, nickname:%s) logged in: \n", userId, user.Nickname)
	return user, nil
}
