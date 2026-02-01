---
description: How to create human-readable, text-based architecture diagrams (No Mermaid).
---

# Human Readable Diagram Workflow

**Goal**: Create diagrams that are Universally Readable without plugins.
**Rule**: DO NOT use Mermaid syntax (`graph TD`, `sequenceDiagram`) for shared documentation. Use ASCII/Text blocks.

## 1. Directory Tree Diagrams
Use `tree` style with emoji icons for visual hierarchy.
**Format**:
```text
root/
├── 📁 folder
│   ├── 📄 file.ts      - Description
│   └── 🚀 feature      - Description
└── ...
```

**Template**:
```text
src
├── 🚀 features                 (DOMAIN LOGIC)
│   ├── 💰 assets               - ...
│   └── 📊 dashboard            - ...
├── 🧩 components               (SHARED UI)
│   └── 🎨 ui                   - ...
└── 🔌 infrastructure           (ADAPTERS)
    └── ☁️ SupabaseService      - ...
```

## 2. Flow Diagrams
Use ASCII lines (`──▶`, `│`, `└`) to draw connection flows.

**Simple Left-to-Right**:
```text
[ Source ] ──────▶ [ Processor ] ──────▶ [ Destination ]
```

**Complex Process Flow**:
```text
     (1) Request           (2) Process
UI ─────────────▶ Logic ─────────────────▶ Data
                   │                        │
                   │                  ┌─────┴─────┐
                   │                  ▼           ▼
                   │             [Cache]     [Database]
                   │                  │           │
                   │                  └─────┬─────┘
                   │                        │
  (4) Update       │     (3) Return         │
UI ◀───────────── Logic ◀───────────────────┘
```

## 3. Screen Pattern Diagram
Standard visualization for the "Thin Route" pattern.

```text
[ 📁 src/app/page.tsx ]                 [ 📁 src/features/.../Page.tsx ]
   (Next.js Route)                              (Feature Logic)
       │                                              ▲
       ├─── Imports component (No Logic) ─────────────┘
       │
       └─── Configures ──▶ [ ⚙️ Metadata / SEO ]
```

## 4. Verification
After creating a diagram:
1.  Verify alignment of all pipe characters `│`.
2.  Ensure no line wrapping occurs (keep width reasonable).
3.  Check that emoji icons are relevant and adds clarity.
