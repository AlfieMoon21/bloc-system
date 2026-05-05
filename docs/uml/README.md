# UML Diagrams

All diagrams are written in PlantUML (`.puml`). Render them with:

- [PlantUML online server](https://www.plantuml.com/plantuml/uml/)
- VS Code extension: **PlantUML** (jebbs.plantuml)
- CLI: `plantuml *.puml`

## Diagrams

| File | Type | What it shows |
|---|---|---|
| `er-diagram.puml` | Entity-Relationship | Database schema: users, sessions, climbs and their relationships |
| `component-diagram.puml` | Component | Full system architecture — mobile client, web client, server modules, database |
| `sequence-login.puml` | Sequence | Mobile login flow: React Native → Express → SQLite → JWT response |
| `sequence-web-login.puml` | Sequence | Web login flow: browser form → Express → SQLite → session cookie |
| `sequence-add-climb.puml` | Sequence | Add climb flow: form + optional photo → multipart POST → Multer → SQLite |
