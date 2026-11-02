package com.quickown.backend.Service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Map;

@Service
public class Channel3Service {

    private final WebClient webClient;

    public Channel3Service(
            @Value("${channel3.base-url:https://api.trychannel3.com}") String baseUrl,
            @Value("${channel3.api-key:${CHANNELV3_SECRET:}}") String apiKey) {
        
        this.webClient = WebClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("x-api-key", apiKey)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    public Map<?, ?> searchProducts(String query, int limit) {
        Map<String, Object> body = Map.of(
                "query", query,
                "limit", limit
        );

        return webClient.post()
                .uri("/v1/search")
                .bodyValue(body)
                .retrieve()
                .bodyToMono(Map.class)
                .block();
    }
}

