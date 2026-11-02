package com.quickown.backend.Config;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.json.jackson.JacksonJsonpMapper;
import co.elastic.clients.transport.ElasticsearchTransport;
import co.elastic.clients.transport.rest5_client.Rest5ClientTransport;
import co.elastic.clients.transport.rest5_client.low_level.Rest5Client;
import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import org.apache.hc.core5.http.Header;
import org.apache.hc.core5.http.message.BasicHeader;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ElasticsearchConfig {

  @Value("${elastic.endpoint:http://localhost:9200}")
  private String endpoint;

  @Value("${elastic.api-key:}")
  private String apiKey;

  @Bean
  public ElasticsearchClient elasticsearchClient() {
    List<Header> defaultHeaders = new ArrayList<>();
    if (apiKey != null && !apiKey.isBlank()) {
      defaultHeaders.add(new BasicHeader("Authorization", "ApiKey " + apiKey));
    }

    Rest5Client restClient =
        Rest5Client.builder(URI.create(endpoint))
            .setDefaultHeaders(defaultHeaders.toArray(new Header[0]))
            .build();

    ElasticsearchTransport transport =
        new Rest5ClientTransport(restClient, new JacksonJsonpMapper());

    return new ElasticsearchClient(transport);
  }
}
