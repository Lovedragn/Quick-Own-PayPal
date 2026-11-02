package com.quickown.backend.controller;

import com.quickown.backend.dto.CatalogProviderStatus;
import com.quickown.backend.dto.CatalogProvidersResponse;
import com.quickown.backend.service.catalog.ProductCatalogService;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Exposes configured marketplace providers without revealing any credentials. */
@RestController
@RequestMapping("/api/catalog")
public class CatalogProviderController {

  private final ProductCatalogService catalogService;

  public CatalogProviderController(ProductCatalogService catalogService) {
    this.catalogService = catalogService;
  }

  @GetMapping("/providers")
  public ResponseEntity<CatalogProvidersResponse> providers() {
    Map<String, Boolean> configured = catalogService.configuredProviders();
    List<CatalogProviderStatus> providers =
        configured.entrySet().stream()
            .map(
                entry ->
                    new CatalogProviderStatus(
                        entry.getKey(), entry.getValue(), catalogService.getMarketCurrency()))
            .toList();
    return ResponseEntity.ok(
        new CatalogProvidersResponse(catalogService.getMarketCurrency(), providers));
  }
}
