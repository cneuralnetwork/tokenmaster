# TokenMaster design audit

The complete user-supplied anti-slop law was reviewed before implementation and again against the production UI. The primary reference is the supplied Claude artifact: https://claude.ai/artifact/5YzE4z19F5PcYwj9NWetnv.

This is an analytics application, not a marketing landing page. The reference explicitly specifies Geist/Geist Mono, lime meter accents, fine panel edges, compact labels, and a sidebar/stat/chart/table layout. Those specific user directions take precedence over the law's general defaults. The source's Tokenmeter name becomes TokenMaster. Its decorative component cover is not turned into a fake dashboard hero.

## Reference fidelity

| Aspect | Implemented and checked |
| --- | --- |
| World and signature | A local usage instrument: actual stacked agent activity, aligned precise figures, and quiet tool colors. The working data display is the focal artifact. |
| Dark palette | Exact #0C0D0B base, #141512 surface, #1C1D19 raised surface, #ECEBE3 ink, #C6F25E meter accent. |
| Light palette | Exact #F5F4EE base, white surface, #ECEBE4 raised surface, #16170F ink, #3F6A00 meter accent. |
| Type | Local Geist 400/500/600 and Geist Mono 400/500; body 14px, labels 11px, data 13px, headings 15/20px, figures 28/48px. Mobile figures adjusted to fit. |
| Layout | 224px sidebar, 24px content gutters/rows, 16px panel padding/gaps, 3/6/10px radius system, 32px controls. |
| Charts | Real Recharts stacked bars, zero baseline, stable persisted agent colors, readout, period selector, token/spend switching, daily/weekly/monthly grouping. |
| Tables | Numeric alignment, hover tone, sortable headers, pagination, full precision exports, accessible drill-downs. |
| Motion | Short tonal/focus transitions, live number updates, syncing state. No opacity-zero entrance or gratuitous moving decoration. Reduced-motion override. |
| States | Loading, true zero data, invalid range, errors, stale data, missing model pricing, active/closed windows, budget limits. |
| Responsive | Desktop inspected at 1440px, mobile at 390px; no document overflow. Tables and mobile navigation have purposeful internal horizontal scrolling. |

## Law, point by point

