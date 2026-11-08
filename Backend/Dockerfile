# Build stage
FROM maven:3.9.9-eclipse-temurin-21-alpine AS builder
WORKDIR /build

# Copy pom.xml and dependencies first to leverage Docker layer caching
COPY pom.xml .
RUN mvn dependency:go-offline -B || true

# Copy source code and build executable jar
COPY src ./src
RUN mvn clean package -DskipTests

# Runtime stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Setup non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Create data directory for checkout persistence
RUN mkdir -p /app/data && chown -R appuser:appgroup /app

# Copy built jar from builder stage
COPY --from=builder /build/target/*.jar app.jar
RUN chown appuser:appgroup app.jar

USER appuser

# Render injects PORT env variable at runtime
ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["sh", "-c", "java -Dserver.port=${PORT} -jar app.jar"]

