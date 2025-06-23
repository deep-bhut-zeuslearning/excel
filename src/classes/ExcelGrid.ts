import DataManager from './DataManager';
import Selection from './Selection';
import Canvas from './Canvas';
import StatisticsCalculator from './StatisticsCalculator';
import CommandManager from './CommandManager';
import CellEditCommand from './CellEditCommand';
import ResizeCommand from './ResizeCommand';
import DataGenerator from './DataGenerator';

/**
 * Main Excel Grid application class
 * Coordinates all components and manages the overall application state
 */
export default class ExcelGrid {
    /** @type {DataManager} Manages grid data storage and retrieval */
    private _dataManager!: DataManager;
    
    /** @type {Selection} Manages cell selection state */
    private _selection!: Selection;
    
    /** @type {Canvas} Handles grid rendering and user interactions */
    private _canvas!: Canvas;
    
    /** @type {StatisticsCalculator} Calculates statistics for selected cells */
    private _statisticsCalculator!: StatisticsCalculator;
    
    /** @type {CommandManager} Manages undo/redo operations */
    private _commandManager!: CommandManager;
    
    /** @type {HTMLElement} Main application container */
    private _container!: HTMLElement;
    
    /** @type {HTMLElement} Toolbar container */
    private _toolbar!: HTMLElement;
    
    /** @type {HTMLElement} Statistics bar container */
    private _statisticsBar!: HTMLElement;
    
    /** @type {HTMLElement} Canvas wrapper container */
    private _canvasWrapper!: HTMLElement;
    
    /** @type {HTMLElement} Loading overlay element */
    private _loadingOverlay!: HTMLElement;

    /**
     * Initializes a new ExcelGrid instance
     */
    constructor() {
        this.initializeContainers();
        this.initializeComponents();
        this.setupToolbar();
        this.setupEventListeners();
        this.updateStatistics();
        
        // Load sample data
        this.loadSampleData();
    }

    /**
     * Initializes DOM containers for the application
     */
    private initializeContainers(): void {
        this._container = document.getElementById('app')!;
        this._toolbar = document.getElementById('toolbar')!;
        this._statisticsBar = document.getElementById('statistics-bar')!;
        this._canvasWrapper = document.getElementById('canvas-wrapper')!;
        this._loadingOverlay = document.getElementById('loading-overlay')!;
        
        if (!this._container || !this._toolbar || !this._statisticsBar || !this._canvasWrapper) {
            throw new Error('Required DOM elements not found');
        }
    }

    /**
     * Initializes core application components
     */
    private initializeComponents(): void {
        // Initialize data manager with large capacity
        this._dataManager = new DataManager(1000, 50, 100000, 500);
        
        // Initialize selection manager
        this._selection = new Selection(100000, 500);
        
        // Initialize canvas for rendering
        this._canvas = new Canvas(this._canvasWrapper, this._dataManager, this._selection);
        
        // Initialize statistics calculator
        this._statisticsCalculator = new StatisticsCalculator(this._dataManager);
        
        // Initialize command manager for undo/redo
        this._commandManager = new CommandManager(100);
    }

