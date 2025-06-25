/**
 * Generates sample data for the Excel grid
 * Creates realistic test data with various data types
 */
export default class DataGenerator {
    /** @type {string[]} Array of sample first names */
    private static readonly FIRST_NAMES = [
        'Aarav', 'Aadhya', 'Vihaan', 'Ananya', 'Arjun', 'Isha', 'Rohan', 'Priya',
        'Karan', 'Saanvi', 'Rahul', 'Pooja', 'Aditya', 'Khushi', 'Siddharth',
        'Neha', 'Vikram', 'Sneha', 'Rakesh', 'Meera', 'Manish', 'Tanvi',
        'Harsh', 'Lavanya', 'Akash', 'Shreya', 'Kunal', 'Gayatri'
    ];

    /** @type {string[]} Array of sample last names */
    private static readonly LAST_NAMES = [
        'Sharma', 'Verma', 'Patel', 'Reddy', 'Gupta', 'Nair', 'Singh', 'Khan',
        'Mehta', 'Kapoor', 'Chatterjee', 'Iyer', 'Desai', 'Joshi', 'Agarwal',
        'Mukherjee', 'Das', 'Kumar', 'Bhatia', 'Menon', 'Ghosh', 'Kulkarni',
        'Rao', 'Mishra', 'Pandey', 'Banerjee', 'Chauhan'
    ];

    /** @type {string[]} Array of sample departments */
    private static readonly DEPARTMENTS = [
        'Engineering', 'Marketing', 'Sales', 'Human Resources', 'Finance',
        'Operations', 'Information Technology', 'Customer Support',
        'Research & Development', 'Legal', 'Quality Assurance', 'Procurement'
    ];

    /** @type {string[]} Array of sample cities */
    private static readonly CITIES = [
        'Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Ahmedabad', 'Chennai',
        'Kolkata', 'Pune', 'Jaipur', 'Surat', 'Lucknow', 'Kanpur',
        'Nagpur', 'Indore', 'Bhopal'
    ];

    /** @type {string[]} Array of sample project statuses */
    private static readonly STATUSES = [
        'Active', 'Completed', 'On Hold', 'Cancelled', 'Planning', 'In Progress'
    ];


    /**
     * Generates employee data records
     * @param {number} count - Number of records to generate (default: 50000)
     * @returns {Array<object>} Array of employee data objects
     */
    static generateEmployeeData(count: number = 50000): Array<object> {
        const data: Array<object> = [];
        
        for (let i = 1; i <= count; i++) {
            data.push({
                id: i,
                firstName: this.getRandomElement(this.FIRST_NAMES),
                lastName: this.getRandomElement(this.LAST_NAMES),
                age: this.getRandomNumber(22, 65),
                salary: this.getRandomNumber(35000, 150000),
                department: this.getRandomElement(this.DEPARTMENTS),
                city: this.getRandomElement(this.CITIES),
                startDate: this.getRandomDate(new Date(2015, 0, 1), new Date(2024, 11, 31)),
                isActive: Math.random() > 0.1, // 90% active
                rating: this.getRandomNumber(1, 5, 1),
                bonus: this.getRandomNumber(0, 25000),
                email: this.generateEmail()
            });
        }
        
        return data;
    }

    /**
     * Generates sales data records
     * @param {number} count - Number of records to generate (default: 10000)
     * @returns {Array<object>} Array of sales data objects
     */
    static generateSalesData(count: number = 10000): Array<object> {
        const data: Array<object> = [];
        
        for (let i = 1; i <= count; i++) {
            const quantity = this.getRandomNumber(1, 100);
            const unitPrice = this.getRandomNumber(10, 500, 2);
            const total = quantity * unitPrice;
            
            data.push({
                orderId: `ORD-${i.toString().padStart(6, '0')}`,
                customerName: this.getRandomElement(this.FIRST_NAMES) + ' ' + this.getRandomElement(this.LAST_NAMES),
                product: this.generateProductName(),
                quantity: quantity,
                unitPrice: unitPrice,
                total: Math.round(total * 100) / 100,
                orderDate: this.getRandomDate(new Date(2023, 0, 1), new Date(2024, 11, 31)),
                status: this.getRandomElement(this.STATUSES),
                region: this.getRandomElement(this.CITIES),
                discount: this.getRandomNumber(0, 20, 1),
                salesRep: this.getRandomElement(this.FIRST_NAMES) + ' ' + this.getRandomElement(this.LAST_NAMES)
            });
        }
        
        return data;
    }

