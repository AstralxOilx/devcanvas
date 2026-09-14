# Shared UI components

Import from `src/components/ui`. These components contain no canvas state and can be reused on other pages. The base theme lives in `src/index.css`; component styles are loaded by the barrel export.

```tsx
import { Button, IconButton, Panel, Toolbar, Tabs, PropertyField, ColorPicker, SegmentedControl, Select, Toggle, StatusBar } from './components/ui'

<Panel title="Settings" action={<Button onClick={save}>Save</Button>}>
  <PropertyField label="Accent color">
    <ColorPicker label="Accent" colors={['#68618d', '#6d9dd1']} value={color} onChange={setColor} />
  </PropertyField>
  <Toggle label="Show grid" checked={grid} onChange={setGrid} />
</Panel>
```

- `Button`: native button props, `variant` (`primary`, `secondary`, `ghost`), and optional `icon`.
- `IconButton`: required accessible `label`, optional `active`, and native button props.
- `Panel`: `title`, optional `action`, children, and native HTML attributes.
- `Toolbar`: required accessible `label`, children, and native HTML attributes.
- `Tabs`: typed `items`, controlled `value`, and `onChange`; each item can include an icon and count.
- `PropertyField`: `label`, optional `trailing`, and children. Give child inputs their own accessible label.
- `ColorPicker`: `label`, `colors`, controlled `value`, and `onChange`. Use `none` for transparent.
- `SegmentedControl`: typed `options` containing `value`, `label`, and `content`, plus controlled `value` and `onChange`.
- `Select`: typed native select with controlled `options`, `value`, and `onChange`; useful for compact settings such as pen size.
- `Toggle`: accessible `label`, controlled `checked`, and `onChange`.
- `StatusBar`: `start`, optional `end`, and optional `className`.

Editor-specific state and behavior live in `src/features/canvas`, separate from the UI kit. The current editor supports a single locally saved board, shape creation and movement, selection, styling, layer ordering, undo/redo, zoom/pan, and SVG export. It does not yet implement resizing handles, multi-selection, or collaboration.

Canvas text is edited in place: double-click an item with Selection, click it with Text, or select it and press Enter. The transparent inline editor shares the rendered text's font, color, and center, including labels inside shapes. Enter or clicking away saves; Escape cancels. A new text draft is added to history only after saving non-empty text. Each edit creates a single undo step, and unchanged or cancelled edits create none.

## Flowchart tools

Open Flowchart (`F`) in the floating toolbar to choose from 23 standard symbols grouped as Basic, Data & documents, Storage, Manual & special, and Connectors & logic. Choosing a symbol directly in Library arms a one-shot placement and returns to Selection (`2`/`V`) after the node is placed. Choosing Flowchart from the toolbar remains continuous for repeated placement. Connect (`C`) uses two clicks: source then target. Clicking a visible port binds an explicit side; clicking the body picks sides automatically based on node positions. Escape cancels a pending connection.

Connections use node IDs and orthogonal routes that update as nodes move. In Connect (`C`), drag directly from a source node to a target node to create a connection; visible ports choose exact sides, while a click source then click target remains supported. The toolbar also includes freehand connectors: Line (`L`), Arrow (`A`), Elbow (`E`), Curved (`U`), and Double arrow (`B`). Select one and drag from any point to any point; the endpoints are independent of nodes. Select or double-click an edge to edit its label (for example Yes/No). Deleting a node also removes its connected edges in one undo step. Flowcharts share the existing local save, undo/redo, themes, inline text editing, and SVG export. Add sample flowchart inserts a new example beside existing content and centers the view on it.

Flowchart code is grouped in `src/features/canvas/flowchart`. `FlowchartLibrary.tsx` provides the controls, `flowchart.css` contains feature styles, and `index.ts` handles node creation, anchors, routes, validation, and deletion. Routes use perpendicular segments and explicit endpoint stubs; they do not yet avoid unrelated nodes automatically. Run `npm run test:flowchart` for the Node tests.

## Floating windows

`FloatingPanel` is a reusable, non-modal window positioned inside a relatively positioned parent. It supports dragging by its title, arrow-key movement (Shift for larger steps), minimization, closing, and resetting its position. Its position is clamped to the parent's bounds on drag and resize. The body scrolls independently; the header stays reachable. Existing `Panel` remains available for docked layouts.

```tsx
<div style={{ position: 'relative', height: 600 }}>
  <FloatingPanel title="Settings" open={open} onClose={() => setOpen(false)} side="right" width={250}>
    <PropertyField label="Accent">...</PropertyField>
  </FloatingPanel>
</div>
```

Use `active` and `onActivate` to coordinate stacking when multiple windows overlap. State survives closing and reopening while the component stays mounted. Positions are session-only; Reset returns a window to its default side.

`FloatingPanel` also accepts an optional `icon` next to its title to communicate the window's purpose.

## Floating toolbars

`FloatingToolbar` wraps tool buttons in a draggable menu with a dedicated grip, reset button, and optional `hint` that moves with it. Pass `label`, `children`, optional `active`, and `onActivate`. Place it inside a relatively positioned container, alongside other floating windows so they can share stacking order.

Drag the grip with a mouse or touch, or focus it and use arrow keys (Shift for larger steps). Double-click the grip or press Reset to return to the top center. Movement and resizing stay within the parent bounds. On narrow screens the tool strip scrolls horizontally, keeping the grip and reset control available. Choosing tools does not drag the toolbar. Positions are session-only.

```tsx
<FloatingToolbar label="Drawing tools" hint="Choose a tool to start drawing.">
  <IconButton label="Rectangle" onClick={selectRectangle}><IconSquare size={18} /></IconButton>
</FloatingToolbar>
```

## Theme setup

Wrap the application once in `ThemeProvider` from `src/theme/ThemeProvider` (already configured in `main.tsx`). Import `ThemePicker` from this UI barrel to place the appearance control on any page. Use `useTheme` from `src/theme/useTheme` to access `preference`, `setMode`, or `setTheme`.

The original Lavender palette and five additional palettes (Ocean, Forest, Rose, Sunset, Slate) each support light and dark mode. Preferences are validated and stored separately from board data under `devcanvas-appearance`; the initial mode follows the system when no saved choice exists. Storage failures do not prevent theme changes.

Use the semantic CSS variables `--surface`, `--surface-soft`, `--surface-hover`, `--canvas`, `--border`, `--text`, `--text-secondary`, `--muted`, `--accent`, `--accent-soft`, `--accent-hover`, `--accent-border`, `--grid`, `--success`, `--shadow`, and `--overlay` in new components. All palettes are defined in `src/theme/themes.ts`.

Dark mode adapts canvas colors for legibility during rendering. Original shape colors remain in the document and color controls; switching to light mode restores their exact appearance. SVG export includes the current canvas appearance with resolved colors, so it works without the application's CSS.
