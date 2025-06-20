import type DataManager from './DataManager';
import type Selection from './Selection';
import type Column from './Column';
import type Row from './Row';

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
    private _cellInput: HTMLInputElement | null = null;
    
    /** @type {object | null} Current resize operation state */
    private _resizeState: {
        type: 'column' | 'row';
        index: number;
        startX: number;
        startY: number;
        originalSize: number;
    } | null = null;

    /**
     * Initializes a new Canvas instance
     * @param {HTMLElement} container - Container element for the canvas
     * @param {DataManager} dataManager - Data manager instance
     * @param {Selection} selection - Selection manager instance
     */
    constructor(container: HTMLElement, dataManager: DataManager, selection: Selection) {
        this._dataManager = dataManager;
        this._selection = selection;
        
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
        this._canvas.style.zIndex = '1';
    }

    /**
     * Updates canvas size to match container
     */
    private updateCanvasSize(): void {
        const rect = this._wrapper.getBoundingClientRect();
        this._viewportWidth = rect.width;
        this._viewportHeight = rect.height;
        
        // Set canvas dimensions to match the wrapper exactly
        this._canvas.width = this._viewportWidth;
        this._canvas.height = this._viewportHeight;
        
        // Position canvas to overlay the wrapper exactly
        this._canvas.style.width = this._viewportWidth + 'px';
        this._canvas.style.height = this._viewportHeight + 'px';
        this._canvas.style.left = rect.left + 'px';
        this._canvas.style.top = rect.top + 'px';
        
        // Apply high DPI scaling if needed
        const dpr = window.devicePixelRatio || 1;
        if (dpr > 1) {
            this._canvas.width = this._viewportWidth * dpr;
            this._canvas.height = this._viewportHeight * dpr;
            this._ctx.scale(dpr, dpr);
        }
    }

    /**
     * Sets up virtual scrolling for large datasets
     */
    private setupVirtualScrolling(): void {
        // Calculate total content size
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
            // Forward wheel events to the wrapper for scrolling
            this._wrapper.scrollLeft += e.deltaX;
            this._wrapper.scrollTop += e.deltaY;
        });
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
            if (event.ctrlKey || event.metaKey) {
                // Multi-select mode
                this._selection.multiSelect = true;
                this._selection.selectCell(cellCoords.row, cellCoords.col, true);
            } else if (event.shiftKey && this._selection.activeRange) {
                // Range selection
                const activeRange = this._selection.activeRange;
                this._selection.selectRange(
                    activeRange.startRow, 
                    activeRange.startCol,
                    cellCoords.row, 
                    cellCoords.col
                );
            } else {
                // Single cell selection
                this._selection.selectCell(cellCoords.row, cellCoords.col);
            }
            
            this.scheduleRedraw();
        }
        
        // Handle header clicks for column/row selection
        if (x < this._headerWidth && y >= this._headerHeight) {
            // Row header clicked
            const rowIndex = this.getRowAtY(y);
            if (rowIndex >= 0) {
                this._selection.selectRow(rowIndex);
                this.scheduleRedraw();
            }
        } else if (y < this._headerHeight && x >= this._headerWidth) {
            // Column header clicked
            const colIndex = this.getColumnAtX(x);
            if (colIndex >= 0) {
                this._selection.selectColumn(colIndex);
                this.scheduleRedraw();
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
                ? x - this._resizeState.startX 
                : y - this._resizeState.startY;
            
            const newSize = Math.max(20, this._resizeState.originalSize + delta);
            
            if (this._resizeState.type === 'column') {
                this._dataManager.columns[this._resizeState.index].width = newSize;
            } else {
                this._dataManager.rows[this._resizeState.index].height = newSize;
            }
            
            this.setupVirtualScrolling();
            this.scheduleRedraw();
        } else {
            // Update cursor based on position
            const resizeHandle = this.getResizeHandle(x, y);
            if (resizeHandle) {
                this._canvas.style.cursor = resizeHandle.type === 'column' ? 'col-resize' : 'row-resize';
            } else {
                this._canvas.style.cursor = 'cell';
            }
        }
    }

    /**
     * Handles mouse up events to end resize operations
     * @param {MouseEvent} event - Mouse event
     */
    private handleMouseUp(event: MouseEvent): void {
        if (this._resizeState) {
            this._resizeState = null;
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
                    this._selection.selectCell(activeRange.startRow - 1, activeRange.startCol);
                    handled = true;
                }
                break;
            
            case 'ArrowDown':
                if (activeRange.startRow < this._dataManager.rowCount - 1) {
                    this._selection.selectCell(activeRange.startRow + 1, activeRange.startCol);
                    handled = true;
                }
                break;
            
            case 'ArrowLeft':
                if (activeRange.startCol > 0) {
                    this._selection.selectCell(activeRange.startRow, activeRange.startCol - 1);
                    handled = true;
                }
                break;
            
            case 'ArrowRight':
                if (activeRange.startCol < this._dataManager.columnCount - 1) {
                    this._selection.selectCell(activeRange.startRow, activeRange.startCol + 1);
                    handled = true;
                }
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
        
        try {
            this.updateVisibleRange();
            this.clearCanvas();
            this.drawGrid();
            this.drawHeaders();
            this.drawCells();
            this.drawSelection();
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
        
        // Calculate visible columns
        let x = this._headerWidth;
        let startCol = 0;
        
        while (startCol < columns.length && x + columns[startCol].width < this._scrollX) {
            x += columns[startCol].width;
            startCol++;
        }
        
        let endCol = startCol;
        let totalWidth = x;
        while (endCol < columns.length && totalWidth < this._scrollX + this._viewportWidth + 100) {
            totalWidth += columns[endCol].width;
            endCol++;
        }
        
        // Calculate visible rows
        let y = this._headerHeight;
        let startRow = 0;
        
        while (startRow < rows.length && y + rows[startRow].height < this._scrollY) {
            y += rows[startRow].height;
            startRow++;
        }
        
        let endRow = startRow;
        let totalHeight = y;
        while (endRow < rows.length && totalHeight < this._scrollY + this._viewportHeight + 100) {
            totalHeight += rows[endRow].height;
            endRow++;
        }
        
        this._visibleRange = { startRow, endRow, startCol, endCol };
    }

    /**
     * Clears the entire canvas
     */
    private clearCanvas(): void {
        this._ctx.clearRect(0, 0, this._viewportWidth, this._viewportHeight);
    }

    /**
     * Draws the grid lines
     */
    private drawGrid(): void {
        const { startRow, endRow, startCol, endCol } = this._visibleRange;
        const columns = this._dataManager.columns;
        const rows = this._dataManager.rows;
        
        this._ctx.strokeStyle = '#e0e0e0';
        this._ctx.lineWidth = 1;
        this._ctx.beginPath();
        
        // Calculate starting positions
        const startX = this._headerWidth + 
            columns.slice(0, startCol).reduce((sum, col) => sum + col.width, 0) - this._scrollX;
        const startY = this._headerHeight + 
            rows.slice(0, startRow).reduce((sum, row) => sum + row.height, 0) - this._scrollY;
        
        // Draw vertical lines
        let x = startX;
        for (let col = startCol; col <= endCol && col <= columns.length; col++) {
            this._ctx.moveTo(x, 0);
            this._ctx.lineTo(x, this._viewportHeight);
            if (col < columns.length) {
                x += columns[col].width;
            }
        }
        
        // Draw horizontal lines
        let y = startY;
        for (let row = startRow; row <= endRow && row <= rows.length; row++) {
            this._ctx.moveTo(0, y);
            this._ctx.lineTo(this._viewportWidth, y);
            if (row < rows.length) {
                y += rows[row].height;
            }
        }
        
        this._ctx.stroke();
    }

    /**
     * Draws column and row headers
     */
    private drawHeaders(): void {
        const { startCol, endCol, startRow, endRow } = this._visibleRange;
        const columns = this._dataManager.columns;
        const rows = this._dataManager.rows;
        
        // Header background
        this._ctx.fillStyle = '#f8f9fa';
        this._ctx.fillRect(0, 0, this._viewportWidth, this._headerHeight);
        this._ctx.fillRect(0, 0, this._headerWidth, this._viewportHeight);
        
        // Header text style
        this._ctx.fillStyle = '#495057';
        this._ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        this._ctx.textAlign = 'center';
        this._ctx.textBaseline = 'middle';
        
        // Draw column headers
        const startX = this._headerWidth + 
            columns.slice(0, startCol).reduce((sum, col) => sum + col.width, 0) - this._scrollX;
        
        let x = startX;
        for (let col = startCol; col < endCol && col < columns.length; col++) {
            const width = columns[col].width;
            const label = columns[col].getLabel();
            
            // Highlight if column is selected
            if (this._selection.isColumnSelected(col)) {
                this._ctx.fillStyle = '#e3f2fd';
                this._ctx.fillRect(x, 0, width, this._headerHeight);
                this._ctx.fillStyle = '#495057';
            }
            
            this._ctx.strokeStyle = '#dee2e6';
            this._ctx.strokeRect(x, 0, width, this._headerHeight);
            this._ctx.fillText(label, x + width / 2, this._headerHeight / 2);
            
            x += width;
        }
        
        // Draw row headers
        const startY = this._headerHeight + 
            rows.slice(0, startRow).reduce((sum, row) => sum + row.height, 0) - this._scrollY;
        
        let y = startY;
        for (let row = startRow; row < endRow && row < rows.length; row++) {
            const height = rows[row].height;
            const label = rows[row].getLabel();
            
            // Highlight if row is selected
            if (this._selection.isRowSelected(row)) {
                this._ctx.fillStyle = '#fff3e0';
                this._ctx.fillRect(0, y, this._headerWidth, height);
                this._ctx.fillStyle = '#495057';
            }
            
            this._ctx.strokeStyle = '#dee2e6';
            this._ctx.strokeRect(0, y, this._headerWidth, height);
            this._ctx.fillText(label, this._headerWidth / 2, y + height / 2);
            
            y += height;
        }
        
        // Corner cell
        this._ctx.strokeStyle = '#dee2e6';
        this._ctx.strokeRect(0, 0, this._headerWidth, this._headerHeight);
    }

    /**
     * Draws cell contents
     */
    private drawCells(): void {
        const { startRow, endRow, startCol, endCol } = this._visibleRange;
        const columns = this._dataManager.columns;
        const rows = this._dataManager.rows;
        
        const startX = this._headerWidth + 
            columns.slice(0, startCol).reduce((sum, col) => sum + col.width, 0) - this._scrollX;
        const startY = this._headerHeight + 
            rows.slice(0, startRow).reduce((sum, row) => sum + row.height, 0) - this._scrollY;
        
        this._ctx.fillStyle = '#212529';
        this._ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        this._ctx.textBaseline = 'middle';
        
        let y = startY;
        for (let row = startRow; row < endRow && row < rows.length; row++) {
            let x = startX;
            const rowHeight = rows[row].height;
            
            for (let col = startCol; col < endCol && col < columns.length; col++) {
                const colWidth = columns[col].width;
                const value = this._dataManager.getCellValue(row, col);
                
                if (value) {
                    // Clip text to cell boundaries
                    this._ctx.save();
                    this._ctx.beginPath();
                    this._ctx.rect(x + 2, y + 2, colWidth - 4, rowHeight - 4);
                    this._ctx.clip();
                    
                    // Determine text alignment based on content
                    const isNumeric = !isNaN(parseFloat(value)) && isFinite(parseFloat(value));
                    this._ctx.textAlign = isNumeric ? 'right' : 'left';
                    
                    const textX = isNumeric ? x + colWidth - 4 : x + 4;
                    const textY = y + rowHeight / 2;
                    
                    this._ctx.fillText(value, textX, textY);
                    this._ctx.restore();
                }
                
                x += colWidth;
            }
            y += rowHeight;
        }
    }

    /**
     * Draws selection highlights
     */
    private drawSelection(): void {
        if (!this._selection.hasSelection()) return;
        
        const { startRow, endRow, startCol, endCol } = this._visibleRange;
        const columns = this._dataManager.columns;
        const rows = this._dataManager.rows;
        
        const startX = this._headerWidth + 
            columns.slice(0, startCol).reduce((sum, col) => sum + col.width, 0) - this._scrollX;
        const startY = this._headerHeight + 
            rows.slice(0, startRow).reduce((sum, row) => sum + row.height, 0) - this._scrollY;
        
        this._ctx.strokeStyle = '#007bff';
        this._ctx.lineWidth = 2;
        this._ctx.fillStyle = 'rgba(0, 123, 255, 0.1)';
        
        let y = startY;
        for (let row = startRow; row < endRow && row < rows.length; row++) {
            let x = startX;
            const rowHeight = rows[row].height;
            
            for (let col = startCol; col < endCol && col < columns.length; col++) {
                const colWidth = columns[col].width;
                
                if (this._selection.isSelected(row, col)) {
                    this._ctx.fillRect(x, y, colWidth, rowHeight);
                    this._ctx.strokeRect(x, y, colWidth, rowHeight);
                }
                
                x += colWidth;
            }
            y += rowHeight;
        }
        
        this._ctx.lineWidth = 1;
    }

    /**
     * Gets cell coordinates at a specific canvas position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {object | null} Cell coordinates or null if outside grid
     */
    private getCellAtPosition(x: number, y: number): { row: number, col: number } | null {
        if (x < this._headerWidth || y < this._headerHeight) {
            return null;
        }
        
        const col = this.getColumnAtX(x);
        const row = this.getRowAtY(y);
        
        return (row >= 0 && col >= 0) ? { row, col } : null;
    }

    /**
     * Gets column index at a specific X coordinate
     * @param {number} x - X coordinate
     * @returns {number} Column index or -1 if not found
     */
    private getColumnAtX(x: number): number {
        const { startCol } = this._visibleRange;
        const columns = this._dataManager.columns;
        
        const startX = this._headerWidth + 
            columns.slice(0, startCol).reduce((sum, col) => sum + col.width, 0) - this._scrollX;
        
        let currentX = startX;
        for (let col = startCol; col < columns.length; col++) {
            const width = columns[col].width;
            if (x >= currentX && x < currentX + width) {
                return col;
            }
            currentX += width;
        }
        
        return -1;
    }

    /**
     * Gets row index at a specific Y coordinate
     * @param {number} y - Y coordinate
     * @returns {number} Row index or -1 if not found
     */
    private getRowAtY(y: number): number {
        const { startRow } = this._visibleRange;
        const rows = this._dataManager.rows;
        
        const startY = this._headerHeight + 
            rows.slice(0, startRow).reduce((sum, row) => sum + row.height, 0) - this._scrollY;
        
        let currentY = startY;
        for (let row = startRow; row < rows.length; row++) {
            const height = rows[row].height;
            if (y >= currentY && y < currentY + height) {
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
    private getResizeHandle(x: number, y: number): { type: 'column' | 'row', index: number } | null {
        const tolerance = 5;
        
        // Check column resize handles
        if (y <= this._headerHeight) {
            const { startCol, endCol } = this._visibleRange;
            const columns = this._dataManager.columns;
            
            const startX = this._headerWidth + 
                columns.slice(0, startCol).reduce((sum, col) => sum + col.width, 0) - this._scrollX;
            
            let currentX = startX;
            for (let col = startCol; col < endCol && col < columns.length; col++) {
                const rightEdge = currentX + columns[col].width;
                if (Math.abs(x - rightEdge) <= tolerance) {
                    return { type: 'column', index: col };
                }
                currentX += columns[col].width;
            }
        }
        
        // Check row resize handles
        if (x <= this._headerWidth) {
            const { startRow, endRow } = this._visibleRange;
            const rows = this._dataManager.rows;
            
            const startY = this._headerHeight + 
                rows.slice(0, startRow).reduce((sum, row) => sum + row.height, 0) - this._scrollY;
            
            let currentY = startY;
            for (let row = startRow; row < endRow && row < rows.length; row++) {
                const bottomEdge = currentY + rows[row].height;
                if (Math.abs(y - bottomEdge) <= tolerance) {
                    return { type: 'row', index: row };
                }
                currentY += rows[row].height;
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
        if (!cellRect) return;
        
        this._cellInput = document.createElement('input');
        this._cellInput.type = 'text';
        this._cellInput.className = 'cell-input';
        this._cellInput.value = this._dataManager.getCellValue(row, col);
        
        // Position the input relative to the wrapper, accounting for scroll
        this._cellInput.style.position = 'absolute';
        this._cellInput.style.left = cellRect.x + 'px';
        this._cellInput.style.top = cellRect.y + 'px';
        this._cellInput.style.width = cellRect.width + 'px';
        this._cellInput.style.height = cellRect.height + 'px';
        this._cellInput.style.zIndex = '1000';
        
        // Store cell coordinates
        this._cellInput.dataset.row = row.toString();
        this._cellInput.dataset.col = col.toString();
        
        this._wrapper.appendChild(this._cellInput);
        this._cellInput.focus();
        this._cellInput.select();
        
        // Event listeners
        this._cellInput.addEventListener('blur', () => this.commitCellEdit());
        this._cellInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.commitCellEdit();
            } else if (e.key === 'Escape') {
                this.cancelCellEdit();
            }
        });
    }

    /**
     * Commits the current cell edit
     */
    private commitCellEdit(): void {
        if (!this._cellInput) return;
        
        const row = parseInt(this._cellInput.dataset.row!);
        const col = parseInt(this._cellInput.dataset.col!);
        const value = this._cellInput.value;
        
        this._dataManager.setCellValue(row, col, value);
        
        this._cellInput.remove();
        this._cellInput = null;
        
        this.scheduleRedraw();
        this._canvas.focus();
    }

    /**
     * Cancels the current cell edit
     */
    private cancelCellEdit(): void {
        if (!this._cellInput) return;
        
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
        
        const cellRect = this.getCellRect(row, col);
        if (cellRect) {
            this._cellInput.style.left = cellRect.x + 'px';
            this._cellInput.style.top = cellRect.y + 'px';
        }
    }

    /**
     * Gets the rectangle for a specific cell relative to the wrapper
     * @param {number} row - Row index
     * @param {number} col - Column index
     * @returns {object | null} Cell rectangle or null if not visible
     */
    private getCellRect(row: number, col: number): { x: number, y: number, width: number, height: number } | null {
        const columns = this._dataManager.columns;
        const rows = this._dataManager.rows;
        
        if (row >= rows.length || col >= columns.length) {
            return null;
        }
        
        // Calculate position relative to wrapper (accounting for scroll)
        const x = this._headerWidth + 
            columns.slice(0, col).reduce((sum, c) => sum + c.width, 0) - this._scrollX;
        const y = this._headerHeight + 
            rows.slice(0, row).reduce((sum, r) => sum + r.height, 0) - this._scrollY;
        
        return {
            x,
            y,
            width: columns[col].width,
            height: rows[row].height
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