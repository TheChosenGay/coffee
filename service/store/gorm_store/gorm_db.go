package gorm_store

import (
	"fmt"
	"log"

	"gorm.io/driver/mysql"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type MySqlDatabaseOpts struct {
	Username string
	Password string
	Protocol string
	Addr     string
	DBName   string
}

func NewMySqlDatabase(opts MySqlDatabaseOpts) *gorm.DB {
	// refer https://github.com/go-sql-driver/mysql#dsn-data-source-name for details
	dsnWithOutDB := fmt.Sprintf("%s:%s@%s(%s)/?charset=utf8mb4&parseTime=True&loc=Local", opts.Username, opts.Password, opts.Protocol, opts.Addr)
	log.Println("mysql dsn:", dsnWithOutDB)
	db, err := gorm.Open(mysql.Open(dsnWithOutDB), &gorm.Config{})
	if err != nil {
		panic(err)
	}
	// 创建数据库（如果不存在）
	createDBSQL := fmt.Sprintf("CREATE DATABASE IF NOT EXISTS `%s` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci", opts.DBName)
	if err := db.Exec(createDBSQL).Error; err != nil {
		panic(fmt.Sprintf("failed to create database '%s': %v", opts.DBName, err))
	}

	// 关闭临时连接
	sqlDB, _ := db.DB()
	sqlDB.Close()

	dsn := fmt.Sprintf("%s:%s@%s(%s)/%s?charset=utf8mb4&parseTime=True&loc=Local", opts.Username, opts.Password, opts.Protocol, opts.Addr, opts.DBName)
	log.Println("mysql dsn:", dsn)
	db, err = gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil
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
