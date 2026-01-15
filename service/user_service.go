package service

import (
	"context"

	"github.com/TheChosenGay/coffee/types"
)

type UserService interface {
	RegisterUser(ctx context.Context, user types.User) (int, error)
	DeleteUser(ctx context.Context, id int) error
	GetUser(ctx context.Context, id int) (types.User, error)
	ListUser(ctx context.Context) ([]types.User, error)
}
