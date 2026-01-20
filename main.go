package main

import (
	"log"
	"reflect"

	"github.com/TheChosenGay/coffee/api"
	"github.com/TheChosenGay/coffee/api/grpc_handler"
	"github.com/TheChosenGay/coffee/api/json_handler"
	"github.com/TheChosenGay/coffee/service"
	"github.com/TheChosenGay/coffee/service/store"
	"github.com/TheChosenGay/coffee/service/store/cache_store"
	"github.com/TheChosenGay/coffee/service/store/gorm_store"
	"github.com/TheChosenGay/coffee/service/store/redis_store"
)

func main() {
	cs := service.NewCoffeeService()
	db := gorm_store.NewMySqlDatabase(gorm_store.MySqlDatabaseOpts{
		Username: "root",
		Password: "123456",
		Protocol: "tcp",
		Addr:     "127.0.0.1:3306",
		DBName:   "coffee",
	})
	redisStore := redis_store.NewRedisUserStore(redis_store.RedisStoreOpts{Addr: "127.0.0.1:6379", Password: "", DB: 0})
	userStore := gorm_store.NewGormUserStore(db)
	roomStore := gorm_store.NewGormRoomStore(db)
	cachedUserStore := cache_store.NewCacheUserStore(redisStore, userStore)

	userIdService := service.NewUserIdService()
	userService := service.NewUserService(cachedUserStore, userIdService)
	// use one coffee servive for both json and grpc
	go runJsonServer(cs, roomStore, userService)
	go runGrpcServer(cs)
	go runUserConnServer(cachedUserStore)
	select {}
}

// start json over http server
func runJsonServer(cs service.CoffeeService, roomStore store.RoomStore, userService service.UserService) {
	csvc := json_handler.NewJsonCoffeeServiceHandler(cs)
	roomIdService := service.NewRoomIdService()

	rs := service.NewRoomService(roomStore, roomIdService)
	rsvc := json_handler.NewJsonRoomServiceHandler(rs)
	usvc := json_handler.NewJsonUserServiceHandler(userService)
	jsonServer := api.NewJsonServer(":8080")

	jsonServer.RegisterHandler(reflect.TypeOf(csvc).Elem().Name(), csvc)
	jsonServer.RegisterHandler(reflect.TypeOf(rsvc).Elem().Name(), rsvc)
	jsonServer.RegisterHandler(reflect.TypeOf(usvc).Elem().Name(), usvc)
	if err := jsonServer.Run(); err != nil {
		log.Fatalf("failed to run json server: %v", err)
	}
}

// start grpc server
func runGrpcServer(cs service.CoffeeService) {
	csvc := grpc_handler.NewGrpcCoffeeServiceHandler(cs)
	grpcServer := api.NewGrpcServer(":50051")
	grpcServer.RegisterHandler(reflect.TypeOf(csvc).Elem().Name(), csvc)
	if err := grpcServer.Run(); err != nil {
		log.Fatalf("failed to run grpc server: %v", err)
	}
}

// start websocket server
func runUserConnServer(userStore store.UserStore) {
	userConnServer := api.NewUserConnServer(api.WsServerOpts{
		ListenAddr: ":8081",
		UserStore:  userStore,
	})

	if err := userConnServer.Run(); err != nil {
		log.Fatalf("failed to run ws server: %v", err)
	}
}
