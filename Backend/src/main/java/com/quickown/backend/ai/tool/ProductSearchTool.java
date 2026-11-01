package com.quickown.backend.ai.tool;

import com.quickown.backend.dto.product.ProductResult;
import com.quickown.backend.service.catalog.ProductCatalogService;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

/** Spring AI function tool that exposes product search to the shopping assistant. */
@Component
public class ProductSearchTool {

  private static final Logger LOGGER = LoggerFactory.getLogger(ProductSearchTool.class);

  private final ProductCatalogService productCatalogService;

  public ProductSearchTool(ProductCatalogService productCatalogService) {
    this.productCatalogService = productCatalogService;
  }

  @Tool(
      name = "search_products",
      description =
          """
          Search the product catalogue by product name, brand, category or description.
          Use this tool whenever a customer asks to find or discover products.
          Set inStockOnly=true whenever the customer asks for available, currently available,
          in-stock or purchasable items. If inStockOnly is true, return only products with
          at least one confirmed in-stock merchant offer.
          """)
  public List<ProductResult> searchProducts(
      @ToolParam(description = "Product name, brand, category or description to search for")
          String query,
      @ToolParam(
              description =
                  "True when the customer requests only available or in-stock products; otherwise"
                      + " false")
          boolean inStockOnly) {
    LOGGER.info("AI product search invoked. query='{}', inStockOnly={}", query, inStockOnly);

    List<ProductResult> results = productCatalogService.search(query, inStockOnly);
    LOGGER.info("Product search completed. resultCount={}", results.size());
    return results;
  }
}
