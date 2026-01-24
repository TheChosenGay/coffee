package auth

import (
	"log"
	"log/slog"
	"net/http"

	jwt "github.com/golang-jwt/jwt/v5"
)

var hmacSampleSecret = []byte("my_secret_key")

func WithJwt(next http.HandlerFunc) http.HandlerFunc {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// 取出jwt token
		tokenString := r.Header.Get("Authorization")
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (any, error) {
			return hmacSampleSecret, nil
		}, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}))
		if err != nil {
			log.Fatal(err)
		}

		if claims, ok := token.Claims.(jwt.MapClaims); ok {
			slog.Info("user authenticated", "userId", claims["userId"])
		} else {
			slog.Error("user authorization failed", "error", err)
			//  goto login page
			return
		}
		next(w, r)
	})
}

func CreateToken(userId int) (string, error) {
	// Create a new token object, specifying signing method and the claims
	// you would like it to contain.
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"userId": userId,
	})

	// Sign and get the complete encoded token as a string using the secret
	tokenString, err := token.SignedString(hmacSampleSecret)
	if err != nil {
		return "", err
	}

	return tokenString, nil
}
