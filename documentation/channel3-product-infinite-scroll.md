# Channel3 product pagination (infinite scroll)

Quick-Own uses Channel3's cursor-based product search rather than numbered pages.

## API contract

The first conversational search initializes a product page with
`channel3.products.search({ query, image/base64_image, limit })`. The SDK's
`Page.response.next_page_token` is returned to the browser with the first grid.
Channel3 documents this as `next_page_token` in the search response.

When the scroll sentinel nears the viewport, the browser calls
`POST /api/products/search/page` with the original query or image and the opaque
`pageToken`. The server passes it to Channel3 as `page_token` and returns the
new products plus the next `next_page_token`.

- Page size is 20 (Channel3 permits up to 30).
- The Channel3 API key remains on the server; the browser never calls Channel3 directly.
- The authenticated user's ID is resolved from the Supabase access token and supplied
  to Channel3 for offer attribution.
- The UI appends by product ID, removes duplicates, preserves offer/quantity state,
  and uses the same filters and sort controls for the expanded result set.
- A request lock prevents duplicate concurrent loads. If a cursor repeats, scrolling
  stops to avoid an infinite request loop.
- A failed append leaves the current grid intact and exposes a retry control.
- Appended products are merged into the current Supabase conversation turn and the
  local History snapshot; they do not create a new conversation turn.

## UI behavior

The product grid observes a sentinel below the cards with `IntersectionObserver`
and a 700px root margin. There are no numbered page controls. A small loading state
appears while the next cursor is being fetched, and an end-of-results message appears
when Channel3 returns no further cursor.

Historical turns display their saved product snapshot. They do not attempt to use
an expired or unavailable pagination cursor; a new search initializes a fresh cursor.

## Channel3 reference

- `POST /v1/search`: `query?`, `image_url?`, `base64_image?`, `limit?`,
  `page_token?` and other filters/config.
- Response: `SearchResponse` with `products` and `next_page_token`.
- TypeScript SDK: `client.products.search({...})` returns a `Page`; its
  `response.next_page_token` is the token used for the next request.
