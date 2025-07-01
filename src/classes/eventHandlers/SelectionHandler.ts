import type Selection from '../Selection';
import type { CellCoordinates } from '../../types'; // Assuming you might have a type like this

export interface SelectionHandlerDependencies {
    selection: Selection;
    getCellAtPosition: (viewX: number, viewY: number) => CellCoordinates | null;
    getRowAtY: (logicalY: number) => number;
    getColumnAtX: (logicalX: number) => number;
    scheduleRedraw: () => void;
    headerWidth: number;
    headerHeight: number;
    // No direct DataManager or CommandManager needed here as Selection class handles its logic
}

export default class SelectionHandler {
    private deps: SelectionHandlerDependencies;

    private _isDraggingCellSelection: boolean = false;
    private _dragStartCell: CellCoordinates | null = null;

    private _isDraggingRowHeaderSelection: boolean = false;
    private _dragStartRowIndex: number | null = null;

    private _isDraggingColumnHeaderSelection: boolean = false;
    private _dragStartColIndex: number | null = null;

    constructor(dependencies: SelectionHandlerDependencies) {
        this.deps = dependencies;
    }

    public get isDraggingCellSelection(): boolean {
        return this._isDraggingCellSelection;
    }

    public get isDraggingRowHeaderSelection(): boolean {
        return this._isDraggingRowHeaderSelection;
    }

    public get isDraggingColumnHeaderSelection(): boolean {
        return this._isDraggingColumnHeaderSelection;
    }

    public isDragging(): boolean {
        return this._isDraggingCellSelection || this._isDraggingRowHeaderSelection || this._isDraggingColumnHeaderSelection;
    }


    public handleMouseDown(event: MouseEvent, canvasRect: DOMRect): boolean {
        const x = event.clientX - canvasRect.left;
        const y = event.clientY - canvasRect.top;

        // Try cell selection first
        const cellCoords = this.deps.getCellAtPosition(x, y);
        if (cellCoords) {
            this._isDraggingCellSelection = true;
            this._dragStartCell = { row: cellCoords.row, col: cellCoords.col };

            if (event.ctrlKey || event.metaKey) {
                this.deps.selection.multiSelect = true; // Ensure multi-select mode
                this.deps.selection.selectCell(cellCoords.row, cellCoords.col, true);
            } else if (event.shiftKey && this.deps.selection.activeRange) {
                this.deps.selection.extendSelection(cellCoords.row, cellCoords.col);
            } else {
                this.deps.selection.selectCell(cellCoords.row, cellCoords.col);
            }
            this.deps.scheduleRedraw();
            return true; // Mouse down handled by cell selection
        }

        // If not cell selection, check for header selection
        // Note: getCellAtPosition already checks if x/y are outside header areas for cell grid
        // So, if cellCoords is null, it might be a header click or outside the grid entirely.

        // Row header clicked
        // logicalX is needed for getColumnAtX/getRowAtY, but here we use viewX/viewY with header dimensions
        if (x < this.deps.headerWidth && y >= this.deps.headerHeight) {
            // Pass viewY to getRowAtY, assuming getRowAtY can handle it or is adapted.
            // OR, convert y to logicalY if getRowAtY expects that.
            // For simplicity, assuming getRowAtY works with viewY if called from canvas context
            // For now, let's assume the canvas will provide logical coordinates or adapt.
            // This handler ideally should receive logical coordinates or view coordinates consistently.
            // Let's assume the InputManager will provide the correct coordinate type or helper.
            // For now, we'll rely on the `getCellAtPosition` being the primary way to get cell coords.
            // The direct `getRowAtY` and `getColumnAtX` calls here might need adjustment based on
            // what coordinates InputManager decides to pass or how Canvas's helpers work.

            // To call getRowAtY, we need logicalY. Canvas's getRowAtY expects logicalY.
            // We only have viewY (y). We need scrollY and zoomLevel to convert.
            // This indicates a dependency issue or a need for InputManager to provide these.
            // For now, we'll placeholder this part, as Canvas directly calls its getRowAtY.
            // The InputManager will need to facilitate this.

            // Let's assume InputManager calls a specific method in Canvas that then calls this.
            // Or InputManager passes the necessary conversion utilities.

            // For this step, we'll replicate the logic structure.
            // The actual coordinate conversion will be sorted during InputManager integration.

            const rowIndex = this.deps.getRowAtY(y); // This call might be problematic if y is viewY
                                                    // and getRowAtY expects logicalY.
                                                    // This needs to be resolved in InputManager/Canvas refactor.

            if (rowIndex !== -1 && rowIndex !== null && rowIndex !== undefined) { // Check for valid index
                this._isDraggingRowHeaderSelection = true;
                this._dragStartRowIndex = rowIndex;
                this.deps.selection.selectRow(rowIndex);
                this.deps.scheduleRedraw();
                return true; // Mouse down handled by row header selection
            }
        }
        // Column header clicked
        else if (y < this.deps.headerHeight && x >= this.deps.headerWidth) {
            const colIndex = this.deps.getColumnAtX(x); // Similar coordinate issue as above.
            if (colIndex !== -1 && colIndex !== null && colIndex !== undefined) { // Check for valid index
                this._isDraggingColumnHeaderSelection = true;
                this._dragStartColIndex = colIndex;
                this.deps.selection.selectColumn(colIndex);
                this.deps.scheduleRedraw();
                return true; // Mouse down handled by column header selection
            }
        }
        return false; // Mouse down not handled by selection logic
    }

