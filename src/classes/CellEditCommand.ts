import Cell from './Cell';
import { BaseCommand } from './Command';
import type DataManager from './DataManager';

interface DataType {
    oldValue: string;
    newValue: string;
    row: number;
    col: number;
}

/**
 * Command for editing cell values
 * Supports undo/redo of cell value changes
 */
export default class CellEditCommand extends BaseCommand {
    /** @type {DataManager} Reference to the data manager */
    private _dataManager: DataManager;
    
    /** @type {DataType} is holds the data about what and where the updation happened. */
    private _data: Array<DataType>

    // constructor(dataManager: DataManager, row: number, col: number, newValue: string, oldValue: string);
    constructor(dataManager: DataManager,data: Array<DataType>) {
        super("editing cell");
        this._dataManager = dataManager
        this._data = data
    }


    /**
     * Executes the cell edit command
     * @returns {boolean} True if the command executed successfully
     */
    execute(): boolean {
        try {
            this._data.forEach(cell => {
                this._dataManager.setCellValue(cell.row, cell.col, cell.newValue);
            })
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
            this._data.forEach(cell => {
                this._dataManager.setCellValue(cell.row, cell.col, cell.oldValue);

            })
            // this._dataManager.setCellValue(this._row, this._col, this._oldValue!);
            return true;
        } catch (error) {
            console.error('Failed to undo cell edit command:', error);
            return false;
        }
    }

    // /**
    //  * Gets the row index
    //  * @returns {number} Row index
    //  */
    // get row(): number {
    //     return this._row;
    // }

    // /**
    //  * Gets the column index
    //  * @returns {number} Column index
    //  */
    // get col(): number {
    //     return this._col;
    // }

    // /**
    //  * Gets the new value
    //  * @returns {string} New cell value
    //  */
    // get newValue(): string {
    //     return this._newValue!;
    // }

    // /**
    //  * Gets the old value
    //  * @returns {string} Original cell value
    //  */
    // get oldValue(): string {
    //     return this._oldValue!;
    // }
}