FROM golang:1.25.3-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./

RUN go mod download

COPY . .

RUN make build

FROM alpine:latest

COPY --from=builder /app/bin/coffee /usr/local/bin/coffee

CMD ["coffee"]