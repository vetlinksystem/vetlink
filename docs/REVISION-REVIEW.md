# Vetlink — AMBOOTT + Crossbreed Revision · Review Guide

Implemented **2026-07-30**. Source documents: `AMBOOTT.docx` and
`Breed Match Flow-Crossbreed.docx` (in `~/Downloads`).

Two repos are involved:

| Short | Path |
|---|---|
| **BE** | `C:\Users\My PC\Documents\MY CODES\Vetlink` — Express + Firestore backend **and** the web UI |
| **AND** | `C:\android-workspace\Vetlink` — Android app (pet-owner client) |

---

## How to review

```bash
# 1. Everything parses and the app boots (should print 0 failures)
cd "C:\Users\My PC\Documents\MY CODES\Vetlink"
node -e "process.env.SECRET_KEY='t'; require('./src/app.js'); console.log('boots OK')"

# 2. Start it and click through
npm start          # then open http://localhost:<port>/
```

Log in as an **employee** to see the clinic side, and as a **client** to see the owner side.
The role you log in as changes what you can do — see Phase 5.

> **Nothing has been run against real Firestore yet, and the Android app has not been
> compiled.** Build AND in Android Studio (CLI Gradle is broken on this machine).

---

## Phase 0 — Terminology

| | |
|---|---|
| **Problem** | AMBOOTT: *"Change: Registered User to Registered Customer"*, *"Analytical Dashboard to Analytics"* |
| **Where it was** | `src/public/employee/html/*.html` — the label appeared in 10 files |
| **Fix** | Renamed all visible strings. Dashboard `<h1>` is now "Analytics Overview". Routes unchanged (`/employee/users`) so no links broke. |

**Check:** every employee page's sidebar, and the dashboard heading.

---

## Phase 1 — Registration: 1NF + Data Privacy Act

| | |
|---|---|
| **Problem** | AMBOOTT: *"New account registration form violates the SQL first normal form"*, *"No privacy policy"*, *"Contact No. & Address must not optional"* |
| **Where it was** | `src/public/login/html/index.html` had one "Full Name" box; `login_router.js` stored a flat `name`; contact/address had no `required`; no privacy page existed anywhere (grep for "privacy" returned nothing) |

**Fix**

| File | Change |
|---|---|
| `src/utilities/personUtils.js` | **new** — name compose/split, PH mobile validation, DPA consent block |
| `src/public/login/html/index.html` | Last/First/Middle + DOB + Sex; contact & address required; RA 10173 notice; 3 consent checkboxes; footer links |
| `src/public/login/html/privacy.html`, `terms.html` | **new** — full RA 10173 policy and terms |
| `src/routers/_front-end/login/login_router.js` | `/privacy` + `/terms` routes; register validates the split fields and requires all 3 consents |
| `src/models/clients/{add,update_partial}.js`, `client/profile/update_self.js` | store `firstName`/`middleName`/`lastName`, keep derived `name` in sync |
| `src/public/employee/html+js/registered_users*` | edit modal split fields, legacy flat names auto-split on read |
| AND `activity_register.xml`, `RegisterActivity.java`, `RegisterRequest.java`, `ApiService.java` | same fields, DOB date-picker, sex radio, 3 consent checkboxes, privacy link |

**Check:** open `/` → *Create an account*. The button stays disabled until every required
field and all three consents are filled. Try a bad mobile number (`12345`) — rejected.
Visit `/privacy` and `/terms` directly.

> ⚠️ **Kept the 11-character password rule** (the mockup said 8). It is the stronger rule and
> was already shipped on both clients. Say the word if you want 8.

**Back-compat:** old client docs with only a flat `name` are split on read, so the edit
modal still works on them.

---

## Phase 2 — Appointments