    /**
     * Sets up the toolbar with buttons and controls
     */
    private setupToolbar(): void {
        this._toolbar.innerHTML = `
            <div class="toolbar-group">
                <button class="toolbar-button" id="undo-btn" title="Undo (Ctrl+Z)">↶ Undo</button>
                <button class="toolbar-button" id="redo-btn" title="Redo (Ctrl+Y)">↷ Redo</button>
            </div>
            
            <div class="toolbar-separator"></div>
            
            <div class="toolbar-group">
                <label for="file-input" class="file-input-label">📁 Load JSON</label>
                <input type="file" id="file-input" class="file-input" accept=".json">
                <button class="toolbar-button" id="generate-data-btn">🎲 Generate Sample Data</button>
                <button class="toolbar-button" id="clear-data-btn">🗑️ Clear All</button>
            </div>
            
            <div class="toolbar-separator"></div>
            
            <div class="toolbar-group">
                <button class="toolbar-button" id="select-all-btn">📋 Select All</button>
                <button class="toolbar-button" id="clear-selection-btn">❌ Clear Selection</button>
            </div>

            <div class="toolbar-separator"></div>

            <div class="toolbar-group">
                <button class="toolbar-button" id="delete-row-btn" title="Delete Selected Row(s)">Delete Row</button>
                <button class="toolbar-button" id="delete-col-btn" title="Delete Selected Column(s)">Delete Column</button>
            </div>

            <div class="toolbar-separator"></div>

            <div class="toolbar-group">
                <label for="font-size-input" class="toolbar-label">Font Size:</label>
                <input type="number" id="font-size-input" class="toolbar-input" min="8" max="72" step="1" placeholder="14">
            </div>

            <div class="toolbar-separator"></div>

            <div class="toolbar-group">
                <label for="h-align-select" class="toolbar-label">H-Align:</label>
                <select id="h-align-select" class="toolbar-select">
                    <option value="">Default</option>
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                </select>

                <label for="v-align-select" class="toolbar-label">V-Align:</label>
                <select id="v-align-select" class="toolbar-select">
                    <option value="">Default</option>
                    <option value="top">Top</option>
                    <option value="middle">Middle</option>
                    <option value="bottom">Bottom</option>
                </select>
            </div>
        `;
        
        this.setupToolbarEvents();
    }

    /**
     * Sets up event listeners for toolbar buttons
     */
    private setupToolbarEvents(): void {
        // Undo/Redo buttons
        const undoBtn = document.getElementById('undo-btn') as HTMLButtonElement;
        const redoBtn = document.getElementById('redo-btn') as HTMLButtonElement;
        
        undoBtn.addEventListener('click', () => {
            if (this._commandManager.undo()) {
                this._canvas.redraw();
                this.updateStatistics();
            }
        });
        
        redoBtn.addEventListener('click', () => {
            if (this._commandManager.redo()) {
                this._canvas.redraw();
                this.updateStatistics();
            }
        });
        
        // File input
        const fileInput = document.getElementById('file-input') as HTMLInputElement;
        fileInput.addEventListener('change', (event) => {
            const file = (event.target as HTMLInputElement).files?.[0];
            if (file) {
                this.loadJSONFile(file);
            }
        });
        
        // Data generation and management
        document.getElementById('generate-data-btn')?.addEventListener('click', () => {
            this.generateSampleData();
        });
        
        document.getElementById('clear-data-btn')?.addEventListener('click', () => {
            this.clearAllData();
        });
        
        // Selection management
        document.getElementById('select-all-btn')?.addEventListener('click', () => {
            this._selection.selectAll();
            this._canvas.redraw();
            this.updateStatistics();
        });
        
        document.getElementById('clear-selection-btn')?.addEventListener('click', () => {
            this._selection.clearSelection();
            this._canvas.redraw();
            this.updateStatistics();
        });

        // Delete row/column buttons
        const deleteRowBtn = document.getElementById('delete-row-btn') as HTMLButtonElement;
        const deleteColBtn = document.getElementById('delete-col-btn') as HTMLButtonElement;

        deleteRowBtn?.addEventListener('click', () => this.deleteSelectedRows());
        deleteColBtn?.addEventListener('click', () => this.deleteSelectedColumns());

        // Font size input
        const fontSizeInput = document.getElementById('font-size-input') as HTMLInputElement;
        fontSizeInput?.addEventListener('change', (event) => {
            const newSize = parseInt((event.target as HTMLInputElement).value);
            if (!isNaN(newSize) && newSize >= 8 && newSize <= 72) {
                this.setSelectedCellsFontSize(newSize);
            } else if ((event.target as HTMLInputElement).value === '') {
                // Allow clearing to reset to default
                this.setSelectedCellsFontSize(null);
            }
        });
        
        // Update button states periodically
        // Also update font size input based on selection
        setInterval(() => {
            this.updateToolbarState();
            this.updateFontSizeInput();
            this.updateAlignmentControls();
        }, 100);

        // Alignment selects
        const hAlignSelect = document.getElementById('h-align-select') as HTMLSelectElement;
        hAlignSelect?.addEventListener('change', (event) => {
            const newAlign = (event.target as HTMLSelectElement).value as 'left' | 'center' | 'right' | '';
            this.setSelectedCellsHorizontalAlignment(newAlign === '' ? null : newAlign);
        });

        const vAlignSelect = document.getElementById('v-align-select') as HTMLSelectElement;
        vAlignSelect?.addEventListener('change', (event) => {
            const newAlign = (event.target as HTMLSelectElement).value as 'top' | 'middle' | 'bottom' | '';
            this.setSelectedCellsVerticalAlignment(newAlign === '' ? null : newAlign);
        });
    }

