import type DataManager from '../DataManager';
import type CommandManager from '../commands/CommandManager';
import ResizeCommand from '../commands/ResizeCommand';
import type Column from '../Column';
import type Row from '../Row';

export interface ResizeHandlerDependencies {
    dataManager: DataManager;
    commandManager: CommandManager;
    canvas: HTMLCanvasElement;
    getZoomLevel: () => number;
    scheduleRedraw: () => void;
    setupVirtualScrolling: () => void; // Added for updating scroll area after resize
}

export interface ResizeState {
    type: 'column' | 'row';
    index: number;
    startX: number; // Mouse X at start of resize
    startY: number; // Mouse Y at start of resize
    originalSize: number; // Original width/height of the column/row
    newSize?: number; // Current new size during drag
}

export default class ResizeHandler {
    private deps: ResizeHandlerDependencies;
    private _resizeState: ResizeState | null = null;

    constructor(dependencies: ResizeHandlerDependencies) {
        this.deps = dependencies;
    }

    public get resizeState(): ResizeState | null {
        return this._resizeState;
    }

    public startResize(
        event: MouseEvent,
        resizeHandle: { type: 'column' | 'row'; index: number },
        canvasRect: DOMRect
    ): boolean {
        if (!resizeHandle) return false;

        const x = event.clientX - canvasRect.left;
        const y = event.clientY - canvasRect.top;

        this._resizeState = {
            type: resizeHandle.type,
            index: resizeHandle.index,
            startX: x, // Store initial mouse position relative to canvas
            startY: y,
            originalSize:
                resizeHandle.type === 'column'
                    ? this.deps.dataManager.columns[resizeHandle.index].width
                    : this.deps.dataManager.rows[resizeHandle.index].height,
        };
        this.deps.canvas.style.cursor = resizeHandle.type === 'column' ? 'col-resize' : 'row-resize';
        return true;
    }

    public handleMouseMove(event: MouseEvent, canvasRect: DOMRect): boolean {
        if (!this._resizeState) return false;

        const x = event.clientX - canvasRect.left;
        const y = event.clientY - canvasRect.top;

        const delta =
            this._resizeState.type === 'column'
                ? x - this._resizeState.startX // delta in view pixels
                : y - this._resizeState.startY; // delta in view pixels

        const logicalDelta = delta / this.deps.getZoomLevel(); // Convert view delta to logical delta
        const minLogicalSize = 20; // Minimum logical width/height for a cell

        const newSize = Math.max(minLogicalSize, this._resizeState.originalSize + logicalDelta);

        if (this._resizeState.type === 'column') {
            this.deps.dataManager.columns[this._resizeState.index].width = newSize;
        } else {
            this.deps.dataManager.rows[this._resizeState.index].height = newSize;
        }
        this._resizeState.newSize = newSize;

        this.deps.setupVirtualScrolling(); // Update virtual scroll area due to size change
        this.deps.scheduleRedraw();
        return true;
    }

    public handleMouseUp(): boolean {
        if (!this._resizeState) return false;

        if (this._resizeState.newSize !== undefined && this._resizeState.newSize !== this._resizeState.originalSize) {
            if (this._resizeState.type === 'column') {
                const col = this.deps.dataManager.columns[this._resizeState.index] as Column; // Type assertion
                this.deps.commandManager.executeCommand(
                    new ResizeCommand(col, this._resizeState.newSize, this._resizeState.originalSize)
                );
            } else {
                const row = this.deps.dataManager.rows[this._resizeState.index] as Row; // Type assertion
                this.deps.commandManager.executeCommand(
                    new ResizeCommand(row, this._resizeState.newSize, this._resizeState.originalSize)
                );
            }
        }

        this._resizeState = null;
        // Cursor reset will be handled by InputManager or Canvas based on overall state
        return true;
    }

    public clearResizeState(): void {
        this._resizeState = null;
    }
}