| | |
|---|---|
| **Problem** | AMBOOTT: *"even if cancelled still reflects in the admin calendar"*, *"No reason indicate why appointment if cancelled"*, *"must not reflect to schedule calendar if the veterinarian takes actions"*, *"add a function for payment methods (Over the counter only)"* |
| **Where it was** | `src/models/employee/schedule/get_range.js` mapped cancelled → `status:'cancel'` but **still pushed the item into the calendar**. `appointments/update_partial.js` had no reason field, and cancelling sent **no notification at all**. |

**Fix**

| File | Change |
|---|---|
| `src/models/employee/schedule/get_range.js` | only `confirmed`/`completed` reach the calendar; `includePending` / `includeCancelled` flags for an optional toggle |
| `src/models/appointments/update_partial.js` | `reasonType` + `statusReason` allowed and **required** on cancel/reschedule; added the missing `appointment_cancelled` notification; reason appended to the reschedule message |
| `src/models/client/appointments/add.js` | `paymentMethod: 'over_the_counter'` (anything else rejected) + `paymentStatus: 'unpaid'` |
| `src/public/employee/reservation.html+js` | reason modal with preset reasons; Payment column; "Mark Paid" |
| `src/public/client/appointments.html+js` | Payment column; the clinic's reason shown to the owner |
| AND `item_upcoming.xml`, `DashboardFragment.java`, `fragment_requests.xml` | reason shown on the card; over-the-counter notice |

**Verified**

```
cancel with NO reason   → rejected: "Please provide a reason for cancelling…"
cancel WITH reason      → Cancelled + notification carrying the reason
reschedule NO reason    → rejected
reschedule WITH reason  → "…rescheduled from Aug 5 9:00 AM to Aug 9 2:30 PM. Reason: Clinic emergency."
calendar default        → only Confirmed + Completed (pending and cancelled excluded)
```

**Check:** `/employee/appointments` → Cancel any appointment; it demands a reason.
Then `/employee/schedule` — pending and cancelled ones are gone.

---

## Phase 3 — Pet registration

| | |
|---|---|
| **Problem** | AMBOOTT: *"Pet registration duplicate (same details)"*, *"remove Species"*, *"Sex (must not optional)"*, add *Size, Weight*, *"Notes change to Description (must not optional)"*, and the ideal breeding ages |
| **Where it was** | `src/models/client/pets/add_pet.js` inserted with a fresh id and **no existence check**. `AddPetBottomSheet.java` left sex empty when unchecked. |

**The Species decision (yours):** the input is gone from both UIs, but the **field is kept** and
derived server-side from the breed via `src/utilities/breedCatalog.js`
(Golden Retriever → Dog). Removing it outright would have broken breeding's
"same species only" rule.

**Fix**

| File | Change |
|---|---|
| `src/utilities/breedCatalog.js` | **new** — ~49 breeds → species + size class |
| `src/utilities/petUtils.js` | **new** — age in months, breeding-age window, duplicate key, validation |
| `src/models/client/pets/add_pet.js`, `controllers/client/pets/update_pet.js` | duplicate guard, new fields, required sex/description |
| `src/models/pets/{add,update}.js` | same rules clinic-side; `update` now merges instead of overwriting the whole doc |
| `src/routers/catalogs.js` | **new** — `/catalogs/pet-options`, `/catalogs/breeds` |
| `src/public/client/pets.html+js+css` | species input removed; size/weight/age-unit; breeding sub-form |
| AND `dialog_add_pet.xml`, `AddPetBottomSheet.java`, `Pet.java`, `PetCreateRequest.java`, `PetOptionsResponse.java` | same |

**Verified**

```
species derived:  Golden Retriever→Dog/large · Persian→Cat/medium · Chihuahua→Dog/small
required:         sex ✓ description ✓ weight ✓ age ✓  (size auto-fills from a known breed)
duplicate:        2nd "Buddy — Golden Retriever, Male" for the same owner → BLOCKED
                  same details, different owner → allowed
breeding age:     M 8mo BLOCKED · M 13mo ideal · M 40mo past-prime (warning)
                  F 12mo BLOCKED · F 20mo ideal · F 60mo past-prime (warning)
legacy docs:      age 3 yrs → 36 months · notes → description
```

