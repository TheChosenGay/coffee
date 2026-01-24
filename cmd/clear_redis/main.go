package main

import (
	"context"
	"fmt"
	"log"

	"github.com/TheChosenGay/coffee/service/store/redis_store"
)

func main() {
	// 使用与 main.go 相同的 Redis 配置
	redisStore := redis_store.NewRedisUserStore(redis_store.RedisStoreOpts{
		Addr:     "127.0.0.1:6379",
		Password: "",
		DB:       0,
	})

	ctx := context.Background()
	
	fmt.Println("正在清除 Redis 中的所有用户缓存数据...")
	if err := redisStore.ClearAllUsers(ctx); err != nil {
		log.Fatalf("清除 Redis 数据失败: %v", err)
	}
	
	fmt.Println("✅ 成功清除 Redis 中的所有用户缓存数据！")
}
