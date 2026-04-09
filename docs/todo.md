
# ChessTracker TODO

## Milestone 0: Quick wins and cleanup


### Config-gated third-party integrations
- [x] Load Google AdSense only when its key/config is present
- [x] Load Google Login only when its key/config is present

### HTML templating and boilerplate cleanup
- [x] Add some kind of HTML templating for shared head elements (title, meta, etc)
- [x] Remove unused CSS and JS imports from HTML templates
- [x] Remove unused HTML templates (example: `legal.html` if not needed)
- [x] Ensure all HTML templates have consistent structure 
    - [x] Ensure all templates and pages have good/up to date metadata (via head templating, etc)

### Immediate UX fixes
- [ ] Improve game selection behavior
- [ ] Show that a game is selected (prefer URL state)
- [ ] Ensure selecting a new game cleanly overwrites previous state
- [x] Hide timer for games with no time information
- [x] Link to privacy/terms in login page
- [x] Update site footer to look cleaner and be more useful/smaller

### Branding and fork cleanup
- [ ] Make site identity more distinct from upstream fork
- [ ] Remove or update references to original project where needed
- [ ] Keep clear attribution that this project is forked
- [x] Remove donation links
- [ ] Review and update terms/privacy pages
- [ ] Create and apply a new logo
- [ ] Create and apply a new default color scheme
- [x] Decide and apply final project name
- [x] Update README and other documentation to reflect new project identity and details


## Milestone 1: URL state and deep-linking

### URL as source of truth
- [x] Write game context into URL for analytics and persistence
- [x] Add URL params like `chesscom_game_id`, `chessgametype`, `chesscom_username`, and equivalent params for Lichess
- [x] Add URL param for perspective side (`white`, `black`, `auto`)
- [x] `auto` rule: use selected player's side when username is known, otherwise default to white

### Loading by game URL
- [x] Support loading from a chess.com game URL (not only username)
- [x] Reuse/port URL parsing logic from chesstrackerbot

## Milestone 2: Chess.com data access strategy

### Undocumented endpoint reliability
- [ ] Define a consistent strategy for accessing chess.com undocumented endpoints
- [ ] Evaluate server-side residential proxy path to avoid data center blocking
- [ ] Design proxy security controls and abuse prevention
- [ ] Evaluate direct client requests to undocumented endpoints
- [ ] Implement fallback strategy (client-first or server-first based on block/error response)

### Chess.com user metadata
- [ ] Add profile links for chess.com usernames
- [ ] Add chess.com username to URL params when relevant
- [ ] Add flair, flag, and title support (when available)
- [ ] Add endpoint or fetch flow for chess.com user metadata by username

## Milestone 3: API foundations and caching

### API revamp
- [ ] Add API versioning
- [ ] Define public vs internal route layout (example: `/v1/public/*`, `/v1/internal/*`)
- [ ] Document internal endpoints for maintainers
- [ ] Publish public API docs for external developers

### API hardening and developer support
- [ ] Explore API key support for selected endpoints
- [ ] Add basic abuse protections when no API key is present
- [ ] Evaluate user-agent heuristics (lightweight bot detection)
- [ ] Add rate limiting

### Game and position caching
- [ ] Cache game evaluations for reuse
- [ ] Cache chess games to reduce repeat fetches from chess.com
- [ ] Ensure cached games can load without reevaluation
- [ ] Cache FEN position evaluations (for FEN render/rating use cases)
- [ ] Add evaluation endpoints
- [ ] Consider Lichess-like evaluation response format for client compatibility
- [ ] Add endpoints to retrieve cached game data (moves/evals/etc)

## Milestone 4: Board and gameplay UX

### Board visual/interaction updates
- [ ] Add more chess.com-style board themes (wood, marble, etc)
- [ ] Research complete list/source for available chess.com themes
- [ ] Explore custom themes (future)
- [ ] Improve board interaction feel
- [ ] Show arrows/marked squares on release (chess.com-like interaction)
- [ ] Persist arrows/marked squares per move in local storage
- [ ] Move ranks/files labels to left/outside styling instead of on-board
- [ ] Show clock formatting in timer similar to chess.com

### Ongoing game support
- [x] Add endpoint to load ongoing games from experimental payload (times + encoded moves)
- [x] Decode move list format
- [x] Decode and display time data in UI
- [ ] Restrict endpoint to admin-only access to prevent abuse
- [ ] Add current game evaluation flow via chess.com
- [ ] Poll the right endpoint for live eval/best move updates

## Milestone 5: Chesstrackerbot integration

### Integration endpoints
- [ ] Add FEN render endpoint to replace current chessvision AI dependency
- [ ] Add endpoints for observe mode game summaries/evaluations

### Data integration options
- [ ] Add optional mode to connect to chesstrackerbot Postgres
- [ ] Add/store/retrieve chess.com user data
- [ ] Add/store/retrieve chess.com game data
- [ ] Plan schema additions for stored game evaluations (future)

### Public policy/info endpoints
- [ ] Add public endpoints for chesstrackerbot terms/conditions, privacy policy, and related info

## Milestone 6: Advanced features
- [ ] Implement chess.com coach-like experience
- [ ] Explore live game features/endgame vision
