package service

import (
	"context"

	"github.com/TheChosenGay/coffee/types"
)

type StoreService interface {
	// user
	StoreUser(context.Context, types.User) (id int, err error)
	DeleteUser(ctx context.Context, id int) error
	GetUser(ctx context.Context, id int) error
}