Ideal breeding age is enforced as the doc specifies: **Female 18–24 months, Male 12–15**.
Under-age is a hard block; past-prime is a warning the vet reviews.

**Check:** `/client/pets` → *Add Pet*. No Species field. Tick "Allow for breeding" and
enter age 8 months — it refuses. Add the same pet twice — the second is rejected.

---

## Phase 5 — Roles & access *(done before Phase 4 because records depend on it)*

| | |
|---|---|
| **Problem** | AMBOOTT role matrix: Admin & Staff *"can view the possible matching and status but cannot take actions"*; Staff *"can only add/edit appointments but cannot take action"*; records: *"Veterinarian/admin can add/edit, Staff view/print, Customer view"* |
| **Where it was** | `middlewares/employee_breeding_access.js` was **one** guard granting admin **and** vet full rights, and `routers/breeding.js` used it for both reading and deciding — so **an administrator could approve breeding pairings**. |

**Fix**

| File | Change |
|---|---|
| `src/utilities/roles.js` | **new** — the permission matrix + `resolveRole()` |
| `src/middlewares/require_permission.js` | **new** — `requirePermission()`, `loadEmployeeRole` |
| `src/middlewares/employee_breeding_access.js` | split into `canViewBreeding` / `canDecideBreeding` |
| `src/middlewares/appointment_action_access.js` | **new** — status change needs vet, other edits allow staff |
| `src/routers/breeding.js`, `appointments.js`, `_front-end/employee/{users,employees}_router.js` | gated per action |
| `src/controllers/employee/profile/get_self.js` | returns `role` + `permissions` |
| `src/public/employee/js/core.js` | `window.vetlinkCan()` + `vetlink:role-ready` event + `data-requires-permission` |

**Verified matrix**

```
permission           admin   staff   veterinarian
analytics.view        YES     YES     YES
customers.view        YES     YES     YES
customers.add/edit     -      YES      -
customers.delete      YES      -       -
employees.manage      YES      -       -
appointments.edit      -      YES     YES
appointments.act       -       -      YES     ← confirm/cancel/complete
records.view/print    YES     YES     YES
records.manage        YES      -      YES     ← add/edit
breeding.view         YES     YES     YES
breeding.decide        -       -      YES     ← was admin+vet, now vet only
```

> **Caught while testing:** `resolveRole` matched on the substring `"vet"`, so
> **"Vet Assistant"** and **"Veterinary Technician"** would have been promoted to
> decision-maker. Support titles (assistant / aide / tech / intern / receptionist / …)
> now resolve to **staff**.

**Check:** log in as a non-vet employee → `/employee/breeding` shows records but the
approve buttons are replaced with *"View only — a veterinarian decides this match."*
The API also 403s, so it is not just hidden.

---

## Phase 4 — Medical records & Pet Records

| | |
|---|---|
| **Problem** | AMBOOTT: *"Add: Medical Records functions where staff/doctor can view records for printing"*, *"Pet Records containing records of all pets"*, and the fixed vocabularies (surgery list, vaccine types, anaesthesia checkboxes, grooming checkboxes) |
| **Where it was** | `src/public/client/html/records.html` let the **owner create their own medical records**, which undermines record integrity. There was no employee records page at all. |

**Fix**

