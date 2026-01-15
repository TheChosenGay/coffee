package service

import (
	"context"

	"github.com/TheChosenGay/coffee/types"
)

type UserStoreService interface {
	// user
	StoreUser(context.Context, types.User) error
	DeleteUser(ctx context.Context, id int) error
	GetUser(ctx context.Context, id int) (types.User, error)
	ListUser(ctx context.Context) ([]types.User, error)
}
