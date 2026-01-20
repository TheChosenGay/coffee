package service

import (
	"context"
	"log"

	"github.com/TheChosenGay/coffee/service/store"
	"github.com/TheChosenGay/coffee/types"
)

type UserService interface {
	RegisterUser(ctx context.Context, user types.User) (int, error)
	DeleteUser(ctx context.Context, id int) error
	GetUser(ctx context.Context, id int) (types.User, error)
	ListUser(ctx context.Context) ([]types.User, error)
}

type userService struct {
	store     store.UserStore
	idService IdService
}

func NewUserService(store store.UserStore, idService IdService) UserService {
	return &userService{
		store:     store,
		idService: idService,
	}
}

func (s *userService) RegisterUser(ctx context.Context, user types.User) (int, error) {
	user.UserId = s.idService.GenerateId()
	err := s.store.StoreUser(ctx, user)
	if err != nil {
		return types.InvalidUserId, err
	}
	return user.UserId, nil
}

func (s *userService) DeleteUser(ctx context.Context, id int) error {
	return s.store.DeleteUser(ctx, id)
}

func (s *userService) GetUser(ctx context.Context, id int) (types.User, error) {
	log.Printf("get user: %d\n", ctx.Value("requestId"))
	return s.store.GetUser(ctx, id)
}

func (s *userService) ListUser(ctx context.Context) ([]types.User, error) {
	return s.store.ListUser(ctx)
}