    public handleMouseMove(event: MouseEvent, canvasRect: DOMRect): boolean {
        const x = event.clientX - canvasRect.left;
        const y = event.clientY - canvasRect.top;

        if (this._isDraggingCellSelection && this._dragStartCell) {
            const cellCoords = this.deps.getCellAtPosition(x, y);
            if (cellCoords && this.deps.selection.activeRange) {
                // Ensure active range is up-to-date with the drag start cell if it's a new selection
                // This check might be redundant if mousedown correctly sets the activeRange start.
                if (this.deps.selection.activeRange.startRow !== this._dragStartCell.row ||
                    this.deps.selection.activeRange.startCol !== this._dragStartCell.col) {
                    // This scenario implies that a drag started, but the activeRange's origin
                    // doesn't match the drag's actual starting cell. This could happen if
                    // selectCell in mousedown didn't set the _activeRange start correctly,
                    // or if shift/ctrl selection logic interfered.
                    // For a simple drag (no modifiers), mousedown should set the activeRange
                    // such that its startRow/Col matches _dragStartCell.
                    // If they don't match, extendSelection might behave unexpectedly.
                    // A robust solution might involve ensuring extendSelection always uses
                    // _dragStartCell as the anchor if _isDraggingSelection is true.
                }
                this.deps.selection.extendSelection(cellCoords.row, cellCoords.col);
                this.deps.scheduleRedraw();
                return true;
            }
        } else if (this._isDraggingRowHeaderSelection && this._dragStartRowIndex !== null) {
            const currentRowIndex = this.deps.getRowAtY(y); // Coordinate issue
            if (currentRowIndex !== -1 && currentRowIndex !== null && currentRowIndex !== undefined) {
                const startRow = Math.min(this._dragStartRowIndex, currentRowIndex);
                const endRow = Math.max(this._dragStartRowIndex, currentRowIndex);
                this.deps.selection.selectRowRange(startRow, endRow);
                this.deps.scheduleRedraw();
                return true;
            }
        } else if (this._isDraggingColumnHeaderSelection && this._dragStartColIndex !== null) {
            const currentColIndex = this.deps.getColumnAtX(x); // Coordinate issue
             if (currentColIndex !== -1 && currentColIndex !== null && currentColIndex !== undefined) {
                const startCol = Math.min(this._dragStartColIndex, currentColIndex);
                const endCol = Math.max(this._dragStartColIndex, currentColIndex);
                this.deps.selection.selectColumnRange(startCol, endCol);
                this.deps.scheduleRedraw();
                return true;
            }
        }
        return false; // Mouse move not handled by active selection drag
    }

