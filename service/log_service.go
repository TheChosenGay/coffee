package service

import (
	"context"
	"log"
	"time"

	"github.com/TheChosenGay/coffee/types"
	"github.com/sirupsen/logrus"
)

type LogServiceMiddleware struct {
	next CoffeeService
}

func NewLogServiceMiddleware(next CoffeeService) CoffeeService {
	return &LogServiceMiddleware{next: next}
}

func (l *LogServiceMiddleware) ListCoffees(ctx context.Context) (coffees []types.Coffee, err error) {
	defer func(t time.Time) {
		logrus.WithFields(logrus.Fields{
			"requestId":    ctx.Value("requestId"),
			"coffee count": len(coffees),
			"duration":     time.Since(t),
			"error":        err,
		}).Info("ListCoffees")
	}(time.Now())
	log.Println("ListCoffees")
	return l.next.ListCoffees(ctx)
}

func (l *LogServiceMiddleware) GetCoffeeById(ctx context.Context, id int) (types.Coffee, error) {
	log.Println("GetCoffeeById")
	return l.next.GetCoffeeById(ctx, id)
}

func (l *LogServiceMiddleware) GetCoffeeByName(ctx context.Context, name string) (types.Coffee, error) {
	log.Println("GetCoffeeByName")
	return l.next.GetCoffeeByName(ctx, name)
}
