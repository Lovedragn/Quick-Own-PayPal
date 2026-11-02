package com.quickown.backend.service.ai;

import com.quickown.backend.dto.shopping.ShoppingIntent;

/** Converts a natural-language customer request into a catalogue search intent. */
public interface ShoppingIntentInterpreter {

  ShoppingIntent interpret(String customerMessage);
}
