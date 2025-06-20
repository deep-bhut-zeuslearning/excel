import type Cell from './Cell';
import type Selection from './Selection';
import type DataManager from './DataManager';

/**
 * Statistics result interface
 */
export interface Statistics {
    /** @type {number} Number of selected cells */
    count: number;
    
    /** @type {number} Number of numeric cells */
    numericCount: number;
    
    /** @type {number} Sum of numeric values */
    sum: number;
    
    /** @type {number} Average of numeric values */
    average: number;
    
    /** @type {number} Minimum numeric value */
    min: number;
    
    /** @type {number} Maximum numeric value */
    max: number;
    
    /** @type {boolean} Whether any numeric values were found */
    hasNumericData: boolean;
}

/**
 * Calculates statistics for selected cells in the Excel grid
 * Provides count, sum, average, min, and max for numeric data
 */
export default class StatisticsCalculator {
    /** @type {DataManager} Reference to the data manager */
    private _dataManager: DataManager;

    /**
     * Initializes a new StatisticsCalculator instance
     * @param {DataManager} dataManager - The data manager instance
     */
    constructor(dataManager: DataManager) {
        this._dataManager = dataManager;
    }

    /**
     * Calculates statistics for the current selection
     * @param {Selection} selection - The current selection
     * @param {number} maxCells - Maximum number of cells to process (default: 10000)
     * @returns {Statistics} Statistics object with calculated values
     */
    calculateForSelection(selection: Selection, maxCells: number = 10000): Statistics {
        const selectedCells = selection.getSelectedCells(maxCells);
        return this.calculateForCells(selectedCells);
    }

    /**
     * Calculates statistics for a specific range of cells
     * @param {number} startRow - Starting row index
     * @param {number} startCol - Starting column index
     * @param {number} endRow - Ending row index
     * @param {number} endCol - Ending column index
     * @returns {Statistics} Statistics object with calculated values
     */
    calculateForRange(startRow: number, startCol: number, endRow: number, endCol: number): Statistics {
        const cells: Array<{row: number, col: number}> = [];
        
        for (let row = startRow; row <= endRow; row++) {
            for (let col = startCol; col <= endCol; col++) {
                cells.push({ row, col });
            }
        }
        
        return this.calculateForCells(cells);
    }

    /**
     * Calculates statistics for an array of cell coordinates
     * @param {Array<{row: number, col: number}>} cellCoordinates - Array of cell coordinates
     * @returns {Statistics} Statistics object with calculated values
     */
    calculateForCells(cellCoordinates: Array<{row: number, col: number}>): Statistics {
        const numericValues: number[] = [];
        let totalCells = 0;
        
        // Collect numeric values from the specified cells
        for (const { row, col } of cellCoordinates) {
            totalCells++;
            const value = this._dataManager.getCellValue(row, col);
            
            if (value && value.trim() !== '') {
                const numericValue = this.parseNumericValue(value);
                if (!isNaN(numericValue) && isFinite(numericValue)) {
                    numericValues.push(numericValue);
                }
            }
        }
        
        return this.calculateStatistics(numericValues, totalCells);
    }

    /**
     * Calculates statistics for an array of Cell objects
     * @param {Cell[]} cells - Array of cell objects
     * @returns {Statistics} Statistics object with calculated values
     */
    calculateForCellObjects(cells: Cell[]): Statistics {
        const numericValues: number[] = [];
        
        for (const cell of cells) {
            if (cell.isNumeric()) {
                numericValues.push(cell.getNumericValue());
            }
        }
        
        return this.calculateStatistics(numericValues, cells.length);
    }

    /**
     * Parses a string value to extract numeric content
     * Handles various number formats including percentages and currencies
     * @param {string} value - The string value to parse
     * @returns {number} Parsed numeric value or NaN if not numeric
     */
    private parseNumericValue(value: string): number {
        if (!value || typeof value !== 'string') {
            return NaN;
        }
        
        // Remove common non-numeric characters and try to parse
        let cleanValue = value.trim();
        
        // Handle percentage
        if (cleanValue.endsWith('%')) {
            const percentValue = parseFloat(cleanValue.slice(0, -1));
            return isNaN(percentValue) ? NaN : percentValue / 100;
        }
        
        // Handle currency symbols and commas
        cleanValue = cleanValue.replace(/[$,€£¥]/g, '');
        
        // Handle parentheses as negative numbers (accounting format)
        if (cleanValue.startsWith('(') && cleanValue.endsWith(')')) {
            cleanValue = '-' + cleanValue.slice(1, -1);
        }
        
        return parseFloat(cleanValue);
    }

