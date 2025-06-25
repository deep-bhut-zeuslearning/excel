import Cell from "./Cell";
import { BaseCommand } from "./Command";
import DataManager from "./DataManager";


export default class RowsColumnsEditCommand extends BaseCommand {
    private _type: 'column' | 'row';
    private _operation: 'insert' | 'delete';
    private _dataManager: DataManager;
    private _index: number;
    private _data: Array<Cell>;

    constructor(dataManager: DataManager, type: 'column' | 'row', index: number, operation: 'insert' | 'delete', data?: Array<Cell>) {

        super(`${operation} a ${type} at index: ${index}`)
        this._type = type;
        this._index = index
        this._operation = operation
        this._dataManager = dataManager;
        this._data = data || [new Cell(8000, 8000)];
    }

    execute(): boolean {
        try {
            let success: boolean = false;
            if (this._operation === 'insert') {
                if (this._type === 'column') {
                    success = this._dataManager.insertColumn(this._index)
                } else {
                    success = this._dataManager.insertRow(this._index);
                }
            } else {
                if (this._type === 'column') {
                    success = this._dataManager.deleteColumn(this._index)
                } else {
                    success = this._dataManager.deleteRow(this._index);
                }
            }
            return success;
        } catch (error) {
            console.log(error);
            return false;
        }
    }

    undo(): boolean {
        try {
            let success: boolean = false;
            if (this._operation === 'insert') {
                if (this._type === 'column') {
                    success = this._dataManager.deleteColumn(this._index)
                    
                } else {
                    success = this._dataManager.deleteRow(this._index);
                }
            } else {
                if (this._type === 'column') {
                    success = this._dataManager.insertColumn(this._index)
                    this._dataManager.setCellValueOfColumn(this._data)
                } else {
                    success = this._dataManager.insertRow(this._index);
                    this._dataManager.setCellValueOfRow(this._data);
                }
            }
            return success;
        } catch (error) {
            console.log(error);
            
            return false;
        }
        
    }

    get type(): 'column' | 'row' {
        return this._type;
    }

    get operation(): 'insert' | 'delete' {
        return this._operation
    }

}
