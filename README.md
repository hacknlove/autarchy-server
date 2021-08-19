# autarchy-server

## Server behaviour

It listen at the port `CHANNEL` and at the port `PORT`

First connection to the port `CHANNEL` is consider main connection with the client

When any connection `P` arrives at `PORT` the server sends an `iv` to the client and pushes `P` in a fifo

The client connects again (`C`) the server pulls the first item (`P`) of the FIFO and creates a encrypted pipe `P<-->C`

The server encrypts the data before sending it to the client with some `PASSWORD` and a `iv` equals to a sha256 hash of `SECRET` + `iv`

The server decrypts the data before sending it to the origen of the request with some `PASSWORD` and a `iv` equals to a sha256 hash of `iv` + `SECRET`

## Client behaviour

The client is responsible for reading the request, sending it to the specific service and returning the response through the same socket.