    /**
     * Sets the font size for all currently selected cells.
     * @param {number | null} size - The font size to set, or null for default.
     */
    private setSelectedCellsFontSize(size: number | null): void {
        const selectedCoords = this._selection.getSelectedCells();
        if (selectedCoords.length > 0) {
            selectedCoords.forEach(({row, col}) => {
                this._dataManager.setCellFontSize(row, col, size);
            });
        } else if (this._selection.activeRange) { // Apply to active range if no specific cells selected
             const ar = this._selection.activeRange;
             for (let r = ar.startRow; r <= ar.endRow; r++) {
                for (let c = ar.startCol; c <= ar.endCol; c++) {
                    this._dataManager.setCellFontSize(r, c, size);
                }
            }
        }
        this._canvas.redraw();
        // TODO: Add to CommandManager
    }

    /**
     * Sets the vertical alignment for all currently selected cells.
     * @param {'top' | 'middle' | 'bottom' | null} alignment - The alignment to set.
     */
    private setSelectedCellsVerticalAlignment(alignment: 'top' | 'middle' | 'bottom' | null): void {
        const selectedCoords = this._selection.getSelectedCells();
        if (selectedCoords.length > 0) {
            selectedCoords.forEach(({row, col}) => {
                this._dataManager.setCellVerticalAlignment(row, col, alignment);
            });
        } else if (this._selection.activeRange) {
            const ar = this._selection.activeRange;
            for (let r = ar.startRow; r <= ar.endRow; r++) {
                for (let c = ar.startCol; c <= ar.endCol; c++) {
                    this._dataManager.setCellVerticalAlignment(r, c, alignment);
                }
            }
        }
        this._canvas.redraw();
        // TODO: Add to CommandManager
    }

    /**
     * Sets the horizontal alignment for all currently selected cells.
     * @param {'left' | 'center' | 'right' | null} alignment - The alignment to set.
     */
    private setSelectedCellsHorizontalAlignment(alignment: 'left' | 'center' | 'right' | null): void {
        const selectedCoords = this._selection.getSelectedCells();
        if (selectedCoords.length > 0) {
            selectedCoords.forEach(({row, col}) => {
                this._dataManager.setCellHorizontalAlignment(row, col, alignment);
            });
        } else if (this._selection.activeRange) {
            const ar = this._selection.activeRange;
            for (let r = ar.startRow; r <= ar.endRow; r++) {
                for (let c = ar.startCol; c <= ar.endCol; c++) {
                    this._dataManager.setCellHorizontalAlignment(r, c, alignment);
                }
            }
        } else {
            selectedCoords.forEach(({row, col}) => {
                this._dataManager.setCellFontSize(row, col, size);
            });
        }
        this._canvas.redraw();
        // TODO: Add to CommandManager
    }

    /**
     * Updates the font size input in the toolbar based on the current selection.
     */
    private updateFontSizeInput(): void {
        const fontSizeInput = document.getElementById('font-size-input') as HTMLInputElement;
        if (!fontSizeInput) return;

        const activeRange = this._selection.activeRange;
        if (activeRange && activeRange.isSingleCell()) {
            const cell = this._dataManager.getCell(activeRange.startRow, activeRange.startCol);
            const currentSize = cell?.fontSize;
            if (currentSize !== null && currentSize !== undefined) {
                fontSizeInput.value = currentSize.toString();
            } else {
                fontSizeInput.value = '';
            }
        } else {
            fontSizeInput.value = '';
        }
    }