| File | Change |
|---|---|
| `src/utilities/catalogs.js` | **new** — the doc's exact vocabularies |
| `src/utilities/recordDetails.js` | **new** — per-type detail blocks; unknown values dropped |
| `src/models/employee/records/add_record.js` | typed records + author stamp; vet/admin only |
| `src/models/employee/records/get_all_records.js` | **new** — clinic-wide, joined with pet + owner |
| `src/models/employee/pets/get_pet_register.js` | **new** — every pet + owner + record count + last visit |
| `src/public/employee/html/records.html` + `js/records.js` + `css/records.css` | **new** — 5 typed forms, print stylesheet |
| `src/public/employee/html/pet_register.html` + `js/pet_register.js` | **new** — the pet register |
| `src/routers/_front-end/client/records_router.js` | owner POST now returns 403 |
| `src/public/client/records.html+js` | add-record form removed; read-only notice |
| AND `PetRecordsActivity.java`, `activity_pet_records.xml` | add button hidden, read-only notice |

**Verified**

```
record typing:  bogus type rejected · "General Check Up"/"general_checkup" both normalize
required:       grooming→service · vaccination→name · checkup→reason · surgery→procedure
vocabularies:   "Alien Autopsy" rejected · anesthesia [Dexmedetomidine, Isoflurane, Vodka] → 2 kept
pet register:   legacy age 3yrs → "3 yrs" · legacy allowBreeding honoured
                pending appointment correctly excluded from "last visit"
```

**Check:** `/employee/records` → *Add Record* → pick each of the 5 types; the form rebuilds
with that type's fields. Hit **Print** for an A4 sheet with signature blocks and an RA 10173
footer. Then `/employee/pet-records` for the register. On the client side `/client/records`
has no Add button.

---

## Phase 6 — Purebred / crossbreed + compatibility scoring

| | |
|---|---|
| **Problem** | Breed Match Flow: choose Purebred or Crossbreeding; evaluate 7 criteria; show a compatibility score, risk (Low/Moderate/High) and a veterinary recommendation; include a Breed Compatibility Table; *"make the veterinarian the final decision-maker"* |
| **Where it was** | `src/models/client/breeding/candidates.js` was a flat boolean filter returning an **unranked** list, and `admin_decision.js` had only approve/reject. |

**Fix**

| File | Change |
|---|---|
| `src/utilities/breedCompatibility.js` | **new** — the Breed Compatibility Table + size-gap rule |
| `src/models/breeding/compatibility.js` | **new** — the scoring engine |
| `src/models/client/breeding/candidates.js` | scored + **sorted best-first**; forbidden pairs not offered |
| `src/models/client/breeding/propose.js` | stores the assessment snapshot on the proposal |
| `src/models/breeding/admin_decision.js` | adds `approve_with_conditions`; blocks plain-approve of a flagged pair |
| `src/models/breeding/get_all.js` | assessment attached; older proposals assessed on read |
| `src/public/employee/breeding.js+css` | risk report panel with per-criterion bars |
| `src/public/client/breeding.js+css` | score ring + risk badge + expandable flags |
| AND `BreedingCandidate.java`, `item_candidate_card.xml`, `BreedingMatchActivity.java` | same |

**All 5 rows from the client's table reproduce exactly**

```
Labrador × Golden Retriever      → compatible
Poodle × Labrador                → compatible (Labradoodle)
German Shepherd × Belgian Malinois → compatible
Chihuahua × Great Dane           → veterinary_review (size difference)
Dog × Cat                        → not_allowed
unlisted pair                    → veterinary_review  (never auto-approves)
```

**Scoring** — weights sum to 100: breed 35 · size 20 · age 20 · health 15 · temperament 10.

```
RANKED for Buddy (large male Lab, prefers a large mate):
  1. Bella  Golden Retriever  100  Low       ★pref  0 flags
  2. Nala   German Shepherd     94  Moderate  ★pref  1 flag (past prime)
  3. Luna   Poodle              92  Low              0 flags
  4. Tiny   Chihuahua           63  High             2 flags (size + 24:1 weight)
  excluded: wrong species · same sex · underage · breeding off · same owner ✓

VET DECISION — the document's three outcomes:
  flagged + plain approve        → REFUSED "cannot be approved without conditions"
  approve_with_conditions, none → REFUSED "list at least one condition"
  approve_with_conditions + 2   → approved_with_conditions, stored + both owners notified
  clean pair + plain approve     → approved
  reject                         → rejected / "not recommended"
```

