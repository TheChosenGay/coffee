package gorm_store

import (
	"context"

	"github.com/TheChosenGay/coffee/types"
	"gorm.io/gorm"
)

type UserModel struct {
	gorm.Model
	types.User
}

type gormUserStore struct {
	db *gorm.DB
}

func NewGormUserStore(db *gorm.DB) *gormUserStore {
	return &gormUserStore{db: db}
}

// MARK: User Store

func (s *gormUserStore) StoreUser(ctx context.Context, user types.User) error {
	userModel := UserModel{
		User: user,
	}

	result := s.db.Create(&userModel)
	if result.Error != nil {
		return result.Error
	}

	return nil
}

func (s *gormUserStore) DeleteUser(ctx context.Context, id int) error {
	result := s.db.Where("user_id = ?", id).Delete(&UserModel{})
	if result.Error != nil {
		return result.Error
	}
	return nil
}

func (s *gormUserStore) GetUser(ctx context.Context, id int) (types.User, error) {
	result := s.db.Where("user_id = ?", id).First(&UserModel{})
	if result.Error != nil {
		return types.User{UserId: types.InvalidUserId}, result.Error
	}
	var user types.User
	result.Scan(&user)
	return user, nil
}

func (s *gormUserStore) ListUser(ctx context.Context) ([]types.User, error) {
	var users []UserModel
	result := s.db.Find(&users)
	if result.Error != nil {
		return []types.User{}, result.Error
	}
	retUsers := make([]types.User, len(users))
	for i, user := range users {
		retUsers[i] = user.User
	}
	return retUsers, nil
}