| Rule / tell | Review outcome |
| --- | --- |
| Lucide package defaults | No Lucide or blanket icon set. |
| Em dashes | Product copy uses sentences and separators, no decorative em dashes. |
| Eyebrow pill | No hero badges. |
| Fraunces / Work Sans | Absent; reference typography used. |
| Glowy pill buttons | Absent. |
| Oversized tiled icons | Absent. |
| Floating cards | No looping card motion. |
| Cut-off glow | No glow layer to clip. |
| Kitchen-sink card | Stat tiles have one number and its context; no decorative tag/button stacks. |
| Fake macOS window | No traffic lights or fake application frame. This is the working application. |
| Space Grotesk | Absent. |
| Purple / blue-purple gradients | Absent; one reference lavender data series is not an atmospheric gradient. |
| Gradient pill with icon | Absent. |
| Default paired CTA | No gradient/ghost action pair. |
| Three-tier pricing | Not applicable; no pricing page. |
| Testimonial cards / ornamental quotes | Absent. |
| Gradient initials avatars | Absent. |
| Pre-footer CTA banner | Absent. |
| Gradient tile logo lockup | No gradient tile; exact plain product wordmark treatment. |
| Cormorant | Absent. |
| Split hero | No marketing hero. |
| Graph-paper background | Absent. |
| Crude CSS/SVG illustration | None. Chart geometry encodes real values. |
| Accent-bar cards | Absent. |
| Background glow | Absent. |
| Fake code window | None; settings show an actual supported launch command. |
| Sora / JetBrains Mono | Absent. |
| Floating image tags | Absent. |
| Syne | Absent. |
| Gradient text | Absent. |
| Archivo / Inter default pairing | Absent. |
| Hairline boxes | Reference-specific intentional exception: its exact panel/token borders are preserved. |
| Countdown urgency | None. Actual remaining block minutes come from ccusage. |
| Card hover lift | None; tonal states only. |
| Letterspaced serif logo | Absent. |
| Didone luxury type | Absent. |
| Mono house voice | Geist Mono follows the explicit artifact for data, tab controls and compact metadata; body and hierarchy use Geist. |
| One treatment on every label | Headings, body, figures, data and compact labels retain different roles. |
| Botched glass | No blur/glass. |
| Faint full-page grid | Absent. |
| Botched fill animation | Tracks use real widths and stable rounded geometry. No scale-based cap distortion. |
| Invisible entrance content | All text and controls render visible. Syncing dims existing data to the reference's 60%, never zero. |
| Clear the cut | No decorative clip-paths. Token tracks contain no text. Table truncation is intentional, with full IDs in details. |
| Ragged parallel columns | Stat tiles share the same grid and aligned figure slots; paired panels stretch together. |
| Text against edges | 24px desktop and 16px mobile gutters; consistent panel padding. |
| All-around shadows | No floating outer shadows. |
| Flung-to-edges content | Main panels and footer follow the same content width; sidebar is a deliberate separate navigation axis. |
| Missing/fake brand marks | No claimed customers or invented agent logos. Agents are named honestly with source-series dots as specified. |
| Chronic centering miss | Controls use flex alignment; meters and segments align to their track. No SVG text badges. |
| Fake second-box shadow | Absent. |
| Icon/logo box | Absent. |
| Eyebrow tick | Absent. |
| Oversized footer wordmark | Absent. |
| Colliding colors / hard seams | Exact reference palette shared across views; no atmospheric section seams. |
| Hard-edged shadow | No outer shadow. |
| Unreadable text | Reference ink/muted contrast inspected in dark and light; disabled controls intentionally subdued. |
| Blurred silhouette bloom | Absent. |
| Dot under active navigation | Active text and a tonal row; no extra dot. |
| Overlap clipping | No overlapping sections. Dialog has its own scrollable layer and full text wrapping. |
| Cramped display type | Tabular figures with normal spacing; units and budget context separated. |
| Grain over content | No grain overlay. |
| Cool blue-charcoal default | Warm green-black reference base. |
| Pastel candy wash | Absent. |
| Blended drifting blobs | Absent. |
| Radial object halo | Absent. |
| Hero owning fold | Not applicable to dashboard; desktop first screen intentionally contains stats and chart. |
| Cream/beige editorial default | Light tone is an explicit reference exception, with default dark theme. |
| UI-kit gray | No generic slate/gray palette; all surfaces use reference tokens. |
| Google-font rotation | No font hunting; self-hosted reference Geist files, no network fonts. |
| Button boop | No hover translation or scale. |
| Inner-glow badge | No glow/pulse. Status is text and a solid reference tone. |
| Off-center strike | No strike-through treatment. |
| Default hero stack | Absent. |
| Fixed background texture | Absent. Sidebar is fixed navigation, not a decorative background. |
| Hard image seams | No photographic strips. |
| Saturated accent sprayed everywhere | Lime usage is the exact reference choice, limited to current controls and meaningful data series. |
| Underline-fill hover | Absent. |
| Sun/moon toggle / fake custom line icons | Text Dark/Light control; no icon-pack imitation. |
| Unrounded ornamental lines | No ornamental rules; chart axes and table separators have data/structure meaning and follow the reference. |
| Kicker-plus-serif section | Absent. |
| Big serif statement | Absent. |
| Inset enquire form | Absent. |
| Email-pill form | Absent. |
| Image-overlay card | Absent. |
| Flat atmosphere after hero | Not a hero-driven site; the actual populated reporting interface carries every view. |
| Recycled house style | Artifact-led instrument design, not a reused landing-page kit. |
| Hero with right panel | Absent. |
| Multi-line dangling headline | View headings remain one line. |
| Filled/outlined CTA pair | Absent. |
| Small-label-over-heading section | Panel headings stand alone. Stat labels identify the quantity rather than decorate a marketing headline. |
| Numbered rail steps | Absent. |
| Compounded slop layouts | No marketing section stack. |
| Whole SaaS page meta-template | Absent. |
| Metadata pill proliferation | Table metadata is plain text; source controls are functional filters. |
| Dead controls | Navigation, filters, chart selectors, search, sorting, pagination, drill-downs, budgets, settings, and date selection exercised. Export activation and serialization checked; embedded browser download event limitation documented. |
| Tasteful font swap | No substitute display face. |
| Recolored skeleton | Exact supplied application reference is intentionally followed. |
| Standard marketing footer | Small operational freshness/footer only. |
| Zero-icon overcorrection | The artifact uses meaningful source dots, sort arrows, direction deltas, and a local marker; no gratuitous icon wall. |
| Avoidance as design | Positive direction is a precise, populated, working local instrument. |

## Premium techniques, signature, and toolkit decisions

Each is context-dependent under the law's own disclaimer. Real glass, self-colored sculpted edges, invented silhouettes, atmospheric photography, light beams, noise gradients, micro-grids, hero character fields, jeweled marks, inset marketing islands, scroll parallax, giant footer type, serif accent headlines, and logo walls are deliberately not added because they would contradict this explicit dashboard reference.

The working product is the signature artifact. Layering is reserved for accessible native detail dialogs, not faux product windows. The sidebar, data series, radii, typography, chart cross-inspection, and active states form one cohesive language. All figures and paths come from the local engine; there are no fake customers, invented metrics, copied example rows, or simulated agents.

React, Tailwind, and Recharts provide the framework and chart foundation. Browser-native buttons, select controls, inputs, date fields, disclosure, and modal dialog provide accessible platform behavior. No unnecessary animation library or component-kit styling replaces the supplied artifact. Motion supports state changes rather than concealing content. Text remains visible by default.

The late field notes were also checked: one coherent world; no irrelevant stock realism; self-hosted actual reference type; product-as-artifact only because a real product exists; design language rather than reference example data copied; no carousel of trendy font alternatives; stateful interaction instead of dead decorative controls.

Corrections made during inspection are listed in VERIFICATION.md. Screenshots are kept outside the repository because they show private local usage. No private histories are included in the package or commit.