    /**
     * Updates the alignment select elements in the toolbar based on the current selection.
     */
    private updateAlignmentControls(): void {
        const hAlignSelect = document.getElementById('h-align-select') as HTMLSelectElement;
        const vAlignSelect = document.getElementById('v-align-select') as HTMLSelectElement;
        if (!hAlignSelect || !vAlignSelect) return;

        const activeRange = this._selection.activeRange;
        if (activeRange && activeRange.isSingleCell()) {
            const cell = this._dataManager.getCell(activeRange.startRow, activeRange.startCol);
            hAlignSelect.value = cell?.horizontalAlignment ?? '';
            vAlignSelect.value = cell?.verticalAlignment ?? '';
        } else {
            // Multiple cells selected or no selection, set to default/empty value
            hAlignSelect.value = '';
            vAlignSelect.value = '';
        }
    }


    /**
     * Deletes the selected row(s).
     * If a full row selection exists, all selected rows are deleted.
     * Otherwise, the row of the active cell is deleted.
     */
    private deleteSelectedRows(): void {
        const activeRange = this._selection.activeRange;
        if (!activeRange) return;

        if (!confirm('Are you sure you want to delete the selected row(s)? This action cannot be undone yet.')) {
            return;
        }

        // It's safer to delete from the highest index downwards to avoid index shifting issues.
        let rowsToDelete: number[] = [];

        if (this._selection.ranges.some(r => r.isRowSelection)) {
            this._selection.ranges.forEach(range => {
                if (range.isRowSelection) {
                    for (let i = range.startRow; i <= range.endRow; i++) {
                        rowsToDelete.push(i);
                    }
                }
            });
            // Add specific cell selection rows if they are not part of a full row selection
            this._selection.ranges.forEach(range => {
                if (!range.isRowSelection && !range.isColumnSelection) {
                     for (let i = range.startRow; i <= range.endRow; i++) {
                        rowsToDelete.push(i);
                    }
                }
            });
        } else {
            // No full row selection, use active cell's row
            rowsToDelete.push(activeRange.startRow);
        }

        // Remove duplicates and sort in descending order
        rowsToDelete = [...new Set(rowsToDelete)].sort((a, b) => b - a);

        let deleted = false;
        rowsToDelete.forEach(rowIndex => {
            if (this._dataManager.deleteRow(rowIndex)) {
                deleted = true;
            }
        });

        if (deleted) {
            this._selection.clearSelection();
            this._canvas.redraw(); // Redraw will use new DataManager row/col counts via setupVirtualScrolling
            this.updateStatistics();
            // TODO: Add to CommandManager
        }
    }

    /**
     * Deletes the selected column(s).
     * If a full column selection exists, all selected columns are deleted.
     * Otherwise, the column of the active cell is deleted.
     */
    private deleteSelectedColumns(): void {
        const activeRange = this._selection.activeRange;
        if (!activeRange) return;

        if (!confirm('Are you sure you want to delete the selected column(s)? This action cannot be undone yet.')) {
            return;
        }

        let colsToDelete: number[] = [];

        if (this._selection.ranges.some(r => r.isColumnSelection)) {
             this._selection.ranges.forEach(range => {
                if (range.isColumnSelection) {
                    for (let i = range.startCol; i <= range.endCol; i++) {
                        colsToDelete.push(i);
                    }
                }
            });
            // Add specific cell selection columns if they are not part of a full col selection
            this._selection.ranges.forEach(range => {
                if (!range.isColumnSelection && !range.isRowSelection) {
                     for (let i = range.startCol; i <= range.endCol; i++) {
                        colsToDelete.push(i);
                    }
                }
            });
        } else {
            colsToDelete.push(activeRange.startCol);
        }

        // Remove duplicates and sort in descending order
        colsToDelete = [...new Set(colsToDelete)].sort((a, b) => b - a);

        let deleted = false;
        colsToDelete.forEach(colIndex => {
            if (this._dataManager.deleteColumn(colIndex)) {
                deleted = true;
            }
        });

        if (deleted) {
            this._selection.clearSelection();
            this._canvas.redraw(); // Redraw will use new DataManager row/col counts
            this.updateStatistics();
            // TODO: Add to CommandManager
        }
    }