    /**
     * Calculates statistics from an array of numeric values
     * @param {number[]} numericValues - Array of numeric values
     * @param {number} totalCells - Total number of cells (including non-numeric)
     * @returns {Statistics} Statistics object with calculated values
     */
    private calculateStatistics(numericValues: number[], totalCells: number): Statistics {
        const stats: Statistics = {
            count: totalCells,
            numericCount: numericValues.length,
            sum: 0,
            average: 0,
            min: 0,
            max: 0,
            hasNumericData: numericValues.length > 0
        };
        
        if (numericValues.length === 0) {
            return stats;
        }
        
        // Calculate sum
        stats.sum = numericValues.reduce((sum, value) => sum + value, 0);
        
        // Calculate average
        stats.average = stats.sum / numericValues.length;
        
        // Calculate min and max
        stats.min = Math.min(...numericValues);
        stats.max = Math.max(...numericValues);
        
        return stats;
    }

    /**
     * Formats a statistic value for display
     * @param {number} value - The numeric value to format
     * @param {'count' | 'sum' | 'average' | 'min' | 'max'} type - The type of statistic
     * @returns {string} Formatted string representation
     */
    formatStatistic(value: number, type: 'count' | 'sum' | 'average' | 'min' | 'max'): string {
        if (!isFinite(value)) {
            return '—';
        }
        
        switch (type) {
            case 'count':
                return value.toLocaleString();
            
            case 'sum':
            case 'min':
            case 'max':
                // Format large numbers with appropriate units
                if (Math.abs(value) >= 1000000) {
                    return (value / 1000000).toFixed(2) + 'M';
                } else if (Math.abs(value) >= 1000) {
                    return (value / 1000).toFixed(1) + 'K';
                } else {
                    return value.toLocaleString(undefined, { 
                        minimumFractionDigits: 0, 
                        maximumFractionDigits: 2 
                    });
                }
            
            case 'average':
                return value.toLocaleString(undefined, { 
                    minimumFractionDigits: 0, 
                    maximumFractionDigits: 3 
                });
            
            default:
                return value.toString();
        }
    }

    /**
     * Creates a summary string of the statistics
     * @param {Statistics} stats - The statistics object
     * @returns {string} Human-readable summary
     */
    createSummary(stats: Statistics): string {
        if (stats.count === 0) {
            return 'No cells selected';
        }
        
        if (!stats.hasNumericData) {
            return `${stats.count} cell${stats.count === 1 ? '' : 's'} selected (no numeric data)`;
        }
        
        const parts = [
            `${stats.count} cell${stats.count === 1 ? '' : 's'}`,
            `${stats.numericCount} numeric`,
            `Sum: ${this.formatStatistic(stats.sum, 'sum')}`,
            `Avg: ${this.formatStatistic(stats.average, 'average')}`
        ];
        
        if (stats.numericCount > 1) {
            parts.push(`Min: ${this.formatStatistic(stats.min, 'min')}`);
            parts.push(`Max: ${this.formatStatistic(stats.max, 'max')}`);
        }
        
        return parts.join(' | ');
    }

    /**
     * Checks if a value appears to be numeric
     * @param {string} value - The value to check
     * @returns {boolean} True if the value can be parsed as a number
     */
    isNumericValue(value: string): boolean {
        return !isNaN(this.parseNumericValue(value));
    }

    /**
     * Gets detailed statistics breakdown
     * @param {Statistics} stats - The statistics object
     * @returns {object} Detailed breakdown object
     */
    getDetailedBreakdown(stats: Statistics): {
        selection: { total: number, numeric: number, empty: number },
        values: { sum: string, average: string, min: string, max: string }
    } {
        return {
            selection: {
                total: stats.count,
                numeric: stats.numericCount,
                empty: stats.count - stats.numericCount
            },
            values: {
                sum: this.formatStatistic(stats.sum, 'sum'),
                average: this.formatStatistic(stats.average, 'average'),
                min: this.formatStatistic(stats.min, 'min'),
                max: this.formatStatistic(stats.max, 'max')
            }
        };
    }
}