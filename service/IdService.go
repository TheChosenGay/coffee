package service

import "math/rand"

type IdService interface {
	GenerateRoomId() int
}

type idService struct {
}

func NewIdService() IdService {
	return &idService{}
}

func (s *idService) GenerateRoomId() int {
	return rand.Intn(1000000)
}
