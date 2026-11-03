package com.quickown.backend.dto;

import java.util.List;

public record CatalogProvidersResponse(String marketCurrency, List<CatalogProviderStatus> providers) {}