> **Judgement call:** brachycephalic and hereditary-risk pairs (Bulldog×Bulldog,
> Persian×Persian, Scottish Fold×Scottish Fold, Persian×British Shorthair, …) were set to
> `veterinary_review` rather than `compatible`, so their warning notes actually reach the vet.

**Check:** `/client/breeding` → pick a breeding-enabled pet. Candidates are ranked with a
score ring and risk badge. Then `/employee/breeding` as a **vet** — each pending pair shows
the full risk report, and a flagged pair offers only *Approve with conditions* / *Not recommended*.

---

## Phase 7 — Breeding record + pregnancy monitoring

| | |
|---|---|
| **Problem** | Breed Match Flow steps 9–10 + Post-Breeding Care: final health examination before breeding; record the crossbreed combination, date, observations; pregnancy monitoring schedule; offspring records; check-up reminders |
| **Where it was** | `approved` jumped straight to `completed`; none of this was captured. |

**The Sire/Dam decision (yours):** the form lives **clinic-side**, filled by the vet after
final clearance. Sire and dam are **derived from the approved pair**, never picked — an
owner-side picker would bypass the owner-consent step the flowchart requires.

**New lifecycle**

    pending → accepted → approved → cleared → completed
    (owner)   (owner)    (VET)      (VET)     (VET)

| File | Change |
|---|---|
| `src/models/breeding/service.js` | `cleared` added to the status sets |
| `src/models/breeding/clearance.js` | **new** — step 9 final exam; either pet unfit stops the breeding and releases both |
| `src/models/breeding/record_details.js` | **new** — step 10 breeding record + auto-generated monitoring schedule |
| `src/models/breeding/pregnancy.js` | **new** — status, check-ups, offspring, reminder sweep |
| `src/controllers/breeding/{clearance,record_details,pregnancy}.js` | **new** |
| `src/routers/breeding.js` | 6 new vet-only routes |
| `src/models/client/breeding/get_my.js` | owners see clearance, record, pregnancy, litter |

**Verified**

```
out-of-order steps all refused (complete before approve, exam before approve, record before exam)
step 9  both fit → "cleared" + both owners notified
step 10 sire/dam DERIVED: Buddy(Labrador) × Bella(Golden) → crossbreed
        due date auto-computed 63 days out; schedule auto-generated:
          +25d Pregnancy confirmation (ultrasound)
          +38d Mid-term check-up
          +56d Pre-whelping check
          +63d Expected delivery
          +70d Post-delivery check-up
reminders: 1st sweep sent 4 · 2nd sweep sent 0  (idempotent per due date)
offspring: 3 recorded (2 alive, 1 stillborn) → pregnancyStatus "delivered"
failed exam: one pet unfit → rejected, "failed_final_examination", both pets released
```

**Check:** `/employee/breeding` as a vet. Approve a pair → the action becomes **Final exam**
→ then **Breeding record** → then **Monitoring** / **Complete** / **Offspring**.

`POST /breeding/send-reminders` is idempotent, so it is safe to put on a cron.

---

## Phase 8 — Vet ↔ customer messaging

| | |
|---|---|
| **Problem** | AMBOOTT: *"Add: Message veterinarian to costumer"* |
| **Where it was** | Conversations assumed **both** participants were clients (`findConversationBetween`, `get_my.js`, `notify.js`). |

**Fix** — conversations now carry `participantTypes`:

    participantIds:   ['c1001', 'e0002']
    participantTypes: { c1001: 'client', e0002: 'employee' }

