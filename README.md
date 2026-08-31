# Audience Galaxy — one-shot agent prompt

Give the following prompt to Codex, Claude Code, Hermes, or another coding agent. It should create the complete application using live X follower data paid for through x402.

```text
Create a complete, polished application called Audience Galaxy for an X/Twitter user. Work autonomously from setup through a verified production build.

1. Set up twit.sh and x402 first

- Install/run the twitsh CLI with `npx twitsh start`.
- Add and follow the skill at https://twit.sh/skill.md, configured for x402.
- Run `npx twitsh mode x402` to use USDC on Base.
- Run `npx twitsh endpoints` before fetching anything. Read the current endpoint descriptions, parameters, pagination fields, and prices; do not guess endpoint URLs.
- Use any compatible x402 agent wallet already available on Base, such as Coinbase, MetaMask, WDK, AgentCash, or another installed wallet. If none is available or compatible with the CLI, use the wallet created by twitsh.
- Run `npx twitsh balance`. If funding is needed, show the complete wallet address and ask for USDC on Base. Continue after funding is confirmed. Never expose or commit private keys, seed phrases, credentials, or payment proofs.

2. Fetch the follower dataset

- Ask for the target X username only if it was not supplied. Resolve it to the numeric user ID using the appropriate endpoint returned by `npx twitsh endpoints`.
- Fetch the user's complete follower list through the followers endpoint using `npx twitsh fetch "<endpoint URL>"`.
- Follow every pagination cursor until all available followers have been collected. Preserve the same x402 payment network throughout the workflow.
- Preserve useful public profile fields when available: ID, username, display name, bio, location, verification and protected status, follower count, following count, post count, and profile image URL.
- Deduplicate records by numeric user ID and validate the final row count.
- Convert the results into `public/followers.csv`. Correctly quote commas, quotes, line breaks, emoji, URLs, and Unicode. Do not place wallet or payment data in the CSV.

3. Build the web application

- Create a lightweight Vite application with plain JavaScript and responsive CSS. Use Three.js where it materially improves the spatial experience.
- Load the CSV locally in the browser; viewing the site must not trigger paid API requests.
- Create a dark, polished, mobile-responsive interface centered on the target user's profile picture.
- Classify profiles into understandable topic groups from their names and bios, such as crypto/Web3, AI/data, builders, engineering, community, finance, and other.
- Size profiles by popularity/reach and color them by topic. Keep colors bright and visible against the background.

4. Include these switchable views

- Galaxy: a 3D follower universe orbiting the user's center profile.
- Bubbles: topic and popularity clusters.
- Popularity Landscape: follower reach represented as mountain peaks, with portraits on the leading peaks.
- Insights: audience totals, verified share, reach tiers, major topics, locations, and top profiles.

5. Add interactions and portraits

- Make every node reliably hoverable and clickable with generous invisible hit targets.
- On hover, slightly enlarge the node, show a halo, load its profile picture, and display a compact tooltip with name, username, and follower count.
- Keep portraits visible on the largest/popular nodes and bubbles. When zoomed in, progressively load portraits for all visible nodes without eagerly downloading every image.
- Clicking a profile should open a responsive details panel containing all useful CSV fields and a link to its X profile.
- Add search, topic filtering, verified-only filtering, drag/orbit controls, zoom controls, reset, and touch-friendly mobile interactions.

6. Add a guided 3D popularity journey

- Put the target user's picture in the center planet with a rotating halo/ring.
- Clicking the center picture should launch a smooth space-flight journey through the most popular profiles, starting with the highest-reach accounts.
- Keep journey profiles hoverable and clickable while the camera moves.
- Clicking a profile should pause the journey and open its details. Clicking empty space should close the details and resume. Include an Exit Journey control that returns to the overview.
- Add a subtle cockpit HUD, target reticle, route status, star motion, and restrained cinematic camera movement. Keep it performant on mobile and respect reduced-motion preferences.

7. Finish and verify

- Handle missing images and malformed rows gracefully.
- Use lazy image loading and efficient Three.js rendering for large follower lists.
- Ensure node colors, hover, click/raycast, portraits, filters, drawers, mode switching, and journey pause/resume all work.
- Run the production build, fix errors, and leave clear local run commands.
- Initialize a Git repository only if requested. Never commit secrets, wallet files, `node_modules`, or build output.

Deliver the working application, the generated CSV, and a short summary of the fetched row count, x402 workflow, features, and verification performed.
```
