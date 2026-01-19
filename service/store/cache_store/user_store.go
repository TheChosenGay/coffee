package cache_store

import (
	"context"

	"github.com/TheChosenGay/coffee/service/store"
	"github.com/TheChosenGay/coffee/types"
)

type CacheUserStore struct {
	cache store.UserStore
	db    store.UserStore
}

func NewCacheUserStore(cache store.UserStore, db store.UserStore) *CacheUserStore {
	return &CacheUserStore{cache: cache, db: db}
}

func (s *CacheUserStore) StoreUser(ctx context.Context, user types.User) error {
	if err := s.db.StoreUser(ctx, user); err != nil {
		return err
	}

	go func() {
		s.cache.StoreUser(ctx, user)
	}()
	return nil
}

func (s *CacheUserStore) DeleteUser(ctx context.Context, id int) error {
	if err := s.db.DeleteUser(ctx, id); err != nil {
		return err
	}
	go func() {
		s.cache.DeleteUser(ctx, id)
	}()
	return nil
}

func (s *CacheUserStore) GetUser(ctx context.Context, id int) (types.User, error) {
	user, err := s.cache.GetUser(ctx, id)
	if user.IsValid() && err == nil {
		return user, nil
	}

	user, err = s.db.GetUser(ctx, id)
	if err != nil {
		return types.User{UserId: types.InvalidUserId}, err
	}

	go func() {
		s.cache.StoreUser(ctx, user)
	}()
	return user, nil
}

func (s *CacheUserStore) ListUser(ctx context.Context) ([]types.User, error) {
	users, err := s.cache.ListUser(ctx)
	if err != nil {
		return nil, err
	}
	return users, nil
}