| File | Change |
|---|---|
| `src/models/chats/participants.js` | **new** — resolves participants from either collection |
| `src/models/client/chats/{get_my,notify,start}.js` | type-aware; clinic threads labelled |
| `src/models/employee/chats/{get_my,start,send_message}.js` | **new** |
| `src/controllers/employee/chats/index.js` | **new** |
| `src/routers/_front-end/employee/chats_router.js` | **new** — page + 5 API routes |
| `src/public/employee/html/messages.html` + `js/messages.js` + `css/messages.css` | **new** |
| `src/public/client/js/chats.js+css` | clinic threads badged; breeding-propose hidden there |
| AND `OwnerRef.java`, `ConversationItem.java`, `ChatsActivity.java` | 🏥 label + role shown |

**Verified**

```
vet starts thread → participantTypes {e1:employee, c1:client}; owner unread 1
owner sees        → isClinic true, "Dr. Lara Santos", position "Veterinarian"
owner replies     → vet notified
access control    → outsider read/send/mark-read all refused; empty message refused
2nd staff member  → gets a separate thread (owner sees both, each labelled Clinic)
owner-to-owner    → still works, NOT labelled clinic
legacy convo (no participantTypes) → treated as client-to-client ✓
flood control     → 3 messages after a read = 1 notification; a 4th = still 1
```

**Check:** `/employee/messages` → *New message* → pick an owner and a pet → send.
Log in as that owner → the thread appears badged **Clinic** with the vet's role.

---

## Phase 9 — Dogs only, crossbreeding allowed *(added 2026-07-31)*

| | |
|---|---|
| **Decision** | The clinic is **dogs only**. Crossbreeding stays allowed, and an unlisted dog cross still goes to **veterinary review** (your call — the vet remains the final decision-maker). |
| **Where it was** | `breedCatalog.js` carried 49 breeds across 6 species (Dog, Cat, Rabbit, Bird, Fish, Reptile). The compatibility table had 8 cat rows. |

**Fix**

| File | Change |
|---|---|
| `utilities/breedCatalog.js` | Non-dog breeds removed — **22 dog breeds** remain, `SPECIES_LIST` is now `['Dog']`. Added `DEFAULT_SPECIES` and `isLegacySpecies()`. `resolveSpecies()` now falls back to `'Dog'` for a free-text breed instead of returning blank |
| `utilities/breedCompatibility.js` | 8 cat pair rows removed (19 dog rows remain); `SPECIES_RULES` trimmed to the client table's `Dog × Cat` row |
| `models/client/breeding/candidates.js` | `effectiveSpecies()` — a pet with no stored species is treated as a dog |
| `models/breeding/compatibility.js` | Same-species gate documented as a legacy-pet guard |
| `models/breeding/record_details.js` | Gestation is canine 63 days; the rabbit entry dropped |
| `public/client/html/pets.html` | Hardcoded `Dog / Cat / Others` filter options removed (the list self-populates) |

**Verified** — 26 assertions, all passing:

```
catalog:      SPECIES_LIST ["Dog"] · 22 breeds · Persian/Puspin/Dutch/Macaw/Koi/Gecko gone
derivation:   Beagle→Dog · free text "Aspin Mix"→Dog (was blank) · legacy Cat preserved
client table: all 4 rows still reproduce exactly
crossbreed:   Poodle×Golden, Beagle×Dachshund, Lab×GSD all pass · never "not_allowed"
              unlisted (Rottweiler×Doberman) → veterinary_review  ← default kept
risk rules:   size gap ✓ brachycephalic ✓ hereditary ✓ same breed → purebred compatible
legacy pets:  cat × dog still BLOCKED · blank-species pet now pairs (was silently excluded)
```

**Side effect worth knowing:** the blank-species gap flagged in "Data migration" below is now
**fixed for breeding matching** — a pet with no species is read as a dog rather than matching
nobody. The backfill is still worth running so the species column displays correctly.

**Android:** no code change needed. The breed dropdown is fed by `/catalogs/breeds`, so it
became dogs-only automatically.

