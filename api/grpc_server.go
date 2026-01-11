package api

import (
	"errors"
	"log"
	"net"
	"reflect"

	"google.golang.org/grpc"
)

type GrpcServerHandler interface {
	RegisterGrpcService(server *grpc.Server)
}

type GrpcServer struct {
	listenAddr string
	grpcServer *grpc.Server
	handlers   map[string]GrpcServerHandler
}

func NewGrpcServer(listenAddr string) *GrpcServer {
	return &GrpcServer{
		listenAddr: listenAddr,
		grpcServer: grpc.NewServer(),
		handlers:   make(map[string]GrpcServerHandler),
	}
}

func (s *GrpcServer) RegisterHandler(name string, handler GrpcServerHandler) error {
	if _, ok := s.handlers[name]; ok {
		return errors.New("service already registered")
	}
	s.handlers[name] = handler
	return nil
}

func (s *GrpcServer) RegisterHandlers([]GrpcServerHandler) error {
	for _, handler := range s.handlers {
		if err := s.RegisterHandler(reflect.TypeOf(handler).Name(), handler); err != nil {
			return err
		}
	}
	return nil
}

func (s *GrpcServer) Run() error {
	for name, handler := range s.handlers {
		handler.RegisterGrpcService(s.grpcServer)
		log.Printf("start service: %s", name)

	}
	lis, err := net.Listen("tcp", s.listenAddr)
	if err != nil {
		return err
	}
	return s.grpcServer.Serve(lis)
}