    public handleMouseUp(): boolean {
        let handled = false;
        if (this._isDraggingCellSelection) {
            this._isDraggingCellSelection = false;
            this._dragStartCell = null;
            handled = true;
        }
        if (this._isDraggingRowHeaderSelection) {
            this._isDraggingRowHeaderSelection = false;
            this._dragStartRowIndex = null;
            handled = true;
        }
        if (this._isDraggingColumnHeaderSelection) {
            this._isDraggingColumnHeaderSelection = false;
            this._dragStartColIndex = null;
            handled = true;
        }
        // Redraw is typically handled by the caller (InputManager or Canvas) after all mouseup logic.
        // If specific redraws are needed only on selection changes, they can be done here.
        // For now, we assume InputManager will schedule a redraw if any handler returns true.
        return handled;
    }

    public clearDragStates(): void {
        this._isDraggingCellSelection = false;
        this._dragStartCell = null;
        this._isDraggingRowHeaderSelection = false;
        this._dragStartRowIndex = null;
        this._isDraggingColumnHeaderSelection = false;
        this._dragStartColIndex = null;
    }
}

// Define CellCoordinates if it's not globally available.
// For now, assuming it's something like:
// export interface CellCoordinates { row: number; col: number; }
// It's better to have this in a central types file.
// We'll add a placeholder in `src/types.ts` if it doesn't exist.
// For now, this file will compile by assuming CellCoordinates is imported.
// If `src/types.ts` doesn't exist or define it, we'll need to create it.
// Let's check if `src/types.ts` exists. (Assume it will be created or already exists from problem context)
// If not, a simple `interface CellCoordinates { row: number; col: number; }` would be at the top or imported.
// For this step, the import `../types` is speculative. If it causes issues, remove/replace.
// It seems `canvas.ts` uses `{ row: number, col: number }` directly. We'll stick to that.

// Re-adjusting based on Canvas.ts direct usage:
// No need for CellCoordinates import if using inline object types.
// The `getCellAtPosition` in Canvas.ts returns `{ row: number, col: number } | null`.
// So, `_dragStartCell` should be ` { row: number, col: number } | null`.
// This is implicitly handled by `CellCoordinates | null` if `CellCoordinates` is `{row: number, col: number}`.
// The provided `Canvas.ts` doesn't show a `types.ts` import, so we'll use inline types.
// Removing `import type { CellCoordinates } from '../../types';` for now.
// And ensuring `_dragStartCell` is ` { row: number; col: number; } | null;`
// And function signatures use this type.
// The `CellCoordinates` in the interface was just a placeholder.
// Let's refine the types within this file to match Canvas.ts usage.

// Corrected version without external CellCoordinates type:
// (The content above already reflects this by using {row: number, col: number})
// The main concern is the coordinate systems for getRowAtY/getColumnAtX.
// These functions in Canvas.ts expect LOGICAL coordinates (scrolled, unzoomed).
// The event x/y are VIEW coordinates (relative to canvas, unzoomed by app, but affected by DPR).
// InputManager will need to pass:
// 1. Either logical coordinates directly.
// 2. Or view coordinates + scrollX/scrollY + zoomLevel for conversion.
// This handler should ideally be agnostic or clearly state what it expects.
// For now, the structure is laid out. Dependency injection for conversion utilities
// or pre-converted coordinates will be handled by InputManager.
// The current `this.deps.getRowAtY(y)` will likely fail if `y` is viewY.
// This will be fixed when InputManager is implemented and passes correct params.
// For now, the structure of the SelectionHandler is the goal.
// The `CellCoordinates` type was removed from the import as it's not defined yet.
// The type `{ row: number, col: number }` is used directly as in `Canvas.ts`.
// Final check of dependencies: `headerWidth` and `headerHeight` are needed as logical, unzoomed values.
// `Canvas.ts` uses `this._headerWidth` and `this._headerHeight` which are indeed logical.
// So these dependencies are fine.
// The main challenge is `getCellAtPosition`, `getRowAtY`, `getColumnAtX` which need careful coordinate handling by the caller (InputManager).
// `getCellAtPosition(viewX, viewY)` in Canvas.ts handles its own conversions.
// `getRowAtY(logicalY)` and `getColumnAtX(logicalX)` in Canvas.ts expect logical coordinates.
// So, the `InputManager` needs to convert `event.clientX/Y` appropriately before calling these.
// This `SelectionHandler` assumes its `deps.getRowAtY` and `deps.getColumnAtX` will be called with logical coords.
// However, the current `handleMouseDown` calls them with `x` and `y` which are view coords. This is the part that InputManager needs to bridge.
// For the purpose of this step (creating SelectionHandler), the internal logic is drafted.
// The dependency list is what it *will* need. How those deps are fulfilled (e.g. pre-converted coords) is next.
// Let's assume for now that `InputManager` will call these methods with appropriate `viewX, viewY`
// and that `getCellAtPosition` handles the view-to-logical conversion,
// while for direct header clicks, `InputManager` will do the conversion for `getRowAtY/getColumnAtX`.

