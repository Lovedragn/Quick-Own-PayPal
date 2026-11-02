# PayPal AI Hackathon — Release and Compliance Checklist

This checklist separates the hackathon requirements from optional quality improvements. Do not mark a submission item complete until it has been verified on the final public commit.

## A. Mandatory project requirements

| Requirement from Devpost | Current evidence | Status |
|---|---|---|
| Meaningful PayPal technology | PayPal Sandbox OAuth and Orders v2; order creation, approval status, capture and recovery | **Implemented**; buyer approval/capture rehearsal still required |
| Meaningful AI use | Gemini via Spring AI interprets natural-language intent | **Implemented**; live recommendation request verified |
| Working prototype | Next.js UI, Spring Boot API, Channel3 catalogue and PayPal Sandbox order creation | **Implemented locally**; final browser/payment rehearsal pending |
| Documentation | Root, backend and frontend READMEs with environment and setup guidance | **Drafted locally**; validate from a clean checkout |
| Public source repository | Existing public GitHub repository exists, but it is not the same folder as this active source tree | **Not synchronized** |
| Public open-source license | No root-level LICENSE exists in the working folder | **Blocked** until all contributors agree on licensing |
| Functional demo or run instructions | Local setup instructions are in the root README; no hosted demo URL yet | **Local run path documented**; clean-clone verification pending |
| Tools used explained | Root README and Devpost draft identify Gemini, Spring AI, Channel3, PayPal, Next.js and Java | **Drafted**; publish with final submission |
| Demo video under 3 minutes | A timed 2:45 script exists in `DEMO_SCRIPT.md` | **Not recorded/uploaded** |
| Public YouTube link | No final YouTube link yet | **Not complete** |
| Official rules | Must be checked before submission, including eligibility and content permissions | **Participant confirmation required** |

## B. Verified implementation and quality checks

- [x] Backend clean Maven build and test suite: 71 tests, 0 failures, 0 errors, 0 skipped.
- [x] Frontend ESLint: passed.
- [x] Frontend production build: passed; home, checkout success and checkout cancellation routes generated.
- [x] Local frontend routes return HTTP 200.
- [x] Backend health endpoint returns `UP`.
- [x] Catalogue provider endpoint reports Channel3 configured; optional Flipkart and Amazon.in are not configured.
- [x] Gemini + Channel3 live recommendation returned an iPhone 16 product record, product ID, merchant, offer URL and USD price.
- [x] PayPal Sandbox order creation succeeded for the selected iPhone 16 offer at USD 565.00.
- [x] PayPal order status returned `PAYER_ACTION_REQUIRED` and `buyerApproved=false`; no capture was performed in the smoke test.
- [x] Channel3's rotating `aid` attribution parameter is excluded from exact offer identity comparison; product path and offer identifier remain matched.
- [x] Checkout retry key is retained for the same cart in the frontend; verify after final source changes.
- [x] CORS preflight from `http://localhost:3000` returned 200 and allowed `content-type, idempotency-key`.

## C. Remaining release blockers

### Public source repository
- [ ] Synchronize the exact `Quick-Own-PayPal-main/Quick-Own-PayPal-main` source folder to the intended public GitHub repository.
- [ ] Confirm no `.env`, API secret, PayPal client secret, IntelliJ workspace file, local checkout JSON or test artifact is included.
- [ ] Keep `Backend/target`, `Backend/data`, `Frontend/node_modules`, `Frontend/.next` and local logs out of Git.
- [ ] Add a root-level license only after all contributors confirm they have the rights to license their contributions.
- [ ] Confirm repository visibility is Public and the About section displays the selected license.
- [ ] Verify README links and setup commands from a fresh clone.

### End-to-end PayPal demonstration
- [ ] Open the PayPal Sandbox approval URL with a Personal Sandbox buyer account.
- [ ] Approve the order manually.
- [ ] Verify the browser returns to `/checkout/success`.
- [ ] Verify the capture page displays `COMPLETED`, the correct USD 565.00 amount and a capture ID.
- [ ] Test a cancelled order and verify no capture occurs.
- [ ] Verify retry does not create a second order or capture.
- [ ] Do not use PayPal Live credentials.

### Devpost project form
- [ ] Paste the final title, tagline and project description from `DEVPOST_SUBMISSION.md`.
- [ ] Explain how Gemini/Spring AI is used, how Channel3 supplies catalogue data, and how PayPal is central to the checkout.
- [ ] Add the final public repository URL.
- [ ] Add hosted demo URL or accurate complete run instructions.
- [ ] Add public YouTube video URL.
- [ ] Ensure all optional integrations are described accurately. Flipkart and Amazon.in are not enabled until approved credentials exist.

### Video and content permissions
- [ ] Keep the demo under three minutes.
- [ ] Show the actual application running on the device/browser.
- [ ] Do not show API secrets, OTPs, private account pages or real customer data.
- [ ] Do not use copyrighted music or third-party visuals without permission.
- [ ] Say clearly that PayPal Sandbox capture is a test payment to Quick-Own and does not place an external retailer order.

## D. Known limitations to communicate honestly

1. Channel3 is the active live catalogue provider; Flipkart and Amazon.in integrations are optional and currently disabled.
2. The current checkout capture pays the Quick-Own PayPal Sandbox merchant. It does not execute an order or guarantee fulfilment with the merchant whose catalogue offer was selected.
3. Checkout state is persisted in a local JSON file and is suitable for a single-instance hackathon MVP, not a multi-instance production deployment.
4. One PayPal cart must use one currency. No currency conversion is performed.
5. A public demo deployment needs production-grade secret management, HTTPS, shared transactional persistence, rate limiting/abuse protection and an explicit fulfilment/payment model before real customers use it.

## E. Release decision

Do not submit until the public repository, root license, clean-clone instructions, buyer approval/capture rehearsal and YouTube video are complete. Passing tests is important evidence, but it does not substitute for the mandatory submission materials.
