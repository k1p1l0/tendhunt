# Feature Research

**Domain:** SaaS Landing Page + SEO-Focused Ghost Blog (UK Procurement Intelligence)
**Researched:** 2026-02-11
**Confidence:** HIGH

## Feature Landscape

This document covers two interconnected surfaces: (1) the TendHunt marketing landing page that converts visitors into waitlist signups, and (2) the Ghost-powered blog at `/blog` that drives organic SEO traffic. Features are organized by surface, then categorized as table stakes, differentiators, and anti-features.

---

## PART 1: LANDING PAGE FEATURES

### Table Stakes (Users Expect These)

Features visitors assume exist. Missing these = they bounce within 5 seconds.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Hero section with clear value prop** | Visitors decide in 3-5 seconds whether to stay. Must answer: what, who, why. | LOW | Headline under 8 words (44 chars). Sub-headline adds context. "Find UK government contracts. Reveal buyer contacts." |
| **Primary CTA above the fold** | Visitors need an immediate action. No CTA above fold = no conversions. | LOW | "Join the Waitlist" or "Get Early Access" -- single, prominent button. Email-only form (every extra field kills conversion). |
| **Social proof / trust bar** | B2B buyers need credibility signals. 83% trust recommendations from people they know (Nielsen). | LOW | For pre-launch: data stats ("4,000+ live contract notices", "300+ buyer organizations"), beta user count, or founder credibility. Post-launch: client logos, testimonials. |
| **How it works section** | Users want to understand the product before signing up. 2026 trend: story-driven product reveals. | MEDIUM | 3-4 step visual walkthrough: Search > Score > Reveal > Win. Use product screenshots or illustrated mockups. |
| **Feature/benefits section** | Users need to know what they get. Frame as pain-point elimination, not feature lists. | MEDIUM | 3-4 feature blocks: Contract Discovery, AI Scoring (Vibe Scanner), Buyer Intelligence, Buying Signals. Each with icon, heading, 1-2 sentence benefit. |
| **Pricing section** | Hidden pricing is the #1 B2B conversion killer. Transparency builds trust and enables self-qualification. | MEDIUM | 3 tiers (Starter, Growth, Scale) with credit allocations. Anchor with the middle tier highlighted. CTA per tier linking to waitlist. |
| **Responsive/mobile layout** | 50%+ of traffic is mobile. Non-mobile pages lose half their potential conversions. | MEDIUM | Mobile-first design. Single-column stack on mobile. CTA visible without scrolling. Touch-friendly form inputs. |
| **Navigation header** | Users expect consistent, minimal navigation. 2026 trend: nav is part of the conversion funnel, not a directory. | LOW | Logo, minimal links (Features, Pricing, Blog), Login, primary CTA button. Sticky header on scroll. |
| **Footer with essentials** | Professional credibility signal. Legal compliance (UK GDPR). | LOW | Company info, links to Terms/Privacy, social links, contact email. |
| **Meta tags and OG/Twitter cards** | Sharing on social media without proper previews looks unprofessional and hurts CTR. | LOW | Title, description, OG image for each page. Next.js `metadata` export handles this natively. |
| **Fast page load (<2s)** | Slow pages kill conversions. Every 1s delay reduces conversions by 7%. | LOW | Next.js SSG/SSR handles this. Optimize images (next/image), minimal JS bundles. |

### Differentiators (Competitive Advantage)

