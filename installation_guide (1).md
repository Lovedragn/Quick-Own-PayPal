# PayPal Modern Integration & Hackathon Stack Setup Guide

*Next.js Frontend (PayPal JS SDK v6) + Spring Boot Backend + Official Hackathon Partner Tooling (APIMatic, Channel3, Elastic)*

---

## 1. Frontend Setup (Next.js & Agent Tools)

### 1.1 Install Core & PayPal Packages

In your Next.js project root:

```bash
# Official PayPal JS Loader with v6 support
npm install @paypal/paypal-js

# HTTP Client for backend communication
npm install axios
```

### 1.2 Install Hackathon Partner & Agent Libraries

```bash
# APIMatic context & schema toolkit
npm install @apimatic/core

# Vercel AI SDK & Model Context Protocol (MCP) tooling
npm install ai @ai-sdk/openai @modelcontextprotocol/sdk

# Optional UI sponsor components (AG Grid & Bryntum)
npm install ag-grid-react ag-grid-community
```

### 1.3 Frontend Environment Configuration (`.env.local`)

```env
# PayPal Credentials
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_paypal_sandbox_client_id
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080

# Hackathon Sponsor API Keys
APIMATIC_API_KEY=your_apimatic_api_key
CHANNEL3_API_KEY=your_channel3_api_key
OPENAI_API_KEY=your_openai_or_gemini_api_key
```

---

## 2. APIMatic Tooling & Code Generation

APIMatic supplies machine-readable API contexts for LLMs and automatically generates typed SDKs directly from PayPal's OpenAPI definitions.

### 2.1 Install APIMatic CLI (Global)

```bash
npm install -g @apimatic/cli
```

### 2.2 Generate Typed Clients & Agent Tools

```bash
# Authenticate CLI with your hackathon sponsor key
apimatic login --api-key your_apimatic_api_key

# Generate TypeScript client for Next.js
apimatic generate --spec-url https://raw.githubusercontent.com/paypal/paypal-rest-api-specifications/main/openapi/checkout_orders_v2.json --language typescript --output ./lib/paypal-client

# Generate Java client for Spring Boot
apimatic generate --spec-url https://raw.githubusercontent.com/paypal/paypal-rest-api-specifications/main/openapi/checkout_orders_v2.json --language java --output ./backend/paypal-sdk
```

---

## 3. Backend Setup (Spring Boot)

The backend exposes REST endpoints, executes orders via PayPal's v2 REST API, and can query vector search (Elastic) or product catalog data (Channel3).

### 3.1 Dependencies Configuration

#### Option A: Maven (`pom.xml`)

Add inside `<dependencies>`:

```xml
<!-- Spring Boot Web Starter -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>

<!-- Spring Security & OAuth2 Client / Resource Server for Authentication & Security -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-oauth2-client</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-oauth2-resource-server</artifactId>
</dependency>

<!-- WebClient for PayPal, Channel3, and APIMatic REST requests -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-webflux</artifactId>
</dependency>

<!-- Elasticsearch Java Client (Vector / Hybrid Search) -->
<dependency>
    <groupId>co.elastic.clients</groupId>
    <artifactId>elasticsearch-java</artifactId>
    <version>8.14.0</version>
</dependency>

<!-- JSON Serialization -->
<dependency>
    <groupId>com.fasterxml.jackson.core</groupId>
    <artifactId>jackson-databind</artifactId>
</dependency>

<!-- Lombok Boilerplate Reducer -->
<dependency>
    <groupId>org.projectlombok</groupId>
    <artifactId>lombok</artifactId>
    <optional>true</optional>
</dependency>
```

#### Option B: Gradle (`build.gradle`)

Add inside `dependencies { ... }`:

