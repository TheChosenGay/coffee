package main

import (
	"log"
	"reflect"

	"github.com/TheChosenGay/coffee/api"
	"github.com/TheChosenGay/coffee/api/grpc_handler"
	"github.com/TheChosenGay/coffee/api/json_handler"
	"github.com/TheChosenGay/coffee/service"
	"github.com/TheChosenGay/coffee/service/chat"
	"github.com/TheChosenGay/coffee/service/store"
	"github.com/TheChosenGay/coffee/service/store/gorm_store"
)

func main() {
	cs := service.NewCoffeeService()
	roomStore := gorm_store.NewGormRoomStore(store.NewSqliteDatabase(store.SqliteDatabaseOpts{
		Path: "test.db",
	}))

	userStore := gorm_store.NewGormUserStore(store.NewSqliteDatabase(
		store.SqliteDatabaseOpts{
			Path: "test.db",
		},
	))

	userIdService := service.NewUserIdService()
	userService := service.NewUserService(userStore, userIdService)
	// use one coffee servive for both json and grpc
	go runJsonServer(cs, roomStore, userService)
	go runGrpcServer(cs)
	go runWsServer(roomStore, userStore, userService)
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
func runWsServer(roomStore store.RoomStore, userStore store.UserStore, userService service.UserService) {
	logginService := service.NewLoggingService(userService)
	chatService := chat.NewMessageService(roomStore, userStore)
	wsServer := api.NewWsServer(":8081", logginService, chatService)
	// 服务需要能够拿到对应的用户

	if err := wsServer.Run(); err != nil {
		log.Fatalf("failed to run ws server: %v", err)
	}
}