Features that make TendHunt's landing page stand out from Stotles, Tussell, and Sweetspot.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Dual-audience messaging (Suppliers + Investors)** | Competitors target only suppliers. TendHunt also needs investor conversion for hackathon demo. Two audiences, one page. | MEDIUM | Use role-based messaging sections. "For Suppliers: Find contracts..." / "For Investors: 379B market..." Investors care about TAM, differentiation, traction metrics. |
| **Live data counter / ticker** | Competitors show static stats. A live counter showing real ingested contract data proves the platform is real, not vaporware. | LOW | "4,247 contracts tracked" counter near hero. Pulls from actual MongoDB count. Updates periodically. Stotles does "1.4M+ Tenders" but it's static text. |
| **Interactive product preview in hero** | 2026 trend: users want to see how it works before signing up. Competitors use static screenshots. | HIGH | Animated mockup or mini interactive demo showing the contract scoring UX. Could be a Lottie animation or auto-playing product walkthrough. Defer to post-MVP if time-constrained. |
| **Waitlist with position/referral** | Standard waitlist captures emails. Viral waitlist creates urgency (Robinhood achieved 1M pre-launch users). | MEDIUM | Show waitlist position after signup. Referral link for queue-jumping. Creates viral loop. Tools: LaunchList, Waitlister, or custom implementation. |
| **UK procurement content hub teaser** | Competitors don't lead with educational content. Blog preview on landing page captures SEO-driven traffic AND positions TendHunt as thought leader. | LOW | "From our Blog" section with 3 latest article cards. Links to /blog. Shows expertise in Procurement Act 2023, contract strategy. |
| **"See it in action" section with real data** | Show actual contract examples (sanitized) from Find a Tender. Proves data pipeline works. | MEDIUM | 3-4 real contract cards with blurred buyer contacts and AI scores. Shows the blur-to-reveal UX inline on the landing page. |
| **FAQ section with procurement-specific questions** | Addresses UK procurement-specific objections. Stotles has FAQ; Tussell doesn't. Well-written FAQ captures long-tail search queries. | LOW | 5-8 questions: "How does TendHunt find contracts?", "What is the Procurement Act 2023?", "How are buyer contacts sourced?", "What are buying signals?" |
| **Comparison table vs. alternatives** | Competitors never compare themselves explicitly. A "TendHunt vs. Manual Search vs. Competitors" comparison removes objections. | MEDIUM | Table comparing: manual search, generic tools, TendHunt. Columns: time spent, contract coverage, buyer intelligence, AI scoring, price. |
| **ROI / value calculator** | B2B buyers justify purchases with numbers. A "How much time would you save?" calculator is interactive and convincing. | HIGH | Input: hours spent searching, avg contract value. Output: time saved, additional contracts found. Defer to post-launch. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems for a pre-launch landing page.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Full product demo / free trial link** | "Let people try it!" | Product isn't ready for public use. Half-baked demo destroys trust faster than no demo. Sweetspot and Stotles gate behind "Request Demo" for good reason. | Waitlist signup with "Get early access" promise. Show product screenshots/video instead. |
| **Live chat widget** | "Answer questions in real-time!" | No team to staff it 24/7. Unanswered chat bubbles signal abandonment. Adds JS weight. | FAQ section + contact email. Add Intercom/Crisp post-launch when there's a team. |
| **Multiple CTAs / competing actions** | "Give users options!" | Multiple competing CTAs reduce conversion. Decision paralysis. Research shows single-goal pages convert significantly better. | One primary CTA everywhere: "Join the Waitlist." Secondary CTA only for login (existing users). |
| **Auto-playing video with sound** | "Video explains everything!" | Users hate auto-play with sound. Mobile data concerns. Performance hit. 2026 trend explicitly moves AWAY from auto-play video toward micro-interactions. | Muted auto-play animation (Lottie) or click-to-play video demo. |
| **Stripe / payment integration** | "Let people pay now!" | No product to deliver yet. Collecting money pre-launch creates legal obligations and refund headaches. | "Join Waitlist" with tier selection intent. "Early bird pricing" locked to waitlist position. |
| **Blog on the same Next.js app** | "Keep everything in one codebase!" | Mixing CMS content with app code creates deployment coupling. Blog updates shouldn't require app rebuilds. Ghost handles SEO (sitemaps, meta, structured data) natively. | Ghost on subdomain (blog.tendhunt.com) or subdirectory proxy (/blog via Ghost). Keep blog separate from app. |
| **Lengthy onboarding flow on landing page** | "Capture more data upfront!" | Every additional field decreases conversion. Pre-launch, you need emails, not company profiles. One case study showed 500% conversion increase by simplifying forms. | Email-only waitlist form. Collect company details during actual onboarding after product launches. |
| **Cookie consent banner (over-engineered)** | "GDPR compliance!" | Over-engineered cookie banners with 15 categories annoy users and reduce engagement. | Simple, compliant banner: "We use essential cookies" with accept/decline. No tracking cookies pre-launch = no complex consent needed. |

---