    /**
     * Generates financial data records
     * @param {number} count - Number of records to generate (default: 5000)
     * @returns {Array<object>} Array of financial data objects
     */
    static generateFinancialData(count: number = 5000): Array<object> {
        const data: Array<object> = [];
        
        for (let i = 1; i <= count; i++) {
            const revenue = this.getRandomNumber(10000, 1000000, 2);
            const expenses = revenue * this.getRandomNumber(0.6, 0.9, 3);
            const profit = revenue - expenses;
            
            data.push({
                id: i,
                quarter: `Q${Math.ceil(Math.random() * 4)} 2024`,
                revenue: Math.round(revenue * 100) / 100,
                expenses: Math.round(expenses * 100) / 100,
                profit: Math.round(profit * 100) / 100,
                margin: Math.round((profit / revenue) * 100 * 100) / 100,
                department: this.getRandomElement(this.DEPARTMENTS),
                budget: this.getRandomNumber(50000, 2000000, 2),
                actual: this.getRandomNumber(45000, 1800000, 2),
                variance: this.getRandomNumber(-20, 15, 1),
                category: this.getRandomElement(['Revenue', 'Cost of Goods', 'Operating Expenses', 'Other'])
            });
        }
        
        return data;
    }

    /**
     * Generates project data records
     * @param {number} count - Number of records to generate (default: 1000)
     * @returns {Array<object>} Array of project data objects
     */
    static generateProjectData(count: number = 1000): Array<object> {
        const data: Array<object> = [];
        
        for (let i = 1; i <= count; i++) {
            const startDate = this.getRandomDate(new Date(2023, 0, 1), new Date(2024, 6, 1));
            const duration = this.getRandomNumber(30, 365);
            const endDate = new Date(startDate.getTime() + duration * 24 * 60 * 60 * 1000);
            
            data.push({
                projectId: `PRJ-${i.toString().padStart(4, '0')}`,
                projectName: this.generateProjectName(),
                manager: this.getRandomElement(this.FIRST_NAMES) + ' ' + this.getRandomElement(this.LAST_NAMES),
                department: this.getRandomElement(this.DEPARTMENTS),
                startDate: this.formatDate(startDate),
                endDate: this.formatDate(endDate),
                budget: this.getRandomNumber(50000, 2000000),
                spent: this.getRandomNumber(25000, 1800000),
                status: this.getRandomElement(this.STATUSES),
                priority: this.getRandomElement(['Low', 'Medium', 'High', 'Critical']),
                progress: this.getRandomNumber(0, 100),
                teamSize: this.getRandomNumber(3, 25)
            });
        }
        
        return data;
    }

    /**
     * Gets a random element from an array
     * @param {any[]} array - Array to select from
     * @returns {any} Random element from the array
     */
    private static getRandomElement(array: any[]): any {
        return array[Math.floor(Math.random() * array.length)];
    }

    /**
     * Generates a random number within a range
     * @param {number} min - Minimum value (inclusive)
     * @param {number} max - Maximum value (inclusive)
     * @param {number} decimals - Number of decimal places (default: 0)
     * @returns {number} Random number within the specified range
     */
    private static getRandomNumber(min: number, max: number, decimals: number = 0): number {
        const random = Math.random() * (max - min) + min;
        return decimals > 0 ? Math.round(random * Math.pow(10, decimals)) / Math.pow(10, decimals) : Math.floor(random);
    }

