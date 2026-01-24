package service

import (
	"context"
	"errors"
	"log"

	"github.com/TheChosenGay/coffee/service/store"
	"github.com/TheChosenGay/coffee/types"
)

type UserService interface {
	RegisterUser(ctx context.Context, user types.User) (int, error)
	DeleteUser(ctx context.Context, id int) error
	GetUser(ctx context.Context, id int) (types.User, error)
	ListUser(ctx context.Context) ([]types.User, error)

	Login(ctx context.Context, loginInfo types.LoginInfo) (types.User, error)
	Logout(ctx context.Context, userId int) error
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

func (s *userService) Login(ctx context.Context, loginInfo types.LoginInfo) (types.User, error) {
	userId, password := loginInfo.UserId, loginInfo.Password
	user, err := s.store.GetUser(ctx, userId)

	if user.Password != password {
		return types.User{UserId: types.InvalidUserId}, errors.New("invalid password")
	}

	if err != nil {
		return types.User{UserId: types.InvalidUserId}, err
	}

	return user, nil
}

func (s *userService) Logout(ctx context.Context, userId int) error {
	return nil
}
