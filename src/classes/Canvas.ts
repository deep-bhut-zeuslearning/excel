import type DataManager from './DataManager';
import type Selection from './Selection';
import CommandManager from './CommandManager';
import CellEditCommand from './CellEditCommand';
import ResizeCommand from './ResizeCommand';

/**
 * Manages the HTML5 Canvas rendering for the Excel grid
 * Handles virtual scrolling, drawing, and user interactions
 */
export default class Canvas {
    /** @type {HTMLCanvasElement} The main canvas element */
    private _canvas: HTMLCanvasElement;
    
    /** @type {CanvasRenderingContext2D} 2D rendering context */
    private _ctx: CanvasRenderingContext2D;
    
    /** @type {DataManager} Reference to the data manager */
    private _dataManager: DataManager;
    
    /** @type {Selection} Reference to the selection manager */
    private _selection: Selection;
    
    /** @type {HTMLElement} The canvas wrapper element */
    private _wrapper: HTMLElement;
    
    /** @type {number} Height of column headers in pixels */
    private readonly _headerHeight: number = 30;
    
    /** @type {number} Width of row headers in pixels */
    private readonly _headerWidth: number = 60;
    
    /** @type {number} Current viewport width */
    private _viewportWidth: number = 0;
    
    /** @type {number} Current viewport height */
    private _viewportHeight: number = 0;
    
    /** @type {number} Current horizontal scroll position */
    private _scrollX: number = 0;
    
    /** @type {number} Current vertical scroll position */
    private _scrollY: number = 0;

    // /** @type {'left' | 'center' | 'right' | null} Current horizontal alignment */
    // private _horizontalAlignment: 'left' | 'center' | 'right' | null = null;
    
    // /** @type {'top' | 'middle' | 'bottom' | null} Current vertical alignment */
    // private _verticalAlignment: 'top' | 'middle' | 'bottom' | null = null;

    // /** @type {number} Current font size */
    // fontSize: number = 14;
    
    /** @type {object} Cache of visible cell range for performance */
    private _visibleRange = {
        startRow: 0,
        endRow: 0,
        startCol: 0,
        endCol: 0
    };
    
    /** @type {number | null} Animation frame request ID */
    private _animationFrameId: number | null = null;
    
    /** @type {boolean} Whether canvas is currently being drawn */
    private _isDrawing: boolean = false;
    
    /** @type {HTMLInputElement | null} Active cell input element */
    private _cellInput: HTMLInputElement | HTMLTextAreaElement | null = null;
    
    /** @type {object | null} Current resize operation state */
    private _resizeState: {
        type: 'column' | 'row';
        index: number;
        startX: number;
        startY: number;
        originalSize: number;
        newSize?: number;
    } | null = null;

    /** @type {boolean} Whether a drag selection is in progress */
    private _isDraggingSelection: boolean = false;

    /** @type {{ row: number, col: number} | null} Starting cell of a drag selection */
    private _dragStartCell: { row: number, col: number } | null = null;

    /** @type {boolean} Whether a drag selection on a row header is in progress */
    private _isDraggingRowHeaderSelection: boolean = false;

    /** @type {number | null} Starting row index of a row header drag selection */
    private _dragStartRowIndex: number | null = null;

    /** @type {boolean} Whether a drag selection on a column header is in progress */
    private _isDraggingColumnHeaderSelection: boolean = false;

    /** @type {number | null} Starting column index of a column header drag selection */
    private _dragStartColIndex: number | null = null;

    /** @type {number} Current zoom level */
    private _zoomLevel: number = 1;

    /** @type {number} Minimum zoom level */
    private readonly _minZoom: number = 0.6;

    /** @type {number} Maximum zoom level */
    private readonly _maxZoom: number = 5;

    /** @type {CommandManager} handles the exucution of all kind of commands white handling undoa and redo */
    private _commandManager: CommandManager;




    /**
     * Initializes a new Canvas instance
     * @param {HTMLElement} container - Container element for the canvas
     * @param {DataManager} dataManager - Data manager instance
     * @param {Selection} selection - Selection manager instance
     */
    constructor(container: HTMLElement, 
        dataManager: DataManager, 
        selection: Selection,
        commandManager: CommandManager,
    ) {
        this._dataManager = dataManager;
        this._selection = selection;
        this._commandManager = commandManager;
        
        // Create canvas element
        this._canvas = document.createElement('canvas');
        this._canvas.id = 'excel-canvas';
        this._ctx = this._canvas.getContext('2d')!;
        
        // Set up wrapper
        this._wrapper = container;
        this._wrapper.appendChild(this._canvas);
        
        this.initializeCanvas();
        this.setupEventListeners();
        this.setupVirtualScrolling();
        this.scheduleRedraw();

    }

    /**
     * Gets the canvas element
     * @returns {HTMLCanvasElement} The canvas element
     */
    get canvas(): HTMLCanvasElement {
        return this._canvas;
    }

    /**
     * Gets the current viewport width
     * @returns {number} Viewport width in pixels
     */
    get viewportWidth(): number {
        return this._viewportWidth;
    }

    /**
     * Gets the current viewport height
     * @returns {number} Viewport height in pixels
     */
    get viewportHeight(): number {
        return this._viewportHeight;
    }

    /**
     * Initializes canvas properties and dimensions
     */
    private initializeCanvas(): void {
        this.updateCanvasSize();
        
        // FIXED: Canvas should be fixed in position, not move with scroll
        this._canvas.style.position = 'fixed';
        this._canvas.style.top = '100px';
        this._canvas.style.left = '0';
        this._canvas.style.cursor = 'cell';
        this._canvas.style.userSelect = 'none';
        this._canvas.style.pointerEvents = 'auto';
        this._canvas.style.zIndex = '0';
    }

    /**
     * Updates canvas size to match container
    */
    private updateCanvasSize(): void {
        // Use clientWidth and clientHeight to exclude scrollbars
        this._viewportWidth = this._wrapper.clientWidth - 12;
        this._viewportHeight = this._wrapper.clientHeight - 12;

        
        // Get bounding rect for positioning
        const rect = this._wrapper.getBoundingClientRect();

        // Set canvas style dimensions
        // this._canvas.style.width = this._viewportWidth;
        // this._canvas.style.height = this._viewportHeight;

        // Position canvas to overlay the wrapper content area
        // This uses rect.left and rect.top which is fine for fixed positioning
        // relative to the viewport, assuming the wrapper itself is positioned correctly.
        this._canvas.style.left = rect.left + 'px';
        this._canvas.style.top = rect.top + 'px';
        
        // Set canvas rendering dimensions (consider DPR)
        const dpr = window.devicePixelRatio || 1;
        this._canvas.width = this._viewportWidth * dpr;
        this._canvas.height = this._viewportHeight * dpr;

        this._ctx.scale(dpr, dpr);
        // if (dpr > 1) {
        // }
    }

