package store

import (
	"context"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/TheChosenGay/coffee/types"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func SetupDatabase(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open("test.db"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open database: %v", err)
	}
	if err := db.AutoMigrate(&UserModel{}); err != nil {
		t.Fatalf("failed to migrate database: %v", err)
	}
	return db
}

func TestCreateUser(t *testing.T) {
	db := SetupDatabase(t)
	defer func() {
		os.Remove("test.db")
	}()
	store := NewGormUserStore(db)
	if err := store.StoreUser(context.Background(), types.User{
		UserId:   616479200,
		Nickname: "test",
		Sex:      types.Male,
		Age:      20,
		Birthday: time.Now().Unix(),
	}); err != nil {
		t.Fatalf("failed to store user: %v", err)
	}
}

func TestGetUser(t *testing.T) {
	db := SetupDatabase(t)
	defer func() {
		os.Remove("test.db")
	}()
	store := NewGormUserStore(db)
	// Create a user
	userId := 80809090
	if err := store.StoreUser(context.Background(), types.User{
		UserId:   userId,
		Nickname: "test",
		Sex:      types.Male,
		Age:      20,
		Birthday: time.Now().Unix(),
	}); err != nil {
		t.Fatalf("failed to store user: %v", err)
	}
	//  Get the user
	user, err := store.GetUser(context.Background(), userId)
	if err != nil {
		t.Fatalf("failed to get user: %v", err)
	}
	if user.UserId != userId {
		t.Fatalf("user id (%d) is not corret ", user.UserId)
	}

	fmt.Println(user)
}

func TestDeleteUser(t *testing.T) {
	db := SetupDatabase(t)
	defer func() {
		os.Remove("test.db")
	}()
	store := NewGormUserStore(db)
	// Create a user
	userId := 80809090
	if err := store.StoreUser(context.Background(), types.User{
		UserId:   userId,
		Nickname: "test",
		Sex:      types.Male,
		Age:      20,
		Birthday: time.Now().Unix(),
	}); err != nil {
		t.Fatalf("failed to store user: %v", err)
	}
	// Delete the user
	if err := store.DeleteUser(context.Background(), userId); err != nil {
		t.Fatalf("failed to delete user: %v", err)
	}

	_, err := store.GetUser(context.Background(), userId)

	if err == nil {
		t.Fatalf("user is not deleted")
	}
}
