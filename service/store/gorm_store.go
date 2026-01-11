package store

import (
	"context"

	"github.com/TheChosenGay/coffee/types"
	"gorm.io/gorm"
)

type userModel struct {
	gorm.Model
	types.User
}

type gormStore struct {
	db *gorm.DB
}

func NewGormStore(db *gorm.DB) *gormStore {
	return &gormStore{db: db}
}

func (s *gormStore) StoreUser(ctx context.Context, user types.User) (err error) {
	userModel := userModel{
		User: user,
	}

	result := s.db.Create(&userModel)
	if result.Error != nil {
		return result.Error
	}

	return nil
}

func (s *gormStore) DeleteUser(ctx context.Context, id int) error {
	result := s.db.Where("user_id = ?", id).Delete(&userModel{})
	if result.Error != nil {
		return result.Error
	}
	return nil
}

func (s *gormStore) GetUser(ctx context.Context, id int) (types.User, error) {
	result := s.db.Where("user_id = ?", id).First(&userModel{})
	if result.Error != nil {
		return types.User{UserId: types.InvalidUserId}, result.Error
	}
	var user types.User
	result.Scan(&user)
	return user, nil
}
