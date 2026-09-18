# Language & Location-Based Localization Specification

## Objective
Language is a first-class product feature. Users select a preferred language during account creation and can change it later. Device locale and coarse region are used only to recommend relevant languages; an explicit user selection always wins.

## Account Creation
Add a language step:
- Choose your preferred language
- Detect device language and show it as recommended
- Show region-relevant languages
- Search all supported languages
- Display native language names
- Save explicit selection to the account

## Language Resolution Priority
1. Explicit user-selected language
2. Existing account preference
3. Device/app locale
4. Configured location-based recommendation
5. Product default

Never silently switch a user's language because they travelled to another region.

## Location-Based Recommendations
Use coarse country/region information only to recommend languages. Example for Punjab/India: Punjabi, Hindi and English can be surfaced as relevant choices. Do not continuously track location just to determine language.

## Language Catalog
Create a server-managed catalog with language ID, BCP-47 locale, display name, native name, LTR/RTL direction, active/inactive status, region mapping, priority and translation completion status.

Example locales: `en-IN`, `hi-IN`, `pa-IN`.

## User Preferences
Store `preferred_language`, `locale`, `language_source` (`user`, `device`, `recommended`, `default`) and `language_updated_at`. Optional secondary spoken/content languages may also be stored.

## Driver/Guide Spoken Languages
Keep service communication languages separate from UI language. Drivers and Guides can declare primary/additional spoken languages. Rider preferences can optionally request a spoken language for Driver/Guide matching.

## Localization
Android static strings use resource localization. Backend/Admin use translation keys and reviewed localized content. Missing translations fall back safely to the configured default language. Critical legal and safety content must use reviewed translations rather than unreviewed runtime machine translation.

## Notifications
Resolve notification language using the user's preferred language, then fallback language. Critical safety notifications require reviewed translations and delivery reliability.

## Language Settings
Settings → Language & Region:
- Current language
- Recommended languages
- All supported languages
- Search
- Apply/Save

Changing language must not require account recreation.

## RTL
Use start/end layout semantics and locale-aware formatting so future RTL languages can be supported.

## Admin
Settings → Languages:
- Enable/disable languages
- Set priority
- Map languages to regions
- Manage translation status
- Manage fallback language
- Manage localized notification templates

Changes require `settings.manage` and must be audited.

## Privacy
Do not infer ethnicity, religion or other sensitive attributes from language or location. Keep recommendation data separate from sensitive profiling.

## Acceptance Criteria
- Language can be selected during signup.
- Device language is detected when available.
- Region can recommend relevant languages.
- Explicit selection persists and always overrides recommendations.
- Existing users can change language from Settings.
- Driver/Guide spoken-language capability is stored separately.
- Localized notifications use preferred language when a reviewed translation exists.
- Missing translations fall back safely.
- RTL-ready layout is maintained.
