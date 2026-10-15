---
"olivine": minor
---

Add the `Field` component: a mono label, `hint`, `error`, `valid`, `required` mark and `aside` around one control. Olivine controls wire their id, description and validity through it automatically (also inside an `InputGroup`); plain elements are wired by cloning and custom inputs through the `Field.Control` render prop. Messages are announced through a polite live region.
