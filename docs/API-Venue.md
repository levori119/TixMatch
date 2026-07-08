# TixMatch — Venue Integration API

The barcode lifecycle (register → on sale invalidate old + issue new) is handled
by a pluggable `VenueTicketingProvider` (`src/db/venue-provider.ts`).

> ⚠️ **Sandbox.** Real barcode invalidation/reissue can only be performed by the
> ticket **issuer's** system (venue scanners only honor the issuer's barcodes).
> In production, implement `VenueTicketingProvider` against a real issuer API
> (e.g. Ticketmaster SafeTix Partner API, or the Israeli issuer's API) under a
> B2B agreement. See CLAUDE.md §3 (B2B) and §8 (open items).

## Gate verification endpoint (venue → TixMatch)

Lets a venue's gate/scanner check whether a barcode is currently valid.

```
GET /api/venue/verify?barcode=<BARCODE>
Header: x-venue-key: <VENUE_API_KEY>
```

Auth: send the shared secret `VENUE_API_KEY` (set in the server env) in the
`x-venue-key` header. Missing/wrong key → `401 { "error": "unauthorized" }`.

### Responses

Valid ticket:
```json
{
  "valid": true,
  "event": "משה להב — הטיש הגדול",
  "venue": "זאפה חיפה",
  "startsAt": "2026-07-02T18:30:00.000Z",
  "seat": { "kind": "seated", "section": "יציע A", "row": "5", "seat": "12-13" }
}
```

Barcode that was invalidated when the ticket was resold/transferred:
```json
{ "valid": false, "reason": "invalidated_transferred" }
```

Unknown barcode:
```json
{ "valid": false, "reason": "not_found" }
```

### Example

```bash
curl -s "https://<host>/api/venue/verify?barcode=TIX-ABCD1234" \
  -H "x-venue-key: $VENUE_API_KEY"
```

## Lifecycle (internal)

1. **Upload** — a seller uploads the ticket file for a listing; a barcode is
   stored (provided, or generated) and `registerBarcode` is called.
2. **Sale completes** (buyer confirms receipt → escrow releases) — the platform
   calls `invalidateAndReissue`: the old barcode is marked `previous_barcode`
   (invalidated) and a new `barcode` is issued to the buyer, then "sent to the
   venue" (audit-logged as `barcode_rotated`).
3. **At the gate** — the venue calls `/api/venue/verify`; only the current
   barcode is `valid`, the previous one reports `invalidated_transferred`.
