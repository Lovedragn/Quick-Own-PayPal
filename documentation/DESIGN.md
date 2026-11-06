---
name: Quick-Own
description: AI shopping agent with transparent catalogue offers and PayPal checkout
colors:
  primary: "#0070BA"
  primary-hover: "#005ea6"
  accent-cyan: "#00CFDE"
  accent-indigo: "#4F46E5"
  surface-light: "#FFFFFF"
  surface-dark: "#12151F"
  background-light: "#F8FAFC"
  background-dark: "#090A0F"
  border-light: "#E2E8F0"
  border-dark: "#22293A"
  text-light: "#0F172A"
  text-dark: "#F8FAFC"
  muted-light: "#64748B"
  muted-dark: "#94A3B8"
  status-sandbox: "#F59E0B"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "3.75rem"
    fontWeight: 800
    lineHeight: 1.12
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "-0.01em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.625
    letterSpacing: "0em"
  label:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.05em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.lg}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-search:
    backgroundColor: "{colors.text-light}"
    textColor: "#FFFFFF"
    rounded: "{rounded.xl}"
    padding: "14px 24px"
  card-surface:
    backgroundColor: "{colors.surface-light}"
    rounded: "{rounded.xl}"
    padding: "20px"
---

# Design System: Quick-Own

## Overview

**Creative North Star: "The Trust Protocol"**

Quick-Own combines institutional fintech security with the responsiveness of an intelligent shopping console. The visual language balances clean, calm utility with crisp structural clarity. Rather than looking like an experimental toy or playful chatbot, Quick-Own feels like a mission-critical financial instrument built to handle real customer intent and verified monetary transactions.

The interface functions across dual lighting environments: a radiant slate-lit canvas for daytime clarity and an obsidian deep-navy environment for focused shopping sessions. Structural surfaces establish depth through high-definition borders and quiet tonal layering, with electric accents highlighting intent parsing and payment commitment.

**Key Characteristics:**
- **Institutional Clarity:** High contrast typography and deliberate monospaced labeling anchor data integrity.
- **Crisp Structural Layering:** 1px borders define cards and consoles without muddy drop shadows.
- **Tactile Commitment:** Form controls, quantity adjusters, and payment buttons deliver clear tactile feedback.
- **Honest Telemetry:** Sandbox status, price origins, and currency disclosures are prominently badged.

## Colors

The palette pairs fintech authority with intelligent agentic telemetry against high-contrast slate surfaces.