## PART 2: GHOST BLOG / SEO FEATURES

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **SEO-optimized meta tags per post** | Core reason for the blog. Without proper meta, no organic traffic. | LOW | Ghost handles this natively: title, description, OG tags, Twitter cards. Customize per post in Ghost editor. |
| **Responsive, fast-loading theme** | Blog must load in <1 second. Ghost is fast natively but bad themes kill performance. | MEDIUM | Use a lightweight Ghost theme (Casper or custom). Ghost loads in <1s with a good theme. Minimize external scripts. |
| **Author attribution with bio** | EEAT (Experience, Expertise, Authoritativeness, Trustworthiness) is the 2026 SEO ranking signal. Google rewards content from real people. | LOW | Ghost has native author pages. Add expert bios: "Written by [Name], UK procurement specialist with X years experience." |
| **Tag-based content organization** | Ghost uses tags as categories. Proper tagging enables tag pages, navigation, and internal linking. | LOW | Use 2-5 tags per post. Ghost tag pages are SEO-indexable with custom descriptions (500 chars) and metadata. |
| **XML sitemap** | Search engines need sitemaps to crawl effectively. | LOW | Ghost generates XML sitemaps automatically. No configuration needed. |
| **Canonical URLs** | Prevents duplicate content penalties. Critical if content is syndicated. | LOW | Ghost handles canonical tags automatically. |
| **Internal linking between posts** | Strengthens topical authority. Distributes link equity. Keeps visitors exploring. | LOW | Manual but essential. Each post should link to 2-3 related posts. Link to tag pages for topical hubs. |
| **Open Graph and social sharing** | Blog posts shared on LinkedIn/Twitter need proper previews. UK procurement community is active on LinkedIn. | LOW | Ghost handles OG/Twitter cards natively. Custom social images per post add polish. |
| **Newsletter signup / email capture** | Convert blog readers into leads. Blog traffic without capture = wasted SEO investment. | LOW | Ghost has native newsletter/subscription. Alternatively, embed waitlist form. Use Ghost's member feature or integrate with external ESP via Zapier. |
| **Structured data (Article schema)** | Ghost automatically includes Schema.org Article structured data. Improves search appearance. | LOW | Built into Ghost. No extra work needed. Verify with Google Rich Results Test. |
| **Mobile-friendly reading experience** | Blog readers on mobile must have comfortable reading. Line height, font size, responsive images. | LOW | Good Ghost theme handles this. Test on mobile devices. |
| **5-10 launch articles** | Empty blog = no SEO value + looks abandoned. Critical mass needed for topical authority. | HIGH | Content production is the bottleneck. AI-generated drafts with human review. Target 1,500-2,500 words per article for SEO value. |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Pillar + cluster content strategy** | Builds topical authority. HubSpot saw 107% organic traffic increase in 6 months with this approach. Competitors don't have blog SEO strategy. | MEDIUM | Create 2-3 pillar pages: "UK Government Contracts Guide", "Procurement Act 2023 Guide", "How to Find and Win Tenders". Each pillar links to 3-5 cluster articles. |
| **UK procurement keyword targeting** | Stotles and Tussell have blogs but don't aggressively target long-tail procurement keywords. TendHunt can own the informational search space. | MEDIUM | Target: "how to win government contracts UK", "Procurement Act 2023 explained", "find a tender UK", "government procurement for SMEs", "CPV codes explained", "framework agreements UK". |
| **Procurement Act 2023 content hub** | The Act came into force Feb 2025. Suppliers are actively searching for guidance. High-intent, low-competition keywords. | MEDIUM | Dedicated tag page + 3-5 articles: overview, impact on SMEs, new thresholds, electronic procurement changes, timeline of changes. |
| **Data-driven content with real stats** | Most procurement blogs are generic advice. Using actual data from TendHunt's pipeline (anonymized trends, sector breakdowns) creates unique, linkable content. | MEDIUM | "Q1 2026 UK Government Contract Trends", "Top 10 sectors by contract value". Unique data = backlinks = domain authority. |
| **CTA integration within blog posts** | Blog readers are warm leads. In-content CTAs convert readers to waitlist signups. | LOW | Ghost allows HTML cards in posts. Add mid-article and end-of-article CTA blocks: "Find contracts like these with TendHunt. Join the waitlist." |
| **Glossary of procurement terms** | High volume of informational queries ("what is a framework agreement", "CPV codes meaning"). Each glossary entry is a rankable page. Sweetspot does this for US terms. | MEDIUM | Ghost pages (not posts) for evergreen glossary. 20-30 terms. Each links back to relevant blog posts and product pages. |
| **Author thought leadership** | EEAT signals. Named experts writing about UK procurement build trust with both Google and readers. | LOW | Consistent author with real credentials. LinkedIn profile linked. Position as "the procurement expert" for brand authority. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Ghost as headless CMS with custom Next.js frontend** | "Unified tech stack!" "More control!" | Significant engineering overhead. Lose Ghost's built-in SEO (sitemaps, structured data, theme rendering). SEO consequences documented on Ghost Forum. Adds build/deploy complexity. | Use Ghost's native rendering. Proxy `/blog` to Ghost instance via Next.js rewrites or Nginx. Ghost handles SEO perfectly without headless. |
| **AI-only content with no human review** | "Scale content fast!" | Google is getting smarter at detecting AI content. 2026 EEAT prioritizes lived experience. Pure AI content risks penalties and reads generic. | AI drafts with human expert review and personal insights added. Add unique data points from TendHunt's pipeline. |
| **50+ articles at launch** | "More content = more SEO!" | Quality > quantity. 50 thin articles rank worse than 10 comprehensive ones. Writing fatigue leads to declining quality. | Start with 5-10 deeply researched articles (1,500-2,500 words each). Add 2-4 per month post-launch. |
| **Comments system** | "Build community!" | Comment spam, moderation burden, legal liability for user-generated content. Ghost has native comments but they require membership setup. | Remove comments entirely for launch. Use "Discuss on LinkedIn" links to drive engagement to social where it's more visible. |
| **Membership / paywall** | "Monetize the blog!" | Blog's purpose is SEO traffic + lead generation, not direct revenue. Paywalls kill SEO (Google can't index gated content). | All content free. Monetization happens via product signups, not blog subscriptions. |
| **Multiple content types (podcasts, videos)** | "Multi-format content!" | Production overhead is massive. One poorly produced video hurts credibility more than no video. | Start with written blog only. Add a single explainer video on the landing page. Consider podcast post-launch if there's demand. |

