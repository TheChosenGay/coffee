package redis_store

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/TheChosenGay/coffee/types"
	redis "github.com/redis/go-redis/v9"
)

const UserRedisKeyPrefix string = "redis_user:"

type RedisStoreOpts struct {
	Addr     string
	Password string
	DB       int
}

type RedisUserStore struct {
	client *redis.Client
}

func NewRedisUserStore(opts RedisStoreOpts) *RedisUserStore {
	client := redis.NewClient(&redis.Options{
		Addr:     opts.Addr,
		Password: opts.Password,
		DB:       opts.DB,
	})
	return &RedisUserStore{client: client}
}

func (s *RedisUserStore) StoreUser(ctx context.Context, user types.User) error {
	json, err := json.Marshal(user)
	if err != nil {
		return err
	}
	return s.client.Set(ctx, s.getKey(user.UserId), json, 0).Err()
}

func (s *RedisUserStore) DeleteUser(ctx context.Context, userId int) error {
	return s.client.Del(ctx, s.getKey(userId)).Err()
}

func (s *RedisUserStore) GetUser(ctx context.Context, userId int) (types.User, error) {
	jsonStr, err := s.client.Get(ctx, s.getKey(userId)).Result()
	if err != nil {
		return types.User{UserId: types.InvalidUserId}, err
	}
	var user types.User
	if err := json.Unmarshal([]byte(jsonStr), &user); err != nil {
		return types.User{UserId: types.InvalidUserId}, err
	}
	return user, nil
}

func (s *RedisUserStore) ListUser(ctx context.Context) ([]types.User, error) {
	return nil, nil
}

func (s *RedisUserStore) getKey(userId int) string {
	return fmt.Sprintf("%s%d", UserRedisKeyPrefix, userId)
}
