# MUSHRAY AI — Standardized Pre-Deployment QA Testing Checklist

**Brand:** MUSHRAY AI (`Create. Market. Grow.`)  
**Scope:** All 12 AI Marketing Tools + AI Marketing Assistant across **English (`en`)**, **Hindi (`hi`)**, and **Hinglish (`hinglish`)**  
**Purpose:** Standardized release-gate verification before any production deployment.

---

## 1. Test Environment & Standard Test Matrix

Run every tool using at least these **3 distinct SMB test profiles** so outputs are verified across different categories and offer formats:

| Profile ID | Business Name | Product / Service | Offer / Price (Exact) | Target Audience |
| :--- | :--- | :--- | :--- | :--- |
| **P1 (Apparel Retail)** | `Aarav Ethnic Studio` | `Festive Silk Kurtis` | `FLAT 20% OFF` | `Women shoppers aged 22-45 in Tier 1 & 2 cities` |
| **P2 (Food / Local Shop)** | `Kesar Sweet Mart` | `Diwali Dry Fruit Hamper` | `₹599 Only` | `Families and corporate gifting buyers` |
| **P3 (Electronics / D2C)** | `VoltEdge India` | `AMOLED Smart Watch Pro` | `20% Discount · ₹1,999` | `Young professionals and college students` |

### Language Consistency Pass Criteria (Mandatory for Every Tool)
- **English (`en`):** Natural, high-converting commercial English; no Devanagari leakage unless part of an explicitly requested festival name.
- **Hindi (`hi`):** Clear **Devanagari script** (e.g., `नमस्ते`, `शानदार ऑफर`) for headlines, captions, bullets, and CTAs; hashtags/brand terms remain clean and readable.
- **Hinglish (`hinglish`):** Natural Indian conversational Hindi written in **Roman English** mixed with simple English (e.g., `"Aaj hi order karein aur paayein FLAT 20% OFF!"`); **no Devanagari script** in Hinglish output.
- **Exact Offer & Price Rule:** If the input specifies `FLAT 20% OFF` or `₹599 Only`, **every** generated field (headline, badge, body, bullets, CTA) must preserve `20%` / `₹599` verbatim—never altering `20%` to `25%`, `30%`, or `50%`.

---

## 2. Pre-Flight System & Resilience Checks (Run Once Before Tool Tests)

| Check ID | Area | Verification Step | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **SYS-01** | Health & Build | Run `npm run lint`, `npm run build`, and `GET /api/health` | Zero TypeScript/build errors; `200 OK` JSON `{ ok: true }` | [ ] |
| **SYS-02** | API Key Security | Inspect compiled `dist/` bundle (`grep` for `GEMINI_API_KEY`, `RAZORPAY_KEY_SECRET`, `SESSION_SECRET`) | Zero secrets exposed in frontend assets | [ ] |
| **SYS-03** | Error & 503 Handling | Simulate busy/retry or invalid input (`POST /api/ai/generate` missing `businessName`) | Missing fields return `400` JSON; transient `503` triggers retry + fallback model (`gemini-3.1-flash-lite`) or clear Hindi `503` guidance | [ ] |
| **SYS-04** | Auth & Quota | Test Signup -> Logout -> Login -> Profile Update (`PUT /api/profile`) and Guest quota (`10/month`) vs Free (`25/month`) | Unauthenticated profile/project writes return `401`; quota increments cleanly after each generation | [ ] |
| **SYS-05** | Error Routes | Request invalid API route (`GET /api/unknown`) & malformed JSON body | Returns clean `404` / `400` JSON (never raw stack traces or HTML) | [ ] |

---

## 3. Per-Tool Functional & Cross-Language Checklist (All 12 Tools)

Each tool must be tested in **`en`**, **`hi`**, and **`hinglish`** (`3 runs per tool` minimum).

### Group A: Social & Copy Studios (`POST /api/ai/generate`)

#### 1. AI Social Media Post Generator (`social-post`)
- [ ] **`en` / `hi` / `hinglish` Output:** Generates all 7 structured fields (`headline`, `hook`, `body`, `cta`, `hashtags` [~8], `bestTime`, `visualIdea`) strictly in the selected script/language.
- [ ] **Offer Accuracy:** `20%` / `₹599` preserved verbatim across `headline`, `body`, and `cta`.
- [ ] **Actions:** `Copy` copies clean formatted post to clipboard; `Save` stores project to **My Projects** (authenticated); `Send to Poster` prefills **Poster Studio** with brief & copy.