---

## Feature Dependencies

```
[Landing Page]
    Hero + CTA
        └──requires──> Waitlist email collection system
                            └──enhances──> Waitlist position/referral mechanism

    Pricing Section
        └──requires──> Defined tier structure (Starter/Growth/Scale)

    "See it in action" section
        └──requires──> Seeded contract data in MongoDB (Phase 2)
        └──requires──> Product screenshots/mockups

    Live data counter
        └──requires──> MongoDB connection + count API endpoint

    Blog preview section
        └──requires──> Ghost blog with published articles
        └──requires──> Ghost Content API integration (fetch latest 3 posts)

[Ghost Blog]
    All blog features
        └──requires──> Ghost instance deployed and accessible
        └──requires──> DNS configured (blog.tendhunt.com or /blog proxy)

    Pillar + cluster strategy
        └──requires──> 5-10 articles written and published
        └──requires──> Tag structure defined

    Newsletter capture
        └──requires──> Ghost member feature OR external ESP integration
        └──enhances──> Landing page waitlist (shared email list)

    CTA blocks in posts
        └──requires──> Landing page with working waitlist form
        └──requires──> Ghost HTML card templates

[Cross-Surface]
    Blog preview on landing page
        └──requires──> Ghost Content API
        └──requires──> Ghost instance live with content

    Shared email list
        └──requires──> Blog newsletter + Landing page waitlist use same backend
        └──enhances──> Lead nurturing pipeline

    SEO strategy
        └──requires──> Landing page meta tags configured
        └──requires──> Blog articles published with target keywords
        └──enhances──> Organic traffic to both surfaces
```

### Dependency Notes

- **Blog preview requires Ghost live**: Landing page "From our Blog" section needs Ghost Content API returning articles. Ghost must be deployed with content before this section works.
- **"See it in action" requires seeded data**: The real contract preview on the landing page needs Phase 2 data pipeline to have run. This is the only landing page feature with a hard dependency on the main app's data.
- **Newsletter and waitlist should share infrastructure**: Blog subscribers and waitlist signups should flow to the same email list. Ghost members can sync to external ESP via Zapier, or use a shared database.
- **Pricing section is self-contained**: Tier structure is defined in requirements (PRICE-02, PRICE-03). No technical dependency beyond design decisions.

