# E-commerce Order Fulfillment --- NestJS Microservices Practice Project

A practice project for learning NestJS microservices, RabbitMQ
messaging, Docker Compose, Prisma, and PostgreSQL. It demonstrates order
creation, inventory stock reservation, insufficient-stock handling, and
compensating stock release when a later reservation fails.

> **Scope:** Learning project, not production-ready commerce software.

## Services and infrastructure

  ------------------------------------------------------------------------
  Component             Responsibility                          Local port
  --------------------- --------------------- ----------------------------
  API Gateway           Entry point for                             `3000`
                        client requests       

  Inventory Service     Product data and                            `3001`
                        stock operations;     
                        exposes product HTTP  
                        endpoints and handles 
                        RabbitMQ messages     

  Order Service         Creates orders and                          `3002`
                        coordinates stock     
                        reservation/release   

  PostgreSQL            Persists product and          `5432` inside Docker
                        order data            

  RabbitMQ              Message broker                              `5672`
                        between Order and     
                        Inventory services    

  RabbitMQ Management   RabbitMQ                                   `15672`
  UI                    administration        
                        interface             
  ------------------------------------------------------------------------

The application services run in Docker Compose. Containers communicate
using Compose service names, such as `postgres` and `rabbitmq`, rather
than `localhost`.

## Technology used

-   NestJS
-   TypeScript
-   RabbitMQ for service-to-service messaging
-   PostgreSQL
-   Prisma ORM
-   Docker and Docker Compose
-   Postman for API testing

## Architecture

``` text
Postman / Client
      |
      v
 API Gateway (:3000)

 Inventory Service (:3001) <---- RabbitMQ ----> Order Service (:3002)
          |                                      |
          +---------------- PostgreSQL -----------+
```

The Order Service sends stock-reservation and stock-release messages
through RabbitMQ. The Inventory Service handles the messages and reports
whether the operation succeeded.

## Main workflow

### Successful order

1.  A client submits an order to the Order Service.
2.  The Order Service requests stock reservations through RabbitMQ.
3.  The Inventory Service checks and reserves the requested quantities.
4.  Once all reservations succeed, the Order Service creates the order
    in PostgreSQL.
5.  The API returns the created order, including its items.

### Insufficient stock

If the Inventory Service reports that a reservation failed, the Order
Service rejects the request. Insufficient stock is represented as an
HTTP `400 Bad Request`, rather than a generic
`500 Internal Server Error`.

### Compensating stock release

If an order contains multiple items and a later reservation fails, the
Order Service attempts to release stock reserved for earlier items. This
is a basic **compensation pattern** for coordinating work across
services; it is not a distributed database transaction.

## Environment configuration

The root `.env` file used by Docker Compose contains the following
settings:

``` env
API_GATEWAY_PORT=3000
INVENTORY_SERVICE_PORT=3001
ORDER_SERVICE_PORT=3002
RABBITMQ_PORT=5672
RABBITMQ_MANAGEMENT_PORT=15672
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_local_password
POSTGRES_DB=orders_db
```

Use your own local database password. Do not commit real credentials to
a public repository.

The Order Service database URL used during development was in this form:

``` env
DATABASE_URL="postgresql://postgres:URL_ENCODED_PASSWORD@postgres:5432/orders_db?schema=public"
```

The Inventory Service used a separate database and database user:

``` env
DATABASE_URL="postgresql://app_user:URL_ENCODED_PASSWORD@postgres:5432/inventory_db?schema=public"
```

Encode special characters in the password when placing it in a URL. Keep
the actual connection strings in local environment files, not in source
control.

## Run the project

From the repository root:

``` bash
docker compose up -d --build
```

Check service status:

``` bash
docker compose ps
```

View logs for a service:

``` bash
docker compose logs --tail=50 order-service
docker compose logs --tail=50 inventory-service
```

Restart one service:

``` bash
docker compose restart order-service
```

Stop the services without deleting persistent volumes:

``` bash
docker compose down
```

The project uses named Docker volumes for PostgreSQL and RabbitMQ data.
Avoid `docker compose down -v` if you want to preserve local database
and broker data.

## API testing notes

The Inventory Service product endpoint was tested successfully in
Postman:

``` http
GET http://localhost:3001/products
```

Product creation uses:

``` http
POST http://localhost:3001/products
Content-Type: application/json
```

The product DTO expects fields including `sku` and `unitPrice`; stock
initialization uses `availableQuantity`. Follow the DTO in the source
code for the complete required body.

Order creation was tested using:

``` http
POST http://localhost:3002/orders
Content-Type: application/json
```

Example request body (replace the product ID and price with real product
data):

``` json
{
  "items": [
    {
      "productId": "YOUR_PRODUCT_ID",
      "quantity": 1,
      "unitPrice": 29.99
    }
  ]
}
```

Use the exact routes and DTO definitions in the repository if they
differ from these examples.

## Verification completed

The following behaviors were tested manually:

-   [x] Product data can be retrieved from the Inventory Service.
-   [x] A valid order is created and returned with status `PENDING`.
-   [x] Successful reservation reduces available stock by the requested
    quantity.
-   [x] An order requesting more stock than is available is rejected
    with an insufficient-stock message.
-   [x] A failed single-item reservation does not change the product's
    available quantity.
-   [x] In a multi-item order, if the first product's stock is reserved
    and the second reservation fails, the first product's stock is
    restored.
-   [x] The insufficient-stock response uses an appropriate client error
    rather than a generic internal server error.
-   [x] Docker networking and PostgreSQL hostname resolution were
    debugged and verified.

These are manual development checks, not a comprehensive automated test
suite.

## Key lessons

-   Use Docker Compose service names for container-to-container
    connections.
-   A running container does not guarantee that its network aliases and
    service dependencies are configured correctly.
-   Keep each microservice's responsibilities clear.
-   RabbitMQ lets services communicate without direct HTTP calls between
    them.
-   Reserve stock before persisting the order, and compensate for
    earlier reservations if a later step fails.
-   Use specific HTTP exceptions for expected business-rule failures.
-   Test failure paths as well as successful requests.

## Known limitations

This project was built for practice. It does not claim to provide all
production safeguards. Potential future improvements, if needed,
include:

-   Automated unit and integration tests
-   Idempotent message processing and duplicate-request protection
-   RabbitMQ retry and dead-letter policies
-   Durable recovery for failures or crashes during compensation
-   Authentication and authorization
-   Centralized logs, metrics, and distributed tracing
-   Production deployment and secrets management

These are intentionally outside the current practice scope.

## Completion status

**Completed for the intended learning objective.** The main
service-to-service order and inventory flow, insufficient-stock
behavior, and compensating stock release were exercised manually.
