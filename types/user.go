package types

type Sex int

const InvalidUserId = -1
const InvalidRoomId = -1

const (
	Male Sex = iota
	Female
)

type User struct {
	UserId   int
	Nickname string
	Sex      Sex
	Age      int
	Birthday int64
	Password string
}

type LoginInfo struct {
	UserId   int
	Password string
}

type LoginResponse struct {
	UserId int
	Token  string
}

func (u User) IsValid() bool {
	return u.UserId != InvalidUserId
}
