import type DataManager from './DataManager';
import type Selection from './Selection';
import type CommandManager from './commands/CommandManager';
import ResizeHandler, { type ResizeHandlerDependencies, type ResizeState } from './eventHandlers/ResizeHandler';
import SelectionHandler, { type SelectionHandlerDependencies } from './eventHandlers/SelectionHandler';

// Re-export ResizeState for Canvas to use if needed, or Canvas can import it directly
export type { ResizeState };

// Define CellCoordinates directly as it's a simple type used internally
interface CellCoordinates { row: number; col: number; }

// Define ResizeHandleInfo directly as it's a simple type used internally
interface ResizeHandleInfo { type: 'column' | 'row'; index: number; }


export interface InputManagerDependencies {
    dataManager: DataManager;
    selection: Selection;
    commandManager: CommandManager;
    canvas: HTMLCanvasElement; // For cursor style & rect

    // Zoom and scroll related getters from Canvas
    getZoomLevel: () => number;
    getScrollX: () => number;
    getScrollY: () => number;

    // Logical header dimensions from Canvas
    getHeaderWidth: () => number;
    getHeaderHeight: () => number;

    // Core interaction functions from Canvas
    // These are the original Canvas methods that work with logical coordinates mostly
    getLogicalCellAtViewPosition: (viewX: number, viewY: number) => CellCoordinates | null;
    getResizeHandleAtViewPosition: (viewX: number, viewY: number) => ResizeHandleInfo | null;
    // Adapters to be created for SelectionHandler if its own getRow/ColAtIndex need view coords
    // Or, Canvas provides these directly if they exist
    getRowIndexAtViewY: (viewY: number) => number; // Assumes Canvas provides this adapter
    getColumnIndexAtViewX: (viewX: number) => number; // Assumes Canvas provides this adapter

    // Canvas utility functions
    scheduleRedraw: () => void;
    setupVirtualScrolling: () => void; // For ResizeHandler
}

export default class InputManager {
    private deps: InputManagerDependencies;
    private resizeHandler: ResizeHandler;
    private selectionHandler: SelectionHandler;
    private canvasRect: DOMRect;

    constructor(dependencies: InputManagerDependencies) {
        this.deps = dependencies;

        const resizeHandlerDeps: ResizeHandlerDependencies = {
            dataManager: this.deps.dataManager,
            commandManager: this.deps.commandManager,
            canvas: this.deps.canvas,
            getZoomLevel: this.deps.getZoomLevel,
            scheduleRedraw: this.deps.scheduleRedraw,
            setupVirtualScrolling: this.deps.setupVirtualScrolling,
        };
        this.resizeHandler = new ResizeHandler(resizeHandlerDeps);

        const selectionHandlerDeps: SelectionHandlerDependencies = {
            selection: this.deps.selection,
            // Pass the Canvas methods directly for these, as they are defined to take view positions
            getCellAtViewPosition: this.deps.getLogicalCellAtViewPosition, // Canvas's getCellAtPosition handles view coords
            getRowIndexAtViewY: this.deps.getRowIndexAtViewY, // Canvas needs to provide this adapter
            getColumnIndexAtViewX: this.deps.getColumnIndexAtViewX, // Canvas needs to provide this adapter
            scheduleRedraw: this.deps.scheduleRedraw,
            headerWidth: this.deps.getHeaderWidth(), // Pass actual values
            headerHeight: this.deps.getHeaderHeight(), // Pass actual values
        };
        this.selectionHandler = new SelectionHandler(selectionHandlerDeps);

        // Initialize canvasRect. It should be updated if canvas moves/resizes.
        // For simplicity, we get it on each event for now, but could be cached
        // and updated via a dedicated method called by Canvas on resize/scroll.
        this.canvasRect = this.deps.canvas.getBoundingClientRect();
    }

    private updateCanvasRect() {
        this.canvasRect = this.deps.canvas.getBoundingClientRect();
    }