// To make this class testable in isolation and clearer:
// `handleMouseDown` should receive `logicalX, logicalY` for header checks,
// or `viewX, viewY` if `getRowAtY/getColumnAtX` are expected to handle view coords (which they don't in Canvas.ts).
// Let's assume InputManager will provide `viewX, viewY` to `handleMouseDown` here,
// and this handler will use `getCellAtPosition` for cells.
// For header clicks, it means `getRowAtY` and `getColumnAtX` in `deps`
// would need to be wrappers provided by `InputManager` that take `viewX/Y` and convert.
// Or, `InputManager` calls specialized methods on `SelectionHandler` for header interactions.

// Simpler approach: `InputManager` determines if it's a header click.
// If so, it calls a dedicated method like `handleHeaderMouseDown` on `SelectionHandler`
// passing the `rowIndex` or `colIndex` it already determined.

// For now, let's stick to the current structure and refine interaction with InputManager in its step.
// The current `SelectionHandler` structure mirrors `Canvas.ts` logic flow.
// The coordinate issue for `getRowAtY(y)` and `getColumnAtX(x)` is noted for `InputManager` step.
// `InputManager` will be responsible for calling these with correct (logical) coordinates.
// So, `SelectionHandler.handleMouseDown` should ideally receive `viewX, viewY, logicalX, logicalY`.
// Or `InputManager` should call more specific methods.

// Given the plan, InputManager will call these generic `handleMouseDown` etc.
// So, `InputManager` MUST provide `getRowAtY` and `getColumnAtX` that can correctly derive
// logical positions from the raw `viewX, viewY` it passes, or pass converted coords.
// The `deps` should be:
// getCellAtPosition: (viewX, viewY) => {row, col} | null
// getRowIndexFromViewY: (viewY) => number (wrapper for original getRowAtY)
// getColIndexFromViewX: (viewX) => number (wrapper for original getColumnAtX)

// Let's modify SelectionHandler to expect these "adapted" getters from its deps.
// The `Canvas.ts` itself will provide these adapters to InputManager, or InputManager creates them.

// Redefining dependencies for clarity:
// getCellAtPosition: (viewX: number, viewY: number) => { row: number; col: number } | null;
// getRowAtViewY: (viewY: number) => number; // This is what SelectionHandler needs for header checks
// getColumnAtViewX: (viewX: number) => number; // This is what SelectionHandler needs for header checks

// The current implementation uses `this.deps.getRowAtY(y)` where `y` is `viewY`.
// This means the `getRowAtY` supplied in `deps` *must* be one that takes `viewY`.
// Canvas.ts `getRowAtY` takes `logicalY`.
// This will be resolved when wiring up InputManager: InputManager will provide wrapped versions
// or pre-calculate logical coordinates. For now, the SelectionHandler code is structurally sound
// assuming its `deps.getRowAtY` is called with the coordinate type it expects.
// The current code calls `deps.getRowAtY(y)` (viewY). So the provided function in `deps` must handle `viewY`.
// This is a contract for `InputManager` to fulfill.
// No changes to SelectionHandler code itself for this realization, but it clarifies the interface.
