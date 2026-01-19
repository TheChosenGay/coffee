package json_handler

import (
	"fmt"
	"net/http"
	"reflect"
	"runtime"
	"strings"
	"time"

	"github.com/sirupsen/logrus"
)

type HttpHandlerFunc func(w http.ResponseWriter, r *http.Request)

func WithLogTime(handler HttpHandlerFunc) HttpHandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		handler(w, r)
		duration := time.Since(start)
		logrus.WithField("json_handler", logrus.Fields{
			"api_name": getFunctionName(handler),
		}).Info(fmt.Sprintf("Json Http Server. consume: %d us", duration.Nanoseconds()/1000))
	}
}

func getFunctionName(fn interface{}) string {
	// 1. 获取函数指针
	pc := reflect.ValueOf(fn).Pointer()

	// 2. 通过指针获取函数信息
	fnInfo := runtime.FuncForPC(pc)
	if fnInfo == nil {
		return "unknown"
	}

	// 3. 获取完整函数名
	fullName := fnInfo.Name()

	// 4. 提取方法名（最后一部分）
	parts := strings.Split(fullName, ".")
	if len(parts) > 0 {
		return parts[len(parts)-1] // 返回: createRoom
	}
	return fullName
}