    public handleMouseDown(event: MouseEvent): void {
        this.updateCanvasRect();
        const viewX = event.clientX - this.canvasRect.left;
        const viewY = event.clientY - this.canvasRect.top;

        // Check for resize handles first
        const resizeHandle = this.deps.getResizeHandleAtViewPosition(viewX, viewY);
        if (resizeHandle) {
            // Pass event and canvasRect for coordinate calculation within handler
            this.resizeHandler.startResize(event, resizeHandle, this.canvasRect);
            return; // Resize operation started, no further mouse down handling
        }

        // If not resizing, try selection
        // SelectionHandler's mousedown expects the event and canvasRect
        const selectionHandled = this.selectionHandler.handleMouseDown(event, this.canvasRect);
        if (selectionHandled) {
            return; // Selection operation started
        }
    }

    public handleMouseMove(event: MouseEvent): void {
        this.updateCanvasRect();
        // const viewX = event.clientX - this.canvasRect.left;
        // const viewY = event.clientY - this.canvasRect.top;

        // If resizing, delegate to resize handler
        if (this.resizeHandler.resizeState) {
            this.resizeHandler.handleMouseMove(event, this.canvasRect);
            return;
        }

        // If dragging selection, delegate to selection handler
        if (this.selectionHandler.isDragging()) {
            this.selectionHandler.handleMouseMove(event, this.canvasRect);
            return;
        }

        // If not actively resizing or dragging, update cursor based on hover
        // This logic was originally in Canvas.handleMouseMove's "else" block
        const viewXCursor = event.clientX - this.canvasRect.left;
        const viewYCursor = event.clientY - this.canvasRect.top;
        const resizeHandleHover = this.deps.getResizeHandleAtViewPosition(viewXCursor, viewYCursor);
        if (resizeHandleHover) {
            this.deps.canvas.style.cursor = resizeHandleHover.type === 'column' ? 'col-resize' : 'row-resize';
        } else {
            this.deps.canvas.style.cursor = 'cell'; // Default cursor
        }
    }

    public handleMouseUp(event: MouseEvent): void {
        this.updateCanvasRect(); // Ensure rect is up-to-date

        let handled = false;
        if (this.resizeHandler.resizeState) {
            handled = this.resizeHandler.handleMouseUp(); // Finishes resize
        }

        // Pass event for potential future use, though current selectionHandler.handleMouseUp doesn't use it
        if (this.selectionHandler.isDragging()) {
            // Ensure selection mouseUp is called even if resize mouseUp was handled,
            // to correctly clear selection drag states.
            // However, typically, one action (resize OR select) is active.
            // If resize was active, selection drag shouldn't be.
            // This logic assumes resize takes precedence if its state is active.
             if (!handled) { // Only call if resize didn't handle the mouseUp
                handled = this.selectionHandler.handleMouseUp();
             } else {
                // If resize was handled, still ensure selection drag states are cleared
                // This might be overly cautious if states are managed well.
                this.selectionHandler.clearDragStates();
             }
        }


        // Reset cursor to default if no other state implies a special cursor
        // This is important after resize or drag selection ends.
        if (!this.resizeHandler.resizeState && !this.selectionHandler.isDragging()) {
            // Check current hover state for cursor, similar to mouseMove's "else"
            const viewX = event.clientX - this.canvasRect.left;
            const viewY = event.clientY - this.canvasRect.top;
            const resizeHandleHover = this.deps.getResizeHandleAtViewPosition(viewX, viewY);
            if (resizeHandleHover) {
                this.deps.canvas.style.cursor = resizeHandleHover.type === 'column' ? 'col-resize' : 'row-resize';
            } else {
                this.deps.canvas.style.cursor = 'cell';
            }
        }
        // A redraw is usually scheduled by the handlers themselves if needed.
        // If a general redraw is needed after any mouseup, InputManager could do it here.
        // For now, assuming handlers manage their redraws.
    }

    // Expose resize state for Canvas if it needs to query (e.g., for preventing other actions)
    public getActiveResizeState(): ResizeState | null {
        return this.resizeHandler.resizeState;
    }

    // Expose dragging state for Canvas
    public isDraggingSelection(): boolean {
        return this.selectionHandler.isDraggingCellSelection;
    }
    public isDraggingRowHeaderSelection(): boolean {
        return this.selectionHandler.isDraggingRowHeaderSelection;
    }
    public isDraggingColumnHeaderSelection(): boolean {
        return this.selectionHandler.isDraggingColumnHeaderSelection;
    }
}
