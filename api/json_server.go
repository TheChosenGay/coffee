package api

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"reflect"

	"github.com/rs/cors"
)

type JsonServerHandler interface {
	MakeJsonServiceHandler()
}

type JsonServer struct {
	listenAddr string
	handlers   map[string]JsonServerHandler
}

func NewJsonServer(listenAddr string) *JsonServer {
	return &JsonServer{
		listenAddr: listenAddr,
		handlers:   make(map[string]JsonServerHandler),
	}
}

func (s *JsonServer) RegisterHandler(name string, handler JsonServerHandler) error {
	if _, ok := s.handlers[name]; ok {
		return errors.New("service already registered")
	}
	log.Printf("register service: %s", name)
	s.handlers[name] = handler
	return nil
}

func (s *JsonServer) RegisterHandlers([]JsonServerHandler) error {
	for _, handler := range s.handlers {
		if err := s.RegisterHandler(reflect.TypeOf(handler).Name(), handler); err != nil {
			return err
		}
	}
	return nil
}

func (s *JsonServer) Run() error {
	for name, handler := range s.handlers {
		handler.MakeJsonServiceHandler()
		log.Printf("start service: %s", name)
	}
	// allow cross-origin requests
	c := cors.New(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"*"},
	})
	handler := c.Handler(http.DefaultServeMux)
	log.Println("Starting JSON server on port 8080")
	return http.ListenAndServe(s.listenAddr, handler)
}

func WriteToJson(w http.ResponseWriter, status int, v any) error {
	w.WriteHeader(status)
	return json.NewEncoder(w).Encode(v)
}
