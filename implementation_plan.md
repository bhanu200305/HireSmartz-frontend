# Questions Footer Update

## Behavior

- Keep the Questions page's existing bottom actions visible while scrolling.
- Float the footer at the viewport bottom, aligned to its content column, while its normal position is below the viewport.
- Return the footer to normal flow when the user reaches its original position.
- Reserve the footer's space so it does not hide the last content or cause layout shifts.
- Keep the existing responsive button layout, tooltips, permissions, loading states, and click handlers.
- Match Save As Draft to Upload File with `bg-primary`, `hover:bg-brand-700`, and white text.

## Implementation

- Update `src/components/JobsOpening/AddJobDescription/AiQuestionsActionFooter.tsx` in place; no new UI component or dependency.
- Track the footer's normal slot and viewport geometry to align the floating state and restore normal flow at the bottom.
- Extend the existing footer test file for floating/docked states and draft button styling.

## Verification

- Run the focused AiQuestionsActionFooter Vitest tests.
- Run `pnpm exec tsc -b` as required by repository instructions.
- Check desktop and mobile scrolling in the running browser where authenticated page access is available.

## Approval

Approved by the user before source modifications.

## Progress

- Implemented floating/docked footer geometry and Upload File blue draft styling.
- Added focused regression coverage for floating, docking, resizing, and styling.
- Browser fixture checks passed at 1440x900 and 390x844: every action stayed within the viewport, and the footer docked at the bottom.
- The authenticated Questions page was unavailable in the shared browser; checks used the real footer component in a temporary page.
- Retained the component's existing relative Button import because Vite has no configured `src/` alias.
- Scoped formatting passed, and all 10 focused footer tests passed.
- Required TypeScript build ran but is blocked by unrelated existing changes: unused `uploadedFileName`, `importedCount`, and `onClearDetails` bindings in `UploadAndGenerateHeader.tsx`, and an unsupported `acceptedExtensions` prop in its test file.
- No footer errors were reported by the TypeScript build. Unrelated files were left unchanged.
