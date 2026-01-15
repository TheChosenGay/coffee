package main

import (
	"log"
	"reflect"

	"github.com/TheChosenGay/coffee/api"
	"github.com/TheChosenGay/coffee/api/grpc_handler"
	"github.com/TheChosenGay/coffee/api/json_handler"
	"github.com/TheChosenGay/coffee/service"
	"github.com/TheChosenGay/coffee/service/chat"
	store "github.com/TheChosenGay/coffee/service/store/gorm"
	"github.com/TheChosenGay/coffee/service/user"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func main() {
	cs := service.NewLogServiceMiddleware(service.NewCoffeeService())
	roomStore := store.NewGormRoomStore(newDatabase())
	userStore := store.NewGormUserStore(newDatabase())
	userIdService := service.NewUserIdService()
	userService := user.NewUserService(userStore, userIdService)
	// use one coffee servive for both json and grpc
	go runJsonServer(cs, roomStore, userService)
	go runGrpcServer(cs)
	go runWsServer(roomStore, userStore, userService)
	select {}
}

func runJsonServer(cs service.CoffeeService, roomStore service.RoomStoreService, userService service.UserService) {
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

func runGrpcServer(cs service.CoffeeService) {
	csvc := grpc_handler.NewGrpcCoffeeServiceHandler(cs)
	grpcServer := api.NewGrpcServer(":50051")
	grpcServer.RegisterHandler(reflect.TypeOf(csvc).Elem().Name(), csvc)
	if err := grpcServer.Run(); err != nil {
		log.Fatalf("failed to run grpc server: %v", err)
	}
}

func runWsServer(roomStore service.RoomStoreService, userStore service.UserStoreService, userService service.UserService) {
	logginService := service.NewLoggingService(userService)
	chatService := chat.NewMessageService(roomStore, userStore)
	wsServer := api.NewWsServer(":8081", logginService, chatService)
	// 服务需要能够拿到对应的用户

	if err := wsServer.Run(); err != nil {
		log.Fatalf("failed to run ws server: %v", err)
	}
}

func newDatabase() *gorm.DB {
	db, err := gorm.Open(sqlite.Open("test.db"), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to open database: %v", err)
	}
	if err := db.AutoMigrate(&store.UserModel{}, &store.RoomModel{}); err != nil {
		log.Fatalf("failed to migrate database: %v", err)
	}
	return db
}
