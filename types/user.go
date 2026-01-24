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

func (u User) IsValid() bool {
	return u.UserId != InvalidUserId
}
