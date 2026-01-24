package types

type LoginInfo struct {
	UserId   int    `json:"user_id"`
	Password string `json:"password"`
}

type LoginResponse struct {
	UserId int    `json:"user_id"`
	Token  string `json:"token"`
}

func NewLoginResponse(userId int, token string) LoginResponse {
	return LoginResponse{
		UserId: userId,
		Token:  token,
	}
}

type RegisterInfo struct {
	Nickname string `json:"nickname"`
	Sex      Sex    `json:"sex"`
	Password string `json:"password"`
}