    /**
     * Sets up virtual scrolling for large datasets
     */
    private setupVirtualScrolling(): void {
        // Calculate total content size (unscaled)
        const totalWidth = this._headerWidth + this._dataManager.columns.reduce((sum, col) => sum + col.width, 0);
        const totalHeight = this._headerHeight + this._dataManager.rows.reduce((sum, row) => sum + row.height, 0);
        
        // Create or update virtual scroll area
        let scrollArea = document.getElementById('virtual-scroll-area') as HTMLDivElement;
        if (!scrollArea) {
            scrollArea = document.createElement('div');
            scrollArea.id = 'virtual-scroll-area';
            scrollArea.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                pointer-events: none;
                opacity: 0;
                z-index: -1;
            `;
            this._wrapper.appendChild(scrollArea);
        }
        
        scrollArea.style.width = totalWidth + 'px';
        scrollArea.style.height = totalHeight + 'px';
    }

    /**
     * Sets up event listeners for user interactions
     */
    private setupEventListeners(): void {
        // Window resize and scroll - update canvas position
        window.addEventListener('resize', this.handleResize.bind(this));
        window.addEventListener('scroll', this.handleWindowScroll.bind(this));
        
        // Wrapper scroll events - this is the virtual scrolling
        this._wrapper.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });
        
        // Mouse events on canvas
        this._canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this._canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this._canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this._canvas.addEventListener('dblclick', this.handleDoubleClick.bind(this));
        
        // Prevent context menu on canvas
        this._canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Keyboard events (when canvas is focused)
        this._canvas.tabIndex = 0; // Make canvas focusable
        this._canvas.addEventListener('keydown', this.handleKeyDown.bind(this));
        
        // Prevent canvas from interfering with wrapper scrolling
        this._canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            if (e.ctrlKey) {
                // Zooming
                const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
                this.setZoom(this._zoomLevel * zoomFactor);
            } else {
                // Forward wheel events to the wrapper for scrolling
                this._wrapper.scrollLeft += e.deltaX;
                this._wrapper.scrollTop += e.deltaY;
            }
        });

        // Add document-level keydown for zoom shortcuts, as canvas might not always have focus
        document.addEventListener('keydown', this.handleGlobalKeyDown.bind(this));
    }

    /**
     * Handles global keydown events for application-wide shortcuts (like zoom)
     * @param {KeyboardEvent} event - Keyboard event
     */
    private handleGlobalKeyDown(event: KeyboardEvent): void {
        if (event.ctrlKey || event.metaKey) {
            let handled = false;
            switch (event.key) {
                case '+':
                case '=': // Handle '=' as '+' for convenience
                    this.setZoom(this._zoomLevel * 1.1);
                    handled = true;
                    break;
                case '-':
                    this.setZoom(this._zoomLevel * 0.9);
                    handled = true;
                    break;
                case '0':
                    this.setZoom(1); // Reset zoom
                    handled = true;
                    break;
            }
            if (handled) {
                event.preventDefault();
            }
        }
    }

    /**
     * Sets the zoom level and redraws the canvas
     * @param {number} newZoomLevel - The new zoom level
    */
    private setZoom(newZoomLevel: number): void {
        const oldZoomLevel = this._zoomLevel;
        this._zoomLevel = Math.max(this._minZoom, Math.min(this._maxZoom, newZoomLevel));

        if (this._zoomLevel !== oldZoomLevel) {
            // Adjust scroll position to keep the logical point at the center of the viewport fixed
            const logicalCenterXInView = this._scrollX + (this._viewportWidth / 2) / oldZoomLevel;
            const logicalCenterYInView = this._scrollY + (this._viewportHeight / 2) / oldZoomLevel;

            const newScrollX = logicalCenterXInView - (this._viewportWidth / 2) / this._zoomLevel;
            const newScrollY = logicalCenterYInView - (this._viewportHeight / 2) / this._zoomLevel;

            this._wrapper.scrollLeft = Math.max(0, newScrollX); // Ensure scroll is not negative
            this._wrapper.scrollTop = Math.max(0, newScrollY);  // Ensure scroll is not negative

            this.updateCanvasSize(); // May need adjustment if zoom affects canvas element size itself
            this.setupVirtualScrolling(); // Virtual scroll area depends on zoom
            this.scheduleRedraw();
            if (this._cellInput) {
                this.updateCellInputPosition(); // Update editor position on zoom
            }
        }
    }

    /**
     * Handles window resize events
     */
    private handleResize(): void {
        this.updateCanvasSize();
        this.scheduleRedraw();
    }

    /**
     * Handles window scroll events to keep canvas positioned correctly
     */
    private handleWindowScroll(): void {
        // Update canvas position when window scrolls
        this.updateCanvasSize();
    }

    /**
     * Handles wrapper scroll events to update virtual scrolling
     */
    private handleScroll(): void {
        this._scrollX = this._wrapper.scrollLeft;
        this._scrollY = this._wrapper.scrollTop;
        
        // Update cell input position if active
        if (this._cellInput) {
            this.updateCellInputPosition();
        }
        
        this.scheduleRedraw();
    }

    /**
     * Handles mouse down events for selection and resizing
     * @param {MouseEvent} event - Mouse event
     */
    private handleMouseDown(event: MouseEvent): void {
        // Convert screen coordinates to canvas coordinates
        const rect = this._canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Check for resize handles first
        const resizeHandle = this.getResizeHandle(x, y);
        if (resizeHandle) {
            this._resizeState = {
                type: resizeHandle.type,
                index: resizeHandle.index,
                startX: x,
                startY: y,
                originalSize: resizeHandle.type === 'column' 
                    ? this._dataManager.columns[resizeHandle.index].width
                    : this._dataManager.rows[resizeHandle.index].height
            };
            this._canvas.style.cursor = resizeHandle.type === 'column' ? 'col-resize' : 'row-resize';
            return;
        }
        
        // Handle cell selection
        const cellCoords = this.getCellAtPosition(x, y);
        if (cellCoords) {
            this._isDraggingSelection = true;
            this._dragStartCell = { row: cellCoords.row, col: cellCoords.col };

            if (event.ctrlKey || event.metaKey) {
                // Multi-select mode - This might need more complex logic for drag,
                // for now, we'll treat drag as creating a new primary selection.
                // To add to selection with Ctrl+Drag, we'd need to store multiple drag ranges.
                this._selection.multiSelect = true; // Enable multi-select
                // For now, a new drag always replaces or becomes the active selection
                this._selection.selectCell(cellCoords.row, cellCoords.col, true);
            } else if (event.shiftKey && this._selection.activeRange) {
                // Extend selection from active range's start to current cell
                this._selection.extendSelection(cellCoords.row, cellCoords.col);
            } else {
                // Single cell selection / start of new drag range
                this._selection.selectCell(cellCoords.row, cellCoords.col);
            }
            
            this.scheduleRedraw();
        }
        
        // Handle header clicks for column/row selection
        // Ensure not starting a cell drag or resize operation
        if (!this._isDraggingSelection && !this._resizeState) {
            if (x < this._headerWidth && y >= this._headerHeight) {
                // Row header clicked
                const rowIndex = this.getRowAtY(y);
                if (rowIndex >= 0) {
                    this._isDraggingRowHeaderSelection = true;
                    this._dragStartRowIndex = rowIndex;
                    this._selection.selectRow(rowIndex); // Select initial row
                    this.scheduleRedraw();
                }
            } else if (y < this._headerHeight && x >= this._headerWidth) {
                // Column header clicked
                const colIndex = this.getColumnAtX(x);
                if (colIndex >= 0) {
                    this._isDraggingColumnHeaderSelection = true;
                    this._dragStartColIndex = colIndex;
                    this._selection.selectColumn(colIndex); // Select initial column
                    this.scheduleRedraw();
                }
            }
        }
    }

    /**
     * Handles mouse move events for cursor updates and resizing
     * @param {MouseEvent} event - Mouse event
     */
    private handleMouseMove(event: MouseEvent): void {
        const rect = this._canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        if (this._resizeState) {
            // Handle active resize operation
            const delta = this._resizeState.type === 'column' 
                ? x - this._resizeState.startX  // delta in view pixels
                : y - this._resizeState.startY; // delta in view pixels
            
            const logicalDelta = delta / this._zoomLevel; // Convert view delta to logical delta
            const minLogicalSize = 20; // Minimum logical width/height for a cell
            const newSize = Math.max(minLogicalSize, this._resizeState.originalSize + logicalDelta);
            if (this._resizeState.type === 'column') {
                this._dataManager.columns[this._resizeState.index].width = newSize;
            } else {
                this._dataManager.rows[this._resizeState.index].height = newSize;
            }
            this._resizeState.newSize = newSize;
            
            this.setupVirtualScrolling();
            this.scheduleRedraw();
        } else if (this._isDraggingSelection && this._dragStartCell) {
            const cellCoords = this.getCellAtPosition(x, y);
            if (cellCoords && this._selection.activeRange) {
                // Ensure active range is up-to-date with the drag start cell if it's a new selection
                if (this._selection.activeRange.startRow !== this._dragStartCell.row ||
                    this._selection.activeRange.startCol !== this._dragStartCell.col) {
                     // This case should ideally be handled by mousedown creating the initial selection correctly.
                     // If we are dragging, activeRange should already be set with _dragStartCell as one of its corners.
                }
                this._selection.extendSelection(cellCoords.row, cellCoords.col);
                this.scheduleRedraw();
            }
        } else if (this._isDraggingRowHeaderSelection && this._dragStartRowIndex !== null) {
            const currentRowIndex = this.getRowAtY(y);
            if (currentRowIndex >= 0) {
                const startRow = Math.min(this._dragStartRowIndex, currentRowIndex);
                const endRow = Math.max(this._dragStartRowIndex, currentRowIndex);
                this._selection.selectRowRange(startRow, endRow);
                this.scheduleRedraw();
            }
        } else if (this._isDraggingColumnHeaderSelection && this._dragStartColIndex !== null) {
            const currentColIndex = this.getColumnAtX(x);
            if (currentColIndex >= 0) {
                const startCol = Math.min(this._dragStartColIndex, currentColIndex);
                const endCol = Math.max(this._dragStartColIndex, currentColIndex);
                this._selection.selectColumnRange(startCol, endCol);
                this.scheduleRedraw();
            }
        } else {
            // Update cursor based on position (not dragging or resizing)
            const resizeHandle = this.getResizeHandle(x, y);
            if (resizeHandle) {
                this._canvas.style.cursor = resizeHandle.type === 'column' ? 'col-resize' : 'row-resize';
            } else {
                this._canvas.style.cursor = 'cell';
            }
        }
    }

    /**
     * Handles mouse up events to end resize or drag selection operations
     * @param {MouseEvent} event - Mouse event
     */
    private handleMouseUp(event: MouseEvent): void {
        if (this._resizeState) {
            // console.log(this._resizeState);
            
            if (this._resizeState.type === 'column') {
                const col = this._dataManager.columns[this._resizeState.index];
                this._commandManager.executeCommand(new ResizeCommand(col, this._resizeState.newSize!, this._resizeState.originalSize));
            } else {
                const row = this._dataManager.rows[this._resizeState.index];
                this._commandManager.executeCommand(new ResizeCommand(row, this._resizeState.newSize!, this._resizeState.originalSize));
            }
            this._resizeState = null;
        }

        if (this._isDraggingSelection) {
            this._isDraggingSelection = false;
            this._dragStartCell = null;
            // Optionally, start editing the primary cell of the selection, or simply finalize.
            // For now, let's not automatically start editing after a drag selection.
            // this.startCellEdit(this._selection.activeRange?.startRow!, this._selection.activeRange?.startCol!);
        } else if (this._isDraggingRowHeaderSelection) {
            this._isDraggingRowHeaderSelection = false;
            this._dragStartRowIndex = null;
        } else if (this._isDraggingColumnHeaderSelection) {
            this._isDraggingColumnHeaderSelection = false;
            this._dragStartColIndex = null;
        }

        // General cursor reset if no other state is active
        if (!this._resizeState && !this._isDraggingSelection && !this._isDraggingRowHeaderSelection && !this._isDraggingColumnHeaderSelection) {
            this._canvas.style.cursor = 'cell';
        }
    }

    /**
     * Handles double-click events to start cell editing
     * @param {MouseEvent} event - Mouse event
     */
    private handleDoubleClick(event: MouseEvent): void {
        const rect = this._canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const cellCoords = this.getCellAtPosition(x, y);
        if (cellCoords) {
            this.startCellEdit(cellCoords.row, cellCoords.col);
        }
    }

    /**
     * Handles keyboard events for navigation and shortcuts
     * @param {KeyboardEvent} event - Keyboard event
     */
    private handleKeyDown(event: KeyboardEvent): void {
        const activeRange = this._selection.activeRange;
        if (!activeRange) return;
        
        let handled = false;
        
        switch (event.key) {
            case 'ArrowUp':
                if (activeRange.startRow > 0) {
                    if (event.shiftKey) {
                        this._selection.extendSelection(
                            activeRange.startRow - 1,
                            activeRange.startCol
                        );
                    } else {
                        this._selection.selectCell(activeRange.startRow - 1, activeRange.startCol);
                    }
                    handled = true;
                }
                break;
            
            case 'ArrowDown':
                if (activeRange.startRow < this._dataManager.rowCount - 1) {
                    if (event.shiftKey) {
                        this._selection.extendSelection(
                            activeRange.endRow + 1,
                            activeRange.startCol
                        );
                    } else {
                        this._selection.selectCell(activeRange.startRow + 1, activeRange.startCol);
                    }
                    handled = true;
                }
                break;
            
            case 'ArrowLeft':
                if (activeRange.startCol > 0) {
                    if (event.shiftKey) {
                        this._selection.extendSelection(
                            activeRange.startRow,
                            activeRange.startCol - 1
                        );

                    } else {
                        this._selection.selectCell(activeRange.startRow, activeRange.startCol - 1);
                    }
                    handled = true;
                }
                break;
            
            case 'ArrowRight':
                if (activeRange.startCol < this._dataManager.columnCount - 1) {
                    if (event.shiftKey) {
                        this._selection.extendSelection(
                            activeRange.startRow,
                            activeRange.endCol + 1
                        );
                    } else {
                        this._selection.selectCell(activeRange.startRow, activeRange.startCol + 1);
                    }
                    handled = true;
                }
                break;
            case 'Backspace':
                const cells: Array<{
                    row: number;
                    col: number;
                }>  = this._selection.getSelectedCells();                
                const data = cells.map(cell => ({oldValue: this._dataManager.getCell(cell.row, cell.col)!.value, newValue:  '', ...cell}))
                this._commandManager.executeCommand(
                    new CellEditCommand(
                        this._dataManager,
                        data,
                    )
                )

                this.redraw();
                event.preventDefault();
                break;
            
            case 'Enter':
            case 'F2':
                this.startCellEdit(activeRange.startRow, activeRange.startCol);
                handled = true;
                break;
            
            case 'Delete':
                this.deleteCellContents();
                handled = true;
                break;
            
            case 'Escape':
                if (this._cellInput) {
                    this.cancelCellEdit();
                    handled = true;
                }
                this._selection.clearSelection();
                handled = true;
                break;
        }
        
        if (handled) {
            event.preventDefault();
            this.scheduleRedraw();
        }
    }

    /**
     * Schedules a redraw using requestAnimationFrame for smooth performance
     */
    private scheduleRedraw(): void {
        if (this._animationFrameId) {
            cancelAnimationFrame(this._animationFrameId);
        }
        
        this._animationFrameId = requestAnimationFrame(() =>  {
            this.draw();
            this._animationFrameId = null;
        });
    }

    /**
     * Main drawing method that renders the entire grid
    */
    private draw(): void {
        if (this._isDrawing) return;
        this._isDrawing = true;

        const dpr = window.devicePixelRatio || 1;
        this._canvas.width = this._viewportWidth * dpr;
        this._canvas.height = this._viewportHeight * dpr;

        this._ctx.scale(dpr, dpr);
        
        try {
            this.updateVisibleRange();
            this.clearCanvas();
            this.drawSelection();
            this.drawGrid();
            // this.drawHeaders(); // Called later
            this.drawCells();
            this.drawHeaders(); // Draw headers last to ensure they are on top
            
        } finally {
            this._isDrawing = false;
        }
    }

    /**
     * Updates the visible range cache for virtual scrolling
     */
    private updateVisibleRange(): void {
        const columns = this._dataManager.columns;
        const rows = this._dataManager.rows;

        // const scaledHeaderWidth = this._headerWidth * this._zoomLevel;
        // const scaledHeaderHeight = this._headerHeight * this._zoomLevel;

        // Calculate visible columns
        // We are looking for the first column whose *left* edge is to the right of (scrollX - its own width)
        // and the last column whose *left* edge is to the left of (scrollX + viewportWidth)
        let currentX = 0;
        let startCol = 0;
        for (let i = 0; i < columns.length; i++) {
            if (currentX + columns[i].width * this._zoomLevel >= this._scrollX) {
                startCol = i;
                break;
            }
            currentX += columns[i].width * this._zoomLevel;
            if (i === columns.length -1) startCol = i; // If all are before scrollX
        }
        
        let endCol = startCol;
        currentX = columns.slice(0, startCol).reduce((sum, col) => sum + col.width * this._zoomLevel, 0);
        while (endCol < columns.length && currentX < this._scrollX + this._viewportWidth / this._zoomLevel + 100 * this._zoomLevel) { // Add buffer
            currentX += columns[endCol].width * this._zoomLevel;
            endCol++;
        }
        endCol = Math.min(endCol, columns.length -1);


        // Calculate visible rows
        let currentY = 0;
        let startRow = 0;
        for (let i = 0; i < rows.length; i++) {
            if (currentY + rows[i].height * this._zoomLevel >= this._scrollY) {
                startRow = i;
                break;
            }
            currentY += rows[i].height * this._zoomLevel;
             if (i === rows.length -1) startRow = i;
        }

        let endRow = startRow;
        currentY = rows.slice(0, startRow).reduce((sum, row) => sum + row.height * this._zoomLevel, 0);
        while (endRow < rows.length && currentY < this._scrollY + this._viewportHeight / this._zoomLevel + 100 * this._zoomLevel) { // Add buffer
            currentY += rows[endRow].height * this._zoomLevel;
            endRow++;
        }
        endRow = Math.min(endRow, rows.length -1);
        
        this._visibleRange = {
            startRow: Math.max(0, startRow),
            endRow: Math.min(this._dataManager.rowCount -1, endRow),
            startCol: Math.max(0, startCol),
            endCol: Math.min(this._dataManager.columnCount -1, endCol)
        };
    }

    /**
     * Clears the entire canvas
     */
    private clearCanvas(): void {
        // Clear with respect to the scaled viewport if dpr is used
        const dpr = window.devicePixelRatio || 1;
        this._ctx.clearRect(0, 0, this._canvas.width / dpr, this._canvas.height / dpr);
    }

    /**
     * Draws the grid lines
     */
    private drawGrid(): void {

        let dpr = window.devicePixelRatio || 1;

        let isScreenZoomed = false;
        if (dpr > 1) {
            this._ctx.scale(dpr, dpr);
            isScreenZoomed = true;
        }
        
        const { startRow, endRow, startCol, endCol } = this._visibleRange;
        const columns = this._dataManager.columns;
        const rows = this._dataManager.rows;

        const scaledHeaderWidth = this._headerWidth * this._zoomLevel;
        const scaledHeaderHeight = this._headerHeight * this._zoomLevel;
        
        // this._ctx.strokeStyle = '#000000';
        this._ctx.strokeStyle = '#D0D7DE'; // Excel cell border color
        this._ctx.beginPath();

        const lineWidth = 1 / this._zoomLevel * dpr;

        this._ctx.lineWidth = lineWidth;
        const offset =  0.5;
        
        // Calculate starting X position for drawing (on-screen coordinate)
        let currentDrawX = scaledHeaderWidth - this._scrollX +
            columns.slice(0, startCol).reduce((sum, col) => sum + col.width * this._zoomLevel, 0);
        
        for (let c = startCol; c <= endCol && c < columns.length; c++) {
            const xPos = Math.round(currentDrawX) + offset;
            this._ctx.moveTo(xPos, 0);
            this._ctx.lineTo(xPos, this._viewportHeight);
            currentDrawX += columns[c].width * this._zoomLevel;
        }
        // Last vertical line if endCol is last column
        if(endCol === columns.length -1 && currentDrawX <= this._viewportWidth) { // Ensure it's within viewport
             const xPos = Math.round(currentDrawX) + offset;
             this._ctx.moveTo(xPos, 0);
             this._ctx.lineTo(xPos, this._viewportHeight);
        }


        // Calculate starting Y position for drawing (on-screen coordinate)
        let currentDrawY = scaledHeaderHeight - this._scrollY +
            rows.slice(0, startRow).reduce((sum, row) => sum + row.height * this._zoomLevel, 0);

        for (let r = startRow; r <= endRow && r < rows.length; r++) {
            const yPos = Math.round(currentDrawY) + offset;
            this._ctx.moveTo(0, yPos);
            this._ctx.lineTo(this._viewportWidth, yPos);
            currentDrawY += rows[r].height * this._zoomLevel;
        }
         // Last horizontal line if endRow is last row
        if(endRow === rows.length -1 && currentDrawY <= this._viewportHeight) { // Ensure it's within viewport
            const yPos = Math.round(currentDrawY) + offset;
            this._ctx.moveTo(0, yPos);
            this._ctx.lineTo(this._viewportWidth, yPos);
        }
        
        this._ctx.stroke();
    }

    /**
     * Draws column and row headers
     */
    private drawHeaders(): void {

        const dpr = window.devicePixelRatio || 1;
        let isScreenZoomed = false;
        if (dpr > 1) {
            this._ctx.scale(dpr, dpr);
            isScreenZoomed = true;
        }

        const { startCol, endCol, startRow, endRow } = this._visibleRange;
        const columns = this._dataManager.columns;
        const rows = this._dataManager.rows;

        const scaledHeaderHeight = this._headerHeight * this._zoomLevel;
        const scaledHeaderWidth = this._headerWidth * this._zoomLevel;
        
        // Excel header background color
        this._ctx.fillStyle = '#F2F2F2';
        this._ctx.fillRect(0, 0, this._viewportWidth, scaledHeaderHeight);
        this._ctx.fillRect(0, 0, scaledHeaderWidth, this._viewportHeight);
        
        // Excel header text color
        this._ctx.fillStyle = '#5E5E5E';
        this._ctx.font = `${Math.round(12 * this._zoomLevel)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        this._ctx.textAlign = 'right';
        this._ctx.textBaseline = 'middle';
        // Excel cell border color for header grid lines
        this._ctx.strokeStyle = '#D0D7DE';
        this._ctx.lineWidth = Math.max(0.5, 1 / this._zoomLevel);


        let currentDrawX = scaledHeaderWidth - this._scrollX +
            columns.slice(0, startCol).reduce((sum, col) => sum + col.width * this._zoomLevel, 0);
        for (let c = startCol; c <= endCol && c < columns.length; c++) {
            const colDef = columns[c];
            const width = colDef.width * this._zoomLevel;
            const label = colDef.getLabel();
            
            if (currentDrawX + width < 0 || currentDrawX > this._viewportWidth) {
                continue;
            }

            if (this._selection.getSelectedCells().length > 0) {
                this._selection.getSelectedCells().forEach((cell) => {
                    if (cell.col === c) {
                        this._ctx.textAlign = 'right';
                        this._ctx.fillStyle = '#caead8';
                        this._ctx.fillRect(Math.round(currentDrawX), 0, Math.round(width), Math.round(scaledHeaderHeight));
                        this._ctx.fillStyle = '#107c41';
                        this._ctx.fillRect(Math.round(currentDrawX), scaledHeaderHeight, Math.round(width), Math.round(2));
                        this._ctx.fillStyle = '#5E5E5E';
                    }
                });
            }

            if (this._selection.isColumnSelected(c)) {
                this._ctx.textAlign = 'right';
                // Excel selected header background color
                this._ctx.fillStyle = '#107c41';
                this._ctx.fillRect(Math.round(currentDrawX - 1), 0, Math.round(width + 2), Math.round(scaledHeaderHeight));
                // Reset to Excel header text color
                this._ctx.fillStyle = '#5E5E5E';
            }
            
            this._ctx.strokeRect(Math.round(currentDrawX), 0, Math.round(width), Math.round(scaledHeaderHeight));
            if (width > 10 * this._zoomLevel) { // Only draw text if there's enough space
                 this._ctx.fillText(label, Math.round(currentDrawX + width / 2), Math.round(scaledHeaderHeight / 2));
                 if (this._selection.isColumnSelected(c)) {
                    this._ctx.textAlign = 'right';
                    this._ctx.fillStyle = '#ffffff';
                    this._ctx.fillText(label, Math.round(currentDrawX + width / 2), Math.round(scaledHeaderHeight / 2));
                    this._ctx.fillStyle = '#5E5E5E';
                 }
            }
            currentDrawX += width;
        }
        
        let currentDrawY = scaledHeaderHeight - this._scrollY +
            rows.slice(0, startRow).reduce((sum, row) => sum + row.height * this._zoomLevel, 0);
        for (let r = startRow; r <= endRow && r < rows.length; r++) {
            const rowDef = rows[r];
            const height = rowDef.height * this._zoomLevel;
            const label = rowDef.getLabel();

            if (currentDrawY + height < 0 || currentDrawY > this._viewportHeight) {
                currentDrawY += height;
                continue;
            }

            if (this._selection.getSelectedCells().length > 0) {
                this._selection.getSelectedCells().forEach((cell) => {
                    if (cell.row === r) {
                        this._ctx.textAlign = 'right';
                        this._ctx.fillStyle = '#caead8';
                        this._ctx.fillRect(0, Math.round(currentDrawY), Math.round(scaledHeaderWidth), Math.round(height));
                        this._ctx.fillStyle = '#107c41';
                        this._ctx.fillRect(scaledHeaderWidth, Math.round(currentDrawY), Math.round(2), Math.round(height));
                        this._ctx.fillStyle = '#5E5E5E';
                    }
                });
            }
            
            if (this._selection.isRowSelected(r)) {
                // Excel selected header background color
                this._ctx.textAlign = 'right';
                this._ctx.fillStyle = '#107c41';
                this._ctx.fillRect(0, Math.round(currentDrawY), Math.round(scaledHeaderWidth), Math.round(height));
                // Reset to Excel header text color
                this._ctx.fillStyle = '#5E5E5E';
            }
            
            this._ctx.strokeRect(0, Math.round(currentDrawY), Math.round(scaledHeaderWidth), Math.round(height));
            if (height > 10 * this._zoomLevel) { // Only draw text if there's enough space
                this._ctx.font = '14px sans-serif';
                this._ctx.fillText(label, Math.round(scaledHeaderWidth - 5), Math.round(currentDrawY + height / 2));
                if (this._selection.isRowSelected(r)) {
                    this._ctx.textAlign = 'right';
                    this._ctx.fillStyle = '#ffffff';
                    this._ctx.fillText(label, Math.round(scaledHeaderWidth - 5), Math.round(currentDrawY + height / 2));
                    this._ctx.fillStyle = '#5E5E5E';
                }
            }
            currentDrawY += height;
        }
        
        // Excel header background color for the top-left corner box
        this._ctx.fillStyle = '#F2F2F2';
        this._ctx.fillRect(0,0, Math.round(scaledHeaderWidth), Math.round(scaledHeaderHeight));
        this._ctx.strokeRect(0, 0, Math.round(scaledHeaderWidth), Math.round(scaledHeaderHeight));
        this._ctx.lineWidth = 1; // Reset
    }

    /**
     * Draws cell contents
     */
    private drawCells(): void {
        const { startRow, endRow, startCol, endCol } = this._visibleRange;
        const columns = this._dataManager.columns;
        const rows = this._dataManager.rows;

        const scaledHeaderWidth = this._headerWidth * this._zoomLevel;
        const scaledHeaderHeight = this._headerHeight * this._zoomLevel;
        
        // Default font settings
        const defaultFontSize = 14;
        const defaultFontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const defaultHAlign = 'left';
        const defaultVAlign = 'middle';
        const cellPadding = 4; // Padding inside cells for text

        // Excel cell text color
        this._ctx.fillStyle = '#000000';
        this._ctx.font = `${Math.round(14 * this._zoomLevel)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        this._ctx.textBaseline = 'middle';
        this._ctx.textAlign = 'left';

        let currentDrawY = scaledHeaderHeight - this._scrollY +
            rows.slice(0, startRow).reduce((sum, r) => sum + r.height * this._zoomLevel, 0);

        for (let r = startRow; r <= endRow && r < rows.length; r++) {
            const rowDef = rows[r];
            const rowHeight = rowDef.height * this._zoomLevel;

            if (currentDrawY + rowHeight < 0 || currentDrawY > this._viewportHeight) {
                currentDrawY += rowHeight;
                continue;
            }

            let currentDrawX = scaledHeaderWidth - this._scrollX +
                columns.slice(0, startCol).reduce((sum, c) => sum + c.width * this._zoomLevel, 0);
            
            for (let c = startCol; c <= endCol && c < columns.length; c++) {
                const colDef = columns[c];
                const colWidth = colDef.width * this._zoomLevel;

                if (currentDrawX + colWidth < 0 || currentDrawX > this._viewportWidth) {
                    currentDrawX += colWidth;
                    continue;
                }
                const cell = this._dataManager.getCell(r, c)!;
                const value = this._dataManager.getCellValue(r, c);
                
                if (value) {
                    const fontSize = cell.fontSize;
                    this._ctx.font = `${fontSize}px ${defaultFontFamily}`;

                    // Clip text to cell boundaries
                    // const fontSize = cell?.fontSize ?? defaultFontSize;
                    const hAlign = cell.horizontalAlignment;
                    const vAlign = cell.verticalAlignment;

                    const isBold = cell.bold;
                    
                    this._ctx.font = `${isBold ? cell.italic ? 'bold italic' : 'bold' : cell.italic ? 'italic' : 'normal'} ${fontSize}px ${defaultFontFamily}`;
                    // console.log(`${isBold ? 'bold' : cell.italic ? 'italic' : 'normal'} ${fontSize}px ${defaultFontFamily}`);
                    // console.log(this._dataManager.getAllCells());
                    
                    // Clip text to cell boundaries
                    this._ctx.save();
                    this._ctx.beginPath();
                    // Use cellPadding for clipping rect
                    this._ctx.rect(currentDrawX + cellPadding / 2, currentDrawY + cellPadding / 2, colWidth - cellPadding, rowHeight - cellPadding);
                    this._ctx.clip();
                    
                    // Apply horizontal alignment
                    this._ctx.textAlign = hAlign;
                    let textX = 0;
                    if (hAlign === 'left') {
                        textX = currentDrawX + cellPadding;
                    } else if (hAlign === 'center') {
                        textX = currentDrawX + colWidth / 2;
                    } else { // right
                        textX = currentDrawX + colWidth - cellPadding;
                    }

                    let textY = currentDrawY + rowHeight / 2;

                    this._ctx.fillText(value, textX, textY);
                    this._ctx.restore();
                }
                
                currentDrawX += colWidth;
            }
            currentDrawY += rowHeight;
        }
    }

    /**
     * Draws selection highlights
     */
    private drawSelection(): void {
        const dpr = window.devicePixelRatio || 1;
        if (!this._selection.hasSelection()) return;
        
        const { startRow, endRow, startCol, endCol } = this._visibleRange;
        const columns = this._dataManager.columns;
        const rows = this._dataManager.rows;

        const scaledHeaderWidth = this._headerWidth * this._zoomLevel;
        const scaledHeaderHeight = this._headerHeight * this._zoomLevel;

        // Excel selected cell border color
        this._ctx.strokeStyle = '#107c41';
        // this._ctx.strokeStyle = '#000000';
        // this._ctx.lineWidth = Math.max(1, 2 * this._zoomLevel); // Keep line width logic
        // Excel range selection background color
        this._ctx.fillStyle = 'rgb(233, 242, 237)';


        this._ctx.lineWidth = 2 / this._zoomLevel * dpr;
        const offset = 0.5;

        const selectedCells = this._selection.getSelectedCells();

        if (selectedCells.length === 0) return;

        let minRow = Infinity, maxRow = -Infinity, minCol = Infinity, maxCol = -Infinity;
        for (const { row, col } of selectedCells) {
            minRow = Math.min(minRow, row);
            maxRow = Math.max(maxRow, row);
            minCol = Math.min(minCol, col);
            maxCol = Math.max(maxCol, col);
        }

        // Clamp within visible range
        minRow = Math.max(minRow, startRow);
        maxRow = Math.min(maxRow, endRow);
        minCol = Math.max(minCol, startCol);
        maxCol = Math.min(maxCol, endCol);

        // Calculate top-left corner
        let x = scaledHeaderWidth - this._scrollX +
            columns.slice(0, minCol).reduce((sum, c) => sum + c.width * this._zoomLevel, 0);
        let y = scaledHeaderHeight - this._scrollY +
            rows.slice(0, minRow).reduce((sum, r) => sum + r.height * this._zoomLevel, 0);

        // Calculate total width and height
        let width = columns.slice(minCol, maxCol + 1).reduce((sum, c) => sum + c.width * this._zoomLevel, 0);
        let height = rows.slice(minRow, maxRow + 1).reduce((sum, r) => sum + r.height * this._zoomLevel, 0);

        // Draw filled background
        this._ctx.fillRect(Math.round(x + offset), Math.round(y + offset), Math.round(width - 2 * offset), Math.round(height - 2 * offset));
        // Draw single outer border
        this._ctx.strokeRect(Math.round(x + offset), Math.round(y + offset), Math.round(width - 2 * offset), Math.round(height - 2 * offset));

        this._ctx.lineWidth = 1; // Reset

        // for (let r = startRow; r <= endRow && r < rows.length; r++) {
        //     const rowDef = rows[r];
        //     const rowHeight = rowDef.height * this._zoomLevel;

        //     if (currentDrawY + rowHeight < 0 || currentDrawY > this._viewportHeight) {
        //         currentDrawY += rowHeight;
        //         continue;
        //     }
            
        //     let currentDrawX = scaledHeaderWidth - this._scrollX +
        //         columns.slice(0, startCol).reduce((sum, c) => sum + c.width * this._zoomLevel, 0);

        //     for (let c = startCol; c <= endCol && c < columns.length; c++) {
        //         const colDef = columns[c];
        //         const colWidth = colDef.width * this._zoomLevel;

        //         if (currentDrawX + colWidth < 0 || currentDrawX > this._viewportWidth) {
        //             currentDrawX += colWidth;
        //             continue;
        //         }
                
        //         if (this._selection.isSelected(r, c)) {
        //             this._ctx.fillRect(Math.round(currentDrawX), Math.round(currentDrawY), Math.round(colWidth), Math.round(rowHeight));
        //             this._ctx.strokeRect(Math.round(currentDrawX), Math.round(currentDrawY), Math.round(colWidth), Math.round(rowHeight));
        //         }
        //         currentDrawX += colWidth;
        //     }
        //     currentDrawY += rowHeight;
        // }
        // this._ctx.lineWidth = 1; // Reset
    }

    /**
     * Gets cell coordinates at a specific canvas position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {object | null} Cell coordinates or null if outside grid
     */
    private getCellAtPosition(viewX: number, viewY: number): { row: number, col: number } | null {
        // viewX, viewY are coordinates relative to the canvas element (scaled by DPR but not by app zoom)
        const logicalX = this._scrollX + viewX / this._zoomLevel;
        const logicalY = this._scrollY + viewY / this._zoomLevel;

        const scaledHeaderWidth = this._headerWidth; // Logical header width is unscaled
        const scaledHeaderHeight = this._headerHeight; // Logical header height is unscaled

        if (logicalX < scaledHeaderWidth || logicalY < scaledHeaderHeight) {
            return null;
        }
        
        const col = this.getColumnAtX(logicalX);
        const row = this.getRowAtY(logicalY);
        
        return (row >= 0 && col >= 0) ? { row, col } : null;
    }

    /**
     * Gets column index at a specific logical X coordinate
     * @param {number} logicalX - Logical X coordinate (scrolled and unzoomed)
     * @returns {number} Column index or -1 if not found
     */
    private getColumnAtX(logicalX: number): number {
        const columns = this._dataManager.columns;
        let currentX = this._headerWidth; // Start after row header (logical)
        
        for (let col = 0; col < columns.length; col++) {
            const width = columns[col].width; // Unscaled width
            if (logicalX >= currentX && logicalX < currentX + width) {
                return col;
            }
            currentX += width;
        }
        return -1;
    }

    /**
     * Gets row index at a specific logical Y coordinate
     * @param {number} logicalY - Logical Y coordinate (scrolled and unzoomed)
     * @returns {number} Row index or -1 if not found
     */
    private getRowAtY(logicalY: number): number {
        const rows = this._dataManager.rows;
        let currentY = this._headerHeight; // Start after column header (logical)

        for (let row = 0; row < rows.length; row++) {
            const height = rows[row].height; // Unscaled height
            if (logicalY >= currentY && logicalY < currentY + height) {
                return row;
            }
            currentY += height;
        }
        return -1;
    }

    /**
     * Checks if a position is near a resize handle
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {object | null} Resize handle info or null
     */
    private getResizeHandle(viewX: number, viewY: number): { type: 'column' | 'row', index: number } | null {
        const tolerance = 10 / this._zoomLevel;

        const scaledHeaderHeight = this._headerHeight * this._zoomLevel;
        const scaledHeaderWidth = this._headerWidth * this._zoomLevel;

        // Check column resize handles (top header area)
        if (viewY <= scaledHeaderHeight) {
            const columns = this._dataManager.columns;
            let currentDrawX = scaledHeaderWidth - this._scrollX; // Drawing X of the first column header's left edge
            
            for (let c = 0; c < columns.length; c++) {
                const colWidthScaled = columns[c].width * this._zoomLevel;
                const colRightEdgeDrawX = currentDrawX + colWidthScaled;
                if (Math.abs(viewX - colRightEdgeDrawX) <= tolerance * this._zoomLevel) { // Compare viewX with scaled edge
                     if (currentDrawX < this._viewportWidth && colRightEdgeDrawX > 0) { // Only if handle is visible
                        return { type: 'column', index: c };
                    }
                }
                if (colRightEdgeDrawX > this._viewportWidth + tolerance * this._zoomLevel) break;
                currentDrawX = colRightEdgeDrawX;
            }
        }
        
        // Check row resize handles (left header area)
        if (viewX <= scaledHeaderWidth) {
            const rows = this._dataManager.rows;
            let currentDrawY = scaledHeaderHeight - this._scrollY; // Drawing Y of the first row header's top edge

            for (let r = 0; r < rows.length; r++) {
                const rowHeightScaled = rows[r].height * this._zoomLevel;
                const rowBottomEdgeDrawY = currentDrawY + rowHeightScaled;
                 if (Math.abs(viewY - rowBottomEdgeDrawY) <= tolerance * this._zoomLevel) { // Compare viewY with scaled edge
                    if (currentDrawY < this._viewportHeight && rowBottomEdgeDrawY > 0) { // Only if handle is visible
                        return { type: 'row', index: r };
                    }
                }
                if (rowBottomEdgeDrawY > this._viewportHeight + tolerance * this._zoomLevel) break; // Optimization
                currentDrawY = rowBottomEdgeDrawY;
            }
        }
        
        return null;
    }

    /**
     * Starts editing a cell
     * @param {number} row - Row index
     * @param {number} col - Column index
     */
    private startCellEdit(row: number, col: number): void {
        if (this._cellInput) {
            this.commitCellEdit();
        }
    
        const cellRect = this.getCellRect(row, col);
        if (!cellRect || cellRect.width <= 0 || cellRect.height <= 0) return;
    
        const textarea = document.createElement('textarea');
        textarea.className = 'cell-input';
        textarea.value = this._dataManager.getCellValue(row, col);
    
        const canvasRect = this._canvas.getBoundingClientRect();
    
        textarea.style.position = 'absolute';
        textarea.style.left = (canvasRect.left + cellRect.x) + 'px';
        textarea.style.top = (canvasRect.top + cellRect.y) + 'px';
        textarea.style.border = '2px solid #429468';
        textarea.style.width = cellRect.width + 'px';
        textarea.style.height = cellRect.height + 'px';
        textarea.style.fontSize = `${14 * this._zoomLevel}px`;
        textarea.style.zIndex = '1';
    
        // These styles enable line wrapping and prevent overflow
        textarea.style.resize = 'none'; // Optional: disable manual resizing
        textarea.style.overflow = 'auto';
        textarea.style.whiteSpace = 'pre-wrap'; // allows wrapping
        textarea.style.wordBreak = 'break-word'; // break long words
        textarea.style.padding = '2px';
        textarea.style.boxSizing = 'border-box';
    
        textarea.dataset.row = row.toString();
        textarea.dataset.col = col.toString();
    
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
    
        // Replace old input reference
        this._cellInput = textarea as HTMLTextAreaElement;
    
        textarea.addEventListener('blur', () => this.commitCellEdit());
    
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.commitCellEdit();
            } else if (e.key === 'Escape'
                //  || e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'ArrowRight'
            ) {
                this.cancelCellEdit();
            }
        });
    }
    

    /**
     * Commits the current cell edit
     */
    private commitCellEdit(): void {
        if (this._cellInput === null) return;

        const input = this._cellInput;
        this._cellInput = null;
        
        const row = parseInt(input.dataset.row!);
        const col = parseInt(input.dataset.col!);
        const value = input.value;
        
        // this._dataManager.setCellValue(row, col, value);
        this._commandManager.executeCommand(
            new CellEditCommand(
                this._dataManager, [{oldValue: this._dataManager.getCellValue(row, col), newValue: value, row, col}]
            )
        )

        input.remove();

        this.scheduleRedraw();
        this._canvas.focus();
    }

    /**
     * Cancels the current cell edit
     */
    private cancelCellEdit(): void {
        if (this._cellInput === null) return;
        
        this._cellInput.remove();
        this._cellInput = null;
        
        this._canvas.focus();
    }

    /**
     * Updates cell input position during scrolling
     */
    private updateCellInputPosition(): void {
        if (!this._cellInput) return;
    
        const row = parseInt(this._cellInput.dataset.row!);
        const col = parseInt(this._cellInput.dataset.col!);
    
        const cellRect = this.getCellRect(row, col); // cellRect is in view coordinates relative to canvas origin
        if (cellRect) {
            const canvasRect = this._canvas.getBoundingClientRect(); // Get current canvas position
    
            this._cellInput.style.left = (canvasRect.left + cellRect.x) + 'px';
            this._cellInput.style.top = (canvasRect.top + cellRect.y) + 'px';
            this._cellInput.style.width = cellRect.width + 'px';
            this._cellInput.style.height = cellRect.height + 'px';
            this._cellInput.style.fontSize = `${14 * this._zoomLevel}px`; // Update font size
        } else {
            // Cell is not visible or invalid, hide/remove editor
            if (this._cellInput) { // Check again because it might be cleared by another event
                this.cancelCellEdit();
            }
        }
    }

    /**
     * Gets the rectangle for a specific cell in *view coordinates* (scaled and scrolled).
     * Used for positioning the cell editor.
     * @param {number} row - Row index
     * @param {number} col - Column index
     * @returns {object | null} Cell rectangle (x, y, width, height in view pixels) or null if not valid
     */
    private getCellRect(row: number, col: number): { x: number, y: number, width: number, height: number } | null {
        const columns = this._dataManager.columns;
        const rows = this._dataManager.rows;

        if (row < 0 || row >= rows.length || col < 0 || col >= columns.length) {
            return null;
        }

        const cellWidthScaled = columns[col].width * this._zoomLevel;
        const cellHeightScaled = rows[row].height * this._zoomLevel;

        let logicalCellLeft = this._headerWidth;
        for (let i = 0; i < col; i++) {
            logicalCellLeft += columns[i].width;
        }

        let logicalCellTop = this._headerHeight;
        for (let i = 0; i < row; i++) {
            logicalCellTop += rows[i].height;
        }

        // Calculate viewX, viewY: the cell's top-left corner position on the canvas,
        // considering scroll and zoom.
        // (logicalPositionOfCell - logicalScrollOffset) * zoomLevel
        const viewX = (logicalCellLeft - this._scrollX) * this._zoomLevel;
        const viewY = (logicalCellTop - this._scrollY) * this._zoomLevel;
        
        return {
            x: viewX,
            y: viewY,
            width: cellWidthScaled,
            height: cellHeightScaled
        };
    }

    /**
     * Deletes contents of selected cells
     */
    private deleteCellContents(): void {
        const selectedCells = this._selection.getSelectedCells(1000);
        
        for (const { row, col } of selectedCells) {
            this._dataManager.setCellValue(row, col, '');
        }
        
        this.scheduleRedraw();
    }

    /**
     * Forces a redraw of the canvas
     */
    redraw(): void {
        this.setupVirtualScrolling();
        this.scheduleRedraw();
    }

    resetZoom(): void {
        this.setZoom(1);
    }

    /**
     * Destroys the canvas and cleans up resources
     */
    destroy(): void {
        if (this._animationFrameId) {
            cancelAnimationFrame(this._animationFrameId);
        }
        
        if (this._cellInput) {
            this._cellInput.remove();
        }
        
        this._canvas.remove();
    }
}