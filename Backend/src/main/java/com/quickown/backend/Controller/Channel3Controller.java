package com.quickown.backend.Controller;

import com.quickown.backend.Service.Channel3Service;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/products")
@CrossOrigin(origins = "*")
public class Channel3Controller {

    private final Channel3Service channel3Service;

    public Channel3Controller(Channel3Service channel3Service) {
        this.channel3Service = channel3Service;
    }

    @GetMapping("/search")
    public ResponseEntity<?> searchProducts(
            @RequestParam(defaultValue = "running shoes") String query,
            @RequestParam(defaultValue = "5") int limit) {
        try {
            Map<?, ?> result = channel3Service.searchProducts(query, limit);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }
}

