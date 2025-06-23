/**
 * Represents a row in the Excel grid
 * Manages row properties like height and selection state
 */
export default class Row {
    /** @type {number} The index of this row (0-based) */
    private _index: number;
    
    /** @type {number} The height of this row in pixels */
    private _height: number;
    
    /** @type {boolean} Whether this entire row is selected */
    private _selected: boolean;
    
    /** @type {boolean} Whether this row is hidden from view */
    private _hidden: boolean;
    
    /** @type {number} The minimum allowed height for this row */
    private readonly _minHeight: number = 20;
    
    /** @type {number} The maximum allowed height for this row */
    private readonly _maxHeight: number = 2000;

    /**
     * Initializes a new Row instance
     * @param {number} index - The zero-based row index
     * @param {number} height - The initial height in pixels (default: 25)
     */
    constructor(index: number, height: number = 25) {
        this._index = index;
        this._height = Math.max(this._minHeight, Math.min(height, this._maxHeight));
        this._selected = false;
        this._hidden = false;
    }

    /**
     * Gets the index of this row
     * @returns {number} The zero-based row index
     */
    get index(): number {
        return this._index;
    }

    /**
     * Sets the index of this row
     * @param {number} index - The new index
     */
    setIndex(index: number) {
        this._index = index;
    }

    /**
     * Gets the current height of this row
     * @returns {number} The height in pixels
     */
    get height(): number {
        return this._height;
    }

    /**
     * Sets the height of this row with bounds checking
     * @param {number} value - The new height in pixels
     */
    set height(value: number) {
        this._height = Math.max(this._minHeight, Math.min(value, this._maxHeight));
    }

    /**
     * Gets the selection state of this row
     * @returns {boolean} True if the entire row is selected
     */
    get selected(): boolean {
        return this._selected;
    }

    /**
     * Sets the selection state of this row
     * @param {boolean} selected - Whether the row should be selected
     */
    set selected(selected: boolean) {
        this._selected = selected;
    }

    /**
     * Gets the visibility state of this row
     * @returns {boolean} True if the row is hidden
     */
    get hidden(): boolean {
        return this._hidden;
    }

    /**
     * Sets the visibility state of this row
     * @param {boolean} hidden - Whether the row should be hidden
     */
    set hidden(hidden: boolean) {
        this._hidden = hidden;
    }

    /**
     * Gets the minimum allowed height for this row
     * @returns {number} The minimum height in pixels
     */
    get minHeight(): number {
        return this._minHeight;
    }

    /**
     * Gets the maximum allowed height for this row
     * @returns {number} The maximum height in pixels
     */
    get maxHeight(): number {
        return this._maxHeight;
    }

    /**
     * Gets the display label for this row (1-based numbering)
     * @returns {string} The row number as displayed in Excel (1, 2, 3, etc.)
     */
    getLabel(): string {
        return (this._index + 1).toString();
    }

    /**
     * Resets the row to its default state
     */
    reset(): void {
        this._height = 25;
        this._selected = false;
        this._hidden = false;
    }

    /**
     * Resizes the row by a delta amount
     * @param {number} delta - The amount to change the height by
     * @returns {number} The actual change in height applied
     */
    resize(delta: number): number {
        const oldHeight = this._height;
        this.height = this._height + delta;
        return this._height - oldHeight;
    }

    /**
     * Checks if a given y-coordinate is near the bottom edge of this row
     * Used for resize cursor detection
     * @param {number} y - The y-coordinate to check
     * @param {number} rowY - The top edge of this row
     * @param {number} tolerance - The tolerance in pixels (default: 5)
     * @returns {boolean} True if the coordinate is near the resize handle
     */
    isNearBottomEdge(y: number, rowY: number, tolerance: number = 5): boolean {
        const bottomEdge = rowY + this._height;
        return Math.abs(y - bottomEdge) <= tolerance;
    }

    /**
     * Checks if this row contains the given y-coordinate
     * @param {number} y - The y-coordinate to check
     * @param {number} rowY - The top edge of this row
     * @returns {boolean} True if the coordinate is within this row
     */
    containsY(y: number, rowY: number): boolean {
        return y >= rowY && y < rowY + this._height;
    }

    /**
     * Creates a copy of this row
     * @returns {Row} A new Row instance with the same properties
     */
    clone(): Row {
        const cloned = new Row(this._index, this._height);
        cloned._selected = this._selected;
        cloned._hidden = this._hidden;
        return cloned;
    }

    /**
     * Converts the row to a string representation
     * @returns {string} String representation of the row
     */
    toString(): string {
        return `Row ${this.getLabel()} (${this._index}): height=${this._height}px, selected=${this._selected}`;
    }
}