    /**
     * Generates a random date between two dates
     * @param {Date} start - Start date
     * @param {Date} end - End date
     * @returns {Date} Random date between start and end
     */
    private static getRandomDate(start: Date, end: Date): Date {
        return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    }

    /**
     * Formats a date as YYYY-MM-DD
     * @param {Date} date - Date to format
     * @returns {string} Formatted date string
     */
    private static formatDate(date: Date): string {
        return date.toISOString().split('T')[0];
    }

    /**
     * Generates a random email address
     * @returns {string} Random email address
     */
    private static generateEmail(): string {
        const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'company.com', 'business.net'];
        const firstName = this.getRandomElement(this.FIRST_NAMES).toLowerCase();
        const lastName = this.getRandomElement(this.LAST_NAMES).toLowerCase();
        const domain = this.getRandomElement(domains);
        const separator = Math.random() > 0.5 ? '.' : '_';
        
        return `${firstName}${separator}${lastName}@${domain}`;
    }

    /**
     * Generates a random product name
     * @returns {string} Random product name
     */
    private static generateProductName(): string {
        const adjectives = ['Premium', 'Standard', 'Deluxe', 'Professional', 'Basic', 'Advanced'];
        const products = ['Widget', 'Tool', 'Device', 'Software', 'Service', 'Solution', 'System'];
        const versions = ['Pro', 'Lite', 'Enterprise', 'Home', 'Business', 'Ultimate'];
        
        const hasVersion = Math.random() > 0.5;
        const name = `${this.getRandomElement(adjectives)} ${this.getRandomElement(products)}`;
        
        return hasVersion ? `${name} ${this.getRandomElement(versions)}` : name;
    }

    /**
     * Generates a random project name
     * @returns {string} Random project name
     */
    private static generateProjectName(): string {
        const prefixes = ['Project', 'Initiative', 'Program', 'Campaign', 'Operation'];
        const names = ['Alpha', 'Beta', 'Gamma', 'Phoenix', 'Atlas', 'Titan', 'Neptune', 'Mercury'];
        const suffixes = ['2024', 'Plus', 'Next', 'Pro', 'Advanced', 'Enhanced'];
        
        const hasPrefix = Math.random() > 0.3;
        const hasSuffix = Math.random() > 0.6;
        
        let name = this.getRandomElement(names);
        
        if (hasPrefix) {
            name = `${this.getRandomElement(prefixes)} ${name}`;
        }
        
        if (hasSuffix) {
            name = `${name} ${this.getRandomElement(suffixes)}`;
        }
        
        return name;
    }

    /**
     * Generates mixed data with various data types for testing
     * @param {number} count - Number of records to generate (default: 1000)
     * @returns {Array<object>} Array of mixed data objects
     */
    static generateMixedData(count: number = 1000): Array<object> {
        const data: Array<object> = [];
        
        for (let i = 1; i <= count; i++) {
            data.push({
                id: i,
                text: this.getRandomElement(['Sample', 'Test', 'Demo', 'Example']) + ' ' + i,
                number: this.getRandomNumber(1, 10000, 2),
                percentage: this.getRandomNumber(0, 100, 1) + '%',
                currency: '$' + this.getRandomNumber(100, 50000, 2).toLocaleString(),
                date: this.formatDate(this.getRandomDate(new Date(2020, 0, 1), new Date(2024, 11, 31))),
                boolean: Math.random() > 0.5 ? 'Yes' : 'No',
                category: this.getRandomElement(['A', 'B', 'C', 'D']),
                score: this.getRandomNumber(0, 100),
                grade: this.getRandomElement(['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C']),
                formula: `=${this.getRandomNumber(10, 100)}*${this.getRandomNumber(2, 10)}`
            });
        }
        
        return data;
    }
}