```groovy
implementation 'org.springframework.boot:spring-boot-starter-web'
implementation 'org.springframework.boot:spring-boot-starter-security'
implementation 'org.springframework.boot:spring-boot-starter-oauth2-client'
implementation 'org.springframework.boot:spring-boot-starter-oauth2-resource-server'
implementation 'org.springframework.boot:spring-boot-starter-webflux'
implementation 'co.elastic.clients:elasticsearch-java:8.14.0'
implementation 'com.fasterxml.jackson.core:jackson-databind'
compileOnly 'org.projectlombok:lombok'
annotationProcessor 'org.projectlombok:lombok'
```

### 3.2 Backend Configuration (`src/main/resources/application.properties`)

```properties
server.port=8080

# Spring Security OAuth2 / OIDC Configuration (e.g., Google / Auth0 / Keycloak)
# Example OAuth2 Client (for user login):
spring.security.oauth2.client.registration.google.client-id=your_oauth2_client_id
spring.security.oauth2.client.registration.google.client-secret=your_oauth2_client_secret
spring.security.oauth2.client.registration.google.scope=openid,profile,email

# Example OAuth2 Resource Server (JWT verification for secured API endpoints):
# spring.security.oauth2.resourceserver.jwt.issuer-uri=https://accounts.google.com

# PayPal Sandbox API (OAuth 2.0 Client Credentials & Endpoints)
paypal.client-id=your_paypal_sandbox_client_id
paypal.client-secret=your_paypal_sandbox_secret
paypal.base-url=https://api-m.sandbox.paypal.com

# Channel3 Catalog API
channel3.api-key=your_channel3_api_key
channel3.base-url=https://api.channel3.com/v1

# Elastic Hybrid / Vector Search
elastic.endpoint=your_elastic_cloud_endpoint
elastic.api-key=your_elastic_api_key
```

### 3.3 Security Configuration Class (`SecurityConfig.java`)

Create `src/main/java/com/quickown/backend/Security/SecurityConfig.java` to configure endpoint security and OAuth2:

```java
package com.quickown.backend.Security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/public/**", "/error").permitAll()
                .anyRequest().authenticated()
            )
            .oauth2Login(Customizer.withDefaults())
            .oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()));

        return http.build();
    }
}
```

### 3.4 PayPal OAuth 2.0 Token Helper Service

PayPal v2 REST endpoints authenticate using OAuth 2.0 Client Credentials flow (`/v1/oauth2/token`). Use a dedicated helper to retrieve and cache the bearer access token:

```java
package com.quickown.backend.Service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;

@Service
public class PayPalAuthService {

    @Value("${paypal.client-id}")
    private String clientId;

    @Value("${paypal.client-secret}")
    private String clientSecret;

    @Value("${paypal.base-url}")
    private String baseUrl;

    private final WebClient webClient = WebClient.builder().build();

    public String getAccessToken() {
        String basicAuth = Base64.getEncoder()
                .encodeToString((clientId + ":" + clientSecret).getBytes(StandardCharsets.UTF_8));

        Map<?, ?> response = webClient.post()
                .uri(baseUrl + "/v1/oauth2/token")
                .header(HttpHeaders.AUTHORIZATION, "Basic " + basicAuth)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(BodyInserters.fromFormData("grant_type", "client_credentials"))
                .retrieve()
                .bodyToMono(Map.class)
                .block();

        return response != null ? (String) response.get("access_token") : null;
    }
}
```

---

## 4. End-to-End Hackathon Architecture

```
[ Buyer / Chat Interface ]
            │
            ▼
[ Next.js AI Agent (Vercel AI SDK) ]
      │
      ├──► 1. Channel3 API ──────────► (Search 100M+ real retail products)
      ├──► 2. APIMatic Context ──────► (Provides strict PayPal function schema to agent)
      ├──► 3. PayPal SDK v6 ─────────► (Renders checkout modal / buyer approval)
      │
      ▼
[ Spring Boot Backend ]
      │
      ├──► 4. PayPal Orders v2 API ──► (Generates & captures order tokens)
      └──► 5. Elastic Vector Store ──► (RAG product search & semantic transaction log)
```