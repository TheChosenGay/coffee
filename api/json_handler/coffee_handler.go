package json_handler

import (
	"context"
	"encoding/json"
	"errors"
	"math/rand/v2"
	"net/http"
	"strconv"

	"github.com/TheChosenGay/coffee/api"
	"github.com/TheChosenGay/coffee/middleware/logtime"
	"github.com/TheChosenGay/coffee/service"
	"github.com/TheChosenGay/coffee/types"
)

type JsonCoffeeServiceHandler struct {
	svc service.CoffeeService
}

func NewJsonCoffeeServiceHandler(svc service.CoffeeService) api.JsonServerHandler {
	return &JsonCoffeeServiceHandler{svc: svc}
}

func (s *JsonCoffeeServiceHandler) MakeJsonServiceHandler() {
	// list coffees
	http.HandleFunc("/coffee/list", logtime.WithLogTime(s.listCoffees))

	// get coffee by id
	http.HandleFunc("/coffee/get", logtime.WithLogTime(s.getCoffeeById))
}

func (s *JsonCoffeeServiceHandler) listCoffees(w http.ResponseWriter, r *http.Request) {
	reqId := rand.Int64N(1000000)
	ctx := context.WithValue(r.Context(), "requestId", reqId)
	// call real service
	if err := s.listCoffeesWith(ctx, w, r); err != nil {
		api.WriteToJson(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
	}
}

func (s *JsonCoffeeServiceHandler) getCoffeeById(w http.ResponseWriter, r *http.Request) {
	reqId := rand.Int64N(1000000)
	ctx := context.WithValue(r.Context(), "requestId", reqId)
	// call real service
	if err := s.getCoffeeByIdWith(ctx, w, r); err != nil {
		api.WriteToJson(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
}

func (s *JsonCoffeeServiceHandler) listCoffeesWith(ctx context.Context, w http.ResponseWriter, _ *http.Request) error {
	coffees, err := s.svc.ListCoffees(ctx)
	if err != nil {
		return err
	}
	return json.NewEncoder(w).Encode(types.CoffeeListResponse{Coffees: coffees})
}

func (s *JsonCoffeeServiceHandler) getCoffeeByIdWith(ctx context.Context, w http.ResponseWriter, r *http.Request) error {
	id := r.URL.Query().Get("id")
	idInt, err := strconv.Atoi(id)
	if err != nil {
		return errors.New("invalid id")
	}
	coffee, err := s.svc.GetCoffeeById(ctx, idInt)
	if err != nil {
		return err
	}
	return json.NewEncoder(w).Encode(types.CoffeeResponse{Coffee: coffee})
}