---

## MVP Definition

### Launch With (v1)

Minimum viable landing page + blog -- what's needed to start collecting waitlist emails and building SEO traffic.

- [x] **Hero section with value proposition** -- "Find UK government contracts. Reveal buyer contacts." Single waitlist CTA.
- [x] **Email-only waitlist form** -- Minimal friction. One field. Confirmation message.
- [x] **Social proof bar** -- Data stats from pipeline ("X contracts tracked"). No client logos needed pre-launch.
- [x] **How it works (3-4 steps)** -- Visual walkthrough with product mockups/screenshots.
- [x] **Feature/benefits section** -- 3-4 blocks covering Contract Discovery, AI Scoring, Buyer Intel, Signals.
- [x] **Pricing section (3 tiers)** -- Starter, Growth, Scale with credit allocations and "Join Waitlist" CTAs.
- [x] **FAQ section** -- 5-8 procurement-specific questions.
- [x] **Footer** -- Company info, Terms, Privacy, social links.
- [x] **Mobile-responsive layout** -- Full mobile support, CTA above fold.
- [x] **SEO meta tags + OG cards** -- For landing page and all blog posts.
- [x] **Ghost blog deployed** -- At /blog or blog.tendhunt.com with 5-10 articles.
- [x] **5-10 launch articles** -- Targeting UK procurement keywords. AI-drafted, human-reviewed.
- [x] **Blog tag structure** -- 5-7 core tags: procurement-act-2023, government-contracts, tendering-tips, buyer-intelligence, sme-guidance, procurement-data.
- [x] **Newsletter signup on blog** -- Ghost native or embedded waitlist form.

### Add After Validation (v1.x)

Features to add once waitlist hits 100+ signups and blog has initial traffic.

- [ ] **Waitlist position + referral mechanism** -- Trigger: waitlist exceeds 200 signups. Adds viral loop.
- [ ] **Live data counter** -- Trigger: data pipeline (Phase 2) is stable. Shows real contract counts.
- [ ] **Blog preview on landing page** -- Trigger: Ghost Content API integrated and 5+ articles published.
- [ ] **Comparison table** -- Trigger: competitor analysis is solid. "TendHunt vs. Manual Search" table.
- [ ] **Procurement glossary** -- Trigger: blog has 10+ articles. Glossary pages add internal linking.
- [ ] **Data-driven blog content** -- Trigger: data pipeline produces analyzable trends. Publish unique data articles.
- [ ] **Dual-audience messaging** -- Trigger: investor demo preparation. Add "For Investors" section.

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Interactive product preview / demo** -- Needs polished product. Too risky pre-launch.
- [ ] **ROI / value calculator** -- Needs usage data to be credible. Requires engineering effort.
- [ ] **Video testimonials** -- Need real customers. Cannot fake for launch.
- [ ] **Live chat** -- Needs team to staff. Post-revenue feature.
- [ ] **A/B testing infrastructure** -- Needs traffic volume (1,000+ monthly visitors). Pre-launch traffic too low.
- [ ] **Content localization** -- UK-only market initially. No need for multilingual.

---

## Feature Prioritization Matrix

### Landing Page

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Hero + value prop | HIGH | LOW | P1 |
| Waitlist CTA (email-only) | HIGH | LOW | P1 |
| Social proof bar (stats) | HIGH | LOW | P1 |
| How it works section | HIGH | MEDIUM | P1 |
| Feature/benefits section | HIGH | MEDIUM | P1 |
| Pricing section (3 tiers) | HIGH | MEDIUM | P1 |
| FAQ section | MEDIUM | LOW | P1 |
| Responsive mobile layout | HIGH | MEDIUM | P1 |
| Navigation header (sticky) | MEDIUM | LOW | P1 |
| Footer | LOW | LOW | P1 |
| SEO meta + OG tags | MEDIUM | LOW | P1 |
| Live data counter | MEDIUM | LOW | P2 |
| Blog preview section | MEDIUM | MEDIUM | P2 |
| Dual-audience messaging | MEDIUM | MEDIUM | P2 |
| Comparison table | MEDIUM | MEDIUM | P2 |
| "See it in action" with real data | HIGH | HIGH | P2 |
| Waitlist position/referral | MEDIUM | MEDIUM | P2 |
| Interactive product preview | HIGH | HIGH | P3 |
| ROI calculator | MEDIUM | HIGH | P3 |

