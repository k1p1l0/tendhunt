# Sculptor Onboarding Flow

Instructions for handling a first-time user DM. Triggered when the pre-message hook (`on-message-received.sh`) returns NO user facts from Graphiti — meaning this Slack user has never interacted with Sculptor before.

## Detection

The pre-message hook searches Graphiti for `user {SLACK_USER_ID} preferences interests sectors regions`. If the hook output contains no "User Preferences & History" section, treat this as a new user and run the onboarding flow below.

## Step 1: Greet

- Fetch user info: `GET /api/public/v1/users/me` to get their name
- Fetch company profile: `GET /api/public/v1/profile` to get company context
- React to their message with :wave:
- Greet by name: "Hi {firstName}! I'm Sculptor, your UK procurement assistant."
- **If they have a company profile**: mention it naturally — "I see you're with {companyName}, focused on {sectors}. I can tailor my insights to your focus areas."
- **If no company profile exists** (API returns empty or 404): "I don't see a company profile set up yet. You can create one at app.tendhunt.com/onboarding, or just tell me about your company and I'll remember it."

## Step 2: Learn Sectors

- Ask: "What sectors are you most interested in tracking? For example: NHS, Education, Local Government, Defence, or something else?"
- Wait for their response.
- React with :brain: after they reply.
- Save to Graphiti memory: "User {slack_user_id} interested in sectors: {their answer}"

## Step 3: Value Range

- Ask: "What contract value range are you targeting? For example: under 100K, 100K-500K, 500K-1M, or 1M+?"
- Save to memory: "User {slack_user_id} targets contracts in range: {their answer}"

## Step 4: Offer Daily Digest

- Ask: "Want me to send you a daily digest of new contracts matching your interests? I can send it every weekday morning at 9am."
- If yes: "Noted! Once your admin configures the daily digest in TendHunt Settings, you'll start receiving them." React with :newspaper:
- If no: "No problem — you can always ask me anytime." React with :thumbsup:

## Step 5: Ready

- Send a summary of what you can do:
  - "You're all set! Here are some things you can ask me:"
  - "  *Find NHS contracts in London over 500K*"
  - "  *Who are the key decision makers at Manchester City Council?*"
  - "  *Show me board meeting signals for NHS trusts*"
  - "  *Research a buyer: University of Oxford*"
- React with :rocket:

## Handling Edge Cases

### User skips onboarding and asks a question directly
Answer their question first using the TendHunt API. After your response, gently offer: "By the way, I can personalize my results better if you tell me your sector interests and target contract size. Want to do a quick setup?" If they decline, drop it.

### User wants to skip steps
That is fine. If they say "skip" or move on, acknowledge it and jump to Step 5. Save whatever preferences they did provide.

### User provides partial info
Save what they give you. If they mention sectors but skip value range, that is still useful context. Do not force completion of every step.

### User is already known but profile changed
If the pre-message hook returns user facts but the user explicitly says "I want to update my preferences" or "start over", re-run the relevant steps and update the Graphiti facts accordingly.

## API Endpoints Used

All endpoints require the workspace API key (injected by OpenClaw runtime):

| Endpoint | Purpose |
|----------|---------|
| `GET /api/public/v1/users/me` | Get user's name and email |
| `GET /api/public/v1/profile` | Get company profile, sectors, capabilities |

Memory storage happens automatically via the post-response hook (`on-response-sent.sh`), which saves the conversation to Graphiti. Explicit preferences stated during onboarding will be extracted as facts by Graphiti's entity extraction.

## Tone

Keep the onboarding conversational and quick. Each step should be one short message, not a wall of text. Use Slack formatting (bold, italic, bullet points) but keep it minimal. React with emoji to stay engaged per the reaction guidelines in AGENTS.md.
