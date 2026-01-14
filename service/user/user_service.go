package user

import (
	"context"

	"github.com/TheChosenGay/coffee/service"
	"github.com/TheChosenGay/coffee/types"
)

type userService struct {
	store service.UserStoreService
}

func NewUserService(store service.UserStoreService) service.UserService {
	return &userService{
		store: store,
	}
}

func (s *userService) RegisterUser(ctx context.Context, user types.User) error {
	err := s.store.StoreUser(ctx, user)
	if err != nil {
		return err
	}
	return nil
}

func (s *userService) DeleteUser(ctx context.Context, id int) error {
	return s.store.DeleteUser(ctx, id)
}

func (s *userService) GetUser(ctx context.Context, id int) (types.User, error) {
	return s.store.GetUser(ctx, id)
}
