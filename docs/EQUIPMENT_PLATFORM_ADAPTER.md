# Equipment planning adapter guidance

Contract: [ECP-1.0 revision 1.0](EQUIPMENT_PLATFORM_CONTRACT.md).
Instruction adoption date: 2026-10-17. This guidance adds no importer, schema
migration, shared asset or control capability.

## Ownership and representations

PlotForge owns its plot documents, fixture instances, positions, focus, numbering,
selected profile/mode, patch and paperwork. Equipment model identity is separate
from each plot instance and control profile. Preserve profile provenance and
footprint-aware conflict checks; matching geometry does not establish a DMX mode.
Blank or partial universe/address data stays blank or partial.

The web plotting surface remains SVG with integer-millimeter canonical distances.
Shared equipment can supply reviewed dimensions, approved drafting symbols and
optional 3D inspection references through explicit unit/axis/pivot mappings.
A model screenshot is not automatically a drafting symbol or measured dimension.
Web and native SwiftUI presentation retain their own adapters; sharing a model
does not require a renderer migration or a native WebView wrapper.

## Current schema boundary

At the inspected adoption baseline, [web source](../src/domain/show.js) declares
document version 10 and [serialization](../src/serialization.js) includes a
9-to-10 migration. [Native source](../native/PlotForgeNative/Sources/PlotForgeCore/PlotDocument.swift)
declares version 9, and its
[codec](../native/PlotForgeNative/Sources/PlotForgeCore/PlotDocumentCodec.swift)
writes that version. The retained native documentation also describes version 9.
These source facts do not prove a lossless cross-version round trip. Check both
actual codecs and field ownership before interchange; do not infer parity from
the common `.plot` extension or silently drop web-only fields. No codec repair,
version bump or migration is included in this instruction adoption.

## Next proof

Use one existing sourced fixture for a later catalog/symbol/profile mapping.
Pin equipment, profile/mode and representation revisions, convert coordinates
explicitly, and preserve plot-instance and patch identities through valid,
invalid and unknown transfers. Qualify save/export/reload and recovery for each
supported web/native schema before changing data ownership or promising parity.

MVR parser acceptance remains on its existing sample-corpus gate. Existing
PlotForge output paths keep their own runtime authority and checks; shared
selection/import cannot arm hardware or transfer CueForge execution authority.
Keep source, test, deployed, native, human and hardware proof separate. Record
ECP revision, adapter role, producer/consumer impact and remaining proof at
handoff. Independent instruction loading and runtime integration remain separate
gates; this document is not a parity or hardware acceptance claim.