### Primary
- **PayPal Precision Blue** (#0070BA): The core institutional accent. Anchors the brand identity, highlights selected offers, and powers the primary checkout commitment button.
- **PayPal Blue Hover** (#005ea6): Deepened blue state providing immediate feedback on interaction.

### Secondary
- **Agentic Electric Cyan** (#00CFDE): Represents machine intelligence, query parsing, and active focus boundaries on search inputs.
- **Terminal Indigo** (#4F46E5): Supporting telemetry accent for architectural diagrams, API route methods, and multi-tier diagrams.

### Neutral
- **Deep Void Background (Dark)** (#090A0F): Deep canvas background providing high contrast for dark mode.
- **Light Slate Background (Light)** (#F8FAFC): Fresh, low-glare slate canvas for light mode.
- **Dark Navy Surface** (#12151F): Structured container background for cards, hero consoles, and dialogs in dark mode.
- **Pure White Surface** (#FFFFFF): Clean crisp container surface in light mode.
- **Structural Border (Dark)** (#22293A): 1px border framing dark containers with high-definition edge separation.
- **Structural Border (Light)** (#E2E8F0): 1px boundary framing cards in daylight mode.
- **High-Contrast Text** (#0F172A / #F8FAFC): Primary reading color achieving maximum readability.
- **Muted Telemetry** (#64748B / #94A3B8): Secondary captions, timestamps, and merchant origin notes.
- **Sandbox Amber Warning** (#F59E0B): Distinct test-mode indicator communicating sandbox limitations clearly.

### Named Rules
**The Universal Blue Rule.** Blue serves as the dynamic visual anchor across actionable elements, brand insignias, and checkout commitment, while maintaining strict high contrast against backgrounds.
**The Telemetry Disclosure Rule.** All automated status messages and sandbox flags must utilize dedicated semantic colors (e.g. amber for sandbox environment, cyan for AI recommendation routes) to prevent confusion with consumer production workflows.

## Typography

**Display Font:** System Sans (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`)
**Body Font:** System Sans (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`)
**Label/Mono Font:** Monospace (`ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`)

**Character:** Clean, rapid-loading system fonts optimized for interface rendering speed, paired with technical monospace accents for financial and telemetry data.

### Hierarchy
- **Display** (800, clamp(2.25rem, 5vw, 3.75rem), 1.12): Hero value proposition and high-impact landing headers.
- **Headline** (700, 1.875rem–2.25rem, 1.25): Major section titles, architecture blocks, and result summaries.
- **Title** (600, 1.125rem–1.25rem, 1.4): Product card titles, offer summaries, and modal titles.
- **Body** (400, 0.875rem–1rem, 1.6): Explanatory descriptions, feature bullet lists, and guidance notes.
- **Label** (500, 0.6875rem–0.75rem, 1.0, tracking 0.05em, uppercase): Monospace badges, API routes, currency indicators, and sandbox badges.

### Named Rules
**The Monospace Telemetry Rule.** All machine-generated hashes, order IDs, currency codes, and HTTP methods must render in monospace font to clearly delineate system output from human editorial content.

## Layout

The spatial model relies on centered max-width constraint containers (`max-w-7xl` for full-width views, `max-w-5xl` for discovery hero, `max-w-3xl` for input console and bento grids). Layout rhythm strictly adheres to 4px/8px incremental spacing steps (`gap-2`, `gap-3`, `gap-6`, `py-16`, `py-24`).

On mobile displays, horizontal multi-column grids gracefully collapse into unified vertical card stacks, maintaining minimum 44px tap targets for offer radio selectors and quantity buttons.

## Elevation & Depth

Surfaces are crisp and flat by default, relying on tonal contrast and 1px border definitions rather than diffuse drop shadows. Elevation is primarily state-driven: cards elevate subtly on hover, and payment triggers radiate a restrained blue aura.

### Shadow Vocabulary
- **Subtle Surface** (`box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05)`): Light-mode card grounding.
- **PayPal Glow** (`box-shadow: 0 4px 14px rgba(0, 112, 186, 0.35)`): Ambient hover glow for primary PayPal checkout buttons.

### Named Rules
**The Border-Before-Shadow Rule.** Surfaces establish structural boundaries through precise 1px borders (`#E2E8F0` / `#22293A`) before resorting to shadows.
**The State-Activated Glow Rule.** Diffuse shadows and color glows appear strictly as a response to interactive state (hover, focus, pending checkout).

## Shapes

- **Hero Search Console:** Broad pill shape (`border-radius: 24px` / `rounded-3xl`) communicating an inviting, receptive prompt area.
- **Containers & Product Cards:** Structured rectangle with softened corners (`border-radius: 16px` / `rounded-2xl`).
- **Interactive Action Buttons:** Confident radius (`border-radius: 12px` / `rounded-xl`).
- **Badges and Pills:** Fully pill-shaped geometry (`border-radius: 9999px` / `rounded-full`) for operational tags and stock indicators.

## Components

### Buttons
- **Shape:** Rounded rectangle (12px radius).
- **Primary Checkout Button:** Solid PayPal blue (#0070BA), bold white text, inline PayPal monogram SVG, internal padding 12px 16px (`py-3 px-4`). On hover, transitions to #005ea6 with `.paypal-glow`.
- **Primary Search Button:** High-contrast solid fill (Slate-900 in light, Pure White in dark), padding 14px 24px.
- **Quantity Controls:** Segmented button group with 1px border, 6px corner radius, tactile hover highlight.

### Cards / Containers
- **Corner Style:** Rounded-2xl (16px radius).
- **Background:** Pure white (#FFFFFF) in light mode; dark navy (#12151F) in dark mode.
- **Border:** 1px solid border (#E2E8F0 light / #22293A dark).
- **Internal Padding:** 20px to 24px (`p-5 sm:p-6`).

### Inputs / Search Console
- **Style:** 24px radius, padded container housing search icon, transparent input text field, and primary submit action.
- **Focus:** Highlighted with electric cyan boundary (`#00CFDE`) and subtle 2px outer cyan ring (`ring-2 ring-[#00CFDE]/20`).

### Badges & Status Indicators
- **Sandbox Pill:** Amber background (`bg-amber-500/10`), amber border (`border-amber-500/20`), amber indicator dot and text (`text-amber-500`).
- **Merchant Source Tag:** Monospace badge (`bg-slate-100 dark:bg-slate-800`), bordered, displaying catalog origin.
- **Rank Indicator:** Square badge (24px by 24px, 6px radius) showing recommendation placement `#1`, `#2`.

### Navigation
- **Style:** Sticky top header (64px height) with 95% opacity backdrop blur (`backdrop-blur-xs`), bottom border separation, integrated brand logo, anchor links, sandbox environment pill, and theme toggle.

## Do's and Don'ts

### Do:
- **Do** revalidate and disclose actual merchant source names, offer URLs, and original currencies on every recommendation card.
- **Do** prominently feature the PayPal Sandbox disclaimer in headers, footers, and checkout summaries.
- **Do** preserve 1px high-definition borders across light and dark modes to maintain component geometry.
- **Do** display loading indicators during Spring AI extraction and PayPal order creation.

### Don't:
- **Don't** simulate chatbot conversational fluff, fake typing delays, or cartoon avatars; keep interactions direct and grounded.
- **Don't** hide or silently convert currencies when catalog fallbacks occur; disclose fallback currencies explicitly.
- **Don't** permit checkout triggers without server-calculated price verification and active stock validation.
- **Don't** introduce heavy multi-color gradients that compete with brand trust and telemetry clarity.

