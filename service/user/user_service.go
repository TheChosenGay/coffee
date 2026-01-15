package user

import (
	"context"

	"github.com/TheChosenGay/coffee/service"
	"github.com/TheChosenGay/coffee/types"
)

type userService struct {
	store     service.UserStoreService
	idService service.IdService
}

func NewUserService(store service.UserStoreService, idService service.IdService) service.UserService {
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
	return s.store.GetUser(ctx, id)
}

func (s *userService) ListUser(ctx context.Context) ([]types.User, error) {
	return s.store.ListUser(ctx)
}
