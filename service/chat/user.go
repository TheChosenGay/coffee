package chat

import (
	"context"

	"github.com/TheChosenGay/coffee/service"
	"github.com/TheChosenGay/coffee/types"
)

type userService struct {
	store service.StoreService
}

func NewUserService(store service.StoreService) service.UserService {
	return &userService{
		store: store,
	}
}

func (s *userService) RegisterUser(ctx context.Context, user types.User) (id int, err error) {
	userId, err := s.store.StoreUser(ctx, user)
	if err != nil {
		return types.InvalidUserId, err
	}
	return userId, nil
}

func (s *userService) DeleteUser(ctx context.Context, id int) error {
	return s.store.DeleteUser(ctx, id)
}