### Ghost Blog

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Ghost instance deployed | HIGH | MEDIUM | P1 |
| 5-10 launch articles | HIGH | HIGH | P1 |
| SEO meta per post | HIGH | LOW | P1 |
| Tag structure | MEDIUM | LOW | P1 |
| Author bios (EEAT) | MEDIUM | LOW | P1 |
| Newsletter/waitlist signup | HIGH | LOW | P1 |
| Internal linking | MEDIUM | LOW | P1 |
| CTA blocks in posts | HIGH | LOW | P1 |
| Pillar + cluster strategy | HIGH | MEDIUM | P2 |
| Procurement glossary | MEDIUM | MEDIUM | P2 |
| Data-driven unique content | HIGH | MEDIUM | P2 |
| Procurement Act 2023 hub | MEDIUM | MEDIUM | P2 |

**Priority key:**
- P1: Must have for launch -- build in the landing page milestone
- P2: Should have, add within 2-4 weeks post-launch
- P3: Nice to have, future consideration (requires traffic/users)

---

## Competitor Feature Analysis

| Feature | Stotles | Tussell | TendHunt Approach |
|---------|---------|--------|-------------------|
| **Hero headline** | "One public sector platform to create strategy, build pipeline, track tenders, win bids" | "Do more business with government" | "Find UK government contracts. Reveal buyer contacts." -- shorter, more specific, action-oriented |
| **Primary CTA** | "Sign up for free" + "Request a demo" (dual) | "Talk to Sales" (single) | "Join the Waitlist" (single, low friction) |
| **Social proof** | 16 enterprise logos (Splunk, SAP, Palo Alto) | Fortune 500 logos (Microsoft, Google, AWS) | Data stats (contract count, buyer orgs). Pivot to logos post-launch. |
| **Trust signals** | Vanta security badge, case studies, testimonials | Media logos (BBC, FT, Guardian), 1,250 news stories | Procurement Act 2023 expertise, real data from official sources, founder credibility |
| **Pricing transparency** | Hidden (request demo / sign up to see) | Hidden (talk to sales only) | **Transparent** -- 3 tiers shown publicly. Key differentiator. |
| **Blog / content** | Blog exists, moderate activity | Blog exists, data-driven reports | **SEO-focused pillar strategy** targeting long-tail UK procurement keywords |
| **Data stats** | "1.4M+ Tenders, 210k+ Contacts, 15k+ Orgs" (static) | "80,000 key decision-makers" (static) | Live counter pulling from actual database. Honest, real-time numbers. |
| **How it works** | 4-step feature showcase | Role-based solutions (4 segments) | 3-step visual: Search > Score > Reveal |
| **FAQ** | 5 questions | None visible | 5-8 procurement-specific questions |
| **Mobile experience** | Responsive | Responsive | Mobile-first design, CTA above fold |
| **Waitlist / viral** | No (live product) | No (live product) | Waitlist with position + referral potential |

### Key Competitive Gaps TendHunt Can Exploit

1. **Pricing transparency**: Neither Stotles nor Tussell shows pricing. TendHunt showing clear tiers builds trust and enables self-qualification.
2. **SME focus**: Competitors target enterprise. TendHunt's Starter tier and simple UX appeal to small suppliers new to public procurement.
3. **Educational content**: Neither competitor aggressively targets informational procurement keywords. TendHunt can own the "how to" space.
4. **AI scoring (Vibe Scanner)**: Unique product feature. Landing page can demo the concept visually with mockups.
5. **Buyer contact reveal**: Credit-based contact reveal is a unique business model not seen in UK procurement tools.

---

## Suggested Blog Launch Content Plan

Based on keyword research and competitive gaps, the 5-10 launch articles should be:

### Pillar Articles (Comprehensive, 2,000-2,500 words)
1. "The Complete Guide to Finding UK Government Contracts in 2026"
2. "Procurement Act 2023: What Suppliers Need to Know"

