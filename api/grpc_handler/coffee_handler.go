package grpc_handler

import (
	"context"
	"math/rand/v2"

	"github.com/TheChosenGay/coffee/api"
	"github.com/TheChosenGay/coffee/proto/coffee_service"
	"github.com/TheChosenGay/coffee/service"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type GrpcCoffeeServiceHandler struct {
	svc service.CoffeeService
	coffee_service.UnimplementedCoffeeServiceServer
}

func NewGrpcCoffeeServiceHandler(svc service.CoffeeService) api.GrpcServerHandler {
	return &GrpcCoffeeServiceHandler{svc: svc}
}

func (s *GrpcCoffeeServiceHandler) RegisterGrpcService(server *grpc.Server) {
	coffee_service.RegisterCoffeeServiceServer(server, s)
}

func (s *GrpcCoffeeServiceHandler) ListCoffees(ctx context.Context, req *coffee_service.ListCoffeesRequest) (*coffee_service.CoffeesResponse, error) {
	reqId := rand.Int64N(1000000)
	ctx = context.WithValue(ctx, "requestId", reqId)
	coffees, err := s.svc.ListCoffees(ctx)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to list coffees: %v", err)
	}

	proto_coffees := make([]*coffee_service.Coffee, len(coffees))
	for _, coffee := range coffees {
		proto_coffees = append(proto_coffees, &coffee_service.Coffee{
			Id:           int32(coffee.Id),
			Name:         coffee.Name,
			CoverUrl:     coffee.CoverUrl,
			Category:     coffee.Category,
			ProdLocation: coffee.ProdLocation,
		})
	}
	return &coffee_service.CoffeesResponse{Coffee: proto_coffees}, nil

}

func (s *GrpcCoffeeServiceHandler) GetCoffeeById(ctx context.Context, req *coffee_service.CoffeeByIdRequest) (*coffee_service.CoffeeResponse, error) {
	reqId := rand.Int64N(1000000)
	ctx = context.WithValue(ctx, "requestId", reqId)
	coffee, err := s.svc.GetCoffeeById(ctx, int(req.Id))
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get coffee by id: %v", err)
	}
	return &coffee_service.CoffeeResponse{Coffee: &coffee_service.Coffee{
		Id:       int32(coffee.Id),
		Name:     coffee.Name,
		CoverUrl: coffee.CoverUrl,
		Category: coffee.Category,
	}}, nil
}

func (s *GrpcCoffeeServiceHandler) GetCoffeeByName(ctx context.Context, req *coffee_service.CoffeeByNameRequest) (*coffee_service.CoffeeResponse, error) {
	reqId := rand.Int64N(1000000)
	ctx = context.WithValue(ctx, "requestId", reqId)
	coffee, err := s.svc.GetCoffeeByName(ctx, req.Name)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get coffee by name: %v", err)
	}
	return &coffee_service.CoffeeResponse{Coffee: &coffee_service.Coffee{
		Id:       int32(coffee.Id),
		Name:     coffee.Name,
		CoverUrl: coffee.CoverUrl,
		Category: coffee.Category,
	}}, nil
}