    /**
     * Updates toolbar button states based on current application state
     */
    private updateToolbarState(): void {
        const undoBtn = document.getElementById('undo-btn') as HTMLButtonElement;
        const redoBtn = document.getElementById('redo-btn') as HTMLButtonElement;
        
        if (undoBtn) {
            undoBtn.disabled = !this._commandManager.canUndo();
            undoBtn.title = this._commandManager.canUndo() 
                ? `Undo: ${this._commandManager.getNextUndoDescription()}`
                : 'Undo (Ctrl+Z)';
        }
        
        if (redoBtn) {
            redoBtn.disabled = !this._commandManager.canRedo();
            redoBtn.title = this._commandManager.canRedo()
                ? `Redo: ${this._commandManager.getNextRedoDescription()}`
                : 'Redo (Ctrl+Y)';
        }
    }

    /**
     * Sets up global event listeners
     */
    private setupEventListeners(): void {
        // Keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            if (event.ctrlKey || event.metaKey) {
                switch (event.key.toLowerCase()) {
                    case 'z':
                        if (event.shiftKey) {
                            this._commandManager.redo();
                        } else {
                            this._commandManager.undo();
                        }
                        this._canvas.redraw();
                        this.updateStatistics();
                        event.preventDefault();
                        break;
                    
                    case 'y':
                        this._commandManager.redo();
                        this._canvas.redraw();
                        this.updateStatistics();
                        event.preventDefault();
                        break;
                    
                    case 'a':
                        this._selection.selectAll();
                        this._canvas.redraw();
                        this.updateStatistics();
                        event.preventDefault();
                        break;
                }
            }
        });
        
        // Listen for selection changes to update statistics
        // Note: In a real implementation, you'd want to use events/observers
        // For now, we'll update statistics on a timer
        setInterval(() => this.updateStatistics(), 500);
    }

    /**
     * Updates the statistics bar with current selection information
     */
    private updateStatistics(): void {
        const stats = this._statisticsCalculator.calculateForSelection(this._selection, 100000);
        
        this._statisticsBar.innerHTML = `
            <div class="stat-item">
                <span class="stat-label">Selected:</span>
                <span class="stat-value">${stats.count.toLocaleString()}</span>
            </div>
            
            ${stats.hasNumericData ? `
                <div class="stat-item">
                    <span class="stat-label">Count:</span>
                    <span class="stat-value">${this._statisticsCalculator.formatStatistic(stats.numericCount, 'count')}</span>
                </div>
                
                <div class="stat-item">
                    <span class="stat-label">Sum:</span>
                    <span class="stat-value">${this._statisticsCalculator.formatStatistic(stats.sum, 'sum')}</span>
                </div>
                
                <div class="stat-item">
                    <span class="stat-label">Average:</span>
                    <span class="stat-value">${this._statisticsCalculator.formatStatistic(stats.average, 'average')}</span>
                </div>
                
                <div class="stat-item">
                    <span class="stat-label">Min:</span>
                    <span class="stat-value">${this._statisticsCalculator.formatStatistic(stats.min, 'min')}</span>
                </div>
                
                <div class="stat-item">
                    <span class="stat-label">Max:</span>
                    <span class="stat-value">${this._statisticsCalculator.formatStatistic(stats.max, 'max')}</span>
                </div>
            ` : `
                <div class="stat-item">
                    <span class="stat-label">No numeric data in selection</span>
                </div>
            `}
        `;
    }

    /**
     * Shows the loading overlay
     * @param {string} message - Loading message to display
     */
    private showLoading(message: string = 'Loading...'): void {
        this._loadingOverlay.classList.remove('hidden');
        const loadingText = this._loadingOverlay.querySelector('.loading-text');
        if (loadingText) {
            loadingText.textContent = message;
        }
    }

    /**
     * Hides the loading overlay
     */
    private hideLoading(): void {
        this._loadingOverlay.classList.add('hidden');
    }

    /**
     * Loads sample data into the grid
     */
    private loadSampleData(): void {
        this.showLoading('Loading sample data...');
        
        // Use setTimeout to prevent UI blocking
        setTimeout(() => {
            try {
                const sampleData = DataGenerator.generateEmployeeData(1000);
                this.loadDataArray(sampleData);
                this.hideLoading();
            } catch (error) {
                console.error('Failed to load sample data:', error);
                this.hideLoading();
            }
        }, 100);
    }

    /**
     * Generates and loads sample data
     */
    private generateSampleData(): void {
        this.showLoading('Generating 50,000 sample records...');
        
        // Use setTimeout to prevent UI blocking
        setTimeout(() => {
            try {
                const data = DataGenerator.generateEmployeeData(50000);
                this.loadDataArray(data);
                this.hideLoading();
            } catch (error) {
                console.error('Failed to generate sample data:', error);
                this.hideLoading();
            }
        }, 1000);
    }

    /**
     * Loads data from a JSON file
     * @param {File} file - JSON file to load
     */
    private async loadJSONFile(file: File): Promise<void> {
        this.showLoading('Loading JSON file...');
        
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (Array.isArray(data)) {
                this.loadDataArray(data);
            } else {
                throw new Error('JSON file must contain an array of objects');
            }
            
            this.hideLoading();
        } catch (error) {
            console.error('Failed to load JSON file:', error);
            alert('Failed to load JSON file. Please ensure it contains a valid array of objects.');
            this.hideLoading();
        }
    }

    /**
     * Loads an array of data objects into the grid
     * @param {Array<object>} data - Array of data objects
     */
    private loadDataArray(data: Array<object>): void {
        if (!Array.isArray(data) || data.length === 0) {
            return;
        }
        
        // Clear existing data
        this._dataManager.clear();
        
        // Get headers from first object
        const headers = Object.keys(data[0]);
        
        // Set headers in first row
        headers.forEach((header, col) => {
            this._dataManager.setCellValue(0, col, header);
        });
        
        // Process data in chunks to prevent UI blocking
        const chunkSize = 1000;
        let processed = 0;
        
        const processChunk = () => {
            const end = Math.min(processed + chunkSize, data.length);
            
            for (let i = processed; i < end; i++) {
                const item = data[i];
                headers.forEach((key, col) => {
                    const value = item[key as keyof typeof item];
                    this._dataManager.setCellValue(i + 1, col, String(value ?? ''));
                });
            }
            
            processed = end;
            
            // Update progress
            const progress = Math.round((processed / data.length) * 100);
            const loadingText = this._loadingOverlay.querySelector('.loading-text');
            if (loadingText) {
                loadingText.textContent = `Loading data... ${progress}%`;
            }
            
            if (processed < data.length) {
                // Process next chunk
                setTimeout(processChunk, 0);
            } else {
                // Finished processing
                this._canvas.redraw();
                this.updateStatistics();
                this.hideLoading();
            }
        };
        
        processChunk();
    }

    /**
     * Clears all data from the grid
     */
    private clearAllData(): void {
        if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
            this._dataManager.clear();
            this._selection.clearSelection();
            this._commandManager.clearHistory();
            this._canvas.redraw();
            this.updateStatistics();
        }
    }

    /**
     * Gets the current data manager instance
     * @returns {DataManager} Data manager instance
     */
    get dataManager(): DataManager {
        return this._dataManager;
    }

    /**
     * Gets the current selection instance
     * @returns {Selection} Selection instance
     */
    get selection(): Selection {
        return this._selection;
    }

    /**
     * Gets the current canvas instance
     * @returns {Canvas} Canvas instance
     */
    get canvas(): Canvas {
        return this._canvas;
    }

    /**
     * Gets the current command manager instance
     * @returns {CommandManager} Command manager instance
     */
    get commandManager(): CommandManager {
        return this._commandManager;
    }

    /**
     * Destroys the Excel grid and cleans up resources
     */
    destroy(): void {
        this._canvas.destroy();
        this._commandManager.clearHistory();
    }
}