FROM golang:1.24-alpine AS builder

WORKDIR /src

COPY backend/go.mod backend/go.sum ./backend/
WORKDIR /src/backend
RUN go mod download

COPY backend/ /src/backend/
RUN CGO_ENABLED=1 GOOS=linux GOARCH=amd64 go build -o /out/server ./cmd/server

FROM alpine:3.20

RUN apk add --no-cache ca-certificates sqlite-libs && adduser -D -u 10001 appuser

WORKDIR /app

COPY --from=builder /out/server /app/server
COPY data-processing/data/cutoffs /app/data-processing/data/cutoffs

ENV PORT=8080
ENV CUTOFFS_CSV_DIR=/app/data-processing/data/cutoffs

EXPOSE 8080

USER appuser

CMD ["/app/server"]