#### 2. AI Instagram Caption Generator (`instagram-caption`)
- [ ] **`en` / `hi` / `hinglish` Output:** Generates `storyCaption`, `shortCaption`, `salesCaption`, `firstCommentPrompt`, and `hashtags` (~12) matching selected language.
- [ ] **Offer Accuracy:** Exact discount/price retained in `salesCaption`.
- [ ] **Actions:** Individual/full `Copy` works cleanly; `Save` persists under `instagram-caption` in **My Projects**.

#### 3. AI Facebook Post Generator (`facebook-post`)
- [ ] **`en` / `hi` / `hinglish` Output:** Generates `offerPost`, `communityPost`, `pollQuestion`, `pollOptions` (3 options), and `recommendedCtaButton` in selected language.
- [ ] **Offer Accuracy:** `offerPost` reflects exact input offer/price.
- [ ] **Actions:** `Copy` and `Save` work without error; saved item is retrievable & deletable from **My Projects**.

#### 4. AI Advertisement Script Writer (`ad-script`)
- [ ] **`en` / `hi` / `hinglish` Output:** Generates `adTitle`, `durationSeconds`, `targetHookAngle`, and 4 timed `scenes` (`timeRange`, `visualAction`, `onScreenText`, `voiceover`).
- [ ] **Offer Accuracy:** Final Offer/CTA scene matches exact offer/price.
- [ ] **Actions:** Script `Copy` includes all scenes; `Save` persists full JSON to **My Projects**.

#### 5. WhatsApp Marketing Message Generator (`whatsapp-marketing`)
- [ ] **`en` / `hi` / `hinglish` Output:** Generates `broadcastMessage` (with WhatsApp `*bold*` and bullets), `followUpMessage`, `quickReplyCta`, and `broadcastTip`.
- [ ] **Offer Accuracy:** Exact offer/price preserved in both `broadcastMessage` and `followUpMessage`.
- [ ] **Actions:** `Copy` preserves WhatsApp formatting (`*bold*`, line breaks); `Save` persists project.

#### 6. AI Product Description Generator (`product-description`)
- [ ] **`en` / `hi` / `hinglish` Output:** Generates `seoTitle`, `description`, `bulletPoints` (5 items), and `searchKeywords` (8 keywords).
- [ ] **Marketplace Quality:** Keywords and bullets match the product category (`P1`–`P3`) without generic filler.
- [ ] **Actions:** `Copy` and `Save` work cleanly.

#### 7. AI Marketing Strategy Generator (`marketing-strategy`)
- [ ] **`en` / `hi` / `hinglish` Output:** Generates `executiveSummary`, `audiencePersona`, 4-week `weeklyRoadmap`, `channelMix` (with percentages), and 4 `kpis`.
- [ ] **Timeout Resilience:** Complex schema completes cleanly (verified within primary/fallback timeout window, no premature `503`).
- [ ] **Actions:** Full strategy `Copy` and `Save` work cleanly.

---

### Group B: Visual, Branding & Video Studios

#### 8. AI Poster and Banner Maker (`poster-maker`)
- [ ] **`en` / `hi` / `hinglish` Output:** Generates `headline`, `subheadline`, `offerBadge`, 3 `highlights`, `ctaText`, and `tagline` in chosen language.
- [ ] **20% Discount Mismatch Check:** Typing `FLAT 20% OFF` in Offer/Price syncs `offerBadge` automatically (unless manually edited) and post-generation `offerBadge`, `headline`, and `highlights` keep `20%` exact.
- [ ] **Canvas Layout & Overlap Check (`1:1`, `9:16`, `16:9`):**
  - Test both **with** and **without** an uploaded product photo.
  - Test long business names (e.g., `Aarav Heritage Ethnic & Bridal Studio`) to confirm `businessName` never collides with `offerBadge`.
  - Confirm wrapped `headline`, `subheadline`, `highlights`, CTA button, and footer `tagline` never touch the product photo or overflow past `MUSHRAY AI` footer.
- [ ] **Export & Save:** `Download PNG` triggers clean file download; `Save` stores `previewImageDataUrl` thumbnail in **My Projects**.

