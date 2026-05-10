package ma.miyahi.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.config.server.EnableConfigServer;

/**
 * MIYAHI Config Server — Centralized Configuration
 * 
 * Serves configuration properties to all microservices from a local
 * native directory. Each service fetches its config on startup.
 * Access configs at http://localhost:8888/{service-name}/default
 */
@SpringBootApplication
@EnableConfigServer
public class ConfigServerApplication {

    public static void main(String[] args) {
        SpringApplication.run(ConfigServerApplication.class, args);
    }
}
