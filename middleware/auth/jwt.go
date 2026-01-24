package auth

import (
	"errors"
	"log"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/TheChosenGay/coffee/service/store"
	"github.com/TheChosenGay/coffee/types"
	jwt "github.com/golang-jwt/jwt/v5"
)

var hmacSampleSecret = []byte("my_secret_key")

type MiddlewareFunc func(next http.HandlerFunc) http.HandlerFunc

func WithJwt(userStore store.UserStore) MiddlewareFunc {
	return func(next http.HandlerFunc) http.HandlerFunc {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// 取出jwt token
			tokenString := r.Header.Get("Authorization")
			claims, err := parseToken(tokenString)
			if err != nil {
				slog.Error("user authorization failed", "error", err)
				return
			}
			// JWT claims 中的数字会被解析为 float64，需要转换
			userIdFloat, ok := claims["userId"].(float64)
			if !ok {
				slog.Error("user authorization failed", "error", errors.New("invalid user id"))
				return
			}
			userId := int(userIdFloat)
			password, ok := claims["password"].(string)
			if !ok {
				slog.Error("user authorization failed", "error", errors.New("invalid password"))
				return
			}
			user, err := userStore.GetUser(r.Context(), userId)
			if err != nil {
				slog.Error("user authorization failed", "error", err)
				return
			}
			if user.UserId == types.InvalidUserId || user.Password != password {
				slog.Error("user authorization failed, userId: ", strconv.Itoa(user.UserId), "user.Password: ", user.Password, "password: ", password, "error", errors.New("invalid user or password"))
				return
			}

			next(w, r)
		})
	}
}

func parseToken(tokenString string) (jwt.MapClaims, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (any, error) {
		return hmacSampleSecret, nil
	}, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}))
	if err != nil {
		log.Fatal(err)
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok {
		slog.Info("user authenticated", "userId", claims["userId"])
		return claims, nil
	} else {
		slog.Error("user authorization failed", "error", err)
		//  goto login page
		return nil, errors.New("user authorization failed")
	}
}

func CreateToken(userId int, password string) (string, error) {
	// Create a new token object, specifying signing method and the claims
	// you would like it to contain.
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"userId":   userId,
		"password": password,
	})

	// Sign and get the complete encoded token as a string using the secret
	tokenString, err := token.SignedString(hmacSampleSecret)
	if err != nil {
		return "", err
	}

	return tokenString, nil
}