#### 9. AI Festival Poster Generator (`festival-poster`)
- [ ] **Mode Switch Check:** Opening Festival Poster sets `festival-poster` mode & `festival-gold` theme; switching back to regular Poster Maker cleanly resets mode and theme.
- [ ] **`en` / `hi` / `hinglish` Output:** Test with regional/national festivals (e.g., `Diwali / दिवाली`, `Eid Mubarak / ईद मुबारक`, `Holi / होली`); copy aligns with selected festival and language.
- [ ] **Offer & Layout Check:** `FLAT 20% OFF` stays `20%`; zero text overlap across `1:1`, `9:16`, and `16:9` with/without product photo.
- [ ] **Export & Save:** `Download PNG` and `Save` work cleanly.

#### 10. AI Product Photo Background Remover (`bg-remover`, `POST /api/ai/analyze-image`)
- [ ] **Client-Side Cutout & Backdrops:** Upload PNG/JPEG/WebP product image; adjust `tolerance` and `feather` sliders; switch studio backdrops (`transparent`, `white`, `royal`, `obsidian`) and confirm smooth edges.
- [ ] **Validation Check:** Uploading unsupported file type or oversized (>8MB) image returns a clear error without crashing.
- [ ] **Vision AI Analysis (`en` / `hi` / `hinglish`):** Click AI Analyze and verify `productType`, `lightingFeedback`, `recommendedBackground`, `ecommerceTitle`, and `shortCaption` return in selected language.
- [ ] **Actions:** `Copy` button copies AI title & caption; `Download PNG` exports the isolated/composited product image.

#### 11. AI Promotional Video Creator (`video-creator`)
- [ ] **`en` / `hi` / `hinglish` Output:** Generates `reelTitle`, `musicMood`, and 4 `scenes` (`sceneLabel`, `headline`, `subtitle`, `badge`, `voiceover`) in selected language.
- [ ] **Canvas Playback & Overlap Check (`9:16` and `1:1`):**
  - Play/Pause/Restart controls animate smoothly across all 4 scenes.
  - Test with and without uploaded product photo: confirm photo box, scene badge, wrapped headline, subtitle, and bottom progress bar have zero overlap.
- [ ] **Video Export:** `Download Video` records cleanly via supported browser MIME (`webm`/`vp9`/`vp8`/`mp4`) and triggers file download without console errors.

#### 12. Business Name and Logo Idea Generator (`brand-logo`)
- [ ] **`en` / `hi` / `hinglish` Output:** Generates 6 brand `ideas` (`name`, `initials`, `tagline`, `handle`, `rationale`, `primaryHex`, `accentHex`) with language-appropriate taglines and rationales.
- [ ] **SVG Logo Rendering:** Switching between `monogram`, `emblem`, and `minimal` styles and clicking different generated ideas updates colors, initials, tagline, and dynamically scales long brand names cleanly inside the SVG viewport.
- [ ] **Export:** `Download SVG` downloads a valid, self-contained `.svg` file.

---

### Bonus Check: AI Marketing Assistant (`POST /api/ai/assistant`)
- [ ] Send campaign follow-up prompts in **English**, **Hindi**, and **Hinglish**; confirm contextual, actionable advice in the matching language without generic errors.

---

## 4. Responsive, UI & Cross-Browser Sign-Off

| Viewport / Device | Focus Areas | Pass? |
| :--- | :--- | :--- |
| **Mobile (`375px` width)** | Sidebar drawer opens/closes; 3-column `EN / HI / Hinglish` buttons fit without overflow; AuthModal scrolls cleanly with mobile keyboard; Poster/Video canvases fit viewport width | [ ] |
| **Tablet (`768px` width)** | 2-column grids stack cleanly; TopBar controls remain accessible; **My Projects** cards align properly | [ ] |
| **Desktop (`1280px+`)** | Form + live preview side-by-side layout on Poster, Video, Background Remover, and Logo studios; zero horizontal page scroll | [ ] |

---

## 5. Final Launch Gate Sign-Off

- [ ] All **36 tool-language test runs** (12 tools × `en`, `hi`, `hinglish`) passed with real Gemini API output.
- [ ] **20% discount preservation** confirmed on Poster Maker, Festival Poster, and copy tools.
- [ ] **Copy, Save, Delete, PNG/SVG/WebM Downloads** manually verified in a live browser on desktop and mobile.
- [ ] Production environment variables verified: `GEMINI_API_KEY`, strong random `SESSION_SECRET`, `APP_URL` (plus live `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` if billing is enabled).
- [ ] Database clean (no test accounts or test projects left in production store).

**Tested By:** ______________________ &nbsp;&nbsp;|&nbsp;&nbsp; **Date:** ____-__-__ &nbsp;&nbsp;|&nbsp;&nbsp; **Release Decision:** `[ ] PASS  [ ] HOLD`