> **Legacy non-dog pets** (a cat registered before this decision) stay viewable and editable,
> but their breed is no longer in the catalog — the breed dropdown will show blank for them
> until re-selected. They can never be paired for breeding.

---

## Phase 10 — Button styling on the three new pages *(added 2026-07-31)*

| | |
|---|---|
| **Problem** | Buttons on Medical Records, Pet Records and Messages rendered as raw browser defaults — "out of design" |
| **Cause** | `.btn-primary` / `.btn-ghost` / `.btn-xs` / `.modal-actions` / `.modal-close` were each defined **inside individual page stylesheets** (manage_employees, profile, reservation, schedule, registered_users, pets). The three new pages load only `dashboard.css` + their own CSS, so they used the class names but inherited no styling. |

**Fix** — `public/employee/css/core.css` (previously a 0-byte placeholder) now holds the shared
clickable system, and the 3 pages link it after `dashboard.css`:

| Class | Covered |
|---|---|
| `.btn`, `.btn-primary`, `.btn-ghost` | base, primary, danger, hover, active, disabled |
| `.btn-xs` + `.primary` / `.danger` / `.link` | compact row actions |
| `.modal-actions`, `.modal-close` | modal footer + dismiss |
| focus rings | one consistent `0 0 0 3px rgba(200,160,106,.30)` ring on every clickable |

Colours are the existing beige tokens from `dashboard.css` `:root` — nothing new was invented,
so the pages now match the rest of the clinic UI.

**Verified**

```
records       OK — all 11 clickable classes styled
pet_register  OK — all  9 clickable classes styled
messages      OK — all 11 clickable classes styled
core.css serves 200 (4,690 bytes) · braces balanced 25/25 · all 3 pages tag-balanced
```

> Page stylesheets load *after* core.css, so any page can still override it. The other
> employee pages were left untouched — they keep their own duplicate definitions. Linking
> `core.css` everywhere and deleting those duplicates is a safe follow-up cleanup.

---

## Data migration — read before going live

Old Firestore documents are handled by **read-time fallbacks**, not a migration, so nothing
breaks but some records stay in the old shape until edited:

| Collection | Old shape | Handled how |
|---|---|---|
| `clients` | flat `name` | split on read; re-saved as 1NF on next edit |
| `pets` | `age` in years, `notes`, `allowBreeding` | mapped to `ageMonths` / `description` / `breedingAllowed` on read |
| `pets` | no `species` | read as `Dog` since Phase 9, so breeding matching works; a backfill still tidies the displayed column |
| `pets` | non-dog species (`Cat`, …) | still viewable/editable, but the breed is no longer in the catalog and the pet can never be paired |
| `records` | untyped | shown with `type` only; no `details` block |
| `breeding` | no `compatibility` | assessed on read so the vet screen is never blank |
| `conversations` | no `participantTypes` | treated as client-to-client |

**Suggested one-off backfill:** set `species` on pets whose breed is in
`utilities/breedCatalog.js`, and `ageMonths = age * 12` where `ageMonths` is absent.

---

## Still to do

