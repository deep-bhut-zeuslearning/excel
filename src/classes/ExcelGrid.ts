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

    /** @type {HTMLElement} Formula bar container */
    private _formulaBar!: HTMLElement;
    
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
        this.setupFormulaBar(); // New call
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
        this._formulaBar = document.getElementById('formula-bar')!; // Added formula bar
        this._statisticsBar = document.getElementById('statistics-bar')!;
        this._canvasWrapper = document.getElementById('canvas-wrapper')!;
        this._loadingOverlay = document.getElementById('loading-overlay')!;
        
        if (!this._container || !this._toolbar || !this._formulaBar || !this._statisticsBar || !this._canvasWrapper || !this._loadingOverlay) {
            throw new Error('Required DOM elements not found. Ensure app, toolbar, formula-bar, statistics-bar, canvas-wrapper, and loading-overlay exist.');
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
            
            <div class="toolbar-group">
                <label for="file-input" class="file-input-label toolbar-button">📁 Load JSON</label> <!-- Added toolbar-button class for consistent styling -->
                <input type="file" id="file-input" class="file-input" accept=".json">
                <button class="toolbar-button" id="generate-data-btn">🎲 Generate Sample Data</button>
                <button class="toolbar-button" id="clear-data-btn">🗑️ Clear All</button>
            </div>
            
            <div class="toolbar-group">
                <button class="toolbar-button" id="select-all-btn">📋 Select All</button>
                <button class="toolbar-button" id="clear-selection-btn">❌ Clear Selection</button>
            </div>
        `;
        // Note: .toolbar-separator divs were removed as CSS now handles separation via .toolbar-group border-right.
        
        this.setupToolbarEvents();
    }

    /**
     * Sets up the formula bar with input fields
     */
    private setupFormulaBar(): void {
        this._formulaBar.innerHTML = `
            <input type="text" id="active-cell-indicator" class="excel-formula-bar-cell-name" value="A1" readonly title="Active Cell">
            <div class="fx-icon" title="Insert Function">fx</div>
            <input type="text" id="formula-input-field" class="excel-formula-bar-input" placeholder="Enter value or formula">
        `;

        // Event listeners for formula bar components can be added here if needed
        // For example, linking formula-input-field to cell editing.
        const formulaInputField = document.getElementById('formula-input-field') as HTMLInputElement;
        formulaInputField.addEventListener('blur', () => {
            // Logic to update cell with formula input content
            // This requires more integration with cell editing and selection
            // For now, we just log it
            if (this._selection.getSelectedCells().length === 1) {
                const { row, col } = this._selection.getSelectedCells()[0];
                const oldValue = this._dataManager.getCellValue(row, col);
                const newValue = formulaInputField.value;
                if (oldValue !== newValue) {
                    const command = new CellEditCommand(this._dataManager, row, col, oldValue, newValue);
                    this._commandManager.executeCommand(command);
                    this._canvas.redraw();
                    this.updateStatistics();
                }
            }
        });

        // TODO: Link active-cell-indicator and formula-input-field to selection and cell data
        // This will likely involve observing selection changes and updating these fields.
        this.updateFormulaBarDisplay(); // Initial update
    }

    /**
     * Updates the formula bar display based on the current selection
     */
    private updateFormulaBarDisplay(): void {
        const activeCellIndicator = document.getElementById('active-cell-indicator') as HTMLInputElement;
        const formulaInputField = document.getElementById('formula-input-field') as HTMLInputElement;

        if (!activeCellIndicator || !formulaInputField) return;

        const selected = this._selection.getSelectedCells(); // Get all selected cells
        const activeRange = this._selection.activeRange; // Get the primary active range

        if (activeRange) { // If there's any selection
            const primaryRow = activeRange.startRow;
            const primaryCol = activeRange.startCol;

            activeCellIndicator.value = this._dataManager.getCellLabel(primaryRow, primaryCol);

            // Only update formula input if it's not focused, to avoid interrupting user typing
            if (document.activeElement !== formulaInputField) {
                 // If multiple cells are selected, Excel typically shows the value of the primary active cell.
                formulaInputField.value = this._dataManager.getCellValue(primaryRow, primaryCol);
            }
        } else { // No selection
            activeCellIndicator.value = "";
            if (document.activeElement !== formulaInputField) {
                formulaInputField.value = "";
            }
        }
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
                this.updateStatistics(); // This will also call updateFormulaBarDisplay
            }
        });
        
        redoBtn.addEventListener('click', () => {
            if (this._commandManager.redo()) {
                this._canvas.redraw();
                this.updateStatistics(); // This will also call updateFormulaBarDisplay
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
            this.updateStatistics(); // This will also call updateFormulaBarDisplay
        });
        
        document.getElementById('clear-selection-btn')?.addEventListener('click', () => {
            this._selection.clearSelection();
            this._canvas.redraw();
            this.updateStatistics(); // This will also call updateFormulaBarDisplay
        });
        
        // Update button states periodically
        setInterval(() => this.updateToolbarState(), 100);
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
                        this.updateStatistics(); // This will also call updateFormulaBarDisplay
                        event.preventDefault();
                        break;
                    
                    case 'y':
                        this._commandManager.redo();
                        this._canvas.redraw();
                        this.updateStatistics(); // This will also call updateFormulaBarDisplay
                        event.preventDefault();
                        break;
                    
                    case 'a':
                        this._selection.selectAll();
                        this._canvas.redraw();
                        this.updateStatistics(); // This will also call updateFormulaBarDisplay
                        event.preventDefault();
                        break;
                }
            }
        });
        
        // Listen for selection changes to update statistics and formula bar
        // Note: In a real implementation, you'd want to use events/observers for selection changes directly.
        // For now, we'll update statistics and formula bar on a timer, and also after specific actions.
        // The Selection class could eventually emit an event.
        setInterval(() => {
            // This interval primarily catches selection changes made directly via Canvas mouse events
            // or keyboard navigation that don't explicitly call updateStatistics.
            this.updateStatistics();
        }, 250); // Reduced interval for more responsive formula bar updates
    }

    /**
     * Updates the statistics bar with current selection information
     * Also triggers update for the formula bar display.
     */
    private updateStatistics(): void {
        // Update formula bar first, as it depends on the current selection state
        this.updateFormulaBarDisplay();

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