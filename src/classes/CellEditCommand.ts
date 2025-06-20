import { BaseCommand } from './Command';
import type DataManager from './DataManager';

/**
 * Command for editing cell values
 * Supports undo/redo of cell value changes
 */
export default class CellEditCommand extends BaseCommand {
    /** @type {DataManager} Reference to the data manager */
    private _dataManager: DataManager;
    
    /** @type {number} Row index of the cell being edited */
    private _row: number;
    
    /** @type {number} Column index of the cell being edited */
    private _col: number;
    
    /** @type {string} New value to set */
    private _newValue: string;
    
    /** @type {string} Original value before the change */
    private _oldValue: string;

    /**
     * Initializes a new CellEditCommand instance
     * @param {DataManager} dataManager - The data manager instance
     * @param {number} row - Row index of the cell
     * @param {number} col - Column index of the cell
     * @param {string} newValue - New value to set
     * @param {string} oldValue - Current value (will be stored for undo)
     */
    constructor(dataManager: DataManager, row: number, col: number, newValue: string, oldValue: string) {
        super(`Edit cell ${String.fromCharCode(65 + col)}${row + 1}`);
        this._dataManager = dataManager;
        this._row = row;
        this._col = col;
        this._newValue = newValue;
        this._oldValue = oldValue;
    }

    /**
     * Executes the cell edit command
     * @returns {boolean} True if the command executed successfully
     */
    execute(): boolean {
        try {
            this._dataManager.setCellValue(this._row, this._col, this._newValue);
            return true;
        } catch (error) {
            console.error('Failed to execute cell edit command:', error);
            return false;
        }
    }

    /**
     * Undoes the cell edit command
     * @returns {boolean} True if the command was undone successfully
     */
    undo(): boolean {
        try {
            this._dataManager.setCellValue(this._row, this._col, this._oldValue);
            return true;
        } catch (error) {
            console.error('Failed to undo cell edit command:', error);
            return false;
        }
    }

    /**
     * Gets the row index
     * @returns {number} Row index
     */
    get row(): number {
        return this._row;
    }

    /**
     * Gets the column index
     * @returns {number} Column index
     */
    get col(): number {
        return this._col;
    }

    /**
     * Gets the new value
     * @returns {string} New cell value
     */
    get newValue(): string {
        return this._newValue;
    }

    /**
     * Gets the old value
     * @returns {string} Original cell value
     */
    get oldValue(): string {
        return this._oldValue;
    }
}