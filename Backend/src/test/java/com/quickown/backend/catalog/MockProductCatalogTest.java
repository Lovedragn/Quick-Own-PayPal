package com.quickown.backend.catalog;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class MockProductCatalogTest {

  private final MockProductCatalog catalog = new MockProductCatalog();

  @Test
  void findsSamsungSmartphones() {
    var results = catalog.search("Samsung smartphones");

    assertEquals(2, results.size());
    assertTrue(results.stream().allMatch(p -> p.brand().equals("Samsung")));
  }

  @Test
  void findsOnePlusPhones() {
    var results = catalog.search("OnePlus phones");

    assertEquals(1, results.size());
    assertEquals("Nord CE 4 Lite", results.get(0).name());
  }

  @Test
  void findsExactProductName() {
    var results = catalog.search("Galaxy M35 5G");

    assertEquals(1, results.size());
    assertEquals("Galaxy M35 5G", results.get(0).name());
  }

  @Test
  void findsWirelessEarbudsWhenStockIsNotFiltered() {
    var results = catalog.search("wireless earbuds");

    assertEquals(1, results.size());
    assertEquals("Redmi Buds 5", results.get(0).name());
    assertTrue(!results.get(0).inStock());
  }

  @Test
  void findsAvailableSmartphones() {
    var results = catalog.search("smartphones", true);

    assertEquals(3, results.size());
    assertTrue(results.stream().allMatch(MockProductCatalog.Product::inStock));
  }

  @Test
  void excludesOutOfStockEarbudsWhenExplicitStockFilterIsEnabled() {
    assertTrue(catalog.search("wireless earbuds", true).isEmpty());
  }

  @Test
  void queryAvailabilityWordingStillFiltersOutOfStockProducts() {
    assertTrue(catalog.search("available wireless earbuds").isEmpty());
  }

  @Test
  void returnsNoResultsForUnknownProduct() {
    assertTrue(catalog.search("Apple laptops").isEmpty());
  }

  @Test
  void returnsNoResultsForBlankQuery() {
    assertTrue(catalog.search("   ").isEmpty());
  }
}
