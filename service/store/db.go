package store

import (
	"fmt"

	"gorm.io/driver/mysql"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type MySqlDatabaseOpts struct {
	Username string
	Password string
	Protocol string
	Addr     string
	DBname   string
}

func NewMySqlDatabase(opts MySqlDatabaseOpts) *gorm.DB {
	// refer https://github.com/go-sql-driver/mysql#dsn-data-source-name for details
	dsn := fmt.Sprintf("%s:%s@%s/%s?charset=utf8mb4&parseTime=True&loc=Local", opts.Username, opts.Password, opts.Protocol, opts.DBname)
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		panic(err)
	}
	return db
}

type SqliteDatabaseOpts struct {
	Path string
}

func NewSqliteDatabase(opts SqliteDatabaseOpts) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(opts.Path), &gorm.Config{})
	if err != nil {
		panic(err)
	}
	return db
}
