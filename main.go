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
	// use one coffee servive for both json and grpc
	go runJsonServer(cs)
	go runGrpcServer(cs)
	go runWsServer()
	select {}
}

func runJsonServer(cs service.CoffeeService) {
	csvc := json_handler.NewJsonCoffeeServiceHandler(cs)
	jsonServer := api.NewJsonServer(":8080")
	jsonServer.RegisterHandler(reflect.TypeOf(csvc).Elem().Name(), csvc)
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

func runWsServer() {
	userStore := store.NewGormUserStore(newDatabase())
	roomStore := store.NewGormRoomStore(newDatabase())
	userService := user.NewUserService(userStore)
	logginService := service.NewLoggingService(userService)
	chatService := chat.NewChatService(roomStore, userStore)
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
	if err := db.AutoMigrate(&store.UserModel{}); err != nil {
		log.Fatalf("failed to migrate database: %v", err)
	}
	return db
}