1. **Run against real Firestore** — every phase was tested against stubs only.
2. **Build the Android app in Android Studio** (CLI Gradle is broken here).
3. Decide the password length (11 vs the mockup's 8).
4. Optionally schedule `POST /breeding/send-reminders` daily.
5. Optional cleanup: `AND/data/SessionManager.java` and `AND/data/session/SessionManager.java`
   are duplicate classes both hardcoding the base URL; `util/PersistentCookieJar.java`
   duplicates `data/api/PersistentCookieJar.java`.
6. `res/layout/dialog_add_record.xml` (AND) is now unused — harmless, delete when convenient.

---

## Appendix — every file touched

**Backend / web (BE)** — 100 files. New files marked ★.

```
★ docs/REVISION-REVIEW.md            (this file)
  src/app.js

  utilities/
★   breedCatalog.js  ★ breedCompatibility.js  ★ catalogs.js
★   petUtils.js      ★ recordDetails.js       ★ roles.js
★   personUtils.js

  middlewares/
★   require_permission.js  ★ appointment_action_access.js
    employee_breeding_access.js

  models/
    appointments/update_partial.js
    breeding/  admin_decision.js  get_all.js  service.js
★              clearance.js  compatibility.js  pregnancy.js  record_details.js
★   chats/participants.js
    client/  appointments/{add,get_my_appointments}.js
             breeding/{candidates,get_my,propose}.js
             chats/{get_my,notify,send_message,start}.js
             dashboard/get_overview.js  pets/add_pet.js  profile/update_self.js
    clients/{add,update_partial}.js
    employee/ ★ chats/{get_my,send_message,start}.js
              ★ pets/get_pet_register.js
              ★ records/get_all_records.js
                records/{add_record,get_pet_records}.js
                schedule/get_range.js
    pets/{add,update}.js

  controllers/
★   breeding/{clearance,pregnancy,record_details}.js
★   employee/chats/index.js  ★ employee/pets/get_pet_register.js
★   employee/records/get_all_records.js
    client/pets/update_pet.js  employee/profile/get_self.js
    employee/records/add_record.js  employee/schedule/get_range.js

  routers/
★   catalogs.js  ★ _front-end/employee/{chats,records}_router.js
    appointments.js  breeding.js
    _front-end/client/records_router.js
    _front-end/employee/{employees,pets,users}_router.js
    _front-end/login/login_router.js

  public/login/    ★ html/privacy.html  ★ html/terms.html
                     html/index.html  js/app.js  css/styles.css
  public/client/     html/{appointments,pets,records}.html
                     js/{appointments,breeding,chats,pets,records}.js
                     css/{appointments,breeding,chats,pets,records}.css
  public/employee/ ★ html/{messages,pet_register,records}.html
                   ★ js/{messages,pet_register,records}.js
                   ★ css/{messages,records}.css
                     html/{breeding,dashboard,manage_employees,pets,profile,
                           registered_users,reservation,schedule}.html
                     js/{breeding,core,registered_users,reservation}.js
                     css/{breeding,core,dashboard,registered_users,reservation}.css
```

**Android (AND)** — 26 files. New files marked ★.

```
  data/api/{ApiRoutes,ApiService}.java
  data/model/  ★ MedicalCatalogResponse.java  ★ PetOptionsResponse.java
               ★ RegisterRequest.java
                 AppointmentRequest.java  BreedingCandidate.java
                 ConversationItem.java    OwnerRef.java
                 Pet.java  PetCreateRequest.java  PetCreateResponse.java
  ui/auth/RegisterActivity.java
  ui/breeding/BreedingMatchActivity.java
  ui/chat/ChatsActivity.java
  ui/home/fragments/{AddPetBottomSheet,DashboardFragment,PetsFragment}.java
  ui/records/PetRecordsActivity.java
  res/layout/{activity_pet_records,activity_register,dialog_add_pet,
              fragment_requests,item_candidate_card,item_upcoming}.xml
  res/values/colors.xml            (added vet_warning / vet_warning_soft)
```

`MainActivity.java` shows a recent timestamp but was **not** modified — still the original
23-line scaffold.

---

## Verification run on 2026-07-30

```
backend:  237 JS files parsed          → 0 failures
          24 HTML files tag-balanced   → 0 mismatches
          src/app.js boots             → 120 route handlers registered
android:  84 XML files parsed          → 0 failures
          all R.id.* references resolve (the 5 nav_* ids come from res/menu/bottom_nav.xml)
          no dangling references to removed ids (etSpecies, etNotes, dialog_add_record)
```

Each phase also has its own behavioural test output, quoted inline in the phase sections above.
Those harnesses stub Firestore in-memory; they are not committed.
