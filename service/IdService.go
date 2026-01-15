package service

import "sync/atomic"

type IdService interface {
	GenerateRoomId() int
}

type idService struct {
	id atomic.Int32
}

func NewIdService() IdService {
	s := &idService{id: atomic.Int32{}}
	s.id.Store(0)
	return s
}

func (s *idService) GenerateRoomId() int {
	return int(s.id.Add(1))
}
