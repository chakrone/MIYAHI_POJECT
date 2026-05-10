package ma.miyahi.gateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * MIYAHI API Gateway — Single entry point for all frontend requests.
 *
 * Routes traffic to downstream microservices via Eureka service discovery.
 * Handles CORS, rate limiting, and will handle JWT auth in production.
 */
@SpringBootApplication
public class ApiGatewayApplication {

    public static void main(String[] args) {
        SpringApplication.run(ApiGatewayApplication.class, args);
    }
}
