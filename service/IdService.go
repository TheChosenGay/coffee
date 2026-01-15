package service

import "sync/atomic"

type IdService interface {
	GenerateId() int
}

type roomIdService struct {
	id atomic.Int32
}

func NewRoomIdService() IdService {
	s := &roomIdService{id: atomic.Int32{}}
	s.id.Store(0)
	return s
}

func (s *roomIdService) GenerateId() int {
	return int(s.id.Add(1))
}

type userIdService struct {
	id atomic.Int32
}

func NewUserIdService() IdService {
	s := &userIdService{id: atomic.Int32{}}
	s.id.Store(0)
	return s
}

func (s *userIdService) GenerateId() int {
	return int(s.id.Add(1))
}
