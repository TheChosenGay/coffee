package service

import (
	"context"

	"github.com/TheChosenGay/coffee/types"
)

type UserService interface {
	RegisterUser(ctx context.Context, user types.User) (id int, err error)
	DeleteUser(ctx context.Context, id int) error
}