### Cluster Articles (Focused, 1,500-2,000 words)
3. "How to Use Find a Tender: A Step-by-Step Guide for Suppliers"
4. "Understanding CPV Codes: How to Find Contracts in Your Sector"
5. "5 Buying Signals That Predict Government Contract Opportunities"
6. "How SMEs Can Win Government Contracts Under the Procurement Act 2023"
7. "Government Buyer Intelligence: Who Makes Procurement Decisions?"

### Thought Leadership (Data-driven, 1,000-1,500 words)
8. "Why Most Suppliers Miss 90% of Relevant Government Contracts"
9. "The Rise of AI in Public Procurement: How Technology is Changing Contract Discovery"

### Optional 10th Article
10. "UK Government Contract Thresholds Explained (2026 Update)"

---

## Sources

### Landing Page Research
- [SaaS Hero - Enterprise Landing Page Design 2026](https://www.saashero.net/design/enterprise-landing-page-design-2026/) -- MEDIUM confidence
- [Fibr.ai - 20 Best SaaS Landing Pages + 2026 Best Practices](https://fibr.ai/landing-page/saas-landing-pages) -- MEDIUM confidence
- [Unbounce - 26 SaaS Landing Pages: Examples, Trends and Best Practices](https://unbounce.com/conversion-rate-optimization/the-state-of-saas-landing-pages/) -- HIGH confidence
- [SaaSFrame - 10 SaaS Landing Page Trends for 2026](https://www.saasframe.io/blog/10-saas-landing-page-trends-for-2026-with-real-examples) -- MEDIUM confidence
- [Waitlister - SaaS Product Launch Waitlist Strategy 2026](https://waitlister.me/growth-hub/guides/saas-product-launch-waitlist) -- MEDIUM confidence
- [Genesys Growth - Best Practices for Designing B2B SaaS Landing Pages 2026](https://genesysgrowth.com/blog/designing-b2b-saas-landing-pages) -- MEDIUM confidence
- [DesignStudioUIUX - SaaS Pricing Page Best Practices 2026](https://www.designstudiouiux.com/blog/saas-pricing-page-design-best-practices/) -- MEDIUM confidence

### Competitor Analysis (Direct Inspection)
- [Stotles.com](https://www.stotles.com) -- Direct page analysis, HIGH confidence
- [Tussell.com](https://www.tussell.com) -- Direct page analysis, HIGH confidence
- [Sweetspot.so](https://www.sweetspot.so) -- Direct page analysis, HIGH confidence (US market, different audience)

### Ghost Blog / SEO Research
- [Ghost.org - SEO in Ghost](https://ghost.org/help/seo/) -- Official docs, HIGH confidence
- [Ghost.org - Advancing your SEO](https://ghost.org/resources/advancing-your-seo/) -- Official docs, HIGH confidence
- [Ghost.org - Ghost + Next.js JAMStack](https://ghost.org/docs/jamstack/next/) -- Official docs, HIGH confidence
- [Ghost SEO Org - Ghost Tags SEO Best Practices](https://ghostseo.org/ghost-tags-seo/) -- MEDIUM confidence
- [Ghost Forum - SEO Best Practices 2026](https://forum.ghost.org/t/what-are-the-best-seo-practices-for-a-new-ghost-blog-in-2026/60750) -- MEDIUM confidence

### Content Strategy
- [GovNet - Public Sector Marketing Funnel](https://www.govnet.co.uk/blog/public-sector-marketing-funnel-seo-events-and-evidence-that-win-contracts) -- MEDIUM confidence
- [Tussell - Contract Thresholds (Procurement Act 2023)](https://www.tussell.com/gov/blog/procurement-act-thresholds) -- HIGH confidence (competitor content example)
- [GOV.UK - Procurement Act 2023 Short Guide for Suppliers](https://www.gov.uk/government/publications/procurement-act-2023-short-guides/the-procurement-act-2023-a-short-guide-for-suppliers-html) -- HIGH confidence (official government source)
- [Google - FAQ Structured Data Documentation](https://developers.google.com/search/docs/appearance/structured-data/faqpage) -- HIGH confidence (official docs)

---
*Feature research for: SaaS Landing Page + SEO-Focused Ghost Blog (UK Procurement Intelligence)*
*Researched: 2026-02-11*
